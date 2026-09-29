/**
 * Measurements Model Tests
 *
 * Tests the measurement data model, validation, and unit conversion.
 */

import { describe, it, expect } from 'vitest';
import {
  convertUnits,
  validateMeasurement,
  createMeasurement,
  MEASUREMENT_RANGES,
} from '../../bodylab/core/measurements/src/model';

describe('Measurement Model', () => {
  describe('Unit Conversion', () => {
    it('should convert cm to inches', () => {
      expect(convertUnits(100, 'cm', 'in')).toBeCloseTo(39.37, 1);
    });

    it('should convert inches to cm', () => {
      expect(convertUnits(39.37, 'in', 'cm')).toBeCloseTo(100, 1);
    });

    it('should convert kg to lbs', () => {
      expect(convertUnits(70, 'kg', 'lbs')).toBeCloseTo(154.32, 1);
    });

    it('should convert lbs to kg', () => {
      expect(convertUnits(154.32, 'lbs', 'kg')).toBeCloseTo(70, 1);
    });

    it('should return same value for same unit', () => {
      expect(convertUnits(50, 'cm', 'cm')).toBe(50);
    });

    it('should throw for invalid conversion', () => {
      expect(() => convertUnits(50, 'cm', 'kg')).toThrow('Cannot convert');
    });
  });

  describe('Measurement Validation', () => {
    it('should validate correct waist measurement', () => {
      const result = validateMeasurement('waist', 80, 'cm');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative values', () => {
      const result = validateMeasurement('waist', -10, 'cm');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('negative');
    });

    it('should reject values below minimum', () => {
      const result = validateMeasurement('wrist', 5, 'cm');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('below minimum');
    });

    it('should reject values above maximum', () => {
      const result = validateMeasurement('wrist', 50, 'cm');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('above maximum');
    });

    it('should validate correct wrist measurement', () => {
      const result = validateMeasurement('wrist', 17, 'cm');
      expect(result.isValid).toBe(true);
    });

    it('should validate correct height measurement', () => {
      const result = validateMeasurement('height', 175, 'cm');
      expect(result.isValid).toBe(true);
    });

    it('should validate correct weight measurement', () => {
      const result = validateMeasurement('weight', 75, 'kg');
      expect(result.isValid).toBe(true);
    });

    it('should convert inches before range check', () => {
      // 10 inches = 25.4 cm, which is within wrist range (10-30 cm)
      const result = validateMeasurement('wrist', 10, 'in');
      expect(result.isValid).toBe(true);
    });

    it('should reject inches above range', () => {
      // 12 inches = 30.48 cm, which is above wrist max of 30 cm
      const result = validateMeasurement('wrist', 12, 'in');
      expect(result.isValid).toBe(false);
    });

    it('should have defined ranges for all measurement types', () => {
      const types = ['wrist', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'biceps', 'forearm', 'thigh', 'calf', 'height', 'weight'];
      for (const type of types) {
        expect(MEASUREMENT_RANGES[type]).toBeDefined();
        expect(MEASUREMENT_RANGES[type].min).toBeGreaterThan(0);
        expect(MEASUREMENT_RANGES[type].max).toBeGreaterThan(MEASUREMENT_RANGES[type].min);
      }
    });
  });

  describe('Create Measurement', () => {
    it('should create a measurement with auto-generated ID', () => {
      const measurement = createMeasurement('profile-1', 'waist', 80);
      expect(measurement.id).toBeDefined();
      expect(measurement.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should create a measurement with correct fields', () => {
      const measurement = createMeasurement('profile-1', 'waist', 80, 'cm', 'manual', 'high', 'test note');
      expect(measurement.profileId).toBe('profile-1');
      expect(measurement.type).toBe('waist');
      expect(measurement.value).toBe(80);
      expect(measurement.unit).toBe('cm');
      expect(measurement.method).toBe('manual');
      expect(measurement.confidence).toBe('high');
      expect(measurement.notes).toBe('test note');
    });

    it('should create a measurement with ISO timestamp', () => {
      const measurement = createMeasurement('profile-1', 'waist', 80);
      expect(measurement.timestamp).toBeDefined();
      expect(new Date(measurement.timestamp).toISOString()).toBe(measurement.timestamp);
    });

    it('should throw for invalid measurement', () => {
      expect(() => createMeasurement('profile-1', 'waist', -10)).toThrow('Invalid measurement');
    });
  });
});
