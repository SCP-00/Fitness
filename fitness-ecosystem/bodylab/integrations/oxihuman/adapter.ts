/**
 * OxiHuman Integration Adapter
 *
 * Maps BodyLab body parameters to OxiHuman parametric controls.
 * Provides a clean interface between our domain logic and the external library.
 *
 * @module integrations/oxihuman
 */

/**
 * OxiHuman parameter names (from the 38 morph targets)
 */
export type OxiParamName =
  | 'height'
  | 'weight'
  | 'muscle'
  | 'age'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'neck'
  | 'shoulders'
  | 'biceps'
  | 'forearm'
  | 'thigh'
  | 'calf'
  | string; // Allow custom parameters

/**
 * Body parameters from BodyLab
 */
export interface BodyParameters {
  height: number; // meters (0.5-2.5)
  weight: number; // kg (30-250)
  muscle?: number; // 0.0-1.0 (muscle mass factor)
  age?: number; // years (18-100)
  chest?: number; // cm (target circumference)
  waist?: number; // cm (target circumference)
  hips?: number; // cm (target circumference)
  neck?: number; // cm (target circumference)
  shoulders?: number; // cm (target circumference)
  biceps?: number; // cm (target circumference)
  forearm?: number; // cm (target circumference)
  thigh?: number; // cm (target circumference)
  calf?: number; // cm (target circumference)
}

/**
 * OxiHuman slider range
 */
export interface OxiParamRange {
  min: number;
  max: number;
  default: number;
}

/**
 * Map BodyLab parameters to OxiHuman parameters
 *
 * BodyLab uses real-world units (meters, cm, kg)
 * OxiHuman uses normalized sliders (0.0-1.0 for most)
 */
export function bodyParamsToOxiParams(
  params: BodyParameters
): Record<string, number> {
  const oxiParams: Record<string, number> = {};

  // Height: meters → normalized (0.5-2.5m → 0.0-1.0)
  if (params.height !== undefined) {
    oxiParams.height = normalize(params.height, 0.5, 2.5);
  }

  // Weight: kg → normalized (30-250kg → 0.0-1.0)
  if (params.weight !== undefined) {
    oxiParams.weight = normalize(params.weight, 30, 250);
  }

  // Muscle: already 0.0-1.0
  if (params.muscle !== undefined) {
    oxiParams.muscle = clamp(params.muscle, 0, 1);
  }

  // Age: years → normalized (18-100 → 0.0-1.0)
  if (params.age !== undefined) {
    oxiParams.age = normalize(params.age, 18, 100);
  }

  // Circumferences: cm → normalized (using reasonable ranges)
  const circumferenceRanges: Record<string, [number, number]> = {
    chest: [60, 160],
    waist: [50, 160],
    hips: [60, 160],
    neck: [25, 55],
    shoulders: [80, 180],
    biceps: [20, 65],
    forearm: [18, 50],
    thigh: [35, 90],
    calf: [25, 60],
  };

  for (const [key, range] of Object.entries(circumferenceRanges)) {
    const value = params[key as keyof BodyParameters];
    if (typeof value === 'number') {
      oxiParams[key] = normalize(value, range[0], range[1]);
    }
  }

  return oxiParams;
}

/**
 * Map OxiHuman parameters back to BodyLab parameters
 *
 * For measurement fitting: read mesh → calculate circumferences
 */
export function oxiParamsToBodyParams(
  oxiParams: Record<string, number>
): BodyParameters {
  const bodyParams: BodyParameters = {
    height: denormalize(oxiParams.height ?? 0.5, 0.5, 2.5),
    weight: denormalize(oxiParams.weight ?? 0.3, 30, 250),
  };

  if (oxiParams.muscle !== undefined) {
    bodyParams.muscle = clamp(oxiParams.muscle, 0, 1);
  }

  if (oxiParams.age !== undefined) {
    bodyParams.age = Math.round(denormalize(oxiParams.age, 18, 100));
  }

  // Circumferences
  const circumferenceRanges: Record<string, [number, number]> = {
    chest: [60, 160],
    waist: [50, 160],
    hips: [60, 160],
    neck: [25, 55],
    shoulders: [80, 180],
    biceps: [20, 65],
    forearm: [18, 50],
    thigh: [35, 90],
    calf: [25, 60],
  };

  for (const [key, range] of Object.entries(circumferenceRanges)) {
    if (oxiParams[key] !== undefined) {
      (bodyParams as Record<string, number>)[key] = denormalize(
        oxiParams[key],
        range[0],
        range[1]
      );
    }
  }

  return bodyParams;
}

/**
 * Calculate deviation between target and actual measurements
 *
 * @param target - Target body parameters
 * @param actual - Actual body parameters (from mesh measurement)
 * @returns Deviation per measurement in cm
 */
export function calculateMeasurementDeviation(
  target: BodyParameters,
  actual: BodyParameters
): Record<string, number> {
  const deviations: Record<string, number> = {};

  const measurements = [
    'chest', 'waist', 'hips', 'neck', 'shoulders',
    'biceps', 'forearm', 'thigh', 'calf',
  ];

  for (const m of measurements) {
    const targetVal = target[m as keyof BodyParameters];
    const actualVal = actual[m as keyof BodyParameters];

    if (typeof targetVal === 'number' && typeof actualVal === 'number') {
      deviations[m] = parseFloat((actualVal - targetVal).toFixed(2));
    }
  }

  return deviations;
}

/**
 * Get OxiHuman parameter ranges
 */
export function getOxiParamRanges(): Record<string, OxiParamRange> {
  return {
    height: { min: 0, max: 1, default: 0.5 },
    weight: { min: 0, max: 1, default: 0.3 },
    muscle: { min: 0, max: 1, default: 0.5 },
    age: { min: 0, max: 1, default: 0.2 },
    chest: { min: 0, max: 1, default: 0.5 },
    waist: { min: 0, max: 1, default: 0.5 },
    hips: { min: 0, max: 1, default: 0.5 },
    neck: { min: 0, max: 1, default: 0.5 },
    shoulders: { min: 0, max: 1, default: 0.5 },
    biceps: { min: 0, max: 1, default: 0.5 },
    forearm: { min: 0, max: 1, default: 0.5 },
    thigh: { min: 0, max: 1, default: 0.5 },
    calf: { min: 0, max: 1, default: 0.5 },
  };
}

/**
 * Export formats supported by OxiHuman
 */
export type ExportFormat = 'glb' | 'vrm' | 'stl' | 'obj';

/**
 * Get file extension for export format
 */
export function getExportExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    glb: '.glb',
    vrm: '.vrm',
    stl: '.stl',
    obj: '.obj',
  };
  return extensions[format];
}

/**
 * Get MIME type for export format
 */
export function getExportMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    glb: 'model/gltf-binary',
    vrm: 'model/vrm',
    stl: 'model/stl',
    obj: 'model/obj',
  };
  return mimeTypes[format];
}

// Utility functions
function normalize(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

function denormalize(normalized: number, min: number, max: number): number {
  return min + normalized * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
