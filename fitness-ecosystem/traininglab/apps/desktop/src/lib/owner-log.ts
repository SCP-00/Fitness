/**
 * The owner's corrected training log (CSV) → TrainingLab records.
 *
 * `owner-training-log.csv` at the project root (gitignored — it is his body,
 * not code) is the canonical history: 14 columns, `source` telling where each
 * row came from (`symmetry` for the OCR'd past, `owner_chat` for the sessions
 * he described in chat). He corrects that file **by hand** — the 26-vs-13 kg
 * laterals fix lives in it — so this importer trusts it, while still never
 * inventing anything:
 *
 *  - A row without `exercise_id` and without an unambiguous name mapping is
 *    skipped and counted (`skippedNoId`). Names the catalog cannot honestly
 *    cover (mobility flows, neck work, an unreadable OCR'd custom name) stay
 *    unmapped on purpose — see `scripts/map-symmetry-exercises.mjs`.
 *  - A row with neither repetitions nor a duration cannot be represented, so it
 *    is skipped and counted (`skippedBadRow`).
 *  - Weight keeps the sheet's convention: `weight_kg_per_implement` is what one
 *    implement means and is what lands in `weight`; when only
 *    `weight_kg_total` exists it is copied **as written, never divided** —
 *    reinterpreting his numbers is exactly the bug he asked to stop.
 *
 * Two guarantees make it safe to run after every training week:
 *
 *  1. **Ids are row identity, not content** (`own-` + FNV-1a over
 *     date|exercise|set number): correcting a weight in the sheet and
 *     re-importing *replaces* the stale row instead of adding a second copy of
 *     the same set. `lib/symmetry.ts` hashes content instead because its input
 *     is immutable OCR output; this input is edited by a human.
 *  2. **Rows already in the log are dropped before the merge**, matched on
 *     exercise/day/weight/reps/duration, so importing the CSV after the older
 *     Symmetry JSON (or twice) can never double-count volume or fake a PR.
 *
 * @module lib/owner-log
 */

import type { TLSession, TLSet } from "./types";

export type OwnerLogError =
  | "unreadable"
  | "xlsx"
  | "missing-columns"
  | "wrong-shape"
  | "no-rows";

export interface OwnerLogReport {
  /**
   * Days with something new in them. `parseOwnerLog` counts the days in the
   * file; `dropExisting` rewrites both counters to what is actually new to the
   * log, which is what the import message reports.
   */
  sessions: number;
  /** Sets in the file (after `dropExisting`: sets that are new to the log). */
  sets: number;
  /** Rows already present (same exercise, day, weight, reps, duration). */
  duplicates: number;
  /** Rows skipped: no catalog id and no curated name mapping. */
  skippedNoId: number;
  /** Rows skipped: unparseable date/number, or neither reps nor duration. */
  skippedBadRow: number;
}

export type OwnerLogResult =
  | { ok: true; sets: TLSet[]; sessions: TLSession[]; report: OwnerLogReport }
  | { ok: false; error: OwnerLogError };

/**
 * Curated name → catalog id for the rows the sheet leaves without
 * `exercise_id`. Only matches that are unambiguous in both languages:
 * "Press de hombros con mancuernas (sentado)" is `seated-dumbbell-press`
 * ("Press de Hombro Sentado"), not the cable or machine variants, because a
 * wrong id would corrupt PR history and the volume ledger far more quietly
 * than a skipped row ever would.
 */
