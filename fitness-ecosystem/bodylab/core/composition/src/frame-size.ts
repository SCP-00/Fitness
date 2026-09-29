/**
 * Frame Size Classification
 *
 * Classifies body frame size based on wrist circumference relative to height.
 *
 * @module composition/frame-size
 */

export type FrameSize = 'small' | 'medium' | 'large';

export interface FrameSizeResult {
  frameSize: FrameSize;
  ratio: number;
  description: string;
}

/**
 * Classify frame size from the height/wrist ratio.
 *
 * ⚠️ UNITS: `height` is in METERS (≤ 2.5), `wristCircumference` in cm — the
 * ratio is computed as (height × 100) / wrist, so the thresholds below are
 * cm/cm. Documented because the parameter names mislead (pinned by tests).
 *
 * R_frame = height_cm / wrist_cm
 *
 * Small:  R_frame > 10.9
 * Medium: 9.9 ≤ R_frame ≤ 10.9
 * Large:  R_frame < 9.9
 */
export function calculateFrameSize(
  height: number,
  wristCircumference: number
): FrameSizeResult {
  if (height <= 0 || height > 2.5) {
    throw new Error('Height must be between 0 and 2.5 meters');
  }

  if (wristCircumference <= 0 || wristCircumference > 30) {
    throw new Error('Wrist circumference must be between 0 and 30 cm');
  }

  const heightCm = height * 100;
  const ratio = heightCm / wristCircumference;

  let frameSize: FrameSize;
  let description: string;

  if (ratio > 10.9) {
    frameSize = 'small';
    description = `Small frame (ratio ${ratio.toFixed(2)} > 10.9)`;
  } else if (ratio >= 9.9) {
    frameSize = 'medium';
    description = `Medium frame (9.9 ≤ ratio ${ratio.toFixed(2)} ≤ 10.9)`;
  } else {
    frameSize = 'large';
    description = `Large frame (ratio ${ratio.toFixed(2)} < 9.9)`;
  }

  return {
    frameSize,
    ratio: parseFloat(ratio.toFixed(4)),
    description,
  };
}
