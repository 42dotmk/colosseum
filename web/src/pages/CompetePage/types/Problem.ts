import { TestCase } from "./TestCase";

export interface Problem {
  id: number;
  title: string;
  description: string;
  slug: string;
  points: number;
  isInteractive?: boolean;
  interactorSource?: string;
  checkerSource?: string;
  testCases?: TestCase[];
  starterCodes?: any[];
}
