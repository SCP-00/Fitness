/**
 * Historial's filters, kept out of the screen so they can be checked without a
 * browser. They only narrow the already-derived history entries; they never
 * change the log, the totals stored in it, or which sessions count as closed.
 *
 * @module lib/history-filter
 */

import type { SessionHistoryEntry } from "../features/stats/derive";

export interface HistoryFilter {
  /** Free text over the session name and its exercise names. */
  query: string;
  /**
   * Inclusive first day, `YYYY-MM-DD`; `null` means no date cut. Dates are
   * compared as local calendar keys, never as UTC timestamps.
   */
  notBefore: string | null;
}

/**
 * Apply the screen filters in the order the user reads them: period first, then
 * the exercise/name search. `nameOf` is supplied by the screen so the helper
 * has no language dependency.
 */
export function filterSessionHistory(
  entries: readonly SessionHistoryEntry[],
  { query, notBefore }: HistoryFilter,
  nameOf: (exerciseId: string) => string,
): SessionHistoryEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => {
    if (notBefore !== null && entry.date < notBefore) return false;
    if (needle.length === 0) return true;
    if (entry.title?.toLocaleLowerCase().includes(needle)) return true;
    return entry.exercises.some((line) =>
      nameOf(line.exerciseId).toLocaleLowerCase().includes(needle),
    );
  });
}
