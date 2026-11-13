/**
 * Continuity, pinned.
 *
 * The owner's ask (2026-10-30) was that repeating a routine must let the load
 * climb — "las rutinas deben tener un valor de continuidad". These tests hold
 * the three claims that make that true instead of decorative:
 *
 *   1. the load a routine quotes is the one **he actually lifted**, read from
 *      the log on every call (never stored in the template);
 *   2. the split proposed by "Desde mi historial" is a shape he **already**
 *      repeats — two sessions minimum, prescription from the most recent one;
 *   3. warm-up ramps are invisible, as everywhere else in the app.
 *
 * @module tests/training/test_routine_continuity
 */

import { describe, expect, it } from "vitest";
import {
  daysBetween,
  exerciseContinuity,
  routineContinuity,
  routineSignature,
  suggestedRoutines,
} from "../../traininglab/apps/desktop/src/lib/routine-continuity";
import {
  makeRoutine,
  routineItemFor,
  type Routine,
} from "../../traininglab/apps/desktop/src/lib/routines";
import type {
  TLSession,
  TLSet,
} from "../../traininglab/apps/desktop/src/lib/types";

/** A set at a local noon, the way the app stores them. */
function set(
  id: string,
  exerciseId: string,
  day: string,
  weight: number | null,
  reps: number,
  extra: Partial<TLSet> = {},
): TLSet {
  return {
    id,
    exerciseId,
    dayId: day,
    timestamp: `${day}T12:00:00.000Z`,
    weight,
    reps,
    ...extra,
  };
}

function session(
  id: string,
  day: string,
  setIds: string[],
  extra: Partial<TLSession> = {},
): TLSession {
  return {
    id,
    dayId: day,
    startedAt: `${day}T12:00:00.000Z`,
    completedAt: `${day}T13:00:00.000Z`,
    setIds,
    ...extra,
  };
}

const BENCH = "barbell-bench-press";
const ROW = "barbell-row";

function routineOf(items: { exerciseId: string; sets: number }[]): Routine {
  const built = items
    .map((item) => routineItemFor(item.exerciseId, { sets: item.sets }))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const routine = makeRoutine("Empuje", built, new Date("2026-10-01T09:00:00Z"));
  if (!routine) throw new Error("fixture routine is invalid");
  return routine;
}

describe("routine continuity", () => {
  it("reads the last day from the log, with the load that closed it", () => {
    const sets = [
      set("a", BENCH, "2026-10-01", 40, 10),
      set("b", BENCH, "2026-10-01", 45, 8),
      set("c", BENCH, "2026-10-08", 47.5, 9),
    ];
    const entry = exerciseContinuity(sets, BENCH, new Date("2026-10-10T12:00:00Z"));
    expect(entry.lastDay).toBe("2026-10-08");
    expect(entry.daysAgo).toBe(2);
    expect(entry.topWeightKg).toBe(47.5);
    expect(entry.topReps).toBe(9);
    expect(entry.workingSets).toBe(1);
  });

  it("ignores the warm-up ramp, like every other aggregate", () => {
    const sets = [
      set("w", BENCH, "2026-10-08", 60, 5, { warmup: true }),
      set("c", BENCH, "2026-10-08", 45, 8),
    ];
    const entry = exerciseContinuity(sets, BENCH, new Date("2026-10-08T18:00:00Z"));
    expect(entry.topWeightKg).toBe(45);
    expect(entry.workingSets).toBe(1);
  });

  it("says `null` for an exercise the log has never seen, instead of 0 kg", () => {
    const entry = exerciseContinuity([], ROW, new Date("2026-10-08T18:00:00Z"));
    expect(entry.lastDay).toBeNull();
    expect(entry.daysAgo).toBeNull();
    expect(entry.topWeightKg).toBeNull();
  });

  it("counts how much of the routine the log knows, and names the rest", () => {
    const routine = routineOf([
      { exerciseId: BENCH, sets: 3 },
      { exerciseId: ROW, sets: 4 },
    ]);
    const sets = [set("a", BENCH, "2026-10-06", 50, 8)];
    const continuity = routineContinuity(
      routine,
      sets,
      new Date("2026-10-08T12:00:00Z"),
    );
    expect(continuity.total).toBe(2);
    expect(continuity.known).toBe(1);
    expect(continuity.lastDaysAgo).toBe(2);
    expect(continuity.unheard).toEqual([ROW]);
  });

  it("counts calendar days, not hours", () => {
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-10-08", "2026-10-08")).toBe(0);
  });

  it("identifies a group of exercises without caring about their order", () => {
    expect(routineSignature([{ exerciseId: ROW }, { exerciseId: BENCH }])).toBe(
      routineSignature([{ exerciseId: BENCH }, { exerciseId: ROW }]),
    );
  });
});

