import { afterEach, describe, expect, it } from "vitest";
import {
  SET_UNDO_MS,
  describeSet,
  setEditDiff,
  setUndoExerciseId,
  setUndoLine,
  setUndoRestore,
} from "../../traininglab/apps/desktop/src/lib/set-undo";
import { setLanguage, t } from "../../traininglab/apps/desktop/src/lib/i18n";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

function set(over: Partial<TLSet> = {}): TLSet {
  return {
    id: "s1",
    exerciseId: "back-squat",
    dayId: "day-1",
    timestamp: "2026-10-20T18:00:00.000Z",
    weight: 100,
    reps: 5,
    ...over,
  };
}

afterEach(() => setLanguage("es"));

describe("setEditDiff", () => {
  it("calls a save that wrote back the same numbers a no-op", () => {
    expect(setEditDiff(set(), set()).changed).toBe(false);
    // The form always sends all three fields; identical ones must not count.
    expect(
      setEditDiff(set({ effort: "F" }), set({ effort: "F" })).changed,
    ).toBe(false);
    // `undefined` and `null` are the same absence for the mark — one is "no
    // field", the other "cleared", and both mean the set is plain work.
    expect(setEditDiff(set(), set({ effort: undefined })).changed).toBe(false);
  });

  it("reports the load it is about to overwrite, both ways", () => {
    const diff = setEditDiff(set({ weight: 100 }), set({ weight: 10 }));
    expect(diff.changed).toBe(true);
    expect(diff.weight).toEqual({ from: 100, to: 10 });
    expect(diff.reps).toBeNull();
    expect(diff.effort).toBeNull();
  });

  it("treats clearing a marker as a real change, with null as the new value", () => {
    const diff = setEditDiff(set({ effort: "D" }), set());
    expect(diff.changed).toBe(true);
    expect(diff.effort).toEqual({ from: "D", to: null });
    // And putting one on, the other direction.
    expect(setEditDiff(set(), set({ effort: "F" })).effort).toEqual({
      from: null,
      to: "F",
    });
  });

  it("separates reps from weight so the undo line can be specific", () => {
    const diff = setEditDiff(set({ weight: 80, reps: 5 }), set({ weight: 80, reps: 8 }));
    expect(diff.weight).toBeNull();
    expect(diff.reps).toEqual({ from: 5, to: 8 });
  });

  it("a bodyweight set that gains one rep is still an edit", () => {
    const diff = setEditDiff(
      set({ weight: null, reps: 8 }),
      set({ weight: null, reps: 9 }),
    );
    expect(diff.changed).toBe(true);
    expect(diff.weight).toBeNull();
    expect(diff.reps).toEqual({ from: 8, to: 9 });
  });
});

describe("describeSet", () => {
  it("writes a loaded set the way the history column does, with the user's comma", () => {
    setLanguage("es");
    expect(describeSet(set({ weight: 82.5, reps: 6 }))).toBe("82,5 kg × 6");
    setLanguage("en");
    expect(describeSet(set({ weight: 82.5, reps: 6 }))).toBe("82.5 kg × 6");
  });

  it("keeps reps on an unloaded set — they are the only number it has", () => {
    setLanguage("es");
    expect(describeSet(set({ weight: null, reps: 8 }))).toBe("8 reps");
  });

  it("describes a hold by its seconds, never by a load it does not have", () => {
    setLanguage("es");
    const hold = set({ weight: null, reps: null, durationSec: 45 });
    expect(describeSet(hold)).toContain("45");
    expect(describeSet(hold)).not.toContain("kg");
  });

  it("declares a warm-up and its effort mark instead of hiding them", () => {
    setLanguage("es");
    const line = describeSet(set({ warmup: true, effort: "F" }));
    expect(line).toContain(t("ex.history.warmup"));
    expect(line).toContain("F");
  });
});

describe("setUndoLine", () => {
  it("names the exercise and the exact set a deletion took", () => {
    setLanguage("es");
    const line = setUndoLine({ kind: "remove", set: set() }, "Sentadilla");
    expect(line).toBe("Sentadilla · 100 kg × 5");
  });

  it("shows what the numbers were and what they became after an edit", () => {
    setLanguage("es");
    const line = setUndoLine(
      {
        kind: "edit",
        before: set({ weight: 100 }),
        after: set({ weight: 10 }),
      },
      "Sentadilla",
    );
    expect(line).toBe("Sentadilla · 100 kg × 5 → 10 kg × 5");
  });
});

describe("setUndoEntry helpers", () => {
  it("restores the previous version for both kinds of change", () => {
    const removed = set({ id: "gone" });
    const before = set({ weight: 100 });
    const after = set({ weight: 10 });
    expect(setUndoRestore({ kind: "remove", set: removed })).toEqual(removed);
    expect(setUndoRestore({ kind: "edit", before, after })).toEqual(before);
    expect(setUndoExerciseId({ kind: "edit", before, after })).toBe(
      before.exerciseId,
    );
  });

  it("keeps the undo window long enough to be used on a phone", () => {
    // Deleting a set is a mis-tap away at all times; the window is the whole
    // safety net, so 8 s (the old value) is the floor, not a target.
    expect(SET_UNDO_MS).toBeGreaterThanOrEqual(10_000);
  });
});
