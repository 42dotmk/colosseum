package main

import (
	"colosseum/internal/config"
	"colosseum/internal/executor"
	"colosseum/internal/models"
	"colosseum/internal/queue"
	"context"
	"encoding/json"
	"os"
	"os/signal"
	"syscall"

	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
)

func initLogger() zerolog.Logger {
	var logger zerolog.Logger
	if config.JSONLogging {
		logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
	} else {
		logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout}).With().Timestamp().Logger()
	}

	switch config.LogLevel {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
	return logger
}

func initDependencies(logger *zerolog.Logger) (*executor.Executor, *executor.DockerClient, *queue.RabbitMQ, error) {
	dockerClient, err := executor.CreateNewDockerClient(logger)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to create Docker client")
		return nil, nil, nil, err
	}

	exec := executor.NewExecutor(dockerClient, logger)

	rabbitMQ, err := queue.NewRabbitMQ(config.RabbitMQUrl, logger)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to create RabbitMQ connection")
		dockerClient.Close()
		return nil, nil, nil, err
	}

	return exec, dockerClient, rabbitMQ, nil
}

func handleExecutionRequest(exec *executor.Executor, rabbitMQ *queue.RabbitMQ, logger *zerolog.Logger, body []byte) error {
	execReq := models.ExecutionRequest{}
	err := json.Unmarshal(body, &execReq)
	if err != nil {
		logger.Error().Err(err).Str("rawBody", string(body)).Msg("Failed to unmarshal execution request - DISCARDING invalid message")
		return nil
	}

	logger.Info().
		Int("submissionId", execReq.Metadata.SubmissionId).
		Str("language", execReq.Options.Language).
		Msg("Starting code execution")
	results, err := exec.Execute(context.Background(), execReq)
	if err != nil {
		logger.Error().
			Int("submissionId", execReq.Metadata.SubmissionId).
			Err(err).
			Msg("Execution failed - DISCARDING message")
		return nil
	}

	for _, result := range results {
		logger.Info().
			Int("submissionId", execReq.Metadata.SubmissionId).
			Str("testCase", result.ID).
			Str("stdout", result.Stdout).
			Str("stderr", result.Stderr).
			Int("time", result.Time).
			Msg("Test case result")
		resultJson, _ := json.Marshal(result)
		logger.Info().Str("resultJson", string(resultJson)).Msg("Result JSON")
		if err := rabbitMQ.Publish(context.Background(), config.ResultQueueName, resultJson); err != nil {
			logger.Error().
				Int("submissionId", execReq.Metadata.SubmissionId).
				Str("testCase", result.ID).
				Err(err).
				Msg("Failed to publish result")
		}

	}

	logger.Info().
		Int("submissionId", execReq.Metadata.SubmissionId).
		Int("testCaseCount", len(results)).
		Msg("Execution completed successfully")

	return nil
}

func main() {
	// Load .env file
	godotenv.Load()

	// Configure logger based on config
	logger := initLogger()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	exec, dockerClient, rabbitMQ, err := initDependencies(&logger)
	if err != nil {
		logger.Fatal().Err(err).Msg("Failed to initialize dependencies")
		return
	}
	defer dockerClient.Close()
	defer rabbitMQ.Channel.Close()
	defer rabbitMQ.Conn.Close()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		sig := <-sigChan
		logger.Info().Str("signal", sig.String()).Msg("Received shutdown signal")
		logger.Info().Msg("Stopping consumer, finishing in-flight executions...")
		cancel()
	}()

	err = rabbitMQ.Consume(ctx, config.ExecutionQueueName, func(ctx context.Context, body []byte) error {

		logger.Info().Str("body", string(body)).Msg("Received message")
		if err := handleExecutionRequest(exec, rabbitMQ, &logger, body); err != nil {
			logger.Error().Err(err).Msg("Failed to handle execution request")
			return err
		}

		return nil
	})

	if err != nil && err != context.Canceled {
		logger.Error().Err(err).Msg("Failed to consume messages")
	} else {
		logger.Info().Msg("Consumer stopped gracefully")
	}

	logger.Info().Msg("Executioner shutdown complete")
}
