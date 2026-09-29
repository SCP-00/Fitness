/**
 * Timeline & Graph Data
 *
 * Queries and formats snapshot data for temporal visualization.
 *
 * @module progress/timeline
 */

import type { BodySnapshot, TimelinePoint } from './types';

/**
 * Extract a timeline of a specific parameter from snapshots
 *
 * @param snapshots - Array of snapshots (sorted by timestamp)
 * @param parameter - Parameter name to extract (e.g., 'weight', 'height')
 * @returns Array of timeline points for graphing
 *
 * @example
 * ```ts
 * const data = extractTimeline(snapshots, 'weight');
 * // → [{ date: '2026-01-01', value: 75, measurementType: 'weight' }, ...]
 * ```
 */
export function extractTimeline(
  snapshots: BodySnapshot[],
  parameter: string
): TimelinePoint[] {
  const points: TimelinePoint[] = [];

  for (const snapshot of snapshots) {
    const value = (snapshot.bodyParameters as unknown as Record<string, number>)[parameter];
    if (typeof value === 'number') {
      points.push({
        date: snapshot.timestamp.split('T')[0], // Extract date part
        value,
        measurementType: parameter,
      });
    }
  }

  // Sort by date ascending
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Extract timelines for multiple parameters
 *
 * @param snapshots - Array of snapshots
 * @param parameters - Parameter names to extract
 * @returns Record of parameter → timeline points
 */
export function extractMultiTimeline(
  snapshots: BodySnapshot[],
  parameters: string[]
): Record<string, TimelinePoint[]> {
  const timelines: Record<string, TimelinePoint[]> = {};

  for (const param of parameters) {
    timelines[param] = extractTimeline(snapshots, param);
  }

  return timelines;
}

/**
 * Format timeline data for Recharts
 *
 * Recharts expects data in format: [{ date: '2026-01', weight: 75, height: 1.75 }, ...]
 *
 * @param snapshots - Array of snapshots
 * @param parameters - Parameter names to include
 * @returns Array of objects ready for Recharts
 *
 * @example
 * ```ts
 * const chartData = formatForRecharts(snapshots, ['weight', 'chest']);
 * // → [
 * //   { date: '2026-01', weight: 75, chest: 100 },
 * //   { date: '2026-02', weight: 73, chest: 101 },
 * // ]
 * ```
 */
export function formatForRecharts(
  snapshots: BodySnapshot[],
  parameters: string[]
): Array<Record<string, string | number>> {
  // Sort snapshots by date
  const sorted = [...snapshots].sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp)
  );

  return sorted.map((snapshot) => {
    const point: Record<string, string | number> = {
      date: snapshot.timestamp.split('T')[0],
    };

    for (const param of parameters) {
      const value = (snapshot.bodyParameters as unknown as Record<string, number>)[param];
      point[param] = typeof value === 'number' ? value : 0;
    }

    return point;
  });
}

/**
 * Calculate trend direction for a parameter
 *
 * @param points - Timeline points (sorted by date)
 * @returns Trend information
 */
export function calculateTrend(
  points: TimelinePoint[]
): {
  direction: 'increasing' | 'decreasing' | 'stable';
  totalChange: number;
  averageChange: number;
  percentChange: number;
} {
  if (points.length < 2) {
    return {
      direction: 'stable',
      totalChange: 0,
      averageChange: 0,
      percentChange: 0,
    };
  }

  const first = points[0].value;
  const last = points[points.length - 1].value;
  const totalChange = last - first;
  const percentChange = first !== 0 ? (totalChange / first) * 100 : 0;

  // Calculate average change per interval
  let totalIntervals = 0;
  let sumChanges = 0;

  for (let i = 1; i < points.length; i++) {
    const change = points[i].value - points[i - 1].value;
    sumChanges += change;
    totalIntervals++;
  }

  const averageChange = totalIntervals > 0 ? sumChanges / totalIntervals : 0;

  // Determine direction
  const threshold = 0.001; // 0.1% threshold for "stable"
  let direction: 'increasing' | 'decreasing' | 'stable';

  if (Math.abs(percentChange) < threshold) {
    direction = 'stable';
  } else if (totalChange > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  return {
    direction,
    totalChange: parseFloat(totalChange.toFixed(2)),
    averageChange: parseFloat(averageChange.toFixed(2)),
    percentChange: parseFloat(percentChange.toFixed(2)),
  };
}

/**
 * Get all available parameters from snapshots
 *
 * @param snapshots - Array of snapshots
 * @returns Array of parameter names that exist in the data
 */
export function getAvailableParameters(snapshots: BodySnapshot[]): string[] {
  const paramSet = new Set<string>();

  for (const snapshot of snapshots) {
    for (const key of Object.keys(snapshot.bodyParameters)) {
      paramSet.add(key);
    }
  }

  return Array.from(paramSet).sort();
}

/**
 * Create a summary of progress between two snapshots
 *
 * @param snapshotA - Earlier snapshot
 * @param snapshotB - Later snapshot
 * @returns Human-readable summary string
 */
export function createProgressSummary(
  snapshotA: BodySnapshot,
  snapshotB: BodySnapshot
): string {
  const allKeys = new Set([
    ...Object.keys(snapshotA.bodyParameters),
    ...Object.keys(snapshotB.bodyParameters),
  ]);

  const changes: string[] = [];

  for (const key of allKeys) {
    const valA = (snapshotA.bodyParameters as unknown as Record<string, number>)[key];
    const valB = (snapshotB.bodyParameters as unknown as Record<string, number>)[key];

    if (typeof valA === 'number' && typeof valB === 'number') {
      const delta = valB - valA;
      if (Math.abs(delta) > 0.01) {
        const direction = delta > 0 ? 'increased' : 'decreased';
        const absDelta = Math.abs(delta).toFixed(1);
        changes.push(`${key} ${direction} by ${absDelta}`);
      }
    }
  }

  if (changes.length === 0) {
    return 'No significant changes detected.';
  }

  return `Changes detected: ${changes.join(', ')}.`;
}
