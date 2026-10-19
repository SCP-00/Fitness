/**
 * Routine templates — the pure half of Rutinas (2026-10-18).
 *
 * The screen is a shelf and an editor; everything with a rule to get wrong is
 * here, away from React:
 *
 *   1. **a template can never name an exercise the app cannot perform** — an
 *      unknown id is dropped on load, not rendered as a ghost row;
 *   2. **the prescription is clamped** — a hand-edited backup cannot write a
 *      99-rep, 0-second-rest row into a session;
 *   3. **a snapshot is a copy of the rows on screen**, not a re-plan, so
 *      "guardar el entrenamiento de hoy" saves what the user is looking at;
 *   4. **settings carry them**, which is what makes them survive a reload, a
 *      backup and the automatic autobackup without a new object store.
 */

import { describe, expect, it } from "vitest";
import {
  ROUTINE_LIMITS,
  duplicateRoutine,
  makeRoutine,
  normalizeRoutine,
  normalizeRoutines,
  removeRoutine,
  routineFromRows,
  routineItemFor,
  routineTotals,
  upsertRoutine,
  type Routine,
} from "../../traininglab/apps/desktop/src/lib/routines";
import { normalizeSettings } from "../../traininglab/apps/desktop/src/lib/db";
import { DEFAULT_SETTINGS } from "../../traininglab/apps/desktop/src/lib/types";

const STAMP = new Date("2026-10-18T10:00:00.000Z");

function routine(over: Partial<Routine> = {}): Routine {
  return {
    id: "routine-1",
    name: "Pierna",
    createdAt: STAMP.toISOString(),
    updatedAt: STAMP.toISOString(),
    items: [routineItemFor("barbell-squat")!],
    ...over,
  };
}

describe("routineItemFor", () => {
  it("uses the exercise's own setup and a real rest, not a made-up 0", () => {
    const item = routineItemFor("barbell-squat")!;
    expect(item.sets).toBe(3);
    expect(item.repsMin).toBe(8);
    expect(item.repsMax).toBe(12);
    expect(item.restSec).toBeGreaterThanOrEqual(90);
    expect(item.rir).toBe(2);
  });

  it("refuses an exercise the catalogue does not know", () => {
    expect(routineItemFor("not-an-exercise")).toBeNull();
  });

  it("clamps a prescription to the planner's bounds", () => {
    const item = routineItemFor("push-ups", {
      sets: 99,
      repsMin: 0,
      repsMax: 999,
      restSec: 0,
      rir: 12,
    })!;
    expect(item.sets).toBe(ROUTINE_LIMITS.sets[1]);
    expect(item.repsMin).toBe(ROUTINE_LIMITS.reps[0]);
    expect(item.repsMax).toBe(ROUTINE_LIMITS.reps[1]);
    expect(item.restSec).toBe(ROUTINE_LIMITS.restSec[0]);
    expect(item.rir).toBe(ROUTINE_LIMITS.rir[1]);
  });

  it("never lets repsMax fall below repsMin", () => {
    const item = routineItemFor("push-ups", { repsMin: 15, repsMax: 8 })!;
    expect(item.repsMin).toBe(15);
    expect(item.repsMax).toBe(15);
  });
});

describe("normalizeRoutine", () => {
  it("drops a routine without a name or without known exercises", () => {
    expect(normalizeRoutine({ name: "  ", items: [] })).toBeNull();
    expect(
      normalizeRoutine({ name: "Fantasma", items: [{ exerciseId: "ghost" }] }),
    ).toBeNull();
    expect(normalizeRoutine(null)).toBeNull();
  });

  it("keeps one row per exercise, in the order the user saved", () => {
    const stored = normalizeRoutine({
      id: "r1",
      name: "  Empuje  ",
      items: [
        { exerciseId: "barbell-bench-press", sets: 4 },
        { exerciseId: "barbell-bench-press", sets: 9 },
        { exerciseId: "push-ups", sets: 2 },
      ],
    })!;
    expect(stored.name).toBe("Empuje");
    expect(stored.items.map((item) => item.exerciseId)).toEqual([
      "barbell-bench-press",
      "push-ups",
    ]);
    expect(stored.items[0]!.sets).toBe(4);
  });

  it("trims a long name instead of refusing the routine", () => {
    const stored = normalizeRoutine({
      name: "x".repeat(200),
      items: [{ exerciseId: "push-ups" }],
    })!;
    expect(stored.name.length).toBe(ROUTINE_LIMITS.name);
  });

  it("keeps notes when written and omits the key when empty", () => {
    expect(routine({ notes: "Con banda" }).notes).toBe("Con banda");
    const stored = normalizeRoutine({
      name: "Core",
      notes: "   ",
      items: [{ exerciseId: "plank" }],
    })!;
    expect("notes" in stored).toBe(false);
  });
});

