/**
 * Data CLI — tolerant CSV parsing, the SQLite mirror, and one real end-to-end
 * round trip through `scripts/fitness-data-cli.mjs`.
 *
 * The SQLite half is skipped automatically on a Node without `node:sqlite`
 * (needs >= 22.5), the same graceful boundary the LAN store documents.
 *
 * @module tests/training/data_cli
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  SETS_COLUMNS,
  buildCsv,
  ingestParsed,
  openDb,
  parseCsv,
  parseNumber,
  sqliteAvailable,
  summarize,
} from "../../scripts/fitness-data-lib.mjs";
import { buildSetsCsv } from "../../traininglab/apps/desktop/src/lib/export-csv";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, "../../scripts/fitness-data-cli.mjs");

const SETS: TLSet[] = [
  {
    id: "set-a",
    exerciseId: "barbell-bench-press",
    dayId: "day-1",
    timestamp: "2026-09-30T10:00:00.000Z",
    weight: 20,
    reps: 10,
    warmup: true,
  },
  {
    id: "set-b",
    exerciseId: "barbell-bench-press",
    dayId: "day-1",
    timestamp: "2026-09-30T10:05:00.000Z",
    weight: 62.5,
    reps: 8,
    rpe: 8,
  },
];

const APP_CSV = buildSetsCsv(SETS, {
  unit: "kg",
  lookup: (id) =>
    id === "barbell-bench-press"
      ? {
          nameEs: "Press con Barra",
          nameEn: "Barbell Bench Press",
          primaryFamily: "chest",
          pattern: "horizontal_push",
          equipment: "Barra + Banca Plana",
        }
      : null,
});

describe("data CLI: tolerant CSV parsing", () => {
  it("reads the app's own export (BOM, ';', decimal comma)", () => {
    const parsed = parseCsv(APP_CSV);
    expect(parsed.columns).toEqual([...SETS_COLUMNS]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]!.set_id).toBe("set-a");
    expect(parsed.rows[0]!.weight_kg).toBe("20");
    expect(parsed.rows[1]!.weight_kg).toBe("62,5");
    expect(parseNumber(parsed.rows[1]!.weight_kg)).toBe(62.5);
    expect(parsed.rows[1]!.volume_kg).toBe("500");
  });

  it("also reads comma-delimited, dot-decimal CSVs", () => {
    const parsed = parseCsv(
      "set_id,timestamp,weight_kg,reps\na,2026-01-01T00:00:00Z,62.5,8\n",
    );
    expect(parsed.columns).toContain("set_id");
    expect(parsed.rows).toHaveLength(1);
    expect(parseNumber(parsed.rows[0]!.weight_kg)).toBe(62.5);
  });

  it("round-trips through buildCsv without losing rows", () => {
    const reparsed = parseCsv(buildCsv(parseCsv(APP_CSV).rows));
    expect(reparsed.rows).toHaveLength(2);
    expect(reparsed.rows[1]!.weight_kg).toBe("62,5");
  });
});

describe.skipIf(!sqliteAvailable())("data CLI: SQLite mirror", () => {
  it("ingests idempotently by set_id and computes the summary", () => {
    const db = openDb(":memory:");
    try {
      const parsed = parseCsv(APP_CSV);
      const first = ingestParsed(db, parsed, { file: "test.csv" });
      expect(first).toBe(2);
      // Re-ingesting the same export must not duplicate anything.
      ingestParsed(db, parsed, { file: "test.csv" });
      const summary = summarize(db);
      expect(summary.totals.sets).toBe(2);
      expect(summary.totals.workSets).toBe(1);
      expect(summary.totals.warmupSets).toBe(1);
      expect(summary.totals.exercises).toBe(1);
      const chest = summary.volumeByFamily.find(
        (row: { family: string }) => row.family === "chest",
      );
      expect(chest.volume_kg).toBe(500);
      expect(summary.personalRecords[0]!.max_weight_kg).toBe(62.5);
    } finally {
      db.close();
    }
  });

  it("--replace rebuilds a clean mirror", () => {
    const db = openDb(":memory:");
    try {
      ingestParsed(db, parseCsv(APP_CSV), { file: "a.csv" });
      const one = parseCsv(buildCsv(parseCsv(APP_CSV).rows.slice(1)));
      ingestParsed(db, one, { file: "b.csv", replace: true });
      const summary = summarize(db);
      expect(summary.totals.sets).toBe(1);
      expect(summary.totals.warmupSets).toBe(0);
    } finally {
      db.close();
    }
  });

  it("rejects a row without set_id instead of half-loading", () => {
    const db = openDb(":memory:");
    try {
      const bad = parseCsv("set_id,timestamp,exercise_id\n,2026-01-01,x\n");
      expect(() => ingestParsed(db, bad)).toThrow(/set_id/);
      expect(summarize(db).totals.sets).toBe(0);
    } finally {
      db.close();
    }
  });

  it("runs the real CLI end to end: ingest → sql → export", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tl-data-cli-"));
    try {
      const csvPath = path.join(dir, "export.csv");
      const dbPath = path.join(dir, "mirror.sqlite");
      const outPath = path.join(dir, "round-trip.csv");
      fs.writeFileSync(csvPath, APP_CSV, "utf8");

      const ingest = JSON.parse(
        execFileSync(
          process.execPath,
          [CLI, "--ingest", csvPath, "--db", dbPath, "--replace"],
          { encoding: "utf8" },
        ),
      );
      expect(ingest.ok).toBe(true);
      expect(ingest.rows).toBe(2);

      const sql = JSON.parse(
        execFileSync(
          process.execPath,
          [
            CLI,
            "--sql",
            "SELECT COUNT(*) AS n, SUM(volume_kg) AS volume FROM sets",
            "--db",
            dbPath,
          ],
          { encoding: "utf8" },
        ),
      );
      expect(sql[0].n).toBe(2);
      expect(sql[0].volume).toBe(700); // 20×10 warm-up + 62.5×8 work

      const exported = JSON.parse(
        execFileSync(
          process.execPath,
          [CLI, "--export", outPath, "--db", dbPath],
          { encoding: "utf8" },
        ),
      );
      expect(exported.rows).toBe(2);
      const text = fs.readFileSync(outPath, "utf8");
      expect(text.startsWith("\uFEFF")).toBe(true);
      expect(parseCsv(text).rows).toHaveLength(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
