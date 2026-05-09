import { SENATUS_URL } from '@/config';
import { TutorialDetail } from '../types/TutorialDetail';
export const resolveThumbnail = (tutorial?: TutorialDetail | null) => {
  if (!tutorial) {
    return '';
  }

  if (tutorial.thumbnail?.url) {
    if (tutorial.thumbnail.url.startsWith('http')) {
      return tutorial.thumbnail.url;
    }

    return `${SENATUS_URL}${tutorial.thumbnail.url}`;
  }

  return tutorial.thumbnailUrl || '';
};