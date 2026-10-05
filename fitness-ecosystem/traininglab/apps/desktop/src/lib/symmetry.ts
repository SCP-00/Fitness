/**
 * Symmetry history → TrainingLab records (the pure half of Ajustes → Importar).
 *
 * The OCR importer (`fitness-ecosystem/scripts/import-symmetry.mjs`) already
 * normalised the screenshots: 20 sessions / 425 sets with `exerciseId` filled
 * by `map-symmetry-exercises.mjs`, `warmup` from the W badge, D/F badges in
 * `notes`, bilateral-dumbbell totals divided per hand (raw kept in
 * `symmetryWeightKg`) and timed holds carrying `durationSec`. This module only
 * reshapes that file into the app's own `TLSet`/`TLSession` records — no
 * network, no IndexedDB, so it is directly unit-testable.
 *
 * Rules that exist for a reason:
 *  - **Deterministic ids** (`sym-…`, FNV-1a over stable content): importing the
 *    same file twice yields the same ids, and `mergeById` in `lib/backup.ts`
 *    turns the second import into a no-op instead of a duplicate log.
 *  - **Sets without a catalog id are skipped and counted**, never given an
 *    invented id: a synthetic `exerciseId` would corrupt PR history and the
 *    volume ledger far more quietly than a missing set ever would.
 *  - **Timestamps are local noon on the session's date.** The OCR JSON uses
 *    `T00:00:00.000Z`; midnight UTC is *yesterday* in every American timezone,
 *    which would bucket every set into the previous day for weekly views.
 *    Local noon keeps the calendar day stable wherever the file is opened.
 *
 * @module lib/symmetry
 */

import type { TLSession, TLSet } from "./types";

/** What the importer writes as the JSON root's `source`. */
export const SYMMETRY_SOURCE = "symmetry-screenshots";

export interface SymmetryImportReport {
  sessions: number;
  sets: number;
  /** Rows skipped because the exercise name has no catalog equivalent. */
  skippedNoId: number;
  /** Rows skipped for an unreadable weight/reps value. */
  skippedBadRow: number;
}

export type SymmetryImportResult =
  | { ok: true; sets: TLSet[]; sessions: TLSession[]; report: SymmetryImportReport }
  | { ok: false; error: SymmetryImportError };

export type SymmetryImportError = "not-json" | "wrong-shape" | "no-sessions";

interface RawSet {
  exerciseId?: unknown;
  exerciseName?: unknown;
  weightKg?: unknown;
  symmetryWeightKg?: unknown;
  reps?: unknown;
  durationSec?: unknown;
  warmup?: unknown;
  notes?: unknown;
}

interface RawSession {
  id?: unknown;
  startedAt?: unknown;
  durationMin?: unknown;
  location?: unknown;
  title?: unknown;
  sets?: unknown;
}

/**
 * 64 bits of FNV-1a, hex — small, dependency-free and stable across runs and
 * machines, which is all deterministic ids need. Collision odds over a few
 * thousand rows are negligible (2^64 space), unlike a bare 32-bit hash.
 */
function fnv1a64(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The badge a row carries, or `null` when it carries no note at all.
 *
 * Symmetry's screenshot parser puts the row's **set number** (`1`, `2`, `3` …)
 * in the same slot as its `W`/`D`/`F` badge, so 314 of the owner's rows arrived
 * with `notes: "4"` — an index, not a comment. Rendering those as notes would
 * put meaningless chips next to every set in the history tab, so a purely
 * numeric value is treated as "no note". Nothing is lost: the set's position in
 * the day is already implied by its timestamp, and the badge (the only part a
 * human wrote) is kept verbatim.
 */
function noteOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return trimmed;
}

/** `2026-09-02T00:00:00.000Z` → local noon of 2026-09-02, as an ISO string. */
function localNoonIso(dateIso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null; // e.g. 2026-02-30 — refuse instead of rolling over
  }
  return date.toISOString();
}

export function parseSymmetry(text: string): SymmetryImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (!isObject(raw) || raw.source !== SYMMETRY_SOURCE || !Array.isArray(raw.sessions)) {
    return { ok: false, error: "wrong-shape" };
  }
  const rawSessions = raw.sessions as RawSession[];
  if (rawSessions.length === 0) return { ok: false, error: "no-sessions" };

  const sets: TLSet[] = [];
  const sessions: TLSession[] = [];
  const report: SymmetryImportReport = {
    sessions: 0,
    sets: 0,
    skippedNoId: 0,
    skippedBadRow: 0,
  };
  const seenSessionIds = new Set<string>();

  for (const s of rawSessions) {
    const startedAt =
      typeof s.startedAt === "string" ? localNoonIso(s.startedAt.slice(0, 10)) : null;
    if (!startedAt) {
      report.skippedBadRow += Array.isArray(s.sets) ? s.sets.length : 0;
      continue;
    }
    const dateIso = startedAt.slice(0, 10);
    const rawId = typeof s.id === "string" && s.id ? s.id : fnv1a64(`${dateIso}|${s.title ?? ""}`);
    const id = `sym-${rawId}`;
    if (seenSessionIds.has(id)) continue; // the file itself must not duplicate
    seenSessionIds.add(id);

    const dayId = `day-symmetry-${dateIso}`;
    const durationMin = finiteOrNull(s.durationMin);
    const setIds: string[] = [];
    const rows = Array.isArray(s.sets) ? (s.sets as RawSet[]) : [];

    rows.forEach((row, index) => {
      const exerciseId = typeof row.exerciseId === "string" && row.exerciseId ? row.exerciseId : null;
      if (!exerciseId) {
        report.skippedNoId++; // never invent an id — see module doc
        return;
      }
      const weight = row.weightKg === null || row.weightKg === undefined ? null : finiteOrNull(row.weightKg);
      const reps = row.reps === null || row.reps === undefined ? null : finiteOrNull(row.reps);
      const durationSec = row.durationSec === undefined ? null : finiteOrNull(row.durationSec);
      if ((row.weightKg != null && weight === null) || (row.reps != null && reps === null)) {
        report.skippedBadRow++;
        return;
      }
      const exerciseName = typeof row.exerciseName === "string" ? row.exerciseName : "";
      const setId = `sym-${fnv1a64(
        `${dateIso}|${exerciseName}|${index}|${weight ?? "-"}|${reps ?? "-"}|${durationSec ?? "-"}`,
      )}`;
      setIds.push(setId);
      const note = noteOf(row.notes);
      sets.push({
        id: setId,
        exerciseId,
        dayId,
        timestamp: startedAt,
        weight,
        reps,
        ...(durationSec !== null && durationSec > 0 ? { durationSec } : {}),
        ...(row.warmup === true ? { warmup: true } : {}),
        ...(note ? { notes: note } : {}),
      });
      report.sets++;
    });

    sessions.push({
      id,
      dayId,
      startedAt,
      completedAt:
        durationMin !== null && durationMin > 0
          ? new Date(Date.parse(startedAt) + durationMin * 60_000).toISOString()
          : null,
      setIds,
      ...(typeof s.title === "string" && s.title ? { title: s.title } : {}),
      ...(s.location === "gym" || s.location === "home" ? { location: s.location } : {}),
      source: "symmetry",
    });
    report.sessions++;
  }

  if (sessions.length === 0) return { ok: false, error: "no-sessions" };
  return { ok: true, sets, sessions, report };
}
