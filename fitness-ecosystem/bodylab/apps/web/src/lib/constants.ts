/**
 * Constants & UI Configuration
 *
 * This file contains UI-specific constants: measurement type definitions,
 * color mappings, muscle groups, and reference profiles.
 *
 * MATH FUNCTIONS ARE NOT HERE — they live in @fitness/bodylab-anthropometry.
 * Import them from the core module to avoid duplication:
 *
 *   import { calculateMcCallum, calculateAdonisIndex, calculateWHtR, ... } from '@fitness/bodylab-anthropometry';
 *
 * @module lib/constants
 */

import type { MeasurementTypeInfo, ReferenceProfile, Measurement, SymmetryPair } from './types';

// Re-export core math functions as the single source of truth
// This ensures the web app uses the exact same formulas as core
export { calculateMcCallum, calculateAdonisIndex, classifyScore, scoreToColor } from '@fitness/bodylab-anthropometry';
export type { McCallumResult, VenusResult, AdonisResult, WHtRResult } from '@fitness/bodylab-anthropometry';
import { calculateVenus as coreCalculateVenus, calculateWHtR as coreCalculateWHtR, calculateScore as coreCalculateScore } from '@fitness/bodylab-anthropometry';

/** Backward-compatible alias — use calculateAdonisIndex in new code */
export { calculateAdonisIndex as calculateAdonis } from '@fitness/bodylab-anthropometry';

/**
 * Venus calculation — web wrapper.
 * Web passes heightCm, core expects height in meters.
 */
export function calculateVenus(heightCm: number, wrist: number) {
  const result = coreCalculateVenus(heightCm / 100, wrist);
  return {
    ...result,
    frameRatio: Math.round((heightCm / wrist) * 100) / 100,
  };
}

/**
 * WHtR calculation — web wrapper.
 * Web passes (waistCm, heightM), core expects (waistCm, heightM) — same signature.
 */
export function calculateWHtR(waistCm: number, heightM: number) {
  const result = coreCalculateWHtR(waistCm, heightM);
  return { ratio: result.ratio, status: result.status };
}

/**
 * Score calculation — web wrapper.
 * Web passes (actual, ideal), core calculates deviation internally.
 */
export function calculateScore(actual: number, ideal: number): number {
  if (ideal <= 0) return 0;
  const deviation = Math.abs(actual - ideal) / ideal;
  return coreCalculateScore(deviation);
}

// ============================================================================
// Measurement Types (UI Configuration)
// ============================================================================

