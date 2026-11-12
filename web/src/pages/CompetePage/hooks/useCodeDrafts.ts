/**
 * useCodeDrafts — per-language code buffer persistence for the competition editor.
 *
 * The editor keeps one buffer per language (C++, Python, …). Switching language must not
 * destroy the previous language's work, and reloading the problem page must restore both
 * the buffers and the language the user was last on. All of that lives here so
 * `CompetePage.tsx` only has to say "remember this" and "give me that back".
 *
 * Storage
 * -------
 * One localStorage entry per (user, problem) pair:
 *   key   `colosseum:code:<userId>:<problemId>`   (see `codeDraftStorageKey`)
 *   value `{ version: 1, language?: string, drafts: { [codeName]: string } }`
 *
 * `language` is the last active language *codeName* (not Strapi documentId) so the value
 * survives a reseed of the language rows; `drafts` maps codeName → source text.
 *
 * Write policy
 * ------------
 * - `rememberDraft` only decides *what* is a draft: an empty buffer, or one identical to the
 *   scaffold the user was given, is deleted rather than stored. This keeps untouched
 *   scaffolds out of storage so a restored draft always means "the user typed this".
 * - `flushDrafts()` debounces to {@link PERSIST_DEBOUNCE_MS} so typing does not hit
 *   localStorage on every keystroke; `flushDrafts(true)` writes synchronously for events
 *   where losing the last 300 ms would be user-visible (language switch).
 * - Pending writes are flushed on unmount and when the storage key changes, which keeps a
 *   half-typed buffer intact across navigation.
 *
 * Reading
 * -------
 * `getDraft` / `getLastLanguage` read the current in-memory state at call time instead of
 * returning a snapshot. Callers use them from effects and handlers that run *after*
 * hydration, so they must see post-hydration values, not the render-time ones.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  codeDraftStorageKey,
  readCodeDraftState,
  writeCodeDraftState,
  type CodeDraftState,
} from '../codeDrafts';

/** Typing pause before a debounced write; short enough to survive a reload, long enough to batch keystrokes. */
const PERSIST_DEBOUNCE_MS = 300;

const emptyState = (): CodeDraftState => ({ version: 1, drafts: {} });

export type CodeDraftsApi = {
  /** localStorage key for this (user, problem) pair, or null while either id is unknown. */
  storageKey: string | null;
  /** codeName of the language that was active when the drafts were last written. */
  getLastLanguage: () => string | undefined;
  /** Stored buffer for a language, or undefined when nothing usable was saved. */
  getDraft: (codeName: string | undefined) => string | undefined;
  /** Record the active buffer; empty and scaffold-identical values are deleted, not stored. */
  rememberDraft: (codeName: string | undefined, value: string, scaffold: string) => void;
  /** Mark a language as active and persist immediately (used on language switch). */
  selectLanguage: (codeName: string) => void;
  /** Schedule a write; pass `true` to bypass the debounce. */
  flushDrafts: (immediate?: boolean) => void;
};

export function useCodeDrafts(userId?: string, problemId?: string): CodeDraftsApi {
  const storageKey = useMemo(() => codeDraftStorageKey(userId, problemId), [userId, problemId]);

  // Drafts are kept in a ref: they are written from timers and read from async handlers,
  // and every keystroke mutating them must not re-render the editor.
  const stateRef = useRef<CodeDraftState>(emptyState());
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  // Load the stored drafts for the current (user, problem) pair.
  useEffect(() => {
    stateRef.current = readCodeDraftState(storageKey);
    hydratedRef.current = true;
  }, [storageKey]);

  // Never lose the tail of a debounced write: flush when the key changes or on unmount.
  // The cleanup closes over the *previous* key and state, which is exactly what must be
  // written before hydration replaces them.
  useEffect(() => {
    return () => {
      if (!hydratedRef.current) {
        return;
      }

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }

      writeCodeDraftState(storageKey, stateRef.current);
    };
  }, [storageKey]);

  const flushDrafts = useCallback(
    (immediate = false) => {
      if (!storageKey) {
        return;
      }

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }

      if (immediate) {
        writeCodeDraftState(storageKey, stateRef.current);
        return;
      }

      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        writeCodeDraftState(storageKey, stateRef.current);
      }, PERSIST_DEBOUNCE_MS);
    },
    [storageKey],
  );

  const rememberDraft = useCallback(
    (codeName: string | undefined, value: string, scaffold: string) => {
      if (!codeName) {
        return;
      }

      const state = stateRef.current;

      if (!value.trim() || value === scaffold) {
        delete state.drafts[codeName];
      } else {
        state.drafts[codeName] = value;
      }

      state.language = codeName;
    },
    [],
  );

  const selectLanguage = useCallback(
    (codeName: string) => {
      stateRef.current.language = codeName;
      flushDrafts(true);
    },
    [flushDrafts],
  );

  const getLastLanguage = useCallback(() => stateRef.current.language, []);

  const getDraft = useCallback(
    (codeName: string | undefined) => (codeName ? stateRef.current.drafts[codeName] : undefined),
    [],
  );

  // Memoized so callers can safely put the API object in dependency arrays.
  return useMemo(
    () => ({
      storageKey,
      getLastLanguage,
      getDraft,
      rememberDraft,
      selectLanguage,
      flushDrafts,
    }),
    [storageKey, getLastLanguage, getDraft, rememberDraft, selectLanguage, flushDrafts],
  );
}
