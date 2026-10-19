/**
 * The recovery window — the rule that stops today's plan from repeating
 * yesterday's session.
 *
 * Why this file exists (owner report, 2026-10-09): he asked the coach what to
 * train the day after a 22-set push/pull session, said his chest and obliques
 * were beaten up, and was handed chin-ups AND pull-ups — the same lats, biceps
 * and forearms he had loaded ~15 hours earlier, on a bar that blisters his
 * hands. Every fact needed to refuse that was already in the log; nothing read
 * it. Fatigue lived only in a checkbox the user had to tick himself.
 *
 * These tests pin the fix, and they use the owner's REAL Wednesday log (the
 * 22 sets the desk backup holds for 2026-10-07) rather than a synthetic one, so
 * a regression shows up against the data that caused it:
 *
 *   1. the families he trained are refused the next morning;
 *   2. they are released once the window has actually passed;
 *   3. his own freshness report shortens the window, and feeling beaten up
 *      widens it — his body outranks our table;
 *   4. the plan skips a fatigued family even when the gear would allow it;
 *   5. an explicit focus of the day still wins (his intent is never rewritten);
 *   6. the coach's proposal is rejected if it touches a recovering family;
 *   7. a session never contains the same movement pattern twice — the
 *      chin-ups + pull-ups double dose.
 *
 * @module tests/training/recovery_window
 */

import { describe, expect, it } from "vitest";
import {
  buildSession,
  emptyModel,
  muscleFamilyOf,
  type MuscleFamily,
  type Readiness,
  type SessionCatalogEntry,
} from "@fitness/bodylab-training";
import {
  ALL_EXERCISES,
  EXERCISE_TRAITS,
  type MuscleGroup,
  type OwnedEquipment,
} from "@fitness/bodylab-exercises";
import {
  deriveFatigue,
  HARD_WINDOW_HOURS,
} from "../../traininglab/apps/desktop/src/lib/recovery";
import {
  buildTodayPlan,
  familyLogStats,
} from "../../traininglab/apps/desktop/src/lib/plan";
import { validateProposal } from "../../traininglab/apps/desktop/src/lib/llm";
import { formatAdvisory } from "../../traininglab/apps/desktop/src/lib/format";
import { setLanguage, t } from "../../traininglab/apps/desktop/src/lib/i18n";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

const NEUTRAL: Readiness = { energy: 3, motivation: 3, soreness: 3 };

/** The owner's real session of Wednesday 2026-10-07 (22 sets, 1714.6 kg). */
const WEDNESDAY = "2026-10-07T17:00:00.000Z";
const THURSDAY_MORNING = new Date("2026-10-08T08:00:00Z"); // ~15 h later
const FRIDAY_NIGHT = new Date("2026-10-09T18:00:00Z"); // ~49 h later

let seq = 0;
function logged(
  exerciseId: string,
  sets: number,
  repsAt: number,
  timestamp = WEDNESDAY,
): TLSet[] {
  return Array.from({ length: sets }, () => {
    seq += 1;
    return {
      id: `set-${seq}`,
      exerciseId,
      dayId: "day-wed",
      timestamp,
      weight: exerciseId === "oblique-crunch" ? 28.6 : null,
      reps: repsAt,
    };
  });
}

/** Exactly what the desk backup holds for 2026-10-07, exercise by exercise. */
const OWNER_WEDNESDAY: TLSet[] = [
  ...logged("oblique-crunch", 4, 15),
  ...logged("pull-ups", 2, 5),
  ...logged("push-ups", 4, 10),
  ...logged("crunch", 4, 20),
  ...logged("chin-ups", 4, 5),
  ...logged("dips", 4, 10),
];

