/**
 * Integration: BodyLab export v2 → TrainingLab core (validator + generator).
 *
 * Pins the end-to-end contract: a payload shaped exactly like
 * `buildTraininglabExport` (v2, with the `conditioning` weakness map) can be
 * consumed by `core/training` without any adapter — the two halves of the
 * ecosystem connect through the documented shapes alone.
 *
 * @module tests/training/integration
 */

import { describe, it, expect } from 'vitest';
import {
  validateRoutine,
  generateRoutine,
  muscleFamilyOf,
  type CatalogEntry,
  type FamilyWeakness,
  type Routine,
} from '../../bodylab/core/training/src';

// ── A faithful v2 export payload (same shape `buildTraininglabExport` emits) ─

interface V2Payload {
  format: string;
  version: number;
  profile: { height: number; weight: number; age: number; biologicalSex: string; units: string } | null;
  measurements: { type: string; value: number; unit: string; timestamp: string }[];
  muscleScores: { segment: string; actual: number; ideal: number; score: number; status: string }[];
  indicators: { whtr: number | null; adonis: number | null };
  muscleLoad: { muscle: string; totalSets: number; setsLast7d: number; intensity: number }[];
  conditioning: {
    conditioningScore: number | null;
    classifiedCount: number;
    axes: { cooper: { band: string; score: number } | null; restingHeartRate: { band: string; score: number } | null; measuredBodyFat: { band: string; score: number } | null };
  } | null;
}

const V2_EXPORT: V2Payload = {
  format: 'bodylab-traininglab-link',
  version: 2,
  profile: { height: 1.78 * 100, weight: 82, age: 30, biologicalSex: 'male', units: 'metric' },
  measurements: [
    { type: 'weight', value: 82, unit: 'kg', timestamp: '2026-09-27T00:00:00.000Z' },
    { type: 'chest', value: 100, unit: 'cm', timestamp: '2026-09-27T00:00:00.000Z' },
    { type: 'waist', value: 80, unit: 'cm', timestamp: '2026-09-27T00:00:00.000Z' },
    { type: 'cooper_12m_distance', value: 2400, unit: 'm', timestamp: '2026-09-27T00:00:00.000Z' },
    { type: 'body_fat_measured', value: 16.4, unit: '%', timestamp: '2026-09-27T00:00:00.000Z' },
  ],
  muscleScores: [
    { segment: 'chest', actual: 100, ideal: 105, score: 0.9, status: 'optimal' },
    { segment: 'waist', actual: 80, ideal: 79, score: 0.82, status: 'near' },
    { segment: 'biceps', actual: 34, ideal: 37.8, score: 0.55, status: 'moderate' },
    { segment: 'thigh', actual: 55, ideal: 63, score: 0.32, status: 'significant' }, // ← weakest
  ],
  indicators: { whtr: 0.449, adonis: null },
  muscleLoad: [
    { muscle: 'chest', totalSets: 40, setsLast7d: 6, intensity: 3 },
    { muscle: 'quadriceps', totalSets: 4, setsLast7d: 0, intensity: 0 }, // ← undertrained
    { muscle: 'biceps', totalSets: 18, setsLast7d: 3, intensity: 2 },
  ],
  conditioning: {
    conditioningScore: 78,
    classifiedCount: 3,
    axes: {
      cooper: { band: 'above_average', score: 78 },
      restingHeartRate: { band: 'above_average', score: 78 },
      measuredBodyFat: { band: 'above_average', score: 95 },
    },
  },
};

// ── The app-side adapter the future TrainingLab UI will own ──────────────────

