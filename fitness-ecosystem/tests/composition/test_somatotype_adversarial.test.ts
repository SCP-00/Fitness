/**
 * Somatotype — adversarial (zero-trust) tests.
 *
 * Attacks the classifier with hostile inputs and proves global invariants:
 * no NaN/Infinity ever escapes, no thrown errors cross the boundary, the
 * output triple stays inside the documented scale ceilings on a dense valid
 * grid, the display string always round-trips, and the category grammar is
 * consistent with the component values.
 *
 * @module tests/composition/somatotype-adversarial
 */

import { describe, it, expect } from 'vitest';
import {
  classifySomatotype,
  calculateEndomorphy,
  calculateEctomorphy,
  categorizeSomatotype,
} from '../../bodylab/core/composition/src';
import { classifyMeasuredBodyFat } from '../../bodylab/core/conditioning/src';

const VALID_CATEGORIES = [
  'central',
  'balanced_mesomorph',
  'balanced_endomorph',
  'balanced_ectomorph',
  'mesomorphic_endomorph',
  'ectomorphic_endomorph',
  'endomorphic_mesomorph',
  'ectomorphic_mesomorph',
  'endomorphic_ectomorph',
  'mesomorphic_ectomorph',
  'mesomorph_endomorph',
  'mesomorph_ectomorph',
  'endomorph_ectomorph',
] as const;

// [SECTION-1]

describe('adversarial: classifySomatotype never throws, never returns NaN', () => {
  it('survives every hostile input combination with null', () => {
    const hostile = [NaN, Infinity, -Infinity, -1, 0, 1e9, -1e9, 1e308];
    for (const h of hostile) {
      expect(() => classifySomatotype({ heightCm: h, weightKg: 70, bodyFatPct: 15, sex: 'male', wristCm: 17 })).not.toThrow();
      expect(classifySomatotype({ heightCm: h, weightKg: 70, bodyFatPct: 15, sex: 'male', wristCm: 17 })).toBeNull();
      expect(() => classifySomatotype({ heightCm: 175, weightKg: h, bodyFatPct: 15, sex: 'male', wristCm: 17 })).not.toThrow();
      expect(classifySomatotype({ heightCm: 175, weightKg: h, bodyFatPct: 15, sex: 'male', wristCm: 17 })).toBeNull();
      expect(() => classifySomatotype({ heightCm: 175, weightKg: 70, bodyFatPct: h, sex: 'male', wristCm: 17 })).not.toThrow();
      expect(classifySomatotype({ heightCm: 175, weightKg: 70, bodyFatPct: h, sex: 'male', wristCm: 17 })).toBeNull();
      expect(() => classifySomatotype({ heightCm: 175, weightKg: 70, bodyFatPct: 15, sex: 'male', wristCm: h })).not.toThrow();
      expect(classifySomatotype({ heightCm: 175, weightKg: 70, bodyFatPct: 15, sex: 'male', wristCm: h })).toBeNull();
    }
  });

  it('every result on a dense valid grid stays inside the documented scale ceilings', () => {
    for (let h = 60; h <= 250; h += 5) {
      for (let w = 25; w <= 200; w += 5) {
        for (const bf of [2, 5, 8, 12, 16, 20, 25, 30, 40, 55, 70]) {
          for (const sex of ['male', 'female'] as const) {
            const floor = sex === 'male' ? 2 : 8;
            if (bf < floor) {
              expect(classifySomatotype({ heightCm: h, weightKg: w, bodyFatPct: bf, sex })).toBeNull();
              continue;
            }
            const r = classifySomatotype({ heightCm: h, weightKg: w, bodyFatPct: bf, sex, wristCm: 17 });
            expect(r).not.toBeNull();
            expect(r!.endomorphy).toBeGreaterThanOrEqual(0.5);
            expect(r!.endomorphy).toBeLessThanOrEqual(16);
            expect(r!.mesomorphy).toBeGreaterThanOrEqual(2);
            expect(r!.mesomorphy).toBeLessThanOrEqual(6.5);
            expect(r!.ectomorphy).toBeGreaterThanOrEqual(0);
            expect(r!.ectomorphy).toBeLessThanOrEqual(12);
            expect(Number.isFinite(r!.endomorphy + r!.mesomorphy + r!.ectomorphy)).toBe(true);
            expect(VALID_CATEGORIES).toContain(r!.category as (typeof VALID_CATEGORIES)[number]);
            // display round-trips to the same triple
            const [de, dm, dc] = r!.display.split('-').map(Number);
            expect(de).toBe(r!.endomorphy);
            expect(dm).toBe(r!.mesomorphy);
            expect(dc).toBe(r!.ectomorphy);
          }
        }
      }
    }
  });

  it('display triple is monotone: heavier at fixed height/sex never lowers endomorphy or raises ectomorphy', () => {
    for (const sex of ['male', 'female'] as const) {
      let prevE = -Infinity;
      let prevC = Infinity;
      for (let w = 40; w <= 160; w += 5) {
        const r = classifySomatotype({ heightCm: 175, weightKg: w, bodyFatPct: 20, sex, wristCm: 17 });
        expect(r).not.toBeNull();
        expect(r!.endomorphy).toBeGreaterThanOrEqual(prevE);
        expect(r!.ectomorphy).toBeLessThanOrEqual(prevC);
        prevE = r!.endomorphy;
        prevC = r!.ectomorphy;
      }
    }
  });
});

