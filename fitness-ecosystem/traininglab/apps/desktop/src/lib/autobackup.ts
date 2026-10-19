/**
 * Automatic safety copy of the whole log, written OUTSIDE the WebView profile.
 *
 * Why this exists (2026-10-05): everything TrainingLab knows lives in IndexedDB
 * inside `%LOCALAPPDATA%\com.traininglab.desktop\EBWebView\…`. An app update
 * cannot wipe it — the adapter never deletes and `DB_VERSION` has been 1 since
 * the first commit — but the *profile* belongs to Windows and WebView2, and they
 * can reset it without warning. When it goes, the log goes with it, and the
 * owner loses work. So after every change we mirror the same JSON the manual
 * export produces into a timestamped file under the app data dir, and on the
 * next start an empty database finds that file waiting instead of an empty app.
 *
 * Nothing here throws: a failed snapshot must never interrupt logging.
 *
 * @module lib/autobackup
 */

import { invoke } from "@tauri-apps/api/core";
import { buildBackup, parseBackup, type TrainingLabBackup } from "./backup";
import type { TLSet, TLSession, TLSettingsData } from "./types";
import type { HealthRecord } from "./shared";
import type { DecisionModel } from "@fitness/bodylab-training";
import type { TrainingLabMirror } from "./backup";

/** Coalesce bursts: logging four sets in a minute writes one snapshot. */
export const AUTOBACKUP_DEBOUNCE_MS = 2000;

/**
 * The settings that change what the app *does*, and nothing else.
 *
 * A mere presence bit (`settings ? "s" : "-"`) used to be enough — and that was
 * a bug (2026-10-09): changing the goal, the budget, the level or the inventory
 * left the mirror stale, so a model that had just called `configure_training`
 * kept reading the values it had replaced. Writing the whole object into the
 * signature would rewrite the file for a change in a display-only field (unit,
 * language) that no plan depends on. This is the middle ground: the plan's own
 * inputs, serialised cheaply.
 */
function settingsKey(settings: TLSettingsData | null): string {
  if (!settings) return "-";
  return [
    settings.goal,
    settings.level,
    settings.timeBudgetMin,
    settings.daysPerWeek,
    settings.useDecisionModel ? "dm" : "-",
    (settings.inventory ?? [])
      .map((i) => `${i.presetId ?? i.label}:${i.maxLoadKg ?? "-"}:${i.incrementKg ?? "-"}`)
      .join("+"),
    Object.keys(settings.weekOverrides ?? {}).sort().join(","),
    Object.entries(settings.repOverrides ?? {})
      .map(([id, range]) => `${id}:${range.min}-${range.max}`)
      .sort()
      .join(","),
  ].join("~");
}

/** Today's live state (self-report + the plan the app shows) as a fingerprint. */
function mirrorKey(mirror: TrainingLabMirror | null | undefined): string {
  if (!mirror) return "-";
  return [
    mirror.date,
    mirror.readiness
      ? `${mirror.readiness.energy}/${mirror.readiness.motivation}/${mirror.readiness.soreness}`
      : "-",
    (mirror.plan ?? [])
      .map((r) => `${r.exerciseId}x${r.sets}x${r.repsMin}-${r.repsMax}@${r.restSec}`)
      .join("+"),
  ].join("~");
}

/**
 * Cheap fingerprint of everything the mirror carries. A snapshot is only worth
 * writing when something actually changed — otherwise merely opening the app
 * would rewrite the file and push the eight kept snapshots past anything useful.
 */
export function logSignature(input: {
  sets: readonly TLSet[];
  sessions: readonly TLSession[];
  settings: TLSettingsData | null;
  health?: readonly HealthRecord[];
  decisionModel?: DecisionModel | null;
  mirror?: TrainingLabMirror | null;
}): string {
  const latestSet = input.sets.reduce((max, s) => (s.timestamp > max ? s.timestamp : max), "");
  const latestSession = input.sessions.reduce(
    (max, s) => (s.startedAt > max ? s.startedAt : max),
    "",
  );
  return [
    input.sets.length,
    input.sessions.length,
    input.health?.length ?? 0,
    latestSet,
    latestSession,
    settingsKey(input.settings),
    input.decisionModel ? "d" : "-",
    mirrorKey(input.mirror),
  ].join("|");
}

/** The browser build has no filesystem: say so instead of failing silently. */
export function isDesktopHost(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let pending: ReturnType<typeof setTimeout> | null = null;
let lastSignature: string | null = null;

export interface AutobackupSource {
  sets: readonly TLSet[];
  sessions: readonly TLSession[];
  health: readonly HealthRecord[];
  settings: TLSettingsData | null;
  decisionModel: DecisionModel | null;
  mirror?: TrainingLabMirror | null;
}

/**
 * Queue a snapshot. Call it after every mutation; the debounce collapses a
 * burst into one write. Resolves once the file is on disk (or immediately, if
 * the log had not changed).
 */
export function scheduleAutobackup(
  source: AutobackupSource,
  now: Date = new Date(),
): Promise<string | null> {
  if (!isDesktopHost()) return Promise.resolve(null);

  const signature = logSignature(source);
  if (pending) clearTimeout(pending);

  return new Promise((resolve) => {
    pending = setTimeout(async () => {
      pending = null;
      if (signature === lastSignature) {
        resolve(null);
        return;
      }
      try {
        const json = JSON.stringify(buildBackup(source, now));
        const path = await invoke<string>("write_autobackup", { contents: json });
        lastSignature = signature;
        resolve(path);
      } catch {
        // A snapshot that cannot be written must not break the set being logged.
        resolve(null);
      }
    }, AUTOBACKUP_DEBOUNCE_MS);
  });
}

/** The newest snapshot on disk, already validated as a TrainingLab backup. */
export async function readAutobackup(): Promise<TrainingLabBackup | null> {
  if (!isDesktopHost()) return null;
  try {
    const text = await invoke<string | null>("read_autobackup");
    if (!text) return null;
    const parsed = parseBackup(text);
    return parsed.ok ? parsed.backup : null;
  } catch {
    return null;
  }
}

/** The folder the snapshots live in, for the Settings card. */
export async function autobackupDir(): Promise<string | null> {
  if (!isDesktopHost()) return null;
  try {
    return await invoke<string>("autobackup_dir");
  } catch {
    return null;
  }
}

/**
 * What the UI needs to tell the owner when the log is empty but a snapshot is
 * not: how much is in it and when it was taken.
 */
export interface RecoverableSnapshot {
  sets: number;
  sessions: number;
  exportedAt: string;
}

/**
 * A snapshot is only worth offering when the device actually looks empty.
 * Without this check a log that is merely quiet would keep asking to be
 * "restored" over data that is already there.
 */
export function isWorthRecovering(input: {
  backup: TrainingLabBackup;
  localSets: number;
  localSessions: number;
}): boolean {
  return (
    input.localSets === 0 &&
    input.localSessions === 0 &&
    input.backup.sets.length > 0
  );
}

/** Test seam: forget the debounce and the last fingerprint. */
export function resetAutobackupState(): void {
  if (pending) clearTimeout(pending);
  pending = null;
  lastSignature = null;
}