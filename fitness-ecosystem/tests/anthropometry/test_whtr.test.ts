/**
 * WHtR (Waist-to-Height Ratio) Tests
 *
 * Tests the clinically established indicator of central adiposity.
 */

import { describe, it, expect } from 'vitest';
import { calculateWHtR, WHTR_THRESHOLDS } from '../../bodylab/core/anthropometry/src/whtr';

describe('WHtR Calculation', () => {
  describe('Standard calculations', () => {
    it('should calculate correct ratio for waist=80cm, height=1.75m', () => {
      const result = calculateWHtR(80, 1.75);

      // WHtR = 80 / 175 ≈ 0.4571
      expect(result.ratio).toBe(0.4571);
      expect(result.status).toBe('healthy');
    });

    it('should calculate correct ratio for waist=90cm, height=1.70m', () => {
      const result = calculateWHtR(90, 1.70);

      // WHtR = 90 / 170 ≈ 0.5294
      expect(result.ratio).toBe(0.5294);
      expect(result.status).toBe('elevated');
    });

    it('should calculate correct ratio for waist=110cm, height=1.65m', () => {
      const result = calculateWHtR(110, 1.65);

      // WHtR = 110 / 165 ≈ 0.6667
      expect(result.ratio).toBe(0.6667);
      expect(result.status).toBe('high_risk');
    });
  });

  describe('Threshold boundaries', () => {
    it('should be healthy at exactly 0.50', () => {
      // waist = 87.5, height = 1.75 → 87.5/175 = 0.5
      const result = calculateWHtR(87.5, 1.75);
      expect(result.status).toBe('healthy');
      expect(result.ratio).toBe(0.5);
    });

    it('should be elevated just above 0.50', () => {
      // waist = 87.6, height = 1.75 → 87.6/175 ≈ 0.5006
      const result = calculateWHtR(87.6, 1.75);
      expect(result.status).toBe('elevated');
    });

    it('should be elevated at exactly 0.60', () => {
      // waist = 105, height = 1.75 → 105/175 = 0.6
      const result = calculateWHtR(105, 1.75);
      expect(result.status).toBe('elevated');
      expect(result.ratio).toBe(0.6);
    });

    it('should be high_risk just above 0.60', () => {
      // waist = 105.1, height = 1.75 → 105.1/175 ≈ 0.6006
      const result = calculateWHtR(105.1, 1.75);
      expect(result.status).toBe('high_risk');
    });
  });

  describe('Thresholds', () => {
    it('should have correct healthy threshold', () => {
      expect(WHTR_THRESHOLDS.healthy).toBe(0.50);
    });

    it('should have correct elevated threshold', () => {
      expect(WHTR_THRESHOLDS.elevated).toBe(0.60);
    });
  });

  describe('Descriptions', () => {
    it('should provide correct description for healthy', () => {
      const result = calculateWHtR(80, 1.75);
      expect(result.description).toContain('healthy');
    });

    it('should provide correct description for elevated', () => {
      const result = calculateWHtR(90, 1.70);
      expect(result.description).toContain('Elevated');
    });

    it('should provide correct description for high_risk', () => {
      const result = calculateWHtR(110, 1.65);
      expect(result.description).toContain('High risk');
    });
  });

  describe('Edge cases', () => {
    it('should throw for zero waist', () => {
      expect(() => calculateWHtR(0, 1.75)).toThrow('Waist circumference must be positive');
    });

    it('should throw for negative waist', () => {
      expect(() => calculateWHtR(-80, 1.75)).toThrow('Waist circumference must be positive');
    });

    it('should throw for zero height', () => {
      expect(() => calculateWHtR(80, 0)).toThrow('Height must be between 0 and 2.5 meters');
    });

    it('should throw for negative height', () => {
      expect(() => calculateWHtR(80, -1.75)).toThrow('Height must be between 0 and 2.5 meters');
    });

    it('should throw for unrealistic height (> 2.5m)', () => {
      expect(() => calculateWHtR(80, 3.0)).toThrow('Height must be between 0 and 2.5 meters');
    });

    it('should handle minimum realistic values', () => {
      const result = calculateWHtR(60, 1.50);
      expect(result.ratio).toBe(0.4);
      expect(result.status).toBe('healthy');
    });

    it('should handle maximum realistic values', () => {
      const result = calculateWHtR(150, 2.00);
      expect(result.ratio).toBe(0.75);
      expect(result.status).toBe('high_risk');
    });
  });

  describe('Mathematical relationships', () => {
    it('should scale inversely with height', () => {
      const result1 = calculateWHtR(80, 1.60);
      const result2 = calculateWHtR(80, 1.80);

      // Same waist, taller person → lower WHtR
      expect(result2.ratio).toBeLessThan(result1.ratio);
    });

    it('should scale directly with waist', () => {
      const result1 = calculateWHtR(70, 1.75);
      const result2 = calculateWHtR(90, 1.75);

      // Same height, larger waist → higher WHtR
      expect(result2.ratio).toBeGreaterThan(result1.ratio);
    });
  });
});
