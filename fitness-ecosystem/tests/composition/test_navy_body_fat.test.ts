/**
 * US Navy tape-only body-fat estimation — unit + adversarial tests.
 *
 * Expectations are recomputed BY HAND from the published Hodgdon & Beckett
 * (1984) metric equations — the test copies the constants, not the code path,
 * and pins the exact rounded outputs.
 *
 * @module tests/composition/navy-body-fat
 */

import { describe, it, expect } from 'vitest';
import { estimateBodyFatNavy, NAVY_SEE_PCT } from '../../bodylab/core/composition/src';

describe('Navy body-fat: published-equation anchors (recomputed by hand)', () => {
  it('male 180cm / neck 38 / waist 85 → 16.1%', () => {
    // diff=47 → log10=1.672098; log10(180)=2.255273
    // D = 1.0324 − 0.19077·1.672098 + 0.15456·2.255273 = 1.061988
    // %BF = 495/1.061988 − 450 = 16.107 → 16.1
    const r = estimateBodyFatNavy({ heightCm: 180, neckCm: 38, waistCm: 85, sex: 'male' });
    expect(r).not.toBeNull();
    expect(r!.bodyFatPct).toBe(16.1);
    expect(r!.bodyDensity).toBeCloseTo(1.06199, 4);
    expect(r!.usedInputs.hipCm).toBeNull();
    expect(r!.standardError).toBe(NAVY_SEE_PCT);
    expect(r!.provenance).toContain('Hodgdon');
  });

  it('female 165cm / neck 32 / waist 72 / hip 98 → 27.4%', () => {
    // sum=72+98−32=138 → log10=2.139948; log10(165)=2.217484
    // D = 1.29579 − 0.35004·2.139948 + 0.221·2.217484 = 1.036787
    // %BF = 495/1.036787 − 450 = 27.437 → 27.4
    const r = estimateBodyFatNavy({ heightCm: 165, neckCm: 32, waistCm: 72, hipCm: 98, sex: 'female' });
    expect(r).not.toBeNull();
    expect(r!.bodyFatPct).toBe(27.4);
    expect(r!.bodyDensity).toBeCloseTo(1.03679, 4);
    expect(r!.usedInputs.hipCm).toBe(98);
  });

  it('the female equation NEEDS the hip; the male equation ignores it', () => {
    expect(estimateBodyFatNavy({ heightCm: 165, neckCm: 32, waistCm: 72, sex: 'female' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 165, neckCm: 32, waistCm: 72, hipCm: null, sex: 'female' })).toBeNull();
    // Male: hip present but irrelevant — same result either way.
    const withHip = estimateBodyFatNavy({ heightCm: 180, neckCm: 38, waistCm: 85, hipCm: 99, sex: 'male' });
    const withoutHip = estimateBodyFatNavy({ heightCm: 180, neckCm: 38, waistCm: 85, sex: 'male' });
    expect(withHip!.bodyFatPct).toBe(withoutHip!.bodyFatPct);
  });

  it('monotone: fatter waists raise %BF, thicker necks and taller bodies lower it', () => {
    let prevWaist = -Infinity;
    let prevNeck = Infinity;
    let prevHeight = Infinity;
    for (let w = 70; w <= 140; w += 5) {
      const v = estimateBodyFatNavy({ heightCm: 180, neckCm: 38, waistCm: w, sex: 'male' })!.bodyFatPct;
      expect(v).toBeGreaterThan(prevWaist);
      prevWaist = v;
    }
    for (let n = 33; n <= 48; n += 2) {
      const v = estimateBodyFatNavy({ heightCm: 180, neckCm: n, waistCm: 90, sex: 'male' })!.bodyFatPct;
      expect(v).toBeLessThan(prevNeck);
      prevNeck = v;
    }
    for (let h = 160; h <= 200; h += 5) {
      const v = estimateBodyFatNavy({ heightCm: h, neckCm: 38, waistCm: 90, sex: 'male' })!.bodyFatPct;
      expect(v).toBeLessThan(prevHeight);
      prevHeight = v;
    }
  });
});

describe('Navy body-fat: adversarial domain guards', () => {
  it('waist ≤ neck breaks the male log argument → null, never NaN', () => {
    expect(estimateBodyFatNavy({ heightCm: 180, neckCm: 85, waistCm: 85, sex: 'male' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 180, neckCm: 90, waistCm: 85, sex: 'male' })).toBeNull();
    // Female: the SUM must stay positive — pathological neck kills it too.
    expect(estimateBodyFatNavy({ heightCm: 165, neckCm: 180, waistCm: 72, hipCm: 98, sex: 'female' })).toBeNull();
  });

  it('every hostile input returns null without throwing', () => {
    const hostile = [NaN, Infinity, -Infinity, 0, -50, 1e9];
    for (const h of hostile) {
      expect(estimateBodyFatNavy({ heightCm: h, neckCm: 38, waistCm: 85, sex: 'male' })).toBeNull();
      expect(estimateBodyFatNavy({ heightCm: 180, neckCm: h, waistCm: 85, sex: 'male' })).toBeNull();
      expect(estimateBodyFatNavy({ heightCm: 180, neckCm: 38, waistCm: h, sex: 'male' })).toBeNull();
      expect(estimateBodyFatNavy({ heightCm: 165, neckCm: 32, waistCm: 72, hipCm: h, sex: 'female' })).toBeNull();
    }
  });

  it('physiological domains: out-of-range circumferences and impossible outputs are rejected', () => {
    expect(estimateBodyFatNavy({ heightCm: 40, neckCm: 38, waistCm: 85, sex: 'male' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 300, neckCm: 38, waistCm: 85, sex: 'male' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 180, neckCm: 10, waistCm: 85, sex: 'male' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 180, neckCm: 70, waistCm: 85, sex: 'male' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 180, neckCm: 38, waistCm: 30, sex: 'male' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 180, neckCm: 38, waistCm: 250, sex: 'male' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 165, neckCm: 32, waistCm: 72, hipCm: 40, sex: 'female' })).toBeNull();
    expect(estimateBodyFatNavy({ heightCm: 165, neckCm: 32, waistCm: 72, hipCm: 300, sex: 'female' })).toBeNull();
  });

  it('density outside the physical window (0.9, 1.12) is rejected — no negative %BF', () => {
    // Extreme linearity: tall, thin-necked, tiny waist → density would exceed 1.12? The
    // equation saturates near 1.09; force it with an implausible-but-in-domain combo:
    // height 250, neck 55, waist 56 → diff=1 → log10(1)=0 → D=1.0324+0.15456·log10(250)=1.0324+0.37333=1.4057
    // → outside the window → null (the raw equation would give −175% "fat").
    expect(estimateBodyFatNavy({ heightCm: 250, neckCm: 55, waistCm: 56, sex: 'male' })).toBeNull();
  });
});
