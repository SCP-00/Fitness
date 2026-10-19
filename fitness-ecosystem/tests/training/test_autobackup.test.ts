/**
 * Autobackup + rep-inheritance — the two rules that came out of the owner's
 * 2026-10-05 report ("an update must never take my log", "blank reps should
 * repeat the previous set").
 *
 * The modules under test are the pure halves on purpose: the debounce and the
 * Tauri bridge need a desktop host, but the decisions — *should this write a
 * file*, *is this worth offering as a recovery*, *what does an empty field
 * mean* — are exactly the parts that used to be untestable inline `??`.
 *
 * @module tests/training/autobackup
 */

import { describe, it, expect } from "vitest";

import {
  AUTOBACKUP_DEBOUNCE_MS,
  isWorthRecovering,
  logSignature,
} from "../../traininglab/apps/desktop/src/lib/autobackup";
import {
  inheritedReps,
  inheritedWeight,
  resolveEntryWeight,
  resolveReps,
} from "../../traininglab/apps/desktop/src/lib/set-entry";
import { proposeNextSet } from "../../traininglab/apps/desktop/src/lib/set-proposal";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";
import {
  buildBackup,
  parseBackup,
  type TrainingLabMirror,
} from "../../traininglab/apps/desktop/src/lib/backup";

function set(over: Partial<TLSet> & { id: string }): TLSet {
  return {
    timestamp: "2026-10-05T10:00:00.000Z",
    dayId: "day-2026-10-05",
    exerciseId: "barbell-bench-press",
    weight: 60,
    reps: 10,
    rpe: null,
    ...over,
  } as TLSet;
}

describe("autobackup: only write when the log actually changed", () => {
  it("is stable across two identical snapshots", () => {
    const source = { sets: [set({ id: "a" })], sessions: [], health: [] };
    expect(logSignature(source)).toBe(logSignature({ ...source }));
  });

  it("changes when a set is added", () => {
    const before = { sets: [set({ id: "a" })], sessions: [], health: [] };
    const after = { sets: [set({ id: "a" }), set({ id: "b" })], sessions: [], health: [] };
    expect(logSignature(before)).not.toBe(logSignature(after));
  });

  it("changes when an older set is edited in place", () => {
    // Same count, different latest timestamp — the edit must not be skipped
    // just because the set count did not move.
    const before = { sets: [set({ id: "a" })], sessions: [], health: [] };
    const after = {
      sets: [set({ id: "a", timestamp: "2026-10-05T11:30:00.000Z", reps: 12 })],
      sessions: [],
      health: [],
    };
    expect(logSignature(before)).not.toBe(logSignature(after));
  });

  it("changes when settings appear for the first time", () => {
    const base = { sets: [], sessions: [], health: [] };
    const withSettings = { ...base, settings: { language: "es" } as never };
    expect(logSignature(base)).not.toBe(logSignature(withSettings));
  });

  // 2026-10-09: the presence bit was not enough. Changing the goal (or the
  // budget, the level, the inventory) left the mirror stale, so a model that had
  // just called `configure_training` read the values it had replaced.
  it("changes when the goal changes, even with the same set count", () => {
    const base = { sets: [], sessions: [], health: [] };
    const hypertrophy = {
      ...base,
      settings: { goal: "hypertrophy", level: "advanced" } as never,
    };
    const strength = {
      ...base,
      settings: { goal: "strength", level: "advanced" } as never,
    };
    expect(logSignature(hypertrophy)).not.toBe(logSignature(strength));
  });

  it("changes when the inventory changes", () => {
    const base = { sets: [], sessions: [], health: [] };
    const dumbbells = {
      ...base,
      settings: {
        goal: "hypertrophy",
        inventory: [{ presetId: "dumbbells-adjustable", maxLoadKg: 24 }],
      } as never,
    };
    const barbell = {
      ...base,
      settings: {
        goal: "hypertrophy",
        inventory: [
          { presetId: "dumbbells-adjustable", maxLoadKg: 24 },
          { presetId: "barbell-plates", maxLoadKg: 60 },
        ],
      } as never,
    };
    expect(logSignature(dumbbells)).not.toBe(logSignature(barbell));
  });

  it("changes when today's self-report changes", () => {
    const base = { sets: [], sessions: [], health: [] };
    const mirror = (energy: number): TrainingLabMirror => ({
      date: "2026-10-09",
      readiness: { energy, motivation: 3, soreness: 3 } as never,
      plan: [],
    });
    expect(logSignature({ ...base, mirror: mirror(3) })).not.toBe(
      logSignature({ ...base, mirror: mirror(5) }),
    );
  });

  it("changes when the plan's prescription changes", () => {
    const base = { sets: [], sessions: [], health: [] };
    const withSets = (sets: number): TrainingLabMirror => ({
      date: "2026-10-09",
      readiness: null,
      plan: [
        {
          exerciseId: "goblet-squat",
          sets,
          repsMin: 8,
          repsMax: 12,
          rir: 2,
          restSec: 120,
          pattern: "squat",
          families: ["quadriceps"],
        },
      ],
    });
    expect(logSignature({ ...base, mirror: withSets(4) })).not.toBe(
      logSignature({ ...base, mirror: withSets(3) }),
    );
  });

  it("is stable when the same log and the same mirror are fingerprinted twice", () => {
    const base = { sets: [set({ id: "a" })], sessions: [], health: [] };
    const one = {
      ...base,
      mirror: {
        date: "2026-10-09",
        readiness: null,
        plan: [
          {
            exerciseId: "goblet-squat",
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
            restSec: 120,
            pattern: "squat",
            families: ["quadriceps"],
          },
        ],
      } satisfies TrainingLabMirror,
    };
    expect(logSignature(one)).toBe(logSignature({ ...one }));
  });

  it("debounces a burst instead of writing one file per keystroke", () => {
    expect(AUTOBACKUP_DEBOUNCE_MS).toBeGreaterThanOrEqual(1000);
  });
});

