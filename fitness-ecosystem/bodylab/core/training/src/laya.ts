/**
 * Typed-decision contract — "which exercise next, for me, today", asked as
 * `choice` / `score` / `noul` questions to a **non-autoregressive decision
 * model** (the LAYA family: ModernBERT encoder + a decision head, one forward
 * pass, no text generation) instead of to a language model.
 *
 * Why this module exists. `decision.ts` is a linear contextual bandit: it works
 * with zero data because a human wrote its prior, and it explains itself in
 * microseconds. It cannot read the *words* of a session ("llegué cansado, me
 * duele el hombro derecho, tengo 35 minutos y solo mancuernas"), so it cannot
 * use context a text model gets for free. This module is the seam between the
 * two: it renders the session as a compact document, states the decision as a
 * closed set of typed questions, and turns the answers back into the one thing
 * the deterministic builder already accepts — `BuildSessionInput.modelScores`.
 *
 * **Four rules this contract exists to enforce.** Each one is a documented
 * failure mode of the model family, not a style preference:
 *
 * 1. **Never more than {@link LAYA_MAX_OPTIONS} options in one `choice`.** Options
 *    share a fixed token budget, so accuracy collapses on high-cardinality
 *    questions (measured: 0.425 on a 77-label set against 0.870 for a
 *    proprietary alternative). With 94 exercises in the catalog the decision
 *    MUST be decomposed: family first, then exercise inside that family.
 * 2. **A bounded state.** The encoder window is 512 tokens (1024 on the
 *    multilingual and typed-decisions checkpoints) and it **truncates silently**
 *    — an over-long document returns a confident answer computed on part of it.
 *    {@link buildLayaState} therefore has a character budget and reports
 *    `truncated` instead of quietly lying.
 * 3. **Probabilities mean nothing before calibration.** The checkpoints ship
 *    over-confident (raw ECE 0.466 on the English model), so every consumer must
 *    read `answer_confidence` and honour {@link LAYA_MIN_CONFIDENCE}.
 * 4. **The model proposes; the maths disposes.** The output is *scores*, never a
 *    plan. `session.ts` and `validator.ts` still own gear, families, ceilings,
 *    the time budget and every hard rule. A model answer can never invent an
 *    exercise that the caller did not shortlist.
 *
 * Naming: this is a model **of the LAYA class**. It is not JEV (TypeSafe AI's
 * closed commercial typed-decision model) and it is not JEPA (a different,
 * published architecture). Do not describe it as either.
 *
 * Pure, state-in/state-out, no I/O and no DOM: the caller injects the catalog
 * labels and the app keeps the copy. @module laya
 */

import type { ExperienceLevel, MuscleFamily, TrainingGoal } from "./plan";
import type { FamilyWeakness } from "./generator";
import type { Readiness } from "./session";

// ── The wire format ─────────────────────────────────────────────────────────

/** The three typed primitives the model family answers. */
export type LayaPrimitive = "choice" | "score" | "noul";

/** Pick one key from `criteria`; the answer carries a distribution over all. */
export interface LayaChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
}

/** Place the state on an ordinal rubric, 0..criteria.length-1. */
export interface LayaScoreQuestion {
  type: "score";
  instructions: string;
  criteria: string[];
}

/** One calibrated probability, P(true), with P(false) = 1 - P(true). */
export interface LayaNoulQuestion {
  type: "noul";
  instructions: string;
}

export type LayaQuestion =
  LayaChoiceQuestion | LayaScoreQuestion | LayaNoulQuestion;

/** A question set. Keys are stable ids (`focus`, `volume`, `ex_chest`…). */
export type LayaQuestions = Record<string, LayaQuestion>;

export interface LayaChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  /** Post-temperature confidence in 0..1, when the checkpoint reports one. */
  answer_confidence?: number;
}

export interface LayaScoreAnswer {
  type: "score";
  score: number;
  probabilities: Record<string, number>;
  answer_confidence?: number;
}

