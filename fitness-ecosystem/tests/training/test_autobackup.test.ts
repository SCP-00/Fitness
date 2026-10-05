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
  resolveReps,
  resolveWeight,
} from "../../traininglab/apps/desktop/src/lib/set-entry";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";
import { buildBackup } from "../../traininglab/apps/desktop/src/lib/backup";

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

  it("debounces a burst instead of writing one file per keystroke", () => {
    expect(AUTOBACKUP_DEBOUNCE_MS).toBeGreaterThanOrEqual(1000);
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

  it("a typed weight wins over inheritance", () => {
    const r = resolveWeight({ typed: 70, sets: [set({ id: "a", weight: 60 })], suggestionKg: 42 });
    expect(r).toEqual({ weightKg: 70, inherited: false, source: "typed" });
  });

  it("a blank weight repeats the previous set, and says so", () => {
    const r = resolveWeight({ typed: null, sets: [set({ id: "a", weight: 60 })], suggestionKg: 42 });
    expect(r).toEqual({ weightKg: 60, inherited: true, source: "previous-set" });
  });

  it("a blank weight with no sets uses the suggestion, and says so", () => {
    const r = resolveWeight({ typed: null, sets: [], suggestionKg: 42 });
    expect(r).toEqual({ weightKg: 42, inherited: true, source: "suggestion" });
  });

  it("treats a zero or negative typed load as blank", () => {
    const r = resolveWeight({ typed: 0, sets: [set({ id: "a", weight: 60 })], suggestionKg: 42 });
    expect(r.weightKg).toBe(60);
  });
});
