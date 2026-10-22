/**
 * IndexedDB adapter — TrainingLab persistence (own database, own stores;
 * BodyLab's data is never touched directly — the link is the export file).
 *
 * Same pattern as `bodylab/apps/web/src/lib/db.ts`.
 *
 * @module lib/db
 */

import type { Readiness, DecisionModel } from "@fitness/bodylab-training";
import { todayKey } from "./day";
import type { McpLedgerEntry } from "./mcp-actions";
import type { TLSet, TLSession, TLSettingsData } from "./types";
import {
  DEFAULT_LLM,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SETTINGS,
  DEFAULT_SOUND,
} from "./types";
import { normalizeFavorites } from "./favorites";
import {
  normalizeActiveGearProfile,
  normalizeGearProfiles,
} from "./gear-profiles";
import { normalizeRoutines } from "./routines";
import { DEFAULT_SHARED, type HealthRecord } from "./shared";

const DB_NAME = "traininglab";
const DB_VERSION = 1;

const STORES = {
  sets: "sets",
  sessions: "sessions",
  meta: "meta",
} as const;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.sets)) {
        const store = db.createObjectStore(STORES.sets, { keyPath: "id" });
        store.createIndex("exerciseId", "exerciseId", { unique: false });
        store.createIndex("dayId", "dayId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.sessions)) {
        db.createObjectStore(STORES.sessions, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function put<T>(store: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value as never);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Sets ────────────────────────────────────────────────────────────────────

export async function loadSets(): Promise<TLSet[]> {
  const sets = await getAll<TLSet>(STORES.sets);
  return sets.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function saveSet(set: TLSet): Promise<void> {
  await put(STORES.sets, set);
}

/** Bulk upsert in one transaction (used by the backup restore). */
export async function saveSetsMany(rows: TLSet[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sets, "readwrite");
    const store = tx.objectStore(STORES.sets);
    for (const row of rows) store.put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSet(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sets, "readwrite");
    tx.objectStore(STORES.sets).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function loadSessions(): Promise<TLSession[]> {
  const sessions = await getAll<TLSession>(STORES.sessions);
  return sessions.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export async function saveSession(session: TLSession): Promise<void> {
  await put(STORES.sessions, session);
}

/** Bulk upsert in one transaction (used by the backup restore). */
export async function saveSessionsMany(rows: TLSession[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sessions, "readwrite");
    const store = tx.objectStore(STORES.sessions);
    for (const row of rows) store.put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sessions, "readwrite");
    tx.objectStore(STORES.sessions).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateSession(
  id: string,
  patch: Partial<TLSession>,
): Promise<TLSession | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sessions, "readwrite");
    const store = tx.objectStore(STORES.sessions);
    const req = store.get(id);
    req.onsuccess = () => {
      const existing = req.result as TLSession | undefined;
      if (!existing) {
        resolve(null);
        return;
      }
      const updated: TLSession = { ...existing, ...patch, id };
      store.put(updated);
      tx.oncomplete = () => resolve(updated);
    };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Bulk deletion of sessions.
 *
 * Needed because `saveSessionsMany` is a `put` loop: writing back a *filtered*
 * array does not remove the rows that were left out, so any "remove these"
 * operation has to delete explicitly or it silently keeps the data it claims to
 * have dropped.
 */
export async function deleteSessionsMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sessions, "readwrite");
    const store = tx.objectStore(STORES.sessions);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Bulk deletion of sets (used when a session and its logged sets are deleted). */
export async function deleteSetsMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.sets, "readwrite");
    const store = tx.objectStore(STORES.sets);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Settings (single JSON doc in the meta store) ────────────────────────────

/**
 * Fill a partial settings document with every default.
 *
 * Shared by `loadSettings` and the backup restore: nested objects and arrays
 * need explicit merging so an older stored doc (or a partially written one) can
 * never produce `undefined` at runtime.
 */
export function normalizeSettings(
  value: Partial<TLSettingsData> | null | undefined,
): TLSettingsData {
  const partial = value ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    inventory: Array.isArray(partial.inventory) ? partial.inventory : [],
    sound: { ...DEFAULT_SOUND, ...(partial.sound ?? {}) },
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...(partial.notifications ?? {}),
    },
    shared: { ...DEFAULT_SHARED, ...(partial.shared ?? {}) },
    llm: { ...DEFAULT_LLM, ...(partial.llm ?? {}) },
    weekOverrides: { ...(partial.weekOverrides ?? {}) },
    // Templates go through the same sanitizer the editor uses: a restored or
    // hand-edited backup can never put an unknown exercise or a 99-rep row on
    // screen, and a malformed entry simply drops instead of blanking the list.
    routines: normalizeRoutines(partial.routines),
    // The gear shelf and the star list are sanitised for the same reason: a
    // restored backup must not be able to show two chips that switch to the same
    // items, or a profile named with whitespace only (2026-10-20).
    gearProfiles: normalizeGearProfiles(partial.gearProfiles),
    activeGearProfile: normalizeActiveGearProfile(partial.activeGearProfile),
    favorites: normalizeFavorites(partial.favorites),
  };
}

export async function loadSettings(): Promise<TLSettingsData> {
  const db = await openDB();
  const raw = await new Promise<unknown>((resolve) => {
    const tx = db.transaction(STORES.meta, "readonly");
    const req = tx.objectStore(STORES.meta).get("settings");
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  return normalizeSettings((raw as { value?: Partial<TLSettingsData> }).value);
}

export async function saveSettings(settings: TLSettingsData): Promise<void> {
  await put(STORES.meta, { id: "settings", value: settings });
}

// ── Imported BodyLab payload (the v2 link file, persisted so reloads work) ──

export async function loadPayload(): Promise<unknown | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.meta, "readonly");
    const req = tx.objectStore(STORES.meta).get("payload");
    req.onsuccess = () =>
      resolve((req.result as { value?: unknown } | undefined)?.value ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function savePayload(payload: unknown): Promise<void> {
  await put(STORES.meta, { id: "payload", value: payload });
}

// ── Decision model (the JEV-class learner's weights) ────────────────────────

export async function loadDecisionModel(): Promise<unknown | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.meta, "readonly");
    const req = tx.objectStore(STORES.meta).get("decision-model");
    req.onsuccess = () =>
      resolve((req.result as { value?: unknown } | undefined)?.value ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function saveDecisionModel(model: DecisionModel): Promise<void> {
  await put(STORES.meta, { id: "decision-model", value: model });
}

// ── Health records (local first; pushed to the shared store when enabled) ───

/**
 * Health measurements live in one array in the meta store.
 *
 * Not a dedicated object store on purpose: a household logs a handful of these a
 * week, the whole set is read on every boot, and the DB version bump that a new
 * store would require is the one thing that can break an existing install.
 */
export async function loadHealthRecords(): Promise<HealthRecord[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.meta, "readonly");
    const req = tx.objectStore(STORES.meta).get("health-records");
    req.onsuccess = () => {
      const rows = (req.result as { value?: HealthRecord[] } | undefined)
        ?.value;
      resolve(Array.isArray(rows) ? rows : []);
    };
    req.onerror = () => resolve([]);
  });
}

