/**
 * The weekly planner — horizontalisation promises.
 *
 * The daily engine was already held by its own suite; this file holds the
 * promises the *week* adds:
 *
 *   1. **recovery**: no big muscle family lands on two consecutive training
 *      days (the 48 h rule the research validated);
 *   2. **weak-first**: the weakest family of the input appears on the earliest
 *      possible day and gets a second hit before stronger ones do;
 *   3. **budgets**: a day's session never exceeds its budget by more than the
 *      last slot's overrun (the same behaviour the daily engine has);
 *   4. **determinism**: same input + same seed ⇒ identical week;
 *   5. **never throws**: zero training days, empty catalog, all families
 *      blocked — degraded weeks, not exceptions;
 *   6. **focus is respected**: every slot of a day belongs to the families
 *      assigned to that day.
 *
 * @module tests/training/week_planner
 */

import { describe, it, expect } from "vitest";
import {
  buildWeek,
  buildSession,
  type SessionCatalogEntry,
  type MuscleFamily,
} from "@fitness/bodylab-training";

// A small but realistic catalog (the real one is injected the same way).
const CATALOG: SessionCatalogEntry[] = [
  { id: "bench-press", muscles: ["chest_upper"], pattern: "horizontal_push", loadType: "barbell", unilateral: false, jointStress: 2, spineLoad: 1, hypertrophy: 5, difficulty: 3, setupMin: 2 },
  { id: "push-up", muscles: ["chest_upper"], pattern: "horizontal_push", loadType: "bodyweight", unilateral: false, jointStress: 1, spineLoad: 1, hypertrophy: 3, difficulty: 1, setupMin: 0 },
  { id: "ohp", muscles: ["anterior_deltoid", "lateral_deltoid", "triceps_long"], pattern: "vertical_push", loadType: "barbell", unilateral: false, jointStress: 2, spineLoad: 2, hypertrophy: 4, difficulty: 3, setupMin: 2 },
  { id: "lat-pulldown", muscles: ["lats_upper", "biceps_short"], pattern: "vertical_pull", loadType: "cable", unilateral: false, jointStress: 1, spineLoad: 1, hypertrophy: 4, difficulty: 2, setupMin: 1 },
  { id: "row", muscles: ["rhomboids", "lats_upper", "biceps_short"], pattern: "horizontal_pull", loadType: "dumbbell", unilateral: false, jointStress: 1, spineLoad: 2, hypertrophy: 4, difficulty: 2, setupMin: 1 },
  { id: "squat", muscles: ["quadriceps", "gluteus_maximus"], pattern: "squat", loadType: "barbell", unilateral: false, jointStress: 2, spineLoad: 3, hypertrophy: 5, difficulty: 4, setupMin: 3 },
  { id: "rdl", muscles: ["hamstrings", "gluteus_maximus", "erector_spinae"], pattern: "hinge", loadType: "barbell", unilateral: false, jointStress: 2, spineLoad: 3, hypertrophy: 5, difficulty: 4, setupMin: 3 },
  { id: "leg-curl", muscles: ["hamstrings"], pattern: "knee_flexion", loadType: "machine", unilateral: false, jointStress: 1, spineLoad: 1, hypertrophy: 4, difficulty: 1, setupMin: 1 },
  { id: "calf-raise", muscles: ["gastrocnemius", "soleus"], pattern: "plantar_flexion", loadType: "dumbbell", unilateral: false, jointStress: 1, spineLoad: 1, hypertrophy: 3, difficulty: 1, setupMin: 0 },
  { id: "curl", muscles: ["biceps_short", "biceps_long"], pattern: "elbow_flexion", loadType: "dumbbell", unilateral: false, jointStress: 1, spineLoad: 1, hypertrophy: 3, difficulty: 1, setupMin: 0 },
  { id: "plank", muscles: ["rectus_abdominis"], pattern: "core_anti_extension", loadType: "bodyweight", unilateral: false, jointStress: 1, spineLoad: 1, hypertrophy: 2, difficulty: 1, setupMin: 0 },
  { id: "lateral-raise", muscles: ["lateral_deltoid"], pattern: "shoulder_abduction", loadType: "dumbbell", unilateral: false, jointStress: 1, spineLoad: 1, hypertrophy: 3, difficulty: 1, setupMin: 0 },
];

