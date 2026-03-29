package executor

import (
	"bytes"
	"colosseum/internal/config"
	"colosseum/internal/models"
	"context"
	"fmt"
	"io"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/rs/zerolog"
)

type DockerClient struct {
	Client *client.Client
	Logger *zerolog.Logger
}

func CreateNewDockerClient(logger *zerolog.Logger) (*DockerClient, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		logger.Error().Str("error", err.Error()).Msg("Failed to create Docker client")
		return nil, err
	}
	return &DockerClient{
		Client: cli,
		Logger: logger,
	}, nil
}

func (d *DockerClient) Close() error {
	return d.Client.Close()
}

func (d *DockerClient) Ping() error {
	_, err := d.Client.Ping(context.Background())
	if err != nil {
		d.Logger.Error().Str("error", err.Error()).Msg("Failed to ping Docker daemon")
		return err
	}
	d.Logger.Info().Msg("Successfully connected to Docker daemon")
	return nil
}

func (d *DockerClient) CreateContainer(ctx context.Context, imageName string, cmd []string) (string, error) {
	networkDisabled := !config.EnableNetworkInExecution
	networkMode := container.NetworkMode("")
	if networkDisabled {
		networkMode = "none"
	}
	resp, err := d.Client.ContainerCreate(ctx,
		&container.Config{
			Image: imageName,
			Cmd:   cmd,
			NetworkDisabled: networkDisabled,
		},
		&container.HostConfig{
			Resources: container.Resources{
				Memory:   config.ContainerMemoryLimit,
				NanoCPUs: config.ContainerCPULimit,
			},
			NetworkMode: networkMode,
		},
		nil, nil, "")

	if err != nil {
		d.Logger.Error().Str("error", err.Error()).Msg("Failed to create container")
		return "", err
	}

	d.Logger.Info().Str("containerID", resp.ID).Msg("Container created")
	return resp.ID, nil
}

func (d *DockerClient) StartContainer(ctx context.Context, containerID string) error {
	err := d.Client.ContainerStart(ctx, containerID, container.StartOptions{})
	if err != nil {
		d.Logger.Error().Str("containerID", containerID).Str("error", err.Error()).Msg("Failed to start container")
		return err
	}
	d.Logger.Info().Str("containerID", containerID).Msg("Container started")
	return nil
}

func (d *DockerClient) GetContainerLogs(ctx context.Context, containerID string) (*models.LogOutput, error) {
	logs, err := d.Client.ContainerLogs(ctx, containerID, container.LogsOptions{ShowStdout: true, ShowStderr: true})
	if err != nil {
		d.Logger.Error().Str("containerID", containerID).Str("error", err.Error()).Msg("Failed to get container logs")
		return nil, err
	}
	defer logs.Close()

	var stdout, stderr bytes.Buffer
	_, err = stdcopy.StdCopy(&stdout, &stderr, logs)
	if err != nil {
		d.Logger.Error().Str("containerID", containerID).Str("error", err.Error()).Msg("Failed to demultiplex container logs")
		return nil, err
	}

	d.Logger.Info().Str("containerID", containerID).Int("stdoutBytes", stdout.Len()).Int("stderrBytes", stderr.Len()).Msg("Fetched container logs")

	return &models.LogOutput{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}, nil
}

func (d *DockerClient) WaitContainer(ctx context.Context, containerID string) (int64, error) {
	statusCh, errCh := d.Client.ContainerWait(ctx, containerID, container.WaitConditionNotRunning)

	select {
	case err := <-errCh:
		if err != nil {
			d.Logger.Error().Str("containerID", containerID).Str("error", err.Error()).Msg("Error while waiting for container")
			return -1, err
		}
	case status := <-statusCh:
		d.Logger.Info().Str("containerID", containerID).Int64("statusCode", status.StatusCode).Msg("Container finished execution")
		return status.StatusCode, nil
	}

	return -1, nil
}

func (d *DockerClient) RemoveContainer(ctx context.Context, containerID string) error {
	err := d.Client.ContainerRemove(ctx, containerID, container.RemoveOptions{Force: true})
	if err != nil {
		d.Logger.Error().Str("containerID", containerID).Str("error", err.Error()).Msg("Failed to remove container")
		return err
	}
	d.Logger.Info().Str("containerID", containerID).Msg("Container removed")
	return nil
}

func (d *DockerClient) CopyToContainer(ctx context.Context, containerID, targetPath string, content io.Reader) error {
	err := d.Client.CopyToContainer(ctx, containerID, targetPath, content, container.CopyToContainerOptions{})
	if err != nil {
		d.Logger.Error().Str("containerID", containerID).Str("targetPath", targetPath).Str("error", err.Error()).Msg("Failed to copy to container")
		return err
	}
	d.Logger.Info().Str("containerID", containerID).Str("targetPath", targetPath).Msg("Copied to container")
	return nil
}

func (d *DockerClient) CopyFromContainer(ctx context.Context, containerID, sourcePath string) (io.ReadCloser, error) {
	reader, _, err := d.Client.CopyFromContainer(ctx, containerID, sourcePath)
	if err != nil {
		d.Logger.Error().Str("containerID", containerID).Str("sourcePath", sourcePath).Str("error", err.Error()).Msg("Failed to copy from container")
		return nil, err
	}
	d.Logger.Info().Str("containerID", containerID).Str("sourcePath", sourcePath).Msg("Copied from container")
	return reader, nil
}

func (d *DockerClient) ImagePull(ctx context.Context, imageName string) error {
	out, err := d.Client.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		d.Logger.Error().Str("imageName", imageName).Str("error", err.Error()).Msg("Failed to pull image")
		return err
	}
	defer out.Close()
	io.Copy(io.Discard, out)

	d.Logger.Info().Str("imageName", imageName).Msg("Image pulled successfully")
	return nil
}

func (d *DockerClient) ImageExists(ctx context.Context, imageName string) (bool, error) {
	filterArgs := filters.NewArgs()
	filterArgs.Add("reference", imageName)

	images, err := d.Client.ImageList(ctx, image.ListOptions{
		Filters: filterArgs,
	})
	if err != nil {
		return false, fmt.Errorf("failed to list images: %w", err)
	}

	return len(images) > 0, nil
}
