/**
 * TrainingLab CSV export — format contract tests.
 *
 * The CSV is read by three consumers that must not be surprised: Excel in a
 * Spanish locale (BOM, `;`, decimal comma), an LLM, and the SQLite mirror in
 * `scripts/fitness-data-cli.mjs` (whose column names must match exactly).
 *
 * @module tests/training/export_csv
 */

import { describe, it, expect } from "vitest";
import {
  CSV_BOM,
  SETS_CSV_COLUMNS,
  buildSetsCsv,
  csvEscape,
  formatCsvNumber,
} from "../../traininglab/apps/desktop/src/lib/export-csv";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

const BENCH_META = {
  nameEs: "Press con Barra",
  nameEn: "Barbell Bench Press",
  primaryFamily: "chest",
  pattern: "horizontal_push",
  equipment: "Barra + Banca Plana",
};

const lookup = (id: string) =>
  id === "barbell-bench-press" ? BENCH_META : null;

function cells(line: string, header: string[]): Record<string, string> {
  const values = line.split(";");
  return Object.fromEntries(header.map((name, i) => [name, values[i] ?? ""]));
}

describe("export CSV: format contract", () => {
  it("starts with the BOM and uses ';' + CRLF even with zero sets", () => {
    const csv = buildSetsCsv([], { unit: "kg", lookup });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.slice(1)).toBe(`${SETS_CSV_COLUMNS.join(";")}\r\n`);
  });

  it("exports chronological rows with set_index per exercise/day and warmup flag", () => {
    const sets: TLSet[] = [
      {
        id: "set-b",
        exerciseId: "barbell-bench-press",
        dayId: "day-1",
        timestamp: "2026-09-30T10:05:00.000Z",
        weight: 62.5,
        reps: 8,
        rpe: 8,
      },
      {
        id: "set-a",
        exerciseId: "barbell-bench-press",
        dayId: "day-1",
        timestamp: "2026-09-30T10:00:00.000Z",
        weight: 20,
        reps: 10,
        warmup: true,
      },
    ];
    const csv = buildSetsCsv(sets, { unit: "kg", lookup });
    const lines = csv.slice(1).trimEnd().split("\r\n");
    const header = lines[0]!.split(";");
    expect(lines).toHaveLength(3);

    const first = cells(lines[1]!, header);
    const second = cells(lines[2]!, header);
    expect(first["set_id"]).toBe("set-a");
    expect(first["warmup"]).toBe("1");
    expect(first["set_index"]).toBe("1");
    expect(second["set_id"]).toBe("set-b");
    expect(second["warmup"]).toBe("0");
    expect(second["set_index"]).toBe("2");
  });

  it("writes decimal commas, computes volume and keeps the display unit", () => {
    const sets: TLSet[] = [
      {
        id: "s1",
        exerciseId: "barbell-bench-press",
        dayId: "day-1",
        timestamp: "2026-09-30T10:00:00.000Z",
        weight: 62.5,
        reps: 20,
      },
    ];
    const csv = buildSetsCsv(sets, { unit: "lb", lookup });
    const lines = csv.slice(1).trimEnd().split("\r\n");
    const row = cells(lines[1]!, lines[0]!.split(";"));
    expect(row["weight_kg"]).toBe("62,5");
    expect(row["weight_display"]).toBe("137,79");
    expect(row["unit"]).toBe("lb");
    expect(row["volume_kg"]).toBe("1250");
    expect(row["exercise_name_es"]).toBe("Press con Barra");
    expect(row["primary_family"]).toBe("chest");
    expect(row["pattern"]).toBe("horizontal_push");
    expect(row["equipment"]).toBe("Barra + Banca Plana");
    expect(row["date"]).toMatch(/^2026-09-30$/);
  });

  it("quotes notes containing the delimiter, quotes or newlines", () => {
    const sets: TLSet[] = [
      {
        id: "s1",
        exerciseId: "barbell-bench-press",
        dayId: "day-1",
        timestamp: "2026-09-30T10:00:00.000Z",
        weight: 40,
        reps: 10,
        notes: 'falló; dijo "una más"',
      },
    ];
    const csv = buildSetsCsv(sets, { unit: "kg", lookup });
    expect(csv).toContain('"falló; dijo ""una más"""');
    // And the quoted cell does not leak extra delimiter-separated fields.
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[1]!.split(";").length).toBeGreaterThan(
      SETS_CSV_COLUMNS.length,
    );
  });

  it("keeps the row when the exercise is not in the catalog", () => {
    const sets: TLSet[] = [
      {
        id: "s1",
        exerciseId: "unknown-exercise",
        dayId: "day-1",
        timestamp: "2026-09-30T10:00:00.000Z",
        weight: 10,
        reps: 5,
      },
    ];
    const csv = buildSetsCsv(sets, { unit: "kg", lookup });
    const lines = csv.slice(1).trimEnd().split("\r\n");
    const row = cells(lines[1]!, lines[0]!.split(";"));
    expect(row["exercise_id"]).toBe("unknown-exercise");
    expect(row["exercise_name_es"]).toBe("");
    expect(row["set_index"]).toBe("1");
  });

  it("formats numbers the way Excel es-ES expects", () => {
    expect(formatCsvNumber(62.5)).toBe("62,5");
    expect(formatCsvNumber(0)).toBe("0");
    expect(formatCsvNumber(137.7889)).toBe("137,79");
    expect(formatCsvNumber(null)).toBe("");
    expect(formatCsvNumber(undefined)).toBe("");
    expect(formatCsvNumber(Number.NaN)).toBe("");
  });

  it("escapes only when needed (RFC 4180)", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("a;b")).toBe('"a;b"');
    expect(csvEscape('a"b')).toBe('"a""b"');
    expect(csvEscape("a\nb")).toBe('"a\nb"');
  });
});
