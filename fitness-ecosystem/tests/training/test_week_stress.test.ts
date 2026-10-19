/**
 * Semana editable + estrés estimado — owner request 2026-10-08.
 *
 * Two contracts are pinned here:
 *
 *   1. `applyWeekOverrides` lays his authored days *over* the generated week
 *      and never rewrites the days he did not author (the owner's rule: user
 *      content is untouched without his own action); totals and `uncovered`
 *      stay consistent with the merged rows.
 *   2. `computeWeekStress` is pure and bounded: same rows in → same 0–10
 *      numbers out, density raises a sandwiched day, a week without rest and
 *      a family above the 12–20 evidence band both earn their warnings.
 */
import { describe, expect, it } from "vitest";
import {
  applyWeekOverrides,
  bandFor,
  computeWeekStress,
  SETS_PER_FAMILY_DAY,
} from "../../traininglab/apps/desktop/src/lib/week-stress";
import type { WeekPlan } from "../../traininglab/apps/desktop/src/lib/plan";
import type { WeekDayOverride } from "../../traininglab/apps/desktop/src/lib/types";

type Row = WeekPlan["rows"][number];

function row(partial: Partial<Row> & { label: string }): Row {
  return {
    isRest: false,
    isToday: false,
    assigned: [],
    sets: 0,
    minutes: 0,
    preview: [],
    ...partial,
  };
}

function plan(
  rows: Row[],
  uncovered: WeekPlan["uncovered"] = [],
): WeekPlan {
  return {
    week: {} as WeekPlan["week"],
    rows,
    totalSets: rows.reduce((a, r) => a + r.sets, 0),
    totalMinutes: rows.reduce((a, r) => a + r.minutes, 0),
    uncovered,
  };
}

/** Seven rows: Mon–Thu training, Fri–Sun rest (the planner's usual shape). */
function autoWeek(): WeekPlan {
  return plan([
    row({ label: "Lun", assigned: ["chest", "triceps"], sets: 16, minutes: 60 }),
    row({ label: "Mar", assigned: ["lats"], sets: 14, minutes: 60 }),
    row({ label: "Mié", assigned: ["quadriceps"], sets: 12, minutes: 60 }),
    row({
      label: "Jue",
      assigned: ["glutes", "hamstrings"],
      sets: 15,
      minutes: 60,
    }),
    row({ label: "Vie", isRest: true }),
    row({ label: "Sáb", isRest: true }),
    row({ label: "Dom", isRest: true }),
  ]);
}

const BUDGET = 75;

describe("applyWeekOverrides: his days over the generated week", () => {
  it("returns the same plan when he has authored nothing", () => {
    const base = autoWeek();
    expect(applyWeekOverrides(base, {}, BUDGET)).toBe(base);
    expect(applyWeekOverrides(base, undefined, BUDGET)).toBe(base);
  });

  it("never touches a day he did not author", () => {
    const base = autoWeek();
    const overrides: Record<number, WeekDayOverride> = { 4: { kind: "rest" } };
    const merged = applyWeekOverrides(base, overrides, BUDGET);
    for (const i of [0, 1, 2, 3, 5, 6]) {
      expect(merged.rows[i]).toEqual({ ...base.rows[i]!, isCustom: false });
    }
    expect(base.rows[4]!.isRest).toBe(true); // the source stays as generated
  });

  it("closes a day with a rest override and recomputes the totals", () => {
    const merged = applyWeekOverrides(autoWeek(), { 0: { kind: "rest" } }, BUDGET);
    const mon = merged.rows[0]!;
    expect(mon.isRest).toBe(true);
    expect(mon.isCustom).toBe(true);
    expect(mon.assigned).toEqual([]);
    expect(mon.sets).toBe(0);
    expect(merged.totalSets).toBe(14 + 12 + 15);
  });

  it("keeps his families with the declared sets estimate and the budget minutes", () => {
    const merged = applyWeekOverrides(
      autoWeek(),
      { 4: { kind: "train", families: ["glutes", "calves"] } },
      BUDGET,
    );
    const fri = merged.rows[4]!;
    expect(fri.isRest).toBe(false);
    expect(fri.isCustom).toBe(true);
    expect(fri.assigned).toEqual(["glutes", "calves"]);
    expect(fri.sets).toBe(2 * SETS_PER_FAMILY_DAY);
    expect(fri.minutes).toBe(BUDGET);
    expect(fri.preview).toEqual([]); // no invented exercise names
  });

  it("keeps a half-finished day as a draft instead of deleting his content", () => {
    const merged = applyWeekOverrides(
      autoWeek(),
      { 5: { kind: "train", families: [] } },
      BUDGET,
    );
    const sat = merged.rows[5]!;
    expect(sat.isCustom).toBe(true);
    expect(sat.isRest).toBe(false);
    expect(sat.sets).toBe(0);
    expect(sat.assigned).toEqual([]);
  });

  it("drops an auto uncovered family his design now trains", () => {
    const base = autoWeek();
    base.uncovered = [{ family: "calves", reason: "no_day" }];
    const merged = applyWeekOverrides(
      base,
      { 6: { kind: "train", families: ["calves"] } },
      BUDGET,
    );
    expect(merged.uncovered).toEqual([]);
  });
});