export async function saveHealthRecords(rows: HealthRecord[]): Promise<void> {
  await put(STORES.meta, { id: "health-records", value: rows });
}

// ── MCP action ledger (receipts of everything an agent asked for) ───────────

/**
 * Idempotency and undo both live in this list: every id the app has ever seen
 * from the action inbox, with the receipt it answered and — when it was applied
 * — the operation that reverses it. Without it a replayed inbox file (the MCP
 * retries after a timeout) would log the same set twice, and the "Deshacer"
 * button in Ajustes would not survive a restart.
 *
 * Stored in the meta store like the health records: one array, read once per
 * boot, and a new object store would mean a `DB_VERSION` bump on a database
 * that has been at version 1 since the first install.
 */
export async function loadMcpLedger(): Promise<McpLedgerEntry[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.meta, "readonly");
    const req = tx.objectStore(STORES.meta).get("mcp-ledger");
    req.onsuccess = () => {
      const rows = (req.result as { value?: McpLedgerEntry[] } | undefined)
        ?.value;
      resolve(Array.isArray(rows) ? rows : []);
    };
    req.onerror = () => resolve([]);
  });
}

export async function saveMcpLedger(rows: McpLedgerEntry[]): Promise<void> {
  await put(STORES.meta, { id: "mcp-ledger", value: rows });
}

// ── Today's readiness self-report (kept per calendar day) ───────────────────

export interface StoredReadiness {
  date: string;
  readiness: Readiness;
}

export async function loadReadiness(): Promise<StoredReadiness | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.meta, "readonly");
    const req = tx.objectStore(STORES.meta).get("readiness");
    req.onsuccess = () => {
      const stored =
        (req.result as { value?: StoredReadiness } | undefined)?.value ?? null;
      // A stale entry (yesterday's energy) must never drive today's session.
      const today = todayKey();
      resolve(stored && stored.date === today ? stored : null);
    };
    req.onerror = () => resolve(null);
  });
}

export async function saveReadiness(readiness: Readiness): Promise<void> {
  await put(STORES.meta, {
    id: "readiness",
    value: { date: todayKey(), readiness },
  });
}

/** Test-only: drop the cached connection (fake-indexeddb factory swaps). */
export function resetDbForTests(): void {
  dbInstance = null;
}
