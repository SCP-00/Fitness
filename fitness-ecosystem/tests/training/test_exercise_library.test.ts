/**
 * Exercise library (TrainingLab's Ejercicios screen) — the pure half.
 *
 * These tests pin the projection, the search and the filters, because the screen
 * renders whatever these return and nothing more. The interesting cases are the
 * ones a user will actually type: an accented query, a plural, an English word
 * while the UI is in Spanish, and a filter that must not silently leak rows from
 * another family.
 */

import { describe, expect, it } from "vitest";
import { ALL_EXERCISES } from "@fitness/bodylab-exercises";
import {
  allFamilies,
  buildRows,
  findRow,
  queryLibrary,
  type LibraryFilters,
} from "../../traininglab/apps/desktop/src/features/exercises/library";
import { setLanguage } from "../../traininglab/apps/desktop/src/lib/i18n";

setLanguage("es");
const rows = buildRows();

const only = (family: LibraryFilters["family"]): LibraryFilters => ({
  query: "",
  family,
  category: null,
});

describe("exercise library projection", () => {
  it("projects the whole catalog, once", () => {
    expect(rows).toHaveLength(ALL_EXERCISES.length);
    expect(new Set(rows.map((r) => r.id)).size).toBe(ALL_EXERCISES.length);
    expect(rows.length).toBeGreaterThan(100);
  });

  it("resolves a Spanish name, a family label and equipment for every row", () => {
    for (const row of rows) {
      expect(row.name.length).toBeGreaterThan(1);
      expect(row.nameEn.length).toBeGreaterThan(1);
      expect(row.familyLabel.length).toBeGreaterThan(1);
      expect(row.equipment.length).toBeGreaterThan(1);
      // A raw id leaking to the UI would mean a missing label: the fallback is
      // deliberate but it should never be *needed* for the shipped catalog.
      expect(row.familyLabel).not.toMatch(/_/);
      expect(row.equipment).not.toMatch(/_/);
    }
  });

  it("files each exercise under a family that its muscles actually belong to", () => {
    const families = allFamilies();
    for (const row of rows) {
      expect(families).toContain(row.family);
      expect(row.families).toContain(row.family);
    }
    // Every family has at least one exercise, or the chip row would offer a
    // filter that can only ever return nothing.
    for (const family of families) {
      expect(queryLibrary(rows, only(family)).matching).toBeGreaterThan(0);
    }
  });

  it("gives every row a primary muscle to show, or a family to fall back on", () => {
    for (const row of rows) {
      expect(row.primaryMuscles.length > 0 || row.familyLabel.length > 0).toBe(
        true,
      );
      for (const muscle of row.primaryMuscles) expect(muscle).not.toMatch(/_/);
    }
  });
});

describe("exercise library search", () => {
  it("finds an exercise by its Spanish name", () => {
    const result = queryLibrary(rows, {
      query: "press con barra",
      family: null,
      category: null,
    });
    expect(result.matching).toBeGreaterThan(0);
    expect(result.rows.map((r) => r.id)).toContain("barbell-bench-press");
  });

  it("is accent-insensitive in both directions", () => {
    const withAccent = queryLibrary(rows, {
      query: "glúteo",
      family: null,
      category: null,
    }).matching;
    const withoutAccent = queryLibrary(rows, {
      query: "gluteo",
      family: null,
      category: null,
    }).matching;
    expect(withoutAccent).toBe(withAccent);
    expect(withoutAccent).toBeGreaterThan(0);
  });

  it("matches the English name and the equipment while the UI is Spanish", () => {
    const byEnglish = queryLibrary(rows, {
      query: "bench press",
      family: null,
      category: null,
    });
    expect(byEnglish.rows.map((r) => r.id)).toContain("barbell-bench-press");

    const byEquipment = queryLibrary(rows, {
      query: "mancuerna",
      family: null,
      category: null,
    });
    expect(byEquipment.matching).toBeGreaterThan(1);
  });

  it("requires every word of a multi-word query", () => {
    const both = queryLibrary(rows, {
      query: "press mancuerna",
      family: null,
      category: null,
    });
    const names = both.rows.map((r) =>
      `${r.name} ${r.equipment}`.toLowerCase(),
    );
    for (const text of names) {
      expect(text).toContain("press");
      expect(text).toContain("mancuerna");
    }
  });

  it("reports an empty result instead of throwing", () => {
    const result = queryLibrary(rows, {
      query: "zzzz-no-existe",
      family: null,
      category: null,
    });
    expect(result.rows).toHaveLength(0);
    expect(result.matching).toBe(0);
    expect(result.searching).toBe(true);
    expect(result.total).toBe(rows.length);
  });
});

describe("exercise library filters and sorting", () => {
  it("never leaks a row from another family", () => {
    for (const family of allFamilies()) {
      const { rows: filtered } = queryLibrary(rows, only(family));
      for (const row of filtered) expect(row.families).toContain(family);
    }
  });

  it("combines a family, a category and a query as AND", () => {
    const filtered = queryLibrary(rows, {
      query: "press",
      family: "chest",
      category: "compound",
    });
    for (const row of filtered.rows) {
      expect(row.families).toContain("chest");
      expect(row.category).toBe("compound");
    }
    expect(filtered.matching).toBeLessThan(
      queryLibrary(rows, only("chest")).matching,
    );
  });

  it("sorts A–Z by default and by level on request", () => {
    const az = queryLibrary(rows, only(null)).rows.map((r) => r.name);
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b)));

    const byLevel = queryLibrary(rows, only(null), "level").rows.map(
      (r) => r.difficulty,
    );
    expect(byLevel).toEqual([...byLevel].sort((a, b) => a - b));
  });

  it("counts a cardio slot as cardio", () => {
    const cardio = queryLibrary(rows, {
      query: "",
      family: null,
      category: "cardio",
    });
    expect(cardio.matching).toBeGreaterThan(0);
    for (const row of cardio.rows) {
      expect(row.isCardio).toBe(true);
      expect(row.id).not.toBe("barbell-bench-press");
    }
  });

  it("resolves a known id and returns null for an unknown one", () => {
    expect(findRow(rows, "barbell-bench-press")?.name).toBeTruthy();
    expect(findRow(rows, "not-an-exercise")).toBeNull();
  });

  it("re-derives the labels when the language changes", () => {
    setLanguage("en");
    const english = buildRows();
    expect(findRow(english, "barbell-bench-press")?.name).toBe(
      "Barbell Bench Press",
    );
    expect(findRow(english, "barbell-bench-press")?.familyLabel).toBe("chest");
    setLanguage("es");
    expect(findRow(buildRows(), "barbell-bench-press")?.name).toBe(
      "Press con Barra",
    );
  });
});
