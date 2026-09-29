/**
 * McCallum Formula for Male Anthropometric Proportions
 *
 * Uses wrist circumference as the base skeletal indicator.
 * All other measurements are derived as proportions of chest circumference.
 *
 * Source: John McCallum's "Schwarzenegger" proportions
 * Reference: https://www/bodybuilding.com/fun/mcmahon1.htm
 *
 * @module anthropometry/mccallum
 */

import type { McCallumResult } from './types';

/**
 * Calculate ideal male proportions using McCallum's formula.
 *
 * Base: wrist circumference → chest → all other segments
 *
 * @param wristCircumference - Wrist circumference in cm
 * @returns Object with ideal values for each body segment
 *
 * @example
 * ```ts
 * const result = calculateMcCallum(17);
 * // result.chest = 110.5
 * // result.waist = 77.35
 * ```
 */
export function calculateMcCallum(wristCircumference: number): McCallumResult {
  if (wristCircumference <= 0) {
    throw new Error('Wrist circumference must be positive');
  }

  if (wristCircumference > 30) {
    throw new Error('Wrist circumference seems unrealistic (> 30 cm)');
  }

  // Base calculation: chest = 6.5 × wrist
  const chest = 6.5 * wristCircumference;

  return {
    chest: round(chest),
    waist: round(0.70 * chest),
    hips: round(0.85 * chest),
    biceps: round(0.36 * chest),
    thigh: round(0.53 * chest),
    neck: round(0.37 * chest),
    calf: round(0.34 * chest),
    forearm: round(0.29 * chest),
  };
}

/**
 * McCallum proportion factors
 */
export const MCCALLUM_FACTORS = {
  chest: 6.5,       // Base multiplier from wrist
  waist: 0.70,      // 70% of chest
  hips: 0.85,       // 85% of chest
  biceps: 0.36,     // 36% of chest
  thigh: 0.53,      // 53% of chest
  neck: 0.37,       // 37% of chest
  calf: 0.34,       // 34% of chest
  forearm: 0.29,    // 29% of chest
} as const;

/**
 * Round to 2 decimal places for display.
 * Uses toFixed to avoid IEEE 754 floating point rounding issues.
 */
function round(value: number): number {
  return parseFloat(value.toFixed(2));
}
