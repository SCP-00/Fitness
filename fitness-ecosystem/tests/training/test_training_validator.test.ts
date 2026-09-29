/**
 * Training core — unit tests for the T1 validator (TrainingLab plan §4).
 *
 * The five HARD RULES are tested against a small hand-built catalog with
 * hand-computed volume expectations: a test that rebuilds the rule proves
 * nothing — a test that pins the DECISION the rule must make on a concrete
 * plan catches transcription errors in the rules themselves.
 *
 * @module tests/training
 */

import { describe, it, expect } from 'vitest';
import {
  validateRoutine,
  validateAiProposal,
  weeklySetsByFamily,
  muscleFamilyOf,
  isBigMuscleFamily,
  VOLUME_WINDOWS,
  type Routine,
  type CatalogEntry,
} from '../../bodylab/core/training/src';

// ── Hand-built mini catalog (structural subset of the web vocabulary) ───────

const EX = (id: string, muscles: [string, 1 | 2 | 3][], equipment: string[]): CatalogEntry => ({
  id,
  muscles: muscles.map(([muscle, intensity]) => ({ muscle, intensity })),
  equipment,
});

const CATALOG: CatalogEntry[] = [
  // Chest
  EX('bench-press', [['chest_lower', 3], ['triceps_long', 2], ['anterior_deltoid', 2]], ['barbell']),
  EX('db-press', [['chest_lower', 3], ['anterior_deltoid', 2]], ['dumbbells']),
  EX('push-up', [['chest_lower', 2], ['triceps_long', 1]], []), // bodyweight
  EX('fly', [['chest_upper', 3]], ['dumbbells']),
  // Back
  EX('pull-up', [['lats_lower', 3], ['biceps_long', 2]], []),
  EX('row', [['lats_mid', 3], ['biceps_long', 2], ['traps_mid', 2]], ['barbell']),
  // Legs
  EX('squat', [['quadriceps', 3], ['gluteus_maximus', 3], ['hamstrings', 2]], ['barbell']),
  EX('rdl', [['hamstrings', 3], ['gluteus_maximus', 2]], ['barbell']),
  EX('leg-ext', [['quadriceps', 3]], ['machine']),
  EX('leg-curl', [['hamstrings', 3]], ['machine']),
  EX('leg-press', [['quadriceps', 3], ['gluteus_maximus', 2]], ['machine']),
  // Shoulders/arms
  EX('ohp', [['anterior_deltoid', 3], ['lateral_deltoid', 2], ['triceps_long', 2]], ['barbell']),
  EX('lat-raise', [['lateral_deltoid', 3]], ['dumbbells']),
  EX('curl', [['biceps_long', 3]], ['dumbbells']),
  EX('pushdown', [['triceps_lateral', 3]], ['cable']),
  EX('skullcrusher', [['triceps_long', 3]], ['barbell']),
  EX('calf-raise', [['calves', 3]], []),
  EX('plank', [['rectus_abdominis', 2]], []),
];

const routine = (over: Partial<Routine>): Routine => ({
  id: 'r1',
  name: 'Test',
  goal: 'hypertrophy',
  daysPerWeek: 3,
  equipment: ['barbell', 'dumbbells', 'machine', 'cable'],
  createdAt: '2026-09-27T00:00:00.000Z',
  level: 'intermediate',
  days: [],
  ...over,
});

const slot = (exerciseId: string, sets = 3, repsMin = 8, repsMax = 12, restSec = 90) =>
  ({ exerciseId, sets, repsMin, repsMax, restSec });

/** Upper day (chest/lats focus) that stays inside every window by construction. */
const upperDay = (id: string) => ({
  id,
  focus: ['chest_lower' as const, 'lats_mid' as const],
  slots: [
    slot('bench-press', 3), // chest 3, triceps 3 (int≥2: triceps_long 2)
    slot('row', 3), // lats 3, biceps 3, traps 3
  ],
});

