import { SENATUS_URL } from "@/config";
import type { TutorialListItem } from "../types/TutorialListItem";

export const resolveThumbnail = (tutorial: TutorialListItem) => {
  if (tutorial.thumbnail?.url) {
    if (tutorial.thumbnail.url.startsWith('http')) {
      return tutorial.thumbnail.url;
    }

    return `${SENATUS_URL}${tutorial.thumbnail.url}`;
  }

  return tutorial.thumbnailUrl || '';
};
