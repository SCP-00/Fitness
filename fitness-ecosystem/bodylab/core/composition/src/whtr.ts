/**
 * WHtR Health Assessment
 *
 * Calculates waist-to-height ratio and classifies health status.
 *
 * @module composition/whtr
 */

export interface WHtRResult {
  ratio: number;
  status: 'healthy' | 'elevated' | 'high_risk';
  description: string;
}

/**
 * Calculate WHtR and classify health status
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

  const heightCm = height * 100;
  const ratio = waistCircumference / heightCm;

  let status: WHtRResult['status'];
  let description: string;

  if (ratio <= 0.50) {
    status = 'healthy';
    description = 'Within healthy range (WHtR ≤ 0.50)';
  } else if (ratio <= 0.60) {
    status = 'elevated';
    description = 'Elevated risk (0.50 < WHtR ≤ 0.60)';
  } else {
    status = 'high_risk';
    description = 'High risk (WHtR > 0.60)';
  }

  return {
    ratio: parseFloat(ratio.toFixed(4)),
    status,
    description,
  };
}
