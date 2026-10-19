/**
 * ADVERSARIAL — Analytics engine (zero-trust, pessimistic)
 *
 * These tests import the REAL `@fitness/bodylab-analytics` module (which had no
 * real coverage before: the deleted `e2e-critical-flows.test.ts` inlined copies
 * of these formulas and asserted on the copies, so it could never catch a
 * production regression) and deliberately feed it hostile input:
 *
 *   - impossible anatomy (waist <= neck), zero/negative height
 *   - NaN / Infinity values and timestamps that collapse the time axis
 *   - empty and single-element series
 *   - constant series (zero variance → zero denominator)
 *
 * The contract under test is defensive: a pure engine must FAIL CLOSED
 * (`null`) or return a finite number — never silently emit `NaN`/`Infinity`
 * into the UI. Tests marked `it.fails` document a known, still-open defect.
 *
 * @module tests/adversarial/analytics
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBodyFatNavy,
  calculateBodyFatBmi,
  assessBodyComposition,
  assessHealthRisks,
  calculateBodyAge,
  predictProgress,
  calculateCorrelation,
  findCorrelations,
} from '../../bodylab/core/analytics/src/index';
import type { Measurement } from '../../bodylab/core/measurements/src/types';

/** Deterministic measurement factory. `day` keeps timestamps unique/ordered. */
function mk(type: string, value: number, day = 1): Measurement {
  return {
    id: `m-${type}-${day}-${value}`,
    profileId: 'p1',
    type: type as Measurement['type'],
    value,
    unit: 'cm',
    timestamp: `2026-01-${String(Math.min(28, Math.max(1, day))).padStart(2, '0')}T00:00:00.000Z`,
    method: 'manual',
    confidence: 'high',
  };
}

/** Same timestamp for every row — collapses the regression time axis. */
function mkSameTime(type: string, value: number): Measurement {
  return { ...mk(type, value), timestamp: '2026-01-01T00:00:00.000Z' };
}

const finiteOrNull = (v: number | null) => v === null || Number.isFinite(v);

// ============================================================================
// Body fat — US Navy
// ============================================================================

describe('ADVERSARIAL: US Navy body fat (hostile anatomy)', () => {
  it('fails closed when waist <= neck (impossible anatomy) instead of returning NaN', () => {
    expect(calculateBodyFatNavy(30, 40, 175, 0, 'male')).toBeNull();
    expect(calculateBodyFatNavy(40, 40, 175, 0, 'male')).toBeNull(); // equal
  });

  it('fails closed for zero or negative height', () => {
    expect(calculateBodyFatNavy(82, 38, 0, 0, 'male')).toBeNull();
    expect(calculateBodyFatNavy(82, 38, -175, 0, 'male')).toBeNull();
  });

  it('fails closed for NaN / Infinity inputs', () => {
    expect(calculateBodyFatNavy(NaN, 38, 175, 0, 'male')).toBeNull();
    expect(calculateBodyFatNavy(82, Infinity, 175, 0, 'male')).toBeNull();
    expect(calculateBodyFatNavy(82, 38, 175, NaN, 'female')).toBeNull();
  });

  it('fails closed for the female branch when waist + hip <= neck', () => {
    expect(calculateBodyFatNavy(30, 90, 165, 40, 'female')).toBeNull();
  });

  it('never returns NaN across a hostile input grid', () => {
    const xs = [NaN, Infinity, -Infinity, 0, -5, 1, 50, 200, 1e6];
    for (const a of xs) {
      for (const b of xs) {
        for (const sex of ['male', 'female'] as const) {
          const r = calculateBodyFatNavy(a, b, 175, 100, sex);
          expect(finiteOrNull(r)).toBe(true);
        }
      }
    }
  });

  it('stays inside physiological bounds for plausible anatomy', () => {
    const r = calculateBodyFatNavy(82, 38, 178, 100, 'male');
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(3);
    expect(r!).toBeLessThan(60);
  });
});

// ============================================================================
// Body fat — Deurenberg (unit contract)
// ============================================================================

describe('ADVERSARIAL: Deurenberg body fat (unit contract)', () => {
  it('expects height in METRES: 82 kg / 1.78 m ≈ 21.8%', () => {
    expect(calculateBodyFatBmi(82, 1.78, 30, 'male')).toBeCloseTo(21.8, 0);
  });

  it('documents the unit trap: centimetres produce a non-physiological negative', () => {
    // Not a defect of this function (it documents metres) — a guard for callers
    // that forget to convert. Kept as executable documentation.
    expect(calculateBodyFatBmi(82, 178, 30, 'male')).toBeLessThan(0);
  });
});

// ============================================================================
// assessBodyComposition — the integration point the app actually calls
// ============================================================================