export interface LayaNoulAnswer {
  type: "noul";
  /** P(true). */
  noul: number;
  answer_confidence?: number;
}

export type LayaAnswer = LayaChoiceAnswer | LayaScoreAnswer | LayaNoulAnswer;

export interface LayaResult {
  answers: Record<string, LayaAnswer>;
  /** Which endpoint answered, and why — the family's router reports this. */
  routing?: { model?: string; reason?: string };
}

// ── Limits (measured, not guessed) ───────────────────────────────────────────

/**
 * Hard ceiling on options in one `choice` question. Above ~20 the shared
 * per-option token budget leaves so few tokens per label that they stop being
 * distinguishable; the family's own guidance is "keep choice schemas under 20
 * options, or use a two-step coarse-to-fine hierarchy".
 */
export const LAYA_MAX_OPTIONS = 20;

/**
 * Character budget for the state document. The English checkpoint's window is
 * 512 tokens total and the question block has to fit alongside it, so the state
 * gets roughly two thirds of the budget. Spanish text runs longer per token
 * than English, hence the conservative number.
 */
export const LAYA_MAX_STATE_CHARS = 1800;

/**
 * Below this confidence the answer is discarded and the deterministic floor is
 * used. Calibrated confidence is the only gate with signal: the family's
 * `act_probability` head is documented as unusable.
 */
export const LAYA_MIN_CONFIDENCE = 0.45;

/** Question ids, so the app never string-matches a literal. */
export const LAYA_QUESTION_IDS = {
  focus: "focus",
  volume: "volume",
  deload: "deload",
  /** `exerciseQuestionId("chest")` → `"ex_chest"`. */
  exercisePrefix: "ex_",
} as const;

/** Stable question id for a family's exercise choice. */
export function exerciseQuestionId(family: MuscleFamily): string {
  return `${LAYA_QUESTION_IDS.exercisePrefix}${family}`;
}

// ── State ───────────────────────────────────────────────────────────────────

/** Everything the model may read. All of it is already in the app's store. */
export interface LayaContext {
  level: ExperienceLevel;
  goal: TrainingGoal;
  timeBudgetMin: number;
  readiness: Readiness;
  /** 0-100 per family; LOWER = weaker (same semantics as the generator). */
  weakness: FamilyWeakness;
  /** Sets already done per family in the last 7 days (rolling ledger). */
  weeklyVolume?: Partial<Record<MuscleFamily, number>>;
  /** Families to leave alone today (still sore, trained yesterday…). */
  fatiguedFamilies?: MuscleFamily[];
  /** Capability tokens the athlete actually owns. */
  gear?: string[];
  /** 0-100 from BodyLab; low adds a conditioning block. */
  conditioningScore?: number | null;
  /**
   * Free text the user wrote about today (soreness location, a limitation, why
   * the session is short, a rep preference). This is the field a text model
   * reads and a linear bandit cannot — keep it short, it is part of the budget.
   */
  note?: string;
}

export interface LayaState {
  /** The document, one `key: value` line per fact. */
  text: string;
  /** True when the budget cut content — the answer is computed on part of it. */
  truncated: boolean;
  /** Families the document actually mentions, in the order written. */
  families: MuscleFamily[];
}

/** Canonical family order: the catalog's own order, so output is stable. */
export const LAYA_FAMILY_ORDER: readonly MuscleFamily[] = [
  "chest",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "traps",
  "rhomboids",
  "core",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
];

/**
 * The vocabulary the model is trained on. These are **model-facing tokens, not
 * UI copy**: they are a frozen data contract shared with the training pipeline
 * (`ml/laya/gym_decision/schema.py` mirrors this table). Never localise them —
 * the app's i18n owns everything a person reads, the model reads this.
 */