const NAME_TO_ID: Record<string, string> = {
  "elevaciones laterales con mancuerna": "lateral-raise",
  "press de hombros con mancuernas (sentado)": "seated-dumbbell-press",
  "encogimiento con mancuernas": "dumbbell-shrugs",
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 64-bit FNV-1a, hex — same primitive as `lib/symmetry.ts`. */
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

/** Local noon of a `YYYY-MM-DD` date, or null when the date cannot exist. */
function localNoonIso(dateIso: string): string | null {
  const m = DATE_RE.exec(dateIso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date.toISOString();
}

/**
 * Numbers as the owner writes them: `12,5` is twelve and a half, and a Spanish
 * locale exports decimals with a comma (always, when the file is saved with
 * `;` as the separator). Empty means "no value", not zero.
 */
function readNumber(cell: string): { ok: true; value: number | null } | { ok: false } {
  const raw = cell.trim();
  if (!raw) return { ok: true, value: null };
  const normalised = raw.includes(".") || !raw.includes(",") ? raw : raw.replace(",", ".");
  const value = Number(normalised);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

/**
 * A note that is only a number is a set index, not a comment — Symmetry writes
 * `1`, `2`, `3` in the badge slot and rendering those as chips would put
 * meaningless labels next to every set (same rule as `lib/symmetry.ts`).
 */
function noteOf(cell: string): string | null {
  const trimmed = cell.trim();
  if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed)) return null;
  return trimmed;
}

/** RFC 4180 records (quotes, escaped quotes, newlines inside cells). */
function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const head = text.split(/\r?\n/, 1)[0] ?? "";
  let delimiter = ",";
  for (const candidate of [",", ";", "\t"]) {
    if (head.split(candidate).length - 1 > head.split(delimiter).length - 1) delimiter = candidate;
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const header = (rows.shift() ?? []).map((c) => c.trim().replace(/^\uFEFF/, "").toLowerCase());
  return { header, rows: rows.filter((r) => r.some((c) => c.trim() !== "")) };
}

export function parseOwnerLog(input: string): OwnerLogResult {
  // An .xlsx is a ZIP: saying so beats producing a "not readable" message, and
  // it never silently drops the columns Excel saved away (`duration_sec`,
  // `warmup`) — those rows would import as empty sets.
  if (input.charCodeAt(0) === 0x50 && input.charCodeAt(1) === 0x4b) {
    return { ok: false, error: "xlsx" };
  }
  const { header, rows } = parseCsv(input.replace(/^\uFEFF/, ""));
  const col = (name: string) => header.indexOf(name);
  if (col("date") < 0 || col("exercise_name") < 0) return { ok: false, error: "wrong-shape" };
  // Both columns change what the numbers mean: without `warmup` twenty of the
  // owner's ramp sets would count as working volume, and without
  // // `duration_sec` the isometric rows (plank, dead hang, stretches) would
  // arrive with neither reps nor time. Refuse instead of guessing.
  if (col("duration_sec") < 0 || col("warmup") < 0) {
    return { ok: false, error: "missing-columns" };
  }
  if (rows.length === 0) return { ok: false, error: "no-rows" };

  const iDate = col("date");
  const iId = col("exercise_id");
  const iName = col("exercise_name");
  const iSet = col("set_number");
  const iReps = col("reps");
  const iDur = col("duration_sec");
  const iPer = col("weight_kg_per_implement");
  const iTotal = col("weight_kg_total");
  const iWarm = col("warmup");
  const iNotes = col("notes");

  const report: OwnerLogReport = {
    sessions: 0,
    sets: 0,
    duplicates: 0,
    skippedNoId: 0,
    skippedBadRow: 0,
  };

  /** date → rows of that day, in file order (order is part of the identity). */
  const byDate = new Map<string, string[][]>();
  for (const row of rows) {
    const date = (row[iDate] ?? "").trim();
    if (!DATE_RE.test(date)) {
      report.skippedBadRow++;
      continue;
    }
    const bucket = byDate.get(date);
    if (bucket) bucket.push(row);
    else byDate.set(date, [row]);
  }

  const sets: TLSet[] = [];
  const sessions: TLSession[] = [];

  for (const [date, dayRows] of byDate) {
    const timestamp = localNoonIso(date);
    if (!timestamp) {
      report.skippedBadRow += dayRows.length;
      continue;
    }
    const dayId = `day-${date}`;
    const setIds: string[] = [];
    let added = 0;

    dayRows.forEach((row, index) => {
      const name = (row[iName] ?? "").trim();
      const rawId = (iId >= 0 ? (row[iId] ?? "") : "").trim();
      const exerciseId =
        rawId || NAME_TO_ID[name.trim().toLowerCase().replace(/\s+/g, " ")] || "";
      if (!exerciseId) {
        report.skippedNoId++;
        return;
      }
      const reps = iReps >= 0 ? readNumber(row[iReps] ?? "") : { ok: true, value: null };
      const duration = iDur >= 0 ? readNumber(row[iDur] ?? "") : { ok: true, value: null };
      const per = iPer >= 0 ? readNumber(row[iPer] ?? "") : { ok: true, value: null };
      const total = iTotal >= 0 ? readNumber(row[iTotal] ?? "") : { ok: true, value: null };
      if (!reps.ok || !duration.ok || !per.ok || !total.ok) {
        report.skippedBadRow++;
        return;
      }
      const weight = per.value ?? total.value;
      const repsValue = reps.value;
      const durationValue = duration.value;
      if (repsValue === null && (durationValue === null || durationValue <= 0)) {
        report.skippedBadRow++; // nothing measurable in the row
        return;
      }
      const setNumber = iSet >= 0 ? readNumber(row[iSet] ?? "") : { ok: true, value: null };
      const ordinal = setNumber.ok && setNumber.value !== null ? setNumber.value : index + 1;
      // Row identity (not content): re-importing a corrected row replaces it.
      const id = `own-${fnv1a64(`${date}|${exerciseId}|${ordinal}`)}`;
      const note = iNotes >= 0 ? noteOf(row[iNotes] ?? "") : null;
      const warmup = iWarm >= 0 && /^(true|1|sí|si)$/i.test((row[iWarm] ?? "").trim());

      sets.push({
        id,
        exerciseId,
        dayId,
        timestamp,
        weight,
        reps: repsValue,
        ...(durationValue !== null && durationValue > 0 ? { durationSec: durationValue } : {}),
        ...(warmup ? { warmup: true } : {}),
        ...(note ? { notes: note } : {}),
      });
      setIds.push(id);
      added++;
    });

    if (added > 0) {
      sessions.push({
        // Also row identity: a corrected file rebuilds the same session.
        id: `own-${fnv1a64(`session|${date}`)}`,
        dayId,
        startedAt: timestamp,
        completedAt: null,
        setIds,
        source: "owner-log",
      });
      report.sessions++;
      report.sets += added;
    }
  }

  if (sessions.length === 0) return { ok: false, error: "no-rows" };
  return { ok: true, sets, sessions, report };
}

/** Content key used to recognise a row that is already in the log. */
function contentKey(set: TLSet): string {
  return [
    set.exerciseId,
    set.timestamp,
    set.weight ?? "-",
    set.reps ?? "-",
    set.durationSec ?? "-",
    set.warmup ? "w" : "-",
  ].join("|");
}

/**
 * Drop incoming rows the log already holds (matched on content, not on id, so
 * rows that arrived through the Symmetry importer are recognised too) and keep
 * only the sessions that still have something new to say. Multiset-aware: three
 * identical sets in a session are only "duplicates" for as many as the log
 * already contains.
 */
export function dropExisting(
  parsed: { sets: TLSet[]; sessions: TLSession[]; report: OwnerLogReport },
  existing: readonly TLSet[],
): { sets: TLSet[]; sessions: TLSession[]; report: OwnerLogReport } {
  const available = new Map<string, number>();
  for (const set of existing) {
    const key = contentKey(set);
    available.set(key, (available.get(key) ?? 0) + 1);
  }
  const fresh: TLSet[] = [];
  for (const set of parsed.sets) {
    const key = contentKey(set);
    const left = available.get(key) ?? 0;
    if (left > 0) {
      available.set(key, left - 1);
      parsed.report.duplicates++;
      continue;
    }
    fresh.push(set);
  }

  const freshIds = new Set(fresh.map((s) => s.id));
  const existingIds = new Set(existing.map((s) => s.id));
  // A session is worth sending only when it carries something new; its setIds
  // keep every id that will exist after the merge (fresh, or already present
  // under the same row-identity id) so a corrected day rebuilds completely
  // while a no-op re-import stays a no-op.
  const sessions = parsed.sessions
    .map((session) => ({
      ...session,
      setIds: session.setIds.filter((id) => freshIds.has(id) || existingIds.has(id)),
    }))
    .filter((session) => session.setIds.some((id) => freshIds.has(id)));

  parsed.report.sets = fresh.length;
  parsed.report.sessions = sessions.length;
  return { sets: fresh, sessions, report: parsed.report };
}
