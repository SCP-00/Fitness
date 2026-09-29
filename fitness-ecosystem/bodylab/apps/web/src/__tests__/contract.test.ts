/**
 * Contract tests — real invariants of the shipped data (no reimplemented logic).
 *
 * Replaces the deleted `e2e-critical-flows.test.ts`, which inlined copies of the
 * production formulas and asserted on those copies: it could never fail when the
 * real engine broke, so it produced zero signal. Everything here imports real
 * modules and asserts on shipped data.
 *
 * @module __tests__/contract
 */

import { describe, it, expect } from 'vitest';
import { MEASUREMENT_TYPES } from '../lib/constants';
import { ALL_EXERCISES, getExercisesForMuscle, getMuscleIntensity } from '../lib/exercises';

describe('Measurement type contract', () => {
  it('declares weight in kg and every circumference in cm (unit mixups are a product bug)', () => {
    const weight = MEASUREMENT_TYPES.find(t => t.id === 'weight');
    expect(weight).toBeDefined();
    expect(weight!.unit).toBe('kg');

    for (const t of MEASUREMENT_TYPES.filter(t => t.category === 'circumference')) {
      expect(t.unit).toBe('cm');
    }
  });

  it('every type has a finite, ordered, non-degenerate domain', () => {
    for (const t of MEASUREMENT_TYPES) {
      expect(Number.isFinite(t.min)).toBe(true);
      expect(Number.isFinite(t.max)).toBe(true);
      expect(t.min).toBeLessThan(t.max);
    }
  });

  it('has unique ids and non-empty bilingual labels', () => {
    const ids = MEASUREMENT_TYPES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of MEASUREMENT_TYPES) {
      expect(t.label.en.trim().length).toBeGreaterThan(0);
      expect(t.label.es.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Exercise catalogue contract', () => {
  it('has unique kebab-case ids', () => {
    const ids = ALL_EXERCISES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('every declared muscle row uses an intensity of 1-3', () => {
    for (const ex of ALL_EXERCISES) {
      for (const m of ex.muscles) {
        expect([1, 2, 3]).toContain(m.intensity);
      }
    }
  });

  it('the bench press is a primary chest_upper driver and the muscle resolves to it', () => {
    const bench = ALL_EXERCISES.find(e => e.id === 'barbell-bench-press');
    expect(bench).toBeDefined();
    expect(getMuscleIntensity(bench!, 'chest_upper')).toBe(3);
    expect(getExercisesForMuscle('chest_upper').map(e => e.id)).toContain('barbell-bench-press');
  });
});
