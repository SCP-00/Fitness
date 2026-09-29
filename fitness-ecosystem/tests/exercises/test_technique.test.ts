/**
 * Technique layer — the coaching contract.
 *
 * The app shows this text next to a drawn animation and claims it prevents
 * injuries. Three promises have to hold, and this suite exists to hold them:
 *
 *   1. **every** exercise resolves technique and a demo (no blanks in the UI);
 *   2. the copy is genuinely bilingual — Spanish that is a copy of the English
 *      is the failure mode nobody notices in review;
 *   3. the animation actually moves (a "demo" with identical frames is a still
 *      picture pretending to be one, and the rig is data so it can drift);
 *   4. the safety advice is never empty: an exercise we teach without saying
 *      where it hurts is worse than teaching nothing.
 *
 * @module tests/exercises/test_technique
 */

import { describe, it, expect } from "vitest";
import {
  ALL_EXERCISES,
  PATTERN_TECHNIQUE,
  PATTERN_DEMOS,
  TECHNIQUE_OVERRIDES,
  getExerciseTechnique,
  techniqueLevelLabel,
  jointStressLabel,
  type Cue,
  type MovementPattern,
} from "@fitness/bodylab-exercises";

const allResolved = ALL_EXERCISES.map((ex) => ({
  id: ex.id,
  tech: getExerciseTechnique(ex.id)!,
}));

const nonEmpty = (cue: Cue, label: string) => {
  expect(cue.en.trim().length, `${label} (en)`).toBeGreaterThan(8);
  expect(cue.es.trim().length, `${label} (es)`).toBeGreaterThan(8);
  // A Spanish string identical to its English twin is almost always an omission.
  expect(cue.es.trim(), `${label} looks untranslated`).not.toBe(cue.en.trim());
};

describe("technique: every exercise can be taught", () => {
  it("resolves technique for the whole catalog", () => {
    const missing = ALL_EXERCISES.filter((ex) => !getExerciseTechnique(ex.id)).map(
      (ex) => ex.id,
    );
    expect(missing).toEqual([]);
  });

  it("returns null for an unknown id instead of throwing", () => {
    expect(getExerciseTechnique("does-not-exist")).toBeNull();
  });

  it("gives every exercise at least 3 setup cues, 3 execution cues, 2 mistakes and a safety note", () => {
    for (const { id, tech } of allResolved) {
      expect(tech.setup.length, `${id} setup`).toBeGreaterThanOrEqual(3);
      expect(tech.execution.length, `${id} execution`).toBeGreaterThanOrEqual(3);
      expect(tech.mistakes.length, `${id} mistakes`).toBeGreaterThanOrEqual(2);
      expect(tech.safety.length, `${id} safety`).toBeGreaterThanOrEqual(1);
    }
  });

  it("writes every cue in both languages, with real translations", () => {
    for (const { id, tech } of allResolved) {
      tech.setup.forEach((c, i) => nonEmpty(c, `${id}.setup[${i}]`));
      tech.execution.forEach((c, i) => nonEmpty(c, `${id}.execution[${i}]`));
      tech.mistakes.forEach((c, i) => nonEmpty(c, `${id}.mistakes[${i}]`));
      tech.safety.forEach((c, i) => nonEmpty(c, `${id}.safety[${i}]`));
      nonEmpty(tech.breathing, `${id}.breathing`);
      nonEmpty(tech.techniqueWhy, `${id}.techniqueWhy`);
      nonEmpty(tech.effort.note, `${id}.effort.note`);
    }
  });

  it("states the effort target in RIR terms with a reason", () => {
    for (const { id, tech } of allResolved) {
      expect(tech.effort.rir.trim().length, `${id} rir`).toBeGreaterThan(2);
      // Either a numeric RIR target or an explicit non-RIR metric (holds, pace).
      expect(tech.effort.rir).toMatch(/\d|n\/a/);
    }
  });

  it("labels every technique level and joint-stress level in both languages", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(techniqueLevelLabel(level, "en").length).toBeGreaterThan(2);
      expect(techniqueLevelLabel(level, "es").length).toBeGreaterThan(2);
    }
    for (const level of [1, 2, 3] as const) {
      expect(jointStressLabel(level, "en").length).toBeGreaterThan(2);
      expect(jointStressLabel(level, "es").length).toBeGreaterThan(2);
    }
  });
});

describe("technique: the drawn demo is real animation", () => {
  it("covers every movement pattern with keyframes", () => {
    for (const pattern of Object.keys(PATTERN_TECHNIQUE) as MovementPattern[]) {
      const demo = PATTERN_DEMOS[pattern];
      expect(demo, `${pattern} has no demo`).toBeDefined();
      expect(demo.frames.length).toBeGreaterThanOrEqual(2);
      expect(demo.cycleMs).toBeGreaterThan(300);
      expect(demo.watch.length).toBeGreaterThan(0);
    }
  });

  it("moves in at least one dimension per pattern (no still picture claiming to be a demo)", () => {
    for (const [pattern, demo] of Object.entries(PATTERN_DEMOS)) {
      const keys = ["torso", "thigh", "shin", "arm", "forearm", "hand", "foot", "spread", "legSpread"] as const;
      const moves = keys.some(
        (k) => new Set(demo.frames.map((f) => f[k] ?? 0)).size > 1,
      );
      expect(moves, `${pattern} has identical frames`).toBe(true);
    }
  });

  it("keeps every angle a finite number", () => {
    for (const [pattern, demo] of Object.entries(PATTERN_DEMOS)) {
      for (const frame of demo.frames) {
        for (const [key, value] of Object.entries(frame)) {
          expect(Number.isFinite(value), `${pattern}.${key}`).toBe(true);
        }
      }
    }
  });

  it("declares a view and an anchor for every demo", () => {
    for (const [pattern, demo] of Object.entries(PATTERN_DEMOS)) {
      expect(["side", "front"], pattern).toContain(demo.view);
      expect(["ankle", "hip"], pattern).toContain(demo.anchor);
      expect(typeof demo.ground, pattern).toBe("boolean");
    }
  });
});

describe("technique: variant cues stay honest", () => {
  it("never references an exercise that no longer exists", () => {
    const ids = new Set(ALL_EXERCISES.map((ex) => ex.id));
    const orphans = Object.keys(TECHNIQUE_OVERRIDES).filter((id) => !ids.has(id));
    expect(orphans).toEqual([]);
  });

  it("flags which exercises carry variant cues, and they add value", () => {
    const flagged = allResolved.filter((r) => r.tech.hasVariantCues).map((r) => r.id);
    expect(flagged.length).toBeGreaterThanOrEqual(10);
    for (const id of flagged) {
      const tech = getExerciseTechnique(id)!;
      const override = TECHNIQUE_OVERRIDES[id];
      const added =
        (override.setup?.length ?? 0) +
        (override.execution?.length ?? 0) +
        (override.mistakes?.length ?? 0);
      // A variant that only rewrites the tempo is fine, an empty one is not.
      expect(added > 0 || override.tempo !== undefined, id).toBe(true);
      expect(tech.setup.length).toBeGreaterThanOrEqual(
        PATTERN_TECHNIQUE[tech.pattern].setup.length,
      );
    }
  });
});
