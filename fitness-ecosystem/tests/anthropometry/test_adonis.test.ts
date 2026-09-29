/**
 * Adonis Index Tests
 *
 * Tests the shoulder-to-waist ratio calculation against the Golden Ratio.
 */

import { describe, it, expect } from 'vitest';
import { calculateAdonisIndex, GOLDEN_RATIO } from '../../bodylab/core/anthropometry/src/adonis';

describe('Adonis Index', () => {
  describe('Standard calculations', () => {
    it('should calculate ratio for shoulders=120, waist=77', () => {
      const result = calculateAdonisIndex(120, 77);

      // ratio = 120 / 77 ≈ 1.5584
      expect(result.ratio).toBe(1.5584);
      expect(result.goldenRatio).toBe(GOLDEN_RATIO);
    });

    it('should calculate ratio for shoulders=100, waist=62', () => {
      const result = calculateAdonisIndex(100, 62);

      // ratio = 100 / 62 ≈ 1.6129
      expect(result.ratio).toBe(1.6129);
    });

    it('should calculate exact Golden Ratio', () => {
      // shoulders = 1.618, waist = 1
      const result = calculateAdonisIndex(161.8, 100);

      expect(result.ratio).toBe(1.618);
      expect(result.deviation).toBe(0);
      expect(result.status).toBe('optimal');
    });
  });

  describe('Status classification', () => {
    it('should be optimal when within 5% of Golden Ratio', () => {
      // 3% deviation from 1.618 = 1.5695 to 1.6665
      const result1 = calculateAdonisIndex(156.95, 100);
      expect(result1.status).toBe('optimal');

      const result2 = calculateAdonisIndex(166.65, 100);
      expect(result2.status).toBe('optimal');
    });

    it('should be near when between 5% and 15% of Golden Ratio', () => {
      // 10% deviation from 1.618 = 1.4562
      const result = calculateAdonisIndex(145.62, 100);
      expect(result.status).toBe('near');
    });

    it('should be far when more than 15% from Golden Ratio', () => {
      // 20% deviation from 1.618 = 1.2944
      const result = calculateAdonisIndex(129.44, 100);
      expect(result.status).toBe('far');
    });
  });

  describe('Deviation calculation', () => {
    it('should calculate zero deviation for exact Golden Ratio', () => {
      const result = calculateAdonisIndex(161.8, 100);
      expect(result.deviation).toBe(0);
    });

    it('should calculate positive deviation for non-Golden Ratio', () => {
      const result = calculateAdonisIndex(120, 100);
      expect(result.deviation).toBeGreaterThan(0);
    });

    it('should calculate same deviation for symmetric deviations', () => {
      // 1.618 × 1.1 = 1.7798 (10% above)
      // 1.618 × 0.9 = 1.4562 (10% below)
      const result1 = calculateAdonisIndex(177.98, 100);
      const result2 = calculateAdonisIndex(145.62, 100);

      expect(result1.deviation).toBeCloseTo(result2.deviation, 2);
    });
  });

  describe('Edge cases', () => {
    it('should throw for zero shoulders', () => {
      expect(() => calculateAdonisIndex(0, 77)).toThrow('Circumferences must be positive');
    });

    it('should throw for zero waist', () => {
      expect(() => calculateAdonisIndex(120, 0)).toThrow('Circumferences must be positive');
    });

    it('should throw for negative values', () => {
      expect(() => calculateAdonisIndex(-120, 77)).toThrow('Circumferences must be positive');
    });

    it('should throw when waist > shoulders', () => {
      expect(() => calculateAdonisIndex(80, 100)).toThrow('Waist cannot be larger than shoulders');
    });

    it('should handle equal shoulders and waist', () => {
      const result = calculateAdonisIndex(100, 100);
      expect(result.ratio).toBe(1);
      expect(result.status).toBe('far');
    });
  });

  describe('Golden Ratio constant', () => {
    it('should use correct Golden Ratio value', () => {
      expect(GOLDEN_RATIO).toBe(1.618033988749895);
    });
  });
});
