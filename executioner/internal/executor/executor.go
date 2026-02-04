package executor

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"colosseum/internal/config"
	"colosseum/internal/models"
	"colosseum/internal/utils"

	"github.com/rs/zerolog"
)

type MetadataEntry struct {
	ExecutionId int
	TestCaseId  int
}

type InputMetadata map[string]MetadataEntry

type Executor struct {
	Docker *DockerClient
	Logger *zerolog.Logger
}

func NewExecutor(dockerClient *DockerClient, logger *zerolog.Logger) *Executor {
	return &Executor{
		Docker: dockerClient,
		Logger: logger,
	}
}

func (e *Executor) GetRuntimeImage(language string) (string, error) {

	lang := strings.ToLower(language)
	image, ok := config.ImagesMap[lang]
	if !ok {
		return "", fmt.Errorf("unsupported language: %s", language)
	}
	return image, nil
}

func (e *Executor) ensureImage(ctx context.Context, language string) (string, error) {
	image, err := e.GetRuntimeImage(language)
	if err != nil {
		return "", fmt.Errorf("failed to get runtime image: %w", err)
	}

	if exists, err := e.Docker.ImageExists(ctx, image); err != nil {
		return "", fmt.Errorf("failed to check if image exists: %w", err)
	} else if !exists {
		if err := e.Docker.ImagePull(ctx, image); err != nil {
			return "", fmt.Errorf("failed to pull image: %w", err)
		}
	}
	return image, nil
}

func (e *Executor) prepareSourceFiles(sources []models.File) (*bytes.Buffer, error) {
	sourceFiles := make([]models.FileContent, 0, len(sources))
	for _, src := range sources {
		sourceFiles = append(sourceFiles, models.FileContent{
			Name:    "src/" + src.Filename,
			Content: []byte(src.Content),
		})
	}

	srcTar, err := utils.CreateTarArchive(sourceFiles)
	if err != nil {
		return nil, fmt.Errorf("failed to create source tar: %w", err)
	}

	return srcTar, nil

}

func (e *Executor) prepareInputFiles(inputs []models.File) (*bytes.Buffer, InputMetadata, error) {
	inputMetadata := make(InputMetadata)

	inputFiles := make([]models.FileContent, 0, len(inputs))
	if len(inputs) > 0 {
		for _, input := range inputs {
			inputFiles = append(inputFiles, models.FileContent{
				Name:    "input/" + input.Filename,
				Content: []byte(input.Content),
			})
			inputMetadata[input.Filename] = MetadataEntry{
				ExecutionId: input.Metadata.ExecutionId,
				TestCaseId:  input.Metadata.TestCaseId,
			}
		}
	} else {
		inputFiles = append(inputFiles, models.FileContent{
			Name:    "input/stdin",
			Content: []byte(""),
		})
	}

	inputFiles = append(inputFiles, models.FileContent{
		Name:    "output/.gitkeep",
		Content: []byte(""),
	})

	inputTar, err := utils.CreateTarArchive(inputFiles)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create input tar: %w", err)
	}
	return inputTar, inputMetadata, nil
}

func (e *Executor) getResultsFromContainer(ctx context.Context, containerID string, inputMetadata InputMetadata) ([]models.ExecutionResult, error) {
	outputReader, err := e.Docker.CopyFromContainer(ctx, containerID, config.ContainerOutputDir)
	if err != nil {
		return nil, fmt.Errorf("failed to copy output from container: %w", err)
	}
	defer outputReader.Close()

	outputFiles, err := utils.ExtractAllFilesFromTar(outputReader)
	if err != nil {
		return nil, fmt.Errorf("failed to extract output files: %w", err)
	}

	results := e.parseOutputFiles(outputFiles, inputMetadata)
	return results, nil
}