describe("backup: the mirror travels with the copy, and never back in", () => {
  const mirror: TrainingLabMirror = {
    date: "2026-10-09",
    readiness: { energy: 4, motivation: 4, soreness: 2 } as never,
    plan: [
      {
        exerciseId: "goblet-squat",
        sets: 4,
        repsMin: 8,
        repsMax: 12,
        rir: 2,
        restSec: 120,
        pattern: "squat",
        families: ["quadriceps"],
      },
    ],
  };

  it("writes the mirror when the app has one", () => {
    const backup = buildBackup({
      sets: [],
      sessions: [],
      health: [],
      settings: null,
      decisionModel: null,
      mirror,
    });
    expect(backup.mirror).toEqual(mirror);
  });

  it("omits the mirror when there is none (an exported file stays as it was)", () => {
    const backup = buildBackup({
      sets: [],
      sessions: [],
      health: [],
      settings: null,
      decisionModel: null,
    });
    expect(backup.mirror).toBeUndefined();
    expect("mirror" in backup).toBe(false);
  });

  it("drops the mirror on the way back in: a restore must not import yesterday's energy", () => {
    const text = JSON.stringify(
      buildBackup({
        sets: [set({ id: "a" })],
        sessions: [],
        health: [],
        settings: null,
        decisionModel: null,
        mirror,
      }),
    );
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.sets).toHaveLength(1);
    expect("mirror" in parsed.backup).toBe(false);
  });

});

describe("autobackup: only offer a recovery when the log is really empty", () => {
  const backup = buildBackup({
    sets: [set({ id: "a" }), set({ id: "b" })],
    sessions: [],
    health: [],
    settings: null,
    decisionModel: null,
  });

  it("offers itself when the device has nothing at all", () => {
    expect(isWorthRecovering({ backup, localSets: 0, localSessions: 0 })).toBe(true);
  });

  it("stays quiet when the log already has sets", () => {
    expect(isWorthRecovering({ backup, localSets: 3, localSessions: 0 })).toBe(false);
  });

  it("stays quiet when the copy itself is empty", () => {
    const empty = buildBackup({
      sets: [],
      sessions: [],
      health: [],
      settings: null,
      decisionModel: null,
    });
    expect(isWorthRecovering({ backup: empty, localSets: 0, localSessions: 0 })).toBe(false);
  });
});

