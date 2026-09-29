/**
 * Measurement Queries
 *
 * Provides safe query functions for retrieving measurements.
 * Replaces broken `measurements.find(m => m.type === type)` pattern
 * which returns the FIRST measurement (oldest) instead of the LATEST.
 *
 * @module measurements/queries
 */

import type { Measurement } from './types';

/**
 * Generic measurement type — any string identifier for a measurement.
 * This allows queries to work with both core types and extended app types
 * (e.g., bilateral measurements like 'biceps_left', 'biceps_right').
 */
export type QueryMeasurementType = string;

/**
 * Get the most recent measurement of a given type.
 *
 * Previously the codebase used `measurements.find(m => m.type === type)` which
 * returns the FIRST (oldest) entry. Measurements are append-only, so the latest
 * entry is always the last one with a matching type.
 *
 * @param measurements - Array of all measurements
 * @param type - The measurement type to search for
 * @returns The most recent measurement of that type, or null if none exist
 *
 * @example
 * ```ts
 * const latest = getLatestMeasurement(measurements, 'chest');
 * // Returns { value: 103.4, timestamp: '2026-08-30T...', ... }
 * // NOT { value: 100.0, timestamp: '2026-07-01T...', ... }
 * ```
 */
export function getLatestMeasurement(
  measurements: Measurement[],
  type: QueryMeasurementType
): Measurement | null {
  // Find all measurements of this type, then get the last one (most recent)
  for (let i = measurements.length - 1; i >= 0; i--) {
    if (measurements[i].type === type) {
      return measurements[i];
    }
  }
  return null;
}

/**
 * Get the latest measurement value (just the number) for a given type.
 * Convenience wrapper for cases where only the value is needed.
 *
 * @param measurements - Array of all measurements
 * @param type - The measurement type to search for
 * @returns The numeric value of the most recent measurement, or null
 */
export function getLatestValue(
  measurements: Measurement[],
  type: QueryMeasurementType
): number | null {
  const latest = getLatestMeasurement(measurements, type);
  return latest?.value ?? null;
}

/**
 * Get the complete measurement history for a given type,
 * sorted from oldest to newest.
 *
 * @param measurements - Array of all measurements
 * @param type - The measurement type to search for
 * @returns Array of matching measurements, oldest first
 *
 * @example
 * ```ts
 * const history = getMeasurementHistory(measurements, 'chest');
 * // [
 * //   { value: 100.0, timestamp: '2026-07-01T...' },
 * //   { value: 101.8, timestamp: '2026-08-16T...' },
 * //   { value: 103.4, timestamp: '2026-08-30T...' },
 * // ]
 * ```
 */
export function getMeasurementHistory(
  measurements: Measurement[],
  type: QueryMeasurementType
): Measurement[] {
  return measurements
    .filter(m => m.type === type)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get all unique measurement types that have at least one entry.
 *
 * @param measurements - Array of all measurements
 * @returns Array of unique measurement types present in the data
 */
export function getActiveMeasurementTypes(
  measurements: Measurement[]
): string[] {
  const seen = new Set<string>();
  for (const m of measurements) {
    if (!seen.has(m.type)) {
      seen.add(m.type);
    }
  }
  return Array.from(seen);
}

/**
 * Get measurements that are missing from the set of expected types.
 * Useful for showing incomplete session status.
 *
 * @param measurements - Array of all measurements
 * @param expectedTypes - The full set of types expected for a complete assessment
 * @returns Array of types that have no measurements recorded
 */
export function getMissingTypes(
  measurements: Measurement[],
  expectedTypes: readonly string[]
): string[] {
  const present = new Set<string>(measurements.map(m => m.type));
  return expectedTypes.filter(t => !present.has(t));
}

/**
 * Calculate the change between two measurement values.
 * Returns null if either value is missing.
 *
 * @param current - Current (latest) value
 * @param previous - Previous value to compare against
 * @returns Object with delta, percent change, and direction
 */
export function calculateChange(
  current: number | null,
  previous: number | null
): { delta: number; percent: number; direction: 'up' | 'down' | 'stable' } | null {
  if (current === null || previous === null || previous === 0) return null;

  const delta = current - previous;
  const percent = (delta / previous) * 100;
  const direction = Math.abs(delta) < 0.01 ? 'stable' : delta > 0 ? 'up' : 'down';

  return {
    delta: Math.round(delta * 100) / 100,
    percent: Math.round(percent * 100) / 100,
    direction,
  };
}

/**
 * Get all measurements as a summary map of type → latest value.
 * This is the primary way the UI should access current measurement data.
 *
 * @param measurements - Array of all measurements
 * @returns Record mapping measurement type to its latest value
 */
export function getLatestMeasurementMap(
  measurements: Measurement[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = measurements.length - 1; i >= 0; i--) {
    const m = measurements[i];
    if (!(m.type in map)) {
      map[m.type] = m.value;
    }
  }
  return map;
}

/**
 * Get the total count of measurements per type.
 *
 * @param measurements - Array of all measurements
 * @returns Record mapping measurement type to count
 */
export function getMeasurementCounts(
  measurements: Measurement[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of measurements) {
    counts[m.type] = (counts[m.type] || 0) + 1;
  }
  return counts;
}