export const LAYA_VOCAB = {
  goals: {
    strength: "strength",
    hypertrophy: "hypertrophy",
    recomposition: "recomposition",
  },
  levels: {
    beginner: "beginner",
    intermediate: "intermediate",
    advanced: "advanced",
  },
  readinessScale: "1=bad 5=great (soreness: 5=fresh)",
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Render the session as a compact document. Facts are emitted in a fixed order
 * and only when they carry information, so the same context always produces
 * byte-identical text (the model has to be deterministic on replay, and the
 * training set is built by this same function).
 *
 * Numbers are rounded to one decimal: the model needs rank, not precision, and
 * every character spent here is a character the question block cannot use.
 */
export function buildLayaState(
  ctx: LayaContext,
  maxChars: number = LAYA_MAX_STATE_CHARS,
): LayaState {
  const lines: string[] = [];
  const families: MuscleFamily[] = [];

  lines.push(
    `goal: ${LAYA_VOCAB.goals[ctx.goal]} | level: ${LAYA_VOCAB.levels[ctx.level]}`,
  );
  lines.push(`minutes: ${Math.max(0, Math.round(ctx.timeBudgetMin))}`);

  const r = ctx.readiness;
  lines.push(
    `readiness: energy=${round1(r.energy)} motivation=${round1(r.motivation)} soreness=${round1(r.soreness)} (1=bad 5=great; soreness 5=fresh)`,
  );

  if (ctx.conditioningScore != null && Number.isFinite(ctx.conditioningScore)) {
    lines.push(`conditioning: ${round1(ctx.conditioningScore)}/100`);
  }

  if (ctx.gear && ctx.gear.length > 0) {
    lines.push(`gear: ${[...ctx.gear].sort().join(",")}`);
  }

  // Weakness, weakest first — a summary needs the order, not all 13 numbers.
  const weakness = LAYA_FAMILY_ORDER.map((family) => ({
    family,
    value: ctx.weakness[family],
  }))
    .filter(
      (e): e is { family: MuscleFamily; value: number } =>
        typeof e.value === "number" && Number.isFinite(e.value),
    )
    .sort((a, b) => a.value - b.value || a.family.localeCompare(b.family));
  if (weakness.length > 0) {
    lines.push(
      `weakest: ${weakness
        .slice(0, 5)
        .map((e) => `${e.family}=${round1(e.value)}`)
        .join(" ")} (0-100, lower=weaker)`,
    );
  } else {
    lines.push("weakest: unknown (no anthropometric map)");
  }

  const weekly = ctx.weeklyVolume ?? {};
  const volume = LAYA_FAMILY_ORDER.filter(
    (f) => typeof weekly[f] === "number" && weekly[f] !== 0,
  );
  if (volume.length > 0) {
    lines.push(
      `sets_7d: ${volume.map((f) => `${f}=${round1(weekly[f] as number)}`).join(" ")}`,
    );
  }

  const fatigued = (ctx.fatiguedFamilies ?? []).filter((f) =>
    LAYA_FAMILY_ORDER.includes(f),
  );
  if (fatigued.length > 0) lines.push(`fatigued: ${fatigued.join(",")}`);

  if (ctx.note && ctx.note.trim().length > 0) {
    lines.push(`note: ${ctx.note.trim().replace(/\s+/g, " ")}`);
  }

  // Truncate on line boundaries: a half-written `key: value` is worse than a
  // missing one, because the model would read a number that belongs to another
  // key. `note` is last on purpose — it is the cheapest thing to lose.
  let text = lines.join("\n");
  let truncated = false;
  if (text.length > maxChars) {
    truncated = true;
    const kept: string[] = [];
    let used = 0;
    for (const line of lines) {
      if (used + line.length + 1 > maxChars) break;
      kept.push(line);
      used += line.length + 1;
    }
    text = kept.join("\n");
  }

  for (const family of LAYA_FAMILY_ORDER) {
    if (new RegExp(`\\b${family}\\b`).test(text)) families.push(family);
  }

  return { text, truncated, families };
}

// ── Questions ───────────────────────────────────────────────────────────────

/** One exercise the model may choose, already filtered by the caller. */
export interface LayaExerciseOption {
  /** Catalog id — the model never sees this, it sees `label`. */
  id: string;
  /** Short human-readable label the model compares. Not localised: see below. */
  label: string;
  family: MuscleFamily;
  pattern: string;
  loadType: string;
  /** Minutes of setup + teardown, rounded. Small cost signal. */
  setupMin?: number;
}

export interface LayaShortlist {
  /** Families the session may open with (gear, fatigue and level already applied). */
  focusFamilies: MuscleFamily[];
  /** Candidates per family. Each list is capped at {@link LAYA_MAX_OPTIONS}. */
  byFamily: Partial<Record<MuscleFamily, LayaExerciseOption[]>>;
}

/**
 * Labels are written in the **catalog's own English names** (`nameEn`) rather
 * than the user's language. Reason: the label set is the model's answer space
 * and it must be stable across a bilingual user and across a training run, and
 * the English checkpoint is the one with the best measured instruction
 * following. The app still *shows* `nameEs`; only the model reads this.
 */
export interface LayaQuestionInput {
  context: LayaContext;
  shortlist: LayaShortlist;
}

/** Why a family is worth programming, as plain words the model can weigh. */
function familyDescription(ctx: LayaContext, family: MuscleFamily): string {
  const bits: string[] = [];
  const w = ctx.weakness[family];
  if (typeof w === "number" && Number.isFinite(w)) {
    if (w < 40) bits.push("a measured weakness");
    else if (w < 60) bits.push("mid-range strength");
    else bits.push("already strong");
  }
  const done = ctx.weeklyVolume?.[family];
  if (typeof done === "number") {
    if (done === 0) bits.push("nothing trained this week");
    else bits.push(`${round1(done)} sets in the last 7 days`);
  }
  if (ctx.fatiguedFamilies?.includes(family)) bits.push("still sore today");
  return bits.length > 0 ? bits.join(", ") : "no data";
}

/**
 * Build the typed question set.
 *
 * Decomposition, in the order the model is asked (the family recommends
 * coarse-to-fine for wide answer spaces, and this is that pattern applied to a
 * 94-exercise catalog):
 *
 *   1. `focus`  — `choice` over the shortlisted families (≤ 13 ≤ limit).
 *   2. `deload` — `choice` with **neutral keys** A/B. Not `noul`: this
 *      checkpoint's `noul` head can follow its own `false:`/`true:` labels
 *      instead of the state, so the documented workaround is a two-option
 *      choice whose yes/no wording lives in the descriptions.
 *   3. `volume` — `score`, an ordinal rubric for the priority family's sets.
 *   4. `ex_<family>` — one `choice` per shortlisted family over its candidates.
 *
 * The two most important questions come first so that a tight token budget
 * drops the trailing per-family choices instead of the decision itself.
 */
export function buildLayaQuestions(input: LayaQuestionInput): LayaQuestions {
  const { context: ctx, shortlist } = input;
  const questions: LayaQuestions = {};

  const focus = shortlist.focusFamilies.slice(0, LAYA_MAX_OPTIONS);
  if (focus.length > 0) {
    const criteria: Record<string, string> = {};
    for (const family of focus)
      criteria[family] = familyDescription(ctx, family);
    questions[LAYA_QUESTION_IDS.focus] = {
      type: "choice",
      instructions:
        "Which muscle family should today's session train first, given the time available and how the athlete feels?",
      criteria,
    };
  }

  questions[LAYA_QUESTION_IDS.deload] = {
    type: "choice",
    instructions:
      "Should today's session be reduced (fewer sets, easier effort) because the athlete is not recovered?",
    criteria: {
      A: "yes, reduce the session",
      B: "no, train as planned",
    },
  };

  questions[LAYA_QUESTION_IDS.volume] = {
    type: "score",
    instructions:
      "How many working sets should the priority family get in today's session?",
    criteria: ["0 to 1 sets", "2 sets", "3 sets", "4 sets", "5 or more sets"],
  };

  for (const family of focus) {
    const candidates = (shortlist.byFamily[family] ?? []).slice(
      0,
      LAYA_MAX_OPTIONS,
    );
    if (candidates.length === 0) continue;
    const criteria: Record<string, string> = {};
    for (const option of candidates) {
      const bits = [
        option.label,
        option.pattern.replace(/_/g, " "),
        option.loadType,
      ];
      if (option.setupMin && option.setupMin >= 2)
        bits.push(`setup ${option.setupMin} min`);
      criteria[option.id] = bits.join(", ");
    }
    questions[exerciseQuestionId(family)] = {
      type: "choice",
      instructions:
        "Which exercise best fits the athlete's gear, the effort available today and this family?",
      criteria,
    };
  }

  return questions;
}

// ── Answers → scores ────────────────────────────────────────────────────────

export interface LayaScoresInput {
  shortlist: LayaShortlist;
  /** The model's result, or `null` when no model is loaded. */
  result: LayaResult | null;
  /** Overrides {@link LAYA_MIN_CONFIDENCE}. */
  confidenceThreshold?: number;
}

/** Why the deterministic floor was used. The app owns the copy for these. */
export type LayaFallbackReason = "no_model" | "low_confidence" | "malformed";

export interface LayaScores {
  /** `exerciseId` → 0..1. Feed straight into `BuildSessionInput.modelScores`. */
  scores: Record<string, number>;
  source: "model" | "fallback";
  /** Post-calibration confidence per answered question (for the honesty panel). */
  confidences: Record<string, number>;
  fallbackReason?: LayaFallbackReason;
  /** Families the model did not answer for; the caller's order still applies. */
  unansweredFamilies: MuscleFamily[];
  /** Families the model judged as deserving a reduced session. */
  deloadFamilies: MuscleFamily[];
}

/**
 * The floor. No model, no learned weights: the caller's own ordering is the
 * prior. A shortlist arrives in preference order (the caller already applied
 * gear, fatigue and level), so the first candidate gets 1 and the last 0.
 *
 * This is deliberately dumber than `decision.ts`. It exists so that "the AI is
 * switched off" is a *named, testable* code path rather than an accident, and
 * so that a below-threshold model answer can never make things worse than
 * ignoring it.
 */
export function deterministicScores(
  shortlist: LayaShortlist,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const family of shortlist.focusFamilies) {
    const candidates = shortlist.byFamily[family] ?? [];
    const n = candidates.length;
    if (n === 0) continue;
    candidates.forEach((option, index) => {
      scores[option.id] = n === 1 ? 1 : round1((n - 1 - index) / (n - 1));
    });
  }
  return scores;
}