describe("computeWeekStress: a bounded, deterministic estimate", () => {
  it("scores an all-rest week as nothing to stress about", () => {
    const restWeek = plan(
      Array.from({ length: 7 }, (_, i) => row({ label: `D${i}`, isRest: true })),
    );
    const stress = computeWeekStress(restWeek.rows);
    expect(stress.trainingDays).toBe(0);
    expect(stress.weekScore).toBe(0);
    expect(stress.band).toBe("low");
    expect(stress.warnings.map((w) => w.code)).not.toContain("no_rest_week");
    expect(stress.warnings.map((w) => w.code)).not.toContain("family_zero");
  });

  it("is deterministic and keeps every score inside 0–10", () => {
    const rows = autoWeek().rows;
    const a = computeWeekStress(rows);
    const b = computeWeekStress(rows);
    expect(a).toEqual(b);
    for (const day of a.days) {
      expect(day.score).toBeGreaterThanOrEqual(0);
      expect(day.score).toBeLessThanOrEqual(10);
    }
    expect(a.weekScore).toBeGreaterThanOrEqual(0);
    expect(a.weekScore).toBeLessThanOrEqual(10);
    expect(bandFor(a.weekScore)).toBe(a.band);
  });

  it("density matters: a sandwiched day scores 2.0 more than the same day isolated", () => {
    const mk = (pattern: (number | null)[]) =>
      pattern.map((fams, i) =>
        fams === null
          ? row({ label: `D${i}`, isRest: true })
          : row({
              label: `D${i}`,
              assigned: ["chest"],
              sets: fams,
              minutes: 60,
            }),
      );
    // Same day (index 2), same sets/minutes/families — only neighbours differ.
    const spaced = computeWeekStress(mk([8, null, 8, null, 8, null, null]));
    const packed = computeWeekStress(mk([null, 8, 8, 8, null, null, null]));
    expect(packed.days[2]!.score - spaced.days[2]!.score).toBeCloseTo(2.0, 1);
  });

  it("warns when the week has no rest day at all", () => {
    // One distinct family per day keeps every family below the 20-set ceiling
    // (no `family_over` +1), so the only score adjustment is the no-rest one.
    const fams = [
      "chest",
      "lats",
      "shoulders",
      "biceps",
      "glutes",
      "quadriceps",
      "calves",
    ] as const;
    const rows = fams.map((family, i) =>
      row({ label: `D${i}`, assigned: [family], sets: 4, minutes: 45 }),
    );
    const stress = computeWeekStress(rows);
    expect(stress.restDays).toBe(0);
    expect(stress.warnings.map((w) => w.code)).toContain("no_rest_week");
    expect(stress.warnings.map((w) => w.code)).not.toContain("family_over");
    // The penalty is visible in the score: mean of the days, +1, rounded.
    const mean =
      stress.days.reduce((a, d) => a + d.score, 0) / stress.days.length;
    expect(stress.weekScore).toBeCloseTo(
      Math.round((mean + 1) * 10) / 10,
      5,
    );
  });

  it("warns when a family goes above the 12–20 evidence band", () => {
    const rows = Array.from({ length: 7 }, (_, i) =>
      row({ label: `D${i}`, assigned: ["chest"], sets: 4, minutes: 60 }),
    );
    const stress = computeWeekStress(rows);
    expect(stress.familySets.chest).toBe(28);
    const over = stress.warnings.find((w) => w.code === "family_over");
    expect(over).toBeDefined();
    if (over && over.code === "family_over") {
      expect(over.family).toBe("chest");
      expect(over.sets).toBe(28);
    }
  });

  it("warns about five-plus families in one sitting and high days back to back", () => {
    const rows = Array.from({ length: 7 }, (_, i) =>
      row({
        label: `D${i}`,
        assigned: ["chest", "lats", "quadriceps", "glutes", "traps", "core"],
        sets: 24,
        minutes: 90,
      }),
    );
    const stress = computeWeekStress(rows);
    const codes = stress.warnings.map((w) => w.code);
    expect(codes).toContain("dense_day");
    expect(codes).toContain("back_to_back");
    expect(stress.band).not.toBe("low");
  });

  it("lists the families his design leaves out, but only when he designed days", () => {
    const rows = [
      row({ label: "Lun", assigned: ["chest"], sets: 4, minutes: 60 }),
      row({ label: "Mar", isRest: true }),
      row({ label: "Mié", isRest: true }),
      row({ label: "Jue", isRest: true }),
      row({ label: "Vie", isRest: true }),
      row({ label: "Sáb", isRest: true }),
      row({ label: "Dom", isRest: true }),
    ];
    const stress = computeWeekStress(rows);
    const zero = stress.warnings.find((w) => w.code === "family_zero");
    expect(zero).toBeDefined();
    if (zero && zero.code === "family_zero") {
      expect(zero.families).not.toContain("chest");
      expect(zero.families.length).toBeGreaterThan(5);
    }
  });
});

describe("bandFor: the four labelled bands", () => {
  it("cuts at 4, 6.5 and 8.5", () => {
    expect(bandFor(0)).toBe("low");
    expect(bandFor(3.9)).toBe("low");
    expect(bandFor(4)).toBe("moderate");
    expect(bandFor(6.4)).toBe("moderate");
    expect(bandFor(6.5)).toBe("high");
    expect(bandFor(8.4)).toBe("high");
    expect(bandFor(8.5)).toBe("excessive");
    expect(bandFor(10)).toBe("excessive");
  });
});
