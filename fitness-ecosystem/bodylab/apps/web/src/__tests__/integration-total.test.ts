/**
 * TOTAL INTEGRATION — Product Data & Pipeline
 *
 * Pessimistic end-to-end integrity suite that crosses module boundaries and the
 * real filesystem to verify the shipped product actually hangs together:
 *
 *   1. Exercise DB  ↔  GIF assets  ↔  asset manifest  (real files in public/)
 *   2. Anatomy registry  ↔  measurement types  ↔  muscle anatomy DB
 *
 * Runs headless (node-safe: no DOM rendering).
 *
 * The 3D-model half of this suite (morph pipeline, OXIM mesh parsing, bundled
 * .ohpk/wasm assets) was removed together with the viewer on 2026-10-23 — see
 * docs/REMOVED_3D_MODEL.md for what it used to cover.
 *
 * @module __tests__/integration-total
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

import {
  ALL_EXERCISES,
  getExercisesForMuscle,
  getMuscleIntensity,
  getBestHypertrophyExercises,
  type MuscleGroup,
} from '../lib/exercises';
import { MUSCLE_DATABASE } from '../lib/muscle-info';
import type { Measurement } from '../lib/types';
import {
  MEASUREMENT_TYPES,
  MUSCLE_GROUPS,
  SYMMETRY_PAIRS,
  computeProxyMetrics,
} from '../lib/constants';

// Resolve the real public/ directory regardless of the vitest working directory
// (vitest runs from apps/web in the web suite and from the monorepo root in the root suite)
function resolvePublicDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'public'),
    path.resolve(process.cwd(), 'bodylab/apps/web/public'),
    path.resolve(process.cwd(), 'apps/web/public'),
  ];
  const found = candidates.find(c => existsSync(path.join(c, 'exercises', 'gifs')));
  if (!found) throw new Error('Could not locate apps/web/public from cwd ' + process.cwd());
  return found;
}

/** Measurement fixture — one cm value per anthropometric type. */
function mkMeasurement(type: string, value: number): Measurement {
  return {
    id: `m-${type}-${value}`,
    profileId: 'p1',
    type: type as Measurement['type'],
    value,
    unit: 'cm',
    timestamp: '2026-01-01T00:00:00.000Z',
    method: 'manual',
    confidence: 'high',
  };
}

const publicDir = resolvePublicDir();
const gifsDir = path.join(publicDir, 'exercises', 'gifs');
const manifestPath = path.join(publicDir, 'exercises', 'asset-manifest.json');

/** All 34 fine-grained training muscle ids (must match the MuscleGroup union). */
const TRAINING_MUSCLE_IDS: MuscleGroup[] = [
  'chest_upper', 'chest_lower', 'pectoralis_minor', 'serratus_anterior',
  'anterior_deltoid', 'lateral_deltoid', 'posterior_deltoid',
  'triceps_long', 'triceps_lateral', 'triceps_medial',
  'biceps_long', 'biceps_short', 'brachioradialis',
  'forearm_flexors', 'forearm_extensors',
  'lats_upper', 'lats_mid', 'lats_lower',
  'traps_upper', 'traps_mid', 'traps_lower', 'rhomboids',
  'rectus_abdominis', 'obliques', 'erector_spinae',
  'gluteus_maximus', 'gluteus_medius',
  'quadriceps', 'adductors', 'hamstrings', 'calves', 'soleus', 'tibialis_anterior', 'iliopsoas',
];

// ============================================================================
// 1. EXERCISE DATABASE STRUCTURE
// ============================================================================