export const MEASUREMENT_TYPES: MeasurementTypeInfo[] = [
  // Circumferences
  { id: 'wrist', label: { en: 'Wrist', es: 'Muñeca' }, unit: 'cm', min: 10, max: 30, category: 'circumference' },
  { id: 'neck', label: { en: 'Neck', es: 'Cuello' }, unit: 'cm', min: 25, max: 55, category: 'circumference' },
  { id: 'shoulders', label: { en: 'Shoulders', es: 'Hombros' }, unit: 'cm', min: 80, max: 180, category: 'circumference' },
  { id: 'chest', label: { en: 'Chest', es: 'Pecho' }, unit: 'cm', min: 60, max: 160, category: 'circumference' },
  { id: 'waist', label: { en: 'Waist', es: 'Cintura' }, unit: 'cm', min: 50, max: 160, category: 'circumference' },
  { id: 'hips', label: { en: 'Hips', es: 'Cadera' }, unit: 'cm', min: 60, max: 160, category: 'circumference' },
  { id: 'biceps', label: { en: 'Biceps', es: 'Bíceps' }, unit: 'cm', min: 20, max: 65, category: 'circumference' },
  { id: 'forearm', label: { en: 'Forearm', es: 'Antebrazo' }, unit: 'cm', min: 18, max: 50, category: 'circumference' },
  { id: 'thigh', label: { en: 'Thigh', es: 'Muslo' }, unit: 'cm', min: 35, max: 90, category: 'circumference' },
  { id: 'calf', label: { en: 'Calf', es: 'Pantorrilla' }, unit: 'cm', min: 25, max: 60, category: 'circumference' },
  // Bilateral (left/right) for symmetry
  { id: 'biceps_left', label: { en: 'Biceps L', es: 'Bíceps I' }, unit: 'cm', min: 20, max: 65, category: 'circumference' },
  { id: 'biceps_right', label: { en: 'Biceps R', es: 'Bíceps D' }, unit: 'cm', min: 20, max: 65, category: 'circumference' },
  { id: 'forearm_left', label: { en: 'Forearm L', es: 'Antebrazo I' }, unit: 'cm', min: 18, max: 50, category: 'circumference' },
  { id: 'forearm_right', label: { en: 'Forearm R', es: 'Antebrazo D' }, unit: 'cm', min: 18, max: 50, category: 'circumference' },
  { id: 'thigh_left', label: { en: 'Thigh L', es: 'Muslo I' }, unit: 'cm', min: 35, max: 90, category: 'circumference' },
  { id: 'thigh_right', label: { en: 'Thigh R', es: 'Muslo D' }, unit: 'cm', min: 35, max: 90, category: 'circumference' },
  { id: 'calf_left', label: { en: 'Calf L', es: 'Pantorrilla I' }, unit: 'cm', min: 25, max: 60, category: 'circumference' },
  { id: 'calf_right', label: { en: 'Calf R', es: 'Pantorrilla D' }, unit: 'cm', min: 25, max: 60, category: 'circumference' },
  { id: 'shoulders_left', label: { en: 'Shoulder L', es: 'Hombro I' }, unit: 'cm', min: 40, max: 90, category: 'circumference' },
  { id: 'shoulders_right', label: { en: 'Shoulder R', es: 'Hombro D' }, unit: 'cm', min: 40, max: 90, category: 'circumference' },
  // Girths the schema lacked — all of them tape-measurable (2026-10-05, owner
  // asked for "everything measurable with tape or household resources").
  { id: 'hip_upper', label: { en: 'High hip', es: 'Cadera alta' }, unit: 'cm', min: 60, max: 140, category: 'circumference' },
  { id: 'triceps', label: { en: 'Triceps', es: 'Tríceps' }, unit: 'cm', min: 15, max: 60, category: 'circumference' },
  { id: 'biceps_flexed', label: { en: 'Biceps flexed', es: 'Bíceps contraído' }, unit: 'cm', min: 20, max: 75, category: 'circumference' },
  { id: 'forearm_flexed', label: { en: 'Forearm flexed', es: 'Antebrazo contraído' }, unit: 'cm', min: 18, max: 55, category: 'circumference' },
  { id: 'mid_axillary', label: { en: 'Mid-axillary', es: 'Torso en axilas' }, unit: 'cm', min: 30, max: 120, category: 'circumference' },
  { id: 'ankle', label: { en: 'Ankle', es: 'Tobillo' }, unit: 'cm', min: 15, max: 45, category: 'circumference' },

  // Segment lengths — tape + wall/ruler. Every one of these feeds the parametric
  // body model that stands in for a 3D scanner (docs/ANTHROPOMETRY_MEASUREMENT_
  // PROTOCOL.md §4.5); a value entered here is a MEASUREMENT, never an estimate.
  { id: 'stature_sitting', label: { en: 'Sitting height', es: 'Estatura sentado' }, unit: 'cm', min: 40, max: 120, category: 'length' },
  { id: 'arm_span', label: { en: 'Arm span', es: 'Envergadura' }, unit: 'cm', min: 100, max: 240, category: 'length' },
  { id: 'subischial_leg_length', label: { en: 'Leg length (sacrotrochanteric)', es: 'Longitud de pierna' }, unit: 'cm', min: 50, max: 120, category: 'length' },
  { id: 'upper_arm_length', label: { en: 'Upper arm length', es: 'Longitud del brazo' }, unit: 'cm', min: 20, max: 60, category: 'length' },
  { id: 'forearm_length', label: { en: 'Forearm length', es: 'Longitud del antebrazo' }, unit: 'cm', min: 15, max: 55, category: 'length' },
  { id: 'hand_length', label: { en: 'Hand length', es: 'Longitud de la mano' }, unit: 'cm', min: 10, max: 35, category: 'length' },
  { id: 'thigh_length', label: { en: 'Thigh length', es: 'Longitud del muslo' }, unit: 'cm', min: 25, max: 75, category: 'length' },
  { id: 'lower_leg_length', label: { en: 'Lower leg length', es: 'Longitud de la pierna baja' }, unit: 'cm', min: 15, max: 65, category: 'length' },
  { id: 'foot_length', label: { en: 'Foot length', es: 'Longitud del pie' }, unit: 'cm', min: 15, max: 40, category: 'length' },

  // Bone breadths — a ruler and two books are enough; no caliper, no scanner.
  // They do not move with body fat, which is exactly why they anchor a model.
  { id: 'biacromial', label: { en: 'Shoulder breadth', es: 'Anchura de hombros' }, unit: 'cm', min: 25, max: 70, category: 'breadth' },
  { id: 'bi_iliac', label: { en: 'Hip breadth (iliac crest)', es: 'Anchura de cadera' }, unit: 'cm', min: 15, max: 45, category: 'breadth' },
  { id: 'wrist_breadth', label: { en: 'Wrist breadth', es: 'Anchura de muñeca' }, unit: 'cm', min: 3, max: 12, category: 'breadth' },
  { id: 'elbow_breadth', label: { en: 'Elbow breadth', es: 'Anchura de codo' }, unit: 'cm', min: 3, max: 14, category: 'breadth' },
  { id: 'knee_breadth', label: { en: 'Knee breadth', es: 'Anchura de rodilla' }, unit: 'cm', min: 5, max: 20, category: 'breadth' },
  { id: 'malleolar_breadth', label: { en: 'Ankle breadth', es: 'Anchura de tobillo' }, unit: 'cm', min: 3, max: 14, category: 'breadth' },
  { id: 'hand_width', label: { en: 'Hand width', es: 'Anchura de la mano' }, unit: 'cm', min: 4, max: 16, category: 'breadth' },
  // Body
  { id: 'weight', label: { en: 'Weight', es: 'Peso' }, unit: 'kg', min: 30, max: 250, category: 'composition' },
  // Composition
  { id: 'body_fat_percentage', label: { en: 'Body Fat %', es: '% Grasa Corporal' }, unit: '%', min: 3, max: 60, category: 'composition' },
  { id: 'lean_mass', label: { en: 'Lean Mass', es: 'Masa Muscular' }, unit: 'kg', min: 20, max: 120, category: 'composition' },
  { id: 'bone_mass', label: { en: 'Bone Mass', es: 'Masa Ósea' }, unit: 'kg', min: 1, max: 6, category: 'composition' },
  { id: 'water_percentage', label: { en: 'Water %', es: '% Agua' }, unit: '%', min: 30, max: 75, category: 'composition' },
  // Conditioning (field tests + measured conditioning inputs; norms in core)
  { id: 'cooper_12m_distance', label: { en: 'Cooper 12-min run', es: 'Test Cooper 12 min' }, unit: 'm', min: 300, max: 4000, category: 'conditioning' },
  { id: 'resting_heart_rate', label: { en: 'Resting heart rate', es: 'Frecuencia cardiaca en reposo' }, unit: 'bpm', min: 30, max: 220, category: 'conditioning' },
  { id: 'body_fat_measured', label: { en: 'Body fat % (measured)', es: '% Grasa real (medida)' }, unit: '%', min: 2, max: 70, category: 'conditioning' },
  { id: 'abdominal_skinfold', label: { en: 'Abdominal skinfold', es: 'Pliegue abdominal' }, unit: 'mm', min: 3, max: 80, category: 'conditioning' },
  { id: 'chest_skinfold', label: { en: 'Chest skinfold', es: 'Pliegue pectoral' }, unit: 'mm', min: 3, max: 80, category: 'conditioning' },
  { id: 'thigh_skinfold', label: { en: 'Thigh skinfold', es: 'Pliegue del muslo' }, unit: 'mm', min: 3, max: 80, category: 'conditioning' },
  { id: 'triceps_skinfold', label: { en: 'Triceps skinfold', es: 'Pliegue tricipital' }, unit: 'mm', min: 3, max: 80, category: 'conditioning' },
  { id: 'suprailiac_skinfold', label: { en: 'Suprailiac skinfold', es: 'Pliegue suprailiaco' }, unit: 'mm', min: 3, max: 80, category: 'conditioning' },
];

