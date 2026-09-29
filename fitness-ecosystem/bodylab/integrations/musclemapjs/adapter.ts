/**
 * MuscleMapJS Integration Adapter
 *
 * Maps BodyLab anthropometric scores to MuscleMapJS heatmap data.
 * Provides a clean interface between our domain logic and the external library.
 *
 * @module integrations/musclemapjs
 */

/**
 * Muscle groups that MuscleMapJS supports
 */
export type MuscleGroup =
  | 'abs'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'feet'
  | 'forearm'
  | 'gluteal'
  | 'hamstring'
  | 'hands'
  | 'head'
  | 'knees'
  | 'lower-back'
  | 'obliques'
  | 'quadriceps'
  | 'tibialis'
  | 'trapezius'
  | 'triceps'
  | 'upper-back'
  | 'rotator-cuff'
  | 'serratus'
  | 'rhomboids';

/**
 * Mapping from BodyLab measurement types to MuscleMapJS muscle groups
 */
export const MEASUREMENT_TO_MUSCLE: Record<string, MuscleGroup[]> = {
  chest: ['chest'],
  waist: ['abs', 'obliques'],
  hips: ['gluteal'],
  biceps: ['biceps'],
  forearm: ['forearm'],
  thigh: ['quadriceps', 'hamstring'],
  calf: ['calves'],
  neck: ['trapezius'],
  shoulders: ['deltoids'],
};

/**
 * Heatmap intensity entry for MuscleMapJS
 */
export interface MuscleIntensity {
  muscle: MuscleGroup;
  intensity: number; // 0.0 to 1.0
}

/**
 * Convert anthropometric score to heatmap intensity
 *
 * Score 0.0-1.0 → Intensity 0.0-1.0
 * But inverted: high score = good = low intensity (less "problematic")
 *
 * @param score - Anthropometric score (0-1, 1 = perfect)
 * @returns Heatmap intensity (0-1, 0 = perfect, 1 = needs attention)
 */
export function scoreToIntensity(score: number): number {
  // Invert: high score = low intensity (good)
  return Math.max(0, Math.min(1, 1 - score));
}

/**
 * Convert multiple measurement scores to heatmap data
 *
 * @param scores - Record of measurement type to score (0-1)
 * @returns Array of MuscleIntensity for MuscleMapJS
 */
export function scoresToHeatmap(scores: Record<string, number>): MuscleIntensity[] {
  const intensities: MuscleIntensity[] = [];

  for (const [measurementType, score] of Object.entries(scores)) {
    const muscles = MEASUREMENT_TO_MUSCLE[measurementType];
    if (!muscles) continue;

    const intensity = scoreToIntensity(score);

    for (const muscle of muscles) {
      intensities.push({ muscle, intensity });
    }
  }

  return intensities;
}

/**
 * Get color scale based on score
 *
 * @param score - Anthropometric score (0-1)
 * @returns CSS color string
 */
export function scoreToColor(score: number): string {
  if (score >= 0.90) return '#10B981'; // Emerald (optimal)
  if (score >= 0.70) return '#FBBF24'; // Yellow (near)
  if (score >= 0.40) return '#F97316'; // Orange (moderate)
  return '#EF4444'; // Red (significant)
}

/**
 * Get color scale name for MuscleMapJS based on use case
 */
export type ColorScale = 'workout' | 'thermal' | 'medical' | 'monochrome';

/**
 * Select appropriate color scale for BodyLab
 *
 * @param context - Use case context
 * @returns MuscleMapJS color scale name
 */
export function getColorScale(context: 'progress' | 'assessment' | 'comparison'): ColorScale {
  switch (context) {
    case 'progress':
      return 'workout';
    case 'assessment':
      return 'thermal';
    case 'comparison':
      return 'medical';
  }
}

/**
 * Muscle display names for tooltips (Spanish + English)
 */
export const MUSCLE_DISPLAY_NAMES: Record<MuscleGroup, { es: string; en: string }> = {
  abs: { es: 'Abdomen', en: 'Abs' },
  biceps: { es: 'Bíceps', en: 'Biceps' },
  calves: { es: 'Pantorrillas', en: 'Calves' },
  chest: { es: 'Pecho', en: 'Chest' },
  deltoids: { es: 'Deltoides', en: 'Deltoids' },
  feet: { es: 'Pies', en: 'Feet' },
  forearm: { es: 'Antebrazo', en: 'Forearm' },
  gluteal: { es: 'Glúteos', en: 'Glutes' },
  hamstring: { es: 'Isquiotibiales', en: 'Hamstrings' },
  hands: { es: 'Manos', en: 'Hands' },
  head: { es: 'Cabeza', en: 'Head' },
  knees: { es: 'Rodillas', en: 'Knees' },
  'lower-back': { es: 'Espalda baja', en: 'Lower Back' },
  obliques: { es: 'Oblicuos', en: 'Obliques' },
  quadriceps: { es: 'Cuádriceps', en: 'Quadriceps' },
  tibialis: { es: 'Tibial', en: 'Tibialis' },
  trapezius: { es: 'Trapecio', en: 'Trapezius' },
  triceps: { es: 'Tríceps', en: 'Triceps' },
  'upper-back': { es: 'Espalda alta', en: 'Upper Back' },
  'rotator-cuff': { es: 'Manguito rotador', en: 'Rotator Cuff' },
  serratus: { es: 'Serrato', en: 'Serratus' },
  rhomboids: { es: 'Romboides', en: 'Rhomboids' },
};

/**
 * Get display name for a muscle group
 */
export function getMuscleDisplayName(muscle: MuscleGroup, lang: 'es' | 'en' = 'es'): string {
  return MUSCLE_DISPLAY_NAMES[muscle]?.[lang] ?? muscle;
}
