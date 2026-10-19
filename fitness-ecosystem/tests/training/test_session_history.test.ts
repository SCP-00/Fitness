/**
 * Historial — the session record behind screen 08.
 *
 * `closedSessionHistory` is the only thing the screen reads, and the MCP's
 * `read_history` mirrors the same definitions, so the rules are pinned here:
 *
 *   1. **Today's open session is not history.** It lives in Hoy and ZEN;
 *      showing it in both places would double-report the day. Today's *closed*
 *      session does appear — the owner pressed Terminar and expects to find it.
 *   2. **Warm-ups never inflate anything**: they are counted as sets and as `W`
 *      marks, and they add no volume.
 *   3. **Volume is `weight × reps` over working sets**, rounded; a timed hold
 *      contributes nothing because it lifted nothing.
 *   4. **A duration needs a source.** An imported date-only sheet collapses the
 *      first→last span to ~0 and the entry reports `null` (the screen then draws
 *      no duration at all) rather than inventing "1 min".
 *   5. **Newest first, capped**, with `total` still counting every closed
 *      session — a total that forgets the older ones is a lie.
 *
 * Every fixture is built from the **local** wall clock, never from a `Z`
 * literal: the rules live in local days, and a UTC timestamp would make these
 * assertions depend on the machine's timezone (the same trap `test_day_key`
 * documents).
 *
 * @module tests/training/test_session_history
 */

import { describe, expect, it } from "vitest";
import { closedSessionHistory } from "../../traininglab/apps/desktop/src/features/stats/derive";
import { localDayKey } from "../../traininglab/apps/desktop/src/lib/day";
import type {
  TLSession,
  TLSet,
} from "../../traininglab/apps/desktop/src/lib/types";

let seq = 0;

/** A local instant, as an ISO string. */
const at = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
): string => new Date(year, month - 1, day, hour, minute).toISOString();

const mkSet = (
  exerciseId: string,
  timestamp: string,
  weight: number | null,
  reps: number | null,
  extra: Partial<TLSet> = {},
): TLSet => ({
  id: `set-${++seq}`,
  exerciseId,
  dayId: "day-1",
  timestamp,
  weight,
  reps,
  ...extra,
});

const mkSession = (
  id: string,
  startedAt: string,
  setIds: string[],
  extra: Partial<TLSession> = {},
): TLSession => ({
  id,
  dayId: "day-1",
  startedAt,
  completedAt: null,
  setIds,
  ...extra,
});

const TODAY = localDayKey(at(2026, 10, 16));

describe("closedSessionHistory", () => {
  it("counts one past session with its working sets, volume and marks", () => {
    const sets = [
      mkSet("barbell-squat", at(2026, 10, 1, 17, 0), 60, 8, { warmup: true }),
      mkSet("barbell-squat", at(2026, 10, 1, 17, 5), 100, 5, { effort: "D" }),
      mkSet("barbell-squat", at(2026, 10, 1, 17, 10), 100, 5, { effort: "F" }),
    ];
    const sessions = [
      mkSession(
        "s1",
        at(2026, 10, 1, 17, 0),
        sets.map((s) => s.id),
      ),
    ];

    const { entries, total } = closedSessionHistory(sessions, sets, TODAY);

    expect(total).toBe(1);
    const entry = entries[0]!;
    expect(entry.date).toBe("2026-10-01");
    expect(entry.workingSets).toBe(2);
    expect(entry.warmupSets).toBe(1);
    expect(entry.markers).toEqual({ W: 1, D: 1, F: 1 });
    expect(entry.volumeKg).toBe(1000);
    expect(entry.exercises).toEqual([{ exerciseId: "barbell-squat", sets: 3 }]);
    // First working set to last: the ramp set is inside the same span.
    expect(entry.durationMin).toBe(10);
  });

  it("leaves today's open session out and keeps today's closed one", () => {
    const openSets = [mkSet("deadlift", at(2026, 10, 16, 10, 0), 120, 3)];
    const closedSets = [mkSet("push-ups", at(2026, 10, 16, 8, 0), null, 20)];
    const sessions = [
      mkSession(
        "today-open",
        at(2026, 10, 16, 10, 0),
        openSets.map((s) => s.id),
      ),
      mkSession(
        "today-closed",
        at(2026, 10, 16, 8, 0),
        closedSets.map((s) => s.id),
        { completedAt: at(2026, 10, 16, 8, 42) },
      ),
    ];

    const { entries } = closedSessionHistory(
      sessions,
      [...openSets, ...closedSets],
      TODAY,
    );

    expect(entries.map((e) => e.id)).toEqual(["today-closed"]);
    expect(entries[0]!.durationMin).toBe(42);
  });

  it("reports no duration when the import has only dates", () => {
    // Every row of an imported sheet shares the day's local noon, which is
    // exactly the case that used to print "22 series · 1 min".
    const noon = at(2026, 10, 5);
    const sets = Array.from({ length: 4 }, (_, i) =>
      mkSet("crunch", noon, null, 15, { id: `c-${i}` }),
    );
    const sessions = [
      mkSession(
        "date-only",
        noon,
        sets.map((s) => s.id),
        { source: "owner-log" },
      ),
    ];

    const { entries } = closedSessionHistory(sessions, sets, TODAY);

    expect(entries[0]!.durationMin).toBeNull();
    expect(entries[0]!.volumeKg).toBe(0);
    expect(entries[0]!.workingSets).toBe(4);
    expect(entries[0]!.source).toBe("owner-log");
  });

  it("drops a session whose sets cannot be resolved", () => {
    const sessions = [
      mkSession("ghost", at(2026, 10, 2, 18, 0), ["missing-1"]),
    ];

    const { entries, total } = closedSessionHistory(sessions, [], TODAY);

    expect(entries).toEqual([]);
    expect(total).toBe(0);
  });

  it("orders newest first, caps the list and still reports the real total", () => {
    const sessions: TLSession[] = [];
    const sets: TLSet[] = [];
    for (let day = 1; day <= 5; day++) {
      const stamp = at(2026, 9, day, 18, 0);
      const set = mkSet("barbell-bench-press", stamp, 80, 5, {
        id: `b-${day}`,
      });
      sets.push(set);
      sessions.push(mkSession(`s-${day}`, stamp, [set.id]));
    }

    const { entries, total } = closedSessionHistory(sessions, sets, TODAY, 2);

    expect(entries.map((e) => e.date)).toEqual(["2026-09-05", "2026-09-04"]);
    expect(total).toBe(5);
  });
});
