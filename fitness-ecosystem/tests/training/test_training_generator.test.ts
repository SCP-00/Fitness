/**
 * Training core — golden-output tests for the T2 deterministic generator.
 *
 * "Same input → same plan" is pinned byte-for-byte, and the ATTACK-FIRST
 * property is pinned against hand-computed weekly volumes: the weakest
 * family gets the window ceiling, the strongest the maintenance floor.
 * Every generated plan is re-validated against the hard rules.
 *
 * @module tests/training/generator
 */

import { describe, it, expect } from 'vitest';
import {
  generateRoutine,
  validateRoutine,
  weeklySetsByFamily,
  VOLUME_WINDOWS,
  GeneratorError,
  type CatalogEntry,
  type GeneratorInput,
} from '../../bodylab/core/training/src';

// ── Mini catalog with clear primary movers + real spill (squat → 3 families) ─

const EX = (id: string, muscles: [string, 1 | 2 | 3][], equipment: string[]): CatalogEntry => ({
  id,
  muscles: muscles.map(([muscle, intensity]) => ({ muscle, intensity })),
  equipment,
});

const CATALOG: CatalogEntry[] = [
  EX('bench-press', [['chest_lower', 3], ['triceps_long', 2], ['anterior_deltoid', 2]], ['barbell']),
  EX('db-press', [['chest_lower', 3], ['anterior_deltoid', 2]], ['dumbbells']),
  EX('pull-up', [['lats_lower', 3], ['biceps_long', 2]], []),
  EX('row', [['lats_mid', 3], ['biceps_long', 2], ['traps_mid', 2]], ['barbell']),
  EX('shrug', [['traps_upper', 3]], ['barbell']),
  EX('curl', [['biceps_long', 3]], ['dumbbells']),
  EX('squat', [['quadriceps', 3], ['gluteus_maximus', 3], ['hamstrings', 2]], ['barbell']),
  EX('hip-thrust', [['gluteus_maximus', 3]], ['barbell']),
  EX('leg-press', [['quadriceps', 3], ['gluteus_maximus', 2]], ['machine']),
  EX('leg-curl', [['hamstrings', 3]], ['machine']),
  EX('calf-raise', [['calves', 3]], []),
  EX('ohp', [['anterior_deltoid', 3], ['triceps_long', 2]], ['barbell']),
  EX('skullcrusher', [['triceps_long', 3]], ['barbell']),
];

const input = (over: Partial<GeneratorInput>): GeneratorInput => ({
  weakness: { glutes: 25, lats: 40, hamstrings: 45, chest: 60, quadriceps: 55 },
  equipment: ['barbell', 'dumbbells', 'machine', 'cable'],
  daysPerWeek: 4,
  goal: 'hypertrophy',
  level: 'intermediate',
  catalog: CATALOG,
  familyPlans: {
    glutes: { exercises: ['hip-thrust', 'squat', 'leg-press'], exercisesPerSession: 2, sessionsPerWeek: 2 },
    lats: { exercises: ['pull-up', 'row'], exercisesPerSession: 2, sessionsPerWeek: 2 },
    chest: { exercises: ['bench-press', 'db-press'], exercisesPerSession: 2, sessionsPerWeek: 1 },
    quadriceps: { exercises: ['squat', 'leg-press'], exercisesPerSession: 2, sessionsPerWeek: 1 },
    hamstrings: { exercises: ['leg-curl'], exercisesPerSession: 1, sessionsPerWeek: 2 },
    traps: { exercises: ['shrug'], exercisesPerSession: 1, sessionsPerWeek: 1 },
    biceps: { exercises: ['curl', 'pull-up', 'row'], exercisesPerSession: 1, sessionsPerWeek: 2 },
    triceps: { exercises: ['skullcrusher', 'bench-press'], exercisesPerSession: 1, sessionsPerWeek: 1 },
    shoulders: { exercises: ['ohp', 'db-press'], exercisesPerSession: 1, sessionsPerWeek: 1 },
    calves: { exercises: ['calf-raise'], exercisesPerSession: 1, sessionsPerWeek: 1 },
  },
  ...over,
});

