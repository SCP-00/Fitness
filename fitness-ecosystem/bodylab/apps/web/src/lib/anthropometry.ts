import type { Profile, Measurement, AnthropometricAssessment, ReferenceProfile, AllMeasurementType } from './types';
import { calculateMcCallum, calculateVenus, calculateScore } from './constants';
import { getLatestValue } from './queries';

/**
 * Compute anthropometric assessment for each body segment.
 *
 * For males with a wrist measurement, uses McCallum proportions.
 * For females with wrist + height, uses Venus proportions.
 * Falls back to reference profile targets if available.
 */
export function calculateAssessment(
  profile: Profile,
  measurements: Measurement[],
  reference: ReferenceProfile | null
): AnthropometricAssessment[] {
  const results: AnthropometricAssessment[] = [];

  // Use getLatestValue to get the most recent measurement (not the first)
  const wrist = getLatestValue(measurements, 'wrist');
  const heightCm = profile.height * 100;

  // Determine ideal targets
  let ideals: Record<string, number> = {};

  if (reference?.id === 'mccallum_recreational' && wrist) {
    const mc = calculateMcCallum(wrist);
    ideals = {
      chest: mc.chest,
      waist: mc.waist,
      hips: mc.hips,
      biceps: mc.biceps,
      thigh: mc.thigh,
      neck: mc.neck,
      calf: mc.calf,
      forearm: mc.forearm,
    };
  } else if (reference?.id === 'venus_recreational' && wrist) {
    const v = calculateVenus(heightCm, wrist);
    ideals = {
      waist: v.waist,
      hips: v.hips,
      shoulders: v.shoulders,
    };
  } else if (reference?.id === 'health_whtr') {
    // WHtR reference — waist should be ≤ 50% of height
    ideals = {
      waist: heightCm * 0.50,
    };
  }

  // Build assessments for each available measurement
  const segments = ['chest', 'waist', 'hips', 'biceps', 'forearm', 'thigh', 'calf', 'neck', 'shoulders'];

  for (const segment of segments) {
    const actual = getLatestValue(measurements, segment as AllMeasurementType);
    const ideal = ideals[segment];

    if (actual === null || ideal === undefined || ideal <= 0) continue;

    const deviation = actual - ideal;
    const score = calculateScore(actual, ideal);

    let status: AnthropometricAssessment['status'];
    if (score >= 0.90) status = 'optimal';
    else if (score >= 0.70) status = 'near';
    else if (score >= 0.40) status = 'moderate';
    else status = 'significant';

    const color = status === 'optimal' ? '#10b981'
      : status === 'near' ? '#f59e0b'
      : status === 'moderate' ? '#f97316'
      : '#ef4444';

    results.push({
      segment,
      actual,
      ideal: Math.round(ideal * 100) / 100,
      deviation: Math.round(deviation * 100) / 100,
      score: Math.round(score * 1000) / 1000,
      status,
      color,
    });
  }

  // Adonis and WHtR are computed separately in the store

  return results;
}
