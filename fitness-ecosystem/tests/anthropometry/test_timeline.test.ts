/**
 * Timeline Tests
 *
 * Tests for timeline extraction, graph data formatting, and trend calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  extractTimeline,
  extractMultiTimeline,
  formatForRecharts,
  calculateTrend,
  getAvailableParameters,
  createProgressSummary,
} from '../../bodylab/core/progress/src/timeline';
import type { BodySnapshot } from '../../bodylab/core/progress/src/types';

// Helper to create snapshots
function createSnapshot(
  timestamp: string,
  params: Record<string, number>
): BodySnapshot {
  return {
    id: `snap-${timestamp}`,
    profileId: 'profile-1',
    timestamp,
    measurementIds: [],
    bodyParameters: {
      height: params.height ?? 1.75,
      weight: params.weight ?? 75,
      ...params,
    },
    referenceProfileId: 'ref-1',
    assessmentResultIds: [],
  };
}

describe('Timeline Module', () => {
  describe('extractTimeline', () => {
    it('should extract weight timeline from snapshots', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75 }),
        createSnapshot('2026-02-01T00:00:00Z', { weight: 73 }),
        createSnapshot('2026-03-01T00:00:00Z', { weight: 71 }),
      ];

      const timeline = extractTimeline(snapshots, 'weight');

      expect(timeline.length).toBe(3);
      expect(timeline[0].date).toBe('2026-01-01');
      expect(timeline[0].value).toBe(75);
      expect(timeline[1].date).toBe('2026-02-01');
      expect(timeline[1].value).toBe(73);
      expect(timeline[2].date).toBe('2026-03-01');
      expect(timeline[2].value).toBe(71);
    });

    it('should sort by date ascending', () => {
      const snapshots = [
        createSnapshot('2026-03-01T00:00:00Z', { weight: 71 }),
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75 }),
        createSnapshot('2026-02-01T00:00:00Z', { weight: 73 }),
      ];

      const timeline = extractTimeline(snapshots, 'weight');

      expect(timeline[0].date).toBe('2026-01-01');
      expect(timeline[1].date).toBe('2026-02-01');
      expect(timeline[2].date).toBe('2026-03-01');
    });

    it('should return empty array for no snapshots', () => {
      const timeline = extractTimeline([], 'weight');
      expect(timeline.length).toBe(0);
    });

    it('should skip snapshots without the parameter', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75 }),
        createSnapshot('2026-02-01T00:00:00Z', { height: 1.75, weight: 0 }), // weight=0
      ];

      const timeline = extractTimeline(snapshots, 'weight');

      expect(timeline.length).toBe(2);
      expect(timeline[0].value).toBe(75);
      expect(timeline[1].value).toBe(0);
    });

    it('should extract date part only', () => {
      const snapshots = [
        createSnapshot('2026-01-15T14:30:00Z', { weight: 75 }),
      ];

      const timeline = extractTimeline(snapshots, 'weight');

      expect(timeline[0].date).toBe('2026-01-15');
    });

    it('should set measurementType correctly', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75 }),
      ];

      const timeline = extractTimeline(snapshots, 'weight');

      expect(timeline[0].measurementType).toBe('weight');
    });
  });

  describe('extractMultiTimeline', () => {
    it('should extract multiple parameters', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75, height: 1.75 }),
        createSnapshot('2026-02-01T00:00:00Z', { weight: 73, height: 1.75 }),
      ];

      const timelines = extractMultiTimeline(snapshots, ['weight', 'height']);

      expect(timelines.weight.length).toBe(2);
      expect(timelines.height.length).toBe(2);
    });

    it('should handle empty parameters', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75 }),
      ];

      const timelines = extractMultiTimeline(snapshots, []);

      expect(Object.keys(timelines).length).toBe(0);
    });
  });

  describe('formatForRecharts', () => {
    it('should format data for Recharts', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75, height: 1.75 }),
        createSnapshot('2026-02-01T00:00:00Z', { weight: 73, height: 1.75 }),
      ];

      const chartData = formatForRecharts(snapshots, ['weight', 'height']);

      expect(chartData.length).toBe(2);
      expect(chartData[0]).toEqual({
        date: '2026-01-01',
        weight: 75,
        height: 1.75,
      });
      expect(chartData[1]).toEqual({
        date: '2026-02-01',
        weight: 73,
        height: 1.75,
      });
    });

    it('should sort by date', () => {
      const snapshots = [
        createSnapshot('2026-03-01T00:00:00Z', { weight: 71 }),
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75 }),
      ];

      const chartData = formatForRecharts(snapshots, ['weight']);

      expect(chartData[0].date).toBe('2026-01-01');
      expect(chartData[1].date).toBe('2026-03-01');
    });

    it('should default to 0 for missing parameters', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75 }),
      ];

      const chartData = formatForRecharts(snapshots, ['weight', 'chest']);

      expect(chartData[0].weight).toBe(75);
      expect(chartData[0].chest).toBe(0);
    });

    it('should handle empty snapshots', () => {
      const chartData = formatForRecharts([], ['weight']);
      expect(chartData.length).toBe(0);
    });
  });

  describe('calculateTrend', () => {
    it('should detect decreasing trend', () => {
      const points = [
        { date: '2026-01', value: 75, measurementType: 'weight' },
        { date: '2026-02', value: 73, measurementType: 'weight' },
        { date: '2026-03', value: 71, measurementType: 'weight' },
      ];

      const trend = calculateTrend(points);

      expect(trend.direction).toBe('decreasing');
      expect(trend.totalChange).toBe(-4);
      expect(trend.percentChange).toBeCloseTo(-5.33, 1);
    });

    it('should detect increasing trend', () => {
      const points = [
        { date: '2026-01', value: 75, measurementType: 'weight' },
        { date: '2026-02', value: 78, measurementType: 'weight' },
        { date: '2026-03', value: 80, measurementType: 'weight' },
      ];

      const trend = calculateTrend(points);

      expect(trend.direction).toBe('increasing');
      expect(trend.totalChange).toBe(5);
    });

    it('should detect stable trend', () => {
      const points = [
        { date: '2026-01', value: 75, measurementType: 'weight' },
        { date: '2026-02', value: 75.00001, measurementType: 'weight' },
      ];

      const trend = calculateTrend(points);

      expect(trend.direction).toBe('stable');
    });

    it('should handle single point', () => {
      const points = [
        { date: '2026-01', value: 75, measurementType: 'weight' },
      ];

      const trend = calculateTrend(points);

      expect(trend.direction).toBe('stable');
      expect(trend.totalChange).toBe(0);
    });

    it('should handle empty points', () => {
      const trend = calculateTrend([]);

      expect(trend.direction).toBe('stable');
      expect(trend.totalChange).toBe(0);
    });

    it('should calculate average change', () => {
      const points = [
        { date: '2026-01', value: 75, measurementType: 'weight' },
        { date: '2026-02', value: 73, measurementType: 'weight' },
        { date: '2026-03', value: 71, measurementType: 'weight' },
      ];

      const trend = calculateTrend(points);

      // Changes: -2, -2 → average: -2
      expect(trend.averageChange).toBe(-2);
    });
  });

  describe('getAvailableParameters', () => {
    it('should return all available parameters', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75, height: 1.75 }),
        createSnapshot('2026-02-01T00:00:00Z', { weight: 73, chest: 100 }),
      ];

      const params = getAvailableParameters(snapshots);

      expect(params).toContain('weight');
      expect(params).toContain('height');
      expect(params).toContain('chest');
    });

    it('should return sorted parameters', () => {
      const snapshots = [
        createSnapshot('2026-01-01T00:00:00Z', { weight: 75, height: 1.75, chest: 100 }),
      ];

      const params = getAvailableParameters(snapshots);

      expect(params).toEqual(['chest', 'height', 'weight']);
    });

    it('should handle empty snapshots', () => {
      const params = getAvailableParameters([]);
      expect(params.length).toBe(0);
    });
  });

  describe('createProgressSummary', () => {
    it('should create summary with changes', () => {
      const snapshotA = createSnapshot('2026-01-01T00:00:00Z', { weight: 75 });
      const snapshotB = createSnapshot('2026-02-01T00:00:00Z', { weight: 73 });

      const summary = createProgressSummary(snapshotA, snapshotB);

      expect(summary).toContain('weight');
      expect(summary).toContain('decreased');
    });

    it('should create summary for no changes', () => {
      const snapshotA = createSnapshot('2026-01-01T00:00:00Z', { weight: 75 });
      const snapshotB = createSnapshot('2026-02-01T00:00:00Z', { weight: 75 });

      const summary = createProgressSummary(snapshotA, snapshotB);

      expect(summary).toContain('No significant changes');
    });

    it('should handle multiple changes', () => {
      const snapshotA = createSnapshot('2026-01-01T00:00:00Z', { weight: 75, height: 1.75 });
      const snapshotB = createSnapshot('2026-02-01T00:00:00Z', { weight: 73, height: 1.76 });

      const summary = createProgressSummary(snapshotA, snapshotB);

      expect(summary).toContain('weight');
      expect(summary).toContain('height');
    });
  });
});
