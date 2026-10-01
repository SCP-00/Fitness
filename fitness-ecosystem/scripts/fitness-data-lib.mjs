#!/usr/bin/env node
/**
 * `fitness-data-lib.mjs` — pure helpers behind `fitness-data-cli.mjs`.
 *
 * What this is
 * ------------
 * The data layer that lets an LLM (Buffy today, a local Qwen-class model later)
 * read, query and reshape TrainingLab's logged sets without the browser: a
 * tolerant CSV reader for the app's export (`lib/export-csv.ts`), a SQLite
 * mirror via the built-in `node:sqlite`, aggregates, and a CSV writer that
 * reproduces the app's exact contract (BOM, `;`, decimal comma, CRLF).
 *
 * Why node:sqlite and not pandas
 * ------------------------------
 * The repository is Node-only and dependency-free; `node:sqlite` ships with
 * Node >= 22.5 and is the same engine the optional LAN store already uses.
 * Python/pandas remains a *consumer* of the CSV (recipe in
 * `docs/PLAN_CSV_SQLITE_CLI.md` §3.4), never a requirement.
 *
 * Module split: this file is import-safe (the root test suite imports it), while
 * `fitness-data-cli.mjs` is the argv/printing wrapper. Nothing here touches
 * `process.argv`, the network or the user's files without being asked.
 *
 * @module scripts/fitness-data-lib
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export const CSV_BOM = "\uFEFF";

/** Same names and order as `SETS_CSV_COLUMNS` in the app's export module. */
export const SETS_COLUMNS = [
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
];

