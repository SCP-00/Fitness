/**
 * Typed-decision contract (`core/training/laya.ts`).
 *
 * Four promises worth testing, and nothing else:
 *   1. the state document is bounded and says so when it truncates,
 *   2. no `choice` question can ever exceed the option ceiling,
 *   3. the deterministic floor is monotone and is what you get by default,
 *   4. a model answer can never make the outcome worse than ignoring it.
 *
 * @module tests/training/laya_contract
 */

import { describe, it, expect } from "vitest";
import {
  LAYA_MAX_OPTIONS,
  LAYA_MIN_CONFIDENCE,
  LAYA_QUESTION_IDS,
  buildLayaQuestions,
  buildLayaState,
  deterministicScores,
  exerciseQuestionId,
  scoresFromLaya,
  type LayaContext,
  type LayaExerciseOption,
  type LayaQuestion,
  type LayaResult,
  type LayaShortlist,
} from "@fitness/bodylab-training";

const context = (over: Partial<LayaContext> = {}): LayaContext => ({
  level: "intermediate",
  goal: "hypertrophy",
  timeBudgetMin: 45,
  readiness: { energy: 3, motivation: 4, soreness: 2 },
  weakness: { chest: 32, lats: 61, quadriceps: 44 },
  weeklyVolume: { chest: 3, lats: 9, quadriceps: 6 },
  fatiguedFamilies: ["quadriceps"],
  gear: ["dumbbell", "bench"],
  note: "me duele el hombro derecho",
  ...over,
});

const option = (id: string, family = "chest"): LayaExerciseOption => ({
  id,
  label: id.replace(/_/g, " "),
  family: family as LayaExerciseOption["family"],
  pattern: "horizontal_push",
  loadType: "dumbbell",
});

const shortlist = (over: Partial<LayaShortlist> = {}): LayaShortlist => ({
  focusFamilies: ["chest", "lats"],
  byFamily: {
    chest: [option("db_press", "chest"), option("push_up", "chest")],
    lats: [option("db_row", "lats"), option("pull_up", "lats")],
  },
  ...over,
});

/** A well-formed, confident answer set for `shortlist()`. */
const confidentResult = (over: Record<string, unknown> = {}): LayaResult => ({
  answers: {
    [LAYA_QUESTION_IDS.focus]: {
      type: "choice",
      choice: "chest",
      probabilities: { chest: 0.86, lats: 0.14 },
      answer_confidence: 0.86,
    },
    [exerciseQuestionId("chest")]: {
      type: "choice",
      choice: "db_press",
      probabilities: { db_press: 0.7, push_up: 0.3 },
      answer_confidence: 0.7,
    },
    [exerciseQuestionId("lats")]: {
      type: "choice",
      choice: "pull_up",
      probabilities: { db_row: 0.4, pull_up: 0.6 },
      answer_confidence: 0.6,
    },
    [LAYA_QUESTION_IDS.volume]: {
      type: "score",
      score: 2,
      probabilities: { "0": 0.05, "1": 0.15, "2": 0.6, "3": 0.15, "4": 0.05 },
      answer_confidence: 0.6,
    },
    [LAYA_QUESTION_IDS.deload]: {
      type: "choice",
      choice: "B",
      probabilities: { A: 0.2, B: 0.8 },
      answer_confidence: 0.8,
    },
    ...over,
  },
});

describe("buildLayaState", () => {
  it("renders the facts a linear bandit cannot see, deterministically", () => {
    const first = buildLayaState(context());
    const second = buildLayaState(context());
    expect(first.text).toBe(second.text);
    expect(first.text).toContain("minutes: 45");
    expect(first.text).toContain("soreness=2");
    expect(first.text).toContain("gear: bench,dumbbell");
    expect(first.text).toContain("fatigued: quadriceps");
    expect(first.text).toContain("note: me duele el hombro derecho");
  });

  it("orders the weakness summary weakest-first, not by family name", () => {
    const { text } = buildLayaState(context());
    expect(text).toMatch(/weakest: chest=32 quadriceps=44 lats=61/);
  });

  it("reports no anthropometric map instead of inventing neutral 50s", () => {
    const { text } = buildLayaState(context({ weakness: {} }));
    expect(text).toContain("weakest: unknown (no anthropometric map)");
  });

  it("truncates on line boundaries and admits it", () => {
    const long = "a".repeat(4000);
    const state = buildLayaState(context({ note: long }));
    expect(state.truncated).toBe(true);
    expect(state.text.length).toBeLessThanOrEqual(1800);
    // Whole lines only: no half-written `key: value`. Keys carry digits
    // (`sets_7d`), so the character class is not just a-z.
    for (const line of state.text.split("\n")) {
      expect(line).toMatch(/^[a-z0-9_]+: /);
    }
    // The note is last, so it is the cheap thing to lose; the core facts stay.
    expect(state.text).toContain("minutes: 45");
    expect(state.text).not.toContain("note:");
  });

  it("does not truncate a normal session", () => {
    const state = buildLayaState(context());
    expect(state.truncated).toBe(false);
    expect(state.families).toContain("chest");
  });

  it("honours an explicit budget", () => {
    const state = buildLayaState(context(), 40);
    expect(state.truncated).toBe(true);
    expect(state.text.length).toBeLessThanOrEqual(40);
  });
});

