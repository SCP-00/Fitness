/**
 * "Enfoque de hoy" — the day the user asks for on purpose.
 *
 * Why this file exists: a 10-week abdominal plan needs days that say *hoy toca
 * abdomen*, and the automatic planner balances the whole body instead. The
 * focus reaches `focusFamilies` in `buildSession`, which was already
 * implemented and tested — what is new is the wiring in `lib/plan.ts` and the
 * promise that goes with it:
 *
 *   1. **the focus filters**: every row of a focused day has its primary
 *      family inside the requested list;
 *   2. **no coverage noise**: a focused day never reports "no push exercise is
 *      possible with your equipment", because nothing was asked of push today;
 *   3. **the automatic day is untouched**: with no focus the plan still spreads
 *      across families, exactly as before the control existed;
 *   4. **determinism holds**: the same input still yields the same session.
 *
 * Bodyweight-only inventory on purpose: it is the owner's situation (no gear
 * declared, shoulders too sore for pressing), and it is the constraint that
 * makes the focus interesting — with no gear, the plan must reach the core
 * movements that the catalog does have.
 *
 * @module tests/training/day_focus
 */

import { describe, expect, it } from "vitest";
import { emptyModel, type MuscleFamily } from "@fitness/bodylab-training";
import {
  buildTodayPlan,
  familyLogStats,
} from "../../traininglab/apps/desktop/src/lib/plan";

const BASE = {
  inventory: [],
  readiness: { energy: 3, motivation: 3, soreness: 3 },
  timeBudgetMin: 40,
  level: "intermediate" as const,
  goal: "hypertrophy" as const,
  logStats: familyLogStats([]),
  model: emptyModel(),
  payload: null,
};

const primaries = (focus?: MuscleFamily[]) =>
  buildTodayPlan({ ...BASE, focusFamilies: focus }).rows.map(
    (row) => row.families[0],
  );

describe("Enfoque de hoy", () => {
  it("builds a non-empty core day with only core work", () => {
    const focused = buildTodayPlan({ ...BASE, focusFamilies: ["core"] });
    expect(focused.rows.length).toBeGreaterThan(0);
    for (const row of focused.rows) {
      expect(row.families[0]).toBe("core");
    }
  });

  it("drops the coverage advisories that a focus makes meaningless", () => {
    const focused = buildTodayPlan({ ...BASE, focusFamilies: ["core"] });
    const noise = focused.advisories.filter(
      (a) => a.code === "group_no_equipment" || a.code === "group_no_time",
    );
    expect(noise).toEqual([]);
  });

  it("leaves the automatic day spreading across families", () => {
    const auto = primaries();
    expect(auto.length).toBeGreaterThan(0);
    expect(new Set(auto).size).toBeGreaterThan(1);
  });

  it("filters a multi-family focus by its own list", () => {
    const push = buildTodayPlan({
      ...BASE,
      focusFamilies: ["chest", "shoulders", "triceps"],
    });
    expect(push.rows.length).toBeGreaterThan(0);
    for (const row of push.rows) {
      expect(["chest", "shoulders", "triceps"]).toContain(row.families[0]);
    }
  });

  it("is deterministic with and without focus", () => {
    expect(primaries(["core"])).toEqual(primaries(["core"]));
    expect(primaries()).toEqual(primaries());
    // And the focus genuinely narrows: the automatic day is not already core.
    expect(new Set(primaries()).size).toBeGreaterThan(
      new Set(primaries(["core"])).size,
    );
  });
});