describe("normalizeRoutines", () => {
  it("orders newest edit first and keeps one record per id", () => {
    const older = routine({
      id: "same",
      name: "Vieja",
      updatedAt: "2026-10-01T00:00:00.000Z",
    });
    const newer = routine({
      id: "same",
      name: "Nueva",
      updatedAt: "2026-10-20T00:00:00.000Z",
    });
    const other = routine({ id: "other", name: "Otra" });
    const list = normalizeRoutines([older, other, newer]);
    expect(list.map((entry) => entry.name)).toEqual(["Nueva", "Otra"]);
  });

  it("returns an empty list for anything that is not an array", () => {
    expect(normalizeRoutines(undefined)).toEqual([]);
    expect(normalizeRoutines({ routines: [] })).toEqual([]);
  });
});

describe("routineTotals", () => {
  it("counts exercises and sets, estimates minutes and names the families", () => {
    const totals = routineTotals(
      routine({
        items: [
          routineItemFor("barbell-squat", { sets: 4 })!,
          routineItemFor("plank", { sets: 3 })!,
        ],
      }),
    );
    expect(totals.exercises).toBe(2);
    expect(totals.sets).toBe(7);
    expect(totals.minutes).toBeGreaterThan(0);
    expect(totals.families.length).toBeGreaterThanOrEqual(2);
  });
});

describe("routineFromRows", () => {
  it("copies the rows on screen, prescription included", () => {
    const copy = routineFromRows(
      "Hoy",
      [
        {
          exerciseId: "barbell-bench-press",
          sets: 5,
          repsMin: 5,
          repsMax: 5,
          restSec: 180,
          rir: 1,
        },
        { exerciseId: "ghost", sets: 3, repsMin: 8, repsMax: 12, restSec: 60 },
      ],
      STAMP,
    )!;
    expect(copy.items).toHaveLength(1);
    expect(copy.items[0]).toMatchObject({
      exerciseId: "barbell-bench-press",
      sets: 5,
      repsMin: 5,
      repsMax: 5,
      restSec: 180,
      rir: 1,
    });
  });

  it("returns null when there is nothing usable to save", () => {
    expect(routineFromRows("Vacía", [], STAMP)).toBeNull();
  });
});

describe("the list verbs", () => {
  it("upserts by id and keeps the newest first", () => {
    const a = routine({ id: "a", updatedAt: "2026-10-01T00:00:00.000Z" });
    const b = routine({ id: "b", updatedAt: "2026-10-02T00:00:00.000Z" });
    const edited = { ...a, name: "Editada", updatedAt: "2026-10-19T00:00:00.000Z" };
    expect(upsertRoutine([a, b], edited).map((entry) => entry.id)).toEqual([
      "a",
      "b",
    ]);
    expect(upsertRoutine([a, b], edited).length).toBe(2);
  });

  it("removes one and ignores an unknown id", () => {
    const a = routine({ id: "a" });
    expect(removeRoutine([a], "a")).toEqual([]);
    expect(removeRoutine([a], "nope")).toEqual([a]);
  });

  it("duplicates with a new id and the same prescription", () => {
    const original = routine();
    const copy = duplicateRoutine(original, "Pierna · copia", STAMP)!;
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Pierna · copia");
    expect(copy.items).toEqual(original.items);
  });
});

describe("makeRoutine", () => {
  it("stamps created and updated with the same instant", () => {
    const made = makeRoutine("Core", [routineItemFor("plank")!], STAMP)!;
    expect(made.createdAt).toBe(made.updatedAt);
    expect(made.id.startsWith("routine-")).toBe(true);
  });

  it("refuses a draft with no exercises", () => {
    expect(makeRoutine("Vacía", [], STAMP)).toBeNull();
  });
});

describe("persistence through settings", () => {
  it("normalizeSettings carries the templates and repairs a bad backup", () => {
    const settings = normalizeSettings({
      ...DEFAULT_SETTINGS,
      routines: [
        routine(),
        { name: "", items: [] },
        { name: "Fantasma", items: [{ exerciseId: "ghost" }] },
      ],
    });
    expect(settings.routines?.map((entry) => entry.name)).toEqual(["Pierna"]);
  });

  it("an old settings document without routines normalizes to an empty list", () => {
    expect(normalizeSettings({}).routines).toEqual([]);
  });
});