describe("buildLayaQuestions", () => {
  it("offers one focus option per shortlisted family", () => {
    const q = buildLayaQuestions({
      context: context(),
      shortlist: shortlist(),
    });
    const focus = q[LAYA_QUESTION_IDS.focus];
    expect(focus?.type).toBe("choice");
    if (focus?.type !== "choice") throw new Error("expected a choice");
    expect(Object.keys(focus.criteria)).toEqual(["chest", "lats"]);
    expect(focus.criteria.chest).toContain("a measured weakness");
    expect(focus.criteria.chest).toContain("3 sets in the last 7 days");
  });

  it("asks the deload question with neutral keys, never noul", () => {
    // The checkpoint's `noul` head can follow its own false:/true: labels
    // instead of the state. The documented workaround is a two-option choice.
    const q = buildLayaQuestions({
      context: context(),
      shortlist: shortlist(),
    });
    const deload = q[LAYA_QUESTION_IDS.deload] as LayaQuestion;
    expect(deload.type).toBe("choice");
    if (deload.type !== "choice") throw new Error("expected a choice");
    expect(Object.keys(deload.criteria)).toEqual(["A", "B"]);
    expect(Object.values(q).some((question) => question.type === "noul")).toBe(
      false,
    );
  });

  it("never exceeds the option ceiling, even with 40 candidates", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      option(`ex_${i}`, "chest"),
    );
    const q = buildLayaQuestions({
      context: context(),
      shortlist: shortlist({
        focusFamilies: ["chest", "lats"],
        byFamily: { chest: many, lats: [option("db_row", "lats")] },
      }),
    });
    for (const [id, question] of Object.entries(q)) {
      const count =
        question.type === "choice"
          ? Object.keys(question.criteria).length
          : question.type === "score"
            ? question.criteria.length
            : 1;
      expect(count, `${id} has ${count} options`).toBeLessThanOrEqual(
        LAYA_MAX_OPTIONS,
      );
    }
  });

  it("keys each exercise question by the candidate ids", () => {
    const q = buildLayaQuestions({
      context: context(),
      shortlist: shortlist(),
    });
    const chest = q[exerciseQuestionId("chest")];
    expect(chest?.type).toBe("choice");
    if (chest?.type !== "choice") throw new Error("expected a choice");
    expect(Object.keys(chest.criteria)).toEqual(["db_press", "push_up"]);
  });

  it("skips a shortlisted family with no candidates instead of asking an empty question", () => {
    const q = buildLayaQuestions({
      context: context(),
      shortlist: shortlist({
        focusFamilies: ["chest", "lats", "calves"],
        byFamily: { chest: [option("db_press", "chest")] },
      }),
    });
    expect(q[exerciseQuestionId("calves")]).toBeUndefined();
  });
});

