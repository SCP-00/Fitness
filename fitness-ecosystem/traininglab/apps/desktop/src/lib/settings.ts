/**
 * Settings → planning: the small pure adapters between what the user configures
 * and what the engines expect.
 *
 * @module lib/settings
 */

import type { TLSettingsData } from "./types";
import type { PlannedRow } from "./plan";

/**
 * The rep-range overrides the user set for one exercise, or `null` when the
 * planner's default stands. `null` inside the map removes the override; the
 * whole entry disappears when it becomes empty.
 */
export function applyRepOverrides(
  settings: TLSettingsData,
  rows: PlannedRow[],
): PlannedRow[] {
  const overrides = settings.repOverrides;
  if (!overrides || Object.keys(overrides).length === 0) return rows;
  return rows.map((row) => {
    const over = overrides[row.exerciseId];
    if (!over) return row;
    // The planner's RIR/rest/time stand; only the target range moves.
    return { ...row, repsMin: over.min, repsMax: Math.max(over.min, over.max) };
  });
}

/**
 * Reps per set for one exercise: the user's override, or the planner's
 * default range. One source of truth for ZEN's inputs and the plan's labels.
 */
export function repRangeFor(
  settings: TLSettingsData,
  row: PlannedRow,
): { min: number; max: number; custom: boolean } {
  const over = settings.repOverrides?.[row.exerciseId];
  if (over) {
    return { min: over.min, max: Math.max(over.min, over.max), custom: true };
  }
  return { min: row.repsMin, max: row.repsMax, custom: false };
}

/**
 * Set an override (or clear it with `null`) and return the next settings
 * object. Guarded: a range that arrives inverted is silently normalised, and
 * garbage inputs are ignored rather than persisted.
 */
export function withRepOverride(
  settings: TLSettingsData,
  exerciseId: string,
  range: { min: number; max: number } | null,
): TLSettingsData {
  const next: Record<string, { min: number; max: number }> = {
    ...settings.repOverrides,
  };
  if (range === null) {
    delete next[exerciseId];
  } else {
    const min = Math.max(1, Math.round(range.min));
    const max = Math.max(min, Math.round(range.max));
    if (!Number.isFinite(min) || !Number.isFinite(max)) return settings;
    next[exerciseId] = { min, max };
  }
  return { ...settings, repOverrides: next };
}
