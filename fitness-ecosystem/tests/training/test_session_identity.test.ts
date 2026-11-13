import { describe, expect, it } from "vitest";
import { localDayKey } from "../../traininglab/apps/desktop/src/lib/day";
import { unassignedTodaySets } from "../../traininglab/apps/desktop/src/lib/session-identity";
import type { TLSession, TLSet } from "../../traininglab/apps/desktop/src/lib/types";

const today = new Date(2026, 10, 12, 12, 0, 0);
const yesterday = new Date(2026, 10, 11, 12, 0, 0);
const todayKey = localDayKey(today.toISOString());

function set(id: string, timestamp: Date, patch: Partial<TLSet> = {}): TLSet {
  return {
    id,
    exerciseId: "squat",
    timestamp: timestamp.toISOString(),
    weight: 100,
    reps: 5,
    ...patch,
  };
}

function session(id: string, setIds: string[]): TLSession {
  return {
    id,
    dayId: `day-${todayKey}`,
    startedAt: today.toISOString(),
    completedAt: today.toISOString(),
    setIds,
    readiness: 3,
    budgetMin: 60,
  };
}

describe("unassignedTodaySets", () => {
  it("does not reuse sets already enclosed by a previous session", () => {
    const first = set("a", today);
    const second = set("b", today);
    const third = set("c", today);
    const fourth = set("d", today);

    expect(
      unassignedTodaySets(
        [first, second, third, fourth],
        [session("closed", ["a", "b", "c"])],
        todayKey,
      ).map((s) => s.id),
    ).toEqual(["d"]);
  });

  it("includes a same-tick batch once and ignores duplicates and other days", () => {
    const first = set("a", today);
    const batch = set("b", today);
    const older = set("old", yesterday);
    const duplicate = set("b", today);

    expect(
      unassignedTodaySets(
        [first, older],
        [],
        todayKey,
        [batch, duplicate, first],
      ).map((s) => s.id),
    ).toEqual(["a", "b"]);
  });

  it("ignores warm-up sets so they never count as session work", () => {
    const work = set("work", today);
    const warmup = set("warmup", today, { warmup: true });

    expect(
      unassignedTodaySets([work, warmup], [], todayKey).map((s) => s.id),
    ).toEqual(["work"]);
  });
});
