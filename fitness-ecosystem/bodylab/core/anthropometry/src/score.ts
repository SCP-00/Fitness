/**
 * Anthropometric Score Calculation
 *
 * Converts deviation from reference into a normalized score [0, 1].
 * Uses an attenuation function with penalty factor k = 4.0.
 *
 * S_i = max(0, 1 - k × ε_i)
 *
 * Where:
 *   ε_i = |M_real - M_ideal| / M_ideal  (relative deviation)
 *   k = 4.0 (penalty factor)
 *
 * @module anthropometry/score
 */

/** Penalty factor for the attenuation function */
export const PENALTY_FACTOR = 4.0;

/**
 * Calculate the relative deviation between actual and ideal values.
 *
 * ε_i = |M_real - M_ideal| / M_ideal
 *
 * @param actual - Measured value
 * @param ideal - Reference/ideal value
 * @returns Relative deviation (0 = perfect match)
 *
 * @example
 * ```ts
 * const dev = calculateDeviation(82, 80);
 * // dev = 0.025 (2.5%)
 * ```
 */
export function calculateDeviation(actual: number, ideal: number): number {
  if (ideal <= 0) {
    throw new Error('Ideal value must be positive');
  }

  return Math.abs(actual - ideal) / ideal;
}

/**
 * Calculate normalized score from deviation.
 *
 * S_i = max(0, 1 - k × ε_i)
 *
 * @param deviation - Relative deviation (from calculateDeviation)
 * @param penaltyFactor - Penalty factor (default: 4.0)
 * @returns Score between 0 and 1
 *
 * @example
 * ```ts
 * const score = calculateScore(0.025);
 * // score = 0.90 (90% — within optimal range)
 * ```
 */
export function calculateScore(
  deviation: number,
  penaltyFactor: number = PENALTY_FACTOR
): number {
  if (penaltyFactor <= 0) {
    throw new Error('Penalty factor must be positive');
  }

  return Math.max(0, 1 - penaltyFactor * deviation);
}

/**
 * Get score classification based on score value
 *
 * 0.90–1.00: Optimal (green)
 * 0.70–0.89: Near target (yellow)
 * 0.40–0.69: Moderate deviation (orange)
 * 0.00–0.39: Significant deviation (red)
 */
export type ScoreClassification = 'optimal' | 'near' | 'moderate' | 'significant';

export function classifyScore(score: number): ScoreClassification {
  if (score >= 0.90) return 'optimal';
  if (score >= 0.70) return 'near';
  if (score >= 0.40) return 'moderate';
  return 'significant';
}

/**
 * Color mapping for score visualization
 *
 * Uses HSV color space for smooth gradient transitions.
 */
export interface ScoreColor {
  /** Hue value (0-360) */
  hue: number;
  /** CSS hex color */
  hex: string;
  /** Human-readable color name */
  name: string;
}

/**
 * Map score to color for visualization
 *
 * @param score - Normalized score (0-1)
 * @returns Color information for visualization
 */
export function scoreToColor(score: number): ScoreColor {
  const clamped = Math.max(0, Math.min(1, score));

  if (clamped >= 0.90) {
    return { hue: 155, hex: '#10B981', name: 'emerald' };
  }
  if (clamped >= 0.70) {
    return { hue: 90, hex: '#FBBF24', name: 'yellow' };
  }
  if (clamped >= 0.40) {
    return { hue: 45, hex: '#F97316', name: 'orange' };
  }
  return { hue: 10, hex: '#EF4444', name: 'red' };
}
