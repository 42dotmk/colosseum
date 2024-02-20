import { z } from 'zod';

const processDate = z.preprocess(arg => typeof arg == 'string' ? new Date(arg) : undefined, z.date());

export const EventSchema = z.object({
  description: z.string(),
  startDate: processDate,
  endDate: processDate,
  title: z.string(),
  supportedLanguages: z.string().array(),
  id: z.string(),
});

export type Event = z.infer<typeof EventSchema>;

export const TestCaseSchema = z.object({
  input: z.string(),
  output: z.string(),
  locked: z.boolean(),
  hidden: z.boolean(),
  explanation: z.string().nullable(),
  id: z.string(),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

export const ProblemSchema = z.object({
  description: z.string(),
  title: z.string(),
  id: z.string(),
  testCases: TestCaseSchema.array(),
});

export type Problem = z.infer<typeof ProblemSchema>;