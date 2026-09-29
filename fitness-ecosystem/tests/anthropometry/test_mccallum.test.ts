/**
 * McCallum Formula Tests
 *
 * These tests verify the exact mathematical output of the McCallum formula.
 * Each test uses a known input and verifies the exact expected output.
 *
 * Source: John McCallum's proportions
 * Formula: chest = 6.5 × wrist
 */

import { describe, it, expect } from 'vitest';
import { calculateMcCallum, MCCALLUM_FACTORS } from '../../bodylab/core/anthropometry/src/mccallum';

describe('McCallum Formula', () => {
  describe('Standard calculations', () => {
    it('should calculate correct proportions for wrist = 17 cm', () => {
      const result = calculateMcCallum(17);

      // chest = 6.5 × 17 = 110.5
      expect(result.chest).toBeCloseTo(110.5, 1);

      // waist = 0.70 × 110.5 = 77.35
      expect(result.waist).toBeCloseTo(77.35, 1);

      // hips = 0.85 × 110.5 = 93.925
      expect(result.hips).toBeCloseTo(93.93, 1);

      // biceps = 0.36 × 110.5 = 39.78
      expect(result.biceps).toBeCloseTo(39.78, 1);

      // thigh = 0.53 × 110.5 = 58.565
      expect(result.thigh).toBeCloseTo(58.57, 1);

      // neck = 0.37 × 110.5 = 40.885
      expect(result.neck).toBeCloseTo(40.89, 1);

      // calf = 0.34 × 110.5 = 37.57
      expect(result.calf).toBeCloseTo(37.57, 1);

      // forearm = 0.29 × 110.5 = 32.045
      expect(result.forearm).toBeCloseTo(32.05, 1);
    });

    it('should calculate correct proportions for wrist = 15 cm', () => {
      const result = calculateMcCallum(15);

      expect(result.chest).toBeCloseTo(97.5, 1);
      expect(result.waist).toBeCloseTo(68.25, 1);
      expect(result.hips).toBeCloseTo(82.88, 1);
      expect(result.biceps).toBeCloseTo(35.1, 1);
      expect(result.thigh).toBeCloseTo(51.68, 1);
      expect(result.neck).toBeCloseTo(36.08, 1);
      expect(result.calf).toBeCloseTo(33.15, 1);
      expect(result.forearm).toBeCloseTo(28.28, 1);
    });

    it('should calculate correct proportions for wrist = 20 cm', () => {
      const result = calculateMcCallum(20);

      expect(result.chest).toBeCloseTo(130, 1);
      expect(result.waist).toBeCloseTo(91, 1);
      expect(result.hips).toBeCloseTo(110.5, 1);
      expect(result.biceps).toBeCloseTo(46.8, 1);
      expect(result.thigh).toBeCloseTo(68.9, 1);
      expect(result.neck).toBeCloseTo(48.1, 1);
      expect(result.calf).toBeCloseTo(44.2, 1);
      expect(result.forearm).toBeCloseTo(37.7, 1);
    });
  });

  describe('Proportion factors', () => {
    it('should have correct chest factor', () => {
      expect(MCCALLUM_FACTORS.chest).toBe(6.5);
    });

    it('should have correct waist factor', () => {
      expect(MCCALLUM_FACTORS.waist).toBe(0.70);
    });

    it('should have correct hips factor', () => {
      expect(MCCALLUM_FACTORS.hips).toBe(0.85);
    });

    it('should have correct biceps factor', () => {
      expect(MCCALLUM_FACTORS.biceps).toBe(0.36);
    });

    it('should have correct thigh factor', () => {
      expect(MCCALLUM_FACTORS.thigh).toBe(0.53);
    });

    it('should have correct neck factor', () => {
      expect(MCCALLUM_FACTORS.neck).toBe(0.37);
    });

    it('should have correct calf factor', () => {
      expect(MCCALLUM_FACTORS.calf).toBe(0.34);
    });

    it('should have correct forearm factor', () => {
      expect(MCCALLUM_FACTORS.forearm).toBe(0.29);
    });
  });

  describe('Edge cases', () => {
    it('should throw for zero wrist circumference', () => {
      expect(() => calculateMcCallum(0)).toThrow('Wrist circumference must be positive');
    });

    it('should throw for negative wrist circumference', () => {
      expect(() => calculateMcCallum(-5)).toThrow('Wrist circumference must be positive');
    });

    it('should throw for unrealistic wrist circumference (> 30 cm)', () => {
      expect(() => calculateMcCallum(35)).toThrow('Wrist circumference seems unrealistic');
    });

    it('should handle minimum realistic wrist (10 cm)', () => {
      const result = calculateMcCallum(10);
      expect(result.chest).toBeCloseTo(65, 1);
      expect(result.waist).toBeCloseTo(45.5, 1);
    });

    it('should handle maximum realistic wrist (25 cm)', () => {
      const result = calculateMcCallum(25);
      expect(result.chest).toBeCloseTo(162.5, 1);
      expect(result.waist).toBeCloseTo(113.75, 1);
    });
  });

  describe('Mathematical relationships', () => {
    it('should maintain proportional relationships', () => {
      const result = calculateMcCallum(17);

      // All proportions should be consistent
      expect(result.waist / result.chest).toBeCloseTo(0.70, 2);
      expect(result.hips / result.chest).toBeCloseTo(0.85, 2);
      expect(result.biceps / result.chest).toBeCloseTo(0.36, 2);
      expect(result.thigh / result.chest).toBeCloseTo(0.53, 2);
      expect(result.neck / result.chest).toBeCloseTo(0.37, 2);
      expect(result.calf / result.chest).toBeCloseTo(0.34, 2);
      expect(result.forearm / result.chest).toBeCloseTo(0.29, 2);
    });

    it('should scale linearly with wrist size', () => {
      const result15 = calculateMcCallum(15);
      const result30 = calculateMcCallum(30);

      // Doubling wrist should double all values (within rounding tolerance)
      expect(result30.chest).toBeCloseTo(result15.chest * 2, 1);
      expect(result30.waist).toBeCloseTo(result15.waist * 2, 1);
      expect(result30.hips).toBeCloseTo(result15.hips * 2, 1);
    });
  });
});
