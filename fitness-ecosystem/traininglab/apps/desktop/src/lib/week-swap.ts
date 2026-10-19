/**
 * Moving a session from one day to another (Semana, 2026-10-19).
 *
 * The week has two layers: the generator's plan and the owner's authored days
 * (`settings.weekOverrides`). Dragging a day must never rewrite the generator;
 * it writes the *owner's* layer, exactly like the editor does. Two details make
 * the result honest:
 *
 *   * the swap is computed from the **effective** day (override if present,
 *     otherwise what the plan assigned), so dragging Tuesday's generated
 *     session onto Friday moves what the screen was showing;
 *   * an authored day that ends up identical to the generated one is **removed**
 *     from the override map instead of pinned as a custom copy — the plan keeps
 *     its freedom on days the gesture did not really change.
 *
 * Pure: no React, no store, no mutation of the input map.
 *
 * @module lib/week-swap
 */

import type { MuscleFamily } from "@fitness/bodylab-training";
import type { WeekPlan } from "./plan";
import type { WeekDayOverride } from "./types";

/** The part of a week row this module needs. Keeps tests free of the UI type. */
export interface WeekDayShape {
  isRest: boolean;
  assigned: readonly MuscleFamily[];
}

export type WeekSpec =
  | { kind: "rest" }
  | { kind: "train"; families: MuscleFamily[] };

export function effectiveWeekSpec(
  row: WeekDayShape,
  override: WeekDayOverride | undefined,
): WeekSpec {
  if (override) {
    return override.kind === "rest"
      ? { kind: "rest" }
      : { kind: "train", families: [...override.families] };
  }
  return row.isRest
    ? { kind: "rest" }
    : { kind: "train", families: [...row.assigned] };
}

function sameSpec(a: WeekSpec, b: WeekSpec): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "rest" || b.kind === "rest") return true;
  if (a.families.length !== b.families.length) return false;
  const left = [...a.families].sort();
  const right = [...b.families].sort();
  return left.every((family, index) => family === right[index]);
}

/**
 * Swap two days of the week. Returns the new override map, or `null` when the
 * request is invalid or changes nothing (out of range, same day, identical
 * plans) — a no-op must not create a custom-day badge for no reason.
 */
export function swapWeekOverrides(
  rows: readonly WeekDayShape[],
  overrides: Record<number, WeekDayOverride> | undefined,
  from: number,
  to: number,
): Record<number, WeekDayOverride> | null {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= rows.length ||
    to >= rows.length
  ) {
    return null;
  }
  const fromRow = rows[from]!;
  const toRow = rows[to]!;
  const fromSpec = effectiveWeekSpec(fromRow, overrides?.[from]);
  const toSpec = effectiveWeekSpec(toRow, overrides?.[to]);
  if (sameSpec(fromSpec, toSpec)) return null;

  const next: Record<number, WeekDayOverride> = { ...(overrides ?? {}) };
  const write = (index: number, spec: WeekSpec, auto: WeekDayShape) => {
    // Leave the generator in charge when the day already looks like this.
    if (sameSpec(spec, effectiveWeekSpec(auto, undefined))) delete next[index];
    else next[index] = spec;
  };
  write(from, toSpec, fromRow);
  write(to, fromSpec, toRow);
  return next;
}

/** Convenience for the store: the rows of a `WeekPlan`. */
export function swapPlanDays(
  plan: WeekPlan,
  overrides: Record<number, WeekDayOverride> | undefined,
  from: number,
  to: number,
): Record<number, WeekDayOverride> | null {
  return swapWeekOverrides(plan.rows, overrides, from, to);
}
