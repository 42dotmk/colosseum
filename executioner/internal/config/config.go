package config

import (
	"os"
	"strconv"
	"time"
)

var (
	RabbitMQUrl string
	// Container resource limits
	ContainerMemoryLimit int64
	ContainerCPULimit    int64

	// Container directory paths
	ContainerWorkDir   string
	ContainerOutputDir string

	// Execution configuration
	ExecutionTimeout        time.Duration
	MaxConcurrentExecutions int
	EnableNetworkInExecution bool

	// RabbitMQ configuration
	ExecutionQueueName string
	ResultQueueName    string

	// Logging configuration
	LogLevel    string
	JSONLogging bool

	// Image configuration
	ImageBase string

	// Language to container image mappings
	ImagesMap map[string]string
)

func init() {

	RabbitMQUrl = getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
	// Load environment variables with defaults
	ContainerMemoryLimit = getEnvAsInt64("MEMORY_LIMIT_PER_EXECUTION", 512*1024*1024)
	ContainerCPULimit = getEnvAsInt64("CPU_LIMIT_PER_EXECUTION", 1000000000)

	ContainerWorkDir = getEnv("CONTAINER_WORKDIR", "/exc")
	ContainerOutputDir = ContainerWorkDir + "/output"

	ExecutionTimeout = time.Duration(getEnvAsInt("EXECUTION_TIMEOUT_SECONDS", 30)) * time.Second
	MaxConcurrentExecutions = getEnvAsInt("MAX_CONCURRENT_EXECUTIONS", 10)
	EnableNetworkInExecution = getEnvAsBool("ENABLE_NETWORK_IN_EXECUTION", false)

	ExecutionQueueName = getEnv("EXECUTION_QUEUE_NAME", "execution_queue")
	ResultQueueName = getEnv("RESULT_QUEUE_NAME", "result")

	LogLevel = getEnv("LOG_LEVEL", "info")
	JSONLogging = getEnvAsBool("JSON_LOGGING", false)

	ImageBase = getEnv("IMAGE_BASE", "ghcr.io/42dotmk/colosseum-executioner-")

	// Build image map with base URL
	ImagesMap = map[string]string{
		"python": ImageBase + "python:latest",
		"golang": ImageBase + "golang:latest",
		"go":     ImageBase + "golang:latest",
		"java":   ImageBase + "java:latest",
		"nodejs": ImageBase + "nodejs:latest",
		"node":   ImageBase + "nodejs:latest",
		"csharp": ImageBase + "csharp:latest",
		"c#":     ImageBase + "csharp:latest",
		"rust":   ImageBase + "rust:latest",
		"gcc":    ImageBase + "gcc:latest",
		"c":      ImageBase + "gcc:latest",
		"cpp":    ImageBase + "gcc:latest",
		"c++":    ImageBase + "gcc:latest",
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}
