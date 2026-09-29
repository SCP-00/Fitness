/**
 * @fitness/bodylab-progress
 * 
 * Evolución temporal y snapshots corporales.
 * 
 * @module progress
 */

export { createSnapshot, compareSnapshots } from './snapshot';
export {
  extractTimeline,
  extractMultiTimeline,
  formatForRecharts,
  calculateTrend,
  getAvailableParameters,
  createProgressSummary,
} from './timeline';

// Types
export type { BodySnapshot, SnapshotComparison, Delta, TimelinePoint } from './types';