describe('ADVERSARIAL: assessBodyComposition integration (cm in, sane out)', () => {
  it('accepts height in cm and returns a plausible BMI-based estimate (the app calls it with cm)', () => {
    const comp = assessBodyComposition([mk('waist', 82)], 82, 178, 30, 'male');
    expect(comp.bodyFatNavy).toBeNull(); // no neck → Navy unavailable
    expect(comp.bodyFatBmi).not.toBeNull();
    expect(comp.bodyFatBmi!).toBeGreaterThan(3);
    expect(comp.bodyFatBmi!).toBeLessThan(60);
    expect(comp.confidence).toBe('low');
  });

  it('prefers the US Navy estimate when waist + neck + height exist', () => {
    const comp = assessBodyComposition(
      [mk('waist', 82), mk('neck', 38)],
      82, 178, 30, 'male',
    );
    expect(comp.method).toBe('US Navy');
    expect(comp.bodyFatNavy).toBeCloseTo(14.1, 0);
  });

  it('never yields NaN or Infinity in any numeric field', () => {
    const cases: Measurement[][] = [
      [],
      [mk('waist', 82)],
      [mk('waist', 0), mk('neck', 0), mk('hips', 0)],
      [mk('waist', NaN), mk('neck', NaN)],
      [mk('waist', 999), mk('neck', 1), mk('hips', 999)],
    ];
    for (const measurements of cases) {
      const comp = assessBodyComposition(measurements, 82, 178, 30, 'male');
      for (const field of ['bodyFatNavy', 'bodyFatBmi', 'bodyFatEstimate', 'leanMass', 'fatMass'] as const) {
        expect(finiteOrNull(comp[field])).toBe(true);
      }
    }
  });
});

// ============================================================================
// Health risk
// ============================================================================

describe('ADVERSARIAL: health risk', () => {
  it('classifies a healthy reference case correctly', () => {
    const r = assessHealthRisks(80, 175, 75, 30, 'male');
    expect(r.whtrStatus).toBe('healthy');
    expect(r.bmiCategory).toBe('normal');
    expect(r.overallRisk).toBe('low');
  });

  it('never throws on a hostile input sweep', () => {
    for (const h of [0, -1, NaN, Infinity]) {
      expect(() => assessHealthRisks(80, h, 75, 30, 'male')).not.toThrow();
    }
  });

  it.fails('KNOWN DEFECT: zero height yields NaN instead of a guarded result', () => {
    const r = assessHealthRisks(80, 0, 75, 30, 'male');
    expect(Number.isFinite(r.bmi)).toBe(true);
  });
});

// ============================================================================
// Progress prediction
// ============================================================================

