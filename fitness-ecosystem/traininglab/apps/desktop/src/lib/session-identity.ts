import { localDayKey } from "./day";
import type { TLSession, TLSet } from "./types";

/**
 * Working sets that belong to today and have not already been closed into a
 * session.
 *
 * `todaySets` can contain sets from a session that was just finished: the
 * store keeps today's log as the source of truth for the next session, but a
 * second close must not enclose the same set ids again. `extra` carries a
 * same-tick batch (MCP) that React has not rendered into `todaySets` yet.
 *
 * Pure and deterministic: the caller supplies `todayKey` (the local day key of
 * the moment) so this can be tested without freezing the clock.
 */
export function unassignedTodaySets(
  todaySets: readonly TLSet[],
  sessions: readonly TLSession[],
  todayKey: string,
  extra: readonly TLSet[] = [],
): TLSet[] {
  const assigned = new Set(sessions.flatMap((session) => session.setIds));
  const seen = new Set<string>();
  return [...todaySets, ...extra].filter((set) => {
    if (set.warmup) return false;
    if (localDayKey(set.timestamp) !== todayKey) return false;
    if (assigned.has(set.id)) return false;
    if (seen.has(set.id)) return false;
    seen.add(set.id);
    return true;
  });
}
