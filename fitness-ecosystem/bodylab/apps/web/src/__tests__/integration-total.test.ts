/**
 * TOTAL INTEGRATION — Product Data & Pipeline
 *
 * Pessimistic end-to-end integrity suite that crosses module boundaries and the
 * real filesystem to verify the shipped product actually hangs together:
 *
 *   1. Exercise DB  ↔  GIF assets  ↔  asset manifest  (real files in public/)
 *   2. Anatomy registry  ↔  measurement types  ↔  muscle anatomy DB
 *   3. 3D model pipeline: profile → core params → preset → morph adjustments
 *      → engine application → mesh bytes → parser → validator
 *   4. Bundled 3D runtime assets (.ohpk + wasm) exist and are non-trivial
 *
 * Runs headless (node-safe: no WebGL, no DOM rendering). The real WebGL/WASM
 * render path still needs a browser E2E — see docs/TESTING.md.
 *
 * @module __tests__/integration-total
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdir, readFile, stat } from 'node:fs/promises';
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
import {
  MEASUREMENT_TYPES,
  MUSCLE_GROUPS,
  SYMMETRY_PAIRS,
  computeProxyMetrics,
} from '../lib/constants';
import {
  profileToCoreParams,
  choosePreset,
  computeMorphAdjustments,
  calculateFit,
  applyToEngine,
  collectFitTargets,
  fitToMeasurements,
  type OxiHumanEngine,
  type Profile,
  type Measurement,
} from '../lib/morph-mapper';
import { parseOximBinary, validateMesh, createTestMesh } from '../lib/oxim-parser';

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
  it('contains exactly 151 exercises: 64 gym + 30 home + 57 technique-expansion entries', () => {
    // 64 (full-gym catalog, 2026-09) + 30 added 2026-09-28 (home athlete) +
    // 49 added 2026-09-29 (catalog expansion: home focus, owner equipment) +
    // 8 added 2026-10-04 (the Symmetry import mapping gaps).
    expect(ALL_EXERCISES.length).toBe(151);
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
    // (added 2026-09-29; see public/exercises/NOTICE.md).
    expect(stillIds.length).toBe(64);
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
    expect(stillCovered.length).toBe(64);
    // 51 remain media-less after the 2026-10-04 Symmetry-gap additions (43
    // + the 8 new entries). They fall back to the drawn stick-figure
    // animation in the app until we record our own GIFs with OxiHuman
    // (content backlog).
    expect(mediaLess.length).toBe(51);
    expect(mediaLess).toEqual(expect.arrayContaining([
      'push-up-plus', 'lying-hip-abduction', 'tibialis-raise', 'sumo-squat',
      'banded-hip-abduction', 'clamshells', 'fire-hydrants',
      'crunch', 'decline-crunch', 'oblique-crunch', 'dumbbell-shrugs',
      'tricep-kickback', 'wrist-roller', 'hip-abduction-machine',
      'hip-adduction-machine',
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

// ============================================================================
// 4. 3D MODEL PIPELINE (headless — up to the WASM/WebGL boundary)
// ============================================================================

function mkProfile(overrides: Partial<Profile>): Profile {
  return {
    id: 'test-profile',
    name: 'Test',
    height: 1.78,   // meters
    weight: 82,     // kg
    // Kept as the deprecated legacy field so these cases keep exercising the
    // "no birth date recorded yet" fallback in lib/age.ts.
    birthDate: null,
    age: 30,
    biologicalSex: 'male',
    units: 'metric',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mkMeasurement(type: string, value: number): Measurement {
  return {
    id: `m-${type}-${value}`, profileId: 'p1', type: type as Measurement['type'],
    value, unit: 'cm', timestamp: '2026-01-01T00:00:00.000Z',
    method: 'manual', confidence: 'high',
  };
}

/** Recording engine — implements the OxiHumanEngine surface used by morph-mapper. */
class FakeEngine implements OxiHumanEngine {
  presets: string[] = [];
  params: Record<string, number> = {};
  refreshed = 0;
  built = 0;
  freed = 0;