function confidenceOf(answer: LayaAnswer | undefined): number {
  if (!answer) return 0;
  if (
    typeof answer.answer_confidence === "number" &&
    Number.isFinite(answer.answer_confidence)
  ) {
    return answer.answer_confidence;
  }
  // No reported confidence: fall back to the top probability, which is the
  // honest reading of "how sure is this distribution".
  if (answer.type === "choice" || answer.type === "score") {
    const probs = Object.values(answer.probabilities ?? {}).filter((p) =>
      Number.isFinite(p),
    );
    if (probs.length === 0) return 0;
    return Math.max(...probs);
  }
  const p = answer.noul;
  return Number.isFinite(p) ? Math.max(p, 1 - p) : 0;
}

/** True when the answer names an option the caller actually offered. */
function answerIsWellFormed(
  answer: LayaAnswer,
  offered: readonly string[],
): boolean {
  if (answer.type === "choice") {
    return typeof answer.choice === "string" && offered.includes(answer.choice);
  }
  if (answer.type === "score") {
    return typeof answer.score === "number" && Number.isFinite(answer.score);
  }
  return typeof answer.noul === "number" && Number.isFinite(answer.noul);
}

/**
 * Turn a model result into `modelScores`, or fall back.
 *
 * Scoring shape: the chosen exercise gets 1.0. Its siblings keep the
 * deterministic ordering but are compressed into 0.3..0.7, so a low-confidence
 * sibling can never outrank the model's own pick while the model's explicit
 * preference still moves the ranking inside every other family. Families the
 * model did not answer for keep the pure deterministic ordering — a partial
 * answer is used partially, never discarded wholesale.
 *
 * The whole set is discarded only when the *focus* answer is missing or below
 * threshold, because that is the one answer the rest of the session hangs on.
 */