/** Lower day: quads 6, glutes 6, hams 6, calves 6 direct sets — exactly the intermediate min. */
const lowerDay = (id: string) => ({
  id,
  focus: ['quadriceps' as const, 'hamstrings' as const],
  slots: [
    slot('squat', 3), // quads 3, glutes 3, hams 3
    slot('leg-press', 3), // quads 3, glutes 3
    slot('leg-curl', 3), // hams 3
    slot('calf-raise', 6), // calves 6
  ],
});

describe('muscle family mapping (rule vocabulary)', () => {
  it('maps every granular muscle to the family the rules operate on', () => {
    expect(muscleFamilyOf('chest_lower')).toBe('chest');
    expect(muscleFamilyOf('anterior_deltoid')).toBe('shoulders');
    expect(muscleFamilyOf('triceps_long')).toBe('triceps');
    expect(muscleFamilyOf('biceps_short')).toBe('biceps');
    expect(muscleFamilyOf('brachioradialis')).toBe('biceps');
    expect(muscleFamilyOf('forearm_flexors')).toBe('forearms');
    expect(muscleFamilyOf('lats_upper')).toBe('lats');
    expect(muscleFamilyOf('traps_lower')).toBe('traps');
    expect(muscleFamilyOf('rhomboids')).toBe('rhomboids');
    expect(muscleFamilyOf('rectus_abdominis')).toBe('core');
    expect(muscleFamilyOf('iliopsoas')).toBe('core');
    expect(muscleFamilyOf('gluteus_medius')).toBe('glutes');
    expect(muscleFamilyOf('adductors')).toBe('quadriceps');
    expect(muscleFamilyOf('soleus')).toBe('calves');
    expect(muscleFamilyOf('tibialis_anterior')).toBe('calves');
  });

  it('classifies big families for the consecutive-day rule', () => {
    expect(isBigMuscleFamily('chest')).toBe(true);
    expect(isBigMuscleFamily('quadriceps')).toBe(true);
    expect(isBigMuscleFamily('calves')).toBe(false);
    expect(isBigMuscleFamily('forearms')).toBe(false);
  });

  it('windows refine the plan [4, 22] band per level', () => {
    expect(VOLUME_WINDOWS.beginner.min).toBe(4);
    expect(VOLUME_WINDOWS.intermediate.max).toBe(18);
    expect(VOLUME_WINDOWS.advanced.max).toBe(22);
  });
});

describe('hard rule 1 — catalog existence + equipment', () => {
  it('accepts a valid plan (upper/lower/upper, volumes in-window)', () => {
    const r = routine({ days: [upperDay('u1'), lowerDay('l1'), upperDay('u2')] });
    const res = validateRoutine(r, CATALOG);
    expect(res.structural).toEqual([]);
    expect(res.violations).toEqual([]);
    expect(res.valid).toBe(true);
  });

  it('rejects an exerciseId that does not exist', () => {
    const r = routine({
      days: [{ id: 'u1', focus: ['chest_lower'], slots: [slot('magic-press')] }],
      daysPerWeek: 1,
    });
    const res = validateRoutine(r, CATALOG);
    expect(res.valid).toBe(false);
    expect(res.violations[0].rule).toBe('catalog');
    expect(res.violations[0].context?.exerciseId).toBe('magic-press');
  });

  it('rejects equipment the athlete does not own', () => {
    const r = routine({
      equipment: ['dumbbells'], // no barbell, no machine, no cable
      days: [upperDay('u1')], // bench-press (barbell) + row (barbell)
      daysPerWeek: 1,
    });
    const res = validateRoutine(r, CATALOG);
    expect(res.valid).toBe(false);
    expect(res.violations.filter((v) => v.rule === 'catalog')).toHaveLength(2);
  });

  it('accepts bodyweight exercises with no equipment at all', () => {
    const r = routine({
      equipment: [],
      daysPerWeek: 2,
      days: [
        { id: 'a', focus: ['chest_lower'], slots: [slot('push-up', 4)] },
        { id: 'b', focus: ['lats_lower'], slots: [slot('pull-up', 4)] },
      ],
    });
    const res = validateRoutine(r, CATALOG);
    expect(res.violations.filter((v) => v.rule === 'catalog')).toEqual([]);
  });
});

