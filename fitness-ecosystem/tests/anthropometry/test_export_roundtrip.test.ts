/**
 * Export Roundtrip Tests
 *
 * Tests that data survives export → import cycle without loss.
 * Verifies: D_original ≡ D_restored
 */

import { describe, it, expect } from 'vitest';
import { exportToJSON, createFitnessBundle, importFitnessBundle } from '../../bodylab/core/export/src/json';
import { exportToCSV } from '../../bodylab/core/export/src/csv';
import type { ExportData } from '../../bodylab/core/export/src/types';

describe('Export Roundtrip', () => {
  const sampleData: ExportData = {
    profile: {
      id: 'profile-1',
      name: 'Test User',
      height: 1.75,
      weight: 75,
      biological_sex: 'male',
      units: 'metric',
    },
    measurements: [
      { id: 'meas-1', type: 'waist', value: 80, unit: 'cm', timestamp: '2026-01-01T00:00:00Z' },
      { id: 'meas-2', type: 'chest', value: 100, unit: 'cm', timestamp: '2026-01-01T00:00:00Z' },
      { id: 'meas-3', type: 'biceps', value: 36, unit: 'cm', timestamp: '2026-01-01T00:00:00Z' },
    ],
    composition: {
      whtr: 0.4571,
      frameSize: 'medium',
      frameRatio: 11.38,
    },
    snapshots: [
      {
        id: 'snap-1',
        timestamp: '2026-01-01T00:00:00Z',
        bodyParameters: { height: 1.75, weight: 75 },
        measurementIds: ['meas-1', 'meas-2', 'meas-3'],
      },
      {
        id: 'snap-2',
        timestamp: '2026-02-01T00:00:00Z',
        bodyParameters: { height: 1.75, weight: 73 },
        measurementIds: ['meas-1', 'meas-2', 'meas-3'],
      },
    ],
    goals: [
      { id: 'goal-1', type: 'weight', target: 70, unit: 'kg' },
    ],
  };

  describe('JSON Export Roundtrip', () => {
    it('should preserve profile data through roundtrip', () => {
      const json = exportToJSON(sampleData);
      const bundle = createFitnessBundle(sampleData);
      const imported = importFitnessBundle(bundle);

      expect(imported.profile).toEqual(sampleData.profile);
    });

    it('should preserve measurements through roundtrip', () => {
      const bundle = createFitnessBundle(sampleData);
      const imported = importFitnessBundle(bundle);

      expect(imported.measurements).toEqual(sampleData.measurements);
    });

    it('should preserve composition through roundtrip', () => {
      const bundle = createFitnessBundle(sampleData);
      const imported = importFitnessBundle(bundle);

      expect(imported.composition).toEqual(sampleData.composition);
    });

    it('should preserve snapshots through roundtrip', () => {
      const bundle = createFitnessBundle(sampleData);
      const imported = importFitnessBundle(bundle);

      expect(imported.snapshots).toEqual(sampleData.snapshots);
    });

    it('should preserve goals through roundtrip', () => {
      const bundle = createFitnessBundle(sampleData);
      const imported = importFitnessBundle(bundle);

      expect(imported.goals).toEqual(sampleData.goals);
    });

    it('should preserve all data through complete roundtrip', () => {
      const bundle = createFitnessBundle(sampleData);
      const imported = importFitnessBundle(bundle);

      // D_original ≡ D_restored
      expect(imported).toEqual(sampleData);
    });

    it('should produce valid JSON', () => {
      const bundle = createFitnessBundle(sampleData);
      const parsed = JSON.parse(bundle);

      expect(parsed.manifest).toBeDefined();
      expect(parsed.manifest.format).toBe('fitness-bundle');
      expect(parsed.profile).toBeDefined();
      expect(parsed.measurements).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve numeric precision', () => {
      const dataWithPrecision: ExportData = {
        ...sampleData,
        composition: {
          whtr: 0.4571428571428571,
          frameRatio: 11.379310344827587,
        },
      };

      const bundle = createFitnessBundle(dataWithPrecision);
      const imported = importFitnessBundle(bundle);

      expect(imported.composition.whtr).toBe(dataWithPrecision.composition.whtr);
      expect(imported.composition.frameRatio).toBe(dataWithPrecision.composition.frameRatio);
    });

    it('should preserve string with special characters', () => {
      const dataWithSpecialChars: ExportData = {
        ...sampleData,
        profile: {
          ...sampleData.profile,
          name: 'José María Ñoño',
          notes: 'Special: áéíóú ñ @#$%^&*()',
        },
      };

      const bundle = createFitnessBundle(dataWithSpecialChars);
      const imported = importFitnessBundle(bundle);

      expect(imported.profile.name).toBe('José María Ñoño');
      expect(imported.profile.notes).toBe('Special: áéíóú ñ @#$%^&*()');
    });

    it('should preserve nested objects', () => {
      const dataWithNested: ExportData = {
        ...sampleData,
        composition: {
          ...sampleData.composition,
          detailed: {
            muscleMass: 35.2,
            fatMass: 12.8,
            boneMass: 3.5,
          },
        },
      };

      const bundle = createFitnessBundle(dataWithNested);
      const imported = importFitnessBundle(bundle);

      expect(imported.composition.detailed).toEqual({
        muscleMass: 35.2,
        fatMass: 12.8,
        boneMass: 3.5,
      });
    });

    it('should preserve arrays', () => {
      const dataWithArrays: ExportData = {
        ...sampleData,
        measurements: [
          ...sampleData.measurements,
          { id: 'meas-4', type: 'thigh', value: 55, unit: 'cm' },
          { id: 'meas-5', type: 'calf', value: 37, unit: 'cm' },
        ],
      };

      const bundle = createFitnessBundle(dataWithArrays);
      const imported = importFitnessBundle(bundle);

      expect(imported.measurements.length).toBe(5);
    });

    it('should preserve empty arrays', () => {
      const dataWithEmpty: ExportData = {
        ...sampleData,
        snapshots: [],
        goals: [],
      };

      const bundle = createFitnessBundle(dataWithEmpty);
      const imported = importFitnessBundle(bundle);

      expect(imported.snapshots).toEqual([]);
      expect(imported.goals).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should throw for invalid JSON', () => {
      expect(() => importFitnessBundle('not valid json')).toThrow();
    });

    it('should throw for wrong format', () => {
      const wrongFormat = JSON.stringify({
        manifest: { format: 'wrong-format' },
      });

      expect(() => importFitnessBundle(wrongFormat)).toThrow('Invalid Fitness Bundle format');
    });

    it('should throw for missing manifest', () => {
      const noManifest = JSON.stringify({
        profile: {},
      });

      expect(() => importFitnessBundle(noManifest)).toThrow('Invalid Fitness Bundle format');
    });
  });

  describe('CSV Export', () => {
    it('should export measurements to CSV', () => {
      const csv = exportToCSV(sampleData.measurements);

      expect(csv).toContain('id,type,value,unit,timestamp');
      expect(csv).toContain('meas-1,waist,80,cm,2026-01-01T00:00:00Z');
      expect(csv).toContain('meas-2,chest,100,cm,2026-01-01T00:00:00Z');
    });

    it('should handle empty measurements', () => {
      const csv = exportToCSV([]);
      expect(csv).toBe('');
    });
  });
});