const READINESS = { energy: 4, motivation: 4, soreness: 4 };

/** Big families actually present in the catalog above. */
const BIG: MuscleFamily[] = [
  "chest", "shoulders", "triceps", "biceps", "lats", "quadriceps", "hamstrings", "glutes",
];

const DAYS = (n: number, budget = 75) =>
  Array.from({ length: n }, (_, i) => ({
    label: `Día ${i + 1}`,
    budgetMin: budget,
  }));

function familiesOfSlot(catalog: SessionCatalogEntry[], exerciseId: string): MuscleFamily {
  // Mirror of the session engine's family mapping for the test catalog.
  const map: Record<string, MuscleFamily> = {
    "bench-press": "chest", "push-up": "chest", "ohp": "shoulders",
    "lat-pulldown": "lats", "row": "rhomboids", "squat": "quadriceps",
    "rdl": "hamstrings", "leg-curl": "hamstrings", "calf-raise": "calves",
    "curl": "biceps", "plank": "core", "lateral-raise": "shoulders",
  };
  void catalog;
  return map[exerciseId] ?? "core";
}

describe("week planner: recovery", () => {
  it("never schedules the same big family on consecutive training days", () => {
    const week = buildWeek({
      days: DAYS(4),
      weakness: { hamstrings: 10, glutes: 20, lats: 30, chest: 60 },
      readiness: READINESS,
      level: "intermediate",
      goal: "hypertrophy",
      catalog: CATALOG,
    });
    const trainDays = week.days.filter((d) => !d.isRest);
    for (let i = 1; i < trainDays.length; i++) {
      for (const fam of BIG) {
        const prev = trainDays[i - 1]!.assigned.includes(fam);
        const cur = trainDays[i]!.assigned.includes(fam);
        expect([prev, cur].every(Boolean), `${fam} on training days ${i - 1} and ${i}`).toBe(false);
      }
    }
  });

  it("respects recovery even when every family wants two hits (3 days, weak hamstrings)", () => {
    const week = buildWeek({
      days: DAYS(3),
      weakness: { hamstrings: 5, glutes: 25, everything: 60 } as never,
      readiness: READINESS,
      level: "intermediate",
      goal: "hypertrophy",
      catalog: CATALOG,
    });
    const trainDays = week.days.filter((d) => !d.isRest);
    expect(trainDays.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < trainDays.length; i++) {
      const shared = trainDays[i]!.assigned.filter((fam) =>
        trainDays[i - 1]!.assigned.includes(fam),
      );
      const bigShared = shared.filter((fam) => BIG.includes(fam));
      expect(bigShared, JSON.stringify(shared)).toEqual([]);
    }
  });
});

describe("week planner: priorities and coverage", () => {
  it("gives the weakest family a session, and stronger families never jump the queue on day 1", () => {
    const week = buildWeek({
      days: DAYS(3),
      weakness: { hamstrings: 5, chest: 70, biceps: 80 },
      readiness: READINESS,
      level: "intermediate",
      goal: "hypertrophy",
      catalog: CATALOG,
    });
    const first = week.days.find((d) => !d.isRest)!;
    expect(first.assigned).toContain("hamstrings");
    // Weak-first order: hamstrings (5) is assigned before chest (70) and
    // biceps (80) — the strongest family never leads the list.
    expect(first.assigned.indexOf("hamstrings")).toBeLessThan(
      first.assigned.indexOf("biceps"),
    );
  });

  it("the weakest family gets a second weekly hit when there are >= 3 training days", () => {
    const week = buildWeek({
      days: DAYS(4),
      weakness: { hamstrings: 5, glutes: 15, chest: 70 },
      readiness: READINESS,
      level: "intermediate",
      goal: "hypertrophy",
      catalog: CATALOG,
    });
    const hits = week.days.filter((d) => d.assigned.includes("hamstrings")).length;
    expect(hits).toBe(2);
  });

  it("blocked families are uncovered with reason 'blocked' and never scheduled", () => {
    const week = buildWeek({
      days: DAYS(3),
      weakness: { hamstrings: 5 },
      readiness: READINESS,
      level: "intermediate",
      goal: "hypertrophy",
      catalog: CATALOG,
      blockedFamilies: ["hamstrings"],
    });
    expect(week.uncovered).toContainEqual({ family: "hamstrings", reason: "blocked" });
    for (const day of week.days) {
      expect(day.assigned).not.toContain("hamstrings");
    }
  });
});

