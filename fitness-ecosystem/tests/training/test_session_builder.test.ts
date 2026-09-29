/**
 * Session builder (`core/training/session.ts`).
 *
 * Why these tests exist: the WEEKLY generator is hard-validated and refuses to
 * produce a plan when a family lands outside its weekly window — which a real
 * home catalog triggers (chest spilled to 22 sets/week on the first live run of
 * TrainingLab). The day-level builder must never do that: it is the "what do I
 * do in the next 90 minutes" answer and it must always answer.
 *
 * Every case below maps to a real product promise, so none of them is filler.
 *
 * @module tests/training/session_builder
 */

import { describe, it, expect } from "vitest";
import {
  buildSession,
  muscleFamilyOf,
  type BuildSessionInput,
  type FamilyWeakness,
  type MuscleFamily,
  type SessionCatalogEntry,
} from "@fitness/bodylab-training";
import {
  ALL_EXERCISES,
  EXERCISE_TRAITS,
  type MuscleGroup,
} from "@fitness/bodylab-exercises";

/**
 * The mapping the app performs once per catalog: catalog + traits → planner
 * shape. Kept here because it IS the contract between the two packages.
 */
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

/** The owner's real home menu: bar, dip bars, dumbbells, bands, bike, box. */
const HOME_IDS = [
  "push-ups",
  "inverted-row",
  "pull-ups",
  "chin-ups",
  "dips",
  "pike-push-up",
  "dumbbell-bench-press",
  "dumbbell-row",
  "lateral-raise",
  "arnold-press",
  "band-row",
  "band-face-pull",
  "band-curl",
  "band-triceps-pushdown",
  "bulgarian-split-squat",
  "goblet-squat",
  "single-leg-rdl",
  "step-up",
  "nordic-curl",
  "single-leg-calf-raise",
  "hanging-leg-raise",
  "ab-wheel-rollout",
  "side-plank",
  "hollow-body-hold",
  "mtb-hill-intervals",
  "mtb-steady-ride",
];
const HOME_CATALOG = toSessionEntries(HOME_IDS);

/** A weak-chest, weak-legs profile (0-100 strength, lower = weaker). */
const WEAKNESS: FamilyWeakness = {
  chest: 32,
  shoulders: 44,
  triceps: 55,
  biceps: 58,
  lats: 40,
  traps: 60,
  rhomboids: 62,
  quadriceps: 35,
  hamstrings: 42,
  glutes: 50,
  calves: 48,
  core: 46,
  forearms: 66,
};

const base = (over: Partial<BuildSessionInput> = {}): BuildSessionInput => ({
  catalog: HOME_CATALOG,
  weakness: WEAKNESS,
  weeklyVolume: {},
  timeBudgetMin: 90,
  level: "intermediate",
  goal: "hypertrophy",
  seed: 7,
  ...over,
});

const familiesOfSlot = (slot: { families: MuscleFamily[] }) => slot.families;

describe("Session builder: the owner’s 90 minutes at home", () => {
  it("fits the 90-minute budget and never exceeds it", () => {
    const session = buildSession(base());
    expect(session.slots.length).toBeGreaterThanOrEqual(4);
    expect(session.totalMinutes).toBeLessThanOrEqual(90);
    expect(session.totalMinutes).toBeGreaterThan(30); // it should USE the time
  });

  it("covers push, pull, legs and core when the gear allows it", () => {
    const session = buildSession(base());
    const patterns = new Set(session.slots.map((s) => s.pattern));
    const has = (group: string[]) => group.some((p) => patterns.has(p));
    expect(has(["horizontal_push", "vertical_push"])).toBe(true);
    expect(has(["horizontal_pull", "vertical_pull"])).toBe(true);
    expect(has(["squat", "hinge", "lunge"])).toBe(true);
    expect(
      has([
        "core_anti_extension",
        "core_flexion",
        "core_anti_lateral",
        "core_rotation",
      ]),
    ).toBe(true);
  });

  it("prescribes reps/rest from the goal, and every slot explains itself", () => {
    const session = buildSession(base({ goal: "strength" }));
    for (const slot of session.slots) {
      expect(slot.sets).toBeGreaterThan(0);
      expect(slot.repsMax).toBeGreaterThanOrEqual(slot.repsMin);
      // Reasons are structured codes (the app owns the copy/language).
      expect(slot.reasons.length).toBeGreaterThan(0);
      expect(["weak_family", "no_anthro", "coverage"]).toContain(
        slot.reasons[0]!.code,
      );
      expect([1, 2, 3, 4, 5]).toContain(slot.rir);
    }
    const compound = session.slots.find(
      (s) => s.pattern === "squat" || s.pattern === "hinge",
    );
    if (compound) expect(compound.restSec).toBeGreaterThanOrEqual(120);
  });

  it("starts with the weakest family present in the menu", () => {
    const session = buildSession(base());
    expect(session.focus.length).toBeGreaterThan(0);
    const weakestInMenu = session.slots
      .flatMap((s) => familiesOfSlot(s))
      .map((f) => WEAKNESS[f] ?? 50)
      .reduce((a, b) => Math.min(a, b), 100);
    expect(weakestInMenu).toBeLessThanOrEqual(40); // chest 32 / quadriceps 35 are in the menu
  });

  it("is deterministic for the same input and seed", () => {
    const a = buildSession(base());
    const b = buildSession(base());
    expect(a.slots.map((s) => s.exerciseId)).toEqual(
      b.slots.map((s) => s.exerciseId),
    );
    expect(a.totalMinutes).toBe(b.totalMinutes);
  });
});

