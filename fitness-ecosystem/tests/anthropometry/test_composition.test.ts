/**
 * Composition Tests
 *
 * Tests for body composition calculations.
 */

import { describe, it, expect } from 'vitest';
import { calculateWHtR } from '../../bodylab/core/composition/src/whtr';
import { calculateFrameSize } from '../../bodylab/core/composition/src/frame-size';

describe('Composition Module', () => {
  describe('WHtR', () => {
    it('should calculate healthy WHtR', () => {
      const result = calculateWHtR(80, 1.75);
      expect(result.status).toBe('healthy');
      expect(result.ratio).toBeCloseTo(0.4571, 3);
    });

    it('should calculate elevated WHtR', () => {
      const result = calculateWHtR(90, 1.70);
      expect(result.status).toBe('elevated');
    });

    it('should calculate high risk WHtR', () => {
      const result = calculateWHtR(110, 1.65);
      expect(result.status).toBe('high_risk');
    });

    it('should throw for invalid input', () => {
      expect(() => calculateWHtR(0, 1.75)).toThrow();
      expect(() => calculateWHtR(80, 0)).toThrow();
    });
  });

  describe('Frame Size', () => {
    it('should classify small frame', () => {
      // height=165, wrist=14.5 → ratio=11.38 → small
      const result = calculateFrameSize(1.65, 14.5);
      expect(result.frameSize).toBe('small');
      expect(result.ratio).toBeCloseTo(11.38, 1);
    });

    it('should classify medium frame', () => {
      // height=165, wrist=16 → ratio=10.3125 → medium
      const result = calculateFrameSize(1.65, 16);
      expect(result.frameSize).toBe('medium');
    });

    it('should classify large frame', () => {
      // height=165, wrist=18 → ratio=9.1667 → large
      const result = calculateFrameSize(1.65, 18);
      expect(result.frameSize).toBe('large');
    });

    it('should throw for invalid input', () => {
      expect(() => calculateFrameSize(0, 14.5)).toThrow();
      expect(() => calculateFrameSize(1.65, 0)).toThrow();
    });
  });
});
