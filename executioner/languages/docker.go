package languages

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
)


type LanguageOptions struct {
	Language       string
	EntrypointFile string

}

type File struct {
	ID       string
	Filename string
	Content  string
	Metadata interface{}
}

var (
	CPU_LIMIT_PER_EXECUTION string
	MEMORY_LIMIT_PER_EXECUTION string
	ENALBE_NETWORK_IN_EXECUTION string
	IMAGE_BASE string
	WORKDIR string
)

const (
	timeFilename string = "time"
	stdoutFilename string = "stdout"
	StderrFilename string = "stderr"
	compileStdoutFilename string = "compile.stdout"
	compileStderrFilename string = "compile.stderr"

)

func main (){
	err := godotenv.Load()
	if err != nil {
		fmt.Errorf("Failed to load env: %s", err)
	}
	CPU_LIMIT_PER_EXECUTION = os.Getenv("CPU_LIMIT_PER_EXECUTION")
	MEMORY_LIMIT_PER_EXECUTION = os.Getenv("MEMORY_LIMIT_PER_EXECUTION")
	ENALBE_NETWORK_IN_EXECUTION = os.Getenv("ENALBE_NETWORK_IN_EXECUTION")
	IMAGE_BASE = os.Getenv("IMAGE_BASE")
	WORKDIR = os.Getenv("WORKDIR")
	if WORKDIR == "" {
		WORKDIR = "_work"
	}
	
}

func parseDuration(duration string) (int, error) {
	if duration == "" {
		return 0, fmt.Errorf("Received invalid duration '%s'", duration)
	}
	re := regexp.MustCompile(`(\d+)m(\d+(?:\.\d+)?)s`)
	match := re.FindStringSubmatch(duration)
	if match == nil {
		return 0, fmt.Errorf("Invalid duration format")
	}

	minutes, err := strconv.Atoi(match[1])
	if err != nil {
		return 0, err
	}
	seconds, err := strconv.ParseFloat(match[2], 64)
	if err != nil {
		return 0, err
	}

	return minutes*60 + int(seconds), nil
}