describe('T2 golden: determinism', () => {
  it('identical input produces a byte-identical plan (no RNG, no Date.now)', () => {
    const a = generateRoutine(input({}));
    const b = generateRoutine(input({}));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('input key order does not matter (weakness / familyPlans iteration is sorted by weakness)', () => {
    const swapped = input({});
    const w = { ...swapped.weakness };
    const a = generateRoutine(swapped);
    const b = generateRoutine({ ...swapped, weakness: { chest: 60, quadriceps: 55, hamstrings: 45, lats: 40, glutes: 25, ...w } });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('the createdAt stamp is the deterministic epoch (the caller stamps the real date)', () => {
    expect(generateRoutine(input({})).createdAt).toBe('1970-01-01T00:00:00.000Z');
  });
});

describe('T2 golden: the 4-day plan shape (attack-first)', () => {
  const r = generateRoutine(input({}));

  it('matches the pinned golden structure (lower → pull → push → lower)', () => {
    expect(r.days.map((d) => d.slots.map((s) => `${s.exerciseId}x${s.sets}`).join(', '))).toEqual([
      'hip-thrustx3, squatx3, leg-curlx5, calf-raisex6, leg-pressx3', // lower (weakest pattern leads)
      'pull-upx6, rowx6, shrugx6, curlx6', // pull
      'skullcrusherx6, ohpx6, bench-pressx3, db-pressx3', // push
      'hip-thrustx3, squatx3, leg-curlx5, calf-raisex6, leg-pressx3', // lower (2nd glutes session)
    ]);
    expect(r.daysPerWeek).toBe(4);
  });

  it('every generated plan passes the hard-rule validator', () => {
    expect(validateRoutine(r, CATALOG).valid).toBe(true);
  });

  it('the WEAKEST family (glutes 25) hits the intermediate ceiling; the STRONGEST (chest 60) the maintenance dose', () => {
    const totals = weeklySetsByFamily(r, CATALOG);
    const w = VOLUME_WINDOWS.intermediate;
    expect(totals.get('glutes')).toBe(w.max); // attacked
    expect(totals.get('chest')).toBeLessThan(totals.get('glutes')!); // maintained
    expect(totals.get('chest')!).toBeGreaterThanOrEqual(w.min);
  });

  it('every family lands inside its window (spill included)', () => {
    const totals = weeklySetsByFamily(r, CATALOG);
    const w = VOLUME_WINDOWS.intermediate;
    for (const [family, sets] of totals) {
      expect(sets, family).toBeGreaterThanOrEqual(w.min);
      expect(sets, family).toBeLessThanOrEqual(w.max);
    }
  });

  it('no big family trains on adjacent days (rule 2 re-checked on the golden plan)', () => {
    const res = validateRoutine(r, CATALOG);
    expect(res.violations.filter((v) => v.rule === 'consecutive_days')).toEqual([]);
  });
});

describe('T2: level and goal change the plan deterministically', () => {
  it('a beginner window produces different doses than advanced for the same input', () => {
    // traps/biceps need ≥2 slots to reach even the advanced floor (8/week).
    const plans = {
      ...input({}).familyPlans,
      traps: { exercises: ['shrug'], exercisesPerSession: 2, sessionsPerWeek: 1 },
      biceps: { exercises: ['curl', 'pull-up', 'row'], exercisesPerSession: 2, sessionsPerWeek: 2 },
    };
    const beg = generateRoutine(input({ level: 'beginner', familyPlans: plans }));
    const adv = generateRoutine(input({ level: 'advanced', familyPlans: plans }));
    expect(JSON.stringify(beg)).not.toBe(JSON.stringify(adv));
    expect(validateRoutine(beg, CATALOG).valid).toBe(true);
    expect(validateRoutine(adv, CATALOG).valid).toBe(true);
  });

  it('goal changes rep ranges and rest deterministically', () => {
    const strength = generateRoutine(input({ goal: 'strength' }));
    const hyper = generateRoutine(input({}));
    const s0 = strength.days[0].slots[0];
    const h0 = hyper.days[0].slots[0];
    expect([s0.repsMin, s0.repsMax, s0.restSec, s0.rir]).toEqual([3, 6, 180, 2]);
    expect([h0.repsMin, h0.repsMax, h0.restSec, h0.rir]).toEqual([8, 12, 90, 2]);
  });

  it('a 3-day and a 6-day week both self-validate (day 7 is a rest day in a 7-day week)', () => {
    for (const days of [2, 3, 5, 6, 7]) {
      const r = generateRoutine(input({ daysPerWeek: days }));
      expect(validateRoutine(r, CATALOG).valid, `daysPerWeek=${days}`).toBe(true);
    }
  });
});

describe('T2: equipment honesty', () => {
  it('a no-barbell athlete gets a different, still-valid plan without barbell exercises', () => {
    // db-hip-thrust / db-ohp (dumbbells) are the glutes/shoulders primaries here.
    const extendedCatalog: CatalogEntry[] = [
      ...CATALOG,
      EX('db-hip-thrust', [['gluteus_maximus', 3]], ['dumbbells']),
      EX('db-ohp', [['anterior_deltoid', 3], ['triceps_long', 2]], ['dumbbells']),
    ];
    const r = generateRoutine(
      input({
        equipment: ['dumbbells', 'machine', 'cable'],
        catalog: extendedCatalog,
        familyPlans: {
          glutes: { exercises: ['db-hip-thrust', 'leg-press'], exercisesPerSession: 2, sessionsPerWeek: 2 },
          lats: { exercises: ['pull-up'], exercisesPerSession: 2, sessionsPerWeek: 2 },
          chest: { exercises: ['db-press'], exercisesPerSession: 2, sessionsPerWeek: 1 },
          quadriceps: { exercises: ['leg-press'], exercisesPerSession: 2, sessionsPerWeek: 1 },
          hamstrings: { exercises: ['leg-curl'], exercisesPerSession: 1, sessionsPerWeek: 2 },
          biceps: { exercises: ['curl', 'pull-up'], exercisesPerSession: 1, sessionsPerWeek: 2 },
          triceps: { exercises: ['bench-press'], exercisesPerSession: 1, sessionsPerWeek: 1 },
          shoulders: { exercises: ['db-ohp', 'db-press'], exercisesPerSession: 1, sessionsPerWeek: 1 },
          calves: { exercises: ['calf-raise'], exercisesPerSession: 1, sessionsPerWeek: 1 },
        },
      })
    );
    const ids = new Set(r.days.flatMap((d) => d.slots.map((s) => s.exerciseId)));
    expect(ids.has('bench-press')).toBe(false);
    expect(ids.has('squat')).toBe(false);
    // Validate against the SAME catalog the routine was generated from.
    expect(validateRoutine(r, extendedCatalog).valid).toBe(true);
  });
});

describe('T2: actionable GeneratorError cases', () => {
  it('no usable exercises at all', () => {
    expect(() =>
      generateRoutine(input({ equipment: [], familyPlans: { chest: { exercises: ['bench-press'], exercisesPerSession: 1, sessionsPerWeek: 1 } } }))
    ).toThrow(GeneratorError);
  });

  it('a directly-touched family without a plan is rejected with its name', () => {
    // triceps (bench spill) has no plan:
    const plans = input({}).familyPlans;
    const { triceps: _omit, ...rest } = plans;
    expect(() => generateRoutine(input({ familyPlans: rest }))).toThrow(/triceps/);
  });

  it('a family without a PRIMARY exercise is rejected (spill-only volume cannot be steered)', () => {
    const plans = {
      ...input({}).familyPlans,
      traps: { exercises: ['row'], exercisesPerSession: 1, sessionsPerWeek: 1 }, // row's primary = lats; traps spill-only
    };
    expect(() => generateRoutine(input({ familyPlans: plans }))).toThrow(/traps.*PRIMARY/);
  });

  it('a family whose candidates never train it directly is simply NOT scheduled (no error)', () => {
    const plans = {
      ...input({}).familyPlans,
      forearms: { exercises: ['curl'], exercisesPerSession: 1, sessionsPerWeek: 1 }, // curl never touches forearms
    };
    const r = generateRoutine(input({ familyPlans: plans }));
    expect(validateRoutine(r, CATALOG).valid).toBe(true);
  });

  it('daysPerWeek outside [1, 7] is rejected', () => {
    expect(() => generateRoutine(input({ daysPerWeek: 8 }))).toThrow(GeneratorError);
    expect(() => generateRoutine(input({ daysPerWeek: 0 }))).toThrow(GeneratorError);
  });
});
