export interface TestCase {
  documentId: string;
  input: string;
  output: string;
  hidden: boolean;
  locked: boolean;
  weight: number;
  explanation?: string;
}