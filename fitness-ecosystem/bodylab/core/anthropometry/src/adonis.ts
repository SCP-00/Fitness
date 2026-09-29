/**
 * Adonis Index (Shoulder-to-Waist Ratio)
 *
 * Evaluates torso conicity based on the Golden Ratio (Φ ≈ 1.618).
 *
 * R_Adonis = C_shoulder / C_waist ≈ Φ
 *
 * Source: Adonis Index / Golden Ratio aesthetics
 * Reference: Various fitness anthropology sources
 *
 * @module anthropometry/adonis
 */

import type { AdonisResult } from './types';

/** Golden Ratio constant */
export const GOLDEN_RATIO = 1.618033988749895;

/**
 * Calculate the Adonis Index (shoulder-to-waist ratio).
 *
 * @param shoulderCircumference - Shoulder circumference in cm
 * @param waistCircumference - Waist circumference in cm
 * @returns Adonis result with ratio, deviation, and status
 *
 * @example
 * ```ts
 * const result = calculateAdonisIndex(120, 77);
 * // result.ratio ≈ 1.5584
 * // result.status = 'near'
 * ```
 */
export function calculateAdonisIndex(
  shoulderCircumference: number,
  waistCircumference: number
): AdonisResult {
  if (shoulderCircumference <= 0 || waistCircumference <= 0) {
    throw new Error('Circumferences must be positive');
  }

  if (waistCircumference > shoulderCircumference) {
    throw new Error('Waist cannot be larger than shoulders for Adonis calculation');
  }

  const ratio = shoulderCircumference / waistCircumference;
  const deviation = Math.abs(ratio - GOLDEN_RATIO) / GOLDEN_RATIO;

  let status: AdonisResult['status'];
  if (deviation <= 0.05) {
    status = 'optimal';
  } else if (deviation <= 0.15) {
    status = 'near';
  } else {
    status = 'far';
  }

  return {
    ratio: round(ratio),
    goldenRatio: GOLDEN_RATIO,
    deviation: round(deviation),
    status,
  };
}

/**
 * Round to 4 decimal places for ratio precision
 */
function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
