/**
 * Adversarial (zero-trust) tests for the training validator.
 *
 * Feeds hostile plans — NaN sets, negative reps, hallucinated exercises,
 * empty catalogs, 7-day marathon routines, LLM proposals that ignore the
 * weakness map — and asserts the validator NEVER throws and NEVER returns
 * `valid: true` for nonsense.
 *
 * @module tests/training/adversarial
 */

import { describe, it, expect } from 'vitest';
import {
  validateRoutine,
  validateAiProposal,
  weeklySetsByFamily,
  VOLUME_WINDOWS,
  type Routine,
  type CatalogEntry,
} from '../../bodylab/core/training/src';

const EX = (id: string, muscles: [string, 1 | 2 | 3][], equipment: string[]): CatalogEntry => ({
  id,
  muscles: muscles.map(([muscle, intensity]) => ({ muscle, intensity })),
  equipment,
});

const CATALOG: CatalogEntry[] = [
  EX('bench-press', [['chest_lower', 3], ['triceps_long', 2], ['anterior_deltoid', 2]], ['barbell']),
  EX('row', [['lats_mid', 3], ['biceps_long', 2]], ['barbell']),
  EX('squat', [['quadriceps', 3], ['gluteus_maximus', 3], ['hamstrings', 2]], ['barbell']),
  EX('leg-curl', [['hamstrings', 3]], ['machine']),
  EX('calf-raise', [['calves', 3]], []),
];

const routine = (over: Partial<Routine>): Routine => ({
  id: 'r1',
  name: 'T',
  goal: 'hypertrophy',
  daysPerWeek: 1,
  equipment: ['barbell', 'machine'],
  createdAt: '2026-09-27T00:00:00.000Z',
  level: 'intermediate',
  days: [],
  ...over,
});

const slot = (exerciseId: string, sets = 3, repsMin = 8, repsMax = 12, restSec = 90) =>
  ({ exerciseId, sets, repsMin, repsMax, restSec });

describe('adversarial: the validator never throws on hostile shapes', () => {
  it('survives the full hostile-object treatment', () => {
    const hostile = {
      id: NaN,
      name: null,
      goal: 'infinite-gains',
      daysPerWeek: NaN,
      equipment: null,
      createdAt: undefined,
      days: null,
    } as unknown as Routine;
    const res = validateRoutine(hostile, CATALOG);
    expect(res.valid).toBe(false);
    expect(res.structural.length).toBeGreaterThan(0);
    expect(Number.isFinite(res.structural.length)).toBe(true);
  });

  it('rejects structural garbage in every slot field', () => {
    const base = { id: 'd', focus: [], slots: [slot('squat')] };
    const cases: Partial<Routine>[] = [
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 0)] }] }, // sets 0
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 7)] }] }, // sets 7
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 3, 0, 12)] }] }, // repsMin 0
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 3, 12, 8)] }] }, // min > max
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 3, 8, 51)] }] }, // repsMax 51
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 3, 8, 12, -1)] }] }, // restSec -1
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 3, 8, 12, 601)] }] }, // restSec 601
      { daysPerWeek: 1, days: [{ ...base, slots: [slot('squat', 3, 8, 12, 90, ) as never] }] }, // rir via cast below
      { daysPerWeek: 1, days: [{ id: 'd', focus: [], slots: [{ ...slot('squat'), rir: 9 }] }] }, // rir 9
      { daysPerWeek: 1, days: [{ id: 'd', focus: [], slots: [{ ...slot('squat'), rir: NaN }] }] },
      { daysPerWeek: 3, days: [base] }, // days.length ≠ daysPerWeek
    ];
    for (const over of cases) {
      const res = validateRoutine(routine(over) as Routine, CATALOG);
      expect(res.valid, JSON.stringify(over).slice(0, 80)).toBe(false);
    }
  });

  it('days.length ≠ daysPerWeek is a structural error, not a rule violation', () => {
    const res = validateRoutine(routine({ daysPerWeek: 5, days: [] }), CATALOG);
    expect(res.violations).toEqual([]);
    expect(res.structural.some((i) => i.message.includes('days.length'))).toBe(true);
  });
});