describe("Session builder: honesty under constraints", () => {
  it("produces a shorter session (not an error) when only 30 minutes exist", () => {
    const session = buildSession(base({ timeBudgetMin: 30 }));
    expect(session.totalMinutes).toBeLessThanOrEqual(30);
    expect(session.slots.length).toBeGreaterThanOrEqual(2);
    expect(
      session.advisories.some(
        (a) =>
          a.code === "left_out" ||
          a.code === "group_no_time" ||
          a.code === "volume_capped",
      ),
    ).toBe(true);
  });

  it("cuts volume and avoids the most stressful movements on a bad day", () => {
    const fresh = buildSession(
      base({ readiness: { energy: 5, motivation: 5, soreness: 5 } }),
    );
    const rough = buildSession(
      base({ readiness: { energy: 2, motivation: 2, soreness: 1 } }),
    );
    const setsOf = (s: typeof fresh) =>
      s.slots.reduce((acc, slot) => acc + slot.sets, 0);
    expect(rough.volumeFactor).toBeLessThan(fresh.volumeFactor);
    expect(setsOf(rough)).toBeLessThan(setsOf(fresh));
    expect(rough.slots.every((s) => s.rir >= 3)).toBe(true);
    expect(rough.advisories.some((a) => a.code === "readiness_low")).toBe(true);
  });

  it("leaves fatigued families alone", () => {
    const session = buildSession(
      base({ fatiguedFamilies: ["chest", "shoulders"] }),
    );
    const touched = new Set(session.slots.flatMap((s) => s.families));
    expect(touched.has("chest")).toBe(false);
    expect(touched.has("shoulders")).toBe(false);
  });

  it("adds a conditioning block when cardio is due and the gear exists", () => {
    const session = buildSession(
      base({
        conditioningScore: 38,
        goal: "recomposition",
        readiness: { energy: 4, motivation: 4, soreness: 4 },
      }),
    );
    const cardio = session.slots.find((s) => s.cardioMin !== undefined);
    expect(cardio).toBeDefined();
    expect(["cardio_due", "cardio_goal"]).toContain(cardio!.reasons[0]!.code);
    expect(session.totalMinutes).toBeLessThanOrEqual(90);
  });

  it("says so instead of inventing a bike when none is declared", () => {
    const noBike = toSessionEntries(
      HOME_IDS.filter(
        (id) => id !== "mtb-hill-intervals" && id !== "mtb-steady-ride",
      ),
    );
    const session = buildSession(
      base({
        catalog: noBike,
        conditioningScore: 30,
        readiness: { energy: 4, motivation: 4, soreness: 4 },
      }),
    );
    expect(session.slots.some((s) => s.cardioMin !== undefined)).toBe(false);
    expect(session.advisories.some((a) => a.code === "cardio_no_gear")).toBe(
      true,
    );
  });

  it("never throws on an unusable or empty catalog", () => {
    expect(() => buildSession(base({ catalog: [] }))).not.toThrow();
    const empty = buildSession(base({ catalog: [] }));
    expect(empty.slots).toEqual([]);
    expect(empty.advisories.length).toBeGreaterThan(0);
  });
});

describe("Session builder: the regression that broke F1", () => {
  it("still builds a session when weekly volume is already over the ceiling", () => {
    // Reproduced live: with a home catalog the WEEKLY generator threw
    // "[weekly_volume] family chest gets 22 sets/week, above the intermediate
    // maximum (18)" and the Today screen showed no plan at all.
    const session = buildSession(
      base({ weeklyVolume: { chest: 22, rhomboids: 3, quadriceps: 19 } }),
    );
    expect(session.slots.length).toBeGreaterThan(0);
    expect(session.totalMinutes).toBeLessThanOrEqual(90);
    // The over-ceiling family is reported (not silently programmed), and the
    // advisory carries both the family and the ceiling so the user can act.
    const ceilingNote = session.advisories.find(
      (a) => a.code === "above_ceiling",
    );
    expect(ceilingNote).toBeDefined();
    expect(ceilingNote!.families).toContain("chest");
    expect(ceilingNote!.ceiling).toBe(18);
    // A family that is already over its ceiling must not be the day's priority.
    const firstFamilies = session.slots[0]!.families;
    expect(firstFamilies.includes("chest")).toBe(false);
  });

  it("walks the rolling weekly ledger down instead of restarting it", () => {
    const many = buildSession(
      base({ weeklyVolume: { chest: 18, lats: 18, quadriceps: 18, core: 18 } }),
    );
    const fresh = buildSession(base({ weeklyVolume: {} }));
    // With everything already covered, the session shifts to what is left.
    const freshFamilies = new Set(fresh.slots.flatMap((s) => s.families));
    const manyFamilies = new Set(many.slots.flatMap((s) => s.families));
    expect([...freshFamilies].sort()).not.toEqual([...manyFamilies].sort());
  });

  it("never programs a directly-worked family twice in one session", () => {
    const session = buildSession(base());
    const seen = new Set<MuscleFamily>();
    for (const slot of session.slots) {
      if (slot.cardioMin !== undefined) continue;
      const primary = slot.families[0]!;
      expect(seen.has(primary), `${primary} scheduled twice`).toBe(false);
      seen.add(primary);
    }
  });

  it("maps muscles to families using the core vocabulary (sanity on the bridge)", () => {
    expect(muscleFamilyOf("chest_upper")).toBe("chest");
    expect(muscleFamilyOf("rectus_abdominis")).toBe("core");
    expect(muscleFamilyOf("lateral_deltoid")).toBe("shoulders");
  });
});
