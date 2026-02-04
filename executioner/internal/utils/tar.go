package utils

import (
	"archive/tar"
	"bytes"
	"colosseum/internal/models"
	"fmt"
	"io"
	"path/filepath"
	"time"
)

func CreateTarArchive(files []models.FileContent) (*bytes.Buffer, error) {
	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	defer tw.Close()

	for _, file := range files {
		header := &tar.Header{
			Name:    file.Name,
			Mode:    0644,
			Size:    int64(len(file.Content)),
			ModTime: time.Now(),
		}

		if err := tw.WriteHeader(header); err != nil {
			return nil, fmt.Errorf("failed to write tar header for %s: %w", file.Name, err)
		}

		if _, err := tw.Write(file.Content); err != nil {
			return nil, fmt.Errorf("failed to write tar content for %s: %w", file.Name, err)
		}
	}

	return buf, nil
}

// ExtractFilesFromTar extracts specific files from a tar archive
func ExtractFilesFromTar(tarReader io.Reader, filePattern string) (map[string][]byte, error) {
	tr := tar.NewReader(tarReader)
	files := make(map[string][]byte)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read tar: %w", err)
		}

		// Check if file matches pattern (e.g., "output/*.stdout")
		matched, err := filepath.Match(filePattern, header.Name)
		if err != nil {
			return nil, fmt.Errorf("failed to match pattern: %w", err)
		}

		if matched || filePattern == "*" {
			content, err := io.ReadAll(tr)
			if err != nil {
				return nil, fmt.Errorf("failed to read file content: %w", err)
			}
			files[header.Name] = content
		}
	}

	return files, nil
}

// ExtractAllFilesFromTar extracts all files from a tar archive
func ExtractAllFilesFromTar(tarReader io.Reader) (map[string][]byte, error) {
	tr := tar.NewReader(tarReader)
	files := make(map[string][]byte)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read tar: %w", err)
		}

		// Skip directories
		if header.Typeflag == tar.TypeDir {
			continue
		}

		content, err := io.ReadAll(tr)
		if err != nil {
			return nil, fmt.Errorf("failed to read file content for %s: %w", header.Name, err)
		}
		files[header.Name] = content
	}

	return files, nil
}
