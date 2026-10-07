/**
 * IndexedDB Adapter — BodyLab Persistence Layer
 *
 * Replaces localStorage with a proper database that supports:
 * - Schema versioning
 * - Migrations between versions
 * - Larger storage capacity
 * - Better performance for large datasets
 * - Async operations (future-proof)
 *
 * Architecture:
 *   React → Store → db.ts → IndexedDB
 *
 * @module lib/db
 */

import type {
  Profile,
  Measurement,
  BodySnapshot,
  ExerciseSet,
  MaxEffort,
} from "./types";
import { normalizeProfile } from "./age";

// ============================================================================
// Schema Version
// ============================================================================

const DB_NAME = "bodylab";
const DB_VERSION = 1;

// Store names
const STORES = {
  meta: "meta",
  profile: "profile",
  measurements: "measurements",
  snapshots: "snapshots",
  exerciseSets: "exerciseSets",
  maxEfforts: "maxEfforts",
} as const;

// ============================================================================
// Types
// ============================================================================

interface DatabaseMeta {
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Database Connection
// ============================================================================

let dbInstance: IDBDatabase | null = null;

/**
 * Open (or create) the IndexedDB database.
 * Creates object stores on first run, runs migrations on upgrade.
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return openDBPromise();
}

function openDBPromise(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Meta store (schema version, app version, timestamps)
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "id" });
      }

      // Profile store
      if (!db.objectStoreNames.contains(STORES.profile)) {
        db.createObjectStore(STORES.profile, { keyPath: "id" });
      }

      // Measurements store (indexed by profileId and type for fast queries)
      if (!db.objectStoreNames.contains(STORES.measurements)) {
        const store = db.createObjectStore(STORES.measurements, {
          keyPath: "id",
        });
        store.createIndex("profileId", "profileId", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("profileId_type", ["profileId", "type"], {
          unique: false,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Snapshots store
      if (!db.objectStoreNames.contains(STORES.snapshots)) {
        const store = db.createObjectStore(STORES.snapshots, { keyPath: "id" });
        store.createIndex("profileId", "profileId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Exercise sets store
      if (!db.objectStoreNames.contains(STORES.exerciseSets)) {
        const store = db.createObjectStore(STORES.exerciseSets, {
          keyPath: "id",
        });
        store.createIndex("exerciseId", "exerciseId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Max efforts store
      if (!db.objectStoreNames.contains(STORES.maxEfforts)) {
        db.createObjectStore(STORES.maxEfforts, { keyPath: "exerciseId" });
      }

      // Run migrations
      migrate(db, event.oldVersion);
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      dbInstance = db;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ============================================================================
// Migrations
// ============================================================================

/**
 * Run migrations from oldVersion to current DB_VERSION.
 * Add migration logic here when schema changes.
 */
function migrate(_db: IDBDatabase, _oldVersion: number): void {
  // V0 → V1: Initial schema (already created in onupgradeneeded)
  // Future migrations go here:
  // if (_oldVersion < 2) { ... }
  // if (_oldVersion < 3) { ... }
}

// ============================================================================
// Generic CRUD Operations
// ============================================================================

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(
  storeName: string,
  id: string,
): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteById(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Typed API — Profile
// ============================================================================

/**
 * Load the stored profile, upgrading the legacy `age` field to `birthDate`.
 *
 * The migration is write-back on purpose: it happens once per install instead of
 * on every load, and the upgraded record is what the next export contains.
 */
export async function loadProfile(): Promise<Profile | null> {
  const profiles = await getAll<Profile>(STORES.profile);
  const stored = profiles[0];
  if (!stored) return null;

  const profile = normalizeProfile(stored);
  if (profile !== stored) await saveProfile(profile);
  return profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await put(STORES.profile, profile);
}

export async function deleteProfile(): Promise<void> {
  await clearStore(STORES.profile);
}

// ============================================================================
// Typed API — Measurements
// ============================================================================

export async function loadMeasurements(): Promise<Measurement[]> {
  return getAll<Measurement>(STORES.measurements);
}

export async function saveMeasurements(
  measurements: Measurement[],
): Promise<void> {
  await putAll(STORES.measurements, measurements);
}

export async function addMeasurement(measurement: Measurement): Promise<void> {
  await put(STORES.measurements, measurement);
}

export async function removeMeasurement(id: string): Promise<void> {
  await deleteById(STORES.measurements, id);
}

// ============================================================================
// Typed API — Snapshots
// ============================================================================

export async function loadSnapshots(): Promise<BodySnapshot[]> {
  const snapshots = await getAll<BodySnapshot>(STORES.snapshots);
  return snapshots.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function saveSnapshots(snapshots: BodySnapshot[]): Promise<void> {
  await putAll(STORES.snapshots, snapshots);
}

export async function addSnapshot(snapshot: BodySnapshot): Promise<void> {
  await put(STORES.snapshots, snapshot);
}

// ============================================================================
// Typed API — Meta
// ============================================================================

export async function getMeta(): Promise<DatabaseMeta | null> {
  return (await getById<DatabaseMeta>(STORES.meta, "app")) ?? null;
}

export async function setMeta(meta: Partial<DatabaseMeta>): Promise<void> {
  const existing = await getMeta();
  const data: DatabaseMeta & { id: string } = {
    id: "app",
    schemaVersion: DB_VERSION,
    appVersion: __BODYLAB_VERSION__,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...meta,
  };
  await put(STORES.meta, data);
}

// ============================================================================
// Settings (simple key-value for language, reference, etc.)
// ============================================================================

const SETTINGS_STORE = "meta"; // Reuse meta store for settings

export async function loadSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, "readonly");
      const store = tx.objectStore(SETTINGS_STORE);
      const request = store.get(`setting:${key}`);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.value ?? fallback);
      };
      request.onerror = () => resolve(fallback);
    });
  } catch {
    return fallback;
  }
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, "readwrite");
      const store = tx.objectStore(SETTINGS_STORE);
      const request = store.put({ id: `setting:${key}`, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Silently fail
  }
}

