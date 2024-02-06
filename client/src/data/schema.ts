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