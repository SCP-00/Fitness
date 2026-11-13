import { describe, expect, it } from "vitest";
import type { PlannedRow, WeekPlan } from "../../traininglab/apps/desktop/src/lib/plan";
import { alignWeekToToday } from "../../traininglab/apps/desktop/src/lib/week-today";
import type { MuscleFamily } from "@fitness/bodylab-training";

function row(patch: Partial<PlannedRow> = {}): PlannedRow {
  return {
    exerciseId: "squat",
    name: { en: "Squat", es: "Sentadilla" },
    pattern: "squat",
    families: ["quads"] as MuscleFamily[],
    progression: ["load"],
    loadType: "barbell",
    unilateral: false,
    sets: 4,
    repsMin: 5,
    repsMax: 8,
    rir: 2,
    restSec: 120,
    minutes: 12,
    reasons: [{ code: "weakness" }],
    jointStress: 2,
    spineLoad: 2,
    ...patch,
  };
}

function week(patch: Partial<WeekPlan["rows"][number]> = {}): WeekPlan {
  const rest = (label: string): WeekPlan["rows"][number] => ({
    label,
    isRest: true,
    isToday: false,
    assigned: [],
    sets: 0,
    minutes: 0,
    preview: [],
    ...patch,
  });
  return {
    week: {
      days: [],
      totalSets: 0,
      totalMinutes: 0,
      uncovered: [],
    } as unknown as WeekPlan["week"],
    rows: [
      rest("Lun"),
      rest("Mar"),
      rest("Mié"),
      { ...rest("Jue"), isToday: true },
      rest("Vie"),
      rest("Sáb"),
      rest("Dom"),
    ],
    totalSets: 0,
    totalMinutes: 0,
    uncovered: [],
  };
}

describe("alignWeekToToday", () => {
  /**
   * The session surfaces that read the store's `rows` directly (Hoy,
   * Entrenamiento, ZEN, Coach and Rutinas) all share this snapshot. Semana is
   * the only projection, so the invariant is: its today row must reproduce
   * these exercises in this order, plus the same sets and minutes — or be rest
   * when the list is empty.
   */
  const session = (rows: PlannedRow[]) => ({
    rest: rows.length === 0,
    exercises: rows.map((row) => row.name.es),
    sets: rows.reduce((total, row) => total + row.sets, 0),
    minutes: rows.reduce((total, row) => total + row.minutes, 0),
  });

  it("marks today as training when Hoy has rows, even if the week generator rested it", () => {
    const result = alignWeekToToday(week(), [row()], "es");
    const today = result.rows[3]!;

    expect(today.isRest).toBe(false);
    expect(today.sets).toBe(4);
    expect(today.minutes).toBe(12);
    expect(today.preview).toEqual(["Sentadilla"]);
    expect(result.totalSets).toBe(4);
    expect(result.totalMinutes).toBe(12);
  });

  it("projects the complete session, in order, with the same totals as every row surface", () => {
    const rows = [
      row({
        exerciseId: "a",
        name: { en: "A", es: "A" },
        sets: 3,
        minutes: 8,
      }),
      row({
        exerciseId: "b",
        name: { en: "B", es: "B" },
        sets: 4,
        minutes: 12,
      }),
      row({
        exerciseId: "c",
        name: { en: "C", es: "C" },
        sets: 2,
        minutes: 5,
      }),
    ];
    const expected = session(rows);
    const result = alignWeekToToday(week(), rows, "es");
    const today = result.rows[3]!;

    // Every surface that owns the rows (Hoy, Entrenamiento, ZEN, Coach,
    // Rutinas) sees `expected`; Semana must not be a shorter or reordered view.
    expect(today.preview).toEqual(expected.exercises);
    expect(today.preview).toHaveLength(3);
    expect(today.sets).toBe(expected.sets);
    expect(today.minutes).toBe(expected.minutes);
    expect(result.totalSets).toBe(expected.sets);
    expect(result.totalMinutes).toBe(expected.minutes);
  });

  it("keeps today's row as rest when Hoy has no rows", () => {
    const result = alignWeekToToday(week(), [], "es");

    expect(result.rows[3]!.isRest).toBe(true);
    expect(result.rows[3]!.sets).toBe(0);
    expect(result.rows[3]!.preview).toEqual([]);
    expect(result.totalSets).toBe(0);
  });
});