describe("logging a set: what an empty reps field means", () => {
  it("uses what you typed", () => {
    const r = resolveReps({
      typed: 8,
      sets: [set({ id: "a", reps: 12 })],
      prescribedMin: 8,
    });
    expect(r).toEqual({ reps: 8, inherited: false, source: "typed" });
  });

  it("repeats the previous set when the field is blank", () => {
    // The rule the owner asked for: the third set of 12 is 12 until it is not.
    const r = resolveReps({
      typed: null,
      sets: [set({ id: "a", reps: 8 }), set({ id: "b", reps: 12 })],
      prescribedMin: 8,
    });
    expect(r).toEqual({ reps: 12, inherited: true, source: "previous-set" });
  });

  it("does not let a countless trailing set erase the value to repeat", () => {
    const r = resolveReps({
      typed: null,
      sets: [set({ id: "a", reps: 10 }), set({ id: "b", reps: null })],
      prescribedMin: 8,
    });
    expect(r.reps).toBe(10);
  });

  it("falls back to the prescribed minimum only when there is nothing to repeat", () => {
    const r = resolveReps({ typed: null, sets: [], prescribedMin: 8 });
    expect(r).toEqual({ reps: 8, inherited: true, source: "prescribed-min" });
  });

  it("treats zero and negatives as blank rather than as a value", () => {
    const r = resolveReps({ typed: 0, sets: [set({ id: "a", reps: 11 })], prescribedMin: 8 });
    expect(r.reps).toBe(11);
  });

  it("reads the most recent counted set, not the first", () => {
    expect(inheritedReps([set({ id: "a", reps: 5 }), set({ id: "b", reps: 9 })])).toBe(9);
  });

  it("has nothing to inherit from an empty log", () => {
    expect(inheritedReps([])).toBeNull();
  });
});
describe("logging a set: the weight is shown, not asked for", () => {
  it("inherits the load of the previous set", () => {
    expect(inheritedWeight([set({ id: "a", weight: 60 })])).toBe(60);
  });

  it("uses the most recent load, not the first", () => {
    expect(inheritedWeight([set({ id: "a", weight: 50 }), set({ id: "b", weight: 65 })])).toBe(65);
  });

  it("falls back to the suggestion when nothing was logged", () => {
    expect(inheritedWeight([], 42.5)).toBe(42.5);
  });

  it("ignores a trailing bodyweight set instead of poisoning the chain", () => {
    // A dip-bar set with no load must not make the next set bodyweight.
    expect(inheritedWeight([set({ id: "a", weight: 60 }), set({ id: "b", weight: null })], 42)).toBe(60);
  });

  it("has no load at all with neither a set nor a suggestion", () => {
    expect(inheritedWeight([], null)).toBeNull();
  });

  it("a typed weight wins over the proposal", () => {
    expect(
      resolveEntryWeight({ typed: 70, unit: "kg", proposalKg: 60 }),
    ).toBe(70);
  });

  it("a typed weight is typed in the display unit, and stored in kg", () => {
    // 100 lb is not 100 kg. This is the bug the row had: the field is in lb and
    // the log is in kg, so the typed figure has to be converted.
    expect(
      resolveEntryWeight({ typed: 100, unit: "lb", proposalKg: 60 }),
    ).toBeCloseTo(45.3592, 3);
  });

  it("a blank weight takes the proposal's number", () => {
    expect(
      resolveEntryWeight({ typed: null, unit: "kg", proposalKg: 60 }),
    ).toBe(60);
  });

  it("treats a zero or negative typed load as blank", () => {
    expect(
      resolveEntryWeight({ typed: 0, unit: "kg", proposalKg: 60 }),
    ).toBe(60);
    expect(
      resolveEntryWeight({ typed: -5, unit: "kg", proposalKg: 60 }),
    ).toBe(60);
  });

  it("a blank weight repeats the previous set when the proposal says so", () => {
    // The chain the row runs end to end: proposal first, then the field rule.
    const proposal = proposeNextSet({
      sets: [set({ id: "a", weight: 60, reps: 10 })],
      targetReps: { min: 8, max: 12 },
      stepKg: 2.5,
      capKg: 100,
      suggestionKg: 42,
    });
    expect(proposal.move).toBe("repeat");
    expect(
      resolveEntryWeight({ typed: null, unit: "kg", proposalKg: proposal.weightKg }),
    ).toBe(60);
  });

  it("a blank weight with no sets uses the planner's suggestion", () => {
    const proposal = proposeNextSet({
      sets: [],
      targetReps: { min: 8, max: 12 },
      stepKg: 2.5,
      capKg: 100,
      suggestionKg: 42,
    });
    expect(proposal.move).toBe("first");
    expect(
      resolveEntryWeight({ typed: null, unit: "kg", proposalKg: proposal.weightKg }),
    ).toBe(42);
  });
});