/**
 * SQL schema of the mirror. Deliberately denormalised: the CLI is a query
 * surface for an LLM, and one flat table answers volume/PR/family questions
 * without joins. Upsert by `set_id` mirrors the app's UUID convention, so
 * re-ingesting an updated export never duplicates a series.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS sets (
  set_id           TEXT PRIMARY KEY,
  timestamp        TEXT NOT NULL,
  date             TEXT NOT NULL,
  time             TEXT,
  exercise_id      TEXT NOT NULL,
  exercise_name_es TEXT,
  exercise_name_en TEXT,
  primary_family   TEXT,
  pattern          TEXT,
  equipment        TEXT,
  set_index        INTEGER,
  warmup           INTEGER NOT NULL DEFAULT 0,
  weight_kg        REAL,
  weight_display   REAL,
  unit             TEXT,
  reps             INTEGER,
  rpe              REAL,
  volume_kg        REAL,
  notes            TEXT
);
CREATE INDEX IF NOT EXISTS sets_exercise ON sets(exercise_id, timestamp);
CREATE INDEX IF NOT EXISTS sets_family ON sets(primary_family, date);

CREATE TABLE IF NOT EXISTS ingests (
  file        TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  rows        INTEGER NOT NULL
);
`;

// ── CSV ─────────────────────────────────────────────────────────────────────

/** Drop the UTF-8 BOM Excel needs but parsers must ignore. */
export function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** `;` (our export, Excel es-ES) vs `,` (RFC 4180, hand-made files). */
export function detectDelimiter(text) {
  const header = stripBom(String(text)).split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (header.match(/;/g) ?? []).length;
  const commas = (header.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

/**
 * Tolerant number reader: `"62,5"` and `"62.5"` both become 62.5; empty and
 * non-numeric values become `null`. Never throws — a hostile cell must not
 * abort an ingest.
 *
 * Note: values with thousands separators are not part of our contract (the
 * app's writer never emits them), so `"1.500"` reads as 1.5 — documented
 * limitation, not a bug to guess around.
 */
export function parseNumber(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (raw === "") return null;
  const normalised = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

export function parseIntOrNull(value) {
  const n = parseNumber(value);
  return n == null ? null : Math.round(n);
}

/** Mirror of the app's formatter: decimal comma, no thousands separators. */
export function formatCsvNumber(value, decimals = 2) {
  if (value == null || !Number.isFinite(Number(value))) return "";
  const factor = 10 ** decimals;
  const rounded = Math.round(Number(value) * factor) / factor;
  return String(rounded).replace(".", ",");
}

/** RFC 4180 quoting (same rule as the app: `;`, quote or newline force quotes). */
export function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Parse CSV text into `{ columns, rows }` where each row is an object keyed by
 * the header. Accepts both delimiters and both decimal styles; ignores a BOM,
 * blank lines and a trailing newline; pads short rows with empty strings.
 */
export function parseCsv(text) {
  const clean = stripBom(String(text));
  const delimiter = detectDelimiter(clean);
  const records = [];
  let field = "";
  let record = [];
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delimiter) {
      record.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter(
    (r) => r.length > 1 || String(r[0] ?? "").trim() !== "",
  );
  const [header, ...data] = nonEmpty;
  if (!header) return { columns: [], rows: [] };
  const columns = header.map((c) => String(c).trim());
  const rows = data.map((cells) => {
    const row = {};
    columns.forEach((column, index) => {
      row[column] = cells[index] ?? "";
    });
    return row;
  });
  return { columns, rows };
}

/** Write the app's exact CSV contract back out (BOM + `;` + comma decimals). */
export function buildCsv(rows, columns = SETS_COLUMNS) {
  const lines = [columns.join(";")];
  for (const row of rows) {
    lines.push(
      columns
        .map((column) => {
          const value = row[column];
          return csvEscape(
            typeof value === "number" ? formatCsvNumber(value) : value,
          );
        })
        .join(";"),
    );
  }
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}

// ── SQLite mirror ───────────────────────────────────────────────────────────

/** True when this Node has the built-in SQLite module (>= 22.5 / current LTS). */
export function sqliteAvailable() {
  try {
    createRequire(import.meta.url)("node:sqlite");
    return true;
  } catch {
    return false;
  }
}

/**
 * Open (or create) the mirror. `":memory:"` is honoured for tests.
 * The WAL journal keeps a big ingest from blocking reads, like the LAN store.
 */
export function openDb(file) {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = createRequire(import.meta.url)("node:sqlite"));
  } catch {
    throw new Error(
      "the data CLI needs the built-in node:sqlite module (Node 22.5+). " +
        `You are on ${process.version}.`,
    );
  }
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  return db;
}

/** Normalise one parsed CSV row into the SQLite column shape. */
function rowToValues(row) {
  const weightKg = parseNumber(row.weight_kg);
  const reps = parseIntOrNull(row.reps);
  const volume = parseNumber(row.volume_kg);
  return {
    set_id: row.set_id,
    timestamp: row.timestamp,
    date: row.date || String(row.timestamp ?? "").slice(0, 10),
    time: row.time || null,
    exercise_id: row.exercise_id,
    exercise_name_es: row.exercise_name_es || null,
    exercise_name_en: row.exercise_name_en || null,
    primary_family: row.primary_family || null,
    pattern: row.pattern || null,
    equipment: row.equipment || null,
    set_index: parseIntOrNull(row.set_index),
    warmup: parseIntOrNull(row.warmup) === 1 ? 1 : 0,
    weight_kg: weightKg,
    weight_display: parseNumber(row.weight_display),
    unit: row.unit || null,
    reps,
    rpe: parseNumber(row.rpe),
    volume_kg:
      volume ??
      (weightKg != null && reps != null
        ? Math.round(weightKg * reps * 100) / 100
        : null),
    notes: row.notes || null,
  };
}

/**
 * Upsert parsed rows into `sets`, in one transaction. `--replace` empties the
 * mirror first (a clean rebuild). Throws on a row without `set_id` *before*
 * committing, so a broken file never half-loads.
 *
 * @returns {number} rows written
 */
export function ingestParsed(db, parsed, { file = "", replace = false } = {}) {
  if (replace) db.exec("DELETE FROM sets");
  const assignments = SETS_COLUMNS.filter((c) => c !== "set_id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  const stmt = db.prepare(
    `INSERT INTO sets (${SETS_COLUMNS.join(", ")})
     VALUES (${SETS_COLUMNS.map(() => "?").join(", ")})
     ON CONFLICT(set_id) DO UPDATE SET ${assignments}`,
  );

  let written = 0;
  db.exec("BEGIN");
  try {
    parsed.rows.forEach((row, index) => {
      if (!row.set_id || !String(row.set_id).trim()) {
        throw new Error(`row ${index + 2}: set_id is required`);
      }
      const values = rowToValues(row);
      stmt.run(...SETS_COLUMNS.map((c) => values[c] ?? null));
      written += 1;
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (written > 0 || file) {
    db.prepare(
      "INSERT INTO ingests (file, ingested_at, rows) VALUES (?, ?, ?)",
    ).run(file || "(inline)", new Date().toISOString(), written);
  }
  return written;
}

/** Read every set back as plain objects (chronological). */
export function selectSets(db) {
  return db
    .prepare("SELECT * FROM sets ORDER BY timestamp ASC, set_index ASC")
    .all();
}

/**
 * The aggregate an LLM asks for first: totals, volume by family (all-time and
 * last 7 days), PRs per exercise (best work set) and the last sets logged.
 */
export function summarize(db) {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS sets,
              SUM(CASE WHEN warmup = 0 THEN 1 ELSE 0 END) AS work_sets,
              SUM(CASE WHEN warmup = 1 THEN 1 ELSE 0 END) AS warmup_sets,
              COUNT(DISTINCT exercise_id) AS exercises,
              MIN(date) AS first_date,
              MAX(date) AS last_date
         FROM sets`,
    )
    .get();

  const volumeByFamily = db
    .prepare(
      `SELECT primary_family AS family,
              COUNT(*) AS sets,
              ROUND(SUM(volume_kg), 1) AS volume_kg
         FROM sets
        WHERE warmup = 0
        GROUP BY primary_family
        ORDER BY volume_kg DESC`,
    )
    .all();

  const weeklySince = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const weeklyVolumeByFamily = db
    .prepare(
      `SELECT primary_family AS family,
              COUNT(*) AS sets,
              ROUND(SUM(volume_kg), 1) AS volume_kg
         FROM sets
        WHERE warmup = 0 AND date >= ?
        GROUP BY primary_family
        ORDER BY volume_kg DESC`,
    )
    .all(weeklySince);

  const personalRecords = db
    .prepare(
      `SELECT exercise_id, exercise_name_es, weight_kg AS max_weight_kg,
              reps, date
         FROM (
           SELECT sets.*,
                  ROW_NUMBER() OVER (
                    PARTITION BY exercise_id
                    ORDER BY weight_kg DESC, date DESC
                  ) AS rn
             FROM sets
            WHERE warmup = 0 AND weight_kg IS NOT NULL
         )
        WHERE rn = 1
        ORDER BY max_weight_kg DESC`,
    )
    .all();

  const lastSets = db
    .prepare(
      `SELECT date, time, exercise_id, exercise_name_es, weight_kg, reps, rpe, warmup
         FROM sets
        ORDER BY timestamp DESC
        LIMIT 15`,
    )
    .all();

  return {
    totals: {
      sets: Number(totals.sets ?? 0),
      workSets: Number(totals.work_sets ?? 0),
      warmupSets: Number(totals.warmup_sets ?? 0),
      exercises: Number(totals.exercises ?? 0),
      firstDate: totals.first_date ?? null,
      lastDate: totals.last_date ?? null,
    },
    weeklySince,
    volumeByFamily,
    weeklyVolumeByFamily,
    personalRecords,
    lastSets,
  };
}

/** Tables, row counts and ingest history of the mirror. */
export function schemaInfo(db) {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((r) => r.name);
  const sets = db.prepare("SELECT COUNT(*) AS n FROM sets").get();
  const lastIngest = db
    .prepare(
      "SELECT file, ingested_at, rows FROM ingests ORDER BY ingested_at DESC LIMIT 1",
    )
    .get();
  return {
    tables,
    sets: Number(sets.n ?? 0),
    lastIngest: lastIngest ?? null,
  };
}
