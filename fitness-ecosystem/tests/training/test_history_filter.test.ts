import { describe, expect, it } from "vitest";
import { filterSessionHistory } from "../../traininglab/apps/desktop/src/lib/history-filter";
import type { SessionHistoryEntry } from "../../traininglab/apps/desktop/src/features/stats/derive";

function entry(
  id: string,
  date: string,
  title: string | null,
  exercises: { exerciseId: string; sets: number }[],
): SessionHistoryEntry {
  return {
    id,
    date,
    startedAt: `${date}T10:00:00.000Z`,
    title,
    location: null,
    source: null,
    workingSets: 0,
    warmupSets: 0,
    volumeKg: 0,
    markers: { W: 0, D: 0, F: 0 },
    exercises,
    durationMin: null,
  };
}

const entries = [
  entry("a", "2026-10-07", "Empuje pesado", [
    { exerciseId: "bench-press", sets: 4 },
  ]),
  entry("b", "2026-09-22", null, [{ exerciseId: "squat", sets: 5 }]),
  entry("c", "2026-08-01", "Día de tracción", [{ exerciseId: "row", sets: 3 }]),
];

/** The names the screen would pass in, without importing i18n into the test. */
const names: Record<string, string> = {
  "bench-press": "Press de Banca",
  squat: "Sentadilla con Barra",
  row: "Remo en Polea",
};

describe("filterSessionHistory", () => {
  it("returns every entry with no query and no date cut", () => {
    expect(
      filterSessionHistory(
        entries,
        { query: "", notBefore: null },
        (id) => names[id]!,
      ),
    ).toHaveLength(3);
  });

  it("matches exercise names case-insensitively", () => {
    const found = filterSessionHistory(
      entries,
      { query: "  SENTADILLA ", notBefore: null },
      (id) => names[id]!,
    );
    expect(found.map((row) => row.id)).toEqual(["b"]);
  });

  it("matches the session title as well as its exercises", () => {
    const found = filterSessionHistory(
      entries,
      { query: "empuje", notBefore: null },
      (id) => names[id]!,
    );
    expect(found.map((row) => row.id)).toEqual(["a"]);
  });

  it("keeps the cutoff day and drops older sessions", () => {
    const found = filterSessionHistory(
      entries,
      { query: "", notBefore: "2026-09-22" },
      (id) => names[id]!,
    );
    expect(found.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("returns nothing when no exercise or title matches", () => {
    expect(
      filterSessionHistory(
        entries,
        { query: "peso muerto", notBefore: null },
        (id) => names[id]!,
      ),
    ).toEqual([]);
  });
});
