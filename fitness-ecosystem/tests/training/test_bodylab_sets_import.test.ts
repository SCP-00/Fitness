import { describe, expect, it } from "vitest";
import { planBodyLabSets } from "../../traininglab/apps/desktop/src/lib/bodylab-sets";
import type { BodyLabArchive } from "../../traininglab/apps/desktop/src/lib/bodylab-migration";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

function archive(exerciseSets: Record<string, unknown>[]): BodyLabArchive {
  return {
    format: "bodylab-traininglab-migration",
    version: 1,
    exportedAt: "2026-11-20T12:00:00Z",
    data: {
      profiles: [], measurements: [], snapshots: [], exerciseSets,
      maxEfforts: [], metadata: [], localPreferences: [],
    },
  };
}
const row = { id: "a", exerciseId: "barbell-bench-press", timestamp: "2026-11-01T12:00:00Z", weight: 50, reps: 8, rpe: 7, notes: "smooth" };

describe("BodyLab set migration", () => {
  it("preserves data and provenance and is idempotent after import", () => {
    const first = planBodyLabSets(archive([row]), []);
    expect(first.sets).toHaveLength(1);
    expect(first.sets[0]).toMatchObject({ id: "bodylab:a", weight: 50, reps: 8, rpe: 7 });
    expect(first.sets[0].notes).toContain("smooth");
    expect(first.sessions[0]).toMatchObject({ source: "bodylab", setIds: ["bodylab:a"] });
    const repeat = planBodyLabSets(archive([row]), first.sets, first.sessions);
    expect(repeat.sets).toHaveLength(0);
    expect(repeat.duplicates).toBe(1);
  });

  it("flags plausible existing duplicates and rejects unsupported entries", () => {
    const existing: TLSet = { id: "existing", exerciseId: row.exerciseId, timestamp: row.timestamp, dayId: "day", weight: 50, reps: 8 };
    const result = planBodyLabSets(archive([
      row,
      { ...row, id: "b", exerciseId: "unknown" },
      { ...row, id: "c", sets: 3 },
      { ...row, id: "d", timestamp: "bad" },
    ]), [existing]);
    expect(result).toMatchObject({ duplicates: 0, ambiguous: 1, invalid: 3 });
    expect(result.sets).toHaveLength(0);
  });

  it("keeps distinct BodyLab sets even when their values and timestamps match", () => {
    const result = planBodyLabSets(archive([row, { ...row, id: "b" }]), []);
    expect(result.sets.map((set) => set.id)).toEqual(["bodylab:a", "bodylab:b"]);
  });
});
