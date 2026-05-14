export interface Execution {
  id?: string;
  documentId: string;
  stdout: string;
  stderr: string;
  executionTime: number;
  processed: boolean;
  passed?: boolean;
  testCase?: {
    documentId: string;
    input: string;
    output: string;
    hidden: boolean;
    locked?: boolean;
  };
}