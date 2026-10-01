/**
 * CSV export of logged sets — the data contract shared by Excel, an LLM and
 * the SQLite mirror (`scripts/fitness-data-cli.mjs`).
 *
 * Design decisions (full rationale in `docs/PLAN_CSV_SQLITE_CLI.md` §2):
 *   - `;` delimiter and decimal comma: Excel in a Spanish locale needs both,
 *     and any parser can ask for them explicitly (`pd.read_csv(sep=";", decimal=",")`).
 *   - UTF-8 BOM: Excel opens accented names correctly; the tolerant parser in
 *     `scripts/fitness-data-lib.mjs` strips it.
 *   - CRLF endings, RFC 4180 quoting.
 *
 * Pure module on purpose: no DOM, no catalog import. The caller supplies an
 * exercise-metadata lookup, which keeps this testable from the root suite and
 * keeps the CSV shape independent from how the catalog is loaded.
 *
 * @module lib/export-csv
 */

import type { TLSet } from "./types";

/** Metadata the CSV shows per exercise; resolved by the caller from the catalog. */
export interface CsvExerciseMeta {
  nameEs: string;
  nameEn: string;
  primaryFamily: string;
  pattern: string;
  equipment: string;
}

/** `null` when the exercise is not in the catalog (the row still exports). */
export type ExerciseMetaLookup = (exerciseId: string) => CsvExerciseMeta | null;

export interface BuildSetsCsvOptions {
  /** Display unit for `weight_display`/`unit`. Storage stays kg (canonical). */
  unit: "kg" | "lb";
  lookup: ExerciseMetaLookup;
}

/**
 * Column order is part of the contract: the SQLite mirror's `sets` table and
 * the CLI's tolerant parser (`scripts/fitness-data-lib.mjs`) use the same names.
 */
export const SETS_CSV_COLUMNS = [
  "set_id",
  "timestamp",
  "date",
  "time",
  "exercise_id",
  "exercise_name_es",
  "exercise_name_en",
  "primary_family",
  "pattern",
  "equipment",
  "set_index",
  "warmup",
  "weight_kg",
  "weight_display",
  "unit",
  "reps",
  "rpe",
  "volume_kg",
  "notes",
] as const;

/** Excel needs it; every tolerant parser skips it. Prepended by the builder. */
export const CSV_BOM = "\uFEFF";

const KG_TO_LB = 2.2046226218;

/** RFC 4180 quoting: only when the cell would otherwise break the row. */
export function csvEscape(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Numbers use the decimal comma (Excel es-ES) and never thousands separators;
 * empty for `null`/`undefined`, so "no data" is distinguishable from "0".
 */
export function formatCsvNumber(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value == null || !Number.isFinite(value)) return "";
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded).replace(".", ",");
}

/** Local calendar date/time of an ISO timestamp (`""` when unparseable). */
function localParts(timestamp: string): { date: string; time: string } {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build the CSV text: BOM + header + one row per set, chronological order,
 * warm-ups included and flagged (`warmup` = 1), `set_index` counting sets of
 * the same exercise within the same day.
 */
export function buildSetsCsv(
  sets: readonly TLSet[],
  options: BuildSetsCsvOptions,
): string {
  const ordered = [...sets].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const perExerciseDay = new Map<string, number>();
  const lines: string[] = [SETS_CSV_COLUMNS.join(";")];

  for (const set of ordered) {
    const indexKey = `${set.dayId}\u0000${set.exerciseId}`;
    const setIndex = (perExerciseDay.get(indexKey) ?? 0) + 1;
    perExerciseDay.set(indexKey, setIndex);

    const meta = options.lookup(set.exerciseId);
    const { date, time } = localParts(set.timestamp);
    const weightKg = set.weight ?? null;
    const weightDisplay =
      weightKg == null
        ? null
        : options.unit === "lb"
          ? weightKg * KG_TO_LB
          : weightKg;
    const volume =
      weightKg != null && set.reps != null ? weightKg * set.reps : null;

    const cells: string[] = [
      set.id,
      set.timestamp,
      date,
      time,
      set.exerciseId,
      meta?.nameEs ?? "",
      meta?.nameEn ?? "",
      meta?.primaryFamily ?? "",
      meta?.pattern ?? "",
      meta?.equipment ?? "",
      String(setIndex),
      set.warmup ? "1" : "0",
      formatCsvNumber(weightKg),
      formatCsvNumber(weightDisplay),
      options.unit,
      set.reps == null ? "" : String(set.reps),
      formatCsvNumber(set.rpe),
      formatCsvNumber(volume == null ? null : round2(volume)),
      set.notes ?? "",
    ];
    lines.push(cells.map(csvEscape).join(";"));
  }

  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}