func readIfExist(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func execute(files []File, input string, options LanguageOptions) (string, error) {
	id := uuid.New()

	subWorkspace := filepath.Join(WORKDIR, id.String())
	srcDir := filepath.Join(subWorkspace, "src") 
	inputDir := filepath.Join(subWorkspace, "input")
	outputDir := filepath.Join(subWorkspace, "output")
	lang := options.Language

	_, err := os.ReadDir(subWorkspace)
	if err != nil {
		err := os.MkdirAll(subWorkspace, 0777)
		if err != nil {
			return "", err
		}
	}
	_, err = os.ReadDir(srcDir)
	if err != nil {
		err := os.MkdirAll(srcDir, 0777)
		if err != nil {
			return "", err
		}
	}
	_, err = os.ReadDir(inputDir)
	if err != nil {
		err := os.MkdirAll(inputDir, 0777)
		if err != nil {
			return "", err
		}
	}
	_, err = os.ReadDir(outputDir)
	if err != nil {
		err := os.MkdirAll(outputDir, 0777)
		if err != nil {
			return "", err
		}
	}

	_,timePath := os.ReadDir(filepath.Join(subWorkspace, timeFilename))
	_,stdoutPath := os.ReadDir(filepath.Join(subWorkspace, stdoutFilename))
	_,stderrPath := os.ReadDir(filepath.Join(subWorkspace, StderrFilename))
	_,compileStdoutPath := os.ReadDir(filepath.Join(subWorkspace, compileStdoutFilename))
	_,compileStderrPath := os.ReadDir(filepath.Join(subWorkspace, compileStderrFilename))
	

	for _, file := range files {
		filePath := filepath.Join(srcDir, file.Filename)
		err := os.WriteFile(filePath, []byte(file.Content), 0777)
		if err != nil {
			return "", fmt.Errorf("Failed to write file: %s", err)
		}
	}

	for _, file := range files {
		filePath := filepath.Join(inputDir, file.Filename)
		err := os.WriteFile(filePath, []byte(file.Content), 0777)
		if err != nil {
			return "", fmt.Errorf("Failed to write file: %s", err)
		}
	}

	var extraArgs []string

	if CPU_LIMIT_PER_EXECUTION != "" {
		extraArgs = append(extraArgs, "--cpus", CPU_LIMIT_PER_EXECUTION)
	}
	if MEMORY_LIMIT_PER_EXECUTION != "" {
		extraArgs = append(extraArgs, "--memory", MEMORY_LIMIT_PER_EXECUTION)
		
	}
	if ENALBE_NETWORK_IN_EXECUTION == "" {
		extraArgs = append(extraArgs, "--network", "none")
	}

	args := []string{
		"run",
		"--rm",
		"-v", fmt.Sprintf("%s:/exc/src", srcDir),
		"-v", fmt.Sprintf("%s:/exc/input", inputDir),
		"-v", fmt.Sprintf("%s:/exc/output", outputDir),
		"-v", fmt.Sprintf("%s:/exc/%s", timePath, timeFilename),
		"-v", fmt.Sprintf("%s:/exc/%s", stdoutPath, stdoutFilename),
		"-v", fmt.Sprintf("%s:/exc/%s", stderrPath, StderrFilename),
		"-v", fmt.Sprintf("%s:/exc/%s", compileStdoutPath, compileStdoutFilename),
		"-v", fmt.Sprintf("%s:/exc/%s", compileStderrPath, compileStderrFilename),
	}
	args = append(args, extraArgs...)
	args = append(args, "-i", IMAGE_BASE+lang, options.EntrypointFile)

	cmdDocker := exec.Command("docker", args...)

	err = cmdDocker.Start()
	if err != nil {
		return "", fmt.Errorf("Failed to start docker: %s", err)
	}
	stdout,err:= cmdDocker.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("Failed to get stdout pipe: %s", err)
	}
	fmt.Println(stdout)
	stderr,err:= cmdDocker.StderrPipe()
	if err != nil {
		return "", fmt.Errorf("Failed to get stderr pipe: %s", err)
	}
	fmt.Println(stderr)
	err = cmdDocker.Wait()
	if err != nil {
		return "", fmt.Errorf("Failed to wait for docker: %s", err)
	}
	
	output,err := processOutput(files)
	if err != nil{
		return "", fmt.Errorf("Failed to process output: %s", err)
	}
	return output, nil
}

func processOutput(input []File) (string, error) {
	
	var output []map[string]interface{}
	for _, inp := range input {
		stdoutPath := filepath.Join(WORKDIR, inp.Filename, stdoutFilename)
		stdout, err := readIfExist(stdoutPath)
		if err != nil {
			return "", fmt.Errorf("Failed to read stdout: %s", err)
		}
		stderrPath := filepath.Join(WORKDIR, inp.Filename, StderrFilename)
		stderr, err := readIfExist(stderrPath)
		if err != nil {
			return "", fmt.Errorf("Failed to read stderr: %s", err)
		}
		timePath := filepath.Join(WORKDIR, inp.Filename, timeFilename)
		time, err := readIfExist(timePath)
		if err != nil {
			return "", fmt.Errorf("Failed to read time: %s", err)
		}

		var parsedTime int = 0

		if time != "" {
			timeSplits := [][]string{}
			for _, t := range regexp.MustCompile(`\r?\n`).Split(time, -1) {
				trimmed := strings.TrimSpace(t)
				if trimmed != "" {
					timeSplits = append(timeSplits, strings.Split(trimmed, "\t"))
				}
			}
			realTime := timeSplits[0]
			parsedTime, err = parseDuration(realTime[1])
			if err != nil {
				return "", fmt.Errorf("Failed to parse duration: %s", err)
			}
		}
		output = append(output, map[string]interface{}{
            "id":       inp.ID,
            "stdout":   stdout,
            "stderr":   stderr,
            "time":     parsedTime,
            "metadata": inp.Metadata,
        })

		jsonOutput, err := json.Marshal(output)
		if err != nil {
			return "", fmt.Errorf("Failed to marshal output: %s", err)
		}
		return string(jsonOutput), nil

	}

	return "", nil

}