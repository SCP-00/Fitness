/**
 * Unit conversion — display layer (BL-MEAS-005).
 *
 * The canonical data contract is METRIC ALWAYS: every stored `Measurement`
 * (and the profile height/weight) is cm / kg, and every core formula, history
 * trend, export and TrainingLab bridge reads metric. The user's unit-system
 * preference is DISPLAY-ONLY: inputs are converted at the boundary so the
 * user types inches/pounds and the app stores cm/kg (with the same rounding
 * constants as `lib/constants.ts`).
 *
 * Storage is never rewritten when the preference flips — cm↔in and kg↔lb are
 * individually lossy round-trips, so the raw history stays pristine.
 *
 * @module lib/units
 */

import { cmToInches, inchesToCm, kgToLbs, lbsToKg, MEASUREMENT_TYPES } from './constants';
import type { AllMeasurementType, UnitSystem } from './types';

export type DisplayLengthUnit = 'cm' | 'in';
export type DisplayMassUnit = 'kg' | 'lb';
export type DisplayUnit = DisplayLengthUnit | DisplayMassUnit | '%' | 'm' | 'bpm' | 'mm';

/** Display-unit symbols, bilingual-safe (units are symbols, not words). */
export const UNIT_LABELS: Record<DisplayUnit, { en: string; es: string }> = {
  cm: { en: 'cm', es: 'cm' },
  in: { en: 'in', es: 'in' },
  kg: { en: 'kg', es: 'kg' },
  lb: { en: 'lb', es: 'lb' },
  '%': { en: '%', es: '%' },
  m: { en: 'm', es: 'm' },
  bpm: { en: 'bpm', es: 'bpm' },
  mm: { en: 'mm', es: 'mm' },
};

/**
 * Canonical (stored) unit of a measurement type, straight from the registry:
 * 'cm' for circumferences, 'kg' for mass, and metric-locked 'm' | 'bpm' | 'mm' | '%'
 * for the conditioning types — those NEVER convert, in either system.
 */
function canonicalUnitOf(type: AllMeasurementType): string {
  return MEASUREMENT_TYPES.find((t) => t.id === type)?.unit ?? 'cm';
}

/**
 * The unit a measurement type displays in for the given unit system.
 * Only cm→in and kg→lb change; %, m, bpm and mm stay the same in both.
 */
export function displayUnitFor(type: AllMeasurementType, units: UnitSystem): DisplayUnit {
  const cu = canonicalUnitOf(type);
  if (units === 'imperial') {
    if (cu === 'cm') return 'in';
    if (cu === 'kg') return 'lb';
  }
  return cu as DisplayUnit;
}

/**
 * Display unit for the profile height/weight row (label units, not the stored
 * height which is meters and renders via metersToFeetInches in imperial).
 */
export function profileUnitFor(kind: 'height' | 'weight', units: UnitSystem): DisplayUnit {
  if (kind === 'height') return units === 'imperial' ? 'in' : 'm';
  return units === 'imperial' ? 'lb' : 'kg';
}

/** Convert a canonical metric value to the value the user sees for `type`. */
export function toDisplay(type: AllMeasurementType, canonical: number, units: UnitSystem): number {
  const du = displayUnitFor(type, units);
  if (du === 'in') return cmToInches(canonical);
  if (du === 'lb') return kgToLbs(canonical);
  return canonical;
}

/** Convert a user-entered value for `type` back to canonical metric (cm/kg). */
export function toCanonical(type: AllMeasurementType, display: number, units: UnitSystem): number {
  const du = displayUnitFor(type, units);
  if (du === 'in') return inchesToCm(display);
  if (du === 'lb') return lbsToKg(display);
  return display;
}

/** Format a canonical metric value as a display string with its unit symbol. */
export function formatMeasurement(
  type: AllMeasurementType,
  canonical: number,
  units: UnitSystem,
  lang: 'en' | 'es'
): string {
  const unit = displayUnitFor(type, units);
  return `${toDisplay(type, canonical, units)} ${UNIT_LABELS[unit][lang]}`;
}

// ── Profile height/weight (weight is a real measurement; height is meters) ──

/** Height canonical unit is METERS (Profile.height) — convert to display. */
export function heightToDisplay(heightMeters: number, units: UnitSystem): number {
  if (units !== 'imperial') return heightMeters;
  return cmToInches(heightMeters * 100);
}

/** Height display input → canonical meters. */
export function heightToCanonical(display: number, units: UnitSystem): number {
  if (units !== 'imperial') return display;
  return inchesToCm(display) / 100;
}

/** Weight canonical unit is KG (Profile.weight) — convert to display. */
export function weightToDisplay(weightKg: number, units: UnitSystem): number {
  return units === 'imperial' ? kgToLbs(weightKg) : weightKg;
}

/** Weight display input → canonical kg. */
export function weightToCanonical(display: number, units: UnitSystem): number {
  return units === 'imperial' ? lbsToKg(display) : display;
}
