/**
 * Persistence format for the editor's per-language code buffers.
 *
 * The stateful side (debouncing, hydrating, switching) lives in
 * `hooks/useCodeDrafts.ts`; this module only knows how to name a storage slot and how to
 * read/write it safely. Both readers and writers are total: any missing, corrupt or
 * foreign-shaped value degrades to an empty state instead of throwing, because this data
 * comes from localStorage and may have been written by an older build.
 */
export type CodeDraftState = {
  /** Bumped when the payload shape changes; mismatched versions are discarded, not migrated. */
  version: 1;
  /** Last active language's `codeName` (not the Strapi documentId — reseeds must not break restore). */
  language?: string;
  /** Language `codeName` → source text. Only buffers the user actually touched are stored. */
  drafts: Record<string, string>;
};

const emptyState = (): CodeDraftState => ({ version: 1, drafts: {} });

/** One slot per (user, problem); null while either id is unknown (no anonymous persistence). */
export const codeDraftStorageKey = (
  userId: string | undefined,
  problemId: string | undefined,
): string | null => {
  if (!userId || !problemId) {
    return null;
  }

  return `colosseum:code:${userId}:${problemId}`;
};

/** Read a stored slot, tolerating absent/corrupt/old-version payloads by returning empty state. */
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

/** Write a slot, swallowing quota/private-mode errors — drafts are a convenience, never required. */
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