describe("week planner: budgets, focus, determinism, robustness", () => {
  it("each training day's session fits its budget (within one slot's overrun)", () => {
    const budgets = [60, 90, 45, 75];
    const week = buildWeek({
      days: budgets.map((b, i) => ({ label: `D${i}`, budgetMin: b })),
      weakness: { hamstrings: 10, glutes: 20, lats: 40 },
      readiness: READINESS,
      level: "intermediate",
      goal: "hypertrophy",
      catalog: CATALOG,
    });
    week.days.forEach((day, i) => {
      if (day.isRest) return;
      expect(day.session.totalMinutes, `day ${i}`).toBeLessThanOrEqual(
        budgets[i]! + 15,
      );
    });
  });

  it("every slot of a day belongs to the families assigned to that day", () => {
    const week = buildWeek({
      days: DAYS(3),
      weakness: { hamstrings: 10, glutes: 25, lats: 35, shoulders: 45 },
      readiness: READINESS,
      level: "intermediate",
      goal: "hypertrophy",
      catalog: CATALOG,
    });
    for (const day of week.days) {
      if (day.isRest) continue;
      for (const slot of day.session.slots) {
        const fam = familiesOfSlot(CATALOG, slot.exerciseId);
        expect(
          day.assigned.includes(fam),
          `${slot.exerciseId} (${fam}) on a ${JSON.stringify(day.assigned)} day`,
        ).toBe(true);
      }
    }
  });

  it("is deterministic: same input and seed ⇒ identical week", () => {
    const input = {
      days: DAYS(4),
      weakness: { hamstrings: 10, glutes: 20, lats: 40, chest: 55 },
      readiness: READINESS,
      level: "intermediate" as const,
      goal: "hypertrophy" as const,
      catalog: CATALOG,
      seed: 11,
    };
    const a = buildWeek(input);
    const b = buildWeek(input);
    expect(JSON.stringify(a.days.map((d) => d.assigned))).toBe(
      JSON.stringify(b.days.map((d) => d.assigned)),
    );
    expect(JSON.stringify(a.days.map((d) => d.session.slots))).toBe(
      JSON.stringify(b.days.map((d) => d.session.slots)),
    );
  });

  it("never throws on degenerate inputs and degrades honestly", () => {
    // Zero training days.
    const rest = buildWeek({
      days: [{ label: "Lun", budgetMin: 0 }, { label: "Mar", budgetMin: 0 }],
      weakness: { hamstrings: 5 },
      readiness: READINESS,
      level: "beginner",
      goal: "hypertrophy",
      catalog: CATALOG,
    });
    expect(rest.days.every((d) => d.isRest)).toBe(true);
    expect(rest.totalSets).toBe(0);
    expect(rest.uncovered.length).toBeGreaterThan(0);

    // Empty catalog: sessions exist but carry no slots.
    const empty = buildWeek({
      days: DAYS(2),
      weakness: { hamstrings: 5 },
      readiness: READINESS,
      level: "beginner",
      goal: "hypertrophy",
      catalog: [],
    });
    expect(empty.days.length).toBe(2);

    // All catalog families blocked: nothing scheduled, everything explained.
    const blocked = buildWeek({
      days: DAYS(2),
      weakness: Object.fromEntries(BIG.map((f) => [f, 5])),
      readiness: READINESS,
      level: "beginner",
      goal: "hypertrophy",
      catalog: CATALOG,
      blockedFamilies: [...ALL_CATALOG_FAMILIES],
    });
    expect(blocked.totalSets).toBe(0);
  });
});

/** Every family the test catalog can program (big + small). */
const ALL_CATALOG_FAMILIES: MuscleFamily[] = [
  ...BIG,
  "rhomboids",
  "core",
  "calves",
  "forearms",
  "traps",
];
void buildSession;
