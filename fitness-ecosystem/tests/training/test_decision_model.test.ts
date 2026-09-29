/**
 * Decision model (`core/training/decision.ts`) — the JEV-class learner.
 *
 * Four promises are worth testing and nothing else:
 *   1. with zero data it still behaves like a sane trainer (deterministic prior),
 *   2. real outcomes move it (learning),
 *   3. no sequence of outcomes can make it unstable (clamped weights),
 *   4. it can always explain itself (contributions sum to the score).
 *
 * @module tests/training/decision_model
 */

import { describe, it, expect } from "vitest";
import {
  emptyModel,
  normalizeModel,
  scoreExercise,
  explain,
  rankCandidates,
  rewardFromOutcome,
  updateModel,
  drift,
  FEATURE_ORDER,
  PRIOR_WEIGHTS,
  WEIGHT_LIMIT,
  type DecisionFeatures,
} from "@fitness/bodylab-training";

const f = (over: Partial<DecisionFeatures> = {}): DecisionFeatures => ({
  weaknessGap: 0.5,
  weeklyGap: 0.5,
  freshness: 0.5,
  readinessFit: 0.5,
  variety: 0.5,
  preference: 0.5,
  cheapness: 0.5,
  ...over,
});

describe("Decision model: useful before it has learned anything", () => {
  it("starts exactly on the documented prior", () => {
    const model = emptyModel();
    expect(model.weights).toEqual([...PRIOR_WEIGHTS]);
    expect(model.updates).toBe(0);
  });

  it("prefers the exercise that trains the weakest, most under-trained family", () => {
    const model = emptyModel();
    const needed = scoreExercise(
      model,
      f({ weaknessGap: 0.9, weeklyGap: 0.9 }),
      "inverted-row",
    );
    const alreadyDone = scoreExercise(
      model,
      f({ weaknessGap: 0.1, weeklyGap: 0 }),
      "lateral-raise",
    );
    expect(needed).toBeGreaterThan(alreadyDone);
  });

  it("respects readiness: a heavy option loses when the body is beaten up", () => {
    const model = emptyModel();
    expect(scoreExercise(model, f({ readinessFit: 1 }), "a")).toBeGreaterThan(
      scoreExercise(model, f({ readinessFit: 0 }), "a"),
    );
  });

  it("ranks deterministically, ties broken by id", () => {
    const ranked = rankCandidates(emptyModel(), () => f(), ["zeta", "alpha"]);
    expect(ranked.map((r) => r.exerciseId)).toEqual(["alpha", "zeta"]);
  });
});

describe("Decision model: it learns from real sets", () => {
  it("rewards a completed top-of-range slot and punishes an abandoned one", () => {
    const good = rewardFromOutcome({
      avgReps: 12,
      repsMin: 8,
      repsMax: 12,
      setsDone: 4,
      setsPrescribed: 4,
    });
    const exact = rewardFromOutcome({
      avgReps: 10,
      repsMin: 8,
      repsMax: 12,
      setsDone: 4,
      setsPrescribed: 4,
    });
    const bad = rewardFromOutcome({
      avgReps: 5,
      repsMin: 8,
      repsMax: 12,
      setsDone: 1,
      setsPrescribed: 4,
    });
    expect(good).toBeGreaterThan(0.3);
    expect(exact).toBeGreaterThan(-0.2);
    expect(exact).toBeLessThan(0.2);
    expect(bad).toBeLessThan(-0.3);
  });

  it("moves the exercise it was rewarded for, in the context it happened in", () => {
    const context = f({ weaknessGap: 0.8, weeklyGap: 0.8 });
    const before = scoreExercise(emptyModel(), context, "pull-ups");
    const afterGood = scoreExercise(
      updateModel(emptyModel(), context, "pull-ups", 1),
      context,
      "pull-ups",
    );
    const afterBad = scoreExercise(
      updateModel(emptyModel(), context, "pull-ups", -1),
      context,
      "pull-ups",
    );
    expect(afterGood).toBeGreaterThan(before);
    expect(afterBad).toBeLessThan(before);
  });

  it("learns a user preference that the prior cannot know", () => {
    // Same context every time: the model should end up liking A over B.
    let model = emptyModel();
    const context = f();
    for (let i = 0; i < 25; i++) {
      model = updateModel(model, context, "band-row", 1);
      model = updateModel(model, context, "inverted-row", -1);
    }
    const ranked = rankCandidates(model, () => context, [
      "band-row",
      "inverted-row",
    ]);
    expect(ranked[0]!.exerciseId).toBe("band-row");
    expect(model.updates).toBe(50);
  });

  it("cannot be destabilised: 500 perfect outcomes stay inside the clamp", () => {
    let model = emptyModel();
    const context = f({
      weaknessGap: 1,
      weeklyGap: 1,
      freshness: 1,
      readinessFit: 1,
      variety: 1,
      preference: 1,
      cheapness: 1,
    });
    for (let i = 0; i < 500; i++)
      model = updateModel(model, context, "dips", 1);
    for (const w of model.weights)
      expect(Math.abs(w)).toBeLessThanOrEqual(WEIGHT_LIMIT);
    expect(Math.abs(model.biases["dips"]!)).toBeLessThanOrEqual(1.5);
    const score = scoreExercise(model, context, "dips");
    expect(score).toBeLessThanOrEqual(1);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("ignores nonsense rewards instead of blowing up", () => {
    const model = updateModel(emptyModel(), f(), "dips", Number.NaN);
    expect(model.weights.every((w) => Number.isFinite(w))).toBe(true);
  });
});

describe("Decision model: it can explain itself", () => {
  it("contribution parts sum exactly to the score above neutral", () => {
    let model = emptyModel();
    model = updateModel(model, f({ weaknessGap: 0.7 }), "dips", 1);
    const context = f({ weaknessGap: 0.7, variety: 0.9 });
    const score = scoreExercise(model, context, "dips");
    const parts = explain(model, context, "dips");
    const sum = parts.reduce((acc, p) => acc + p.contribution, 0);
    expect(Math.abs(sum - (score - 0.5))).toBeLessThan(1e-9);
    // One entry per feature plus the learned bias.
    expect(parts.length).toBe(FEATURE_ORDER.length + 1);
    expect(parts.some((p) => p.feature === "bias" && p.weight !== 0)).toBe(
      true,
    );
  });

  it("exposes drift from the prior so the UI can show (and reset) learning", () => {
    let model = emptyModel();
    for (let i = 0; i < 10; i++)
      model = updateModel(model, f({ weaknessGap: 1 }), "dips", 1);
    const rows = drift(model);
    expect(rows.length).toBe(FEATURE_ORDER.length);
    const weaknessRow = rows.find((r) => r.feature === "weaknessGap")!;
    expect(weaknessRow.weight).toBeGreaterThan(weaknessRow.prior);
  });
});

describe("Decision model: storage round-trip", () => {
  it("rebuilds the prior from garbage and clamps stored weights", () => {
    const fromGarbage = normalizeModel("not a model");
    expect(fromGarbage.weights).toEqual([...PRIOR_WEIGHTS]);

    const hostile = normalizeModel({
      weights: [99, -99, "x", null, undefined, 1, 2],
      biases: { dips: 50, weird: "no" },
      updates: -3,
    });
    expect(hostile.weights.every((w) => Math.abs(w) <= WEIGHT_LIMIT)).toBe(
      true,
    );
    expect(hostile.biases["dips"]).toBe(1.5);
    expect(hostile.biases["weird"]).toBeUndefined();
    expect(hostile.updates).toBe(0);
  });
});
