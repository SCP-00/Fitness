/**
 * Data Integrity Tests
 *
 * Integration tests verifying data survives operations correctly.
 * Simulates the persistence lifecycle: create → save → reload → compare.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../../bodylab/core/database/src/memory';

describe('Data Integrity', () => {
  let repo: InMemoryRepository;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    await repo.clear();
  });

  describe('Full Lifecycle', () => {
    it('should preserve data through full lifecycle', async () => {
      // 1. Create profile
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      // 2. Add measurements
      const waist = await repo.createMeasurement({
        profile_id: profile.id,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: '2026-01-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      const chest = await repo.createMeasurement({
        profile_id: profile.id,
        type: 'chest',
        value: 100,
        unit: 'cm',
        timestamp: '2026-01-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      // 3. Create snapshot
      const snapshot = await repo.createSnapshot({
        profile_id: profile.id,
        timestamp: '2026-01-01T00:00:00Z',
        measurement_ids: JSON.stringify([waist.id, chest.id]),
        body_parameters: JSON.stringify({
          height: profile.height,
          weight: profile.weight,
        }),
        reference_profile_id: 'mccallum_recreational',
        algorithm_version: '1.0.0',
        reference_version: '1.0.0',
      });

      // 4. Verify all data exists
      const retrievedProfile = await repo.getProfile(profile.id);
      expect(retrievedProfile).not.toBeNull();
      expect(retrievedProfile?.name).toBe('Test User');
      expect(retrievedProfile?.height).toBe(1.75);

      const measurements = await repo.getMeasurementsByProfile(profile.id);
      expect(measurements.length).toBe(2);

      const snapshots = await repo.getSnapshotsByProfile(profile.id);
      expect(snapshots.length).toBe(1);

      // 5. Verify snapshot contains correct data
      const retrievedSnapshot = await repo.getSnapshot(snapshot.id);
      expect(retrievedSnapshot).not.toBeNull();
      expect(retrievedSnapshot?.measurement_ids).toBe(
        JSON.stringify([waist.id, chest.id])
      );
    });

    it('should maintain measurement history', async () => {
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      // Add multiple measurements over time
      await repo.createMeasurement({
        profile_id: profile.id,
        type: 'waist',
        value: 85,
        unit: 'cm',
        timestamp: '2026-01-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      await repo.createMeasurement({
        profile_id: profile.id,
        type: 'waist',
        value: 83,
        unit: 'cm',
        timestamp: '2026-02-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      await repo.createMeasurement({
        profile_id: profile.id,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: '2026-03-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      const measurements = await repo.getMeasurementsByType(profile.id, 'waist');
      expect(measurements.length).toBe(3);

      // Should be sorted by timestamp descending
      expect(measurements[0].value).toBe(80); // Most recent
      expect(measurements[1].value).toBe(83);
      expect(measurements[2].value).toBe(85); // Oldest
    });

    it('should support multiple profiles', async () => {
      const profile1 = await repo.createProfile({
        name: 'User 1',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      const profile2 = await repo.createProfile({
        name: 'User 2',
        height: 1.65,
        weight: 60,
        biological_sex: 'female',
        units: 'metric',
      });

      await repo.createMeasurement({
        profile_id: profile1.id,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      await repo.createMeasurement({
        profile_id: profile2.id,
        type: 'waist',
        value: 65,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      const profile1Measurements = await repo.getMeasurementsByProfile(profile1.id);
      const profile2Measurements = await repo.getMeasurementsByProfile(profile2.id);

      expect(profile1Measurements.length).toBe(1);
      expect(profile2Measurements.length).toBe(1);
      expect(profile1Measurements[0].value).toBe(80);
      expect(profile2Measurements[0].value).toBe(65);
    });

    it('should not lose data on profile update', async () => {
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      await repo.createMeasurement({
        profile_id: profile.id,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      // Update profile
      await repo.updateProfile(profile.id, { weight: 78 });

      // Measurements should still exist
      const measurements = await repo.getMeasurementsByProfile(profile.id);
      expect(measurements.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty profile', async () => {
      const profile = await repo.createProfile({
        name: 'Empty User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      const measurements = await repo.getMeasurementsByProfile(profile.id);
      expect(measurements.length).toBe(0);

      const snapshots = await repo.getSnapshotsByProfile(profile.id);
      expect(snapshots.length).toBe(0);
    });

    it('should handle profile with many measurements', async () => {
      const profile = await repo.createProfile({
        name: 'Many Measurements',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      // Add 100 measurements
      const promises = Array.from({ length: 100 }, (_, i) =>
        repo.createMeasurement({
          profile_id: profile.id,
          type: 'waist',
          value: 80 + i,
          unit: 'cm',
          timestamp: new Date(2026, 0, 1, 0, i).toISOString(),
          method: 'manual',
          confidence: 'high',
        })
      );

      await Promise.all(promises);

      const measurements = await repo.getMeasurementsByProfile(profile.id);
      expect(measurements.length).toBe(100);
    });

    it('should handle special characters in notes', async () => {
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      const measurement = await repo.createMeasurement({
        profile_id: profile.id,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
        notes: 'Special chars: áéíóú ñ @#$%^&*()',
      });

      const retrieved = await repo.getMeasurement(measurement.id);
      expect(retrieved?.notes).toBe('Special chars: áéíóú ñ @#$%^&*()');
    });
  });
});