describe("deterministicScores", () => {
  it("is monotone in the caller's own preference order", () => {
    const scores = deterministicScores(shortlist());
    expect(scores.db_press).toBe(1);
    expect(scores.push_up).toBe(0);
    expect(scores.db_row).toBe(1);
    expect(scores.pull_up).toBe(0);
  });

  it("scores a single candidate 1 rather than dividing by zero", () => {
    const scores = deterministicScores(
      shortlist({ byFamily: { chest: [option("db_press", "chest")] } }),
    );
    expect(scores.db_press).toBe(1);
  });

  it("keeps every score inside 0..1", () => {
    for (const value of Object.values(deterministicScores(shortlist()))) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("scoresFromLaya", () => {
  it("falls back to the caller's ordering when there is no model", () => {
    const out = scoresFromLaya({ shortlist: shortlist(), result: null });
    expect(out.source).toBe("fallback");
    expect(out.fallbackReason).toBe("no_model");
    expect(out.scores).toEqual(deterministicScores(shortlist()));
    expect(out.unansweredFamilies).toEqual(["chest", "lats"]);
  });

  it("uses the model's pick and ranks its siblings below it", () => {
    const out = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult(),
    });
    expect(out.source).toBe("model");
    expect(out.fallbackReason).toBeUndefined();
    expect(out.scores.db_press).toBe(1);
    // The sibling keeps the ordering but can never outrank the pick.
    expect(out.scores.push_up).toBeGreaterThanOrEqual(0.3);
    expect(out.scores.push_up).toBeLessThan(0.7);
    expect(out.scores.pull_up).toBe(1);
  });

  it("a low-confidence answer never changes the outcome", () => {
    const floor = deterministicScores(shortlist());
    const out = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult({
        [LAYA_QUESTION_IDS.focus]: {
          type: "choice",
          choice: "lats",
          probabilities: { chest: 0.51, lats: 0.49 },
          answer_confidence: 0.51,
        },
      }),
      confidenceThreshold: 0.9,
    });
    expect(out.source).toBe("fallback");
    expect(out.fallbackReason).toBe("low_confidence");
    expect(out.scores).toEqual(floor);
  });

  it("rejects an answer that names an option nobody offered", () => {
    const out = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult({
        [LAYA_QUESTION_IDS.focus]: {
          type: "choice",
          choice: "chest",
          probabilities: { chest: 1 },
          answer_confidence: 0.99,
        },
        [exerciseQuestionId("chest")]: {
          type: "choice",
          choice: "invented_machine",
          probabilities: { invented_machine: 1 },
          answer_confidence: 0.99,
        },
      }),
    });
    expect(out.source).toBe("model");
    // The whole shortlist is still scored, and the invented pick got nothing.
    expect(out.scores.invented_machine).toBeUndefined();
    expect(out.unansweredFamilies).toEqual(["chest"]);
    expect(out.scores.db_press).toBe(1);
  });

  it("uses a partial answer partially and names the families it lost", () => {
    const result = confidentResult();
    delete result.answers[exerciseQuestionId("lats")];
    const out = scoresFromLaya({ shortlist: shortlist(), result });
    expect(out.source).toBe("model");
    expect(out.unansweredFamilies).toEqual(["lats"]);
    expect(out.scores.db_press).toBe(1);
    // The unanswered family keeps the caller's ordering.
    expect(out.scores.db_row).toBe(1);
    expect(out.scores.pull_up).toBe(0);
  });

  it("treats an empty answer set as no model at all", () => {
    const out = scoresFromLaya({
      shortlist: shortlist(),
      result: { answers: {} },
    });
    expect(out.source).toBe("fallback");
    expect(out.fallbackReason).toBe("no_model");
  });

  it("reads a missing answer_confidence as the top probability", () => {
    const out = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult({
        [LAYA_QUESTION_IDS.focus]: {
          type: "choice",
          choice: "chest",
          probabilities: { chest: 0.9, lats: 0.1 },
        },
      }),
    });
    expect(out.source).toBe("model");
    expect(out.confidences[LAYA_QUESTION_IDS.focus]).toBe(0.9);
  });

  it("reports a deload only when the model asks for one above threshold", () => {
    const deload = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult({
        [LAYA_QUESTION_IDS.deload]: {
          type: "choice",
          choice: "A",
          probabilities: { A: 0.82, B: 0.18 },
          answer_confidence: 0.82,
        },
      }),
    });
    expect(deload.deloadFamilies).toEqual(["chest"]);

    const normal = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult(),
    });
    expect(normal.deloadFamilies).toEqual([]);
  });

  it("keeps every returned score inside 0..1", () => {
    const out = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult(),
    });
    for (const value of Object.values(out.scores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("is stable: the same result twice gives the same scores", () => {
    const a = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult(),
    });
    const b = scoresFromLaya({
      shortlist: shortlist(),
      result: confidentResult(),
    });
    expect(a.scores).toEqual(b.scores);
  });

  it("exposes the confidence gate it applied", () => {
    expect(LAYA_MIN_CONFIDENCE).toBeGreaterThan(0);
    expect(LAYA_MIN_CONFIDENCE).toBeLessThan(1);
  });
});