describe('hard rule 2 — no big family two days in a row', () => {
  it('rejects chest on consecutive days', () => {
    const r = routine({ days: [upperDay('u1'), upperDay('u2')] , daysPerWeek: 2 });
    const res = validateRoutine(r, CATALOG);
    expect(res.valid).toBe(false);
    const hits = res.violations.filter((v) => v.rule === 'consecutive_days');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((v) => v.context?.family)).toBe(true);
  });

  it('accepts the same family on NON-consecutive days (upper/lower/upper)', () => {
    const r = routine({ days: [upperDay('u1'), lowerDay('l1'), upperDay('u2')] });
    const res = validateRoutine(r, CATALOG);
    expect(res.violations.filter((v) => v.rule === 'consecutive_days')).toEqual([]);
  });

  it('a small family (calves) MAY appear two days in a row', () => {
    const days = [
      { id: 'a', focus: [], slots: [slot('calf-raise', 4), slot('plank', 3)] },
      { id: 'b', focus: [], slots: [slot('calf-raise', 4)] },
    ];
    const res = validateRoutine(routine({ days, daysPerWeek: 2 }), CATALOG);
    expect(res.violations.filter((v) => v.rule === 'consecutive_days')).toEqual([]);
  });
});

describe('hard rule 3 — weekly volume windows', () => {
  it('computes weekly sets per family counting direct work only (intensity ≥ 2)', () => {
    // One upper day + one lower day, hand-computed:
    const r = routine({ days: [upperDay('u1'), lowerDay('l1')], daysPerWeek: 2 });
    const totals = weeklySetsByFamily(r, CATALOG);
    // bench chest_lower 3 × 3 sets = 3 (only direct chest work that day)
    expect(totals.get('chest')).toBe(3);
    // bench triceps_long int2 → 3
    expect(totals.get('triceps')).toBe(3);
    // bench anterior_deltoid int2 → 3
    expect(totals.get('shoulders')).toBe(3);
    // row lats_mid 3 → 3
    expect(totals.get('lats')).toBe(3);
    // row biceps_long int2 → 3
    expect(totals.get('biceps')).toBe(3);
    // row traps_mid int2 → 3
    expect(totals.get('traps')).toBe(3);
    // squat 3 + leg-press 3 = 6
    expect(totals.get('quadriceps')).toBe(6);
    // squat 3 + leg-press 3 = 6
    expect(totals.get('glutes')).toBe(6);
    // squat int2 3 + leg-curl 3 = 6
    expect(totals.get('hamstrings')).toBe(6);
    // calf-raise 6
    expect(totals.get('calves')).toBe(6);
  });

  it('rejects a family below the level minimum', () => {
    // Single day: chest 3, triceps 3, biceps 3, traps 3, lats 3 — traps < 6 → violation
    const r = routine({ days: [upperDay('u1')], daysPerWeek: 1 });
    const res = validateRoutine(r, CATALOG);
    const low = res.violations.filter((v) => v.rule === 'weekly_volume' && v.context?.family === 'traps');
    expect(low.length).toBe(1);
    expect(low[0].message).toContain('below');
  });

  it('rejects a family above the level maximum', () => {
    // 3 curl slots × 6 sets = 18 direct biceps sets/week — over the beginner
    // max (12) but NOT over the advanced max (22): the level changes the verdict.
    const day = {
      id: 'arms',
      focus: [],
      slots: [slot('curl', 6), slot('curl', 6), slot('curl', 6), slot('pushdown', 6)],
    };
    const r = routine({ days: [day], daysPerWeek: 1, level: 'beginner' });
    const res = validateRoutine(r, CATALOG);
    const high = res.violations.filter((v) => v.rule === 'weekly_volume' && v.context?.family === 'biceps');
    expect(high.length).toBe(1);
    expect(high[0].message).toContain('above');
    expect(high[0].context?.sets).toBe(18);
    // Same plan at advanced level: 18 ≤ 22 → no above-max violation for biceps.
    const advanced = validateRoutine({ ...r, level: 'advanced' }, CATALOG);
    expect(advanced.violations.filter((v) => v.rule === 'weekly_volume' && v.context?.family === 'biceps')).toEqual([]);
  });

  it('the level window changes the verdict (beginner fails what advanced passes)', () => {
    const days = [lowerDay('l1'), { id: 'u', focus: [], slots: [slot('bench-press', 2)] }];
    const r = routine({ days, daysPerWeek: 2 });
    const asBeginner = validateRoutine({ ...r, level: 'beginner' }, CATALOG);
    const asAdvanced = validateRoutine({ ...r, level: 'advanced' }, CATALOG);
    // Beginner min 4: traps/chest/biceps 3 < 4 → violations; advanced min 8 → more.
    expect(asBeginner.violations.some((v) => v.rule === 'weekly_volume')).toBe(true);
    expect(asAdvanced.violations.filter((v) => v.rule === 'weekly_volume').length)
      .toBeGreaterThan(asBeginner.violations.filter((v) => v.rule === 'weekly_volume').length);
  });
});

