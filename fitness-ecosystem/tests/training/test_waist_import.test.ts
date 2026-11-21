import { describe, expect, it } from "vitest";
import {
  archivedWaistCandidates,
  comparableWaistHistory,
} from "../../traininglab/apps/desktop/src/lib/waist";

describe("archived waist measurements", () => {
  it("preserves original ids, units and dates, and converts inches without rounding", () => {
    const candidates = archivedWaistCandidates([
      {
        id: "inch",
        type: "waist",
        method: "manual",
        unit: "in",
        value: 32.25,
        timestamp: "2026-11-12T12:00:00",
      },
      {
        id: "cm",
        type: "waist",
        method: "manual",
        unit: "cm",
        value: 82,
        timestamp: "2026-11-13T12:00:00",
      },
    ]);
    expect(candidates).toEqual([
      {
        id: "inch",
        day: "2026-11-12",
        cm: 81.915,
        originalValue: 32.25,
        originalUnit: "in",
      },
      {
        id: "cm",
        day: "2026-11-13",
        cm: 82,
        originalValue: 82,
        originalUnit: "cm",
      },
    ]);
  });

  it("excludes unknown methods, values, units and invalid dates", () => {
    const common = {
      id: "x",
      type: "waist",
      method: "manual",
      unit: "cm",
      value: 80,
      timestamp: "2026-11-12",
    };
    expect(
      archivedWaistCandidates([
        { ...common, method: "photo" },
        { ...common, unit: "kg" },
        { ...common, value: 0 },
        { ...common, timestamp: "not-a-date" },
      ]),
    ).toEqual([]);
  });

  it("compares only the landmark selected by the user", () => {
    const rows = [
      { id: "a", cm: 84, day: "2026-11-12", landmark: "navel" as const },
      { id: "b", cm: 82, day: "2026-11-13", landmark: "narrowest" as const },
    ];
    expect(
      comparableWaistHistory(rows, "navel", "2026-11-01", "2026-11-20"),
    ).toEqual([rows[0]]);
  });
});
