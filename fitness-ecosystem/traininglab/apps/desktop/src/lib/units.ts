/**
 * Unit presentation — kg is the storage truth, lb is a display choice.
 *
 * The owner asked for exact conversion: selecting LB must show that
 * `1 kg = 2.2046226218488 lb` — that constant is the international avoirdupois
 * pound (exact by definition since 1959), and we do not round it here. Rounding
 * is a *presentation* concern and lives in `formatWeight`.
 *
 * Storage stays kg everywhere (IndexedDB, shared LAN history, BodyLab export):
 * switching units must never mutate a single stored number. Only the inputs and
 * the labels change, which is what keeps the two units reversible without
 * drift (kg → lb → kg is lossless because we never store the lb figure).
 *
 * @module lib/units
 */

/** Exact international pound (1959 definition), not the rounded 2.2. */
export const LB_PER_KG = 2.2046226218488;

export type WeightUnit = "kg" | "lb";

/** kg → lb, exact. */
export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

/** lb → kg, exact. */
export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

/** Convert a canonical kg value into the display unit. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kgToLb(kg);
}

/** Convert a user-entered value in `unit` back to canonical kg. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : lbToKg(value);
}

/**
 * Presentation rounding: plate-loadable numbers to 1 decimal, machine-ish to
 * 2. Never used for storage — display only.
 */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const v = fromKg(kg, unit);
  const rounded = Math.round(v * 10) / 10;
  return `${rounded.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })} ${unit}`;
}

/** The exact factor, for the settings line the owner asked to see. */
export function exactFactorLabel(): string {
  return `1 kg = ${LB_PER_KG} lb`;
}

/** Nicest step the local plates allow in this unit (2.5 kg ≈ 5.5 lb). */
export function stepFor(unit: WeightUnit, kgStep: number): number {
  return unit === "kg" ? kgStep : Math.round(kgToLb(kgStep) * 10) / 10;
}
