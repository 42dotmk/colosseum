package languages

import (
	"encoding/json"
	"fmt"
	"io"
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
	Language       string            `json:"language"`
	EntrypointFile string            `json:"entrypointFile"`
	Options        map[string]string `json:"options"`
}

type File struct {
	ID       string                `json:"id,omitempty"`
	Filename string                 `json:"filename"`
	Content  string                 `json:"content"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}
type ExecutionResult struct{
	ID string `json:"id"`
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
	Time int `json:"time"`
	Metadata map[string]interface{} `json:"metadata"`
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

func Init (){
	err := godotenv.Load()
	if err != nil {
		fmt.Printf("Failed to load env: %s\n", err)
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

func StartCodeContainer(sources []File, input []File, options LanguageOptions) (string, error) {
	id := uuid.New()

	files:= []File{}
			
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

	for _, source := range sources {
		
		content := source.Content
		err := writeFileToDir(srcDir, source)
		if err != nil {
			return "", fmt.Errorf("Failed to write file: %s", err)
		}
		files = append(files, File{
			ID:       id.String(),
			Filename: source.Filename,
			Content: string(content[:]),
		})
	}
	for _ , inp := range input {
		content := inp.Content
		err := writeFileToDir(inputDir, inp)
		if err != nil {
			return "", fmt.Errorf("Failed to write file: %s", err)
		}
		files = append(files, File{
			ID:       id.String(),
			Filename: inp.Filename,
			Content: string(content[:]),
			Metadata: inp.Metadata,
		})
	}

	timePath := filepath.Join(subWorkspace,timeFilename)
	stdoutPath := filepath.Join(subWorkspace, stdoutFilename)
	stderrPath := filepath.Join(subWorkspace, StderrFilename)
	compileStdoutPath := filepath.Join(subWorkspace, compileStdoutFilename)
	compileStderrPath := filepath.Join(subWorkspace, compileStderrFilename)

	filesToCreate := []string{timePath, stdoutPath, stderrPath, compileStdoutPath, compileStderrPath}
	for _, filePath := range filesToCreate {
		_, err := os.Stat(filePath)
		if os.IsNotExist(err) {
			err = os.WriteFile(filePath, []byte(""), 0644)
			if err != nil {
				return "", fmt.Errorf("Failed to create file %s: %s", filePath, err)
			}
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

	fmt.Printf("Command: %s\n", cmdDocker.String())

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
	err = cmdDocker.Start()

	if err != nil {
		return "", fmt.Errorf("Failed to start docker: %s", err)
	}
	
	// read stdout and stderr into string

	stdoutput, err := io.ReadAll(stdout)
	if err != nil {
		return "", fmt.Errorf("Failed to read stdout: %s", err)
	}

	errOutput, err := io.ReadAll(stderr)
	if err != nil {
		return "", fmt.Errorf("Failed to read stderr: %s", err)
	}

	if len(errOutput) > 0 {
		return "", fmt.Errorf("Failed to execute: %s", string(errOutput))
	}


	stdFiles := []File{}
	suffixes := []string{".stdout", ".stderr", ".time"}
	for _, inp := range input {
		for _, suffix := range suffixes {
			filePath := filepath.Join(outputDir, inp.Filename+suffix)
			content, err := os.ReadFile(filePath)
			if err != nil {
				return "", fmt.Errorf("Failed to read file %s: %s", filePath, err)
			}
			stdFiles = append(stdFiles, File{
				ID:       id.String(),
				Filename: filepath.Base(filePath),
				Content:  string(content),
				Metadata: inp.Metadata,
			})
		}
	}


	fmt.Printf("Stdout: %s\n", string(stdoutput))
	fmt.Printf("Stderr: %s\n", string(errOutput))


	err = cmdDocker.Wait()
	if err != nil {
		return "", fmt.Errorf("Failed to wait for docker: %s", err)
	}
		
	output,err := processOutput(stdFiles)
	if err != nil{
		return "", fmt.Errorf("Failed to process output: %s", err)
	}
	return output, nil
}


func processOutput(stdFiles []File) (string, error) {

	grouped := make(map[string]map[string]File)
	for _, file := range stdFiles {
		ext := filepath.Ext(file.Filename)
		baseName := strings.TrimSuffix(file.Filename, ext)
		if grouped[baseName] == nil {
			grouped[baseName] = make(map[string]File)
		}
		grouped[baseName][ext] = file
	}

	var results []ExecutionResult
	for base, filesMap := range grouped {
		stdout := ""
		stderr := ""
		timeContent := ""

		if file, ok := filesMap[".stdout"]; ok {
			stdout = file.Content
		} else {
			return "", fmt.Errorf("Missing stdout for %s", base)
		}
		if file, ok := filesMap[".stderr"]; ok {
			stderr = file.Content
		} else {
			return "", fmt.Errorf("Missing stderr for %s", base)
		}
		if file, ok := filesMap[".time"]; ok {
			timeContent = file.Content
		} else {
			return "", fmt.Errorf("Missing time for %s", base)
		}

		parsedTime := 0
		if timeContent != "" {
			var timeSplits [][]string
			for _, t := range regexp.MustCompile(`\r?\n`).Split(timeContent, -1) {
				trimmed := strings.TrimSpace(t)
				if trimmed != "" {
					timeSplits = append(timeSplits, strings.Split(trimmed, "\t"))
				}
			}
			if len(timeSplits) > 0 && len(timeSplits[0]) > 1 {
				var err error
				parsedTime, err = parseDuration(timeSplits[0][1])
				if err != nil {
					return "", fmt.Errorf("Failed to parse duration for %s: %s", base, err)
				}
			}
		}

		var fileID string
		var metadata map[string]interface{}
		if file, ok := filesMap[".stdout"]; ok {
			fileID = file.ID
			metadata = file.Metadata
		}

		result := ExecutionResult{
			ID:       fileID,
			Stdout:   strings.TrimSpace(stdout),
			Stderr:   strings.TrimSpace(stderr),
			Time:     parsedTime,
			Metadata: metadata,
		}
		results = append(results, result)
	}

	jsonOutput, err := json.Marshal(results)
	if err != nil {
		return "", fmt.Errorf("Failed to marshal output: %s", err)
	}
	return string(jsonOutput), nil
}


func writeFileToDir(path string, input File) error {
	err := os.WriteFile(filepath.Join(path, input.Filename), []byte(input.Content), 0777)
	if err != nil {
		return fmt.Errorf("Failed to write file: %s", err)
	}
	return nil
}