export const CIRCUMFERENCE_TYPES = MEASUREMENT_TYPES.filter(m => m.category === 'circumference');
export const LENGTH_TYPES = MEASUREMENT_TYPES.filter(m => m.category === 'length');
export const BREADTH_TYPES = MEASUREMENT_TYPES.filter(m => m.category === 'breadth');
export const COMPOSITION_TYPES = MEASUREMENT_TYPES.filter(m => m.category === 'composition');
export const CONDITIONING_TYPES = MEASUREMENT_TYPES.filter(m => m.category === 'conditioning');

// ============================================================================
// Score Colors (UI)
// ============================================================================

export const SCORE_COLORS = {
  optimal: { bg: '#10b981', text: '#ffffff', label: { en: 'Optimal', es: 'Óptimo' } },
  near: { bg: '#f59e0b', text: '#ffffff', label: { en: 'Near target', es: 'Cerca del objetivo' } },
  moderate: { bg: '#f97316', text: '#ffffff', label: { en: 'Moderate', es: 'Moderado' } },
  significant: { bg: '#ef4444', text: '#ffffff', label: { en: 'Needs attention', es: 'Requiere atención' } },
};

export const WHTR_COLORS = {
  healthy: { bg: '#10b981', label: { en: 'Healthy', es: 'Saludable' } },
  elevated: { bg: '#f59e0b', label: { en: 'Elevated', es: 'Elevado' } },
  high_risk: { bg: '#ef4444', label: { en: 'High risk', es: 'Alto riesgo' } },
};

