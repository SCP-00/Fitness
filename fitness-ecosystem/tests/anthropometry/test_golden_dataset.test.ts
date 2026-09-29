/**
 * Golden Dataset Regression Tests
 *
 * These tests verify that our calculations match known expected values.
 * They use predefined profiles with hand-verified results.
 */

import { describe, it, expect } from 'vitest';
import { calculateMcCallum } from '../../bodylab/core/anthropometry/src/mccallum';
import { calculateVenus } from '../../bodylab/core/anthropometry/src/venus';
import { calculateAdonisIndex } from '../../bodylab/core/anthropometry/src/adonis';
import { calculateWHtR } from '../../bodylab/core/anthropometry/src/whtr';
import { calculateDeviation, calculateScore } from '../../bodylab/core/anthropometry/src/score';

// Load golden dataset
import goldenMale from '../data/golden/profile_male_average.json';

describe('Golden Dataset Regression', () => {
  describe('Male Average Profile', () => {
    const profile = goldenMale;
    const measurements = profile.measurements;

    it('should calculate correct McCallum proportions', () => {
      const result = calculateMcCallum(measurements.wrist);

      const expected = profile.expected_results.mccallum;

      expect(result.chest).toBeCloseTo(expected.chest, 1);
      expect(result.waist).toBeCloseTo(expected.waist, 1);
      expect(result.hips).toBeCloseTo(expected.hips, 1);
      expect(result.biceps).toBeCloseTo(expected.biceps, 1);
      expect(result.thigh).toBeCloseTo(expected.thigh, 1);
      expect(result.neck).toBeCloseTo(expected.neck, 1);
      expect(result.calf).toBeCloseTo(expected.calf, 1);
      expect(result.forearm).toBeCloseTo(expected.forearm, 1);
    });

    it('should calculate correct Adonis Index', () => {
      const result = calculateAdonisIndex(
        measurements.shoulders,
        measurements.waist
      );

      const expected = profile.expected_results.adonis;

      // 115/80 = 1.4375
      expect(result.ratio).toBeCloseTo(expected.ratio, 2);
      // deviation = |1.4375 - 1.618| / 1.618 ≈ 0.1116 (between 0.05 and 0.15)
      expect(result.status).toBe('near');
    });

    it('should calculate correct WHtR', () => {
      const result = calculateWHtR(measurements.waist, profile.height);

      const expected = profile.expected_results.whtr;

      expect(result.ratio).toBeCloseTo(expected.ratio, 3);
      expect(result.status).toBe(expected.status);
    });

    it('should calculate correct scores for each measurement', () => {
      // For each measurement, calculate deviation from McCallum ideal
      const segments = [
        'chest', 'waist', 'hips', 'biceps', 'thigh', 'neck', 'calf', 'forearm'
      ] as const;

      for (const segment of segments) {
        const actual = measurements[segment];
        const ideal = calculateMcCallum(measurements.wrist)[segment];

        const deviation = calculateDeviation(actual, ideal);
        const score = calculateScore(deviation);

        // Score should be between 0 and 1
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);

        // Deviation should be non-negative
        expect(deviation).toBeGreaterThanOrEqual(0);
      }

      // Specific known values
      const chestDeviation = calculateDeviation(100, 110.5);
      expect(chestDeviation).toBeCloseTo(0.095, 2);

      const chestScore = calculateScore(chestDeviation);
      expect(chestScore).toBeCloseTo(0.62, 1);
    });
  });

  describe('Edge case profiles', () => {
    it('should handle very small wrist (12 cm)', () => {
      const result = calculateMcCallum(12);

      expect(result.chest).toBe(78);
      expect(result.waist).toBe(54.6);
      expect(result.hips).toBe(66.3);
    });

    it('should handle very large wrist (24 cm)', () => {
      const result = calculateMcCallum(24);

      expect(result.chest).toBe(156);
      expect(result.waist).toBe(109.2);
      expect(result.hips).toBe(132.6);
    });

    it('should handle very short height (1.50m) for Venus', () => {
      const result = calculateVenus(1.50, 13);

      expect(result.waist).toBe(57);
      expect(result.frameSize).toBe('small');
    });

    it('should handle very tall height (2.00m) for Venus', () => {
      // 200/18 = 11.11 > 10.9 → small frame
      const result = calculateVenus(2.00, 18);

      expect(result.waist).toBeCloseTo(76, 0);
      expect(result.frameSize).toBe('small');
    });
  });

  describe('Regression: McCallum formula consistency', () => {
    it('should produce consistent results across different wrist sizes', () => {
      const wristSizes = [12, 14, 16, 18, 20, 22, 24];

      for (const wrist of wristSizes) {
        const result = calculateMcCallum(wrist);

        // All proportions should maintain fixed ratios
        expect(result.waist / result.chest).toBeCloseTo(0.70, 2);
        expect(result.hips / result.chest).toBeCloseTo(0.85, 2);
        expect(result.biceps / result.chest).toBeCloseTo(0.36, 2);
        expect(result.thigh / result.chest).toBeCloseTo(0.53, 2);
        expect(result.neck / result.chest).toBeCloseTo(0.37, 2);
        expect(result.calf / result.chest).toBeCloseTo(0.34, 2);
        expect(result.forearm / result.chest).toBeCloseTo(0.29, 2);
      }
    });
  });

  describe('Regression: Venus formula consistency', () => {
    it('should produce consistent results across different heights', () => {
      const heights = [1.50, 1.55, 1.60, 1.65, 1.70, 1.75, 1.80];
      const wrist = 14.5;

      for (const height of heights) {
        const result = calculateVenus(height, wrist);

        // All proportions should maintain fixed ratios to height
        expect(result.waist / (height * 100)).toBeCloseTo(0.38, 3);
        expect(result.hips / (height * 100)).toBeCloseTo(0.5396, 3);
        expect(result.bust / (height * 100)).toBeCloseTo(0.513, 3);
        expect(result.shoulders / (height * 100)).toBeCloseTo(0.61484, 3);
      }
    });
  });
});
