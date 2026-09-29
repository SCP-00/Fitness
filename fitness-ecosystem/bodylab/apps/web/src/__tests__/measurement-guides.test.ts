/**
 * Measurement-guides registry — structure and pedagogy tests.
 *
 * These pin the educational contract: every guide is complete, bilingual,
 * honest about its certainty (including the fat-storage-distribution caveat
 * for skinfolds and the per-sex sites), and carries its primary source.
 *
 * @module __tests__/measurement-guides
 */

import { describe, it, expect } from 'vitest';
import {
  MEASUREMENT_GUIDES,
  getGuidesForTarget,
  getGuideById,
  NAVY_TAPE_GUIDE,
  JP3_CALIPER_GUIDE,
  COOPER_GUIDE,
  RESTING_HR_GUIDE,
} from '../lib/measurement-guides';
const assertBilingual = (b: { en: string; es: string }, label: string) => {
  expect(b.en.trim().length, `${label} EN`).toBeGreaterThan(20);
  expect(b.es.trim().length, `${label} ES`).toBeGreaterThan(20);
};

describe('measurement-guides registry: structure', () => {
  it('exposes exactly the four core methods in presentation order', () => {
    expect(MEASUREMENT_GUIDES.map((g) => g.id)).toEqual([
      'body-fat-navy-tape',
      'body-fat-jp3-caliper',
      'cooper-12min',
      'resting-hr',
    ]);
  });

  it('every guide is bilingual, sourced, and has steps + tips + fallbacks', () => {
    for (const g of MEASUREMENT_GUIDES) {
      assertBilingual(g.title, `${g.id}.title`);
      expect(g.provenance.length).toBeGreaterThan(20);
      expect(g.steps.length).toBeGreaterThanOrEqual(4);
      g.steps.forEach((s, i) => assertBilingual(s, `${g.id}.step${i}`));
      g.tips.forEach((t, i) => assertBilingual(t, `${g.id}.tip${i}`));
      g.fallbacks.forEach((f, i) => assertBilingual(f, `${g.id}.fallback${i}`));
      expect(g.certainty.caveat.en.length).toBeGreaterThan(50);
      expect(g.certainty.caveat.es.length).toBeGreaterThan(50);
    }
  });
});

describe('measurement-guides registry: pedagogy (the certainty argument)', () => {
  it('skinfold guide flags sex-specific sites and the fat-storage caveat', () => {
    expect(JP3_CALIPER_GUIDE.sexSpecific).toBe(true);
    expect(JP3_CALIPER_GUIDE.certainty.caveat.en).toContain('DIFFER BY SEX');
    expect(JP3_CALIPER_GUIDE.certainty.caveat.en).toContain('hips');
  });

  it('Navy tape guide is honest about being an estimate (SEE ±3.5%)', () => {
    expect(NAVY_TAPE_GUIDE.certainty.seePct).toBe(3.5);
    expect(NAVY_TAPE_GUIDE.certainty.caveat.en).toContain('±3.5%');
    expect(NAVY_TAPE_GUIDE.certainty.level).toBe('approximate');
    expect(NAVY_TAPE_GUIDE.sexSpecific).toBe(true);
  });

  it('every method lists equipment and at least one no-equipment fallback', () => {
    expect(NAVY_TAPE_GUIDE.equipment).toBe('tape_only');
    expect(NAVY_TAPE_GUIDE.fallbacks.length).toBeGreaterThan(0);
    expect(RESTING_HR_GUIDE.equipment).toBe('none');
    expect(COOPER_GUIDE.equipment).toBe('tape_or_gps');
    expect(COOPER_GUIDE.fallbacks.length).toBeGreaterThan(0);
    expect(RESTING_HR_GUIDE.certainty.level).toBe('high');
  });
});

describe('measurement-guides registry: lookups', () => {
  it('filters by target and resolves by id', () => {
    expect(getGuidesForTarget('body_fat')).toEqual([NAVY_TAPE_GUIDE]);
    expect(getGuidesForTarget('skinfold')).toEqual([JP3_CALIPER_GUIDE]);
    expect(getGuidesForTarget('cooper')).toEqual([COOPER_GUIDE]);
    expect(getGuidesForTarget('resting_hr')).toEqual([RESTING_HR_GUIDE]);
    expect(getGuideById('body-fat-navy-tape')).toBe(NAVY_TAPE_GUIDE);
    expect(getGuideById('does-not-exist')).toBeUndefined();
  });
});

describe('measurement-guides registry: illustrated JP3 sites', () => {
  it('JP3 carries illustrated per-sex sites (female protocol = the fat-storage argument, drawn)', () => {
    const illos = JP3_CALIPER_GUIDE.siteIllustrations;
    expect(illos).toBeDefined();
    if (!illos) return;
    expect(illos.female.sites.map((s) => s.siteId)).toEqual(['triceps', 'suprailiac', 'thigh']);
    expect(illos.male.sites.map((s) => s.siteId)).toEqual(['chest', 'abdomen', 'thigh']);
    // Every site is drawn somewhere on the figure (drawing coordinates), named in BOTH languages.
    for (const sexKey of ['female', 'male'] as const) {
      for (const s of illos[sexKey].sites) {
        expect(s.landmark, `${sexKey}/${s.siteId} must be drawn`).not.toBeNull();
        expect(s.landmark!.x).toBeGreaterThan(0);
        expect(s.landmark!.x).toBeLessThan(1);
        expect(s.landmark!.y).toBeGreaterThan(0);
        expect(s.landmark!.y).toBeLessThan(1);
        assertBilingual(s.label, `${sexKey}/${s.siteId}.label`);
      }
      // The distribution warning is attached per sex, not only globally.
      expect(illos[sexKey].distributionNote.en.length).toBeGreaterThan(50);
      expect(illos[sexKey].distributionNote.es.length).toBeGreaterThan(50);
    }
    // The female note is the explicit MISREAD warning; the male one cites trunk storage.
    expect(illos.female.distributionNote.en).toContain('MISREAD');
    expect(illos.male.distributionNote.en).toContain('TRUNK');
  });
});
