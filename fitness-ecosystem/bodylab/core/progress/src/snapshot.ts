/**
 * Body Snapshot
 *
 * Creates and manages point-in-time body records.
 *
 * @module progress/snapshot
 */

import type { BodySnapshot } from './types';

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a new body snapshot
 */
export function createSnapshot(
  profileId: string,
  measurementIds: string[],
  bodyParameters: BodySnapshot['bodyParameters'],
  referenceProfileId: string,
  assessmentResultIds: string[] = [],
  notes?: string
): BodySnapshot {
  return {
    id: generateId(),
    profileId,
    timestamp: new Date().toISOString(),
    measurementIds,
    bodyParameters,
    referenceProfileId,
    assessmentResultIds,
    notes,
  };
}

/**
 * Compare two snapshots and calculate deltas
 */
export function compareSnapshots(
  snapshotA: BodySnapshot,
  snapshotB: BodySnapshot
): {
  parameterDeltas: Array<{
    parameter: string;
    valueA: number;
    valueB: number;
    delta: number;
    percentageChange: number;
  }>;
  timeBetween: number; // days
} {
  const parameterDeltas: Array<{
    parameter: string;
    valueA: number;
    valueB: number;
    delta: number;
    percentageChange: number;
  }> = [];

  // Compare body parameters
  const allKeys = new Set([
    ...Object.keys(snapshotA.bodyParameters),
    ...Object.keys(snapshotB.bodyParameters),
  ]);

  for (const key of allKeys) {
    const valA = (snapshotA.bodyParameters as unknown as Record<string, number>)[key];
    const valB = (snapshotB.bodyParameters as unknown as Record<string, number>)[key];

    if (typeof valA === 'number' && typeof valB === 'number') {
      const delta = valB - valA;
      const percentageChange = valA !== 0 ? (delta / valA) * 100 : 0;

      parameterDeltas.push({
        parameter: key,
        valueA: valA,
        valueB: valB,
        delta: parseFloat(delta.toFixed(2)),
        percentageChange: parseFloat(percentageChange.toFixed(2)),
      });
    }
  }

  // Calculate time between snapshots
  const dateA = new Date(snapshotA.timestamp);
  const dateB = new Date(snapshotB.timestamp);
  const timeBetween = Math.abs(dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24);

  return {
    parameterDeltas,
    timeBetween: parseFloat(timeBetween.toFixed(1)),
  };
}
