/**
 * Clad-body validation — ISO 8559-1-informed plausibility checks.
 *
 * Implements the `validateAgainstCladBody` export declared by
 * `@fitness/bodylab-validation` (previously a dangling re-export of a
 * module that never existed — the package never compiled).
 *
 * Composition: delegates to `validateMeasurementRanges` for absolute
 * plausibility, then adds sex-specific warning bands for height/weight.
 *
 * @module validation/clad-body
 */

import type { ValidationResult } from './types';
import { validateMeasurementRanges, type MeasurementInput } from './ranges';

/** Optional context that tightens the plausibility bands. */
export interface CladBodyProfile {
  biologicalSex?: 'male' | 'female';
  heightCm?: number;
}

/** Sex-specific reference bands (ISO 8559-1-informed adult ranges). */
const SEX_RANGES: Record<'male' | 'female', Record<string, { min: number; max: number }>> = {
  male: {
    height: { min: 150, max: 210 },
    weight: { min: 40, max: 170 },
  },
  female: {
    height: { min: 140, max: 200 },
    weight: { min: 35, max: 160 },
  },
};

/**
 * Validate a set of measurements against range limits plus (when a profile
 * is supplied) sex-specific bands. Sex-band violations are warnings, not
 * errors — unusual but possible bodies are legitimate.
 */
export function validateAgainstCladBody(
  measurements: MeasurementInput[],
  profile?: CladBodyProfile,
): ValidationResult {
  const base = validateMeasurementRanges(measurements);
  const errors = [...base.errors];
  const warnings = [...base.warnings];

  const sex = profile?.biologicalSex;
  if (sex) {
    const bands = SEX_RANGES[sex];
    for (const m of measurements) {
      const band = bands[m.type];
      if (!band) continue;
      if (m.value < band.min || m.value > band.max) {
        warnings.push({
          measurementType: m.type,
          code: 'CLAD_BODY_SEX_BAND',
          severity: 'warning',
          message: `Value ${m.value} is unusual for a ${sex} body [${band.min}, ${band.max}]`,
          currentValue: m.value,
          expectedRange: band,
        });
      }
    }
  }

  const score = errors.length === 0
    ? Math.min(base.score, warnings.length > 0 ? 0.9 : 1)
    : Math.max(0, 1 - errors.length * 0.25);

  return { isValid: errors.length === 0, errors, warnings, score };
}