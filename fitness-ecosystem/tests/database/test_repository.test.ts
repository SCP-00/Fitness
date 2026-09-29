/**
 * Repository Tests
 *
 * Tests for the database repository interface and in-memory implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../../bodylab/core/database/src/memory';
import type { Profile, MeasurementRecord } from '../../bodylab/core/database/src/repository';

describe('InMemoryRepository', () => {
  let repo: InMemoryRepository;

  beforeEach(async () => {
    repo = new InMemoryRepository();
    await repo.clear();
  });

  describe('Profile Operations', () => {
    it('should create a profile', async () => {
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('Test User');
      expect(profile.height).toBe(1.75);
      expect(profile.weight).toBe(75);
      expect(profile.created_at).toBeDefined();
      expect(profile.updated_at).toBeDefined();
    });

    it('should get a profile by ID', async () => {
      const created = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      const retrieved = await repo.getProfile(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test User');
    });

    it('should return null for non-existent profile', async () => {
      const retrieved = await repo.getProfile('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should get all profiles', async () => {
      await repo.createProfile({
        name: 'User 1',
        height: 1.70,
        weight: 70,
        biological_sex: 'male',
        units: 'metric',
      });

      await repo.createProfile({
        name: 'User 2',
        height: 1.65,
        weight: 60,
        biological_sex: 'female',
        units: 'metric',
      });

      const all = await repo.getAllProfiles();
      expect(all.length).toBe(2);
    });

    it('should update a profile', async () => {
      const created = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      // Add small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repo.updateProfile(created.id, {
        weight: 78,
        name: 'Updated User',
      });

      expect(updated.weight).toBe(78);
      expect(updated.name).toBe('Updated User');
      expect(updated.updated_at).toBeDefined();
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updated_at).getTime()
      );
    });

    it('should throw for non-existent profile update', async () => {
      await expect(
        repo.updateProfile('nonexistent', { weight: 78 })
      ).rejects.toThrow('Profile not found');
    });

    it('should delete a profile', async () => {
      const created = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      await repo.deleteProfile(created.id);
      const retrieved = await repo.getProfile(created.id);
      expect(retrieved).toBeNull();
    });

    it('should have ISO timestamps', async () => {
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      expect(new Date(profile.created_at).toISOString()).toBe(profile.created_at);
      expect(new Date(profile.updated_at).toISOString()).toBe(profile.updated_at);
    });
  });

  describe('Measurement Operations', () => {
    let profileId: string;

    beforeEach(async () => {
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });
      profileId = profile.id;
    });

    it('should create a measurement', async () => {
      const measurement = await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      expect(measurement.id).toBeDefined();
      expect(measurement.type).toBe('waist');
      expect(measurement.value).toBe(80);
    });

    it('should get a measurement by ID', async () => {
      const created = await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      const retrieved = await repo.getMeasurement(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get measurements by profile', async () => {
      await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: '2026-01-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      await repo.createMeasurement({
        profile_id: profileId,
        type: 'chest',
        value: 100,
        unit: 'cm',
        timestamp: '2026-01-02T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      const measurements = await repo.getMeasurementsByProfile(profileId);
      expect(measurements.length).toBe(2);
      // Should be sorted by timestamp descending
      expect(new Date(measurements[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(measurements[1].timestamp).getTime()
      );
    });

    it('should get measurements by type', async () => {
      await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: '2026-01-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 78,
        unit: 'cm',
        timestamp: '2026-02-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      await repo.createMeasurement({
        profile_id: profileId,
        type: 'chest',
        value: 100,
        unit: 'cm',
        timestamp: '2026-01-01T00:00:00Z',
        method: 'manual',
        confidence: 'high',
      });

      const waistMeasurements = await repo.getMeasurementsByType(profileId, 'waist');
      expect(waistMeasurements.length).toBe(2);
      expect(waistMeasurements.every((m) => m.type === 'waist')).toBe(true);
    });

    it('should update a measurement', async () => {
      const created = await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      const updated = await repo.updateMeasurement(created.id, {
        value: 78,
        notes: 'Updated measurement',
      });

      expect(updated.value).toBe(78);
      expect(updated.notes).toBe('Updated measurement');
    });

    it('should delete a measurement', async () => {
      const created = await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      await repo.deleteMeasurement(created.id);
      const retrieved = await repo.getMeasurement(created.id);
      expect(retrieved).toBeNull();
    });

    it('should delete measurements when profile is deleted', async () => {
      await repo.createMeasurement({
        profile_id: profileId,
        type: 'waist',
        value: 80,
        unit: 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
      });

      await repo.deleteProfile(profileId);
      const measurements = await repo.getMeasurementsByProfile(profileId);
      expect(measurements.length).toBe(0);
    });
  });

  describe('Snapshot Operations', () => {
    let profileId: string;

    beforeEach(async () => {
      const profile = await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });
      profileId = profile.id;
    });

    it('should create a snapshot', async () => {
      const snapshot = await repo.createSnapshot({
        profile_id: profileId,
        timestamp: new Date().toISOString(),
        measurement_ids: JSON.stringify(['meas-1', 'meas-2']),
        body_parameters: JSON.stringify({ height: 1.75, weight: 75 }),
        reference_profile_id: 'ref-1',
        algorithm_version: '1.0.0',
        reference_version: '1.0.0',
      });

      expect(snapshot.id).toBeDefined();
      expect(snapshot.profile_id).toBe(profileId);
    });

    it('should get a snapshot by ID', async () => {
      const created = await repo.createSnapshot({
        profile_id: profileId,
        timestamp: new Date().toISOString(),
        measurement_ids: JSON.stringify([]),
        body_parameters: JSON.stringify({ height: 1.75, weight: 75 }),
        reference_profile_id: 'ref-1',
        algorithm_version: '1.0.0',
        reference_version: '1.0.0',
      });

      const retrieved = await repo.getSnapshot(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get snapshots by profile', async () => {
      await repo.createSnapshot({
        profile_id: profileId,
        timestamp: '2026-01-01T00:00:00Z',
        measurement_ids: JSON.stringify([]),
        body_parameters: JSON.stringify({ height: 1.75, weight: 75 }),
        reference_profile_id: 'ref-1',
        algorithm_version: '1.0.0',
        reference_version: '1.0.0',
      });

      await repo.createSnapshot({
        profile_id: profileId,
        timestamp: '2026-02-01T00:00:00Z',
        measurement_ids: JSON.stringify([]),
        body_parameters: JSON.stringify({ height: 1.75, weight: 78 }),
        reference_profile_id: 'ref-1',
        algorithm_version: '1.0.0',
        reference_version: '1.0.0',
      });

      const snapshots = await repo.getSnapshotsByProfile(profileId);
      expect(snapshots.length).toBe(2);
      // Should be sorted by timestamp descending
      expect(new Date(snapshots[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(snapshots[1].timestamp).getTime()
      );
    });

    it('should delete a snapshot', async () => {
      const created = await repo.createSnapshot({
        profile_id: profileId,
        timestamp: new Date().toISOString(),
        measurement_ids: JSON.stringify([]),
        body_parameters: JSON.stringify({ height: 1.75, weight: 75 }),
        reference_profile_id: 'ref-1',
        algorithm_version: '1.0.0',
        reference_version: '1.0.0',
      });

      await repo.deleteSnapshot(created.id);
      const retrieved = await repo.getSnapshot(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Data Integrity', () => {
    it('should clear all data', async () => {
      await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      await repo.clear();

      const profiles = await repo.getAllProfiles();
      expect(profiles.length).toBe(0);
    });

    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        repo.createProfile({
          name: `User ${i}`,
          height: 1.70 + i * 0.01,
          weight: 70 + i,
          biological_sex: 'male',
          units: 'metric',
        })
      );

      const profiles = await Promise.all(promises);
      expect(profiles.length).toBe(10);

      const all = await repo.getAllProfiles();
      expect(all.length).toBe(10);
    });
  });

  describe('Close', () => {
    it('should close and clear data', async () => {
      await repo.createProfile({
        name: 'Test User',
        height: 1.75,
        weight: 75,
        biological_sex: 'male',
        units: 'metric',
      });

      await repo.close();

      const profiles = await repo.getAllProfiles();
      expect(profiles.length).toBe(0);
    });
  });
});
