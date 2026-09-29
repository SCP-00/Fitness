/**
 * Metric configuration shared by the progress timeline, current-values panel
 * and snapshot comparison.
 *
 * Kept separate from ProgressTimeline.tsx so that component file only exports
 * components (required for React Fast Refresh).
 */

export interface TimelineMetricConfig {
  label: { en: string; es: string };
  unit: string;
  color: string;
  /** True when the value is an ESTIMATE (e.g. Navy tape %BF, SEE ±3.5%) — surfaced as a visual hint. */
  estimate?: boolean;
}

export const METRIC_CONFIG: Record<string, TimelineMetricConfig> = {
  chest: { label: { en: 'Chest', es: 'Pecho' }, unit: 'cm', color: '#3b82f6' },
  waist: { label: { en: 'Waist', es: 'Cintura' }, unit: 'cm', color: '#10b981' },
  hips: { label: { en: 'Hips', es: 'Cadera' }, unit: 'cm', color: '#8b5cf6' },
  biceps: { label: { en: 'Biceps', es: 'Bíceps' }, unit: 'cm', color: '#f59e0b' },
  forearm: { label: { en: 'Forearm', es: 'Antebrazo' }, unit: 'cm', color: '#06b6d4' },
  thigh: { label: { en: 'Thigh', es: 'Muslo' }, unit: 'cm', color: '#ef4444' },
  calf: { label: { en: 'Calf', es: 'Pantorrilla' }, unit: 'cm', color: '#ec4899' },
  neck: { label: { en: 'Neck', es: 'Cuello' }, unit: 'cm', color: '#6366f1' },
  shoulders: { label: { en: 'Shoulders', es: 'Hombros' }, unit: 'cm', color: '#14b8a6' },
  wrist: { label: { en: 'Wrist', es: 'Muñeca' }, unit: 'cm', color: '#a855f7' },
  // Conditioning — measured %BF (incl. Navy tape estimates, flagged low-confidence)
  body_fat_measured: { label: { en: 'Body fat % (measured)', es: '% Grasa real' }, unit: '%', color: '#e11d48', estimate: true },
};

export const COMPOSITION_CONFIG: Record<string, TimelineMetricConfig> = {
  body_fat_percentage: { label: { en: 'Body Fat %', es: '% Grasa' }, unit: '%', color: '#f97316' },
  lean_mass: { label: { en: 'Lean Mass', es: 'Masa Muscular' }, unit: 'kg', color: '#22c55e' },
  bone_mass: { label: { en: 'Bone Mass', es: 'Masa Ósea' }, unit: 'kg', color: '#78716c' },
  water_percentage: { label: { en: 'Water %', es: '% Agua' }, unit: '%', color: '#0ea5e9' },
};
