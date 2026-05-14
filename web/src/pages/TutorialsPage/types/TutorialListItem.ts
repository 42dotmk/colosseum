export interface TutorialListItem {
  documentId: string;
  title: string;
  summary?: string;
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