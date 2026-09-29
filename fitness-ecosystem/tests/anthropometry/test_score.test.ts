/**
 * Score Calculation Tests
 *
 * Tests the deviation calculation, score normalization, and color mapping.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDeviation,
  calculateScore,
  classifyScore,
  scoreToColor,
  PENALTY_FACTOR,
} from '../../bodylab/core/anthropometry/src/score';

describe('Score Calculation', () => {
  describe('Deviation calculation', () => {
    it('should calculate zero deviation for equal values', () => {
      expect(calculateDeviation(80, 80)).toBe(0);
    });

    it('should calculate correct deviation', () => {
      // |82 - 80| / 80 = 0.025
      expect(calculateDeviation(82, 80)).toBe(0.025);
    });

    it('should calculate deviation for actual < ideal', () => {
      // |78 - 80| / 80 = 0.025
      expect(calculateDeviation(78, 80)).toBe(0.025);
    });

    it('should calculate large deviation', () => {
      // |100 - 80| / 80 = 0.25
      expect(calculateDeviation(100, 80)).toBe(0.25);
    });

    it('should throw for zero ideal', () => {
      expect(() => calculateDeviation(80, 0)).toThrow('Ideal value must be positive');
    });

    it('should throw for negative ideal', () => {
      expect(() => calculateDeviation(80, -10)).toThrow('Ideal value must be positive');
    });
  });

  describe('Score calculation', () => {
    it('should calculate score of 1.0 for zero deviation', () => {
      expect(calculateScore(0)).toBe(1);
    });

    it('should calculate correct score for known deviation', () => {
      // S = max(0, 1 - 4.0 × 0.025) = 0.90
      expect(calculateScore(0.025)).toBe(0.90);
    });

    it('should calculate score of 0.5 for deviation 0.125', () => {
      // S = max(0, 1 - 4.0 × 0.125) = 0.5
      expect(calculateScore(0.125)).toBe(0.5);
    });

    it('should calculate score of 0 for large deviation', () => {
      // S = max(0, 1 - 4.0 × 0.30) = max(0, -0.2) = 0
      expect(calculateScore(0.30)).toBe(0);
    });

    it('should never return negative score', () => {
      expect(calculateScore(1.0)).toBe(0);
      expect(calculateScore(100)).toBe(0);
    });

    it('should use custom penalty factor', () => {
      // S = max(0, 1 - 2.0 × 0.25) = 0.5
      expect(calculateScore(0.25, 2.0)).toBe(0.5);
    });

    it('should throw for zero penalty factor', () => {
      expect(() => calculateScore(0.1, 0)).toThrow('Penalty factor must be positive');
    });

    it('should throw for negative penalty factor', () => {
      expect(() => calculateScore(0.1, -1)).toThrow('Penalty factor must be positive');
    });
  });

  describe('Penalty factor', () => {
    it('should have correct default penalty factor', () => {
      expect(PENALTY_FACTOR).toBe(4.0);
    });
  });

  describe('Score classification', () => {
    it('should classify as optimal for score >= 0.90', () => {
      expect(classifyScore(1.0)).toBe('optimal');
      expect(classifyScore(0.95)).toBe('optimal');
      expect(classifyScore(0.90)).toBe('optimal');
    });

    it('should classify as near for score 0.70-0.89', () => {
      expect(classifyScore(0.89)).toBe('near');
      expect(classifyScore(0.80)).toBe('near');
      expect(classifyScore(0.70)).toBe('near');
    });

    it('should classify as moderate for score 0.40-0.69', () => {
      expect(classifyScore(0.69)).toBe('moderate');
      expect(classifyScore(0.55)).toBe('moderate');
      expect(classifyScore(0.40)).toBe('moderate');
    });

    it('should classify as significant for score < 0.40', () => {
      expect(classifyScore(0.39)).toBe('significant');
      expect(classifyScore(0.20)).toBe('significant');
      expect(classifyScore(0.0)).toBe('significant');
    });
  });

  describe('Score to color mapping', () => {
    it('should map optimal score to emerald', () => {
      const color = scoreToColor(0.95);
      expect(color.name).toBe('emerald');
      expect(color.hex).toBe('#10B981');
      expect(color.hue).toBe(155);
    });

    it('should map near score to yellow', () => {
      const color = scoreToColor(0.80);
      expect(color.name).toBe('yellow');
      expect(color.hex).toBe('#FBBF24');
      expect(color.hue).toBe(90);
    });

    it('should map moderate score to orange', () => {
      const color = scoreToColor(0.55);
      expect(color.name).toBe('orange');
      expect(color.hex).toBe('#F97316');
      expect(color.hue).toBe(45);
    });

    it('should map significant score to red', () => {
      const color = scoreToColor(0.20);
      expect(color.name).toBe('red');
      expect(color.hex).toBe('#EF4444');
      expect(color.hue).toBe(10);
    });

    it('should clamp score to 0-1 range', () => {
      expect(scoreToColor(-0.5).name).toBe('red');
      expect(scoreToColor(1.5).name).toBe('emerald');
    });
  });

  describe('Complete pipeline test', () => {
    it('should produce correct score for waist measurement', () => {
      const actual = 82;
      const ideal = 80;

      const deviation = calculateDeviation(actual, ideal);
      const score = calculateScore(deviation);
      const classification = classifyScore(score);
      const color = scoreToColor(score);

      expect(deviation).toBe(0.025);
      expect(score).toBe(0.90);
      expect(classification).toBe('optimal');
      expect(color.name).toBe('emerald');
    });

    it('should produce correct score for large deviation', () => {
      const actual = 100;
      const ideal = 80;

      const deviation = calculateDeviation(actual, ideal);
      const score = calculateScore(deviation);
      const classification = classifyScore(score);
      const color = scoreToColor(score);

      expect(deviation).toBe(0.25);
      expect(score).toBe(0);
      expect(classification).toBe('significant');
      expect(color.name).toBe('red');
    });
  });
});
