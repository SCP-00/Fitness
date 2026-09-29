/**
 * Progress Tests
 *
 * Tests for body snapshot creation and comparison.
 */

import { describe, it, expect } from 'vitest';
import { createSnapshot, compareSnapshots } from '../../bodylab/core/progress/src/snapshot';

describe('Progress Module', () => {
  describe('Snapshot Creation', () => {
    it('should create a snapshot with auto-generated ID', () => {
      const snapshot = createSnapshot(
        'profile-1',
        ['meas-1', 'meas-2'],
        { height: 1.75, weight: 75 },
        'ref-1'
      );
      expect(snapshot.id).toBeDefined();
      expect(snapshot.profileId).toBe('profile-1');
      expect(snapshot.measurementIds).toEqual(['meas-1', 'meas-2']);
      expect(snapshot.referenceProfileId).toBe('ref-1');
    });

    it('should create a snapshot with ISO timestamp', () => {
      const snapshot = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 75 },
        'ref-1'
      );
      expect(snapshot.timestamp).toBeDefined();
      expect(new Date(snapshot.timestamp).toISOString()).toBe(snapshot.timestamp);
    });

    it('should create a snapshot with notes', () => {
      const snapshot = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 75 },
        'ref-1',
        [],
        'Test note'
      );
      expect(snapshot.notes).toBe('Test note');
    });
  });

  describe('Snapshot Comparison', () => {
    it('should calculate deltas between snapshots', () => {
      const snapshotA = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 75 },
        'ref-1'
      );
      // Manually set timestamp for deterministic comparison
      snapshotA.timestamp = '2026-01-01T00:00:00Z';

      const snapshotB = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 78 },
        'ref-1'
      );
      snapshotB.timestamp = '2026-02-01T00:00:00Z';

      const comparison = compareSnapshots(snapshotA, snapshotB);

      expect(comparison.parameterDeltas.length).toBeGreaterThan(0);

      const weightDelta = comparison.parameterDeltas.find((d) => d.parameter === 'weight');
      expect(weightDelta).toBeDefined();
      expect(weightDelta?.delta).toBe(3);
      expect(weightDelta?.percentageChange).toBeCloseTo(4, 0);
    });

    it('should calculate time between snapshots', () => {
      const snapshotA = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 75 },
        'ref-1'
      );
      snapshotA.timestamp = '2026-01-01T00:00:00Z';

      const snapshotB = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 75 },
        'ref-1'
      );
      snapshotB.timestamp = '2026-01-31T00:00:00Z';

      const comparison = compareSnapshots(snapshotA, snapshotB);

      expect(comparison.timeBetween).toBeCloseTo(30, 0);
    });

    it('should handle zero change', () => {
      const snapshotA = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 75 },
        'ref-1'
      );
      snapshotA.timestamp = '2026-01-01T00:00:00Z';

      const snapshotB = createSnapshot(
        'profile-1',
        [],
        { height: 1.75, weight: 75 },
        'ref-1'
      );
      snapshotB.timestamp = '2026-02-01T00:00:00Z';

      const comparison = compareSnapshots(snapshotA, snapshotB);

      const weightDelta = comparison.parameterDeltas.find((d) => d.parameter === 'weight');
      expect(weightDelta?.delta).toBe(0);
      expect(weightDelta?.percentageChange).toBe(0);
    });
  });
});
