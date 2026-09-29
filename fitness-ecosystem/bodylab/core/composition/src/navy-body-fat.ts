/**
 * US Navy circumference-based body-fat estimation (Hodgdon & Beckett 1984).
 *
 * The tape-only method: no calipers, no scans — a measuring tape and a wall
 * for height. This exists because BodyLab's educational mission is to serve
 * people WITHOUT sophisticated equipment, and because circumference methods
 * capture overall fatness independently of where a person stores fat (a
 * single skinfold site does not).
 *
 * Metric form (cm), as published and widely reproduced:
 *   male:   %BF = 495 / (1.0324 − 0.19077·log10(waist − neck)
 *                        + 0.15456·log10(height)) − 450
 *   female: %BF = 495 / (1.29579 − 0.35004·log10(waist + hip − neck)
 *                        + 0.22100·log10(height)) − 450
 *
 * Reported accuracy: SEE ≈ ±3.5 %BF against hydrostatic weighing in the
 * original Navy populations — a BODY-LAB-RELEVANT caveat: accuracy degrades
 * for athletes (very lean) and for very high waist/neck ratios.
 *
 * Conventions of this package's newest modules: invalid input returns `null`
 * (never throws, never NaN). Results below essential fat or above the
 * physiological ceiling are rejected as measurement error, mirroring
 * @fitness/bodylab-conditioning.
 *
 * Pure TypeScript — no React, no DOM, no I/O, no dependencies.
 *
 * @module composition/navy-body-fat
 */

export type NavySex = 'male' | 'female';

export interface NavyBodyFatInputs {
  /** Height in cm. */
  heightCm: number;
  /** Neck circumference at the larynx base, cm (tape slightly down at front). */
  neckCm: number;
  /** Waist circumference, cm (male: at navel; female: narrowest point). */
  waistCm: number;
  /** Hip circumference, cm — REQUIRED for the female equation, ignored for males. */
  hipCm?: number | null;
  sex: NavySex;
}

export interface NavyBodyFatResult {
  /** Estimated body-fat %, rounded to 0.1. */
  bodyFatPct: number;
  /** Body density from the published regression (the intermediate Siri form). */
  bodyDensity: number;
  /** Published accuracy of the method against hydrostatic weighing. */
  standardError: number;
  provenance: string;
  /** Circumference inputs echoed back for UI display. */
  usedInputs: { heightCm: number; neckCm: number; waistCm: number; hipCm: number | null };
}

/** Published SEE (Hodgdon & Beckett 1984, against hydrostatic weighing). */
export const NAVY_SEE_PCT = 3.5;

/** Physiological bounds, shared with conditioning/composition conventions. */
const BF_MIN: Record<NavySex, number> = { male: 2, female: 8 };
const BF_MAX = 70;
const HEIGHT_MIN_CM = 50;
const HEIGHT_MAX_CM = 250;
const NECK_MIN_CM = 20;
const NECK_MAX_CM = 60;
const WAIST_MIN_CM = 40;
const WAIST_MAX_CM = 200;
const HIP_MIN_CM = 50;
const HIP_MAX_CM = 220;

function inDomain(v: number, min: number, max: number): boolean {
  return Number.isFinite(v) && v >= min && v <= max;
}

/**
 * Estimate body-fat % from tape circumferences only (Hodgdon & Beckett 1984).
 * Returns `null` for any input outside its physiological domain, when the
 * log arguments are non-positive (e.g. waist ≤ neck), or when the estimate
 * lands outside the physiological body-fat range (measurement error, not a
 * result). Females without hip circumference return `null`.
 */
export function estimateBodyFatNavy(inputs: NavyBodyFatInputs): NavyBodyFatResult | null {
  const { heightCm, neckCm, waistCm, hipCm, sex } = inputs;

  if (!inDomain(heightCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM)) return null;
  if (!inDomain(neckCm, NECK_MIN_CM, NECK_MAX_CM)) return null;
  if (!inDomain(waistCm, WAIST_MIN_CM, WAIST_MAX_CM)) return null;

  let logTerm: number;
  let usedHip: number | null = null;

  if (sex === 'male') {
    const diff = waistCm - neckCm;
    if (!Number.isFinite(diff) || diff <= 0) return null; // log10 undefined
    logTerm = Math.log10(diff);
  } else {
    if (hipCm == null) return null; // female equation requires the hip
    if (!inDomain(hipCm, HIP_MIN_CM, HIP_MAX_CM)) return null;
    const sum = waistCm + hipCm - neckCm;
    if (!Number.isFinite(sum) || sum <= 0) return null;
    usedHip = hipCm;
    logTerm = Math.log10(sum);
  }

  const logHeight = Math.log10(heightCm);
  if (!Number.isFinite(logTerm) || !Number.isFinite(logHeight)) return null;

  const density =
    sex === 'male'
      ? 1.0324 - 0.19077 * logTerm + 0.15456 * logHeight
      : 1.29579 - 0.35004 * logTerm + 0.221 * logHeight;

  if (!Number.isFinite(density) || density <= 0.9 || density >= 1.12) return null;

  const pct = 495 / density - 450;
  if (!Number.isFinite(pct) || pct < BF_MIN[sex] || pct > BF_MAX) return null;

  return {
    bodyFatPct: Math.round(pct * 10) / 10,
    bodyDensity: Math.round(density * 100000) / 100000,
    standardError: NAVY_SEE_PCT,
    provenance:
      'Hodgdon & Beckett (1984), U.S. Navy circumference method, metric cm form; SEE ±3.5 %BF vs hydrostatic weighing',
    usedInputs: { heightCm, neckCm, waistCm, hipCm: usedHip },
  };
}
