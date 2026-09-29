/**
 * OxiHuman Adapter Tests
 *
 * Tests for the integration adapter that maps body parameters to OxiHuman controls.
 */

import { describe, it, expect } from 'vitest';
import {
  bodyParamsToOxiParams,
  oxiParamsToBodyParams,
  calculateMeasurementDeviation,
  getOxiParamRanges,
  getExportExtension,
  getExportMimeType,
} from '../../bodylab/integrations/oxihuman/adapter';

describe('OxiHuman Adapter', () => {
  describe('bodyParamsToOxiParams', () => {
    it('should convert height correctly', () => {
      const params = { height: 1.75, weight: 75 };
      const oxiParams = bodyParamsToOxiParams(params);

      // height: 1.75m in range 0.5-2.5 → (1.75-0.5)/(2.5-0.5) = 0.625
      expect(oxiParams.height).toBeCloseTo(0.625, 2);
    });

    it('should convert weight correctly', () => {
      const params = { height: 1.75, weight: 75 };
      const oxiParams = bodyParamsToOxiParams(params);

      // weight: 75kg in range 30-250 → (75-30)/(250-30) = 0.2045
      expect(oxiParams.weight).toBeCloseTo(0.20, 2);
    });

    it('should pass through muscle value', () => {
      const params = { height: 1.75, weight: 75, muscle: 0.7 };
      const oxiParams = bodyParamsToOxiParams(params);

      expect(oxiParams.muscle).toBe(0.7);
    });

    it('should clamp muscle value', () => {
      const params = { height: 1.75, weight: 75, muscle: 1.5 };
      const oxiParams = bodyParamsToOxiParams(params);

      expect(oxiParams.muscle).toBe(1);
    });

    it('should convert age correctly', () => {
      const params = { height: 1.75, weight: 75, age: 30 };
      const oxiParams = bodyParamsToOxiParams(params);

      // age: 30 in range 18-100 → (30-18)/(100-18) = 0.1463
      expect(oxiParams.age).toBeCloseTo(0.15, 2);
    });

    it('should convert chest circumference', () => {
      const params = { height: 1.75, weight: 75, chest: 100 };
      const oxiParams = bodyParamsToOxiParams(params);

      // chest: 100cm in range 60-160 → (100-60)/(160-60) = 0.4
      expect(oxiParams.chest).toBeCloseTo(0.4, 2);
    });

    it('should convert waist circumference', () => {
      const params = { height: 1.75, weight: 75, waist: 80 };
      const oxiParams = bodyParamsToOxiParams(params);

      // waist: 80cm in range 50-160 → (80-50)/(160-50) = 0.2727
      expect(oxiParams.waist).toBeCloseTo(0.27, 2);
    });

    it('should convert hip circumference', () => {
      const params = { height: 1.75, weight: 75, hips: 95 };
      const oxiParams = bodyParamsToOxiParams(params);

      // hips: 95cm in range 60-160 → (95-60)/(160-60) = 0.35
      expect(oxiParams.hips).toBeCloseTo(0.35, 2);
    });

    it('should handle multiple parameters', () => {
      const params = {
        height: 1.75,
        weight: 75,
        muscle: 0.6,
        age: 30,
        chest: 100,
        waist: 80,
        hips: 95,
      };
      const oxiParams = bodyParamsToOxiParams(params);

      expect(oxiParams.height).toBeDefined();
      expect(oxiParams.weight).toBeDefined();
      expect(oxiParams.muscle).toBeDefined();
      expect(oxiParams.age).toBeDefined();
      expect(oxiParams.chest).toBeDefined();
      expect(oxiParams.waist).toBeDefined();
      expect(oxiParams.hips).toBeDefined();
    });

    it('should handle empty params', () => {
      const oxiParams = bodyParamsToOxiParams({});
      expect(oxiParams.height).toBeUndefined();
      expect(oxiParams.weight).toBeUndefined();
    });
  });

  describe('oxiParamsToBodyParams', () => {
    it('should convert height back correctly', () => {
      const oxiParams = { height: 0.625, weight: 0.2 };
      const bodyParams = oxiParamsToBodyParams(oxiParams);

      // height: 0.625 → 0.5 + 0.625 * (2.5-0.5) = 1.75
      expect(bodyParams.height).toBeCloseTo(1.75, 2);
    });

    it('should convert weight back correctly', () => {
      const oxiParams = { height: 0.5, weight: 0.2045 };
      const bodyParams = oxiParamsToBodyParams(oxiParams);

      // weight: 0.2045 → 30 + 0.2045 * (250-30) = 75
      expect(bodyParams.weight).toBeCloseTo(75, 0);
    });

    it('should round age to integer', () => {
      const oxiParams = { age: 0.1463 };
      const bodyParams = oxiParamsToBodyParams(oxiParams);

      expect(bodyParams.age).toBe(30);
    });

    it('should handle default values', () => {
      const bodyParams = oxiParamsToBodyParams({});

      expect(bodyParams.height).toBeDefined();
      expect(bodyParams.weight).toBeDefined();
    });
  });

  describe('calculateMeasurementDeviation', () => {
    it('should calculate zero deviation for matching measurements', () => {
      const target = { height: 1.75, weight: 75, chest: 100, waist: 80 };
      const actual = { height: 1.75, weight: 75, chest: 100, waist: 80 };

      const deviations = calculateMeasurementDeviation(target, actual);

      expect(deviations.chest).toBe(0);
      expect(deviations.waist).toBe(0);
    });

    it('should calculate positive deviation', () => {
      const target = { height: 1.75, weight: 75, chest: 100 };
      const actual = { height: 1.75, weight: 75, chest: 103 };

      const deviations = calculateMeasurementDeviation(target, actual);

      expect(deviations.chest).toBe(3);
    });

    it('should calculate negative deviation', () => {
      const target = { height: 1.75, weight: 75, chest: 100 };
      const actual = { height: 1.75, weight: 75, chest: 97 };

      const deviations = calculateMeasurementDeviation(target, actual);

      expect(deviations.chest).toBe(-3);
    });

    it('should calculate multiple deviations', () => {
      const target = { height: 1.75, weight: 75, chest: 100, waist: 80, hips: 95 };
      const actual = { height: 1.75, weight: 75, chest: 103, waist: 78, hips: 96 };

      const deviations = calculateMeasurementDeviation(target, actual);

      expect(deviations.chest).toBe(3);
      expect(deviations.waist).toBe(-2);
      expect(deviations.hips).toBe(1);
    });

    it('should handle missing measurements', () => {
      const target = { height: 1.75, weight: 75 };
      const actual = { height: 1.75, weight: 75 };

      const deviations = calculateMeasurementDeviation(target, actual);

      expect(Object.keys(deviations).length).toBe(0);
    });
  });

  describe('getOxiParamRanges', () => {
    it('should return ranges for all parameters', () => {
      const ranges = getOxiParamRanges();

      expect(ranges.height).toBeDefined();
      expect(ranges.weight).toBeDefined();
      expect(ranges.muscle).toBeDefined();
      expect(ranges.age).toBeDefined();
      expect(ranges.chest).toBeDefined();
      expect(ranges.waist).toBeDefined();
      expect(ranges.hips).toBeDefined();
    });

    it('should have valid ranges', () => {
      const ranges = getOxiParamRanges();

      for (const [key, range] of Object.entries(ranges)) {
        expect(range.min).toBeLessThan(range.max);
        expect(range.default).toBeGreaterThanOrEqual(range.min);
        expect(range.default).toBeLessThanOrEqual(range.max);
      }
    });
  });

  describe('Export utilities', () => {
    it('should return correct extension for GLB', () => {
      expect(getExportExtension('glb')).toBe('.glb');
    });

    it('should return correct extension for VRM', () => {
      expect(getExportExtension('vrm')).toBe('.vrm');
    });

    it('should return correct extension for STL', () => {
      expect(getExportExtension('stl')).toBe('.stl');
    });

    it('should return correct extension for OBJ', () => {
      expect(getExportExtension('obj')).toBe('.obj');
    });

    it('should return correct MIME type for GLB', () => {
      expect(getExportMimeType('glb')).toBe('model/gltf-binary');
    });

    it('should return correct MIME type for STL', () => {
      expect(getExportMimeType('stl')).toBe('model/stl');
    });

    it('should return correct MIME type for OBJ', () => {
      expect(getExportMimeType('obj')).toBe('model/obj');
    });
  });

  describe('Roundtrip conversion', () => {
    it('should preserve height through roundtrip', () => {
      const original = { height: 1.75, weight: 75 };
      const oxiParams = bodyParamsToOxiParams(original);
      const restored = oxiParamsToBodyParams(oxiParams);

      expect(restored.height).toBeCloseTo(original.height, 1);
    });

    it('should preserve weight through roundtrip', () => {
      const original = { height: 1.75, weight: 75 };
      const oxiParams = bodyParamsToOxiParams(original);
      const restored = oxiParamsToBodyParams(oxiParams);

      expect(restored.weight).toBeCloseTo(original.weight, 0);
    });

    it('should preserve chest through roundtrip', () => {
      const original = { height: 1.75, weight: 75, chest: 100 };
      const oxiParams = bodyParamsToOxiParams(original);
      const restored = oxiParamsToBodyParams(oxiParams);

      expect(restored.chest).toBeCloseTo(original.chest, 0);
    });
  });
});