/** The gear he actually owns plus a bar, so nothing is excluded by equipment. */
const HOME_GYM: OwnedEquipment[] = [
  {
    id: "eq-1",
    presetId: "dumbbells-adjustable",
    label: "Mancuernas ajustables",
    capabilities: ["dumbbell", "bodyweight"],
    maxLoadKg: 24,
    incrementKg: 1,
    setupMin: 1,
  },
  {
    id: "eq-2",
    presetId: "pullup-bar",
    label: "Barra de dominadas",
    capabilities: ["pullup_bar", "dip_bars", "bench", "bands"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 1,
  },
];

const totalSets = OWNER_WEDNESDAY.length;

describe("recovery window", () => {
  it("refuses the families trained yesterday", () => {
    const report = deriveFatigue(OWNER_WEDNESDAY, NEUTRAL, THURSDAY_MORNING);

    // dips + push-ups → chest, shoulders, triceps; chin-ups + pull-ups → lats,
    // biceps (and grip); both crunches → core.
    for (const family of [
      "chest",
      "shoulders",
      "triceps",
      "lats",
      "biceps",
      "core",
    ] as MuscleFamily[]) {
      expect(report.fatigued, family).toContain(family);
    }
    // Nothing he did touched his legs, and they must stay available: a rule
    // that empties every day is useless.
    expect(report.fatigued).not.toContain("quadriceps");
    expect(report.fatigued).not.toContain("hamstrings");
    expect(report.windowHours).toBe(HARD_WINDOW_HOURS);
  });

  it("releases them once the window has passed", () => {
    const report = deriveFatigue(OWNER_WEDNESDAY, NEUTRAL, FRIDAY_NIGHT);
    expect(report.fatigued).toEqual([]);
    expect(report.entries).toEqual([]);
  });

  it("shortens the window when the user reports feeling fresh", () => {
    const fresh: Readiness = { energy: 4, motivation: 4, soreness: 5 };
    const report = deriveFatigue(
      OWNER_WEDNESDAY,
      fresh,
      new Date("2026-10-08T18:00:00Z"), // 25 h later
    );
    expect(report.windowHours).toBe(24);
    expect(report.fatigued).toEqual([]);
  });

  it("widens the window when the user reports being beaten up", () => {
    const beaten: Readiness = { energy: 1, motivation: 2, soreness: 1 };
    const report = deriveFatigue(
      OWNER_WEDNESDAY,
      beaten,
      new Date("2026-10-09T17:30:00Z"), // 48.5 h later
    );
    expect(report.windowHours).toBe(72);
    expect(report.fatigued).toContain("chest");
    expect(report.entries.every((e) => e.reason === "readiness_low")).toBe(
      true,
    );
  });

  it("ignores warm-up ramp sets", () => {
    const ramped: TLSet[] = OWNER_WEDNESDAY.map((s) => ({ ...s, warmup: true }));
    const report = deriveFatigue(ramped, NEUTRAL, THURSDAY_MORNING);
    expect(report.fatigued).toEqual([]);
  });

  it("keeps the fatigued families out of the plan even when the gear allows them", () => {
    const plan = buildTodayPlan({
      inventory: HOME_GYM,
      readiness: NEUTRAL,
      timeBudgetMin: 45,
      level: "intermediate",
      goal: "hypertrophy",
      logStats: familyLogStats(OWNER_WEDNESDAY, THURSDAY_MORNING),
      sets: OWNER_WEDNESDAY,
      now: THURSDAY_MORNING,
      model: emptyModel(),
      payload: null,
    });

    expect(plan.fatigue?.fatigued).toContain("lats");
    // The exact failure: no row may load a family that is still recovering.
    const refused = new Set(plan.fatigue?.fatigued ?? []);
    for (const row of plan.rows) {
      for (const family of row.families) {
        expect(refused.has(family), `${row.exerciseId} → ${family}`).toBe(false);
      }
    }
    // And the plan is not empty: the legs he never trained are still there.
    expect(plan.rows.length).toBeGreaterThan(0);
  });

  it("still honours an explicit focus of the day", () => {
    const plan = buildTodayPlan({
      inventory: HOME_GYM,
      readiness: NEUTRAL,
      timeBudgetMin: 45,
      level: "intermediate",
      goal: "hypertrophy",
      logStats: familyLogStats(OWNER_WEDNESDAY, THURSDAY_MORNING),
      sets: OWNER_WEDNESDAY,
      now: THURSDAY_MORNING,
      model: emptyModel(),
      payload: null,
      focusFamilies: ["chest"],
    });
    // His own choice beats the automatic window (his content is never rewritten).
    expect(plan.rows.length).toBeGreaterThan(0);
    for (const row of plan.rows) expect(row.families[0]).toBe("chest");
  });

  it("rejects a coach proposal that loads a recovering family", () => {
    const report = deriveFatigue(OWNER_WEDNESDAY, NEUTRAL, THURSDAY_MORNING);
    const usable = new Set(["chin-ups", "dumbbell-row", "dumbbell-curl"]);
    const familiesOf = (id: string): string[] => {
      const ex = ALL_EXERCISES.find((e) => e.id === id);
      if (!ex) return [];
      const direct = ex.muscles.filter((m) => m.intensity >= 2);
      return (direct.length > 0 ? direct : ex.muscles).map((m) => {
        return muscleFamilyOf(m.muscle as MuscleGroup) as string;
      });
    };
    const check = validateProposal(
      {
        summary: "Tracción ligera",
        slots: [
          { exerciseId: "chin-ups", sets: 3, repsMin: 5, repsMax: 8, restSec: 120 },
        ],
      },
      {
        usableIds: usable,
        timeBudgetMin: 45,
        primaryFamilyOf: (id) => familiesOf(id)[0] ?? id,
        setupMinOf: () => 1,
        familiesOf,
        fatiguedFamilies: report.fatigued,
      },
    );
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("recovery window");
  });
});

describe("the new lines are written in both languages", () => {
  it("never shows a raw key for the recovery note or the dedup advisory", () => {
    for (const lang of ["es", "en"] as const) {
      setLanguage(lang);
      expect(formatAdvisory({ code: "pattern_dedup", ids: ["pull-ups"], n: 1 })).not.toContain(
        "advisory.",
      );
      for (const key of ["recovery.title", "recovery.line", "recovery.hint"]) {
        expect(t(key), `${lang}:${key}`).not.toBe(key);
      }
    }
    setLanguage("es");
  });
});

describe("one movement pattern per session", () => {
  /** The same catalog → session mapping the app performs (see plan.ts). */
  function toSessionEntries(ids: string[]): SessionCatalogEntry[] {
    const byId = new Map(ALL_EXERCISES.map((e) => [e.id, e]));
    return ids.map((id) => {
      const ex = byId.get(id)!;
      const traits = EXERCISE_TRAITS[id]!;
      return {
        id,
        muscles: ex.muscles
          .filter((m) => m.intensity >= 2)
          .map((m) => m.muscle as MuscleGroup),
        pattern: traits.pattern,
        loadType: traits.loadType,
        unilateral: traits.unilateral,
        jointStress: traits.jointStress,
        spineLoad: traits.spineLoad,
        hypertrophy: ex.hypertrophy,
        difficulty: ex.difficulty,
        setupMin: traits.setupMin,
        cardio: traits.cardio,
      };
    });
  }

  // The owner's bodyweight menu: both vertical pulls are available, which is
  // exactly how the plan ended up prescribing chin-ups AND pull-ups.
  const ENTRIES = toSessionEntries([
    "chin-ups",
    "pull-ups",
    "inverted-row",
    "push-ups",
    "dips",
    "crunch",
    "hanging-knee-raise",
    "side-plank",
    "oblique-crunch",
  ]);

  it("never programs the same pattern twice, however weak the family is", () => {
    const session = buildSession({
      catalog: ENTRIES,
      weakness: {
        lats: 5,
        biceps: 5,
        forearms: 5,
        chest: 40,
        triceps: 40,
        core: 20,
      },
      timeBudgetMin: 90,
      level: "beginner",
      goal: "hypertrophy",
      seed: 7,
    });
    const patterns = session.slots.map((s) => s.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
    // The duplicate is reported, not silently swallowed.
    expect(
      session.advisories.some((a) => a.code === "pattern_dedup"),
    ).toBe(true);
    expect(session.slots.length).toBeGreaterThan(0);
  });

  it("keeps the session honest and non-empty for the beginner at the bar", () => {
    const session = buildSession({
      catalog: ENTRIES,
      weakness: {},
      timeBudgetMin: 30,
      level: "beginner",
      goal: "hypertrophy",
      fatiguedFamilies: ["lats", "biceps"],
      seed: 7,
    });
    for (const slot of session.slots) {
      const families = slot.families;
      expect(families).not.toContain("lats");
      expect(families).not.toContain("biceps");
    }
    // Still a real session: the rule removes patterns, not the whole day.
    expect(session.slots.length).toBeGreaterThan(0);
    const patterns = session.slots.map((s) => s.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });
});