// ============================================================================
// Muscle Groups (for 2D mapping)
// ============================================================================

export interface MuscleGroup {
  id: string;
  name: { en: string; es: string };
  measurementType: string;
  isProxy?: boolean;
  proxyExplanation?: { en: string; es: string };
  svgPath?: string;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  { id: 'chest', name: { en: 'Chest', es: 'Pecho' }, measurementType: 'chest' },
  { id: 'abs', name: { en: 'Abs', es: 'Abdomen' }, measurementType: 'waist' },
  { id: 'obliques', name: { en: 'Obliques', es: 'Oblicuos' }, measurementType: 'waist' },
  { id: 'biceps', name: { en: 'Biceps', es: 'Bíceps' }, measurementType: 'biceps' },
  { id: 'triceps', name: { en: 'Triceps', es: 'Tríceps' }, measurementType: 'biceps' },
  { id: 'deltoids', name: { en: 'Deltoids', es: 'Deltoides' }, measurementType: 'shoulders' },
  { id: 'quadriceps', name: { en: 'Quadriceps', es: 'Cuádriceps' }, measurementType: 'thigh' },
  { id: 'hamstrings', name: { en: 'Hamstrings', es: 'Isquiotibiales' }, measurementType: 'thigh' },
  { id: 'calves', name: { en: 'Calves', es: 'Pantorrillas' }, measurementType: 'calf' },
  { id: 'forearms', name: { en: 'Forearms', es: 'Antebrazos' }, measurementType: 'forearm' },
  { id: 'glutes', name: { en: 'Glutes', es: 'Glúteos' }, measurementType: 'hips', isProxy: true,
    proxyExplanation: { en: 'Estimated from hip circumference.', es: 'Estimado a partir de la circunferencia de caderas.' } },
  { id: 'traps', name: { en: 'Traps', es: 'Trapecios' }, measurementType: 'neck', isProxy: true,
    proxyExplanation: { en: 'Estimated from neck circumference.', es: 'Estimado a partir de la circunferencia del cuello.' } },
  { id: 'lats', name: { en: 'Lats', es: 'Dorsales' }, measurementType: 'chest', isProxy: true,
    proxyExplanation: { en: 'Estimated from chest/waist ratio (V-taper).', es: 'Estimado a partir del ratio pecho/cintura (V-taper).' } },
  { id: 'lower_back', name: { en: 'Lower Back', es: 'Espalda Baja' }, measurementType: 'waist', isProxy: true,
    proxyExplanation: { en: 'Estimated from waist measurement.', es: 'Estimado a partir de la medición de cintura.' } },
  { id: 'pectoralis_minor', name: { en: 'Pectoralis Minor', es: 'Pectoral Menor' }, measurementType: 'chest', isProxy: true,
    proxyExplanation: { en: 'Estimated from chest measurement (deep layer under the pectoralis major).', es: 'Estimado a partir de la medición de pecho (capa profunda bajo el pectoral mayor).' } },
  { id: 'serratus_anterior', name: { en: 'Serratus Anterior', es: 'Serrato Anterior' }, measurementType: 'chest', isProxy: true,
    proxyExplanation: { en: 'Estimated from chest measurement (ribcage serrations).', es: 'Estimado a partir de la medición de pecho (sierras de la caja torácica).' } },
  { id: 'rhomboids', name: { en: 'Rhomboids', es: 'Romboides' }, measurementType: 'shoulders', isProxy: true,
    proxyExplanation: { en: 'Estimated from shoulder measurement (posture/scapular retraction).', es: 'Estimado a partir de la medición de hombros (postura/retracción escapular).' } },
  { id: 'soleus', name: { en: 'Soleus', es: 'Sóleo' }, measurementType: 'calf', isProxy: true,
    proxyExplanation: { en: 'Estimated from calf circumference (deep muscle beneath the gastrocnemius).', es: 'Estimado a partir de la circunferencia de pantorrilla (músculo profundo bajo el gastrocnemio).' } },
  { id: 'iliopsoas', name: { en: 'Iliopsoas', es: 'Iliopsoas' }, measurementType: 'waist', isProxy: true,
    proxyExplanation: { en: 'Estimated from waist/hip relationship (hip flexor, core stability).', es: 'Estimado a partir de la relación cintura/cadera (flexor de cadera, estabilidad del core).' } },
];

