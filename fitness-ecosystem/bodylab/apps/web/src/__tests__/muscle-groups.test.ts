/**
 * muscle-groups — the pure model behind the 3D viewer's group layers.
 *
 * The GLB scan test reads the real shipped atlas
 * (`public/anatomy/anatomy-muscles.glb`, Z-Anatomy export) and classifies
 * every node, so a rename upstream can never silently empty a layer.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MUSCLE_GROUPS,
  MEASUREMENT_GROUP,
  TRAINING_MUSCLE_GROUP,
  CONNECTIVE_TISSUE_RE,
  classifyMuscleName,
  computeMuscleRelevance,
  tintStrengthFor,
  type MuscleGroupId,
} from '../lib/muscle-groups';
import { ALL_EXERCISES } from '../lib/exercises';
import type { ExerciseSet, Measurement } from '../lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../../public');

/** Parse the GLB JSON chunk (meshopt payload stays on disk). */
function glbNodeNames(file: string): string[] {
  const buf = readFileSync(file);
  expect(buf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) as {
    nodes?: { name?: string }[];
  };
  return (json.nodes ?? []).map((n) => n.name ?? '').filter(Boolean);
}

describe('classifyMuscleName — one atlas name → one UI group', () => {
  const cases: [string, MuscleGroupId][] = [
    ['(Abdominal part of pectoralis major muscle).l.001', 'chest'],
    ['Pectoralis minor muscle.r.001', 'chest'],
    ['Latissimus dorsi muscle.l.001', 'back'],
    ['Trapezius muscle.r.001', 'back'],
    ['Acromial part of deltoid muscle.l.001', 'shoulders'],
    ['Infraspinatus muscle.l.001', 'shoulders'],
    ['Biceps brachii muscle.l.001', 'arms'],
    ['Triceps brachii muscle.l.001', 'arms'],
    ['Rectus abdominis muscle.l.001', 'core'],
    ['External oblique muscle.r.001', 'core'],
    ['Gluteus maximus muscle.r.001', 'glutes'],
    ['Biceps femoris muscle.l.001', 'legs'],
    ['Gastrocnemius muscle.r.001', 'legs'],
    ['Sternocleidomastoid muscle.l.001', 'neck'],
    ['Masseter muscle.l.001', 'neck'],
    ['Antebrachial fascia.l.001', 'other'],
    ['Iliopectineal bursa.l.001', 'other'],
    // Ambiguities resolved by anchor rules:
    ['Lumbrical muscles of foot.l.001', 'legs'],
    ['Lumbrical muscles of hand.l.001', 'arms'],
    ['Flexor digitorum longus muscle.r.001', 'legs'],
    ['Abductor digiti minimi muscle of foot.l.001', 'legs'],
    ['Abductor digiti minimi of hand.l.001', 'arms'],
  ];

  for (const [name, expected] of cases) {
    it(`${name} → ${expected}`, () => {
      expect(classifyMuscleName(name)).toBe(expected);
    });
  }

  it('empty name falls back to other', () => {
    expect(classifyMuscleName('   ')).toBe('other');
  });
});

describe('GLB scan — every shipped atlas node lands in a layer', () => {
  const names = glbNodeNames(path.join(publicDir, 'anatomy/anatomy-muscles.glb'));

  it('the atlas is the expected per-muscle export', () => {
    expect(names.length).toBeGreaterThan(600);
  });

  it('all eight anatomical layers are populated and connective stays small', () => {
    const counts: Partial<Record<MuscleGroupId, number>> = {};
    const others: string[] = [];
    for (const n of names) {
      const g = classifyMuscleName(n);
      counts[g] = (counts[g] ?? 0) + 1;
      if (g === 'other') others.push(n);
    }
    for (const g of ['chest', 'back', 'shoulders', 'arms', 'core', 'glutes', 'legs', 'neck'] as const) {
      // Chest is the smallest layer by construction: 3 heads of the pectoralis
      // major + pectoralis minor + subclavius, each side → ~10 objects.
      expect(counts[g] ?? 0, `layer "${g}" is empty — counts: ${JSON.stringify(counts)}`).toBeGreaterThanOrEqual(8);
    }
    // Connective tissue is a legitimate layer, but it must not swallow real
    // muscles: any name that is not obviously connective is a classifier bug.
    const misfit = others.filter((n) => !CONNECTIVE_TISSUE_RE.test(n));
    expect(misfit, `unclassified muscle names: ${misfit.join(' | ')}`).toEqual([]);
    // Sanity bound: the connective layer is real (fasciae, bursae, septa,
    // retinacula, sheaths — 117 objects in the shipped export) but must stay a
    // minority. The hard guarantee is `misfit === 0` above.
    expect(others.length).toBeLessThan(names.length * 0.2);
  });
});

