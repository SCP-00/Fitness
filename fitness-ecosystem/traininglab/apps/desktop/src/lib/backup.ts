/**
 * TrainingLab backup — the complete JSON copy of the app's own data.
 *
 * Why it exists: the log lives in the browser's IndexedDB and nowhere else, so
 * changing browser, clearing site data or reinstalling the desktop app would
 * lose months of training. This file is the *pure* half (build + validate); the
 * store persists it, the Ajustes screen hands it to the user.
 *
 * Two formats, two jobs — deliberately:
 *   - the **CSV** (`lib/export-csv.ts`) is the analysis contract (Excel, LLM,
 *     SQLite mirror); it is denormalised and read-only-ish.
 *   - the **backup** (this file) is the restore contract: full fidelity, ids
 *     included, so a restore is an idempotent merge by id and never a duplicate.
 *
 * Restore is a merge, not a wipe: `mergeById` keeps everything already on the
 * device and only adds what the copy has. Losing the user's current log to a
 * stale file would be worse than a duplicate-free union.
 *
 * @module lib/backup
 */

import type { DecisionModel } from "@fitness/bodylab-training";
import type { HealthRecord } from "./shared";
import type { TLSet, TLSession, TLSettingsData } from "./types";

export const BACKUP_APP = "traininglab";
export const BACKUP_VERSION = 1;

export interface TrainingLabBackup {
  app: string;
  version: number;
  exportedAt: string;
  sets: TLSet[];
  sessions: TLSession[];
  health: HealthRecord[];
  settings: TLSettingsData | null;
  decisionModel: DecisionModel | null;
}

export interface BackupSource {
  sets: readonly TLSet[];
  sessions: readonly TLSession[];
  health: readonly HealthRecord[];
  settings: TLSettingsData | null;
  decisionModel: DecisionModel | null;
}

export function buildBackup(
  source: BackupSource,
  now: Date = new Date(),
): TrainingLabBackup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    sets: [...source.sets],
    sessions: [...source.sessions],
    health: [...source.health],
    settings: source.settings ?? null,
    decisionModel: source.decisionModel ?? null,
  };
}

/**
 * `dropped` counts array entries that were not usable rows (the file is still
 * accepted — a backup with one corrupt series is not worthless).
 */
export type BackupParseResult =
  | { ok: true; backup: TrainingLabBackup; dropped: number }
  | { ok: false; error: BackupError };

export type BackupError =
  | "not-json"
  | "not-object"
  | "wrong-app"
  | "no-version"
  | "future-version"
  | "missing-arrays";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/** The minimum a row needs to be restorable; anything else is dropped. */
export function isRestorableSet(value: unknown): value is TLSet {
  if (!isObject(value)) return false;
  return (
    isText(value.id) &&
    isText(value.exerciseId) &&
    isText(value.dayId) &&
    isText(value.timestamp)
  );
}

export function isRestorableSession(value: unknown): value is TLSession {
  if (!isObject(value)) return false;
  return isText(value.id) && isText(value.dayId) && isText(value.startedAt);
}

export function isRestorableHealth(value: unknown): value is HealthRecord {
  if (!isObject(value)) return false;
  return (
    isText(value.id) &&
    isText(value.kind) &&
    isText(value.timestamp) &&
    typeof value.value === "number" &&
    Number.isFinite(value.value)
  );
}

export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (!isObject(raw)) return { ok: false, error: "not-object" };
  if (raw.app !== BACKUP_APP) return { ok: false, error: "wrong-app" };
  if (typeof raw.version !== "number" || !Number.isFinite(raw.version)) {
    return { ok: false, error: "no-version" };
  }
  // An older version restores (the shapes are additive so far); a newer one
  // must not be guessed at.
  if (raw.version > BACKUP_VERSION)
    return { ok: false, error: "future-version" };
  if (
    !Array.isArray(raw.sets) ||
    !Array.isArray(raw.sessions) ||
    !Array.isArray(raw.health)
  ) {
    return { ok: false, error: "missing-arrays" };
  }

  const sets = raw.sets.filter(isRestorableSet);
  return {
    ok: true,
    dropped: raw.sets.length - sets.length,
    backup: {
      app: BACKUP_APP,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      sets,
      sessions: raw.sessions.filter(isRestorableSession),
      health: raw.health.filter(isRestorableHealth),
      settings: isObject(raw.settings)
        ? (raw.settings as unknown as TLSettingsData)
        : null,
      decisionModel: isObject(raw.decisionModel)
        ? (raw.decisionModel as unknown as DecisionModel)
        : null,
    },
  };
}

/**
 * Union by id, incoming rows winning — the same rule the household sync and
 * BodyLab's import use, so a restore can never fork a history.
 */
export function mergeById<T extends { id: string }>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>(current.map((row) => [row.id, row]));
  for (const row of incoming) byId.set(row.id, row);
  return [...byId.values()];
}