// [SECTION-2]

describe('adversarial: cross-package consistency and grammar invariants', () => {
  it('ACE boundary coherence: shared cut-offs mean the two packages never disagree', () => {
    // Male 14% = ACE fitness/acceptable boundary → endomorphy anchor 14→3.0
    expect(calculateEndomorphy(14, 'male')).toBe(3);
    expect(calculateEndomorphy(25, 'male')).toBe(5.5);
    expect(classifyMeasuredBodyFat(14, 'male')!.band).toBe('above_average');
    expect(classifyMeasuredBodyFat(25, 'male')!.band).toBe('poor');
  });

  it('category grammar: the noun is always the component with the max value', () => {
    // Dense valid grid over display triples; parse from raw numbers.
    for (let e = 0.5; e <= 16; e += 0.5) {
      for (let m = 2; m <= 6.5; m += 0.5) {
        for (let c = 0; c <= 12; c += 0.5) {
          const cat = categorizeSomatotype(e, m, c);
          expect(VALID_CATEGORIES).toContain(cat as (typeof VALID_CATEGORIES)[number]);
          const nounOf: Record<string, number> = {
            central: -1,
            balanced_mesomorph: m,
            balanced_endomorph: e,
            balanced_ectomorph: c,
            mesomorphic_endomorph: e,
            ectomorphic_endomorph: e,
            endomorphic_mesomorph: m,
            ectomorphic_mesomorph: m,
            endomorphic_ectomorph: c,
            mesomorphic_ectomorph: c,
            mesomorph_endomorph: e,
            mesomorph_ectomorph: c,
            endomorph_ectomorph: c,
          };
          if (cat !== 'central' && !cat.startsWith('mesomorph_') && !cat.startsWith('endomorph_')) {
            const nounVal = nounOf[cat];
            const maxVal = Math.max(e, m, c);
            expect(nounVal).toBe(maxVal);
          }
        }
      }
    }
  });

  it('endomorphy map is monotone over the full sex-specific domain', () => {
    for (const [sex, floor] of [['male', 2], ['female', 8]] as const) {
      let prev: number | null = null;
      for (let bf = floor; bf <= 70; bf += 0.25) {
        const v = calculateEndomorphy(bf, sex);
        expect(v).not.toBeNull();
        if (prev !== null) expect(v!).toBeGreaterThanOrEqual(prev);
        prev = v;
      }
    }
  });

  it('HWR pathologies: extreme linearity caps at 12, extreme mass floors at 0', () => {
    // 175cm/20kg: HWR=64.5 → 12.32 → capped at 12
    expect(calculateEctomorphy(175, 20)).toBe(12);
    // 250cm/25kg: HWR=78.3 → 18.7 → capped at 12
    expect(calculateEctomorphy(250, 25)).toBe(12);
    // 50cm/500kg: HWR=6.30 → -14.7 → floored, rounds to 0
    expect(calculateEctomorphy(50, 500)).toBe(0);
  });
});

// [SECTION-3]

describe('adversarial: hostile but in-domain inputs stay sane', () => {
  it('min/max valid corners produce defined, finite results', () => {
    const corners: Array<[number, number, number, 'male' | 'female', number | undefined]> = [
      [60, 25, 2, 'male', 10],
      [60, 25, 2, 'male', undefined],
      [250, 200, 70, 'male', 10],
      [250, 200, 70, 'male', undefined],
      [60, 25, 8, 'female', 10],
      [250, 200, 70, 'female', undefined],
      [175, 70, 15, 'female', 17],
    ];
    for (const [h, w, bf, sex, wrist] of corners) {
      const r = classifySomatotype({ heightCm: h, weightKg: w, bodyFatPct: bf, sex, wristCm: wrist });
      expect(r).not.toBeNull();
      expect(Number.isFinite(r!.endomorphy + r!.mesomorphy + r!.ectomorphy)).toBe(true);
      expect(VALID_CATEGORIES).toContain(r!.category as (typeof VALID_CATEGORIES)[number]);
    }
  });

  it('round-to-0.5 quantization never hides a category flip across a boundary', () => {
    // Triple exactly at the central boundary: (3,3,3+ε) both sides give valid categories
    expect(categorizeSomatotype(3, 3, 3)).toBe('central');
    expect(categorizeSomatotype(3, 3, 4)).toBe('central');
    expect(categorizeSomatotype(3, 3, 4.5)).not.toBe('central');
  });

  it('endomorphy rejects the conditioning-essential-fat floor coherently for both sexes', () => {
    // The two packages must agree on where measurement error begins.
    expect(calculateEndomorphy(2, 'male')).not.toBeNull();
    expect(calculateEndomorphy(1.9, 'male')).toBeNull();
    expect(calculateEndomorphy(8, 'female')).not.toBeNull();
    expect(calculateEndomorphy(7.9, 'female')).toBeNull();
  });
});
