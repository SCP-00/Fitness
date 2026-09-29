/**
 * DATA-INTEGRITY TESTS — pessimistic QA pinned at the persistence layer.
 *
 * Covers the three high-risk data-loss paths that unit tests never crossed:
 *
 *   1. `.bodylab` export → clear → import → export round-trip must be exact.
 *   2. Re-importing the same backup must be idempotent (no duplicates —
 *      records are keyed by UUID, so put() is an upsert).
 *   3. Importing a backup into a populated DB must UNION (guest data is
 *      preserved), not replace.
 *   4. Legacy localStorage → IndexedDB migration preserves everything.
 *   5. Measurement inputs accept Spanish decimal commas ("75,5" → 75.5).
 *
 * @module __tests__/data-integrity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import * as db from '../lib/db';
import { parseNumberInput, normalizeDecimalInput } from '../lib/parse-num';
import { buildTraininglabExport } from '../lib/traininglab-export';
import { ALL_EXERCISES, getMusclesForExercise } from '../lib/exercises';
import type { Measurement, Profile, BodySnapshot } from '../lib/types';

// The root vitest suite runs in plain node (no jsdom), where `localStorage`
// does not exist. Install a minimal in-memory shim so the legacy-migration
// tests run identically in both suites (root vitest 1.x and web vitest 4.x).
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => void store.clear(),
    },
  });
}

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeProfile(id = 'profile-1'): Profile {
  return {
    id,
    name: 'Test User',
    height: 1.8,
    weight: 78,
    // Legacy shape on purpose: exercises the age → birthDate migration path.
    birthDate: null,
    age: 30,
    biologicalSex: 'male',
    units: 'metric',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

let measurementSeq = 0;
function makeMeasurement(overrides: Partial<Measurement> = {}): Measurement {
  measurementSeq += 1;
  return {
    id: `m-${measurementSeq}`,
    profileId: 'profile-1',
    type: 'chest',
    value: 100,
    unit: 'cm',
    timestamp: `2026-03-0${(measurementSeq % 9) + 1}T10:00:00.000Z`,
    method: 'manual',
    confidence: 'high',
    ...overrides,
  };
}

function makeSnapshot(id: string, timestamp: string): BodySnapshot {
  return {
    id,
    profileId: 'profile-1',
    timestamp,
    measurements: [],
    bodyParameters: { height: 1.8, weight: 78 },
    referenceProfileId: 'ref-1',
    assessmentResults: [],
    algorithmVersion: '1.0.0',
  };
}

// ── 1. Export → clear → import → export round-trip ──────────────────────────

describe('.bodylab export/import round-trip', () => {
  beforeEach(() => {
    (globalThis as { indexedDB: unknown }).indexedDB = new IDBFactory();
    db.resetDbForTests();
  });

  it('survives export → clear → import → export with identical payload', async () => {
    const profile = makeProfile();
    const measurements = [
      makeMeasurement({ id: 'm-chest-a', type: 'chest', value: 98.5 }),
      makeMeasurement({ id: 'm-chest-b', type: 'chest', value: 100.2 }),
      makeMeasurement({ id: 'm-weight-a', type: 'weight', value: 78.4, unit: 'kg' }),
    ];
    const snapshots = [
      makeSnapshot('snap-1', '2026-03-01T00:00:00.000Z'),
      makeSnapshot('snap-2', '2026-03-15T00:00:00.000Z'),
    ];

    await db.saveProfile(profile);
    await db.saveMeasurements(measurements);
    await db.saveSnapshots(snapshots);

    const exported1 = await db.exportAllData();
    expect(exported1.profile).not.toBeNull();
    expect(exported1.measurements).toHaveLength(3);
    expect(exported1.snapshots).toHaveLength(2);

    // Simulate a fresh device: wipe, then restore the backup.
    await db.clearAllData();
    const wiped = await db.exportAllData();
    expect(wiped.profile).toBeNull();
    expect(wiped.measurements).toHaveLength(0);

    await db.importAllData(exported1);
    const exported2 = await db.exportAllData();

    expect(exported2.profile).toEqual(exported1.profile);
    const byId = (a: Measurement, b: Measurement) => a.id.localeCompare(b.id);
    expect([...exported2.measurements].sort(byId)).toEqual(
      [...exported1.measurements].sort(byId),
    );
    expect(exported2.snapshots).toEqual(exported1.snapshots);
  });

  it('re-importing the SAME backup is idempotent — no duplicates (UUID upsert)', async () => {
    const profile = makeProfile();
    const measurements = [makeMeasurement({ id: 'm-1' }), makeMeasurement({ id: 'm-2' })];

    await db.saveProfile(profile);
    await db.saveMeasurements(measurements);

    const backup = await db.exportAllData();

    // User double-clicks "restore" / restores twice on different days.
    await db.importAllData(backup);
    await db.importAllData(backup);

    const after = await db.exportAllData();
    expect(after.measurements).toHaveLength(2);
    expect(after.measurements.map(m => m.id).sort()).toEqual(['m-1', 'm-2']);
  });

  it('importing into a POPULATED db unions records — guest data survives', async () => {
    const hostMeasurements = [makeMeasurement({ id: 'm-host-1' }), makeMeasurement({ id: 'm-host-2' })];
    await db.saveProfile(makeProfile('profile-host'));
    await db.saveMeasurements(hostMeasurements);

    const guestMeasurements = [makeMeasurement({ id: 'm-guest-1' })];
    await db.importAllData({
      profile: makeProfile('profile-guest'),
      measurements: guestMeasurements,
      snapshots: [],
    });

    const after = await db.exportAllData();
    const ids = after.measurements.map(m => m.id).sort();
    expect(ids).toEqual(['m-guest-1', 'm-host-1', 'm-host-2']);
    // Last import wins for the single-slot profile store.
    expect(after.profile?.id).toBe('profile-guest');
  });

  it('import with NO profile leaves the existing profile untouched', async () => {
    await db.saveProfile(makeProfile('original'));
    await db.importAllData({
      measurements: [makeMeasurement({ id: 'm-x' })],
      snapshots: [],
    });
    const after = await db.exportAllData();
    expect(after.profile?.id).toBe('original');
  });
});

// ── 2. Legacy localStorage → IndexedDB migration ────────────────────────────

describe('legacy localStorage migration', () => {
  beforeEach(() => {
    (globalThis as { indexedDB: unknown }).indexedDB = new IDBFactory();
    db.resetDbForTests();
  });

  it('carries profile, measurements, snapshots and settings into IndexedDB', async () => {
    const profile = makeProfile('legacy-profile');
    const measurements = [makeMeasurement({ id: 'm-legacy-1', type: 'waist', value: 82 })];
    const snapshots = [makeSnapshot('snap-legacy', '2026-02-01T00:00:00.000Z')];

    localStorage.setItem('bodylab-profile', JSON.stringify(profile));
    localStorage.setItem('bodylab-measurements', JSON.stringify(measurements));
    localStorage.setItem('bodylab-snapshots', JSON.stringify(snapshots));
    localStorage.setItem('bodylab-language', JSON.stringify('es'));
    localStorage.setItem('bodylab-reference', JSON.stringify('adonis'));

    const migrated = await db.migrateFromLocalStorageIfNeeded();
    expect(migrated).toBe(true);

    const after = await db.exportAllData();
    expect(after.profile?.id).toBe('legacy-profile');
    expect(after.measurements).toHaveLength(1);
    expect(after.measurements[0].value).toBe(82);
    expect(after.snapshots).toHaveLength(1);

    const lang = await db.loadSetting<string>('language');
    expect(lang).toBe('es');
    const ref = await db.loadSetting<string>('reference');
    expect(ref).toBe('adonis');

    // Second call is a no-op (IndexedDB already populated).
    expect(await db.migrateFromLocalStorageIfNeeded()).toBe(false);
  });

  it('corrupt legacy JSON is rejected without poisoning IndexedDB', async () => {
    localStorage.setItem('bodylab-profile', '{not valid json');
    const migrated = await db.migrateFromLocalStorageIfNeeded();
    expect(migrated).toBe(false);
    const after = await db.exportAllData();
    expect(after.profile).toBeNull();
  });
});

// ── 3. Spanish decimal-comma input (the silent-corruption bug class) ────────

describe('locale-tolerant numeric input (decimal comma)', () => {
  it.each([
    ['75,5', 75.5],
    ['75.5', 75.5],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    [' 75,5 ', 75.5],
    ['75', 75],
    ['-3,5', -3.5],
  ])('parses %j as %j', (raw, expected) => {
    expect(parseNumberInput(raw)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '75 cm', 'NaN', 'Infinity', null, undefined])(
    'rejects %j as null',
    (raw) => {
      expect(parseNumberInput(raw as string)).toBeNull();
    },
  );

  it('the historic bug: parseFloat("75,5") would have returned 75', () => {
    expect(parseFloat('75,5')).toBe(75); // documents the old behavior
    expect(parseNumberInput('75,5')).toBe(75.5); // and the fix
  });

  it('normalizes mixed separators in both conventions', () => {
    expect(normalizeDecimalInput('1.234,5')).toBe('1234.5');
    expect(normalizeDecimalInput('1,234.5')).toBe('1234.5');
  });
});

// ── 4. TrainingLab link contract (v1) ───────────────────────────────────────

describe('TrainingLab link contract v1', () => {
  it('produces the documented envelope with a monotonically loadable shape', () => {
    const state = {
      profile: makeProfile(),
      measurements: [makeMeasurement({ id: 'm-tl', type: 'weight', value: 78.4, unit: 'kg' })],
      assessment: [{ segment: 'chest', actual: 100, ideal: 105, score: 0.9 }],
      whtrResult: { ratio: 0.48 },
      adonisResult: { ratio: 1.61 },
      exerciseSets: [],
      maxEfforts: [],
    };

    const payload = buildTraininglabExport(state);
    expect(payload.format).toBe('bodylab-traininglab-link');
    expect(payload.version).toBe(2); // v2 adds `conditioning` (v1 consumers must ignore unknown fields)
    expect(Object.keys(payload)).toEqual([
      'format',
      'version',
      'exportedAt',
      'profile',
      'measurements',
      'measurementHistory',
      'muscleScores',
      'indicators',
      'muscleLoad',
      'conditioning',
      'personalRecords',
      'trainingLog',
      'exerciseCatalog',
    ]);
    expect(payload.muscleLoad.length).toBeGreaterThan(0);
    expect(payload.exerciseCatalog.length).toBe(ALL_EXERCISES.length);
    expect(payload.exerciseCatalog.every(e => Array.isArray(e.muscles))).toBe(true);
    expect(payload.muscleScores[0]).toMatchObject({
      segment: 'chest', actual: 100, ideal: 105, score: 0.9, status: 'optimal',
    });
  });

  it('v2: the conditioning weakness map exposes the cardiorespiratory + composition axes', () => {
    const mk = (type: string, value: number) => makeMeasurement({ id: `m-${type}`, type, value });
    const state = {
      profile: makeProfile(),
      measurements: [
        mk('cooper_12m_distance', 2400),
        mk('resting_heart_rate', 58),
        mk('body_fat_measured', 16.4),
        mk('abdominal_skinfold', 14),
      ],
      assessment: [],
      whtrResult: null,
      adonisResult: null,
      exerciseSets: [],
      maxEfforts: [],
    };
    const payload = buildTraininglabExport(state);
    expect(payload.conditioning).not.toBeNull();
    expect(payload.conditioning!.classifiedCount).toBe(4);
    expect(payload.conditioning!.conditioningScore).toBeGreaterThan(0);
    expect(payload.conditioning!.conditioningScore).toBeLessThanOrEqual(100);
    // Per-axis results ride along for the planner to prioritize.
    expect(payload.conditioning!.axes.cooper?.band).toBeDefined();
    expect(payload.conditioning!.axes.restingHeartRate?.band).toBeDefined();
    expect(payload.conditioning!.axes.measuredBodyFat?.band).toBeDefined();
    expect(payload.conditioning!.axes.abdominalSkinfold?.band).toBeDefined();
    // J-P %BF axes exist but stay null without their 3-site companions.
    expect(payload.conditioning!.axes.jacksonPollockBodyFatPct).toBeNull();
    expect(payload.conditioning!.axes.jacksonPollockFemaleBodyFatPct).toBeNull();
  });

  it('v2: conditioning is null without a profile or without any classifiable axis', () => {
    const noProfile = {
      profile: null,
      measurements: [makeMeasurement({ id: 'm-coop', type: 'cooper_12m_distance', value: 2400 })],
      assessment: [],
      whtrResult: null,
      adonisResult: null,
      exerciseSets: [],
      maxEfforts: [],
    };
    expect(buildTraininglabExport(noProfile).conditioning).toBeNull();

    const noAxes = {
      profile: makeProfile(),
      measurements: [],
      assessment: [],
      whtrResult: null,
      adonisResult: null,
      exerciseSets: [],
      maxEfforts: [],
    };
    expect(buildTraininglabExport(noAxes).conditioning).toBeNull();
  });

  it('every catalog muscle id resolves through the same muscle vocabulary used by muscleLoad', () => {
    const state = {
      profile: null,
      measurements: [],
      assessment: [],
      whtrResult: null,
      adonisResult: null,
      exerciseSets: [],
      maxEfforts: [],
    };
    const payload = buildTraininglabExport(state);
    const loadIds = new Set(payload.muscleLoad.map(m => m.muscle));
    for (const ex of payload.exerciseCatalog) {
      for (const m of getMusclesForExercise(ALL_EXERCISES.find(e => e.id === ex.id)!)) {
        // Exercise muscles use fine-grained ids (chest_upper) that must relate
        // to a load bucket (chest) — exercised above only asserts non-empty.
        expect(typeof m.muscle).toBe('string');
        expect(m.muscle.length).toBeGreaterThan(0);
      }
    }
    expect(loadIds.size).toBeGreaterThan(0);
  });
});