describe("routines from my history", () => {
  const sets = [
    // Day 1 — bench + row.
    set("1", BENCH, "2026-10-01", 40, 8),
    set("2", BENCH, "2026-10-01", 40, 9),
    set("3", ROW, "2026-10-01", 35, 10),
    // Day 2 — same two, heavier and in the other order.
    set("4", ROW, "2026-10-06", 37.5, 10),
    set("5", BENCH, "2026-10-06", 42.5, 8),
    set("6", BENCH, "2026-10-06", 42.5, 9),
    set("7", BENCH, "2026-10-06", 42.5, 10),
    // A day that happened only once: it is a day, not a shape.
    set("8", "goblet-squat", "2026-10-07", 20, 12),
    set("9", "plank", "2026-10-07", null, null, { durationSec: 45 }),
  ];
  const sessions = [
    session("s1", "2026-10-01", ["1", "2", "3"]),
    session("s2", "2026-10-06", ["4", "5", "6", "7"]),
    session("s3", "2026-10-07", ["8", "9"]),
  ];

  it("proposes only groups the owner repeated at least twice", () => {
    const suggestions = suggestedRoutines(sets, sessions);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.times).toBe(2);
    expect(suggestions[0]!.lastDay).toBe("2026-10-06");
  });

  it("takes the prescription from the most recent session of the group", () => {
    const [suggested] = suggestedRoutines(sets, sessions);
    const bench = suggested!.items.find((item) => item.exerciseId === BENCH);
    const row = suggested!.items.find((item) => item.exerciseId === ROW);
    // Three bench sets on 2026-10-06 — not the two of 2026-10-01.
    expect(bench?.sets).toBe(3);
    // 8 to 10 reps is what he actually did that day, not a default 8–12.
    expect(bench?.repsMin).toBe(8);
    expect(bench?.repsMax).toBe(10);
    expect(row?.sets).toBe(1);
  });

  it("never proposes an exercise the catalogue does not know", () => {
    const withGhost = [
      ...sets,
      set("x1", "ejercicio-inventado", "2026-10-01", 10, 10),
      set("x2", "ejercicio-inventado", "2026-10-06", 10, 10),
    ];
    const sessionsWithGhost = [
      session("s1", "2026-10-01", ["1", "2", "3", "x1"]),
      session("s2", "2026-10-06", ["4", "5", "6", "7", "x2"]),
    ];
    const suggestions = suggestedRoutines(withGhost, sessionsWithGhost);
    const ids = suggestions.flatMap((entry) =>
      entry.items.map((item) => item.exerciseId),
    );
    expect(ids).not.toContain("ejercicio-inventado");
  });

  it("respects the limit and answers an empty list when nothing repeats", () => {
    expect(suggestedRoutines(sets, sessions.slice(2))).toEqual([]);
    const one = suggestedRoutines(sets, sessions, 0);
    expect(one).toEqual([]);
  });

  it("ignores sessions whose sets were deleted from the log", () => {
    const orphan = suggestedRoutines(sets, [session("s9", "2026-10-09", [])]);
    expect(orphan).toEqual([]);
  });
});
