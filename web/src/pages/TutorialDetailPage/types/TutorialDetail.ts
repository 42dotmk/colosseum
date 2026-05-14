export interface TutorialDetail {
  documentId: string;
  title: string;
  summary?: string;
  content: string;
  readTimeMinutes: number;
  thumbnailUrl?: string;
  thumbnail?: {
    url?: string;
  };
  relatedProblem?: {
    documentId: string;
    title?: string;
  };
}