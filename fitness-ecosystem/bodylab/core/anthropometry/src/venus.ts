/**
 * Venus Index for Female Anthropometric Proportions
 *
 * Uses height as the primary reference variable.
 * Frame size is classified using wrist circumference relative to height.
 *
 * Source: Venus Index proportions
 * Reference: Various fitness anthropology sources
 *
 * @module anthropometry/venus
 */

import type { VenusResult, FrameSize } from './types';

/**
 * Calculate ideal female proportions using Venus formula.
 *
 * @param height - Height in meters
 * @param wristCircumference - Wrist circumference in cm
 * @returns Object with ideal values and frame classification
 *
 * @example
 * ```ts
 * const result = calculateVenus(1.65, 14.5);
 * // result.waist = 62.7
 * // result.frameSize = 'small'
 * ```
 */
export function calculateVenus(
  height: number,
  wristCircumference: number
): VenusResult {
  if (height <= 0 || height > 2.5) {
    throw new Error('Height must be between 0 and 2.5 meters');
  }

  if (wristCircumference <= 0 || wristCircumference > 30) {
    throw new Error('Wrist circumference must be between 0 and 30 cm');
  }

  // Convert height to cm for calculations
  const heightCm = height * 100;

  // Frame size classification
  const frameRatio = heightCm / wristCircumference;
  const frameSize = classifyFrame(frameRatio);

  return {
    waist: round(0.38 * heightCm),
    hips: round(0.5396 * heightCm),
    bust: round(0.513 * heightCm),
    shoulders: round(0.61484 * heightCm),
    frameSize,
  };
}

/**
 * Venus proportion factors (relative to height in cm)
 */
export const VENUS_FACTORS = {
  waist: 0.38,      // 38% of height
  hips: 0.5396,     // 53.96% of height
  bust: 0.513,      // 51.3% of height
  shoulders: 0.61484, // 61.484% of height
} as const;

/**
 * Frame size classification thresholds for females
 *
 * R_frame = height_cm / wrist_cm
 *
 * Small:  R_frame > 10.9
 * Medium: 9.9 ≤ R_frame ≤ 10.9
 * Large:  R_frame < 9.9
 */
export function classifyFrame(frameRatio: number): FrameSize {
  if (frameRatio > 10.9) return 'small';
  if (frameRatio >= 9.9) return 'medium';
  return 'large';
}

/**
 * Round to 2 decimal places
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