describe('ADVERSARIAL: progress prediction (time axis + poisoned values)', () => {
  it('returns null for empty, one-point or all-non-finite series', () => {
    expect(predictProgress([], 'waist')).toBeNull();
    expect(predictProgress([mk('waist', 80)], 'waist')).toBeNull();
    expect(predictProgress([mk('waist', NaN, 1), mk('waist', NaN, 2)], 'waist')).toBeNull();
  });

  it('stays finite when every timestamp is identical (no divide-by-zero)', () => {
    const r = predictProgress([mkSameTime('waist', 100), mkSameTime('waist', 101), mkSameTime('waist', 102)], 'waist');
    expect(r).not.toBeNull();
    expect(Number.isFinite(r!.predicted)).toBe(true);
    expect(Number.isFinite(r!.ratePerWeek)).toBe(true);
    expect(r!.predicted).toBe(102); // no time axis → no change
    expect(r!.ratePerWeek).toBe(0);
  });

  it('ignores NaN values instead of poisoning the regression', () => {
    const r = predictProgress(
      [mk('waist', 100, 1), mk('waist', NaN, 2), mk('waist', 102, 3), mk('waist', 103, 4)],
      'waist',
    );
    expect(r).not.toBeNull();
    expect(Number.isFinite(r!.predicted)).toBe(true);
    expect(Number.isFinite(r!.confidence)).toBe(true);
  });

  it('keeps confidence within [0,1] for noisy data', () => {
    const noisy = [100, 130, 95, 128, 97, 133, 99].map((v, i) => mk('waist', v, i + 1));
    const r = predictProgress(noisy, 'waist', 30);
    expect(r!.confidence).toBeGreaterThanOrEqual(0);
    expect(r!.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Realistic projection (owner's "tortoise" model — 2026-10-08)
// ============================================================================

describe('ADVERSARIAL: realistic projection caps', () => {
  /** Same-day, hours-apart series — the case that produced a 681 cm chest. */
  function sameDay(type: string, values: number[]) {
    const base = Date.parse('2026-01-10T08:00:00.000Z');
    return values.map((value, i) => ({
      ...mk(type, value, 10),
      id: `${type}-h${i}`,
      timestamp: new Date(base + i * 3_600_000).toISOString(),
    }));
  }

  it('a compressed same-day import cannot explode the projection', () => {
    const r = predictProgress(sameDay('chest', [96, 98, 101]), 'chest', 30);
    expect(r).not.toBeNull();
    // The owner saw 681 cm here; a 30-day projection must stay within ±15 %.
    expect(r!.predicted).toBeLessThan(96 * 1.15);
    expect(r!.predicted).toBeGreaterThan(96 * 0.85);
    expect(Number.isFinite(r!.ratePerWeek)).toBe(true);
  });

  it('projects a plausible trend without inventing a linear future', () => {
    // ≈+0.45 cm/month of real chest growth, observed weekly over 3 weeks.
    const r = predictProgress([mk('chest', 96, 1), mk('chest', 96.105, 8), mk('chest', 96.21, 15), mk('chest', 96.315, 22)], 'chest', 30);
    const delta30 = r!.predicted - r!.current;
    expect(delta30).toBeGreaterThan(0.2);
    expect(delta30).toBeLessThan(0.6); // ≈0.72× of the monthly slope, decelerated
  });

  it('each extra month of projection adds LESS than the previous one (halving)', () => {
    const series = [mk('chest', 96, 1), mk('chest', 96.47, 8), mk('chest', 96.93, 15), mk('chest', 97.4, 22), mk('chest', 97.86, 28)];
    const d30 = predictProgress(series, 'chest', 30)!.predicted - 97.86;
    const d60 = predictProgress(series, 'chest', 60)!.predicted - 97.86;
    const d90 = predictProgress(series, 'chest', 90)!.predicted - 97.86;
    const m1 = d30;
    const m2 = d60 - d30;
    const m3 = d90 - d60;
    expect(m2).toBeLessThan(m1);
    expect(m3).toBeLessThan(m2);
    // Zeno: each stretch of progress roughly halves the next one (0.5 ideal;
    // 0.75 leaves room for the 0.1-unit display rounding).
    expect(m2 / m1).toBeLessThan(0.75);
    expect(m3 / m2).toBeLessThan(0.75);
    // And the whole projection stays physically bounded.
    expect(d90).toBeLessThan(97.86 * 0.15);
  });

  it('never reports a rate faster than the plausibility cap', () => {
    // 20 cm of "growth" in 10 days — garbage in, sane out.
    const r = predictProgress([mk('waist', 80, 1), mk('waist', 90, 5), mk('waist', 100, 10)], 'waist', 30);
    expect(r).not.toBeNull();
    // ratePerWeek is cm/week; the cap is 6 % of ~100 cm per 30 days.
    const monthlyCm = Math.abs(r!.ratePerWeek) * (30 / 7);
    expect(monthlyCm).toBeLessThanOrEqual(100 * 0.06 + 1e-6);
    expect(r!.predicted).toBeLessThanOrEqual(100 * 1.1);
  });
});

// ============================================================================
// Body age
// ============================================================================

describe('ADVERSARIAL: body age', () => {
  it('is finite for a normal case and its components cover 100% weight', () => {
    const r = calculateBodyAge(30, 0.47, 24, [mk('waist', 80)], 0.8);
    expect(Number.isFinite(r.bodyAge)).toBe(true);
    const total = r.components.reduce((s, c) => s + c.contribution, 0);
    expect(total).toBeCloseTo(1, 2);
  });

  it('clamps the floor at 15 even for extreme nutrition data', () => {
    expect(calculateBodyAge(20, 0.8, 45, [], 0).bodyAge).toBeGreaterThanOrEqual(15);
  });

  it.fails('KNOWN DEFECT: NaN chronological age propagates into bodyAge', () => {
    expect(Number.isFinite(calculateBodyAge(NaN, 0.47, 24, [], 0.8).bodyAge)).toBe(true);
  });
});

// ============================================================================
// Correlation
// ============================================================================

describe('ADVERSARIAL: correlation engine', () => {
  it('returns null below 3 paired samples', () => {
    expect(calculateCorrelation([mk('waist', 80, 1), mk('chest', 100, 1)], 'waist', 'chest')).toBeNull();
  });

  it('returns null for a constant series (zero variance → zero denominator)', () => {
    const series = [1, 2, 3].flatMap(d => [mk('waist', 80, d), mk('chest', 100, d)]);
    expect(calculateCorrelation(series, 'waist', 'chest')).toBeNull();
  });

  it('detects a perfect monotonic relationship', () => {
    const series = [1, 2, 3, 4].flatMap(d => [mk('waist', 80 + d, d), mk('chest', 100 + 2 * d, d)]);
    const r = calculateCorrelation(series, 'waist', 'chest');
    expect(r).not.toBeNull();
    expect(Math.abs(r!.coefficient)).toBeGreaterThan(0.99);
  });

  it('findCorrelations tolerates an empty type list and hostile pairs', () => {
    expect(findCorrelations([], [])).toEqual([]);
    expect(() => findCorrelations([mk('waist', NaN, 1)], ['waist', 'chest'])).not.toThrow();
  });
});
