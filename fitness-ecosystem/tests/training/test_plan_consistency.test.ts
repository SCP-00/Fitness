/**
 * Weekly consistency — owner request 2026-10-08.
 *
 * The planner must favour repeating last week's slot: stable weekly records
 * are how progressive overload becomes measurable (a week that invents fresh
 * exercises every time cannot be compared against the previous one).
 * Also pins the weight-array migration added with the `consistency` feature.
 */
import { describe, expect, it } from "vitest";
import {
  emptyModel,
  normalizeModel,
  scoreExercise,
  PRIOR_WEIGHTS,
} from "@fitness/bodylab-training";
import {
  familyLogStats,
  featuresFor,
  plannerCatalog,
  type DecisionContext,
} from "../../traininglab/apps/desktop/src/lib/plan";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

const NOW = new Date("2026-10-08T12:00:00.000Z");

function set(exerciseId: string, daysAgo: number, i = 0): TLSet {
  return {
    id: `${exerciseId}-${daysAgo}-${i}`,
    exerciseId,
    dayId: "day-1",
    timestamp: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    weight: 40,
    reps: 8,
  };
}

function ctx(logSets: TLSet[]): DecisionContext {
  return {
    weakness: {},
    logStats: familyLogStats(logSets, NOW),
    readiness: { energy: 5, motivation: 5, soreness: 0 },
    level: "intermediate",
    usedPatterns: new Set<string>(),
  };
}

const ENTRY = () =>
  plannerCatalog().find((c) => c.exercise.id === "barbell-bench-press")!;

describe("plan: familyLogStats tracks when each exercise was last done", () => {
  it("keeps the MOST RECENT day even when older sets exist", () => {
    const stats = familyLogStats(
      [set("barbell-bench-press", 20), set("barbell-bench-press", 6)],
      NOW,
    );
    expect(stats.lastDays["barbell-bench-press"]).toBeCloseTo(6, 5);
  });

  it("records nothing for exercises never performed", () => {
    const stats = familyLogStats([], NOW);
    expect(stats.lastDays["barbell-bench-press"]).toBeUndefined();
  });
});

describe("plan: consistency feature (repeat last week's slot)", () => {
  it("is 1 for ~6 days ago, 0.2 for today, 0 for never", () => {
    const lastWeek = featuresFor(ENTRY(), ctx([set("barbell-bench-press", 6)]));
    const today = featuresFor(ENTRY(), ctx([set("barbell-bench-press", 0)]));
    const never = featuresFor(ENTRY(), ctx([]));
    expect(lastWeek.consistency).toBe(1);
    expect(today.consistency).toBeCloseTo(0.2, 5);
    expect(never.consistency).toBe(0);
  });

  it("gives half credit to an adjacent slot (4 days / 12 days)", () => {
    const d4 = featuresFor(ENTRY(), ctx([set("barbell-bench-press", 4)]));
    const d12 = featuresFor(ENTRY(), ctx([set("barbell-bench-press", 12)]));
    expect(d4.consistency).toBe(0.5);
    expect(d12.consistency).toBe(0.5);
  });

  it("outscores the same exercise from scratch, all else equal", () => {
    const entry = ENTRY();
    const withLastWeek = scoreExercise(
      emptyModel(),
      featuresFor(entry, ctx([set("barbell-bench-press", 6)])),
      entry.exercise.id,
    );
    const fromScratch = scoreExercise(
      emptyModel(),
      featuresFor(entry, ctx([])),
      entry.exercise.id,
    );
    expect(withLastWeek).toBeGreaterThan(fromScratch);
  });

  it("stays inside [0,1] like every other feature", () => {
    for (const days of [0, 1, 6, 13, 30]) {
      const f = featuresFor(ENTRY(), ctx([set("barbell-bench-press", days)]));
      expect(f.consistency).toBeGreaterThanOrEqual(0);
      expect(f.consistency).toBeLessThanOrEqual(1);
    }
  });
});

describe("decision: weight-array migration when the feature set grows", () => {
  it("a 7-weight (pre-consistency) model resets to the new prior and forgets its update count", () => {
    const migrated = normalizeModel({
      version: 1,
      weights: [0.9, 1.0, 0.6, 0.8, 0.5, 0.4, 0.3],
      biases: { "barbell-bench-press": 0.4 },
      updates: 12,
    });
    expect(migrated.weights).toEqual([...PRIOR_WEIGHTS]);
    expect(migrated.weights).toHaveLength(PRIOR_WEIGHTS.length);
    expect(migrated.updates).toBe(0);
  });

  it("a current-length model keeps its drift and update count", () => {
    const current = Array.from(PRIOR_WEIGHTS);
    current[0] = 1.2;
    const kept = normalizeModel({ version: 1, weights: current, biases: {}, updates: 7 });
    expect(kept.weights[0]).toBeCloseTo(1.2, 5);
    expect(kept.updates).toBe(7);
  });
});