// ============================================================================
// Score helpers (thin wrappers around core)
// ============================================================================

/**
 * Get score status classification.
 * Wraps core classifyScore() for backward compatibility.
 */
export function getScoreStatus(score: number): 'optimal' | 'near' | 'moderate' | 'significant' {
  if (score >= 0.90) return 'optimal';
  if (score >= 0.70) return 'near';
  if (score >= 0.40) return 'moderate';
  return 'significant';
}

// ============================================================================
// Reference Profiles
// ============================================================================

export const BUILT_IN_REFERENCES: ReferenceProfile[] = [
  {
    id: 'mccallum_recreational',
    name: { en: 'McCallum Recreational', es: 'McCallum Recreativo' },
    description: { en: 'Classic McCallum proportions for recreational fitness', es: 'Proporciones clásicas de McCallum para fitness recreativo' },
    category: 'anthropometric',
    source: 'John McCallum',
    biologicalSex: 'male',
    measurements: [
      { type: 'chest_to_wrist', value: 6.5 },
      { type: 'waist_to_chest', value: 0.70 },
      { type: 'hips_to_chest', value: 0.85 },
      { type: 'biceps_to_chest', value: 0.36 },
      { type: 'thigh_to_chest', value: 0.53 },
      { type: 'neck_to_chest', value: 0.37 },
      { type: 'calf_to_chest', value: 0.34 },
      { type: 'forearm_to_chest', value: 0.29 },
    ],
    version: '1.0.0',
  },
  {
    id: 'venus_recreational',
    name: { en: 'Venus Recreational', es: 'Venus Recreativo' },
    description: { en: 'Venus Index proportions for recreational fitness', es: 'Proporciones del Índice Venus para fitness recreativo' },
    category: 'anthropometric',
    source: 'Venus Index',
    biologicalSex: 'female',
    measurements: [
      { type: 'waist_to_height', value: 0.38 },
      { type: 'hips_to_height', value: 0.5396 },
      { type: 'bust_to_height', value: 0.513 },
      { type: 'shoulders_to_height', value: 0.61484 },
    ],
    version: '1.0.0',
  },
  {
    id: 'health_whtr',
    name: { en: 'Healthy WHtR', es: 'WHtR Saludable' },
    description: { en: 'Waist-to-height ratio within healthy range', es: 'Relación cintura-estatura en rango saludable' },
    category: 'health',
    source: 'WHO / NICE',
    biologicalSex: 'both',
    measurements: [
      { type: 'whtr', value: 0.50, range: { min: 0, max: 0.50 } },
    ],
    version: '1.0.0',
  },
];

// ============================================================================
// Unit Conversion
// ============================================================================

export function cmToInches(cm: number): number {
  return Math.round(cm * 0.393701 * 100) / 100;
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 100) / 100;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 100) / 100;
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 100) / 100;
}

