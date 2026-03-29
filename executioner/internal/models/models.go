package models

type File struct {
	ID       string `json:"id,omitempty"`
	Filename string `json:"filename"`
	Content  string `json:"content"`
	Metadata struct {
		ExecutionId int `json:"executionId"`
		TestCaseId  int `json:"testCaseId"`
	} `json:"metadata"`
}

type FileContent struct {
	Name    string
	Content []byte
}

type LogOutput struct {
	Stdout string
	Stderr string
}

type LanguageOptions struct {
	Language       string            `json:"language"`
	EntrypointFile string            `json:"entrypointFile"`
	Options        map[string]string `json:"options"`
}

type Metadata struct {
	SubmissionId int `json:"submissionId"`
}

type ExecutionRequest struct {
	Sources  []File          `json:"sources"`
	Input    []File          `json:"input"`
	Options  LanguageOptions `json:"options"`
	Metadata Metadata        `json:"metadata"`
}

type ExecutionResult struct {
	ID       string `json:"id"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	Time     int    `json:"time"`
	Metadata struct {
		ExecutionId int `json:"executionId"`
		TestCaseId  int `json:"testCaseId"`
	} `json:"metadata"`
}