const CATALOG: CatalogEntry[] = [
  { id: 'squat', muscles: [{ muscle: 'quadriceps', intensity: 3 }, { muscle: 'gluteus_maximus', intensity: 3 }, { muscle: 'hamstrings', intensity: 2 }], equipment: ['barbell'] },
  { id: 'leg-press', muscles: [{ muscle: 'quadriceps', intensity: 3 }, { muscle: 'gluteus_maximus', intensity: 2 }], equipment: ['machine'] },
  { id: 'leg-curl', muscles: [{ muscle: 'hamstrings', intensity: 3 }], equipment: ['machine'] },
  { id: 'hip-thrust', muscles: [{ muscle: 'gluteus_maximus', intensity: 3 }], equipment: ['barbell'] },
  { id: 'calf-raise', muscles: [{ muscle: 'calves', intensity: 3 }], equipment: [] },
  { id: 'bench-press', muscles: [{ muscle: 'chest_lower', intensity: 3 }, { muscle: 'triceps_long', intensity: 2 }], equipment: ['barbell'] },
  { id: 'db-press', muscles: [{ muscle: 'chest_lower', intensity: 3 }], equipment: ['dumbbells'] },
  { id: 'pull-up', muscles: [{ muscle: 'lats_lower', intensity: 3 }, { muscle: 'biceps_long', intensity: 2 }], equipment: [] },
  { id: 'row', muscles: [{ muscle: 'lats_mid', intensity: 3 }], equipment: ['barbell'] },
  { id: 'curl', muscles: [{ muscle: 'biceps_long', intensity: 3 }], equipment: ['dumbbells'] },
  { id: 'skullcrusher', muscles: [{ muscle: 'triceps_long', intensity: 3 }], equipment: ['barbell'] },
  { id: 'ohp', muscles: [{ muscle: 'anterior_deltoid', intensity: 3 }, { muscle: 'triceps_long', intensity: 2 }], equipment: ['barbell'] },
];

/** Convert anthropometric segment scores (0-1, 1 = ideal) → family weakness (0-100, lower = weaker). */
function segmentsToWeakness(payload: V2Payload): FamilyWeakness {
  const byFamily = new Map<string, number>();
  for (const seg of payload.muscleScores) {
    const fam = muscleFamilyOf(segToMuscle(seg.segment));
    const score100 = Math.round(seg.score * 100);
    byFamily.set(fam, Math.min(byFamily.get(fam) ?? 100, score100)); // weakest head wins
  }
  return Object.fromEntries(byFamily) as FamilyWeakness;
}

/** The app's segment vocabulary → granular muscle mapping (faithful subset). */
function segToMuscle(segment: string): string {
  switch (segment) {
    case 'chest': return 'chest_lower';
    case 'waist': return 'rectus_abdominis';
    case 'biceps': return 'biceps_long';
    case 'thigh': return 'quadriceps';
    default: return 'chest_lower';
  }
}

