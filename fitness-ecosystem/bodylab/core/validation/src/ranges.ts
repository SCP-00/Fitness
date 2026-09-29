/**
 * Range validation — plausible min/max per measurement type.
 *
 * Implements the `validateMeasurementRanges` export declared by
 * `@fitness/bodylab-validation` (previously a dangling re-export of a
 * module that never existed — the package never compiled).
 *
 * @module validation/ranges
 */

import type { ValidationResult, ValidationError } from './types';

/** A measurement as consumed by the validators (decoupled from the full DB model). */
export interface MeasurementInput {
  type: string;
  value: number;
  unit?: string;
}

export interface RangeDefinition {
  min: number;
  max: number;
}

/**
 * Plausible adult ranges (cm / kg). Values outside these are flagged as
 * errors; values near a boundary get a warning.
 */
export const VALIDATION_RANGES: Record<string, RangeDefinition> = {
  height: { min: 120, max: 230 },
  weight: { min: 30, max: 300 },
  chest: { min: 60, max: 200 },
  waist: { min: 45, max: 200 },
  hips: { min: 60, max: 220 },
  neck: { min: 25, max: 70 },
  shoulders: { min: 70, max: 180 },
  biceps: { min: 18, max: 70 },
  forearm: { min: 15, max: 60 },
  thigh: { min: 30, max: 110 },
  calf: { min: 20, max: 80 },
  wrist: { min: 10, max: 35 },
};

/** Fraction of the range width treated as "near the limit". */
const NEAR_LIMIT_FRACTION = 0.05;

/**
 * Validate each measurement against its plausible range. Unknown types are
 * skipped (range knowledge is intentionally explicit).
 */
export function validateMeasurementRanges(measurements: MeasurementInput[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  let score = 1;

  for (const m of measurements) {
    const range = VALIDATION_RANGES[m.type];
    if (!range) continue;

    if (m.value < range.min || m.value > range.max) {
      errors.push({
        measurementType: m.type,
        code: 'OUT_OF_RANGE',
        severity: 'error',
        message: `Value ${m.value} is outside the plausible range [${range.min}, ${range.max}]`,
        currentValue: m.value,
        expectedRange: range,
      });
      score = 0;
      continue;
    }

    const margin = (range.max - range.min) * NEAR_LIMIT_FRACTION;
    if (m.value < range.min + margin || m.value > range.max - margin) {
      warnings.push({
        measurementType: m.type,
        code: 'NEAR_RANGE_LIMIT',
        severity: 'warning',
        message: `Value ${m.value} is close to the plausible range limit [${range.min}, ${range.max}]`,
        currentValue: m.value,
        expectedRange: range,
      });
      score = Math.min(score, 0.8);
    }
  }

  return { isValid: errors.length === 0, errors, warnings, score };
}