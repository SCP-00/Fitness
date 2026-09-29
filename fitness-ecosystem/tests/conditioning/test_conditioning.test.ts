/**
 * Conditioning package — normative classification unit tests.
 *
 * Boundaries are asserted from the PRIMARY published tables (Cooper 1968 via
 * BrianMac; ACE adult body-fat; Jackson-Pollock 3-site + Siri), not from a
 * re-implementation: a test that copies the table proves nothing — a test
 * that pins the published cut-offs catches table transcription errors.
 *
 * @module tests/conditioning
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
  JP3_SITES,
  siriBodyFat,
  buildConditioningProfile,
} from '../../bodylab/core/conditioning/src';

// ── Cooper 1968 canonical boundaries ───────────────────────────────────────

describe('Cooper 12-min test classification (Cooper 1968 table)', () => {
  it('pins the published male 20-29 cut-offs', () => {
    // Table (male 20-29): excellent >2800, above 2400-2799, average 2200-2399,
    // below 1600-2199, poor <1600.
    expect(classifyCooperTest(2801, 25, 'male')?.band).toBe('excellent');
    expect(classifyCooperTest(2400, 25, 'male')?.band).toBe('above_average');
    expect(classifyCooperTest(2200, 25, 'male')?.band).toBe('average');
    expect(classifyCooperTest(1600, 25, 'male')?.band).toBe('below_average');
    expect(classifyCooperTest(1599, 25, 'male')?.band).toBe('poor');
  });

  it('pins the published female 20-29 cut-offs', () => {
    expect(classifyCooperTest(2701, 25, 'female')?.band).toBe('excellent');
    expect(classifyCooperTest(2200, 25, 'female')?.band).toBe('above_average');
    expect(classifyCooperTest(1800, 25, 'female')?.band).toBe('average');
    expect(classifyCooperTest(1500, 25, 'female')?.band).toBe('below_average');
    expect(classifyCooperTest(1499, 25, 'female')?.band).toBe('poor');
  });

  it('age keys follow the source table (17-19 male / 17-20 female asymmetry)', () => {
    expect(cooperAgeKey(19, 'male')).toBe('17-19');
    expect(cooperAgeKey(20, 'male')).toBe('20-29');
    expect(cooperAgeKey(20, 'female')).toBe('17-20');
    expect(cooperAgeKey(21, 'female')).toBe('20-29');
    expect(cooperAgeKey(49, 'male')).toBe('40-49');
    expect(cooperAgeKey(50, 'male')).toBe('50+');
  });

  it('older tables correctly cap the distances (male 50+ excellent starts at 2400)', () => {
    expect(classifyCooperTest(2401, 60, 'male')?.band).toBe('excellent');
    expect(classifyCooperTest(2399, 60, 'male')?.band).toBe('above_average');
  });

  it('source provenance is attached for UI citation', () => {
    expect(classifyCooperTest(2400, 25, 'male')?.source).toContain('Cooper');
  });

  it('rejects non-positive, non-finite and physically impossible distances', () => {
    expect(classifyCooperTest(0, 25, 'male')).toBeNull();
    expect(classifyCooperTest(-100, 25, 'male')).toBeNull();
    expect(classifyCooperTest(NaN, 25, 'male')).toBeNull();
    expect(classifyCooperTest(Infinity, 25, 'male')).toBeNull();
    expect(classifyCooperTest(2500, NaN, 'male')).toBeNull();
    expect(classifyCooperTest(5001, 25, 'male')).toBeNull();
  });

  it('VO2max estimation matches the Cooper formula and rejects garbage', () => {
    // (3000 - 504.9) / 44.73 ≈ 55.75 → the package rounds to 1 decimal = 55.8
    expect(estimateVo2maxFromCooper(3000)).toBeCloseTo(55.8, 1);
    expect(estimateVo2maxFromCooper(0)).toBeNull();
    expect(estimateVo2maxFromCooper(-50)).toBeNull();
  });
});

// ── Resting HR ──────────────────────────────────────────────────────────────

describe('resting heart rate classification', () => {
  it('pins the adult bands', () => {
    expect(classifyRestingHeartRate(52)?.band).toBe('excellent');
    expect(classifyRestingHeartRate(58)?.band).toBe('above_average');
    expect(classifyRestingHeartRate(65)?.band).toBe('average');
    expect(classifyRestingHeartRate(75)?.band).toBe('below_average');
    expect(classifyRestingHeartRate(95)?.band).toBe('poor');
  });

  it('rejects physiologically impossible readings', () => {
    expect(classifyRestingHeartRate(0)).toBeNull();
    expect(classifyRestingHeartRate(29)).toBeNull();
    expect(classifyRestingHeartRate(221)).toBeNull();
    expect(classifyRestingHeartRate(NaN)).toBeNull();
  });
});

// ── Measured body fat (ACE) ────────────────────────────────────────────────

describe('measured body-fat classification (ACE bands)', () => {
  it('pins the male athletic/fitness/acceptable/obese boundaries', () => {
    expect(classifyMeasuredBodyFat(6, 'male')?.band).toBe('excellent');
    expect(classifyMeasuredBodyFat(13.9, 'male')?.band).toBe('excellent');
    expect(classifyMeasuredBodyFat(14, 'male')?.band).toBe('above_average');
    expect(classifyMeasuredBodyFat(24.9, 'male')?.band).toBe('average');
    expect(classifyMeasuredBodyFat(25, 'male')?.band).toBe('poor');
  });

  it('pins the female boundaries', () => {
    expect(classifyMeasuredBodyFat(14, 'female')?.band).toBe('excellent');
    expect(classifyMeasuredBodyFat(21, 'female')?.band).toBe('above_average');
    expect(classifyMeasuredBodyFat(31.9, 'female')?.band).toBe('average');
    expect(classifyMeasuredBodyFat(32, 'female')?.band).toBe('poor');
  });

  it('rejects below-essential-fat as measurement error, per sex', () => {
    expect(classifyMeasuredBodyFat(1.9, 'male')).toBeNull();
    expect(classifyMeasuredBodyFat(7.9, 'female')).toBeNull();
  });
});

// ── Abdominal skinfold + J-P/Siri ──────────────────────────────────────────

describe('abdominal skinfold and Jackson-Pollock pipeline', () => {
  it('classifies the abdominal site by sex', () => {
    expect(classifyAbdominalSkinfold(10, 'male')?.band).toBe('excellent');
    expect(classifyAbdominalSkinfold(15, 'male')?.band).toBe('above_average');
    expect(classifyAbdominalSkinfold(20, 'male')?.band).toBe('average');
    expect(classifyAbdominalSkinfold(30, 'male')?.band).toBe('poor');
    expect(classifyAbdominalSkinfold(13, 'female')?.band).toBe('excellent');
    expect(classifyAbdominalSkinfold(22, 'female')?.band).toBe('average');
  });

  it('rejects impossible caliper readings', () => {
    expect(classifyAbdominalSkinfold(2.9, 'male')).toBeNull();
    expect(classifyAbdominalSkinfold(80.1, 'male')).toBeNull();
  });

  it('J-P 3-site density + Siri produce a sane %BF for a lean male', () => {
    // chest 8, abdomen 12, thigh 12 → Σ=32; age 25
    const density = jacksonPollockBodyDensity(8, 12, 12, 25, 'male');
    expect(density).not.toBeNull();
    const pct = siriBodyFat(density!, 'male');
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(4);
    expect(pct!).toBeLessThan(14);
  });

  it('Siri is the exact published equation', () => {
    expect(siriBodyFat(1.05, 'male')).toBeCloseTo(21.4, 0);
    expect(siriBodyFat(1.03, 'female')).toBeCloseTo(495 / 1.03 - 450, 1);
  });

  it('hostile sums and essential-fat-violating sums cannot produce a value', () => {
    // Σ=3 mm → density 1.0979 → Siri %BF = −4.2: impossible physiology → null.
    expect(jacksonPollockBodyDensity(1, 1, 1, 25, 'male')).toBeNull();
    expect(jacksonPollockBodyDensity(0, 0, 0, 25, 'male')).toBeNull();
    expect(jacksonPollockBodyDensity(NaN, 10, 10, 25, 'male')).toBeNull();
    // A negative site must not hide inside an "acceptable" sum.
    expect(jacksonPollockBodyDensity(-10, 20, 20, 25, 'male')).toBeNull();
    // Site cap: 81 mm is beyond any caliper domain.
    expect(jacksonPollockBodyDensity(80, 80, 81, 25, 'male')).toBeNull();
  });

  it('the extreme plausible boundary (Σ=240 mm) is accepted with a sane obese %BF', () => {
    const density = jacksonPollockBodyDensity(80, 80, 80, 25, 'male');
    expect(density).toBeCloseTo(0.9967, 3);
    const pct = siriBodyFat(density!, 'male');
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(40);
    expect(pct!).toBeLessThan(50);
  });
});

// ── Aggregated profile ─────────────────────────────────────────────────────

describe('aggregate conditioning profile', () => {
  it('averages only classified axes and counts them', () => {
    const profile = buildConditioningProfile(
      { cooper12mMeters: 2400, restingHeartRateBpm: 58 },
      25,
      'male'
    );
    expect(profile.classifiedCount).toBe(2);
    expect(profile.conditioningScore).toBe(
      Math.round((classifyCooperTest(2400, 25, 'male')!.score + classifyRestingHeartRate(58)!.score) / 2)
    );
    expect(profile.measuredBodyFat).toBeNull();
    expect(profile.jacksonPollockBodyFatPct).toBeNull();
  });

  it('empty inputs give an empty profile, not zeros', () => {
    const profile = buildConditioningProfile({}, 30, 'female');
    expect(profile.conditioningScore).toBeNull();
    expect(profile.classifiedCount).toBe(0);
  });

  it('full input set classifies all four axes + computes J-P %BF', () => {
    const profile = buildConditioningProfile(
      {
        cooper12mMeters: 2500,
        restingHeartRateBpm: 62,
        measuredBodyFatPct: 15,
        abdominalSkinfoldMm: 14,
        chestSkinfoldMm: 10,
        thighSkinfoldMm: 15,
      },
      28,
      'male'
    );
    expect(profile.classifiedCount).toBe(4);
    expect(profile.cooper?.vo2max).toBeGreaterThan(0);
    expect(profile.jacksonPollockBodyFatPct).toBeGreaterThan(4);
    expect(profile.jacksonPollockBodyFatPct!).toBeLessThan(20);
  });
});

// ── Jackson-Pollock 3-site FEMALE protocol (JPW 1980) ──────────────────────

describe('Jackson-Pollock 3-site female protocol (triceps/suprailiac/thigh)', () => {
  it('pins the published JPW 1980 female equation (Σ=48 → D=1.05713 → 18.2%)', () => {
    // D = 1.0994921 − 0.0009929·48 + 0.0000023·48² = 1.0571321 (exactly);
    // Siri: 495/1.0571321 − 450 = 18.248 → 18.2.
    const density = jacksonPollockBodyDensity(14, 16, 18, 30, 'female');
    expect(density).toBeCloseTo(1.05713, 5);
    const pct = siriBodyFat(density!, 'female');
    expect(pct).toBeCloseTo(18.2, 1);
  });

  it('produces a sane lean-female %BF (Σ=24 → ~9.6%)', () => {
    // D = 1.0994921 − 0.0009929·24 + 0.0000023·576 = 1.0769873 → 9.6%.
    const density = jacksonPollockBodyDensity(8, 6, 10, 25, 'female');
    expect(density).toBeCloseTo(1.07699, 4);
    const pct = jacksonPollockBodyFatPct(8, 6, 10, 25, 'female');
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(8); // above female essential fat
    expect(pct!).toBeLessThan(15);
  });

  it('the female equation has NO age term, but age is still validated', () => {
    for (const age of [18, 22, 45, 70]) {
      expect(jacksonPollockBodyFatPct(14, 16, 18, age, 'female')).toBeCloseTo(18.2, 1);
    }
    expect(jacksonPollockBodyFatPct(14, 16, 18, NaN, 'female')).toBeNull();
    expect(jacksonPollockBodyFatPct(14, 16, 18, 0, 'female')).toBeNull();
  });

  it('sums below female essential fat reject: Σ=19 → null, Σ=20 → 8.1%', () => {
    // Σ=19 → D=1.08146 → Siri 7.7% < 8% female essential fat → error, not a result.
    expect(jacksonPollockBodyFatPct(5, 5, 9, 25, 'female')).toBeNull();
    // Σ=20 → D=1.08055 → 8.098 → 8.1%: the first physiologically possible value.
    expect(jacksonPollockBodyFatPct(5, 5, 10, 25, 'female')).toBeCloseTo(8.1, 1);
  });

  it('the female protocol sites are triceps/suprailiac/thigh (fat-storage argument)', () => {
    expect(JP3_SITES.female).toEqual(['triceps', 'suprailiac', 'thigh']);
    expect(JP3_SITES.male).toEqual(['chest', 'abdomen', 'thigh']);
  });

  it('the full pipeline is exactly density → Siri, in protocol order', () => {
    const viaPipeline = jacksonPollockBodyFatPct(14, 16, 18, 30, 'female');
    const density = jacksonPollockBodyDensity(14, 16, 18, 30, 'female');
    expect(viaPipeline).toBe(siriBodyFat(density!, 'female'));
  });

  it('the aggregate profile exposes the female axis only when female sites exist', () => {
    const profile = buildConditioningProfile(
      { tricepsSkinfoldMm: 14, suprailiacSkinfoldMm: 16, thighSkinfoldMm: 18 },
      30,
      'female'
    );
    expect(profile.jacksonPollockFemaleBodyFatPct).toBeCloseTo(18.2, 1);
    expect(profile.jacksonPollockBodyFatPct).toBeNull(); // male sites absent

    const withThighOnly = buildConditioningProfile(
      { tricepsSkinfoldMm: 14, suprailiacSkinfoldMm: 16 },
      30,
      'female'
    );
    expect(withThighOnly.jacksonPollockFemaleBodyFatPct).toBeNull();
  });
});