describe('Integration: Exercise DB structure', () => {
  it('contains exactly 152 exercises: 64 gym + 30 home + 57 technique-expansion entries + table-row', () => {
    // 64 (full-gym catalog, 2026-09) + 30 added 2026-09-28 (home athlete) +
    // 49 added 2026-09-29 (catalog expansion: home focus, owner equipment) +
    // 8 added 2026-10-04 (the Symmetry import mapping gaps) +
    // 1 added 2026-10-20 (`table-row`: the zero-equipment horizontal pull the
    // owner's bodyweight week needed — the catalog had none).
    expect(ALL_EXERCISES.length).toBe(152);
  });

  it('every exercise id is a unique, kebab-case slug', () => {
    const ids = ALL_EXERCISES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('every exercise has complete bilingual content', () => {
    for (const ex of ALL_EXERCISES) {
      expect(ex.name.en.trim()).toBeTruthy();
      expect(ex.name.es.trim()).toBeTruthy();
      expect(ex.equipment.en.trim()).toBeTruthy();
      expect(ex.equipment.es.trim()).toBeTruthy();
      expect(ex.description.en.trim()).toBeTruthy();
      expect(ex.description.es.trim()).toBeTruthy();
      expect(['compound', 'isolation', 'bodyweight', 'cable', 'machine', 'cardio']).toContain(ex.category);
    }
  });

  it('ratings are integers within 1-5', () => {
    for (const ex of ALL_EXERCISES) {
      expect([1, 2, 3, 4, 5]).toContain(ex.difficulty);
      expect([1, 2, 3, 4, 5]).toContain(ex.hypertrophy);
    }
  });

  it('every exercise targets only real training muscle ids, without duplicates', () => {
    for (const ex of ALL_EXERCISES) {
      expect(ex.muscles.length).toBeGreaterThan(0);
      const seen = new Set<string>();
      for (const m of ex.muscles) {
        expect(TRAINING_MUSCLE_IDS).toContain(m.muscle);
        expect([1, 2, 3]).toContain(m.intensity);
        expect(seen.has(m.muscle)).toBe(false); // no duplicate muscle rows
        seen.add(m.muscle);
      }
      // Every exercise must declare at least one PRIMARY (3) target
      expect(ex.muscles.some(m => m.intensity === 3)).toBe(true);
    }
  });

  it('every declared training muscle id has at least one exercise (gluteus_medius covered)', () => {
    // gluteus_medius used to be declared with zero exercises (hip-abduction gap); fixed by
    // adding `lying-hip-abduction` as its primary target. Guarded so the set never regresses.
    const uncovered = TRAINING_MUSCLE_IDS.filter(m => getExercisesForMuscle(m).length === 0);
    expect(uncovered).toEqual([]);
  });

  it('query helpers stay consistent with the DB', () => {
    const bench = ALL_EXERCISES.find(e => e.id === 'barbell-bench-press')!;
    expect(getMuscleIntensity(bench, 'chest_upper')).toBe(3);
    expect(getMuscleIntensity(bench, 'obliques')).toBe(0); // unrelated muscle
    expect(getBestHypertrophyExercises(5).every(e => e.hypertrophy === 5)).toBe(true);
  });
});

// ============================================================================
// 2. GIF ASSETS ↔ EXERCISE DB ↔ MANIFEST (real files)
// ============================================================================

describe('Integration: exercise GIF assets (filesystem)', () => {
  let files: string[];
  let manifest: Record<string, { id: string; gif: string; image: string; instructions?: string }>;

  beforeAll(async () => {
    files = (await readdir(gifsDir)).filter(f => f.endsWith('.gif'));
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  });

  it('ships exactly the documented 36 GIFs', () => {
    expect(files.length).toBe(36);
  });

  it('every GIF file is a valid, non-trivial GIF image', async () => {
    for (const file of files) {
      const data = await readFile(path.join(gifsDir, file));
      expect(data.length).toBeGreaterThan(10_000); // no empty/stub assets
      // GIF magic: "GIF87a" or "GIF89a"
      const magic = data.subarray(0, 6).toString('ascii');
      expect(magic === 'GIF87a' || magic === 'GIF89a').toBe(true);
    }
  });

  it('every GIF filename maps to a real exercise id (no orphans)', () => {
    const exerciseIds = new Set(ALL_EXERCISES.map(e => e.id));
    const orphans = files.map(f => f.replace(/\.gif$/, '')).filter(id => !exerciseIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('asset manifest keys match shipped GIF files plus image-only entries', () => {
    const stillIds = Object.entries(manifest)
      .filter(([, e]) => e.gif === undefined && typeof e.image === 'string')
      .map(([id]) => id);
    const manifestKeys = Object.keys(manifest).sort();
    const fileBases = files.map(f => f.replace(/\.gif$/, '')).sort();
    expect(manifestKeys).toEqual([...fileBases, ...stillIds].sort());
    // 21 original Gym Visual stills + 43 public-domain free-exercise-db pairs
    // (added 2026-09-29) + 15 more of the same public-domain source
    // (added 2026-10-06; see public/exercises/NOTICE.md).
    expect(stillIds.length).toBe(79);
  });

  it('every manifest entry references real assets and has instructions', async () => {
    for (const [key, entry] of Object.entries(manifest)) {
      expect(key).toMatch(/^[a-z0-9-]+$/);
      expect((entry.instructions ?? '').length).toBeGreaterThan(50);
      if (entry.gif) {
        // Animated entry: canonical ExerciseDB v1 id; the shipped asset lives
        // at gifs/<slug>.gif (the manifest's gif field records upstream origin)
        expect(entry.id).toMatch(/^\d{4}$/);
        expect(entry.gif.endsWith('.gif')).toBe(true);
        expect(existsSync(path.join(gifsDir, `${key}.gif`))).toBe(true);
      } else {
        // Still entry: public-domain still (free-exercise-db), no animation
        expect(entry.id).toMatch(/^edb-/);
        expect(entry.image.endsWith('.jpg')).toBe(true);
        expect(entry.source).toContain('public domain');
        expect(existsSync(path.join(publicDir, 'exercises', entry.image))).toBe(true);
        if (entry.imageAlt) {
          expect(entry.imageAlt.endsWith('.jpg')).toBe(true);
          expect(existsSync(path.join(publicDir, 'exercises', entry.imageAlt))).toBe(true);
        }
      }
    }
  });

  it('every image-only manifest entry is a real, non-trivial JPEG', async () => {
    const publicRoot = path.join(publicDir, 'exercises');
    for (const entry of Object.values(manifest)) {
      if (entry.gif !== undefined) continue; // only still entries
      // Newer entries live in per-exercise folders (images/<id>/0.jpg);
      // legacy stills are flat (images/<id>.jpg) — resolve both.
      const data = await readFile(path.join(publicRoot, entry.image));
      expect(data.length).toBeGreaterThan(10_000);
      // JPEG magic: FF D8 FF
      expect(data[0]).toBe(0xFF);
      expect(data[1]).toBe(0xD8);
      expect(data[2]).toBe(0xFF);
    }
    void publicRoot;
  });

  it('every exercise is GIF-covered, still-covered, or explicitly media-less', () => {
    const gifIds = new Set(files.map(f => f.replace(/\.gif$/, '')));
    const stillIds = new Set(
      Object.entries(manifest)
        .filter(([, e]) => e.gif === undefined && typeof e.image === 'string')
        .map(([id]) => id)
    );
    const gifCovered = ALL_EXERCISES.filter(e => gifIds.has(e.id));
    const stillCovered = ALL_EXERCISES.filter(e => stillIds.has(e.id));
    const mediaLess = ALL_EXERCISES.filter(e => !gifIds.has(e.id) && !stillIds.has(e.id)).map(e => e.id);
    expect(gifCovered.length).toBe(36);
    expect(stillCovered.length).toBe(79);
    // 37 remain media-less after the 2026-10-06 public-domain batch took the
    // count from 51 to 36, plus `table-row` (2026-10-20): a movement that ships
    // with its own drawn figure and per-exercise cues, because no cleared GIF or
    // still of an under-table row exists in either source. It falls back to the
    // drawn animation exactly like the rest until we record our own GIFs with
    // OxiHuman (content backlog).
    // The 15 that left this list were all covered from free-exercise-db, the
    // only source NOTICE.md clears for redistribution besides our own art.
    expect(mediaLess.length).toBe(37);
    expect(mediaLess).toEqual(expect.arrayContaining([
      'push-up-plus', 'lying-hip-abduction', 'tibialis-raise', 'sumo-squat',
      'banded-hip-abduction', 'clamshells', 'fire-hydrants',
      'pike-push-up', 'diamond-push-up', 'hollow-body-hold', 'hollow-rock',
      'nordic-curl', 'copenhagen-plank', 'bird-dog', 'table-row',
    ]));
  });
});

// ============================================================================
// 3. ANATOMY REGISTRY ↔ MEASUREMENT TYPES ↔ MUSCLE ANATOMY DB
// ============================================================================

describe('Integration: anatomy registry consistency', () => {
  const typeIds = new Set(MEASUREMENT_TYPES.map(t => t.id));
  const groupIds = new Set(MUSCLE_GROUPS.map(g => g.id));
  const infoIds = Object.keys(MUSCLE_DATABASE);

  it('every MUSCLE_GROUP id has a measurement type that exists', () => {
    for (const g of MUSCLE_GROUPS) {
      expect(typeIds.has(g.measurementType)).toBe(true);
    }
  });

  it('every MUSCLE_GROUP id has anatomy info in MUSCLE_DATABASE', () => {
    for (const g of MUSCLE_GROUPS) {
      expect(infoIds).toContain(g.id);
    }
  });

  it('no duplicate muscle group ids', () => {
    expect(groupIds.size).toBe(MUSCLE_GROUPS.length);
  });

  it('every MUSCLE_DATABASE relatedType points to a real measurement type', () => {
    // Anatomy DB keys either map to a 2D body-region group or to a direct measurement muscle
    const measurementMuscleIds = ['wrist', 'neck', 'shoulders', 'chest', 'waist', 'hips', 'biceps', 'forearm', 'thigh', 'calf'];
    for (const [id, info] of Object.entries(MUSCLE_DATABASE)) {
      expect(groupIds.has(id) || measurementMuscleIds.includes(id)).toBe(true);
      for (const t of info.measurement.relatedTypes) {
        expect(typeIds.has(t)).toBe(true);
      }
    }
  });

  it('symmetry pairs reference only real, bilateral measurement types', () => {
    for (const pair of SYMMETRY_PAIRS) {
      expect(typeIds.has(pair.leftType)).toBe(true);
      expect(typeIds.has(pair.rightType)).toBe(true);
      expect(pair.leftType.endsWith('_left')).toBe(true);
      expect(pair.rightType.endsWith('_right')).toBe(true);
    }
  });

  it('computeProxyMetrics produces sane ratios from a full measurement set', () => {
    const measurements: Measurement[] = [
      mkMeasurement('chest', 110), mkMeasurement('waist', 82),
      mkMeasurement('hips', 100), mkMeasurement('neck', 40),
      mkMeasurement('shoulders', 125), mkMeasurement('biceps', 38),
      mkMeasurement('wrist', 17), mkMeasurement('thigh', 60),
      mkMeasurement('calf', 38),
    ];
    const metrics = computeProxyMetrics(measurements);
    const ids = metrics.map(m => m.id);
    expect(ids).toContain('v_taper');
    expect(ids).toContain('adonis');
    expect(metrics.find(m => m.id === 'v_taper')!.value).toBeCloseTo(1.34, 1);
    for (const m of metrics) {
      expect(m.value).toBeGreaterThan(0);
      expect(['good', 'average', 'needs_work', 'unknown']).toContain(m.status);
    }
  });
});