func (e *Executor) setupContainer(ctx context.Context, req models.ExecutionRequest) (string, InputMetadata, error) {
	image, err := e.ensureImage(ctx, req.Options.Language)
	if err != nil {
		return "", nil, fmt.Errorf("failed to get runtime image: %w", err)
	}

	containerID, err := e.Docker.CreateContainer(ctx, image, nil)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create container: %w", err)
	}

	// Prepare files
	srcTar, err := e.prepareSourceFiles(req.Sources)
	if err != nil {
		return "", nil, fmt.Errorf("failed to prepare source files: %w", err)
	}
	inputTar, inputMetadata, err := e.prepareInputFiles(req.Input)
	if err != nil {
		return "", nil, fmt.Errorf("failed to prepare input files: %w", err)
	}

	// Copy files to container
	if err := e.Docker.CopyToContainer(ctx, containerID, config.ContainerWorkDir, srcTar); err != nil {
		return "", nil, fmt.Errorf("failed to copy source files to container: %w", err)
	}
	if err := e.Docker.CopyToContainer(ctx, containerID, config.ContainerWorkDir, inputTar); err != nil {
		return "", nil, fmt.Errorf("failed to copy inputs to container: %w", err)
	}

	return containerID, inputMetadata, nil
}

func (e *Executor) runContainer(ctx context.Context, containerID string) (int64, error) {
	if err := e.Docker.StartContainer(ctx, containerID); err != nil {
		return 0, fmt.Errorf("failed to start container: %w", err)
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, config.ExecutionTimeout)
	defer cancel()

	exitCode, err := e.Docker.WaitContainer(timeoutCtx, containerID)
	if err != nil {
		return 0, fmt.Errorf("failed to wait for container: %w", err)
	}
	return exitCode, nil
}

func (e *Executor) Execute(ctx context.Context, req models.ExecutionRequest) ([]models.ExecutionResult, error) {
	e.Logger.Info().Int("submissionId", req.Metadata.SubmissionId).Str("language", req.Options.Language).Msg("Starting execution")

	// Setup container
	containerID, inputMetadata, err := e.setupContainer(ctx, req)
	if err != nil {
		return nil, err
	}
	defer e.Docker.RemoveContainer(ctx, containerID)

	// Start container with timeout
	exitCode, err := e.runContainer(ctx, containerID)
	if err != nil {
		return nil, fmt.Errorf("failed to run container: %w", err)
	}

	e.Logger.Info().Str("containerID", containerID).Int64("exitCode", exitCode).Msg("Container execution completed")

	// Retrieve results
	results, err := e.getResultsFromContainer(ctx, containerID, inputMetadata)
	if err != nil {
		return nil, fmt.Errorf("failed to get results from container: %w", err)
	}
	e.Logger.Info().Int("submissionId", req.Metadata.SubmissionId).Int("resultCount", len(results)).Msg("Execution completed successfully")

	return results, nil
}

// parseOutputFiles converts output files into ExecutionResult structs
func (e *Executor) parseOutputFiles(files map[string][]byte, inputMetadata InputMetadata) []models.ExecutionResult {
	grouped := make(map[string]*models.ExecutionResult)

	for filename, content := range files {
		name := strings.TrimPrefix(filename, "output/")

		var baseName, fileType string
		if strings.HasSuffix(name, ".stdout") {
			baseName = strings.TrimSuffix(name, ".stdout")
			fileType = "stdout"
		} else if strings.HasSuffix(name, ".stderr") {
			baseName = strings.TrimSuffix(name, ".stderr")
			fileType = "stderr"
		} else if strings.HasSuffix(name, ".time") {
			baseName = strings.TrimSuffix(name, ".time")
			fileType = "time"
		} else {
			continue
		}
		result, ok := grouped[baseName]
		if !ok {
			result = &models.ExecutionResult{
				ID: baseName,
			}
			if meta, exists := inputMetadata[baseName]; exists {
				result.Metadata.ExecutionId = meta.ExecutionId
				result.Metadata.TestCaseId = meta.TestCaseId
			}
			grouped[baseName] = result
		}

		switch fileType {
		case "stdout":
			result.Stdout = string(content)
		case "stderr":
			result.Stderr = string(content)
		case "time":
			timeStr := string(content)
			result.Time = utils.ParseTime(timeStr)
			e.Logger.Info().Str("testCase", baseName).Str("rawTime", timeStr).Int("milliseconds", result.Time).Msg("Parsed time")
		}
	}

	results := make([]models.ExecutionResult, 0, len(grouped))
	for _, result := range grouped {
		results = append(results, *result)
	}

	return results
}
