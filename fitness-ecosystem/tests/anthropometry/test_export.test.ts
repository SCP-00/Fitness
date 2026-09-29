/**
 * Export Tests
 *
 * Tests for data export functionality.
 */

import { describe, it, expect } from 'vitest';
import { exportToJSON, createFitnessBundle, createBundleManifest } from '../../bodylab/core/export/src/json';
import { exportToCSV, exportProfileToCSV } from '../../bodylab/core/export/src/csv';
import type { ExportData } from '../../bodylab/core/export/src/types';

const sampleData: ExportData = {
  profile: {
    id: 'profile-1',
    name: 'Test User',
    height: 1.75,
    weight: 75,
  },
  measurements: [
    { id: 'meas-1', type: 'waist', value: 80, unit: 'cm' },
    { id: 'meas-2', type: 'chest', value: 100, unit: 'cm' },
  ],
  composition: {
    whtr: 0.4571,
    frameSize: 'medium',
  },
  snapshots: [
    {
      id: 'snap-1',
      timestamp: '2026-01-01T00:00:00Z',
      bodyParameters: { height: 1.75, weight: 75 },
    },
  ],
  goals: [],
};

describe('Export Module', () => {
  describe('JSON Export', () => {
    it('should export data as valid JSON', () => {
      const json = exportToJSON(sampleData);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(1);
      expect(parsed.format).toBe('bodylab-json');
      expect(parsed.data.profile).toEqual(sampleData.profile);
    });

    it('should include export timestamp', () => {
      const json = exportToJSON(sampleData);
      const parsed = JSON.parse(json);
      expect(parsed.exportedAt).toBeDefined();
      expect(new Date(parsed.exportedAt).toISOString()).toBe(parsed.exportedAt);
    });
  });

  describe('CSV Export', () => {
    it('should export measurements as CSV', () => {
      const csv = exportToCSV(sampleData.measurements);
      expect(csv).toContain('id,type,value,unit');
      expect(csv).toContain('meas-1,waist,80,cm');
      expect(csv).toContain('meas-2,chest,100,cm');
    });

    it('should handle empty array', () => {
      const csv = exportToCSV([]);
      expect(csv).toBe('');
    });

    it('should export profile as CSV', () => {
      const csv = exportProfileToCSV(sampleData.profile as Record<string, unknown>);
      expect(csv).toContain('id,name,height,weight');
      expect(csv).toContain('profile-1,Test User,1.75,75');
    });

    it('should handle commas in values', () => {
      const data = [{ name: 'Test, User', value: 100 }];
      const csv = exportToCSV(data);
      expect(csv).toContain('"Test, User"');
    });
  });

  describe('Fitness Bundle', () => {
    it('should create a valid Fitness Bundle', () => {
      const bundle = createFitnessBundle(sampleData);
      const parsed = JSON.parse(bundle);

      expect(parsed.manifest.format).toBe('fitness-bundle');
      expect(parsed.manifest.version).toBe(1);
      expect(parsed.profile).toEqual(sampleData.profile);
      expect(parsed.measurements).toEqual(sampleData.measurements);
      expect(parsed.bodySnapshots).toEqual(sampleData.snapshots);
    });

    it('should create correct manifest', () => {
      const manifest = createBundleManifest(sampleData);
      expect(manifest.format).toBe('fitness-bundle');
      expect(manifest.version).toBe(1);
      expect(manifest.contains).toContain('profile');
      expect(manifest.contains).toContain('measurements');
      expect(manifest.schemaVersion).toBe('1.0.0');
    });
  });
});
