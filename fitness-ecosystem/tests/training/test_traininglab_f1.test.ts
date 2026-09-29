/**
 * TrainingLab F1 — the app-side adapter (`traininglab/apps/desktop/src/lib/adapter.ts`).
 *
 * Pins the F1 contract end-to-end: a faithful v2 export payload → weakness
 * fusion → deterministic generator → hard-rule validator, plus the equipment
 * gating, display conversion and load-suggestion glue the Today screen uses.
 * Runs in the ROOT vitest project (same aliases as the core tests).
 *
 * @module tests/training/f1_adapter
 */

import { describe, it, expect } from 'vitest';
import {
  isV2Payload,
  exerciseIsUsable,
  generateFromImport,
  toPlannedDays,
  suggestLoad,
  type ImportPayload,
} from '../../traininglab/apps/desktop/src/lib/adapter';
import { validateRoutine, type CatalogEntry } from '../../bodylab/core/training/src';

// ── A faithful v2 export payload (mirrors buildTraininglabExport output) ────

const PAYLOAD: ImportPayload = {
  format: 'bodylab-traininglab-link',
  version: 2,
  profile: { height: 178, weight: 82, age: 30, biologicalSex: 'male', units: 'metric' },
  measurements: [
    { type: 'weight', value: 82, unit: 'kg', timestamp: '2026-09-27T00:00:00.000Z' },
    { type: 'chest', value: 100, unit: 'cm', timestamp: '2026-09-27T00:00:00.000Z' },
    { type: 'waist', value: 80, unit: 'cm', timestamp: '2026-09-27T00:00:00.000Z' },
  ],
  muscleScores: [
    { segment: 'chest', score: 0.9 },
    { segment: 'waist', score: 0.82 },
    { segment: 'biceps', score: 0.55 },
    { segment: 'thigh', score: 0.32 }, // ← weakest anthropometric family
  ],
  muscleLoad: [
    { muscle: 'chest', totalSets: 40, setsLast7d: 6, intensity: 3 },
    { muscle: 'quadriceps', totalSets: 4, setsLast7d: 0, intensity: 0 }, // ← undertrained
    { muscle: 'biceps', totalSets: 18, setsLast7d: 3, intensity: 2 },
  ],
  exerciseCatalog: [
    // Lower
    { id: 'barbell-squat', name: 'Barbell Back Squat', equipment: 'Barbell + Squat Rack', muscles: [{ muscle: 'quadriceps', intensity: 3 }, { muscle: 'gluteus_maximus', intensity: 3 }, { muscle: 'hamstrings', intensity: 2 }, { muscle: 'adductors', intensity: 2 }, { muscle: 'erector_spinae', intensity: 2 }] },
    { id: 'leg-press', name: 'Leg Press', equipment: 'Leg Press Machine', muscles: [{ muscle: 'quadriceps', intensity: 3 }, { muscle: 'gluteus_maximus', intensity: 2 }, { muscle: 'adductors', intensity: 1 }] },
    { id: 'leg-curl', name: 'Lying Leg Curl', equipment: 'Leg Curl Machine', muscles: [{ muscle: 'hamstrings', intensity: 3 }, { muscle: 'calves', intensity: 1 }] },
    { id: 'romanian-deadlift', name: 'Romanian Deadlift', equipment: 'Barbell', muscles: [{ muscle: 'hamstrings', intensity: 3 }, { muscle: 'gluteus_maximus', intensity: 3 }, { muscle: 'erector_spinae', intensity: 2 }] },
    { id: 'hip-thrust', name: 'Barbell Hip Thrust', equipment: 'Barbell + Bench', muscles: [{ muscle: 'gluteus_maximus', intensity: 3 }, { muscle: 'hamstrings', intensity: 2 }, { muscle: 'adductors', intensity: 1 }] },
    { id: 'calf-raises', name: 'Standing Calf Raises', equipment: 'Calf Raise Machine', muscles: [{ muscle: 'calves', intensity: 3 }, { muscle: 'tibialis_anterior', intensity: 1 }] },
    // Push
    { id: 'barbell-bench-press', name: 'Barbell Bench Press', equipment: 'Barbell + Flat Bench', muscles: [{ muscle: 'chest_upper', intensity: 3 }, { muscle: 'chest_lower', intensity: 3 }, { muscle: 'anterior_deltoid', intensity: 2 }, { muscle: 'triceps_long', intensity: 2 }, { muscle: 'triceps_lateral', intensity: 2 }] },
    { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', equipment: 'Dumbbells + Flat Bench', muscles: [{ muscle: 'chest_upper', intensity: 3 }, { muscle: 'chest_lower', intensity: 3 }, { muscle: 'anterior_deltoid', intensity: 2 }, { muscle: 'triceps_long', intensity: 2 }] },
    { id: 'push-ups', name: 'Push-ups', equipment: 'Bodyweight', muscles: [{ muscle: 'chest_upper', intensity: 3 }, { muscle: 'chest_lower', intensity: 3 }, { muscle: 'anterior_deltoid', intensity: 2 }, { muscle: 'triceps_long', intensity: 2 }] },
    { id: 'overhead-press', name: 'Overhead Press', equipment: 'Barbell', muscles: [{ muscle: 'anterior_deltoid', intensity: 3 }, { muscle: 'lateral_deltoid', intensity: 2 }, { muscle: 'triceps_long', intensity: 2 }, { muscle: 'triceps_lateral', intensity: 2 }, { muscle: 'traps_upper', intensity: 1 }] },
    { id: 'lateral-raise', name: 'Lateral Raise', equipment: 'Dumbbells', muscles: [{ muscle: 'lateral_deltoid', intensity: 3 }, { muscle: 'traps_upper', intensity: 1 }] },
    { id: 'close-grip-bench', name: 'Close-Grip Bench Press', equipment: 'Barbell + Flat Bench', muscles: [{ muscle: 'triceps_long', intensity: 3 }, { muscle: 'triceps_lateral', intensity: 3 }, { muscle: 'triceps_medial', intensity: 3 }, { muscle: 'chest_lower', intensity: 2 }, { muscle: 'anterior_deltoid', intensity: 2 }] },
    // Pull
    { id: 'pull-ups', name: 'Pull-ups', equipment: 'Pull-up Bar', muscles: [{ muscle: 'lats_upper', intensity: 3 }, { muscle: 'lats_mid', intensity: 3 }, { muscle: 'lats_lower', intensity: 2 }, { muscle: 'biceps_long', intensity: 2 }, { muscle: 'forearm_flexors', intensity: 2 }] },
    { id: 'barbell-row', name: 'Barbell Row', equipment: 'Barbell', muscles: [{ muscle: 'lats_upper', intensity: 3 }, { muscle: 'lats_mid', intensity: 3 }, { muscle: 'biceps_long', intensity: 2 }, { muscle: 'traps_mid', intensity: 2 }, { muscle: 'forearm_flexors', intensity: 2 }] },
    { id: 'lat-pulldown', name: 'Lat Pulldown', equipment: 'Cable Machine', muscles: [{ muscle: 'lats_upper', intensity: 3 }, { muscle: 'lats_mid', intensity: 3 }, { muscle: 'biceps_long', intensity: 2 }] },
    { id: 'barbell-curl', name: 'Barbell Curl', equipment: 'Barbell', muscles: [{ muscle: 'biceps_long', intensity: 3 }, { muscle: 'biceps_short', intensity: 3 }, { muscle: 'brachioradialis', intensity: 2 }] },
    { id: 'face-pulls', name: 'Face Pulls', equipment: 'Cable Machine + Rope', muscles: [{ muscle: 'posterior_deltoid', intensity: 3 }, { muscle: 'traps_mid', intensity: 3 }, { muscle: 'traps_upper', intensity: 2 }] },
    { id: 'band-pull-apart', name: 'Band Pull-Apart', equipment: 'Resistance Band', muscles: [{ muscle: 'rhomboids', intensity: 3 }, { muscle: 'posterior_deltoid', intensity: 2 }, { muscle: 'traps_mid', intensity: 2 }] },
    { id: 'wrist-curl', name: 'Wrist Curl', equipment: 'Barbell', muscles: [{ muscle: 'forearm_flexors', intensity: 3 }, { muscle: 'biceps_long', intensity: 1 }] },
    // Core
    { id: 'cable-crunch', name: 'Cable Crunch', equipment: 'Cable Machine + Kneeling Pad', muscles: [{ muscle: 'rectus_abdominis', intensity: 3 }, { muscle: 'obliques', intensity: 1 }] },
    { id: 'plank', name: 'Plank', equipment: 'Bodyweight', muscles: [{ muscle: 'rectus_abdominis', intensity: 3 }, { muscle: 'obliques', intensity: 2 }, { muscle: 'erector_spinae', intensity: 1 }] },
    { id: 'deadlift', name: 'Deadlift', equipment: 'Barbell', muscles: [{ muscle: 'erector_spinae', intensity: 3 }, { muscle: 'gluteus_maximus', intensity: 3 }, { muscle: 'hamstrings', intensity: 3 }, { muscle: 'lats_upper', intensity: 2 }, { muscle: 'lats_mid', intensity: 2 }, { muscle: 'traps_upper', intensity: 2 }, { muscle: 'forearm_flexors', intensity: 2 }] },
  ],
};

const FULL_CAPS = ['bodyweight', 'dumbbells', 'barbell', 'cable', 'machine', 'band', 'pullup'];

// ── 1. Payload guard ────────────────────────────────────────────────────────

describe('isV2Payload guard', () => {
  it('accepts the real v2 shape', () => {
    expect(isV2Payload(PAYLOAD)).toBe(true);
  });

  it('rejects wrong format, wrong version and non-objects', () => {
    expect(isV2Payload(null)).toBe(false);
    expect(isV2Payload('json')).toBe(false);
    expect(isV2Payload({})).toBe(false);
    expect(isV2Payload({ ...PAYLOAD, format: 'something-else' })).toBe(false);
    expect(isV2Payload({ ...PAYLOAD, version: 1 })).toBe(false);
    expect(isV2Payload({ ...PAYLOAD, exerciseCatalog: 'nope' })).toBe(false);
  });
});

// ── 2. Equipment gating (capability keys → real catalog equipment strings) ──

describe('exerciseIsUsable', () => {
  it('bodyweight equipment is always usable', () => {
    expect(exerciseIsUsable('Bodyweight', [])).toBe(true);
    expect(exerciseIsUsable('Mat (ankle weight optional)', ['bodyweight'])).toBe(true);
  });

  it('capability keys match the real BodyLab catalog equipment strings', () => {
    expect(exerciseIsUsable('Dumbbells + Flat Bench', ['dumbbells'])).toBe(true);
    expect(exerciseIsUsable('Barbell + Squat Rack', ['barbell'])).toBe(true);
    expect(exerciseIsUsable('Cable Machine + Rope', ['cable'])).toBe(true);
    expect(exerciseIsUsable('Leg Press Machine', ['machine'])).toBe(true);
    expect(exerciseIsUsable('Resistance Band', ['band'])).toBe(true);
    expect(exerciseIsUsable('Pull-up Bar', ['pullup'])).toBe(true);
  });

  it('gates exercises the user cannot perform', () => {
    expect(exerciseIsUsable('Leg Press Machine', ['bodyweight'])).toBe(false);
    expect(exerciseIsUsable('Cable Machine + Rope', ['dumbbells', 'barbell'])).toBe(false);
  });
});

// ── 3. The full F1 contract: import → routine → validator ───────────────────

describe('generateFromImport', () => {
  const BASE = {
    payload: PAYLOAD,
    daysPerWeek: 3,
    goal: 'hypertrophy' as const,
    level: 'intermediate' as const,
    equipmentCapabilities: FULL_CAPS,
  };

  /** The catalog as the adapter built it (all usable under FULL_CAPS → equipment []). */
  const adapterCatalog: CatalogEntry[] = PAYLOAD.exerciseCatalog.map((ex) => ({
    id: ex.id,
    muscles: ex.muscles,
    equipment: [],
  }));

  it('generates a hard-rule-VALID weekly routine from the real payload', () => {
    const { routine } = generateFromImport(BASE);
    expect(routine.days).toHaveLength(3);
    expect(routine.daysPerWeek).toBe(3);
    const res = validateRoutine(routine, adapterCatalog);
    expect(res.valid).toBe(true);
    expect(res.violations).toEqual([]);
  });

  it('is deterministic: same input → byte-identical plan', () => {
    const a = JSON.stringify(generateFromImport(BASE).routine);
    const b = JSON.stringify(generateFromImport(BASE).routine);
    expect(a).toBe(b);
  });

  it('attacks the weak families: day 1 is a lower day with leg slots', () => {
    // thigh 0.32 + quadriceps setsLast7d 0 → the fused weakness map puts the
    // lower pattern first, so the generator must rotate it onto day 1.
    const { routine } = generateFromImport(BASE);
    const day1Ids = routine.days[0]!.slots.map((s) => s.exerciseId);
    expect(day1Ids.length).toBeGreaterThan(0);
    expect(day1Ids.some((id) => ['barbell-squat', 'leg-press', 'hip-thrust', 'leg-curl', 'calf-raises'].includes(id))).toBe(true);
  });

  it('fails HONESTLY (actionable error, never an illegal plan) without the equipment a family needs', () => {
    // Without machines there is no usable hamstring primary in the catalog
    // (leg curls are machine-only) — the adapter must surface a hard error
    // naming the family instead of emitting a plan that violates the rules.
    expect(() =>
      generateFromImport({ ...BASE, equipmentCapabilities: ['bodyweight', 'barbell', 'dumbbells', 'pullup'] })
    ).toThrow(/hamstrings/);
  });
});

// ── 4. Display conversion + load suggestion ────────────────────────────────

describe('toPlannedDays', () => {
  it('resolves display names and keeps the core prescription', () => {
    const { routine } = generateFromImport({
      payload: PAYLOAD, daysPerWeek: 4, goal: 'hypertrophy', level: 'intermediate', equipmentCapabilities: FULL_CAPS,
    });
    const days = toPlannedDays(routine, (id) => PAYLOAD.exerciseCatalog.find((e) => e.id === id)?.name ?? id);
    const withSlots = days.filter((d) => d.slots.length > 0);
    expect(withSlots.length).toBeGreaterThan(0);
    for (const d of withSlots) {
      for (const s of d.slots) {
        expect(s.name).not.toBe(s.exerciseId); // names resolved from the import
        expect(s.sets).toBeGreaterThanOrEqual(1);
        expect(s.repsMin).toBeLessThanOrEqual(s.repsMax);
        expect(s.restSec).toBeGreaterThan(0);
      }
    }
    // Rest day: preserved with empty slots
    expect(days.some((d) => d.slots.length === 0)).toBe(false); // 4-day week has no rest day
  });
});

describe('suggestLoad', () => {
  it('returns null with no history (the UI shows "start light")', () => {
    expect(suggestLoad({ history: [], repsMin: 8, repsMax: 12 })).toBeNull();
  });

  it('repeats the last working weight inside the rep range', () => {
    const out = suggestLoad({
      history: [{ weight: 60, reps: 8 }, { weight: 60, reps: 10 }],
      repsMin: 8, repsMax: 12,
    });
    expect(out).toBe(60);
  });

  it('progresses +2.5 kg when the last set reached the top of the range', () => {
    const out = suggestLoad({
      history: [{ weight: 60, reps: 10 }, { weight: 60, reps: 12 }],
      repsMin: 8, repsMax: 12,
    });
    expect(out).toBe(62.5);
  });

  it('ignores bodyweight-only history (null weights) in the middle of the log', () => {
    const out = suggestLoad({
      history: [{ weight: null, reps: 15 }, { weight: 40, reps: 9 }],
      repsMin: 8, repsMax: 12,
    });
    expect(out).toBe(40);
  });
});