describe('group vocabularies', () => {
  it('every muscle in the shared catalog maps to a viewer layer', () => {
    const used = new Set(ALL_EXERCISES.flatMap((ex) => ex.muscles.map((m) => m.muscle as string)));
    const missing = [...used].filter((m) => !(m in TRAINING_MUSCLE_GROUP));
    expect(missing).toEqual([]);
  });

  it('measurement types map only to known groups', () => {
    const ids = new Set(MUSCLE_GROUPS.map((g) => g.id));
    for (const g of Object.values(MEASUREMENT_GROUP)) expect(ids.has(g)).toBe(true);
  });
});

describe('computeMuscleRelevance — the user data drives the highlight', () => {
  const NOW = Date.parse('2026-10-08T12:00:00Z');
  const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();

  const measurement = (over: Partial<Measurement>): Measurement => ({
    id: 'm1',
    profileId: 'p1',
    type: 'waist',
    value: 80,
    unit: 'cm',
    timestamp: iso(2),
    method: 'manual',
    confidence: 'high',
    ...over,
  });

  it('recent measurement highlights its group with value and delta', () => {
    const rel = computeMuscleRelevance({
      measurements: [
        measurement({ timestamp: iso(40), value: 82 }),
        measurement({ id: 'm2', timestamp: iso(2), value: 80 }),
      ],
      exerciseSets: [],
      now: NOW,
    });
    expect(rel.core).toBeTruthy();
    expect(rel.core!.score).toBeGreaterThanOrEqual(2);
    const src = rel.core!.sources.find((s) => s.kind === 'measurement')!;
    expect(src.label.en).toContain('80.0 cm');
    expect(src.label.en).toContain('−2.0');
    expect(src.label.es).toContain('Cintura 80,0 cm');
  });

  it('stale measurements (>90 d) highlight nothing', () => {
    const rel = computeMuscleRelevance({
      measurements: [measurement({ timestamp: iso(120) })],
      exerciseSets: [],
      now: NOW,
    });
    expect(rel.core).toBeUndefined();
  });

  it('non-circumference types are ignored (lengths/breadths say nothing about size)', () => {
    const rel = computeMuscleRelevance({
      measurements: [measurement({ type: 'waist_breadth' as never, timestamp: iso(1) })],
      exerciseSets: [],
      now: NOW,
    });
    expect(rel.core).toBeUndefined();
  });

  it('logged sets highlight the primary muscles of the exercise', () => {
    const set: ExerciseSet = {
      id: 's1',
      exerciseId: 'barbell-bench-press',
      timestamp: iso(3),
      weight: 70,
      reps: 8,
    };
    const rel = computeMuscleRelevance({
      measurements: [],
      exerciseSets: [set],
      now: NOW,
    });
    expect(rel.chest).toBeTruthy();
    expect(rel.chest!.score).toBeGreaterThanOrEqual(2);
    expect(rel.chest!.sources[0].label.es).toContain('Press');
    // bench press also recruits triceps (intensity 2) — allowed, not required
  });

  it('old sets stop highlighting', () => {
    const rel = computeMuscleRelevance({
      measurements: [],
      exerciseSets: [
        { id: 's1', exerciseId: 'barbell-bench-press', timestamp: iso(75) },
      ],
      now: NOW,
    });
    expect(rel.chest).toBeUndefined();
  });

  it('unknown exercise ids are skipped without throwing', () => {
    const rel = computeMuscleRelevance({
      measurements: [],
      exerciseSets: [{ id: 's1', exerciseId: 'not-a-real-exercise', timestamp: iso(1) }],
      now: NOW,
    });
    expect(Object.keys(rel)).toEqual([]);
  });

  it('future timestamps are ignored', () => {
    const rel = computeMuscleRelevance({
      measurements: [measurement({ timestamp: iso(-3) })],
      exerciseSets: [],
      now: NOW,
    });
    expect(rel.core).toBeUndefined();
  });
});

describe('tintStrengthFor', () => {
  it('zero score = no tint, and strength grows with the score', () => {
    expect(tintStrengthFor(0)).toBe(0);
    expect(tintStrengthFor(2)).toBeLessThan(tintStrengthFor(5));
    expect(tintStrengthFor(99)).toBeLessThanOrEqual(0.75);
  });
});