export function metersToFeetInches(m: number): string {
  const totalInches = m * 39.3701;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// ============================================================================
// Computed Proxy Metrics
// ============================================================================

export interface ProxyMetric {
  id: string;
  name: { en: string; es: string };
  value: number | null;
  unit: string;
  description: { en: string; es: string };
  status: 'good' | 'average' | 'needs_work' | 'unknown';
  sourceMeasurements: string[];
}

export function computeProxyMetrics(
  measurements: Measurement[],
): ProxyMetric[] {
  // Use getLatestMeasurement-style lookup for consistency
  const getLatest = (type: string): number | null => {
    for (let i = measurements.length - 1; i >= 0; i--) {
      if (measurements[i].type === type) return measurements[i].value;
    }
    return null;
  };

  const chest = getLatest('chest');
  const waist = getLatest('waist');
  const hips = getLatest('hips');
  const neck = getLatest('neck');
  const shoulders = getLatest('shoulders');
  const biceps = getLatest('biceps');
  const wrist = getLatest('wrist');
  const thigh = getLatest('thigh');
  const calf = getLatest('calf');

  const metrics: ProxyMetric[] = [];

  if (chest && waist && waist > 0) {
    const ratio = chest / waist;
    let status: ProxyMetric['status'] = 'average';
    if (ratio >= 1.3) status = 'good';
    else if (ratio < 1.1) status = 'needs_work';
    metrics.push({
      id: 'v_taper',
      name: { en: 'V-Taper Ratio', es: 'Ratio V-Taper' },
      value: Math.round(ratio * 100) / 100,
      unit: ':1',
      description: { en: 'Chest ÷ Waist. Higher = more V-shape from lats.', es: 'Pecho ÷ Cintura. Mayor = más forma V de dorsales.' },
      status,
      sourceMeasurements: ['chest', 'waist'],
    });
  }

  if (shoulders && waist && waist > 0) {
    const ratio = shoulders / waist;
    let status: ProxyMetric['status'] = 'average';
    if (ratio >= 1.5) status = 'good';
    else if (ratio < 1.2) status = 'needs_work';
    metrics.push({
      id: 'adonis',
      name: { en: 'Adonis Index', es: 'Índice Adonis' },
      value: Math.round(ratio * 100) / 100,
      unit: ':1',
      description: { en: 'Shoulders ÷ Waist. Golden ratio ≈ 1.618.', es: 'Hombros ÷ Cintura. Proporción áurea ≈ 1.618.' },
      status,
      sourceMeasurements: ['shoulders', 'waist'],
    });
  }

  if (neck && shoulders && shoulders > 0) {
    const ratio = neck / shoulders;
    let status: ProxyMetric['status'] = 'average';
    if (ratio >= 0.35) status = 'good';
    else if (ratio < 0.28) status = 'needs_work';
    metrics.push({
      id: 'neck_shoulder',
      name: { en: 'Neck/Shoulder Ratio', es: 'Ratio Cuello/Hombro' },
      value: Math.round(ratio * 100) / 100,
      unit: ':1',
      description: { en: 'Neck ÷ Shoulders. Higher = thicker traps.', es: 'Cuello ÷ Hombros. Mayor = trapecios más gruesos.' },
      status,
      sourceMeasurements: ['neck', 'shoulders'],
    });
  }

  if (hips && waist && waist > 0) {
    const ratio = hips / waist;
    let status: ProxyMetric['status'] = 'average';
    if (ratio >= 1.15) status = 'good';
    else if (ratio < 1.0) status = 'needs_work';
    metrics.push({
      id: 'glute_waist',
      name: { en: 'Hip/Waist Ratio', es: 'Ratio Cadera/Cintura' },
      value: Math.round(ratio * 100) / 100,
      unit: ':1',
      description: { en: 'Hips ÷ Waist. Higher = more glute development.', es: 'Caderas ÷ Cintura. Mayor = más desarrollo glúteo.' },
      status,
      sourceMeasurements: ['hips', 'waist'],
    });
  }

  if (thigh && calf && calf > 0) {
    const ratio = thigh / calf;
    let status: ProxyMetric['status'] = 'average';
    if (ratio >= 1.4 && ratio <= 1.6) status = 'good';
    else if (ratio > 1.8 || ratio < 1.2) status = 'needs_work';
    metrics.push({
      id: 'leg_proportion',
      name: { en: 'Thigh/Calf Ratio', es: 'Ratio Muslo/Pantorrilla' },
      value: Math.round(ratio * 100) / 100,
      unit: ':1',
      description: { en: 'Thigh ÷ Calf. Ideal ≈ 1.5 for balanced legs.', es: 'Muslo ÷ Pantorrilla. Ideal ≈ 1.5 para piernas balanceadas.' },
      status,
      sourceMeasurements: ['thigh', 'calf'],
    });
  }

  if (biceps && wrist && wrist > 0) {
    const ratio = biceps / wrist;
    let status: ProxyMetric['status'] = 'average';
    if (ratio >= 2.0) status = 'good';
    else if (ratio < 1.7) status = 'needs_work';
    metrics.push({
      id: 'arm_frame',
      name: { en: 'Arm/Frame Ratio', es: 'Ratio Brazo/Marco' },
      value: Math.round(ratio * 100) / 100,
      unit: ':1',
      description: { en: 'Biceps ÷ Wrist. Muscle mass relative to skeletal frame.', es: 'Bíceps ÷ Muñeca. Masa muscular relativa al marco esquelético.' },
      status,
      sourceMeasurements: ['biceps', 'wrist'],
    });
  }

  return metrics;
}

// ============================================================================
// Symmetry Calculation
// ============================================================================

export const SYMMETRY_PAIRS: { group: string; leftType: string; rightType: string }[] = [
  { group: 'biceps', leftType: 'biceps_left', rightType: 'biceps_right' },
  { group: 'forearm', leftType: 'forearm_left', rightType: 'forearm_right' },
  { group: 'thigh', leftType: 'thigh_left', rightType: 'thigh_right' },
  { group: 'calf', leftType: 'calf_left', rightType: 'calf_right' },
  { group: 'shoulders', leftType: 'shoulders_left', rightType: 'shoulders_right' },
];

export const SYMMETRY_GROUP_NAMES: Record<string, { en: string; es: string }> = {
  biceps: { en: 'Biceps', es: 'Bíceps' },
  forearm: { en: 'Forearm', es: 'Antebrazo' },
  thigh: { en: 'Thigh', es: 'Muslo' },
  calf: { en: 'Calf', es: 'Pantorrilla' },
  shoulders: { en: 'Shoulder', es: 'Hombro' },
};

export function calculateSymmetry(
  measurements: Measurement[],
  referenceIdeal?: number
): SymmetryPair[] {
  return SYMMETRY_PAIRS.map(pair => {
    const left = measurements.find(m => m.type === pair.leftType) ?? null;
    const right = measurements.find(m => m.type === pair.rightType) ?? null;
    
    const leftVal = left?.value ?? 0;
    const rightVal = right?.value ?? 0;
    
    const leftScore = referenceIdeal ? calculateScoreFromCore(leftVal, referenceIdeal) : 0.5;
    const rightScore = referenceIdeal ? calculateScoreFromCore(rightVal, referenceIdeal) : 0.5;
    
    const difference = Math.abs(leftVal - rightVal);
    const avg = (leftVal + rightVal) / 2;
    const percentDiff = avg > 0 ? (difference / avg) * 100 : 0;
    const symmetryScore = Math.max(0, 1 - (percentDiff / 10));
    
    let status: 'balanced' | 'mild' | 'significant';
    if (percentDiff <= 5) status = 'balanced';
    else if (percentDiff <= 15) status = 'mild';
    else status = 'significant';
    
    return {
      muscleGroup: pair.group,
      left,
      right,
      leftScore,
      rightScore,
      difference: Math.round(difference * 100) / 100,
      percentDiff: Math.round(percentDiff * 10) / 10,
      symmetryScore: Math.round(symmetryScore * 100) / 100,
      status,
    };
  });
}

// Internal helper — avoids circular import with core
function calculateScoreFromCore(actual: number, ideal: number): number {
  if (ideal <= 0) return 0;
  const deviation = Math.abs(actual - ideal) / ideal;
  return Math.max(0, Math.min(1, 1 - 4.0 * deviation));
}
