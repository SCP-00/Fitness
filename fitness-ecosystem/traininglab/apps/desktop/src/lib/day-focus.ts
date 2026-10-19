/**
 * The day's focus — "hoy toca abdomen" as one choice.
 *
 * The engine has always been able to bias a day towards a family group
 * (`focusFamilies` in `core/training/session.ts`): what was missing was one
 * place that says *which* groups the app offers. This module is that place, and
 * it exists separately for one reason: the Inicio chips and the MCP action
 * `set_day_focus` must speak the same vocabulary. Two copies of this table
 * would drift, and a model that sent `focus: "abdomen"` would be refused for a
 * group the user's own button calls `core`.
 *
 * `auto` is the empty list on purpose: no focus at all is the engine's own
 * decision, which is right most days.
 *
 * @module lib/day-focus
 */

import type { MuscleFamily } from "@fitness/bodylab-training";

export interface DayFocusPreset {
  /** Stable key: what an agent sends and what localStorage never sees. */
  key: string;
  /** i18n key for the chip label. */
  label: string;
  families: MuscleFamily[];
}

export const DAY_FOCUS_PRESETS: DayFocusPreset[] = [
  { key: "auto", label: "home.focus.auto", families: [] },
  {
    key: "push",
    label: "home.focus.push",
    families: ["chest", "shoulders", "triceps"],
  },
  {
    key: "pull",
    label: "home.focus.pull",
    families: ["lats", "traps", "rhomboids", "biceps", "forearms"],
  },
  {
    key: "legs",
    label: "home.focus.legs",
    families: ["glutes", "quadriceps", "hamstrings", "calves"],
  },
  { key: "core", label: "home.focus.core", families: ["core"] },
];

/**
 * Every family the hard rules operate at (core's `MuscleFamily`), as a runtime
 * list: anything an agent sends has to be checked against values, not types.
 * Typing it as the union makes a typo here a compile error instead of a family
 * no one can ever select.
 */
export const MUSCLE_FAMILIES: readonly MuscleFamily[] = [
  "chest",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "traps",
  "rhomboids",
  "core",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
];

/** True for a value that is a real family (the guard every payload needs). */
export function isMuscleFamily(value: unknown): value is MuscleFamily {
  return (
    typeof value === "string" &&
    (MUSCLE_FAMILIES as readonly string[]).includes(value)
  );
}

/** The families of a preset key, or `null` when the key is not one of ours. */
export function focusFamiliesOf(key: string): MuscleFamily[] | null {
  const preset = DAY_FOCUS_PRESETS.find((option) => option.key === key);
  return preset ? [...preset.families] : null;
}

/**
 * The preset a family list corresponds to, or `auto` when it is a bespoke
 * combination (which the chips cannot show as active but the engine honours).
 */
export function focusKeyOf(families: readonly MuscleFamily[]): string {
  const match = DAY_FOCUS_PRESETS.find(
    (option) =>
      option.families.length === families.length &&
      option.families.every((family) => families.includes(family)),
  );
  return match?.key ?? "auto";
}