export function scoresFromLaya(input: LayaScoresInput): LayaScores {
  const threshold = input.confidenceThreshold ?? LAYA_MIN_CONFIDENCE;
  const floor = deterministicScores(input.shortlist);
  const result = input.result;
  if (!result || !result.answers || typeof result.answers !== "object") {
    return {
      scores: floor,
      source: "fallback",
      confidences: {},
      fallbackReason: "no_model",
      unansweredFamilies: [...input.shortlist.focusFamilies],
      deloadFamilies: [],
    };
  }

  // Same cap `buildLayaQuestions` applied, so the offered keys match exactly.
  const focusKeys = input.shortlist.focusFamilies.slice(0, LAYA_MAX_OPTIONS);

  const focusAnswer = result.answers[LAYA_QUESTION_IDS.focus];
  if (!focusAnswer || !answerIsWellFormed(focusAnswer, focusKeys)) {
    return {
      scores: floor,
      source: "fallback",
      confidences: {},
      fallbackReason: result.answers[LAYA_QUESTION_IDS.focus]
        ? "malformed"
        : "no_model",
      unansweredFamilies: [...input.shortlist.focusFamilies],
      deloadFamilies: [],
    };
  }

  const confidences: Record<string, number> = {};
  for (const [id, answer] of Object.entries(result.answers)) {
    confidences[id] = round1(confidenceOf(answer) * 1000) / 1000;
  }

  const focusConfidence = confidenceOf(focusAnswer);
  if (focusConfidence < threshold) {
    return {
      scores: floor,
      source: "fallback",
      confidences,
      fallbackReason: "low_confidence",
      unansweredFamilies: [...input.shortlist.focusFamilies],
      deloadFamilies: [],
    };
  }

  const scores: Record<string, number> = {};
  const unansweredFamilies: MuscleFamily[] = [];

  for (const family of input.shortlist.focusFamilies) {
    const candidates = input.shortlist.byFamily[family] ?? [];
    if (candidates.length === 0) continue;
    const n = candidates.length;
    const sibling = (index: number) =>
      n === 1 ? 0.7 : 0.3 + 0.4 * ((n - 1 - index) / (n - 1));
    const ids = candidates.map((c) => c.id);
    const answer = result.answers[exerciseQuestionId(family)];

    if (
      !answer ||
      !answerIsWellFormed(answer, ids) ||
      confidenceOf(answer) < threshold
    ) {
      // Unanswered: the caller's own ordering, uncompressed, exactly as if no
      // model had been asked. Compressing it here would silently penalise a
      // family just because the model failed to answer for it.
      unansweredFamilies.push(family);
      for (const option of candidates)
        scores[option.id] = floor[option.id] ?? 0;
      continue;
    }

    const picked = answer.type === "choice" ? answer.choice : ids[0]!;
    candidates.forEach((option, index) => {
      scores[option.id] = option.id === picked ? 1 : round1(sibling(index));
    });
  }

  const deloadAnswer = result.answers[LAYA_QUESTION_IDS.deload];
  const deload =
    deloadAnswer !== undefined &&
    deloadAnswer.type === "choice" &&
    deloadAnswer.choice === "A" &&
    confidenceOf(deloadAnswer) >= threshold;
  const priority = focusAnswer.type === "choice" ? focusAnswer.choice : null;

  return {
    scores,
    source: "model",
    confidences,
    unansweredFamilies,
    deloadFamilies:
      deload && priority && LAYA_FAMILY_ORDER.includes(priority as MuscleFamily)
        ? [priority as MuscleFamily]
        : [],
  };
}
