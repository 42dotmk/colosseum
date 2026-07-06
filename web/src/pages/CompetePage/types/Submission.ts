import { Execution } from "./Execution";

export interface Submission {
  documentId: string;
  code: string;
  createdAt: string;
  metadata?: {
    mode?: string;
    sourceEvent?: string;
  };
  language: {
    documentId: string;
    name: string;
    codeName: string;
  };
  executions: Execution[];
  score: number;
  maxScore: number;
}