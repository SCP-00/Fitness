/**
 * Progression — raise the weight, or make the movement harder instead.
 *
 * The owner's rule (2026-10-09): *if I do a lot of reps, add weight; if the weight
 * cannot go up, change to a harder variant.* These tests pin both halves and the
 * refusal that matters most — a bodyweight movement with no load to add must never
 * come back as "add 2.5 kg".
 *
 * @module tests/training/progression
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  progressionFor,
  summariseExerciseDays,
  type ProgressionInput,
} from "../../traininglab/apps/desktop/src/lib/progression";
import { progressionAdviceFor } from "../../traininglab/apps/desktop/src/lib/plan";
import {
  progressionLever,
  progressionSentence,
} from "../../traininglab/apps/desktop/src/lib/progression-copy";
import { setLanguage } from "../../traininglab/apps/desktop/src/lib/i18n";
import { progressionVerdictTool } from "../../traininglab/apps/desktop/src/lib/coach-tools";
import {
  TOOL_SPECS,
  buildSystemPrompt,
} from "../../traininglab/apps/desktop/src/lib/llm";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";
import type { OwnedEquipment } from "@fitness/bodylab-exercises";

let seq = 0;
function s(
  day: string,
  weight: number | null,
  reps: number | null,
  extra: Partial<TLSet> = {},
): TLSet {
  seq += 1;
  return {
    id: `s-${seq}`,
    exerciseId: "dumbbell-row",
    dayId: `day-${day}`,
    timestamp: `${day}T12:00:00.000Z`,
    weight,
    reps,
    ...extra,
  };
}

/** Dumbbell row: loadable, 1 kg increments, 24 kg ceiling. */
const DUMBBELL: Omit<ProgressionInput, "days"> = {
  targetReps: { min: 8, max: 12 },
  loadType: "dumbbell",
  progressionAxes: ["load", "reps"],
  incrementKg: 1,
  maxLoadKg: 24,
};

/** Push-ups: bodyweight, levers = leverage → tempo → volume. */
const BODYWEIGHT: Omit<ProgressionInput, "days"> = {
  targetReps: { min: 8, max: 12 },
  loadType: "bodyweight",
  progressionAxes: ["reps", "leverage", "tempo", "volume"],
  incrementKg: null,
  maxLoadKg: null,
};

