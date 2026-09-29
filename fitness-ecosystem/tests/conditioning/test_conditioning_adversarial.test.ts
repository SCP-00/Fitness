/**
 * Adversarial (zero-trust) tests for the conditioning package.
 *
 * Feeds hostile, degenerate and boundary inputs into every classifier and
 * asserts the domain guards hold: no NaN, no Infinity, no negative
 * physiological nonsense, no classification outside the published tables.
 *
 * @module tests/conditioning/adversarial
 */

import { describe, it, expect } from 'vitest';
import {
  classifyCooperTest,
  cooperAgeKey,
  estimateVo2maxFromCooper,
  classifyRestingHeartRate,
  classifyMeasuredBodyFat,
  classifyAbdominalSkinfold,
  jacksonPollockBodyDensity,
  jacksonPollockBodyFatPct,
  siriBodyFat,
  buildConditioningProfile,
} from '../../bodylab/core/conditioning/src';

describe('adversarial: Cooper classifier domain guards', () => {
  it('never classifies zero/negative/NaN/±Infinity distances', () => {
    for (const hostile of [0, -1, NaN, Infinity, -Infinity, 1e308]) {
      expect(classifyCooperTest(hostile, 25, 'male')).toBeNull();
    }
  });

  it('physically impossible distances are errors, not "excellent" results', () => {
    // No human covers >5000 m in 12 minutes; a data-entry typo (extra digit)
    // must not be laundered into a top score.
    expect(classifyCooperTest(5001, 25, 'male')).toBeNull();
    expect(classifyCooperTest(1e6, 25, 'female')).toBeNull();
    expect(classifyCooperTest(5000, 25, 'male')?.band).toBe('excellent');
  });

  it('rejects hostile ages', () => {
    for (const age of [0, -5, NaN, Infinity]) {
      expect(classifyCooperTest(2500, age, 'male')).toBeNull();
    }
  });

  it('every band boundary transitions upward, never downward (table monotonicity)', () => {
    const rank: Record<string, number> = {
      poor: 0, below_average: 1, average: 2, above_average: 3, excellent: 4,
    };
    const distances = [1200, 1500, 1600, 1900, 2100, 2200, 2400, 2700, 2800, 3000, 3500, 5000];
    for (const sex of ['male', 'female'] as const) {
      for (const age of [14, 16, 19, 25, 35, 45, 55]) {
        let prev = -1;
        for (const d of distances) {
          const r = classifyCooperTest(d, age, sex);
          expect(r).not.toBeNull();
          expect(rank[r!.band]).toBeGreaterThanOrEqual(prev);
          prev = rank[r!.band];
        }
      }
    }
  });

  it('VO2max estimate is positive, bounded and monotonically non-decreasing', () => {
    let prev = 0;
    for (const d of [1000, 1600, 2200, 2800, 3500, 5000]) {
      const v = estimateVo2maxFromCooper(d);
      expect(v).not.toBeNull();
      expect(v!).toBeGreaterThan(0);
      expect(v!).toBeLessThan(120);
      expect(v!).toBeGreaterThanOrEqual(prev);
      prev = v!;
    }
    expect(estimateVo2maxFromCooper(NaN)).toBeNull();
    expect(estimateVo2maxFromCooper(-1)).toBeNull();
  });
});

describe('adversarial: resting HR and body fat domain guards', () => {
  it('resting HR rejects the impossible domain', () => {
    for (const bpm of [-60, 0, 29, 29.9, 220.1, 221, 400, NaN, Infinity, -Infinity]) {
      expect(classifyRestingHeartRate(bpm)).toBeNull();
    }
  });

  it('measured body fat rejects sub-essential-fat and absurd values, per sex', () => {
    expect(classifyMeasuredBodyFat(1.9, 'male')).toBeNull();
    expect(classifyMeasuredBodyFat(2, 'male')?.band).toBe('excellent'); // boundary ok
    expect(classifyMeasuredBodyFat(7.9, 'female')).toBeNull();
    expect(classifyMeasuredBodyFat(8, 'female')?.band).toBe('excellent');
    for (const hostile of [70.1, 500, NaN, Infinity, -Infinity, 0]) {
      expect(classifyMeasuredBodyFat(hostile, 'male')).toBeNull();
      expect(classifyMeasuredBodyFat(hostile, 'female')).toBeNull();
    }
  });

  it('skinfold rejects the impossible caliper domain', () => {
    for (const mm of [0, 2.9, 80.1, 500, NaN, Infinity, -Infinity]) {
      expect(classifyAbdominalSkinfold(mm, 'male')).toBeNull();
      expect(classifyAbdominalSkinfold(mm, 'female')).toBeNull();
    }
  });
});