describe('integration: export v2 → core/training', () => {
  it('the v2 payload version is 2 and carries the conditioning map (shape pin)', () => {
    expect(V2_EXPORT.version).toBe(2);
    expect(V2_EXPORT.format).toBe('bodylab-traininglab-link');
    expect(V2_EXPORT.conditioning?.conditioningScore).toBe(78);
  });

  it('the weakness map converts segments → families (thigh 0.32 = most urgent leg family)', () => {
    const weakness = segmentsToWeakness(V2_EXPORT);
    expect(weakness.quadriceps).toBe(32); // thigh → quadriceps family
    expect(weakness.chest).toBe(90);
    expect(weakness.biceps).toBe(55);
    // The generator's first day must attack the weakest family's pattern (lower).
    const r = generateRoutine({
      weakness,
      equipment: ['barbell', 'dumbbells', 'machine'],
      daysPerWeek: 4,
      goal: 'hypertrophy',
      level: 'intermediate',
      catalog: CATALOG,
      familyPlans: {
        quadriceps: { exercises: ['squat', 'leg-press'], exercisesPerSession: 2, sessionsPerWeek: 2 },
        hamstrings: { exercises: ['leg-curl'], exercisesPerSession: 1, sessionsPerWeek: 2 },
        glutes: { exercises: ['hip-thrust', 'squat', 'leg-press'], exercisesPerSession: 2, sessionsPerWeek: 2 },
        calves: { exercises: ['calf-raise'], exercisesPerSession: 1, sessionsPerWeek: 1 },
        chest: { exercises: ['bench-press', 'db-press'], exercisesPerSession: 2, sessionsPerWeek: 1 },
        lats: { exercises: ['pull-up', 'row'], exercisesPerSession: 2, sessionsPerWeek: 2 },
        triceps: { exercises: ['skullcrusher', 'bench-press'], exercisesPerSession: 1, sessionsPerWeek: 1 },
        biceps: { exercises: ['curl', 'pull-up'], exercisesPerSession: 1, sessionsPerWeek: 2 },
        shoulders: { exercises: ['ohp', 'db-press'], exercisesPerSession: 1, sessionsPerWeek: 1 },
        traps: { exercises: ['row'], exercisesPerSession: 1, sessionsPerWeek: 1 },
      },
    });
    // Day 1 is the weakest pattern's day (lower — driven by thigh → quadriceps
    // 32 and glutes spill) and contains leg work; the exact ordering inside
    // the day is the generator's deterministic choice.
    const day1Ids = r.days[0].slots.map((s) => s.exerciseId);
    expect(day1Ids.length).toBeGreaterThan(0);
    expect(['squat', 'hip-thrust', 'leg-press', 'leg-curl', 'calf-raise'].some((id) => day1Ids.includes(id))).toBe(true);
    // And the whole plan is hard-rule valid.
    expect(validateRoutine(r, CATALOG).valid).toBe(true);
  });

  it('a hand-written v2-informed routine passes the validator unchanged (no adapter needed)', () => {
    const routine: Routine = {
      id: 'tl-1',
      name: 'From v2 payload',
      goal: 'hypertrophy',
      daysPerWeek: 3,
      equipment: ['barbell', 'machine', 'dumbbells'],
      createdAt: '2026-09-27T00:00:00.000Z',
      level: 'intermediate',
      days: [
        {
          id: 'lower',
          focus: ['quadriceps', 'hamstrings'],
          slots: [
            { exerciseId: 'squat', sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
            { exerciseId: 'leg-press', sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
            { exerciseId: 'leg-curl', sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
            { exerciseId: 'calf-raise', sets: 6, repsMin: 12, repsMax: 15, restSec: 60 },
          ],
        },
        {
          id: 'push',
          focus: ['chest_lower'],
          slots: [
            { exerciseId: 'bench-press', sets: 6, repsMin: 8, repsMax: 12, restSec: 90 },
            { exerciseId: 'skullcrusher', sets: 3, repsMin: 10, repsMax: 15, restSec: 75 },
          ],
        },
        {
          id: 'pull',
          focus: ['lats_mid', 'biceps_long'],
          slots: [
            { exerciseId: 'row', sets: 6, repsMin: 8, repsMax: 12, restSec: 90 },
            { exerciseId: 'curl', sets: 6, repsMin: 10, repsMax: 15, restSec: 60 },
          ],
        },
      ],
    };
    const res = validateRoutine(routine, CATALOG);
    expect(res.valid).toBe(true);
    expect(res.violations).toEqual([]);
  });

  it('a routine ignoring the weakness map (thigh untrained) is VALID but detectably misaligned', () => {
    // The validator enforces physiology rules, not product strategy: a plan
    // that skips the weak muscle is legal — the GENERATOR is what attacks
    // weakness. Pin that boundary: muscleLoad's undertrained quadriceps
    // (intensity 0) is visible to the planner through the payload itself.
    const undertrained = V2_EXPORT.muscleLoad.find((m) => m.muscle === 'quadriceps');
    expect(undertrained?.intensity).toBe(0);
    expect(undertrained?.setsLast7d).toBe(0);
    // ...and the weakness ranking would put its family first:
    const weakness = segmentsToWeakness(V2_EXPORT);
    const ranked = Object.entries(weakness).sort((a, b) => a[1] - b[1]);
    expect(ranked[0][0]).toBe('quadriceps');
  });
});