describe("exercise history summarised by day", () => {
  it("counts working sets apart from warm-ups and keeps the order", () => {
    const days = summariseExerciseDays([
      s("2026-10-01", 20, 10, { warmup: true }),
      s("2026-10-01", 28, 12),
      s("2026-10-01", 28, 11),
      s("2026-10-03", 30, 9),
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-10-01", "2026-10-03"]);
    expect(days[0]!.sets).toBe(2);
    expect(days[0]!.warmupSets).toBe(1);
    expect(days[0]!.topWeightKg).toBe(28);
    expect(days[0]!.reps).toEqual([12, 11]);
    expect(days[0]!.lastReps).toBe(11);
    // The 20 kg warm-up must not inflate the estimated 1RM.
    expect(days[0]!.bestEst1RmKg).toBeCloseTo(39.2, 1);
  });

  it("reads the failure badge the source stores in notes", () => {
    const days = summariseExerciseDays([
      s("2026-10-05", 28, 10, { notes: "F" }),
      s("2026-10-05", 28, 8),
    ]);
    expect(days[0]!.hadFailure).toBe(true);
  });
});

describe("progression verdict", () => {
  it("adds the gear's increment once every set reaches the top of the range", () => {
    const advice = progressionFor({
      ...DUMBBELL,
      days: summariseExerciseDays([
        s("2026-10-05", 22, 12),
        s("2026-10-05", 22, 12),
      ]),
    });
    expect(advice.verdict).toBe("increase_load");
    expect(advice.weightKg).toBe(23);
    expect(advice.axis).toBe("load");
    expect(advice.reason.es).toContain("23");
  });

  it("waits for the weakest set, not the best one", () => {
    const advice = progressionFor({
      ...DUMBBELL,
      days: summariseExerciseDays([
        s("2026-10-05", 22, 12),
        s("2026-10-05", 22, 9),
      ]),
    });
    expect(advice.verdict).toBe("repeat");
    expect(advice.weightKg).toBe(22);
  });

  it("sends a bodyweight movement to a harder lever instead of inventing kilos", () => {
    const advice = progressionFor({
      ...BODYWEIGHT,
      days: summariseExerciseDays([
        s("2026-10-06", null, 12),
        s("2026-10-06", null, 13),
      ]),
    });
    expect(advice.verdict).toBe("escalate_variant");
    expect(advice.weightKg).toBeNull();
    // Mechanical difficulty comes before tempo, per the declared order.
    expect(advice.axis).toBe("leverage");
    expect(advice.reason.es).toContain("leverage");
  });

  it("escalates when the weight is real but the gear has hit its ceiling", () => {
    const advice = progressionFor({
      ...DUMBBELL,
      maxLoadKg: 23,
      days: summariseExerciseDays([
        s("2026-10-06", 23, 12),
        s("2026-10-06", 23, 12),
      ]),
    });
    expect(advice.verdict).toBe("escalate_variant");
    expect(advice.weightKg).toBe(23);
    expect(advice.reason.es).toContain("23 kg");
    // ["load", "reps"] and the load is done: reps is the lever that is left.
    expect(advice.axis).toBe("reps");
    expect(advice.reason.es).toContain("reps");
  });

  it("tells the owner to reduce when the range's floor was never reached", () => {
    const advice = progressionFor({
      ...DUMBBELL,
      days: summariseExerciseDays([
        s("2026-10-07", 30, 5),
        s("2026-10-07", 30, 6),
      ]),
    });
    expect(advice.verdict).toBe("reduce");
    expect(advice.reason.es).toContain("6");
  });

  it("sends a bodyweight movement below the floor to an EASIER variant, not to a lighter load", () => {
    // The real case from the owner's log (2026-10-07): chin-ups maxing at 6 reps
    // with nothing to unload — "baja la carga" would be nonsense here.
    const advice = progressionFor({
      ...BODYWEIGHT,
      days: summariseExerciseDays([
        s("2026-10-07", null, 5),
        s("2026-10-07", null, 6),
      ]),
    });
    expect(advice.verdict).toBe("regress_variant");
    expect(advice.weightKg).toBeNull();
    expect(advice.axis).toBe("leverage");
    expect(advice.reason.es).toContain("más fácil");
  });

  it("starts light when the exercise has no history", () => {
    const advice = progressionFor({ ...DUMBBELL, days: [] });
    expect(advice.verdict).toBe("first_time");
    expect(advice.weightKg).toBeNull();
    expect(advice.evidence.day).toBeNull();
  });

  it("exposes the numbers it used, so the coach can explain the verdict", () => {
    const advice = progressionFor({
      ...DUMBBELL,
      days: summariseExerciseDays([s("2026-10-08", 22, 12)]),
    });
    expect(advice.evidence).toMatchObject({
      day: "2026-10-08",
      sets: 1,
      topWeightKg: 22,
      lastReps: 12,
      minReps: 12,
      maxReps: 12,
      targetMin: 8,
      targetMax: 12,
      incrementKg: 1,
      maxLoadKg: 24,
    });
  });

  it("reports the day's rep spread, not just the last set", () => {
    // The screens print "12–9 reps"; the verdict itself reads the WEAKEST set, so
    // the two must come from the same scan of the day.
    const advice = progressionFor({
      ...DUMBBELL,
      days: summariseExerciseDays([
        s("2026-10-05", 22, 12),
        s("2026-10-05", 22, 9),
      ]),
    });
    expect(advice.evidence.minReps).toBe(9);
    expect(advice.evidence.maxReps).toBe(12);
    expect(advice.evidence.lastReps).toBe(9);
  });
});

/** The gear the app is grounded in: a pair of adjustable dumbbells. */
const OWNED: OwnedEquipment[] = [
  {
    id: "eq-dumbbells",
    presetId: "dumbbells-adjustable",
    label: "Mancuernas ajustables",
    capabilities: ["dumbbell"],
    maxLoadKg: 24,
    incrementKg: 1,
    setupMin: 1,
  },
];

describe("progression grounded in the log and the gear the owner owns", () => {
  /** Dumbbell row, as the app would ask it (row traits + resolved rep range). */
  const ask = (
    sets: TLSet[],
    over: Partial<Parameters<typeof progressionAdviceFor>[0]> = {},
  ) =>
    progressionAdviceFor({
      exerciseId: "dumbbell-row",
      loadType: "dumbbell",
      progressionAxes: ["load", "reps"],
      targetReps: { min: 8, max: 12 },
      sets,
      inventory: OWNED,
      ...over,
    });

  it("takes the increment and the ceiling from the inventory, not from a constant", () => {
    const advice = ask([s("2026-10-05", 22, 12), s("2026-10-05", 22, 12)]);
    expect(advice.verdict).toBe("increase_load");
    expect(advice.weightKg).toBe(23);
    expect(advice.evidence.incrementKg).toBe(1);
    expect(advice.evidence.maxLoadKg).toBe(24);

    // Same log, gear that tops out AT the load he used: +1 kg would not fit on
    // the dumbbell he owns, so the lever takes over.
    const capped = ask([s("2026-10-05", 22, 12), s("2026-10-05", 22, 12)], {
      inventory: [{ ...OWNED[0]!, maxLoadKg: 22 }],
    });
    expect(capped.verdict).toBe("escalate_variant");
    expect(capped.weightKg).toBe(22);
    // The movement's own remaining lever (a row is ["load", "reps"]): beating
    // the top of the range with the same load, not an invented variant.
    expect(capped.axis).toBe("reps");

    // And with 23 kg on the shelf the raise is real, not a refusal: the ceiling
    // is a limit on what he can LOAD, not a reason to stop progressing.
    const nextStep = ask([s("2026-10-05", 22, 12), s("2026-10-05", 22, 12)], {
      inventory: [{ ...OWNED[0]!, maxLoadKg: 23 }],
    });
    expect(nextStep.verdict).toBe("increase_load");
    expect(nextStep.weightKg).toBe(23);
  });

  it("leaves today out of the verdict, because today's load belongs to the mark", () => {
    // Monday: every set at the top of the range. Today: overloaded, below the
    // floor. Without the exclusion the same log reads "reduce" — with it, the
    // verdict is the one about the NEXT session (raise), which is the question
    // the session screen asks.
    const sets = [
      s("2026-10-05", 22, 12),
      s("2026-10-05", 22, 12),
      s("2026-10-08", 30, 5),
      s("2026-10-08", 30, 6),
    ];
    expect(ask(sets, { excludeDay: "2026-10-08" }).verdict).toBe(
      "increase_load",
    );
    expect(ask(sets).verdict).toBe("reduce");
  });

  it("calls the first session what it is instead of guessing a load", () => {
    const advice = ask([s("2026-10-08", 30, 8)], { excludeDay: "2026-10-08" });
    expect(advice.verdict).toBe("first_time");
    expect(advice.weightKg).toBeNull();
    expect(advice.evidence.day).toBeNull();
  });

  it("only reads the exercise it was asked about", () => {
    const sets = [
      s("2026-10-05", 22, 12),
      s("2026-10-05", 22, 12),
      // Another exercise logged the same day must not enter the verdict.
      { ...s("2026-10-05", 5, 5), exerciseId: "lateral-raise" },
    ];
    expect(ask(sets).verdict).toBe("increase_load");
    expect(ask(sets).evidence.topWeightKg).toBe(22);
  });

  it("sends a bodyweight movement to a lever instead of inventing kilos", () => {
    const advice = progressionAdviceFor({
      exerciseId: "push-ups",
      loadType: "bodyweight",
      progressionAxes: ["reps", "leverage", "tempo", "volume"],
      targetReps: { min: 8, max: 12 },
      sets: [
        { ...s("2026-10-06", null, 12), exerciseId: "push-ups" },
        { ...s("2026-10-06", null, 13), exerciseId: "push-ups" },
      ],
      inventory: OWNED,
    });
    expect(advice.verdict).toBe("escalate_variant");
    expect(advice.weightKg).toBeNull();
    expect(advice.axis).toBe("leverage");
  });
});

describe("the verdict reaches the owner in his own language", () => {
  const adviceFor = (
    sets: TLSet[],
    over: Partial<Parameters<typeof progressionAdviceFor>[0]> = {},
  ) =>
    progressionAdviceFor({
      exerciseId: "dumbbell-row",
      loadType: "dumbbell",
      progressionAxes: ["load", "reps"],
      targetReps: { min: 8, max: 12 },
      sets,
      inventory: OWNED,
      ...over,
    });

  afterEach(() => setLanguage("es"));

  it("says the exact kilos, in the owner's words", () => {
    const advice = adviceFor([
      s("2026-10-05", 22, 12),
      s("2026-10-05", 22, 12),
    ]);
    const sentence = progressionSentence(advice, "kg");
    expect(sentence).toContain("23 kg");
    expect(sentence).toContain("22 kg");
    expect(sentence).toContain("12");
    // `formatWeight` carries the unit: the copy must not append a second one.
    expect(sentence).not.toContain("kg kg");
    // The sentence is built from `evidence`, so it cannot drift from the verdict.
    expect(advice.verdict).toBe("increase_load");
  });

  it("names the lever when kilos are exhausted instead of naming an axis id", () => {
    const advice = adviceFor(
      [s("2026-10-05", 22, 12), s("2026-10-05", 22, 12)],
      {
        inventory: [{ ...OWNED[0]!, maxLoadKg: 22 }],
      },
    );
    expect(advice.verdict).toBe("escalate_variant");
    const sentence = progressionSentence(advice, "kg");
    expect(sentence).toContain("22 kg"); // the cap he actually owns
    expect(progressionLever(advice)).toBe("Siguiente palanca: repeticiones.");
    // The agent-channel string keeps the raw axis; the owner never sees it.
    expect(advice.reason.es).toContain("reps");
    // …and the owner's copy spells the lever out, never the axis id.
    expect(progressionLever(advice)).toContain("repeticiones");
    expect(sentence).not.toContain("leverage");
  });

  it("names no second load when the verdict is to hold what he is using", () => {
    // Straight from the owner's log: his top set of the day was 104.3 kg and the
    // last one 81 kg. The field inherits the last logged weight, so printing the
    // verdict's own number here put two different kilos on one card.
    const advice = adviceFor([
      s("2026-10-04", 104.3, 10),
      s("2026-10-04", 81, 5),
    ]);
    expect(advice.verdict).toBe("repeat");
    const sentence = progressionSentence(advice, "kg");
    expect(sentence).toContain("5–10");
    expect(sentence).not.toContain("kg");
  });

  it("sends a bodyweight movement below the floor to an easier version", () => {
    const advice = progressionAdviceFor({
      exerciseId: "chin-ups",
      loadType: "bodyweight",
      progressionAxes: ["reps", "leverage", "tempo", "volume"],
      targetReps: { min: 8, max: 12 },
      sets: [
        { ...s("2026-10-07", null, 5), exerciseId: "chin-ups" },
        { ...s("2026-10-07", null, 6), exerciseId: "chin-ups" },
      ],
      inventory: OWNED,
    });
    expect(advice.verdict).toBe("regress_variant");
    expect(progressionLever(advice)).toContain("más fácil");
    expect(progressionSentence(advice, "kg")).toContain("6");
  });

  it("mirrors into English without leaving the dictionary", () => {
    setLanguage("en");
    const advice = adviceFor([
      s("2026-10-05", 22, 12),
      s("2026-10-05", 22, 12),
    ]);
    expect(progressionSentence(advice, "kg")).toContain("next time");
  });

  it("is honest with no history at all", () => {
    const advice = adviceFor([], {});
    expect(advice.verdict).toBe("first_time");
    expect(progressionSentence(advice, "kg")).toBe(
      "Sin sesión anterior de este ejercicio.",
    );
    expect(progressionLever(advice)).toBeNull();
  });
});

describe("the local coach can reach the verdict", () => {
  const spec = TOOL_SPECS.find(
    (s) => s.function.name === "get_progression_verdict",
  );

  it("offers it as a read-only tool with an optional exercise id", () => {
    expect(spec).toBeDefined();
    const params = spec!.function.parameters as {
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties: boolean;
    };
    expect(Object.keys(params.properties)).toEqual(["exerciseId"]);
    // Optional: without it the coach gets every slot of today's session.
    expect(params.required ?? []).toEqual([]);
    expect(params.additionalProperties).toBe(false);
  });

  it("says what it is NOT, so the model does not read it as today's load", () => {
    expect(spec!.function.description).toContain(
      "Today's own sets are excluded",
    );
    expect(spec!.function.description).toContain("NEXT time");
  });

  it("is named in the system prompt the runtime sends", () => {
    expect(buildSystemPrompt()).toContain("get_progression_verdict");
  });

  it("answers for every slot of today's session in one call", () => {
    const advice = progressionAdviceFor({
      exerciseId: "dumbbell-row",
      loadType: "dumbbell",
      progressionAxes: ["load", "reps"],
      targetReps: { min: 8, max: 12 },
      sets: [s("2026-10-05", 22, 12), s("2026-10-05", 22, 12)],
      inventory: OWNED,
    });
    const payload = progressionVerdictTool({
      exerciseId: null,
      exerciseIds: ["dumbbell-row", "push-ups"],
      adviceFor: (id) => (id === "dumbbell-row" ? advice : null),
      nameOf: (id) => id.toUpperCase(),
    });
    expect(payload.verdicts).toHaveLength(2);
    expect(payload.verdicts[0]).toMatchObject({
      exerciseId: "dumbbell-row",
      name: "DUMBBELL-ROW",
      verdict: "increase_load",
      weightKg: 23,
      axis: "load",
    });
    // The numbers travel with the verdict: a model may explain, never guess.
    expect(payload.verdicts[0]!.evidence).toMatchObject({
      day: "2026-10-05",
      incrementKg: 1,
      maxLoadKg: 24,
    });
    expect(payload.verdicts[0]!.reason!.es).toContain("23");
    expect(payload.basis).toContain("D/F");
  });

  it("refuses to invent a verdict for an exercise outside today's plan", () => {
    const payload = progressionVerdictTool({
      exerciseId: "barbell-squat",
      exerciseIds: ["dumbbell-row"],
      adviceFor: () => null,
      nameOf: (id) => id,
    });
    expect(payload.verdicts).toEqual([
      {
        exerciseId: "barbell-squat",
        status: "not_in_todays_plan",
        note: "El veredicto solo se calcula para ejercicios de la sesión de hoy.",
      },
    ]);
  });
});
