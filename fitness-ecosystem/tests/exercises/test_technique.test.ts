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

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  ALL_EXERCISES,
  DEMO_PATTERN_OVERRIDES,
  PATTERN_TECHNIQUE,
  PATTERN_DEMOS,
  TECHNIQUE_OVERRIDES,
  EXERCISE_DEMOS,
  demoFor,
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

describe("technique: a pattern's advice can be replaced when it does not apply", () => {
  /**
   * `horizontal_pull` coaches a one-arm dumbbell row: a handle, a free hand on
   * the bench and a "working side". `table-row` (added 2026-10-20, the owner's
   * bodyweight week) has none of those, so its override replaces the sections
   * instead of appending to them — appending is how a correct exercise ends up
   * teaching an incorrect cue.
   */
  it("table-row drops the dumbbell-row cues it cannot honour", () => {
    const tech = getExerciseTechnique("table-row")!;
    const text = [...tech.setup, ...tech.execution, ...tech.mistakes, ...tech.safety]
      .map((cue) => `${cue.en} ${cue.es}`)
      .join(" ");
    expect(tech.hasVariantCues).toBe(true);
    for (const ghost of [
      "free hand",
      "hooking the handle",
      "working side",
      "mano libre",
      "enganchar el agarre",
      "lado que trabaja",
    ]) {
      expect(text.toLowerCase()).not.toContain(ghost.toLowerCase());
    }
  });

  /**
   * The exercises whose pattern is a *different movement*, not a variant of
   * the same one (2026-10-21). Replacing the cues but keeping the pattern's
   * "why it is hard" was the same lie in a smaller font: the diamond push-up
   * was still explaining that "the shoulder must stay quiet while the elbow
   * moves " — true of a cable pushdown, false of a push-up.
   *
   * The list is explicit rather than automatic: several exercises replace their
   * setup and still inherit a perfectly good `techniqueWhy` (the prone Y is a
   * small-range shoulder abduction, and the pattern says exactly that).
   */
  const REPURPOSED_PATTERNS = [
    "table-row",
    "diamond-push-up",
    "pike-push-up",
    "nordic-curl",
    "copenhagen-plank",
  ];

  it("rewrites the difficulty reason when the pattern is a different movement", () => {
    for (const id of REPURPOSED_PATTERNS) {
      const tech = getExerciseTechnique(id)!;
      expect(tech.techniqueWhy, id).not.toEqual(
        PATTERN_TECHNIQUE[tech.pattern].techniqueWhy,
      );
    }
  });

  it("can correct the pattern's skill cost where it does not apply", () => {
    // A Nordic curl inherits `knee_flexion` (2/5, a leg-curl machine). Braking
    // the whole bodyweight on the hamstring is not a 2.
    expect(getExerciseTechnique("nordic-curl")!.techniqueLevel).toBe(4);
    expect(getExerciseTechnique("barbell-curl")!.techniqueLevel).toBe(
      PATTERN_TECHNIQUE.elbow_flexion.techniqueLevel,
    );
  });

  it("every exercise still meets the coaching minimums after any replacement", () => {
    for (const { id, tech } of allResolved) {
      expect(tech.setup.length, `${id} setup`).toBeGreaterThanOrEqual(3);
      expect(tech.execution.length, `${id} execution`).toBeGreaterThanOrEqual(3);
      expect(tech.mistakes.length, `${id} mistakes`).toBeGreaterThanOrEqual(2);
      expect(tech.safety.length, `${id} safety`).toBeGreaterThanOrEqual(1);
    }
  });

  it("per-exercise demos exist only for real exercises, and they differ from the pattern's", () => {
    const ids = new Set(ALL_EXERCISES.map((ex) => ex.id));
    for (const [id, demo] of Object.entries(EXERCISE_DEMOS)) {
      expect(ids.has(id), id).toBe(true);
      expect(demo.frames.length, id).toBeGreaterThan(1);
      // A distinct demo that copies the pattern frame for frame teaches nothing.
      const pattern = getExerciseTechnique(id)!.pattern;
      expect(demo).not.toEqual(PATTERN_DEMOS[pattern]);
    }
    // And the resolver hands the exercise its own figure, not the pattern's.
    expect(demoFor("table-row", "horizontal_pull")).toBe(EXERCISE_DEMOS["table-row"]);
    expect(demoFor("barbell-row", "horizontal_pull")).toBe(
      PATTERN_DEMOS["horizontal_pull"],
    );
  });

  it("borrows another pattern's figure when the assigned one is a different movement", () => {
    // `diamond-push-up` is filed under `elbow_extension` (the triceps finish the
    // rep), but that pattern's figure is a standing cable pushdown. The floor
    // push-up figure is the honest one, and it already exists (2026-10-21).
    expect(DEMO_PATTERN_OVERRIDES["diamond-push-up"]).toBe("horizontal_push");
    expect(demoFor("diamond-push-up", "elbow_extension")).toBe(
      PATTERN_DEMOS["horizontal_push"],
    );
    for (const [id, pattern] of Object.entries(DEMO_PATTERN_OVERRIDES)) {
      expect(ALL_EXERCISES.some((ex) => ex.id === id), id).toBe(true);
      // Borrowing a figure only makes sense when it is a different movement.
      expect(getExerciseTechnique(id)!.pattern, id).not.toBe(pattern);
    }
  });
});

/**
 * The other half of the teaching material (2026-10-21).
 *
 * 36 GIFs and 84 stills reach 115 of the 152 catalog exercises; the safest
 * redistributable source (free-exercise-db, Unlicense) has no entry for any of
 * the other 37, which was verified by name. So for those rows the pattern's
 * coaching is the *only* text the app can show: correct, but generic — it can
 * describe a squat, not how wide your feet are in a sumo squat.
 *
 * This suite pins the promise made when the 37 were reviewed: an exercise with
 * no reference media carries hand-written cues of its own, and those cues say
 * something the pattern does not already say.
 */
describe("technique: no image never means no specific teaching", () => {
  const DIR = path.resolve(
    __dirname,
    "../../traininglab/apps/desktop/public/exercises",
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(DIR, "asset-manifest.json"), "utf8"),
  ) as Record<string, unknown>;

  const withoutMedia = ALL_EXERCISES.filter((ex) => !manifest[ex.id]);

  it("still finds exercises with neither a GIF nor a still on disk", () => {
    // If this becomes zero the rest of the suite is vacuous, not wrong: the
    // assertion documents the real state of the media folder.
    expect(withoutMedia.length).toBeGreaterThan(0);
  });

  it("gives every media-less exercise its own cues", () => {
    const bare = withoutMedia
      .filter((ex) => TECHNIQUE_OVERRIDES[ex.id] === undefined)
      .map((ex) => ex.id);
    expect(bare).toEqual([]);
  });

  it("and those cues add at least one sentence the pattern does not have", () => {
    for (const { id } of withoutMedia) {
      const tech = getExerciseTechnique(id)!;
      const patternText = [
        ...PATTERN_TECHNIQUE[tech.pattern].setup,
        ...PATTERN_TECHNIQUE[tech.pattern].execution,
        ...PATTERN_TECHNIQUE[tech.pattern].mistakes,
        ...PATTERN_TECHNIQUE[tech.pattern].safety,
      ]
        .map((cue) => cue.en)
        .join(" | ");
      const added = [...tech.setup, ...tech.execution, ...tech.mistakes, ...tech.safety]
        .map((cue) => cue.en)
        .filter((en) => !patternText.includes(en));
      expect(added.length, id).toBeGreaterThan(0);
    }
  });
});
