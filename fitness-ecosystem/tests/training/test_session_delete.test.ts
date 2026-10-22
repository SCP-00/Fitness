/**
 * `sessionDeletePlan` — the numbers a delete confirmation is allowed to promise.
 *
 * @module tests/training/test_session_delete
 */

import { describe, it, expect } from "vitest";
import { sessionDeletePlan } from "../../traininglab/apps/desktop/src/lib/session-delete";
import type {
  TLSet,
  TLSession,
} from "../../traininglab/apps/desktop/src/lib/types";

const set = (over: Partial<TLSet> & Pick<TLSet, "id">): TLSet => ({
  exerciseId: "barbell-squat",
  dayId: "day-1",
  timestamp: "2026-10-07T10:00:00.000Z",
  weight: 100,
  reps: 5,
  ...over,
});

const session = (setIds: string[]): TLSession => ({
  id: "s-1",
  dayId: "day-2026-10-07",
  startedAt: "2026-10-07T10:00:00.000Z",
  completedAt: "2026-10-07T11:00:00.000Z",
  setIds,
});

describe("sessionDeletePlan", () => {
  it("counts working sets and volume, and keeps warm-ups out of both", () => {
    const sets = [
      set({ id: "a", weight: 60, reps: 5, warmup: true }),
      set({ id: "b", weight: 100, reps: 5 }),
      set({ id: "c", weight: 110, reps: 3 }),
    ];
    const plan = sessionDeletePlan(session(["a", "b", "c"]), sets);
    expect(plan.workingSets).toBe(2);
    expect(plan.warmupSets).toBe(1);
    // 100×5 + 110×3 — the 60×5 ramp is not work.
    expect(plan.volumeKg).toBe(830);
    expect(plan.setIds).toEqual(["a", "b", "c"]);
  });

  it("lists each exercise once, in the order the session touched it", () => {
    const sets = [
      set({ id: "a", exerciseId: "barbell-squat" }),
      set({ id: "b", exerciseId: "romanian-deadlift" }),
      set({ id: "c", exerciseId: "barbell-squat" }),
    ];
    const plan = sessionDeletePlan(session(["a", "b", "c"]), sets);
    expect(plan.exerciseIds).toEqual(["barbell-squat", "romanian-deadlift"]);
  });

  it("ignores a set that is no longer on disk and says how many", () => {
    const sets = [set({ id: "a" })];
    const plan = sessionDeletePlan(session(["a", "b"]), sets);
    expect(plan.setIds).toEqual(["a"]);
    expect(plan.missingSets).toBe(1);
  });

  it("does not invent volume for a set without weight or reps", () => {
    const sets = [
      set({ id: "a", weight: null, reps: 12 }),
      set({ id: "b", weight: 40, reps: null }),
    ];
    const plan = sessionDeletePlan(session(["a", "b"]), sets);
    expect(plan.volumeKg).toBe(0);
    expect(plan.workingSets).toBe(2);
  });

  it("is stable: the same input twice gives the same plan", () => {
    const sets = [set({ id: "a" }), set({ id: "b" })];
    const s = session(["a", "b"]);
    expect(sessionDeletePlan(s, sets)).toEqual(sessionDeletePlan(s, sets));
  });
});
