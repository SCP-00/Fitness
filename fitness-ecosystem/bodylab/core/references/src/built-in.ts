/**
 * Built-in Reference Profiles
 *
 * Pre-configured reference profiles for common use cases.
 *
 * @module references/built-in
 */

import type { ReferenceProfileData } from './types';

/**
 * Built-in reference profiles
 */
export const BUILT_IN_PROFILES: ReferenceProfileData[] = [
  {
    id: 'health_whtr_male',
    name: 'Healthy WHtR (Male)',
    description: 'Waist-to-height ratio within healthy range for males',
    category: 'health',
    source: 'WHO / NICE NG246',
    biologicalSex: 'male',
    measurements: [
      {
        type: 'whtr',
        value: 0.50,
        range: { min: 0, max: 0.50 },
        description: 'WHtR should be ≤ 0.50 for healthy range',
      },
    ],
    units: 'metric',
    version: '1.0.0',
  },
  {
    id: 'health_whtr_female',
    name: 'Healthy WHtR (Female)',
    description: 'Waist-to-height ratio within healthy range for females',
    category: 'health',
    source: 'WHO / NICE NG246',
    biologicalSex: 'female',
    measurements: [
      {
        type: 'whtr',
        value: 0.50,
        range: { min: 0, max: 0.50 },
        description: 'WHtR should be ≤ 0.50 for healthy range',
      },
    ],
    units: 'metric',
    version: '1.0.0',
  },
  {
    id: 'mccallum_recreational',
    name: 'McCallum Recreational',
    description: 'Classic McCallum proportions for recreational fitness',
    category: 'anthropometric',
    source: 'John McCallum - Schwarzenegger proportions',
    biologicalSex: 'male',
    measurements: [
      {
        type: 'chest_to_wrist',
        value: 6.5,
        description: 'Chest = 6.5 × Wrist',
      },
      {
        type: 'waist_to_chest',
        value: 0.70,
        description: 'Waist = 70% of Chest',
      },
      {
        type: 'hips_to_chest',
        value: 0.85,
        description: 'Hips = 85% of Chest',
      },
      {
        type: 'biceps_to_chest',
        value: 0.36,
        description: 'Biceps = 36% of Chest',
      },
      {
        type: 'thigh_to_chest',
        value: 0.53,
        description: 'Thigh = 53% of Chest',
      },
      {
        type: 'neck_to_chest',
        value: 0.37,
        description: 'Neck = 37% of Chest',
      },
      {
        type: 'calf_to_chest',
        value: 0.34,
        description: 'Calf = 34% of Chest',
      },
      {
        type: 'forearm_to_chest',
        value: 0.29,
        description: 'Forearm = 29% of Chest',
      },
    ],
    formulas: [
      {
        name: 'McCallum Chest',
        description: 'Calculate ideal chest from wrist',
        expression: 'chest = 6.5 * wrist',
        variables: ['wrist'],
      },
    ],
    units: 'metric',
    version: '1.0.0',
  },
  {
    id: 'venus_recreational',
    name: 'Venus Recreational',
    description: 'Venus Index proportions for recreational fitness',
    category: 'anthropometric',
    source: 'Venus Index proportions',
    biologicalSex: 'female',
    measurements: [
      {
        type: 'waist_to_height',
        value: 0.38,
        description: 'Waist = 38% of Height',
      },
      {
        type: 'hips_to_height',
        value: 0.5396,
        description: 'Hips = 53.96% of Height',
      },
      {
        type: 'bust_to_height',
        value: 0.513,
        description: 'Bust = 51.3% of Height',
      },
      {
        type: 'shoulders_to_height',
        value: 0.61484,
        description: 'Shoulders = 61.484% of Height',
      },
    ],
    formulas: [
      {
        name: 'Venus Waist',
        description: 'Calculate ideal waist from height',
        expression: 'waist = 0.38 * height_cm',
        variables: ['height'],
      },
    ],
    units: 'metric',
    version: '1.0.0',
  },
];

/**
 * Load all built-in reference profiles
 */
export function loadBuiltInProfiles(): ReferenceProfileData[] {
  return [...BUILT_IN_PROFILES];
}

/**
 * Get a built-in profile by ID
 */
export function getBuiltInProfile(id: string): ReferenceProfileData | undefined {
  return BUILT_IN_PROFILES.find((p) => p.id === id);
}
