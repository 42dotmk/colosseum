export type CodeDraftState = {
  version: 1;
  language?: string;
  drafts: Record<string, string>;
};

const emptyState = (): CodeDraftState => ({ version: 1, drafts: {} });

export const codeDraftStorageKey = (
  userId: string | undefined,
  problemId: string | undefined,
): string | null => {
  if (!userId || !problemId) {
    return null;
  }

  return `colosseum:code:${userId}:${problemId}`;
};

export const readCodeDraftState = (storageKey: string | null): CodeDraftState => {
  if (!storageKey || typeof window === 'undefined') {
    return emptyState();
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return emptyState();
    }

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return emptyState();
    }

    const candidate = parsed as { version?: unknown; language?: unknown; drafts?: unknown };

    if (candidate.version !== 1 || !candidate.drafts || typeof candidate.drafts !== 'object') {
      return emptyState();
    }

    const drafts: Record<string, string> = {};

    for (const [codeName, value] of Object.entries(candidate.drafts as Record<string, unknown>)) {
      if (typeof value === 'string' && value.length > 0) {
        drafts[codeName] = value;
      }
    }

    return {
      version: 1,
      language: typeof candidate.language === 'string' ? candidate.language : undefined,
      drafts,
    };
  } catch {
    return emptyState();
  }
};

export const writeCodeDraftState = (storageKey: string | null, state: CodeDraftState): void => {
  if (!storageKey || typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    return;
  }
};
