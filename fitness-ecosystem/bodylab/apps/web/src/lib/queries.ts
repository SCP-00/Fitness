/**
 * Measurement Queries — Web App Layer
 *
 * Wraps core measurement query functions and extends them for the web app's
 * broader type system (bilateral measurements, composition types, etc.).
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for measurement data access in the web app.
 * Never use `measurements.find(m => m.type === type)` directly.
 *
 * @module lib/queries
 */

import type { AllMeasurementType, Measurement } from './types';

// ============================================================================
// Core Query Wrappers
// ============================================================================

/**
 * Get the most recent measurement of a given type.
 * Replaces all `measurements.find(m => m.type === type)` calls.
 *
 * @example
 * // WRONG — returns the OLDEST measurement:
 * const chest = measurements.find(m => m.type === 'chest');
 *
 * // CORRECT — returns the NEWEST measurement:
 * const chest = getLatestMeasurement(measurements, 'chest');
 */
export function getLatestMeasurement(
  measurements: Measurement[],
  type: AllMeasurementType
): Measurement | null {
  for (let i = measurements.length - 1; i >= 0; i--) {
    if (measurements[i].type === type) {
      return measurements[i];
    }
  }
  return null;
}

/**
 * Get the latest measurement value (just the number) for a given type.
 */
export function getLatestValue(
  measurements: Measurement[],
  type: AllMeasurementType
): number | null {
  return getLatestMeasurement(measurements, type)?.value ?? null;
}

/**
 * Get the complete measurement history for a given type,
 * sorted from oldest to newest.
 */
export function getMeasurementHistory(
  measurements: Measurement[],
  type: AllMeasurementType
): Measurement[] {
  return measurements
    .filter(m => m.type === type)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get the change between the latest and previous measurement for a type.
 */
export function getMeasurementChange(
  measurements: Measurement[],
  type: AllMeasurementType
): { current: number; previous: number; delta: number; percent: number; direction: 'up' | 'down' | 'stable' } | null {
  const history = getMeasurementHistory(measurements, type);
  if (history.length < 2) return null;

  const current = history[history.length - 1].value;
  const previous = history[history.length - 2].value;
  const delta = current - previous;
  const percent = previous > 0 ? (delta / previous) * 100 : 0;
  const direction = Math.abs(delta) < 0.01 ? 'stable' : delta > 0 ? 'up' : 'down';

  return {
    current,
    previous,
    delta: Math.round(delta * 100) / 100,
    percent: Math.round(percent * 100) / 100,
    direction,
  };
}

/**
 * Get all unique measurement types that have at least one entry.
 */
export function getActiveMeasurementTypes(
  measurements: Measurement[]
): AllMeasurementType[] {
  const seen = new Set<AllMeasurementType>();
  for (const m of measurements) {
    if (!seen.has(m.type)) {
      seen.add(m.type);
    }
  }
  return Array.from(seen);
}

/**
 * Get measurements that are missing from the set of expected types.
 */
export function getMissingTypes(
  measurements: Measurement[],
  expectedTypes: readonly AllMeasurementType[]
): AllMeasurementType[] {
  const present = new Set(measurements.map(m => m.type));
  return expectedTypes.filter(t => !present.has(t));
}

/**
 * Get a summary map of type → latest value.
 * This is the primary way the UI should access current measurement data.
 */
export function getLatestMeasurementMap(
  measurements: Measurement[]
): Partial<Record<AllMeasurementType, number>> {
  const map: Partial<Record<AllMeasurementType, number>> = {};
  for (let i = measurements.length - 1; i >= 0; i--) {
    const m = measurements[i];
    if (!(m.type in map)) {
      map[m.type] = m.value;
    }
  }
  return map;
}

/**
 * Get the count of measurements per type.
 */
export function getMeasurementCounts(
  measurements: Measurement[]
): Partial<Record<AllMeasurementType, number>> {
  const counts: Partial<Record<AllMeasurementType, number>> = {};
  for (const m of measurements) {
    counts[m.type] = (counts[m.type] || 0) + 1;
  }
  return counts;
}

// ============================================================================
// Convenience: Direct measurement access (use instead of .find())
// ============================================================================

/** Get latest chest measurement */
export const getLatestChest = (m: Measurement[]) => getLatestValue(m, 'chest');
/** Get latest waist measurement */
export const getLatestWaist = (m: Measurement[]) => getLatestValue(m, 'waist');
/** Get latest hips measurement */
export const getLatestHips = (m: Measurement[]) => getLatestValue(m, 'hips');
/** Get latest biceps measurement */
export const getLatestBiceps = (m: Measurement[]) => getLatestValue(m, 'biceps');
/** Get latest forearm measurement */
export const getLatestForearm = (m: Measurement[]) => getLatestValue(m, 'forearm');
/** Get latest thigh measurement */
export const getLatestThigh = (m: Measurement[]) => getLatestValue(m, 'thigh');
/** Get latest calf measurement */
export const getLatestCalf = (m: Measurement[]) => getLatestValue(m, 'calf');
/** Get latest neck measurement */
export const getLatestNeck = (m: Measurement[]) => getLatestValue(m, 'neck');
/** Get latest shoulders measurement */
export const getLatestShoulders = (m: Measurement[]) => getLatestValue(m, 'shoulders');
/** Get latest wrist measurement */
export const getLatestWrist = (m: Measurement[]) => getLatestValue(m, 'wrist');
/** Get latest body fat percentage */
export const getLatestBodyFat = (m: Measurement[]) => getLatestValue(m, 'body_fat_percentage');
/** Get latest lean mass */
export const getLatestLeanMass = (m: Measurement[]) => getLatestValue(m, 'lean_mass');
/** Get latest bone mass */
export const getLatestBoneMass = (m: Measurement[]) => getLatestValue(m, 'bone_mass');
/** Get latest water percentage */
export const getLatestWater = (m: Measurement[]) => getLatestValue(m, 'water_percentage');