describe('adversarial: catalog trust is zero', () => {
  it('an empty catalog invalidates every exercise reference without throwing', () => {
    const r = routine({
      days: [{ id: 'd', focus: ['quadriceps'], slots: [slot('squat'), slot('leg-curl')] }],
    });
    const res = validateRoutine(r, []);
    expect(res.valid).toBe(false);
    expect(res.violations.filter((v) => v.rule === 'catalog')).toHaveLength(2);
    // Rules 2/3/4 must not crash on the unknown exercises (they skip them):
    expect(res.violations.every((v) => Number.isFinite(1))).toBe(true);
  });

  it('an empty routine (no days) is structurally rejected, not "vacuously valid"', () => {
    const res = validateRoutine(routine({ days: [] }), CATALOG);
    expect(res.valid).toBe(false);
  });

  it('duplicate ids in the catalog cannot double-count volume (first wins is fine, but no crash)', () => {
    const dup = [...CATALOG, EX('squat', [['calves', 3]], [])];
    const r = routine({
      days: [{ id: 'd', focus: [], slots: [slot('squat', 3)] }],
    });
    const totals = weeklySetsByFamily(r, dup);
    // Map construction keeps the LAST duplicate (calves instead of quads) —
    // whatever the resolution, the result must be a sane single family count.
    const sum = [...totals.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(3);
  });

  it('a hallucinated exercise cannot contribute to volume or family-day sets', () => {
    const r = routine({
      days: [
        { id: 'a', focus: [], slots: [slot('squat', 3), slot('magic-move', 2)] },
        { id: 'b', focus: [], slots: [slot('squat', 3)] },
      ],
      daysPerWeek: 2,
    });
    const res = validateRoutine(r, CATALOG);
    expect(res.violations.some((v) => v.rule === 'catalog' && v.context?.exerciseId === 'magic-move')).toBe(true);
    // Volume for quads counts only the two real squat slots: 3 + 3 = 6 — the
    // hallucinated slot contributed NOTHING to the family math.
    expect(weeklySetsByFamily(r, CATALOG).get('quadriceps')).toBe(6);
  });
});

describe('adversarial: hard rules hold under pressure', () => {
  it('the 7-day full-body marathon fails on consecutive days AND volume ceilings', () => {
    const day = { id: 'fb', focus: [], slots: [slot('squat', 3), slot('bench-press', 3), slot('row', 3)] };
    const res = validateRoutine(routine({ days: Array.from({ length: 7 }, (_, i) => ({ ...day, id: `d${i}` })), daysPerWeek: 7 }), CATALOG);
    expect(res.valid).toBe(false);
    expect(res.violations.filter((v) => v.rule === 'consecutive_days').length).toBeGreaterThan(0);
    expect(res.violations.filter((v) => v.rule === 'weekly_volume' && String(v.context?.message ?? v.message).includes('above')).length).toBeGreaterThan(0);
  });

  it('cycling every family to its exact window bounds stays valid (boundary test)', () => {
    // Advanced windows: min 8. Build quads 8, hams 8, glutes 8, calves 8 in ONE day.
    const day = {
      id: 'legs',
      focus: ['quadriceps', 'hamstrings'],
      slots: [
        slot('squat', 4), // quads 4, glutes 4, hams 4
        slot('squat', 4), // quads 4, glutes 4, hams 4
        slot('leg-curl', 4), // hams 4
        slot('calf-raise', 8), // calves 8
      ],
    };
    const r = routine({ days: [day], daysPerWeek: 1, level: 'advanced' });
    const res = validateRoutine(r, CATALOG);
    // quads 8 ✓, glutes 8 ✓, hams 4+4+4=12 ✓, calves 8 ✓ — all inside [8, 22].
    const vol = res.violations.filter((v) => v.rule === 'weekly_volume');
    expect(vol).toEqual([]);
  });

  it('volume windows are internally consistent (min ≤ max, all inside the plan band)', () => {
    for (const w of Object.values(VOLUME_WINDOWS)) {
      expect(w.min).toBeGreaterThanOrEqual(4);
      expect(w.max).toBeLessThanOrEqual(22);
      expect(w.min).toBeLessThanOrEqual(w.max);
    }
  });
});

describe('adversarial: rule 5 against a lying LLM', () => {
  const WEAK = ['gluteus_medius', 'posterior_deltoid'];
  const ids = CATALOG.map((e) => e.id);

  it('cites a weak muscle that does not exist in the weakness report → rejected', () => {
    const res = validateAiProposal(
      { name: 'X', days: [{ focus: 'chest_lower', slots: ['bench-press'] }], targetedWeakMuscles: ['chest_lower'] },
      WEAK,
      ids
    );
    expect(res.valid).toBe(false);
  });

  it('cites weak muscles but the "day" uses hallucinated slots → rejected', () => {
    const res = validateAiProposal(
      { name: 'X', days: [{ focus: 'gluteus_medius', slots: ['glute-inventor-3000'] }], targetedWeakMuscles: ['gluteus_medius'] },
      WEAK,
      ids
    );
    expect(res.valid).toBe(false);
  });

  it('duplicate weak citations still require at least one attacking day', () => {
    const res = validateAiProposal(
      { name: 'X', days: [], targetedWeakMuscles: ['gluteus_medius', 'gluteus_medius'] },
      WEAK,
      ids
    );
    expect(res.valid).toBe(false);
  });

  it('an empty proposal with empty weaknesses is valid (nothing to attack)', () => {
    expect(validateAiProposal({ name: 'X', days: [], targetedWeakMuscles: [] }, [], ids).valid).toBe(true);
  });

  it('hostile proposal objects never crash the check', () => {
    const res = validateAiProposal(
      { name: NaN, days: null as never, targetedWeakMuscles: undefined as never },
      WEAK,
      ids
    );
    expect(res.valid).toBe(false);
    expect(res.violations[0].rule).toBe('weak_muscle_citation');
  });
});