describe('adversarial: Jackson-Pollock + Siri cannot emit physiological nonsense', () => {
  it('density is always in the (0.9, 1.12) window or null', () => {
    const sums: [number, number, number][] = [
      [3, 3, 3], [5, 5, 5], [10, 10, 10], [30, 30, 30], [60, 60, 60], [80, 80, 79],
    ];
    for (const [c, a, t] of sums) {
      for (const sex of ['male', 'female'] as const) {
        for (const age of [18, 40, 70]) {
          const d = jacksonPollockBodyDensity(c, a, t, age, sex);
          if (d !== null) {
            expect(d).toBeGreaterThan(0.9);
            expect(d).toBeLessThan(1.12);
            const pct = siriBodyFat(d, sex);
            expect(pct).not.toBeNull();
            expect(pct!).toBeGreaterThan(0);
            expect(pct!).toBeLessThan(70);
          }
        }
      }
    }
  });

  it('out-of-domain sums return null, never a negative density', () => {
    expect(jacksonPollockBodyDensity(0, 0, 0, 25, 'male')).toBeNull();
    expect(jacksonPollockBodyDensity(80, 80, 81, 25, 'male')).toBeNull(); // Σ>240
    expect(jacksonPollockBodyDensity(NaN, 10, 10, 25, 'male')).toBeNull();
    expect(jacksonPollockBodyDensity(10, NaN, 10, 25, 'male')).toBeNull();
    expect(jacksonPollockBodyDensity(10, 10, 10, NaN, 'male')).toBeNull();
    expect(jacksonPollockBodyDensity(10, 10, 10, 0, 'male')).toBeNull();
    expect(jacksonPollockBodyDensity(-10, 20, 20, 25, 'male')).toBeNull();
  });

  it('Siri rejects densities outside the physical window', () => {
    expect(siriBodyFat(0.89, 'male')).toBeNull();
    expect(siriBodyFat(1.12, 'male')).toBeNull();
    expect(siriBodyFat(NaN, 'male')).toBeNull();
    expect(siriBodyFat(Infinity, 'male')).toBeNull();
  });

  it('Siri floors outputs at sex-specific essential fat: impossible physiology is null', () => {
    // 495/1.1 − 450 = 0% fat — below essential fat for BOTH sexes → error.
    expect(siriBodyFat(1.1, 'male')).toBeNull();
    expect(siriBodyFat(1.1, 'female')).toBeNull();
    // 495/(495/455) − 450 = 5%: possible for men, impossible for women.
    expect(siriBodyFat(495 / 455, 'male')).toBeCloseTo(5, 1);
    expect(siriBodyFat(495 / 455, 'female')).toBeNull();
  });

  it('the aggregate profile never inherits NaN from hostile inputs', () => {
    const profile = buildConditioningProfile(
      {
        cooper12mMeters: NaN,
        restingHeartRateBpm: NaN,
        measuredBodyFatPct: NaN,
        abdominalSkinfoldMm: NaN,
        chestSkinfoldMm: NaN,
        thighSkinfoldMm: NaN,
      },
      NaN,
      'male'
    );
    expect(profile.conditioningScore).toBeNull();
    expect(profile.classifiedCount).toBe(0);
    expect(profile.cooper).toBeNull();
    expect(profile.jacksonPollockBodyFatPct).toBeNull();
  });

  it('huge values cannot poison the aggregate score', () => {
    const profile = buildConditioningProfile(
      { cooper12mMeters: 1e9, restingHeartRateBpm: 1e9, measuredBodyFatPct: 1e9, abdominalSkinfoldMm: 1e9 },
      25,
      'male'
    );
    // All four inputs are outside physiological domains → nothing classifiable.
    expect(profile.classifiedCount).toBe(0);
    expect(profile.conditioningScore).toBeNull();
  });
});

describe('adversarial: Jackson-Pollock FEMALE protocol (JPW 1980) domain guards', () => {
  it('female densities always land in the (0.9, 1.12) window or null', () => {
    const triples: [number, number, number][] = [
      [3, 3, 3], [5, 5, 5], [10, 10, 10], [14, 16, 18], [30, 30, 30], [60, 60, 60], [80, 79, 80],
    ];
    for (const [t, s, th] of triples) {
      for (const age of [18, 40, 70]) {
        const d = jacksonPollockBodyDensity(t, s, th, age, 'female');
        if (d !== null) {
          expect(d).toBeGreaterThan(0.9);
          expect(d).toBeLessThan(1.12);
          const pct = siriBodyFat(d, 'female');
          expect(pct).not.toBeNull();
          expect(pct!).toBeGreaterThanOrEqual(8); // female essential fat
          expect(pct!).toBeLessThan(70);
        }
      }
    }
  });

  it('every hostile site/age input returns null — female path included', () => {
    expect(jacksonPollockBodyFatPct(0, 10, 10, 25, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(10, 0, 10, 25, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(10, 10, 0, 25, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(-10, 16, 18, 25, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(2.9, 16, 18, 25, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(80, 80, 81, 25, 'female')).toBeNull(); // Σ>240
    expect(jacksonPollockBodyFatPct(10, NaN, 10, 25, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(10, 10, Infinity, 25, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(10, 10, 10, NaN, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(10, 10, 10, -1, 'female')).toBeNull();
  });

  it('the profile never inherits NaN from hostile FEMALE-protocol inputs', () => {
    const profile = buildConditioningProfile(
      {
        tricepsSkinfoldMm: NaN,
        suprailiacSkinfoldMm: NaN,
        thighSkinfoldMm: NaN,
      },
      NaN,
      'female'
    );
    expect(profile.jacksonPollockFemaleBodyFatPct).toBeNull();
    expect(profile.jacksonPollockBodyFatPct).toBeNull();
    expect(profile.conditioningScore).toBeNull();
  });

  it('a hostile female-protocol input cannot poison a valid MALE pipeline (and vice versa)', crossSexProtectionTest);

  function crossSexProtectionTest() {
    const profile = buildConditioningProfile(
      {
        tricepsSkinfoldMm: 1e9,
        suprailiacSkinfoldMm: 1e9,
        chestSkinfoldMm: 8,
        abdominalSkinfoldMm: 12,
        thighSkinfoldMm: 12, // thigh is the site common to BOTH protocols
      },
      25,
      'male'
    );
    // The hostile female-site values must not affect the male pipeline...
    expect(profile.jacksonPollockBodyFatPct).not.toBeNull();
    // ...and the female axis simply stays null (thigh companion missing).
    expect(profile.jacksonPollockFemaleBodyFatPct).toBeNull();
  }
});