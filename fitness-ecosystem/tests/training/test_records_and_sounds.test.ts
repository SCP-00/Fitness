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
 *   4. unloaded work has marks of its own (2026-10-13): reps for pull-ups, dips
 *      and push-ups, seconds for planks and hangs, and neither currency can
 *      cross into the other;
 *   5. the audio module is safe on a machine with no Web Audio and never throws
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
  type BestMarks,
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

  it("keeps a bodyweight set out of the load mark and puts it in the rep mark", () => {
    const marks = marksOf([{ weight: null, reps: 20 }]);
    expect(marks.bestWeightKg).toBeNull();
    expect(marks.bestReps).toBe(20);
  });

  it("tracks reps and holds in their own currency at the same time", () => {
    const marks = marksOf([
      { weight: null, reps: 12 }, // pull-ups
      { weight: null, reps: 8 },
      { weight: null, reps: null, durationSec: 62 }, // dead hang
      { weight: 40, reps: 5 }, // weighted dip: a load, not a bodyweight mark
    ]);
    expect(marks.bestReps).toBe(12);
    expect(marks.bestHoldSec).toBe(62);
    expect(marks.bestWeightKg).toBe(40);
  });

  it("reads a set with reps *and* seconds as timed work, never as both", () => {
    const marks = marksOf([{ weight: null, reps: 3, durationSec: 45 }]);
    expect(marks.bestHoldSec).toBe(45);
    expect(marks.bestReps).toBeNull();
  });

  it("ignores a zero-second or negative hold instead of inventing a mark", () => {
    const marks = marksOf([
      { weight: null, reps: null, durationSec: 0 },
      { weight: null, reps: null, durationSec: -10 },
      { weight: null, reps: 9 },
    ]);
    expect(marks.bestHoldSec).toBeNull();
    expect(marks.bestReps).toBe(9);
  });

  it("folds BodyLab's exported PRs into the local history", () => {
    const local = marksOf([{ weight: 90, reps: 5 }]);
    const imported: BestMarks = {
      bestWeightKg: 120,
      bestEst1RmKg: 140,
      bestReps: null,
      bestHoldSec: null,
    };
    expect(mergeMarks(local, imported)).toEqual({
      bestWeightKg: 120,
      bestEst1RmKg: 140,
      bestReps: null,
      bestHoldSec: null,
    });
  });

  it("keeps a one-sided mark (BodyLab export without a weight)", () => {
    expect(
      mergeMarks(EMPTY_MARKS, {
        bestWeightKg: null,
        bestEst1RmKg: 95,
        bestReps: null,
        bestHoldSec: null,
      }),
    ).toEqual({ bestWeightKg: null, bestEst1RmKg: 95, bestReps: null, bestHoldSec: null });
  });

  it("does not let an export without bodyweight marks erase the local ones", () => {
    // BodyLab only exports load PRs, so its `bestReps: null` means "nothing to
    // say", never "you have no reps recorded".
    const local = marksOf([{ weight: null, reps: 15 }]);
    expect(mergeMarks(local, { ...EMPTY_MARKS, bestWeightKg: 60, bestEst1RmKg: 70 })).toEqual({
      bestWeightKg: 60,
      bestEst1RmKg: 70,
      bestReps: 15,
      bestHoldSec: null,
    });
  });
});

describe("detectRecord", () => {
  const best: BestMarks = {
    ...EMPTY_MARKS,
    bestWeightKg: 100,
    bestEst1RmKg: 110,
  };

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

  it("judges a bodyweight set on its reps, since it has no load to compare", () => {
    // The owner's log is mostly pull-ups, dips and push-ups: before 2026-10-13
    // this returned null and no bodyweight set could ever be a record.
    const bodyweight: BestMarks = { ...EMPTY_MARKS, bestReps: 10 };
    expect(detectRecord(bodyweight, null, 12)).toEqual({
      kind: "reps",
      value: 12,
      previous: 10,
    });
    // `0` is the app's other spelling of "no load" (see `lib/set-entry`).
    expect(detectRecord(bodyweight, 0, 12)).toEqual({
      kind: "reps",
      value: 12,
      previous: 10,
    });
  });

  it("calls the first bodyweight set of an exercise a first mark", () => {
    expect(detectRecord(EMPTY_MARKS, null, 5)).toEqual({
      kind: "reps",
      value: 5,
      previous: null,
    });
  });

  it("never celebrates the same bodyweight set twice", () => {
    const bodyweight: BestMarks = { ...EMPTY_MARKS, bestReps: 12 };
    expect(detectRecord(bodyweight, null, 12)).toBeNull();
    expect(detectRecord(bodyweight, null, 11)).toBeNull();
  });

  it("times a hold against holds, and only against holds", () => {
    const plannedHold: BestMarks = {
      ...EMPTY_MARKS,
      bestHoldSec: 45,
      bestReps: 30,
    };
    expect(detectRecord(plannedHold, null, null, { durationSec: 60 })).toEqual({
      kind: "hold",
      value: 60,
      previous: 45,
    });
    expect(detectRecord(plannedHold, null, null, { durationSec: 45 })).toBeNull();
    // A hold is timed work even when the set also carries reps.
    expect(detectRecord(plannedHold, null, 2, { durationSec: 50 })).toEqual({
      kind: "hold",
      value: 50,
      previous: 45,
    });
  });

  it("will not let a rep count stand in for a hold or the other way round", () => {
    // 60 s on record says nothing about how many reps you can do: the 40-rep set
    // is never measured against it, it just opens the rep mark.
    const holdOnly: BestMarks = { ...EMPTY_MARKS, bestHoldSec: 60 };
    expect(detectRecord(holdOnly, null, 40)).toEqual({
      kind: "reps",
      value: 40,
      previous: null,
    });
    // ...and with both marks known, a tie on reps is silent however far the
    // hold mark is, because the two never talk to each other.
    const both: BestMarks = { ...EMPTY_MARKS, bestHoldSec: 60, bestReps: 45 };
    expect(detectRecord(both, null, 45)).toBeNull();
    expect(detectRecord(both, null, 46)).toEqual({
      kind: "reps",
      value: 46,
      previous: 45,
    });
    // The mirror case: nothing is known about holds, so the first one is a
    // first mark (previous: null), not a comparison against reps.
    const repsOnly: BestMarks = { ...EMPTY_MARKS, bestReps: 40 };
    expect(detectRecord(repsOnly, null, null, { durationSec: 20 })).toEqual({
      kind: "hold",
      value: 20,
      previous: null,
    });
  });

  it("stays silent for a bodyweight set with neither reps nor seconds", () => {
    expect(detectRecord(EMPTY_MARKS, null, null)).toBeNull();
    expect(detectRecord(EMPTY_MARKS, null, 0)).toBeNull();
    expect(detectRecord(EMPTY_MARKS, 0, null, { durationSec: 0 })).toBeNull();
  });

  it("keeps the loaded and unloaded records from crossing over", () => {
    // A 40 kg dip of 5 must not be read as a 5-rep bodyweight mark, nor the
    // 12 bodyweight dips as a load mark.
    const weighted: BestMarks = { ...EMPTY_MARKS, bestWeightKg: 40, bestEst1RmKg: 46.7, bestReps: null };
    expect(detectRecord(weighted, 40, 5)).toBeNull();
    const bodyweight: BestMarks = { ...EMPTY_MARKS, bestReps: 12 };
    expect(detectRecord(bodyweight, 40, 5)).toEqual({
      kind: "weight",
      value: 40,
      previous: null,
    });
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
