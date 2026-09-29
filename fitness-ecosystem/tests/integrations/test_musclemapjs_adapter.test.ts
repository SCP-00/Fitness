/**
 * MuscleMapJS Adapter Tests
 *
 * Tests for the integration adapter that maps anthropometric scores to heatmap data.
 */

import { describe, it, expect } from 'vitest';
import {
  scoreToIntensity,
  scoresToHeatmap,
  scoreToColor,
  getColorScale,
  getMuscleDisplayName,
  MEASUREMENT_TO_MUSCLE,
} from '../../bodylab/integrations/musclemapjs/adapter';

describe('MuscleMapJS Adapter', () => {
  describe('scoreToIntensity', () => {
    it('should invert score to intensity', () => {
      // High score (good) = low intensity (less attention needed)
      expect(scoreToIntensity(1.0)).toBe(0);
      expect(scoreToIntensity(0.0)).toBe(1);
      expect(scoreToIntensity(0.5)).toBe(0.5);
    });

    it('should clamp values', () => {
      expect(scoreToIntensity(-0.5)).toBe(1);
      expect(scoreToIntensity(1.5)).toBe(0);
    });
  });

  describe('scoresToHeatmap', () => {
    it('should convert single measurement score', () => {
      const scores = { chest: 0.9 };
      const heatmap = scoresToHeatmap(scores);

      expect(heatmap.length).toBe(1);
      expect(heatmap[0].muscle).toBe('chest');
      expect(heatmap[0].intensity).toBeCloseTo(0.1, 1); // 1 - 0.9 = 0.1
    });

    it('should convert multiple measurement scores', () => {
      const scores = {
        chest: 0.9,
        waist: 0.7,
        biceps: 0.5,
      };
      const heatmap = scoresToHeatmap(scores);

      // chest → 1 muscle, waist → 2 muscles, biceps → 1 muscle
      expect(heatmap.length).toBe(4);
    });

    it('should skip unknown measurement types', () => {
      const scores = {
        chest: 0.9,
        unknown_type: 0.5,
      };
      const heatmap = scoresToHeatmap(scores);

      expect(heatmap.length).toBe(1);
    });

    it('should handle empty scores', () => {
      const heatmap = scoresToHeatmap({});
      expect(heatmap.length).toBe(0);
    });

    it('should map waist to abs and obliques', () => {
      const scores = { waist: 0.8 };
      const heatmap = scoresToHeatmap(scores);

      expect(heatmap.length).toBe(2);
      expect(heatmap.map((h) => h.muscle)).toContain('abs');
      expect(heatmap.map((h) => h.muscle)).toContain('obliques');
    });

    it('should map thigh to quadriceps and hamstring', () => {
      const scores = { thigh: 0.6 };
      const heatmap = scoresToHeatmap(scores);

      expect(heatmap.length).toBe(2);
      expect(heatmap.map((h) => h.muscle)).toContain('quadriceps');
      expect(heatmap.map((h) => h.muscle)).toContain('hamstring');
    });
  });

  describe('scoreToColor', () => {
    it('should return emerald for optimal score', () => {
      expect(scoreToColor(0.95)).toBe('#10B981');
      expect(scoreToColor(1.0)).toBe('#10B981');
    });

    it('should return yellow for near score', () => {
      expect(scoreToColor(0.80)).toBe('#FBBF24');
      expect(scoreToColor(0.70)).toBe('#FBBF24');
    });

    it('should return orange for moderate score', () => {
      expect(scoreToColor(0.55)).toBe('#F97316');
      expect(scoreToColor(0.40)).toBe('#F97316');
    });

    it('should return red for significant score', () => {
      expect(scoreToColor(0.30)).toBe('#EF4444');
      expect(scoreToColor(0.0)).toBe('#EF4444');
    });
  });

  describe('getColorScale', () => {
    it('should return workout for progress', () => {
      expect(getColorScale('progress')).toBe('workout');
    });

    it('should return thermal for assessment', () => {
      expect(getColorScale('assessment')).toBe('thermal');
    });

    it('should return medical for comparison', () => {
      expect(getColorScale('comparison')).toBe('medical');
    });
  });

  describe('getMuscleDisplayName', () => {
    it('should return Spanish name by default', () => {
      expect(getMuscleDisplayName('chest')).toBe('Pecho');
      expect(getMuscleDisplayName('biceps')).toBe('Bíceps');
      expect(getMuscleDisplayName('abs')).toBe('Abdomen');
    });

    it('should return English name when specified', () => {
      expect(getMuscleDisplayName('chest', 'en')).toBe('Chest');
      expect(getMuscleDisplayName('biceps', 'en')).toBe('Biceps');
    });

    it('should return muscle name for unknown muscles', () => {
      expect(getMuscleDisplayName('unknown' as any)).toBe('unknown');
    });
  });

  describe('MEASUREMENT_TO_MUSCLE mapping', () => {
    it('should have mappings for all main measurement types', () => {
      const mainTypes = ['chest', 'waist', 'hips', 'biceps', 'forearm', 'thigh', 'calf', 'neck', 'shoulders'];
      for (const type of mainTypes) {
        expect(MEASUREMENT_TO_MUSCLE[type]).toBeDefined();
        expect(MEASUREMENT_TO_MUSCLE[type].length).toBeGreaterThan(0);
      }
    });

    it('should map chest to chest muscle', () => {
      expect(MEASUREMENT_TO_MUSCLE['chest']).toEqual(['chest']);
    });

    it('should map waist to abs and obliques', () => {
      expect(MEASUREMENT_TO_MUSCLE['waist']).toContain('abs');
      expect(MEASUREMENT_TO_MUSCLE['waist']).toContain('obliques');
    });

    it('should map shoulders to deltoids', () => {
      expect(MEASUREMENT_TO_MUSCLE['shoulders']).toContain('deltoids');
    });
  });

  describe('Integration pipeline', () => {
    it('should convert scores to heatmap correctly', () => {
      const scores = {
        chest: 0.95,   // Optimal
        waist: 0.75,   // Near
        biceps: 0.50,  // Moderate
        thigh: 0.30,   // Significant
      };

      const heatmap = scoresToHeatmap(scores);

      // Should have muscles for all measurement types
      expect(heatmap.length).toBeGreaterThan(0);

      // Each intensity should be between 0 and 1
      for (const entry of heatmap) {
        expect(entry.intensity).toBeGreaterThanOrEqual(0);
        expect(entry.intensity).toBeLessThanOrEqual(1);
      }

      // High score = low intensity
      const chestEntry = heatmap.find((h) => h.muscle === 'chest');
      expect(chestEntry?.intensity).toBeCloseTo(0.05, 1);

      // Low score = high intensity
      const thighEntry = heatmap.find((h) => h.muscle === 'quadriceps');
      expect(thighEntry?.intensity).toBeCloseTo(0.70, 1);
    });
  });
});
