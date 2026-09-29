/**
 * Venus Formula Tests
 *
 * Tests the Venus Index calculations for female anthropometric proportions.
 * Uses height as the primary reference variable.
 */

import { describe, it, expect } from 'vitest';
import { calculateVenus, classifyFrame, VENUS_FACTORS } from '../../bodylab/core/anthropometry/src/venus';

describe('Venus Formula', () => {
  describe('Standard calculations', () => {
    it('should calculate correct proportions for height 1.65m, wrist 14.5cm', () => {
      const result = calculateVenus(1.65, 14.5);

      // heightCm = 165
      // waist = 0.38 × 165 = 62.7
      expect(result.waist).toBe(62.7);

      // hips = 0.5396 × 165 = 89.03
      expect(result.hips).toBe(89.03);

      // bust = 0.513 × 165 = 84.65
      expect(result.bust).toBe(84.65);

      // shoulders = 0.61484 × 165 = 101.45
      expect(result.shoulders).toBe(101.45);
    });

    it('should calculate correct proportions for height 1.70m, wrist 15cm', () => {
      const result = calculateVenus(1.70, 15);

      // heightCm = 170
      expect(result.waist).toBe(64.6);
      expect(result.hips).toBe(91.73);
      expect(result.bust).toBe(87.21);
      expect(result.shoulders).toBe(104.52);
    });

    it('should calculate correct proportions for height 1.60m, wrist 13.5cm', () => {
      const result = calculateVenus(1.60, 13.5);

      // heightCm = 160
      expect(result.waist).toBe(60.8);
      expect(result.hips).toBe(86.34);
      expect(result.bust).toBe(82.08);
      expect(result.shoulders).toBe(98.37);
    });
  });

  describe('Frame size classification', () => {
    it('should classify as small frame when R_frame > 10.9', () => {
      // height=165, wrist=14.5 → R=11.38 → small
      const result = calculateVenus(1.65, 14.5);
      expect(result.frameSize).toBe('small');
    });

    it('should classify as medium frame when 9.9 ≤ R_frame ≤ 10.9', () => {
      // height=165, wrist=16 → R=10.3125 → medium
      const result = calculateVenus(1.65, 16);
      expect(result.frameSize).toBe('medium');
    });

    it('should classify as large frame when R_frame < 9.9', () => {
      // height=165, wrist=18 → R=9.1667 → large
      const result = calculateVenus(1.65, 18);
      expect(result.frameSize).toBe('large');
    });

    it('should classify as small at boundary (R_frame = 11.0)', () => {
      // height=165, wrist=15 → R=11.0 → small
      const result = calculateVenus(1.65, 15);
      expect(result.frameSize).toBe('small');
    });

    it('should classify as medium at boundary (R_frame = 10.9)', () => {
      // height=165, wrist=15.1376... → R=10.9
      // Let's use exact boundary
      const ratio = 165 / 10.9;
      const result = calculateVenus(1.65, ratio);
      expect(result.frameSize).toBe('medium');
    });

    it('should classify as medium at boundary (R_frame = 9.9)', () => {
      // height=165, wrist=16.6667... → R=9.9
      const ratio = 165 / 9.9;
      const result = calculateVenus(1.65, ratio);
      expect(result.frameSize).toBe('medium');
    });
  });

  describe('classifyFrame function', () => {
    it('should classify small frame', () => {
      expect(classifyFrame(11.5)).toBe('small');
      expect(classifyFrame(12.0)).toBe('small');
      expect(classifyFrame(15.0)).toBe('small');
    });

    it('should classify medium frame', () => {
      expect(classifyFrame(10.9)).toBe('medium');
      expect(classifyFrame(10.0)).toBe('medium');
      expect(classifyFrame(9.9)).toBe('medium');
    });

    it('should classify large frame', () => {
      expect(classifyFrame(9.8)).toBe('large');
      expect(classifyFrame(9.0)).toBe('large');
      expect(classifyFrame(8.0)).toBe('large');
    });
  });

  describe('Proportion factors', () => {
    it('should have correct factors', () => {
      expect(VENUS_FACTORS.waist).toBe(0.38);
      expect(VENUS_FACTORS.hips).toBe(0.5396);
      expect(VENUS_FACTORS.bust).toBe(0.513);
      expect(VENUS_FACTORS.shoulders).toBe(0.61484);
    });
  });

  describe('Edge cases', () => {
    it('should throw for zero height', () => {
      expect(() => calculateVenus(0, 14.5)).toThrow('Height must be between 0 and 2.5 meters');
    });

    it('should throw for negative height', () => {
      expect(() => calculateVenus(-1.65, 14.5)).toThrow('Height must be between 0 and 2.5 meters');
    });

    it('should throw for unrealistic height (> 2.5m)', () => {
      expect(() => calculateVenus(3.0, 14.5)).toThrow('Height must be between 0 and 2.5 meters');
    });

    it('should throw for zero wrist', () => {
      expect(() => calculateVenus(1.65, 0)).toThrow('Wrist circumference must be between 0 and 30 cm');
    });

    it('should throw for negative wrist', () => {
      expect(() => calculateVenus(1.65, -5)).toThrow('Wrist circumference must be between 0 and 30 cm');
    });

    it('should handle minimum realistic values', () => {
      const result = calculateVenus(1.50, 12);
      expect(result.waist).toBe(57);
      expect(result.frameSize).toBeDefined();
    });

    it('should handle maximum realistic values', () => {
      const result = calculateVenus(2.00, 20);
      expect(result.waist).toBe(76);
      expect(result.frameSize).toBeDefined();
    });
  });

  describe('Mathematical relationships', () => {
    it('should scale linearly with height', () => {
      const result160 = calculateVenus(1.60, 14);
      const result180 = calculateVenus(1.80, 14);

      // Same wrist, different height
      expect(result180.waist).toBeCloseTo(result160.waist * (1.80 / 1.60), 1);
      expect(result180.hips).toBeCloseTo(result160.hips * (1.80 / 1.60), 1);
    });

    it('should maintain hip-to-waist ratio', () => {
      const result = calculateVenus(1.65, 14.5);
      const ratio = result.hips / result.waist;
      expect(ratio).toBeCloseTo(0.5396 / 0.38, 2);
    });
  });
});
