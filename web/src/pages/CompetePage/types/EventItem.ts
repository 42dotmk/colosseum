import { EventProblem } from "./EventProblem";

export interface EventItem {
  documentId: string;
  title: string;
  end: string;
  problems?: EventProblem[];
}
