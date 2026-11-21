/**
 * What a week of training adds up to — the coach's own view (T07.2).
 *
 * The local coach answers questions about the week the owner just trained, so
 * the number it quotes has to be the app's number, not a number it invents.
 * This module is the single derivation behind that answer: it reads the stored
 * log and the stored sessions, and returns counts with the ids they were built
 * from, so a reply can be audited against the log instead of trusted.
 *
 * Rules, all inherited from the app's existing contracts:
 *
 *   * **a week is local days, inclusive on both ends.** The range is two
 *     `YYYY-MM-DD` keys and both belong to the period; anything compared is a
 *     `localDayKey`, never the UTC slice of an ISO instant (see `lib/day.ts`).
 *   * **a session belongs to the day it closed.** The close is the moment the
 *     owner finished; a session still open has not happened yet as far as a
 *     summary goes, so it is neither counted nor allowed to contribute sets.
 *   * **only the session's own sets count.** Working sets are the ids the
 *     counted sessions stored, so an orphan row, a set of an open session or a
 *     set of a session outside the range can never inflate the week.
 *   * **warm-ups are logged but are not work** — the same rule every volume
 *     aggregate in the app follows (`TLSet.warmup`, `lib/session-summary.ts`).
 *   * **nothing is guessed.** A set id the log no longer has is skipped rather
 *     than counted; an unusable range returns zeroes, not a wrong week.
 *
 * Pure and deterministic: no clock, no I/O, no store. Tested from the root
 * suite (`tests/training/test_coach_weekly_summary`).
 *
 * @module lib/coach-weekly-summary
 */

import { localDayKey, localDayStart } from "./day";
import type { TLSet, TLSession } from "./types";

export interface CoachWeeklySummaryInput {
  /** The whole log, or the part the caller already loaded. */
  sets: readonly TLSet[];
  sessions: readonly TLSession[];
  /** First local day of the period, `YYYY-MM-DD` — included. */
  from: string;
  /** Last local day of the period, `YYYY-MM-DD` — included. */
  to: string;
}

export interface CoachWeeklySummary {
  /** The period, echoed back so a reply can state what it covers. */
  from: string;
  to: string;
  /** Sessions whose local close day falls inside the period. */
  closedSessions: number;
  /** Their ids, oldest close first — the source of `closedSessions`. */
  sessionIds: string[];
  /** Working sets inside those sessions, warm-ups excluded. */
  workingSets: number;
  /** Warm-up ramp sets the sessions stored, listed but not counted as work. */
  warmupSets: number;
  /** Ids of the sets counted in `workingSets` / `warmupSets`, in log order. */
  setIds: string[];
}

/** A real calendar day: shape *and* round-trip (2026-02-30 is not a day). */
function isDayKey(key: string): boolean {
  return localDayStart(key) !== null;
}

/**
 * Derive the week from `input`.
 *
 * Returns an empty result — zeroes and no ids — when the period is unusable
 * (an empty or impossible day key, or a range that runs backwards), because a
 * summary that cannot name its days must not quote a number.
 */
export function coachWeeklySummary(
  input: CoachWeeklySummaryInput,
): CoachWeeklySummary {
  const empty: CoachWeeklySummary = {
    from: input.from,
    to: input.to,
    closedSessions: 0,
    sessionIds: [],
    workingSets: 0,
    warmupSets: 0,
    setIds: [],
  };
  if (!isDayKey(input.from) || !isDayKey(input.to)) return empty;
  if (input.from > input.to) return empty;

  const inPeriod = (day: string): boolean =>
    day !== "" && day >= input.from && day <= input.to;

  // A session counts on the day it closed. Open sessions are never counted,
  // which also keeps their sets out of the totals below.
  const closed = input.sessions
    .filter(
      (session) =>
        typeof session.completedAt === "string" &&
        session.completedAt !== "" &&
        inPeriod(localDayKey(session.completedAt)),
    )
    .sort((a, b) => {
      const byClose =
        Date.parse(a.completedAt!) - Date.parse(b.completedAt!);
      return byClose !== 0 ? byClose : a.id.localeCompare(b.id);
    });
  if (closed.length === 0) return empty;

  const setById = new Map(input.sets.map((set) => [set.id, set]));
  const seen = new Set<string>();
  const setIds: string[] = [];
  let workingSets = 0;
  let warmupSets = 0;

  for (const session of closed) {
    for (const id of session.setIds) {
      // One row, one count: the same id claimed twice is a data artefact, not
      // two sets. A missing row is skipped instead of being invented.
      if (seen.has(id)) continue;
      const set = setById.get(id);
      if (!set) continue;
      seen.add(id);
      setIds.push(id);
      if (set.warmup === true) warmupSets += 1;
      else workingSets += 1;
    }
  }

  return {
    from: input.from,
    to: input.to,
    closedSessions: closed.length,
    sessionIds: closed.map((session) => session.id),
    workingSets,
    warmupSets,
    setIds,
  };
}
