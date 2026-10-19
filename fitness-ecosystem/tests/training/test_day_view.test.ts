/**
 * Entrenamiento (mockup 02) — the day plan as a view.
 *
 * The screen itself is thin by design: it renders `rows` and calls the store's
 * verbs. What it *decides* is how the same list projects — by equipment, by
 * muscle — plus the totals of the sticky bar and the one derived sentence in the
 * page, *«si el X está ocupado, empieza por Y»*.
 *
 * So that is what is pinned here, and with **real catalog ids**: `getTraits` is
 * the planner's own source, and a fixture with invented exercises would test the
 * fixture instead of the app. The rules that matter:
 *
 *   1. a row is filed under the **first requirement its owner can meet**, the
 *      same order the planner checks — so the grouping can never claim a row
 *      needs gear the planner ignored;
 *   2. **bodyweight closes the list** even when it is the largest bucket: it is
 *      the fallback for a taken machine, not the first thing to pick up;
 *   3. the hint is **derived**, and only appears when a piece of gear is actually
 *      repeated (a single dumbbell exercise is not "busy").
 */

import { describe, expect, it } from "vitest";
import type { OwnedEquipment } from "@fitness/bodylab-exercises";
import {
  budgetFill,
  dayTotals,
  groupByFamily,
  groupByGear,
  primaryGear,
  startElsewhere,
} from "../../traininglab/apps/desktop/src/lib/day-view";
import type { PlannedRow } from "../../traininglab/apps/desktop/src/lib/plan";

const INVENTORY: OwnedEquipment[] = [
  {
    id: "e1",
    presetId: "barbell",
    label: "Barra + discos",
    capabilities: ["barbell"],
    maxLoadKg: 100,
    incrementKg: 2.5,
    setupMin: 2,
  },
  {
    id: "e2",
    presetId: "dumbbells",
    label: "Mancuernas del garaje",
    capabilities: ["dumbbell"],
    maxLoadKg: 32,
    incrementKg: 2,
    setupMin: 1,
  },
  {
    id: "e3",
    presetId: "bench",
    label: "Banco",
    capabilities: ["bench"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 0,
  },
  {
    id: "e4",
    presetId: "machines",
    label: "Máquinas",
    capabilities: ["machines"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 1,
  },
];

function row(
  exerciseId: string,
  families: PlannedRow["families"],
  sets = 3,
  minutes = 9,
): PlannedRow {
  return {
    exerciseId,
    name: { en: exerciseId, es: exerciseId },
    pattern: "horizontal_push",
    families,
    progression: ["load"],
    loadType: "barbell",
    unilateral: false,
    sets,
    repsMin: 8,
    repsMax: 12,
    rir: 2,
    restSec: 90,
    minutes,
    reasons: [],
    jointStress: 1,
    spineLoad: 1,
  };
}

const PLAN = [
  row("barbell-bench-press", ["chest", "triceps"]),
  row("leg-press", ["quadriceps", "glutes"]),
  row("machine-bench-press", ["chest"]),
  row("push-ups", ["chest", "core"]),
  row("dumbbell-bench-press", ["chest", "shoulders"]),
];

describe("the day plan's projections", () => {
  it("files a row under the first requirement the owner can meet", () => {
    // Barbell + bench: both owned, the barbell answers first — that is the
    // order `traits.requires` gives and the order the planner checks.
    expect(primaryGear(PLAN[0]!, INVENTORY)).toEqual({
      capability: "barbell",
      label: "Barra + discos",
    });
    // Dumbbells + bench → the dumbbells.
    expect(primaryGear(PLAN[4]!, INVENTORY)?.capability).toBe("dumbbell");
    // Nothing required → no gear at all, which is why bodyweight is a bucket.
    expect(primaryGear(PLAN[3]!, INVENTORY)).toBeNull();
  });

  it("leaves the row unfiled when the owner cannot meet any requirement", () => {
    // `barbell-squat` needs the rack, which this inventory lacks; the row still
    // needs the barbell, so it groups there rather than disappearing.
    const squat = row("barbell-squat", ["quadriceps"]);
    expect(primaryGear(squat, INVENTORY)?.capability).toBe("barbell");
    const empty: OwnedEquipment[] = [];
    expect(primaryGear(squat, empty)).toBeNull();
  });

  it("orders the equipment buckets by size and closes with bodyweight", () => {
    const groups = groupByGear(PLAN, INVENTORY);
    // Machines hold two rows and come first; bodyweight last even though it is
    // in the middle of today's session order.
    expect(groups.map((group) => group.capability)).toEqual([
      "machines",
      "barbell",
      "dumbbell",
      null,
    ]);
    expect(groups[0]!.rows.map((r) => r.exerciseId)).toEqual([
      "leg-press",
      "machine-bench-press",
    ]);
    expect(groups.at(-1)!.rows[0]!.exerciseId).toBe("push-ups");
  });

  it("sends you elsewhere when a machine is repeated", () => {
    const hint = startElsewhere(PLAN, INVENTORY);
    expect(hint?.gear).toBe("Máquinas");
    // The alternative is a row that does NOT need the machines.
    expect(["leg-press", "machine-bench-press"]).not.toContain(
      hint?.row.exerciseId,
    );
  });

  it("stays quiet when no gear is used twice", () => {
    const single = [
      row("leg-press", ["quadriceps"]),
      row("push-ups", ["chest"]),
    ];
    expect(startElsewhere(single, INVENTORY)).toBeNull();
  });

  it("groups by the primary family, in first-seen order", () => {
    const groups = groupByFamily(PLAN);
    expect(groups.map((group) => group.family)).toEqual([
      "chest",
      "quadriceps",
    ]);
    expect(groups[0]!.rows).toHaveLength(4);
  });

  it("totals the day exactly as the bar prints it", () => {
    const plan = [row("a", ["chest"], 4, 12), row("b", ["chest"], 2, 6)];
    expect(dayTotals(plan)).toEqual({ exercises: 2, sets: 6, minutes: 18 });
  });

  it("clamps the budget bar and survives a zero budget", () => {
    expect(budgetFill(30, 60)).toBe(50);
    expect(budgetFill(90, 60)).toBe(100);
    expect(budgetFill(30, 0)).toBe(0);
  });
});
