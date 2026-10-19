/**
 * The day plan as a *view*: grouping, totals and the rack hint.
 *
 * The Entrenamiento screen (mockup `02-entrenamiento.html`) shows the same
 * `rows` the session logs, but projected three ways — his own order, by
 * equipment, by muscle — and with the numbers a person wants before walking
 * into the gym. None of that belongs in the screen: it is arithmetic over the
 * plan, so it lives here, is pure (no React, no i18n) and is tested from the
 * root suite like every other planning helper.
 *
 * Two rules carried over from the planner, because a second source of truth
 * would drift:
 *
 *   * an exercise's *primary* gear is the first requirement group the declared
 *     inventory can satisfy — the same order `traits.requires` gives the
 *     planner, so "Agrupado por equipamiento" can never claim a row needs gear
 *     the planner did not consider;
 *   * a row with no requirements is **bodyweight**, not "unknown": it needs
 *     nothing from the rack, which is exactly why the hint can send you there
 *     when a machine is busy.
 *
 * @module lib/day-view
 */

import {
  getTraits,
  type Capability,
  type OwnedEquipment,
} from "@fitness/bodylab-exercises";
import type { PlannedRow } from "./plan";

/** One heading of the equipment projection. */
export interface GearBucket {
  /** `null` for work that needs nothing (bodyweight, floor work). */
  capability: Capability | null;
  /** The inventory's own word for it, when the user owns it. */
  label: string | null;
  rows: PlannedRow[];
}

/** One heading of the muscle projection. */
export interface FamilyBucket {
  /** Primary (first) family of the bucket's rows. */
  family: string;
  rows: PlannedRow[];
}

/** The gear a row is *filed under*: the first requirement its owner can meet. */
export function primaryGear(
  row: PlannedRow,
  inventory: OwnedEquipment[],
): { capability: Capability; label: string } | null {
  for (const group of getTraits(row.exerciseId).requires) {
    const owned = group.find((capability) =>
      inventory.some((item) => item.capabilities.includes(capability)),
    );
    if (!owned) continue;
    const item = inventory.find((entry) => entry.capabilities.includes(owned));
    return { capability: owned, label: item?.label ?? owned };
  }
  return null;
}

/**
 * The plan grouped by what you have to pick up.
 *
 * Buckets are ordered by how many exercises they hold — the machine you will
 * spend the most time at comes first — and bodyweight work is its own bucket,
 * last, because it is the fallback when everything is occupied.
 */
export function groupByGear(
  rows: PlannedRow[],
  inventory: OwnedEquipment[],
): GearBucket[] {
  const buckets = new Map<string, GearBucket>();
  const seen: string[] = [];
  for (const row of rows) {
    const gear = primaryGear(row, inventory);
    const key = gear?.capability ?? "__bodyweight";
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        capability: gear?.capability ?? null,
        label: gear?.label ?? null,
        rows: [],
      };
      buckets.set(key, bucket);
      seen.push(key);
    }
    bucket.rows.push(row);
  }
  return [...buckets.entries()]
    .sort((a, b) => {
      // Bodyweight always closes the list, even when it is the biggest bucket.
      const aBody = a[1].capability === null ? 1 : 0;
      const bBody = b[1].capability === null ? 1 : 0;
      if (aBody !== bBody) return aBody - bBody;
      return b[1].rows.length - a[1].rows.length;
    })
    .map(([, bucket]) => bucket);
}

/** The plan grouped by the row's primary muscle family, first-seen order. */
export function groupByFamily(rows: PlannedRow[]): FamilyBucket[] {
  const buckets = new Map<string, FamilyBucket>();
  for (const row of rows) {
    const family = row.families[0] ?? "other";
    const bucket = buckets.get(family);
    if (bucket) bucket.rows.push(row);
    else buckets.set(family, { family, rows: [row] });
  }
  return [...buckets.values()];
}

/**
 * "If the X is busy, start with Y" — derived, never authored.
 *
 * The busiest piece of gear is the bucket with the most exercises (at least
 * two, otherwise "busy" is not a pattern). The suggestion is the first row of
 * any other bucket, so it is guaranteed not to need that gear. `null` when the
 * day has no repeated gear and the hint would be noise.
 */
export function startElsewhere(
  rows: PlannedRow[],
  inventory: OwnedEquipment[],
): { gear: string; row: PlannedRow } | null {
  const groups = groupByGear(rows, inventory);
  const busiest = groups.find(
    (group) => group.capability !== null && group.rows.length >= 2,
  );
  if (!busiest) return null;
  const alternative = groups.find(
    (group) => group.capability !== busiest.capability && group.rows.length > 0,
  );
  if (!alternative) return null;
  return {
    gear: busiest.label ?? busiest.capability!,
    row: alternative.rows[0]!,
  };
}

/** The numbers the plan header and the sticky bar both print. */
export interface DayTotals {
  exercises: number;
  sets: number;
  minutes: number;
}

export function dayTotals(rows: PlannedRow[]): DayTotals {
  return rows.reduce<DayTotals>(
    (acc, row) => ({
      exercises: acc.exercises + 1,
      sets: acc.sets + row.sets,
      minutes: acc.minutes + row.minutes,
    }),
    { exercises: 0, sets: 0, minutes: 0 },
  );
}

/**
 * How full today's window is, as a 0–100 bar.
 *
 * Clamped high on purpose: over budget is a real state and the caller prints
 * the overrun as a number, but the bar must not overflow its track.
 */
export function budgetFill(minutes: number, budgetMin: number): number {
  if (!Number.isFinite(budgetMin) || budgetMin <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((minutes / budgetMin) * 100)));
}