describe('hard rule 4 — focus coverage', () => {
  it('rejects a focused muscle with no slot in that day', () => {
    const r = routine({
      days: [{ id: 'chest-day', focus: ['chest_lower', 'lats_upper'], slots: [slot('bench-press')] }],
      daysPerWeek: 1,
    });
    const res = validateRoutine(r, CATALOG);
    expect(res.violations.some((v) => v.rule === 'focus_coverage' && v.context?.muscle === 'lats_upper')).toBe(true);
  });

  it('a day without focus is legal (rest/conditioning day)', () => {
    const r = routine({
      days: [{ id: 'rest', focus: [], slots: [] }],
      daysPerWeek: 1,
    });
    const res = validateRoutine(r, CATALOG);
    expect(res.violations.filter((v) => v.rule === 'focus_coverage')).toEqual([]);
  });
});

describe('hard rule 5 — AI citation', () => {
  const WEAK = ['gluteus_medius', 'rhomboids'];
  const ids = CATALOG.map((e) => e.id);

  it('accepts a proposal that cites and attacks a weak muscle', () => {
    const res = validateAiProposal(
      {
        name: 'Weak-point plan',
        days: [{ focus: 'gluteus_medius', slots: ['leg-press', 'leg-curl'] }],
        targetedWeakMuscles: ['gluteus_medius'],
      },
      WEAK,
      ids
    );
    expect(res.valid).toBe(true);
  });

  it('rejects a proposal that cites none of the weak muscles', () => {
    const res = validateAiProposal(
      { name: 'Bench-only', days: [{ focus: 'chest_lower', slots: ['bench-press'] }], targetedWeakMuscles: ['chest_lower'] },
      WEAK,
      ids
    );
    expect(res.valid).toBe(false);
    expect(res.violations[0].rule).toBe('weak_muscle_citation');
    expect(res.violations[0].message).toContain('none of the reported weak');
  });

  it('rejects a citation without a day focused on the weak muscle', () => {
    const res = validateAiProposal(
      { name: 'Cites but ignores', days: [{ focus: 'chest_lower', slots: ['bench-press'] }], targetedWeakMuscles: ['gluteus_medius'] },
      WEAK,
      ids
    );
    expect(res.valid).toBe(false);
    expect(res.violations[0].message).toContain('no day focused');
  });

  it('a proposal with NO reported weaknesses is acceptable (nothing to cite)', () => {
    const res = validateAiProposal(
      { name: 'Balanced', days: [], targetedWeakMuscles: [] },
      [],
      ids
    );
    expect(res.valid).toBe(true);
  });

  it('rejects slots referencing exercises outside the catalog (rule 5 feeds rule 1)', () => {
    const res = validateAiProposal(
      { name: 'Hallucinated', days: [{ focus: 'gluteus_medius', slots: ['invented-machine'] }], targetedWeakMuscles: ['gluteus_medius'] },
      WEAK,
      ids
    );
    expect(res.valid).toBe(false);
    expect(res.violations[0].rule).toBe('weak_muscle_citation');
  });
});