  apply_preset(name: string) { this.presets.push(name); }
  set_param(name: string, value: number) { this.params[name] = value; }
  refresh_geometry() { this.refreshed++; }
  build_mesh_bytes(): Uint8Array { this.built++; return createTestMesh({ vertexCount: 24, indexCount: 36 }); }
  get_measurements() {
    return {
      height_cm: () => 178, chest_cm: () => 110, waist_cm: () => 82,
      hip_cm: () => 100, weight_kg: () => 82,
    };
  }
  /** Record the raw JSON; reply with a deterministic fit report. */
  fitCalls: string[] = [];
  fit_to_measurements(options_json: string): string {
    this.fitCalls.push(options_json);
    const targets = JSON.parse(options_json) as Record<string, number>;
    const results = Object.entries(targets)
      .filter(([k]) => k.endsWith('_cm'))
      .map(([k, v]) => ({ name: k.replace('_cm', ''), target_cm: v, measured_cm: v, delta_cm: 0 }));
    return JSON.stringify({ params: { height: 0.55, weight: 0.5, muscle: 0.5, gender: 0.5 }, results, iterations: 12, converged: true });
  }
  free() { this.freed++; }
}

describe('Integration: 3D pipeline (measurements → morph params)', () => {
  const measurements: Measurement[] = [
    mkMeasurement('chest', 110), mkMeasurement('waist', 82),
    mkMeasurement('hips', 100), mkMeasurement('biceps', 38),
    mkMeasurement('thigh', 60), mkMeasurement('calf', 38),
  ];

  it('profile → core params stays in [0,1] across body types', () => {
    const profiles = [
      mkProfile({ height: 1.5, weight: 40, age: 18 }),
      mkProfile({ height: 1.78, weight: 82, age: 30 }),
      mkProfile({ height: 2.0, weight: 150, age: 80 }),
      mkProfile({ height: 1.65, weight: 60, age: 45, biologicalSex: 'female' }),
    ];
    for (const p of profiles) {
      const core = profileToCoreParams(p);
      for (const [k, v] of Object.entries(core)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        expect(k).toBeTruthy();
      }
    }
  });

  it('preset selection matches BMI bands', () => {
    expect(choosePreset(mkProfile({ height: 1.5, weight: 40 }))).toBe('slender');   // BMI ≈ 17.8
    expect(choosePreset(mkProfile({ height: 1.78, weight: 82 }))).toBe('athletic'); // BMI ≈ 25.9
    expect(choosePreset(mkProfile({ height: 2.0, weight: 150 }))).toBe('average');  // BMI ≈ 37.5
  });

  it('morph adjustments are finite, clamped to [0,1], deterministic', () => {
    const model = { heightCm: 178, chestCm: 110, waistCm: 82, hipCm: 100, weightKg: 82 };
    const a1 = computeMorphAdjustments(measurements, model);
    const a2 = computeMorphAdjustments(measurements, model);
    expect(a1).toEqual(a2);
    expect(Object.keys(a1).length).toBeGreaterThan(0);
    for (const v of Object.values(a1)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // No model → no adjustments (graceful)
    expect(computeMorphAdjustments(measurements, null)).toEqual({});
  });

  it('calculateFit reports differences for measurable segments only', () => {
    const fits = calculateFit(measurements, { heightCm: 178, chestCm: 110, waistCm: 82, hipCm: 100, weightKg: 82 });
    expect(fits.length).toBe(3); // chest, waist, hips — biceps/thigh/calf have no model equivalent
    for (const f of fits) {
      expect(f.userValue).toBeGreaterThan(0);
      expect(f.percentDiff).toBeGreaterThanOrEqual(0);
    }
  });

  it('applyToEngine drives the full profile+measurements → engine sequence', () => {
    const engine = new FakeEngine();
    const profile = mkProfile({});
    applyToEngine(engine, profile, measurements);

    // Phase 1: preset applied first
    expect(engine.presets).toEqual(['athletic']);
    // Phase 2: the four core params always set, in [0,1]
    for (const name of ['height', 'weight', 'muscle', 'age']) {
      expect(engine.params[name]).toBeDefined();
      expect(engine.params[name]).toBeGreaterThanOrEqual(0);
      expect(engine.params[name]).toBeLessThanOrEqual(1);
    }
    // Phase 3: proportion adjustments derived from chest/waist/hips
    const adjustmentKeys = Object.keys(engine.params).filter(k => !['height', 'weight', 'muscle', 'age'].includes(k));
    expect(adjustmentKeys.length).toBeGreaterThan(0);
    for (const k of adjustmentKeys) {
      expect(engine.params[k]).toBeGreaterThanOrEqual(0);
      expect(engine.params[k]).toBeLessThanOrEqual(1);
    }
  });

  it('fitToMeasurements sends only available targets and parses the report', () => {
    const engine = new FakeEngine();
    const profile = mkProfile({}); // height 1.78 → 178 cm
    const targets = collectFitTargets(profile, measurements);
    expect(targets).toEqual({ heightCm: 178, chestCm: 110, waistCm: 82, hipCm: 100 });

    const report = fitToMeasurements(engine, targets);
    expect(engine.fitCalls).toHaveLength(1);
    const sent = JSON.parse(engine.fitCalls[0]);
    // Wire names use the engine's snake_case contract
    expect(sent).toEqual({ height_cm: 178, chest_cm: 110, waist_cm: 82, hip_cm: 100 });
    expect(report.converged).toBe(true);
    expect(report.iterations).toBe(12);
    expect(report.results).toHaveLength(4);
    expect(report.results[0]).toMatchObject({ name: 'height', delta_cm: 0 });
  });

  it('collectFitTargets is empty without a profile or measurable types; fit without targets throws', () => {
    expect(collectFitTargets(null, [])).toEqual({});
    expect(collectFitTargets(null, [mkMeasurement('biceps', 38)])).toEqual({});
    expect(collectFitTargets(mkProfile({}), [])).toEqual({ heightCm: 178 });
    expect(() => fitToMeasurements(new FakeEngine(), {})).toThrow('No valid fit target');
  });

  it('engine mesh bytes round-trip through the OXIM parser and validate clean', () => {
    const engine = new FakeEngine();
    const mesh = parseOximBinary(engine.build_mesh_bytes());
    expect(mesh.version).toBe(1);
    expect(mesh.vertexCount).toBe(24);
    expect(mesh.indexCount).toBe(36);
    expect(mesh.positions.length).toBe(24 * 3);
    expect(mesh.normals.length).toBe(24 * 3);
    expect(mesh.uvs.length).toBe(24 * 2);
    expect(mesh.indices.length).toBe(36);
    expect(mesh.indices.every(i => i < mesh.vertexCount)).toBe(true);
    expect(validateMesh(mesh)).toEqual([]);
  });
});

// ============================================================================
// 5. BUNDLED 3D RUNTIME ASSETS (.ohpk + wasm) — what BodyViewer3D loads
// ============================================================================

describe('Integration: bundled 3D runtime assets', () => {
  it('oxihuman model pack exists and is non-trivial', async () => {
    const info = await stat(path.join(publicDir, 'oxihuman-core-v1.ohpk'));
    expect(info.size).toBeGreaterThan(1_000_000);
  });

  it('wasm directory ships the vendor 0.2.1 engine (glue + binary + types)', async () => {
    const wasmFiles = await readdir(path.join(publicDir, 'wasm'));
    // 0.2.1 web-target set: the glue self-locates the wasm via import.meta.url
    expect(wasmFiles).toContain('oxihuman_wasm.js');
    expect(wasmFiles).toContain('oxihuman_wasm_bg.wasm');
    expect(wasmFiles).toContain('oxihuman_wasm.d.ts');
    const wasmStat = await stat(path.join(publicDir, 'wasm', 'oxihuman_wasm_bg.wasm'));
    expect(wasmStat.size).toBeGreaterThan(500_000);
  });
});
