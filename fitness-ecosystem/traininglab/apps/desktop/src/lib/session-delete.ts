/**
 * What deleting a session actually takes with it (2026-10-21).
 *
 * The store has been able to delete a session since 2026-10-08, but no screen
 * offered it, and that was the right call until the confirmation could say
 * *what* disappears: this log is the owner's whole training history, and a
 * "¿Seguro?" that hides the numbers is not a confirmation. This module turns one
 * session plus the sets on disk into the sentence the dialog shows, and it is
 * pure so the arithmetic is tested from the root suite instead of by clicking.
 *
 * Two rules it keeps, both already stated elsewhere in the app:
 *
 *   * **Warm-ups never inflate volume** (`TLSet.warmup`, `lib/effort.ts`).
 *   * **`session.setIds` is the record**; a set that is no longer on disk is
 *     reported as missing instead of being counted as if it were going to be
 *     deleted.
 *
 * @module lib/session-delete
 */

import type { TLSet, TLSession } from "./types";

export interface SessionDeletePlan {
  sessionId: string;
  /** Sets that will be removed from the log (they go with the session). */
  setIds: string[];
  workingSets: number;
  warmupSets: number;
  /** `weight × reps` over working sets only, as everywhere else in the app. */
  volumeKg: number;
  /** Distinct exercises the session touched, in first-seen order. */
  exerciseIds: string[];
  /**
   * Ids the session claims but the log no longer holds. Non-zero means the log
   * was already inconsistent; the dialog still opens, because deleting the
   * session is exactly how that gets cleaned up.
   */
  missingSets: number;
}

export function sessionDeletePlan(
  session: TLSession,
  sets: readonly TLSet[],
): SessionDeletePlan {
  // `TLSet` has no sessionId field: a set belongs to a session through the
  // session's own `setIds`. Build the index from that, never by guessing from
  // timestamps.
  const byId = new Map<string, TLSet>();
  for (const set of sets) byId.set(set.id, set);

  const target = session.setIds.filter((id) => byId.has(id));
  const rows = target.map((id) => byId.get(id)!);

  let workingSets = 0;
  let warmupSets = 0;
  let volumeKg = 0;
  const exerciseIds: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (row.warmup) warmupSets += 1;
    else {
      workingSets += 1;
      if (row.weight !== null && row.reps !== null) {
        volumeKg += row.weight * row.reps;
      }
    }
    if (!seen.has(row.exerciseId)) {
      seen.add(row.exerciseId);
      exerciseIds.push(row.exerciseId);
    }
  }

  return {
    sessionId: session.id,
    setIds: target,
    workingSets,
    warmupSets,
    volumeKg,
    exerciseIds,
    missingSets: session.setIds.length - target.length,
  };
}
