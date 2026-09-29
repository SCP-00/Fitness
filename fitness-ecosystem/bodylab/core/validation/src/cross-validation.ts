/**
 * Cross-validation — internal consistency between measurements.
 *
 * Implements the `crossValidateMeasurements` export declared by
 * `@fitness/bodylab-validation` (previously a dangling re-export of a
 * module that never existed — the package never compiled).
 *
 * Checks that related segments are anatomically coherent (e.g. waist < hips,
 * waist < chest) and that height/weight imply a plausible BMI.
 *
 * @module validation/cross-validation
 */

import type { CrossValidationResult } from './types';
import type { MeasurementInput } from './ranges';

/**
 * Validate that a set of measurements is internally consistent. Missing
 * measurements are simply skipped (no conclusion is drawn from absence).
 */
export function crossValidateMeasurements(measurements: MeasurementInput[]): CrossValidationResult {
  const byType = (type: string): number | undefined =>
    measurements.find(m => m.type === type)?.value;

  const waist = byType('waist');
  const hips = byType('hips');
  const chest = byType('chest');
  const height = byType('height');
  const weight = byType('weight');

  const inconsistencies: CrossValidationResult['inconsistencies'] = [];

  if (waist !== undefined && hips !== undefined && waist > hips + 15) {
    inconsistencies.push({
      measurements: ['waist', 'hips'],
      description: `Waist (${waist}) exceeds hips (${hips}) by more than 15 cm — unusual for most body types`,
    });
  }

  if (chest !== undefined && waist !== undefined && waist > chest + 10) {
    inconsistencies.push({
      measurements: ['waist', 'chest'],
      description: `Waist (${waist}) exceeds chest (${chest}) by more than 10 cm — check the values`,
    });
  }

  if (height !== undefined && weight !== undefined && height > 0) {
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    if (bmi < 12 || bmi > 60) {
      inconsistencies.push({
        measurements: ['height', 'weight'],
        description: `Height ${height} cm and weight ${weight} kg imply a BMI of ${bmi.toFixed(1)}, which is not plausible`,
      });
    }
  }

  return { isConsistent: inconsistencies.length === 0, inconsistencies };
}