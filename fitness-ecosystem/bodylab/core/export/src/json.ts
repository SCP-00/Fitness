/**
 * JSON Export
 *
 * Exports BodyLab data as JSON files.
 *
 * @module export/json
 */

import type { ExportData, BundleManifest } from './types';

/**
 * Create a JSON export of BodyLab data
 */
export function exportToJSON(data: ExportData): string {
  const exportObj = {
    version: 1,
    exportedAt: new Date().toISOString(),
    format: 'bodylab-json',
    data: {
      profile: data.profile,
      measurements: data.measurements,
      composition: data.composition,
      snapshots: data.snapshots,
      goals: data.goals,
    },
  };

  return JSON.stringify(exportObj, null, 2);
}

/**
 * Create a Fitness Bundle manifest
 */
export function createBundleManifest(_data: ExportData): BundleManifest {
  return {
    format: 'fitness-bundle',
    version: 1,
    createdAt: new Date().toISOString(),
    contains: [
      'profile',
      'measurements',
      'composition',
      'snapshots',
      'goals',
    ],
    schemaVersion: '1.0.0',
  };
}

/**
 * Create a complete Fitness Bundle
 */
export function createFitnessBundle(data: ExportData): string {
  const bundle = {
    manifest: createBundleManifest(data),
    profile: data.profile,
    measurements: data.measurements,
    composition: data.composition,
    goals: data.goals,
    bodySnapshots: data.snapshots,
    metadata: {
      sources: ['bodylab-v1.0'],
    },
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * Parse a Fitness Bundle from JSON string
 */
export function importFitnessBundle(bundleJson: string): ExportData {
  const bundle = JSON.parse(bundleJson);

  if (bundle.manifest?.format !== 'fitness-bundle') {
    throw new Error('Invalid Fitness Bundle format');
  }

  return {
    profile: bundle.profile,
    measurements: bundle.measurements,
    composition: bundle.composition,
    snapshots: bundle.bodySnapshots,
    goals: bundle.goals,
  };
}
