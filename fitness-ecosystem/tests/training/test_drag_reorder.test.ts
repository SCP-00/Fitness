/**
 * Drag, as data (2026-10-19).
 *
 * The pointer hook is hard to test without a browser; the decisions it makes
 * are not. These cases pin the two pure functions the hook and the store rely
 * on: the queue's permutation and the week's effective-day swap.
 *
 * @module tests/training/drag-reorder
 */

import { describe, expect, it } from "vitest";
import { moveItem } from "../../traininglab/apps/desktop/src/lib/reorder";
import {
  effectiveWeekSpec,
  swapWeekOverrides,
  type WeekDayShape,
} from "../../traininglab/apps/desktop/src/lib/week-swap";
import type { WeekDayOverride } from "../../traininglab/apps/desktop/src/lib/types";

const week: WeekDayShape[] = [
  { isRest: false, assigned: ["chest"] },
  { isRest: true, assigned: [] },
  { isRest: false, assigned: ["quadriceps"] },
  { isRest: true, assigned: [] },
  { isRest: false, assigned: ["lats"] },
  { isRest: true, assigned: [] },
  { isRest: true, assigned: [] },
];

describe("moveItem: a permutation, never a filter", () => {
  it("moves down and up without losing or duplicating", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns a new array even for a no-op", () => {
    const input = ["a", "b"];
    const output = moveItem(input, 1, 1);
    expect(output).toEqual(input);
    expect(output).not.toBe(input);
  });

  it("ignores an out-of-range index instead of dropping an item", () => {
    expect(moveItem(["a", "b"], -1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, 9)).toEqual(["a", "b"]);
  });
});

describe("swapWeekOverrides: moving a session between days", () => {
  it("moves a training day onto rest and leaves the source resting", () => {
    const next = swapWeekOverrides(week, undefined, 0, 1);
    expect(next).toEqual({
      0: { kind: "rest" },
      1: { kind: "train", families: ["chest"] },
    });
    // The input map is never mutated.
    expect(week[0]!.isRest).toBe(false);
  });

  it("swaps two training days", () => {
    expect(swapWeekOverrides(week, undefined, 0, 2)).toEqual({
      0: { kind: "train", families: ["quadriceps"] },
      2: { kind: "train", families: ["chest"] },
    });
  });

  it("uses the authored day, not the generated one, as the source", () => {
    const overrides: Record<number, WeekDayOverride> = {
      0: { kind: "train", families: ["biceps"] },
    };
    expect(swapWeekOverrides(week, overrides, 0, 1)).toEqual({
      0: { kind: "rest" },
      1: { kind: "train", families: ["biceps"] },
    });
  });

  it("does nothing when both effective days have the same plan", () => {
    const rows: WeekDayShape[] = [
      { isRest: true, assigned: [] },
      { isRest: true, assigned: [] },
    ];
    expect(swapWeekOverrides(rows, undefined, 0, 1)).toBeNull();
  });

  it("refuses an out-of-range or same-day request", () => {
    expect(swapWeekOverrides(week, undefined, 2, 2)).toBeNull();
    expect(swapWeekOverrides(week, undefined, -1, 2)).toBeNull();
    expect(swapWeekOverrides(week, undefined, 0, 7)).toBeNull();
  });

  it("reads an override as the effective spec", () => {
    expect(
      effectiveWeekSpec({ isRest: true, assigned: [] }, {
        kind: "train",
        families: ["core"],
      }),
    ).toEqual({ kind: "train", families: ["core"] });
  });
});
