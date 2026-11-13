/**
 * A focused day may repeat its family — twice, never with the same pattern
 * (2026-10-30).
 *
 * Why the rule changed: «hoy quiero entrenar pecho» is the most common request
 * there is, and `validateProposal` refused every answer to it because it allowed
 * one chest exercise per session. The engine never had that rule — `session.ts`
 * limits one slot per movement PATTERN — so the coach was stricter than the
 * planner, and the local model looked broken while it was following the prompt.
 *
 * The two claims pinned here:
 *   1. without a focus, one slot per family (unchanged);
 *   2. with the family focused, two slots — but never a repeated pattern, and
 *      never a third.
 */
import { describe, expect, it } from "vitest";
import { validateProposal } from "../../traininglab/apps/desktop/src/lib/llm";

const FAMILY: Record<string, string> = {
  "barbell-bench-press": "chest",
  "dumbbell-pullover": "chest",
  "incline-bench-press": "chest",
  "goblet-squat": "quadriceps",
  lunges: "quadriceps",
  "v-up": "core",
  "dumbbell-fly": "chest",
  "pseudo-planche-push-up": "shoulders",
};

const PATTERN: Record<string, string> = {
  "barbell-bench-press": "horizontal_push",
  "dumbbell-pullover": "shoulder_extension",
  "incline-bench-press": "horizontal_push",
  "goblet-squat": "squat",
  lunges: "lunge",
  "v-up": "core_flexion",
  "dumbbell-fly": "horizontal_push",
  "pseudo-planche-push-up": "horizontal_push",
};

function ctx(focusFamilies?: string[]) {
  return {
    usableIds: new Set(Object.keys(FAMILY)),
    timeBudgetMin: 90,
    primaryFamilyOf: (id: string) => FAMILY[id] ?? id,
    patternOf: (id: string) => PATTERN[id] ?? "",
    setupMinOf: () => 1,
    focusFamilies,
  };
}

const slot = (exerciseId: string) => ({
  exerciseId,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSec: 90,
});

describe("focused day: the family may repeat, the pattern may not", () => {
  it("still refuses a second chest exercise when the day is NOT focused", () => {
    const check = validateProposal(
      { slots: [slot("barbell-bench-press"), slot("dumbbell-pullover")] },
      ctx(),
    );
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("repeats the chest work");
  });

  it("accepts two chest exercises of different patterns on a chest day", () => {
    const check = validateProposal(
      { slots: [slot("barbell-bench-press"), slot("dumbbell-pullover")] },
      ctx(["chest"]),
    );
    expect(check.ok).toBe(true);
    expect(check.slots.map((s) => s.exerciseId)).toEqual([
      "barbell-bench-press",
      "dumbbell-pullover",
    ]);
  });

  it("refuses a THIRD chest exercise even on a chest day", () => {
    const check = validateProposal(
      {
        slots: [
          slot("barbell-bench-press"),
          slot("dumbbell-pullover"),
          slot("incline-bench-press"),
        ],
      },
      ctx(["chest"]),
    );
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("a focused day allows two");
  });

  it("allows two presses on a chest day: the focus may repeat its pattern once", () => {
    // Fifteen of the sixteen chest exercises are `horizontal_push`; a strict
    // pattern rule would make a chest day impossible. Bench + fly is normal.
    const check = validateProposal(
      { slots: [slot("barbell-bench-press"), slot("dumbbell-fly")] },
      ctx(["chest"]),
    );
    expect(check.ok).toBe(true);
    expect(check.slots.length).toBe(2);
  });

  it("still refuses a third use of the same pattern across families", () => {
    const check = validateProposal(
      {
        slots: [
          slot("barbell-bench-press"),
          slot("dumbbell-fly"),
          slot("pseudo-planche-push-up"),
        ],
      },
      ctx(["chest"]),
    );
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toMatch(/horizontal_push/);
  });

  it("allows two leg exercises (squat + lunge) on a leg day", () => {
    const check = validateProposal(
      { slots: [slot("goblet-squat"), slot("lunges")] },
      ctx(["quadriceps"]),
    );
    expect(check.ok).toBe(true);
  });

  it("keeps the other families at one even when one family is focused", () => {
    const check = validateProposal(
      {
        slots: [
          slot("barbell-bench-press"),
          slot("dumbbell-pullover"),
          slot("v-up"),
          slot("v-up"),
        ],
      },
      ctx(["chest"]),
    );
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("repeats the core work");
  });
});
