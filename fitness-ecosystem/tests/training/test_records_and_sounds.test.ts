/**
 * Records, set completion and sound cues
 * (`traininglab/apps/desktop/src/lib/records.ts` + `lib/sounds.ts`).
 *
 * The interesting promises here are small and easy to get subtly wrong:
 *   1. a personal record is only called when something was actually beaten —
 *      tying your own best is not a record;
 *   2. the Epley estimate matches BodyLab's to the decimal, so the two apps
 *      never disagree about a personal best;
 *   3. the achievement cue fires on exactly one set (the one that completed the
 *      prescription), never again on extra volume;
 *   4. the audio module is safe on a machine with no Web Audio and never throws
 *      from a cue — it is called mid-workout.
 *
 * `lib/sounds.ts` is imported directly (not mocked) to prove it is safe to
 * import and call in a non-browser environment.
 *
 * @module tests/training/records_and_sounds
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EMPTY_MARKS,
  completionRatio,
  detectRecord,
  epleyOneRm,
  isExerciseComplete,
  marksByExercise,
  marksOf,
  mergeMarks,
  setsDoneFor,
} from "../../traininglab/apps/desktop/src/lib/records";
import {
  CUE_KINDS,
  CUE_LABELS,
  audioSupported,
  configureSounds,
  installAudioUnlock,
  playCue,
  resetAudioForTests,
  soundConfig,
  unlockAudio,
} from "../../traininglab/apps/desktop/src/lib/sounds";

// ── Epley estimate ──────────────────────────────────────────────────────────

describe("epleyOneRm", () => {
  it("matches BodyLab's rounding exactly (0.1 kg)", () => {
    // BodyLab: Math.round(w * (1 + reps / 30) * 10) / 10
    expect(epleyOneRm(100, 5)).toBe(116.7);
    expect(epleyOneRm(80, 8)).toBe(101.3);
    expect(epleyOneRm(60, 10)).toBe(80);
  });

  it("does not inflate a true single", () => {
    expect(epleyOneRm(140, 1)).toBe(140);
  });

  it("returns null for anything that is not a real set", () => {
    expect(epleyOneRm(null, 5)).toBeNull();
    expect(epleyOneRm(100, null)).toBeNull();
    expect(epleyOneRm(0, 5)).toBeNull();
    expect(epleyOneRm(100, 0)).toBeNull();
    expect(epleyOneRm(Number.NaN, 5)).toBeNull();
  });
});

// ── Marks ───────────────────────────────────────────────────────────────────

describe("marksOf / mergeMarks", () => {
  it("takes the heaviest load and the best estimate independently", () => {
    const marks = marksOf([
      { weight: 100, reps: 1 },
      { weight: 80, reps: 12 },
    ]);
    expect(marks.bestWeightKg).toBe(100);
    // 80 × 12 → 112, which beats the 103.3 the 100 kg single produces.
    expect(marks.bestEst1RmKg).toBe(112);
  });

  it("ignores bodyweight sets when computing the load mark", () => {
    expect(marksOf([{ weight: null, reps: 20 }]).bestWeightKg).toBeNull();
  });

  it("folds BodyLab's exported PRs into the local history", () => {
    const local = marksOf([{ weight: 90, reps: 5 }]);
    const imported = { bestWeightKg: 120, bestEst1RmKg: 140 };
    expect(mergeMarks(local, imported)).toEqual({
      bestWeightKg: 120,
      bestEst1RmKg: 140,
    });
  });

  it("keeps a one-sided mark (BodyLab export without a weight)", () => {
    expect(
      mergeMarks(EMPTY_MARKS, { bestWeightKg: null, bestEst1RmKg: 95 }),
    ).toEqual({
      bestWeightKg: null,
      bestEst1RmKg: 95,
    });
  });
});

describe("detectRecord", () => {
  const best = { bestWeightKg: 100, bestEst1RmKg: 110 };

  it("reports a heavier load as a load record", () => {
    expect(detectRecord(best, 105, 3)).toEqual({
      kind: "weight",
      value: 105,
      previous: 100,
    });
  });

  it("reports a higher estimate when the load did not move", () => {
    // 100 kg × 8 → 126.7, above the previous 110 estimate.
    expect(detectRecord(best, 100, 8)).toEqual({
      kind: "e1rm",
      value: 126.7,
      previous: 110,
    });
  });

  it("never calls a tie a record — re-logging the same set is silent", () => {
    expect(detectRecord(best, 100, 3)).toBeNull();
  });

  it("is silent for anything lighter and unremarkable", () => {
    expect(detectRecord(best, 90, 5)).toBeNull();
  });

  it("treats the first real load as the first recorded mark", () => {
    expect(detectRecord(EMPTY_MARKS, 60, 8)).toEqual({
      kind: "weight",
      value: 60,
      previous: null,
    });
  });

  it("ignores bodyweight and duration work", () => {
    expect(detectRecord(best, null, 12)).toBeNull();
    expect(detectRecord(best, 0, 12)).toBeNull();
  });
});

describe("setsDoneFor / isExerciseComplete / completionRatio", () => {
  const sets = [
    { exerciseId: "squat" },
    { exerciseId: "bench" },
    { exerciseId: "squat" },
  ];

  it("counts only the requested exercise", () => {
    expect(setsDoneFor(sets, "squat")).toBe(2);
    expect(setsDoneFor(sets, "deadlift")).toBe(0);
  });

  it("fires the achievement on exactly the completing set", () => {
    expect(isExerciseComplete(1, 3)).toBe(false);
    expect(isExerciseComplete(2, 3)).toBe(false);
    expect(isExerciseComplete(3, 3)).toBe(true);
    // Extra volume beyond the prescription is welcome, but not another award.
    expect(isExerciseComplete(4, 3)).toBe(false);
  });

  it("never fires without a prescription", () => {
    expect(isExerciseComplete(1, 0)).toBe(false);
  });

  it("clamps the progress ratio to 0–1", () => {
    expect(completionRatio(1, 4)).toBe(0.25);
    expect(completionRatio(6, 4)).toBe(1);
    expect(completionRatio(3, 0)).toBe(0);
  });
});

describe("marksByExercise", () => {
  it("groups a whole log in one pass", () => {
    const map = marksByExercise([
      { exerciseId: "squat", weight: 100, reps: 5 },
      { exerciseId: "squat", weight: 90, reps: 5 },
      { exerciseId: "bench", weight: 60, reps: 10 },
    ]);
    expect(map.get("squat")!.bestWeightKg).toBe(100);
    expect(map.get("bench")!.bestEst1RmKg).toBe(80);
    expect(map.get("curl")).toBeUndefined();
  });
});

// ── Sound cues ──────────────────────────────────────────────────────────────

describe("sound cues", () => {
  beforeEach(() => {
    resetAudioForTests();
  });

  it("labels every cue for both languages", () => {
    for (const cue of CUE_KINDS) {
      expect(CUE_LABELS[cue].en.length).toBeGreaterThan(0);
      expect(CUE_LABELS[cue].es.length).toBeGreaterThan(0);
    }
  });

  it("does not pretend the environment supports audio it does not have", () => {
    // Node/vitest has no AudioContext; the module must report that honestly
    // instead of offering a switch that cannot work.
    expect(audioSupported()).toBe(false);
  });

  it("never throws when called from a workout with no audio stack", () => {
    expect(() => playCue("bell")).not.toThrow();
    expect(playCue("bell")).toBe(false);
    expect(playCue("record")).toBe(false);
    expect(playCue("achievement")).toBe(false);
  });

  it("does not throw while installing the unlock listener outside a browser", () => {
    expect(() => installAudioUnlock()).not.toThrow();
    expect(() => installAudioUnlock()).not.toThrow(); // idempotent
    return expect(unlockAudio()).resolves.toBe(false);
  });

  it("stays silent when the user turned the cues off", () => {
    configureSounds({ enabled: false });
    expect(soundsAreOff()).toBe(true);
    expect(playCue("record")).toBe(false);
    configureSounds({ enabled: true });
    expect(soundsAreOff()).toBe(false);
  });

  it("clamps the volume instead of trusting the caller", () => {
    configureSounds({ volume: 5 });
    expect(soundConfig().volume).toBe(1);
    configureSounds({ volume: -2 });
    expect(soundConfig().volume).toBe(0);
  });
});

/** `soundConfig().enabled` under a name that reads as an assertion. */
function soundsAreOff(): boolean {
  return !soundConfig().enabled;
}
