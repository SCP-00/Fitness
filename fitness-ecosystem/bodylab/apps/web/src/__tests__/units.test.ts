import { describe, it, expect } from 'vitest';
import {
  displayUnitFor,
  profileUnitFor,
  toDisplay,
  toCanonical,
  formatMeasurement,
  heightToDisplay,
  heightToCanonical,
  weightToDisplay,
  weightToCanonical,
  UNIT_LABELS,
} from '../lib/units';

describe('displayUnitFor', () => {
  it('metric shows cm for circumferences and kg for mass types', () => {
    expect(displayUnitFor('chest', 'metric')).toBe('cm');
    expect(displayUnitFor('waist', 'metric')).toBe('cm');
    expect(displayUnitFor('weight', 'metric')).toBe('kg');
    expect(displayUnitFor('lean_mass', 'metric')).toBe('kg');
    expect(displayUnitFor('bone_mass', 'metric')).toBe('kg');
  });

  it('imperial shows in for circumferences and lb for mass types', () => {
    expect(displayUnitFor('chest', 'imperial')).toBe('in');
    expect(displayUnitFor('thigh_right', 'imperial')).toBe('in');
    expect(displayUnitFor('weight', 'imperial')).toBe('lb');
    expect(displayUnitFor('lean_mass', 'imperial')).toBe('lb');
  });

  it('metric-locked types stay identical in both systems (%, m, bpm, mm)', () => {
    expect(displayUnitFor('body_fat_percentage', 'imperial')).toBe('%');
    expect(displayUnitFor('water_percentage', 'imperial')).toBe('%');
    expect(displayUnitFor('body_fat_measured', 'imperial')).toBe('%');
    // Conditioning types have non-length canonical units — they never convert
    expect(displayUnitFor('cooper_12m_distance', 'metric')).toBe('m');
    expect(displayUnitFor('cooper_12m_distance', 'imperial')).toBe('m');
    expect(displayUnitFor('resting_heart_rate', 'imperial')).toBe('bpm');
    expect(displayUnitFor('abdominal_skinfold', 'imperial')).toBe('mm');
    expect(toDisplay('cooper_12m_distance', 2400, 'imperial')).toBe(2400);
    expect(toDisplay('resting_heart_rate', 60, 'imperial')).toBe(60);
    expect(toDisplay('triceps_skinfold', 12.5, 'imperial')).toBe(12.5);
    expect(toDisplay('body_fat_measured', 16.4, 'imperial')).toBe(16.4);
  });
});

describe('toDisplay / toCanonical', () => {
  it('converts cm→in and kg→lb at the display boundary', () => {
    expect(toDisplay('chest', 100, 'imperial')).toBe(39.37);
    expect(toDisplay('weight', 75, 'imperial')).toBe(165.35);
    expect(toDisplay('waist', 80, 'metric')).toBe(80);
    expect(toDisplay('weight', 75, 'metric')).toBe(75);
  });

  it('round-trips a circumference display→canonical→display stably', () => {
    const inches = toDisplay('chest', 100, 'imperial'); // 39.37
    const back = toCanonical('chest', inches, 'imperial'); // 99.99 (lossy by design)
    expect(back).toBeCloseTo(100, 1);
    expect(toDisplay('chest', back, 'imperial')).toBe(39.37);
  });

  it('round-trips a mass display→canonical→display stably', () => {
    const lbs = toDisplay('weight', 75, 'imperial'); // 165.35
    const back = toCanonical('weight', lbs, 'imperial'); // 74.99 (lossy by design)
    expect(back).toBeCloseTo(75, 1);
    expect(toDisplay('weight', back, 'imperial')).toBe(165.35);
  });

  it('imperial input converts back to canonical metric before storage', () => {
    // User types 40 in for chest → store expects cm
    expect(toCanonical('chest', 40, 'imperial')).toBe(101.6);
    // User types 180 lb for weight → store expects kg
    expect(toCanonical('weight', 180, 'imperial')).toBe(81.65);
  });
});

describe('formatMeasurement', () => {
  it('formats with the display unit symbol in both languages', () => {
    expect(formatMeasurement('chest', 100, 'metric', 'en')).toBe('100 cm');
    expect(formatMeasurement('chest', 100, 'metric', 'es')).toBe('100 cm');
    expect(formatMeasurement('chest', 100, 'imperial', 'en')).toBe('39.37 in');
    expect(formatMeasurement('weight', 75, 'imperial', 'es')).toBe('165.35 lb');
  });

  it('every display unit label exists in both languages', () => {
    for (const labels of Object.values(UNIT_LABELS)) {
      expect(labels.en).toBeTruthy();
      expect(labels.es).toBeTruthy();
    }
  });
});

describe('profile height/weight helpers', () => {
  it('height stays meters in metric and converts to inches in imperial', () => {
    expect(heightToDisplay(1.78, 'metric')).toBe(1.78);
    expect(heightToDisplay(1.78, 'imperial')).toBe(70.08); // 178 cm → in
    expect(heightToCanonical(70.08, 'imperial')).toBeCloseTo(1.78, 2);
    expect(heightToCanonical(1.78, 'metric')).toBe(1.78);
  });

  it('weight stays kg in metric and converts to lb in imperial', () => {
    expect(weightToDisplay(75, 'metric')).toBe(75);
    expect(weightToDisplay(75, 'imperial')).toBe(165.35);
    expect(weightToCanonical(165.35, 'imperial')).toBeCloseTo(75, 1);
    expect(weightToCanonical(75, 'metric')).toBe(75);
  });

  it('profileUnitFor picks m/in for height and kg/lb for weight', () => {
    expect(profileUnitFor('height', 'metric')).toBe('m');
    expect(profileUnitFor('height', 'imperial')).toBe('in');
    expect(profileUnitFor('weight', 'metric')).toBe('kg');
    expect(profileUnitFor('weight', 'imperial')).toBe('lb');
  });
});
