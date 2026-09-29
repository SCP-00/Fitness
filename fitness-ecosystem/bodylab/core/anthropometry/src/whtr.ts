/**
 * Waist-to-Height Ratio (WHtR)
 *
 * A clinically established indicator of central adiposity.
 * WHO and NICE guidelines recommend WHtR ≤ 0.50 for healthy range.
 *
 * WHtR = Waist Circumference / Height
 *
 * Source: WHO, NICE NG246
 * Reference: https://www.nice.org.uk/guidance/ng246
 *
 * @module anthropometry/whtr
 */

export interface WHtRResult {
  /** Calculated WHtR value */
  ratio: number;
  /** Health status classification */
  status: 'healthy' | 'elevated' | 'high_risk';
  /** Description of the status */
  description: string;
}

/**
 * WHtR thresholds (based on clinical guidelines)
 */
export const WHTR_THRESHOLDS = {
  healthy: 0.50,    // ≤ 0.50 = healthy
  elevated: 0.60,   // 0.50 - 0.60 = elevated risk
  // > 0.60 = high risk
} as const;

/**
 * Calculate Waist-to-Height Ratio and classify health status.
 *
 * @param waistCircumference - Waist circumference in cm
 * @param height - Height in meters
 * @returns WHtR result with ratio and health status
 *
 * @example
 * ```ts
 * const result = calculateWHtR(80, 1.75);
 * // result.ratio ≈ 0.4571
 * // result.status = 'healthy'
 * ```
 */
export function calculateWHtR(
  waistCircumference: number,
  height: number
): WHtRResult {
  if (waistCircumference <= 0) {
    throw new Error('Waist circumference must be positive');
  }

  if (height <= 0 || height > 2.5) {
    throw new Error('Height must be between 0 and 2.5 meters');
  }

  // Convert height to cm for consistent units
  const heightCm = height * 100;
  const ratio = waistCircumference / heightCm;

  let status: WHtRResult['status'];
  let description: string;

  if (ratio <= WHTR_THRESHOLDS.healthy) {
    status = 'healthy';
    description = 'Within healthy range (WHtR ≤ 0.50)';
  } else if (ratio <= WHTR_THRESHOLDS.elevated) {
    status = 'elevated';
    description = 'Elevated risk (0.50 < WHtR ≤ 0.60)';
  } else {
    status = 'high_risk';
    description = 'High risk (WHtR > 0.60)';
  }

  return {
    ratio: round(ratio),
    status,
    description,
  };
}

/**
 * Round to 4 decimal places
 */
function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