// ============================================================================
// Typed API — Exercise Sets
// ============================================================================

export async function loadExerciseSets(): Promise<ExerciseSet[]> {
  return getAll<ExerciseSet>(STORES.exerciseSets);
}

export async function saveExerciseSets(sets: ExerciseSet[]): Promise<void> {
  await putAll(STORES.exerciseSets, sets);
}

export async function addExerciseSet(set: ExerciseSet): Promise<void> {
  await put(STORES.exerciseSets, set);
}

// ============================================================================
// Typed API — Max Efforts
// ============================================================================

export async function loadMaxEfforts(): Promise<MaxEffort[]> {
  return getAll<MaxEffort>(STORES.maxEfforts);
}

export async function saveMaxEfforts(efforts: MaxEffort[]): Promise<void> {
  await putAll(STORES.maxEfforts, efforts);
}

// ============================================================================
// Backup / Export (for .bodylab format)
// ============================================================================

export async function exportAllData(): Promise<{
  profile: Profile | null;
  measurements: Measurement[];
  snapshots: BodySnapshot[];
  meta: DatabaseMeta | null;
}> {
  const [profile, measurements, snapshots, meta] = await Promise.all([
    loadProfile(),
    loadMeasurements(),
    loadSnapshots(),
    getMeta(),
  ]);
  return { profile, measurements, snapshots, meta };
}

export async function importAllData(data: {
  profile?: Profile | null;
  measurements?: Measurement[];
  snapshots?: BodySnapshot[];
}): Promise<void> {
  if (data.profile) await saveProfile(data.profile);
  if (data.measurements) await saveMeasurements(data.measurements);
  if (data.snapshots) await saveSnapshots(data.snapshots);
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    clearStore(STORES.profile),
    clearStore(STORES.measurements),
    clearStore(STORES.snapshots),
  ]);
}

// ============================================================================
// Initialization — Migrate from localStorage if needed
// ============================================================================

/**
 * Check if IndexedDB is empty and localStorage has data.
 * If so, migrate data from localStorage to IndexedDB.
 */
export async function migrateFromLocalStorageIfNeeded(): Promise<boolean> {
  const existingProfile = await loadProfile();
  if (existingProfile) return false; // Already has IndexedDB data

  // Check localStorage for legacy data
  const lsProfile = localStorage.getItem("bodylab-profile");
  if (!lsProfile) return false; // No legacy data

  try {
    const profile = JSON.parse(lsProfile) as Profile;
    const measurements = JSON.parse(
      localStorage.getItem("bodylab-measurements") ?? "[]",
    ) as Measurement[];
    const snapshots = JSON.parse(
      localStorage.getItem("bodylab-snapshots") ?? "[]",
    ) as BodySnapshot[];
    const language = localStorage.getItem("bodylab-language");
    const reference = localStorage.getItem("bodylab-reference");

    // Save to IndexedDB
    await saveProfile(profile);
    await saveMeasurements(measurements);
    await saveSnapshots(snapshots);
    if (language) await saveSetting("language", JSON.parse(language));
    if (reference) await saveSetting("reference", JSON.parse(reference));

    // Set meta
    await setMeta({ schemaVersion: DB_VERSION });

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Test support
// ============================================================================

export type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * Test-only: drop the cached IndexedDB connection so a fresh fake-indexeddb
 * factory (from data-integrity tests) is picked up on the next openDB().
 */
export function resetDbForTests(): void {
  dbInstance = null;
}
