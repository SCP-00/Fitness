/**
 * Measurement Model
 *
 * Core data model for body measurements with validation and unit conversion.
 *
 * @module measurements/model
 */

import type { Measurement, MeasurementType, MeasurementUnit } from './types';

/**
 * Valid measurement ranges (in cm for length, kg for weight)
 */
export const MEASUREMENT_RANGES: Record<string, { min: number; max: number }> = {
  wrist: { min: 10, max: 30 },
  neck: { min: 25, max: 55 },
  shoulders: { min: 80, max: 180 },
  chest: { min: 60, max: 160 },
  waist: { min: 50, max: 160 },
  hips: { min: 60, max: 160 },
  biceps: { min: 20, max: 65 },
  forearm: { min: 18, max: 50 },
  thigh: { min: 35, max: 90 },
  calf: { min: 25, max: 60 },
  height: { min: 100, max: 230 },
  weight: { min: 30, max: 250 },
};

/**
 * Convert between measurement units
 */
export function convertUnits(
  value: number,
  from: MeasurementUnit,
  to: MeasurementUnit
): number {
  if (from === to) return value;

  const conversions: Record<string, Record<string, number>> = {
    cm: { in: 0.393701 },
    in: { cm: 2.54 },
    kg: { lbs: 2.20462 },
    lbs: { kg: 0.453592 },
  };

  const factor = conversions[from]?.[to];
  if (factor === undefined) {
    throw new Error(`Cannot convert from ${from} to ${to}`);
  }

  return parseFloat((value * factor).toFixed(2));
}

/**
 * Validate a measurement value
 */
export function validateMeasurement(
  type: MeasurementType,
  value: number,
  unit: MeasurementUnit
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for non-numeric
  if (typeof value !== 'number' || isNaN(value)) {
    errors.push('Value must be a number');
    return { isValid: false, errors };
  }

  // Check for negative
  if (value < 0) {
    errors.push('Value cannot be negative');
  }

  // Convert to cm/kg for range check
  let normalizedValue = value;
  if (unit === 'in') {
    normalizedValue = convertUnits(value, 'in', 'cm');
  } else if (unit === 'lbs') {
    normalizedValue = convertUnits(value, 'lbs', 'kg');
  }

  // Check range
  const range = MEASUREMENT_RANGES[type];
  if (range) {
    if (normalizedValue < range.min) {
      errors.push(`Value ${normalizedValue} cm is below minimum ${range.min} cm for ${type}`);
    }
    if (normalizedValue > range.max) {
      errors.push(`Value ${normalizedValue} cm is above maximum ${range.max} cm for ${type}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create a new measurement with auto-generated ID and timestamp
 */
export function createMeasurement(
  profileId: string,
  type: MeasurementType,
  value: number,
  unit: MeasurementUnit = 'cm',
  method: Measurement['method'] = 'manual',
  confidence: Measurement['confidence'] = 'high',
  notes?: string
): Measurement {
  const validation = validateMeasurement(type, value, unit);
  if (!validation.isValid) {
    throw new Error(`Invalid measurement: ${validation.errors.join(', ')}`);
  }

  return {
    id: generateId(),
    profileId,
    type,
    value,
    unit,
    timestamp: new Date().toISOString(),
    method,
    confidence,
    notes,
  };
}
