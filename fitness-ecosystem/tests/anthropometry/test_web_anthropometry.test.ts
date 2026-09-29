/**
 * Web Anthropometry Engine Tests
 *
 * Tests the calculateAssessment function from the web app's
 * anthropometry module. Verifies correct score computation
 * for McCallum, Venus, and WHtR reference profiles.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  getScoreStatus,
  calculateMcCallum,
  calculateVenus,
  calculateWHtR,
  calculateAdonis,
  calculateSymmetry,
  BUILT_IN_REFERENCES,
} from '../../bodylab/apps/web/src/lib/constants';

// Helper to create a minimal Profile
function makeProfile(overrides?: Partial<{
  height: number;
  weight: number;
  age: number;
  biologicalSex: 'male' | 'female';
}>) {
  return {
    id: 'test',
    name: 'Test',
    height: overrides?.height ?? 1.80,
    weight: overrides?.weight ?? 80,
    age: overrides?.age ?? 25,
    biologicalSex: (overrides?.biologicalSex ?? 'male') as 'male' | 'female',
    units: 'metric' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create a Measurement
function makeMeasurement(type: string, value: number) {
  return {
    id: `${type}-${value}`,
    profileId: 'test',
    type: type as any,
    value,
    unit: 'cm',
    timestamp: new Date().toISOString(),
    method: 'manual' as const,
    confidence: 'high' as const,
  };
}

describe('Web Anthropometry Engine', () => {
  describe('calculateScore', () => {
    it('should return 1.0 for zero deviation', () => {
      expect(calculateScore(80, 80)).toBe(1);
    });

    it('should return 0.9 for 2.5% deviation', () => {
      // |82 - 80| / 80 = 0.025
      // S = max(0, 1 - 4.0 * 0.025) = 0.90
      expect(calculateScore(82, 80)).toBeCloseTo(0.90, 2);
    });

    it('should return 0.0 for 25%+ deviation', () => {
      // |100 - 80| / 80 = 0.25
      // S = max(0, 1 - 4.0 * 0.25) = 0
      expect(calculateScore(100, 80)).toBe(0);
    });

    it('should return 0 for zero ideal', () => {
      expect(calculateScore(80, 0)).toBe(0);
    });

    it('should handle actual < ideal', () => {
      // |78 - 80| / 80 = 0.025
      expect(calculateScore(78, 80)).toBeCloseTo(0.90, 2);
    });

    it('should clamp to [0, 1]', () => {
      expect(calculateScore(0, 100)).toBeGreaterThanOrEqual(0);
      expect(calculateScore(0, 100)).toBeLessThanOrEqual(1);
      expect(calculateScore(1000, 1)).toBe(0);
    });
  });

  describe('getScoreStatus', () => {
    it('should return optimal for score >= 0.90', () => {
      expect(getScoreStatus(1.0)).toBe('optimal');
      expect(getScoreStatus(0.95)).toBe('optimal');
      expect(getScoreStatus(0.90)).toBe('optimal');
    });

    it('should return near for score 0.70-0.89', () => {
      expect(getScoreStatus(0.89)).toBe('near');
      expect(getScoreStatus(0.80)).toBe('near');
      expect(getScoreStatus(0.70)).toBe('near');
    });

    it('should return moderate for score 0.40-0.69', () => {
      expect(getScoreStatus(0.69)).toBe('moderate');
      expect(getScoreStatus(0.55)).toBe('moderate');
      expect(getScoreStatus(0.40)).toBe('moderate');
    });

    it('should return significant for score < 0.40', () => {
      expect(getScoreStatus(0.39)).toBe('significant');
      expect(getScoreStatus(0.20)).toBe('significant');
      expect(getScoreStatus(0.0)).toBe('significant');
    });
  });

  describe('calculateMcCallum', () => {
    it('should calculate correct proportions for wrist = 17cm', () => {
      const result = calculateMcCallum(17);

      expect(result.chest).toBeCloseTo(110.5, 0);
      expect(result.waist).toBeCloseTo(77.35, 0);
      expect(result.hips).toBeCloseTo(93.93, 0);
      expect(result.biceps).toBeCloseTo(39.78, 0);
      expect(result.thigh).toBeCloseTo(58.57, 0);
      expect(result.neck).toBeCloseTo(40.89, 0);
      expect(result.calf).toBeCloseTo(37.57, 0);
      expect(result.forearm).toBeCloseTo(32.05, 0);
    });

    it('should maintain proportional relationships', () => {
      const result = calculateMcCallum(17);

      expect(result.waist / result.chest).toBeCloseTo(0.70, 2);
      expect(result.hips / result.chest).toBeCloseTo(0.85, 2);
      expect(result.biceps / result.chest).toBeCloseTo(0.36, 2);
      expect(result.thigh / result.chest).toBeCloseTo(0.53, 2);
      expect(result.neck / result.chest).toBeCloseTo(0.37, 2);
      expect(result.calf / result.chest).toBeCloseTo(0.34, 2);
      expect(result.forearm / result.chest).toBeCloseTo(0.29, 2);
    });

    it('should scale linearly with wrist size', () => {
      const r15 = calculateMcCallum(15);
      const r30 = calculateMcCallum(30);

      expect(r30.chest).toBeCloseTo(r15.chest * 2, 0);
      expect(r30.waist).toBeCloseTo(r15.waist * 2, 0);
      expect(r30.hips).toBeCloseTo(r15.hips * 2, 0);
    });
  });

  describe('calculateVenus', () => {
    it('should calculate correct proportions for height=165cm, wrist=15cm', () => {
      const result = calculateVenus(165, 15);

      expect(result.waist).toBeCloseTo(62.7, 0);
      expect(result.hips).toBeCloseTo(89.03, 0);
      expect(result.bust).toBeCloseTo(84.65, 0);
      expect(result.shoulders).toBeCloseTo(101.45, 0);
    });

    it('should classify frame size correctly', () => {
      // Small frame: ratio > 10.9
      expect(calculateVenus(165, 14).frameSize).toBe('small');

      // Medium frame: 9.9 <= ratio <= 10.9
      expect(calculateVenus(165, 16).frameSize).toBe('medium');

      // Large frame: ratio < 9.9
      expect(calculateVenus(165, 18).frameSize).toBe('large');
    });

    it('should calculate correct frame ratio', () => {
      const result = calculateVenus(165, 15);
      expect(result.frameRatio).toBeCloseTo(11.0, 0);
    });
  });

  describe('calculateWHtR', () => {
    it('should return healthy for ratio <= 0.50', () => {
      const result = calculateWHtR(80, 1.70);
      // 80 / 170 = 0.4706
      expect(result.ratio).toBeCloseTo(0.4706, 3);
      expect(result.status).toBe('healthy');
    });

    it('should return elevated for ratio 0.50-0.60', () => {
      const result = calculateWHtR(90, 1.70);
      // 90 / 170 = 0.5294
      expect(result.status).toBe('elevated');
    });

    it('should return high_risk for ratio > 0.60', () => {
      const result = calculateWHtR(110, 1.70);
      // 110 / 170 = 0.6471
      expect(result.status).toBe('high_risk');
    });

    it('should return exactly 0.50 as healthy', () => {
      const result = calculateWHtR(85, 1.70);
      // 85 / 170 = 0.50
      expect(result.status).toBe('healthy');
    });

    it('should return exactly 0.60 as elevated', () => {
      const result = calculateWHtR(102, 1.70);
      // 102 / 170 = 0.60
      expect(result.status).toBe('elevated');
    });
  });

  describe('calculateAdonis', () => {
    it('should return optimal for ratio close to golden ratio', () => {
      // shoulders=130, waist=80 → ratio = 1.625 (close to 1.618)
      const result = calculateAdonis(130, 80);
      expect(result.status).toBe('optimal');
      expect(result.ratio).toBeCloseTo(1.625, 3);
    });

    it('should return near for ratio somewhat close to golden ratio', () => {
      // shoulders=140, waist=80 → ratio = 1.75
      const result = calculateAdonis(140, 80);
      expect(result.status).toBe('near');
    });

    it('should return far for ratio very different from golden ratio', () => {
      // shoulders=100, waist=80 → ratio = 1.25
      const result = calculateAdonis(100, 80);
      expect(result.status).toBe('far');
    });

    it('should have golden ratio = 1.618033988749895', () => {
      const result = calculateAdonis(161.8, 100);
      expect(result.goldenRatio).toBeCloseTo(1.618033988749895, 10);
    });

    it('should calculate deviation correctly', () => {
      // ratio = 1.5, golden = 1.618
      // deviation = |1.5 - 1.618| / 1.618 = 0.0730
      const result = calculateAdonis(150, 100);
      expect(result.deviation).toBeCloseTo(0.073, 2);
    });
  });

  describe('calculateSymmetry', () => {
    it('should calculate perfect symmetry for equal L/R values', () => {
      const measurements = [
        makeMeasurement('biceps_left', 35),
        makeMeasurement('biceps_right', 35),
      ];
      const results = calculateSymmetry(measurements);
      const biceps = results.find(r => r.muscleGroup === 'biceps');

      expect(biceps).toBeDefined();
      expect(biceps!.symmetryScore).toBe(1.0);
      expect(biceps!.percentDiff).toBe(0);
      expect(biceps!.status).toBe('balanced');
    });

    it('should calculate mild asymmetry for 5-15% difference', () => {
      const measurements = [
        makeMeasurement('biceps_left', 35),
        makeMeasurement('biceps_right', 32), // ~8.5% diff
      ];
      const results = calculateSymmetry(measurements);
      const biceps = results.find(r => r.muscleGroup === 'biceps');

      expect(biceps).toBeDefined();
      expect(biceps!.status).toBe('mild');
      expect(biceps!.percentDiff).toBeGreaterThan(5);
      expect(biceps!.percentDiff).toBeLessThanOrEqual(15);
    });

    it('should calculate significant asymmetry for >15% difference', () => {
      const measurements = [
        makeMeasurement('biceps_left', 40),
        makeMeasurement('biceps_right', 30), // 25% diff
      ];
      const results = calculateSymmetry(measurements);
      const biceps = results.find(r => r.muscleGroup === 'biceps');

      expect(biceps).toBeDefined();
      expect(biceps!.status).toBe('significant');
      expect(biceps!.percentDiff).toBeGreaterThan(15);
    });

    it('should handle missing left measurement', () => {
      const measurements = [
        makeMeasurement('biceps_right', 35),
      ];
      const results = calculateSymmetry(measurements);
      const biceps = results.find(r => r.muscleGroup === 'biceps');

      expect(biceps).toBeDefined();
      expect(biceps!.left).toBeNull();
      expect(biceps!.right).not.toBeNull();
      // Missing left defaults to 0, so asymmetry = 200%
      expect(biceps!.percentDiff).toBe(200);
      expect(biceps!.status).toBe('significant');
    });

    it('should handle missing right measurement', () => {
      const measurements = [
        makeMeasurement('biceps_left', 35),
      ];
      const results = calculateSymmetry(measurements);
      const biceps = results.find(r => r.muscleGroup === 'biceps');

      expect(biceps).toBeDefined();
      expect(biceps!.left).not.toBeNull();
      expect(biceps!.right).toBeNull();
      // Missing right defaults to 0, so asymmetry = 200%
      expect(biceps!.percentDiff).toBe(200);
      expect(biceps!.status).toBe('significant');
    });

    it('should handle both measurements missing', () => {
      const results = calculateSymmetry([]);
      const biceps = results.find(r => r.muscleGroup === 'biceps');

      expect(biceps).toBeDefined();
      expect(biceps!.left).toBeNull();
      expect(biceps!.right).toBeNull();
      expect(biceps!.percentDiff).toBe(0);
    });

    it('should calculate all 5 symmetry pairs', () => {
      const results = calculateSymmetry([]);
      expect(results).toHaveLength(5);
      expect(results.map(r => r.muscleGroup)).toEqual([
        'biceps', 'forearm', 'thigh', 'calf', 'shoulders'
      ]);
    });

    it('should calculate correct difference', () => {
      const measurements = [
        makeMeasurement('thigh_left', 55),
        makeMeasurement('thigh_right', 50),
      ];
      const results = calculateSymmetry(measurements);
      const thigh = results.find(r => r.muscleGroup === 'thigh');

      expect(thigh!.difference).toBe(5);
    });
  });

  describe('BUILT_IN_REFERENCES', () => {
    it('should have 3 built-in references', () => {
      expect(BUILT_IN_REFERENCES).toHaveLength(3);
    });

    it('should have McCallum reference for males', () => {
      const mc = BUILT_IN_REFERENCES.find(r => r.id === 'mccallum_recreational');
      expect(mc).toBeDefined();
      expect(mc!.biologicalSex).toBe('male');
    });

    it('should have Venus reference for females', () => {
      const venus = BUILT_IN_REFERENCES.find(r => r.id === 'venus_recreational');
      expect(venus).toBeDefined();
      expect(venus!.biologicalSex).toBe('female');
    });

    it('should have WHtR reference for both sexes', () => {
      const whtr = BUILT_IN_REFERENCES.find(r => r.id === 'health_whtr');
      expect(whtr).toBeDefined();
      expect(whtr!.biologicalSex).toBe('both');
    });

    it('each reference should have required fields', () => {
      for (const ref of BUILT_IN_REFERENCES) {
        expect(ref.id).toBeTruthy();
        expect(ref.name.en).toBeTruthy();
        expect(ref.name.es).toBeTruthy();
        expect(ref.description.en).toBeTruthy();
        expect(ref.description.es).toBeTruthy();
        expect(ref.category).toBeTruthy();
        expect(ref.source).toBeTruthy();
        expect(ref.version).toBeTruthy();
        expect(Array.isArray(ref.measurements)).toBe(true);
        expect(ref.measurements.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge cases', () => {
    it('McCallum should handle small wrist (12cm)', () => {
      const result = calculateMcCallum(12);
      expect(result.chest).toBeCloseTo(78, 0);
      expect(result.waist).toBeGreaterThan(0);
    });

    it('McCallum should handle large wrist (22cm)', () => {
      const result = calculateMcCallum(22);
      expect(result.chest).toBeCloseTo(143, 0);
    });

    it('WHtR should handle very small waist', () => {
      const result = calculateWHtR(50, 1.80);
      expect(result.status).toBe('healthy');
    });

    it('WHtR should handle very large waist', () => {
      const result = calculateWHtR(150, 1.50);
      expect(result.status).toBe('high_risk');
    });

    it('Adonis should handle equal shoulders and waist', () => {
      const result = calculateAdonis(80, 80);
      expect(result.ratio).toBe(1.0);
      expect(result.status).toBe('far');
    });

    it('Symmetry should handle very large difference', () => {
      const measurements = [
        makeMeasurement('calf_left', 45),
        makeMeasurement('calf_right', 25),
      ];
      const results = calculateSymmetry(measurements);
      const calf = results.find(r => r.muscleGroup === 'calf');
      expect(calf!.status).toBe('significant');
      expect(calf!.percentDiff).toBeGreaterThan(30);
    });
  });

  describe('Score color mapping', () => {
    it('optimal score should map to green', () => {
      const status = getScoreStatus(0.95);
      expect(status).toBe('optimal');
    });

    it('near score should map to yellow', () => {
      const status = getScoreStatus(0.80);
      expect(status).toBe('near');
    });

    it('moderate score should map to orange', () => {
      const status = getScoreStatus(0.55);
      expect(status).toBe('moderate');
    });

    it('significant score should map to red', () => {
      const status = getScoreStatus(0.20);
      expect(status).toBe('significant');
    });
  });
});
