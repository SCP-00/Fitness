/**
 * References Tests
 *
 * Tests for built-in reference profiles.
 */

import { describe, it, expect } from 'vitest';
import { loadBuiltInProfiles, getBuiltInProfile, BUILT_IN_PROFILES } from '../../bodylab/core/references/src/built-in';

describe('Reference Profiles', () => {
  describe('Built-in profiles', () => {
    it('should load all built-in profiles', () => {
      const profiles = loadBuiltInProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(4);
    });

    it('should have unique IDs for all profiles', () => {
      const profiles = loadBuiltInProfiles();
      const ids = profiles.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have required fields for all profiles', () => {
      const profiles = loadBuiltInProfiles();
      for (const profile of profiles) {
        expect(profile.id).toBeDefined();
        expect(profile.name).toBeDefined();
        expect(profile.description).toBeDefined();
        expect(profile.category).toBeDefined();
        expect(profile.source).toBeDefined();
        expect(profile.measurements).toBeDefined();
        expect(profile.measurements.length).toBeGreaterThan(0);
      }
    });

    it('should have McCallum profile for males', () => {
      const profile = getBuiltInProfile('mccallum_recreational');
      expect(profile).toBeDefined();
      expect(profile?.biologicalSex).toBe('male');
      expect(profile?.measurements.length).toBeGreaterThanOrEqual(8);
    });

    it('should have Venus profile for females', () => {
      const profile = getBuiltInProfile('venus_recreational');
      expect(profile).toBeDefined();
      expect(profile?.biologicalSex).toBe('female');
      expect(profile?.measurements.length).toBeGreaterThanOrEqual(4);
    });

    it('should have WHtR profiles for both sexes', () => {
      const maleProfile = getBuiltInProfile('health_whtr_male');
      const femaleProfile = getBuiltInProfile('health_whtr_female');
      expect(maleProfile).toBeDefined();
      expect(femaleProfile).toBeDefined();
    });
  });

  describe('Get profile by ID', () => {
    it('should return profile for valid ID', () => {
      const profile = getBuiltInProfile('mccallum_recreational');
      expect(profile).toBeDefined();
      expect(profile?.id).toBe('mccallum_recreational');
    });

    it('should return undefined for invalid ID', () => {
      const profile = getBuiltInProfile('nonexistent');
      expect(profile).toBeUndefined();
    });
  });

  describe('Profile categories', () => {
    it('should have health profiles', () => {
      const profiles = loadBuiltInProfiles();
      const healthProfiles = profiles.filter((p) => p.category === 'health');
      expect(healthProfiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should have anthropometric profiles', () => {
      const profiles = loadBuiltInProfiles();
      const anthropometricProfiles = profiles.filter((p) => p.category === 'anthropometric');
      expect(anthropometricProfiles.length).toBeGreaterThanOrEqual(2);
    });
  });
});
