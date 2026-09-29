/**
 * Local decision model — "which exercise next, for me, today".
 *
 * Scope note (owner-confirmed 2026-09-28): this is a model **of the JEV class**
 * — a small, private, locally-trained decision model. It is deliberately NOT
 * JEPA (that is a different, published architecture) and it does not need to
 * be: for choosing the next exercise we need a *contextual decision* that
 * learns from the user's own log, runs in microseconds on a CPU with zero
 * dependencies, and can always explain itself.
 *
 * What it is, concretely: a linear contextual bandit with a hand-set
 * **deterministic prior** (so a brand-new user gets sane choices with zero
 * data — the "works with the AI switched off" requirement) and **online
 * gradient updates** from real set outcomes (so it personalises within a few
 * sessions). Weights are clamped, so no sequence of rewards can make it
 * unstable or uninterpretable.
 *
 * The LLM (when the user opts in) only *narrates* what this model and the
 * deterministic session builder already decided.
 *
 * Pure, state-in/state-out: the model is a plain JSON object the app persists.
 *
 * @module decision
 */

/** Context features, all normalized to 0..1 by the caller. */
export const FEATURE_ORDER = [
  "weaknessGap", // how weak the exercise's main muscle family is
  "weeklyGap", // how far below its rolling weekly target it is
  "freshness", // days since that family was last trained
  "readinessFit", // 1 = suits today's energy/soreness, 0 = fights it
  "variety", // 1 = movement pattern not used yet today
  "preference", // how often the user has chosen/completed it before
  "cheapness", // 1 = low setup/time cost
] as const;

export type DecisionFeature = (typeof FEATURE_ORDER)[number];
export type DecisionFeatures = Record<DecisionFeature, number>;

/**
 * Hand-set priors, in `FEATURE_ORDER`. They encode the coaching logic that a
 * good trainer applies before knowing anything about you: train the weak and
 * the under-trained, respect freshness, respect readiness, keep variety,
 * prefer what you actually stick to, and keep the setup cheap.
 */
export const PRIOR_WEIGHTS: readonly number[] = [
  0.9, 1.0, 0.6, 0.8, 0.5, 0.4, 0.3,
];

/** Weights may drift from the prior, but only this far (stability guard). */
export const WEIGHT_LIMIT = 2;
export const BIAS_LIMIT = 1.5;

export interface DecisionModel {
  version: 1;
  /** One weight per entry of FEATURE_ORDER. */
  weights: number[];
  /** Per-exercise bias learned from outcomes (bounded). */
  biases: Record<string, number>;
  /** How many outcomes have been folded in (for UI honesty). */
  updates: number;
}

export function emptyModel(): DecisionModel {
  return { version: 1, weights: [...PRIOR_WEIGHTS], biases: {}, updates: 0 };
}

/** Coerce anything loaded from storage into a valid model. */
export function normalizeModel(raw: unknown): DecisionModel {
  if (raw === null || typeof raw !== "object") return emptyModel();
  const o = raw as Partial<DecisionModel>;
  const weights =
    Array.isArray(o.weights) && o.weights.length === FEATURE_ORDER.length
      ? o.weights.map((w) =>
          clamp(
            typeof w === "number" && Number.isFinite(w) ? w : 0,
            -WEIGHT_LIMIT,
            WEIGHT_LIMIT,
          ),
        )
      : [...PRIOR_WEIGHTS];
  const biases: Record<string, number> = {};
  if (o.biases && typeof o.biases === "object") {
    for (const [k, v] of Object.entries(o.biases)) {
      if (typeof v === "number" && Number.isFinite(v))
        biases[k] = clamp(v, -BIAS_LIMIT, BIAS_LIMIT);
    }
  }
  return {
    version: 1,
    weights,
    biases,
    updates: typeof o.updates === "number" && o.updates >= 0 ? o.updates : 0,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function vector(features: DecisionFeatures): number[] {
  return FEATURE_ORDER.map((f) => clamp(features[f] ?? 0, 0, 1));
}

/** Scale that maps the raw dot product into 0..1 without losing ordering. */
function scaleOf(model: DecisionModel): number {
  const absSum = model.weights.reduce((acc, w) => acc + Math.abs(w), 0);
  return 2 * (absSum + BIAS_LIMIT);
}

/** Raw preference for one exercise in one context. */
export function rawScore(
  model: DecisionModel,
  features: DecisionFeatures,
  exerciseId: string,
): number {
  const x = vector(features);
  let raw = model.biases[exerciseId] ?? 0;
  for (let i = 0; i < x.length; i++) raw += model.weights[i]! * x[i]!;
  return raw;
}

/** 0..1 preference (0.5 = neutral), comparable with `modelScores` consumers. */
export function scoreExercise(
  model: DecisionModel,
  features: DecisionFeatures,
  exerciseId: string,
): number {
  return clamp(
    0.5 + rawScore(model, features, exerciseId) / scaleOf(model),
    0,
    1,
  );
}

export interface Explanation {
  /** A context feature, or the exercise's own learned bias. */
  feature: DecisionFeature | "bias";
  value: number;
  weight: number;
  /** Signed contribution to (score - 0.5); the parts sum to exactly that. */
  contribution: number;
}

/** Why this exercise scored what it did — the explainability contract. */
export function explain(
  model: DecisionModel,
  features: DecisionFeatures,
  exerciseId: string,
): Explanation[] {
  const x = vector(features);
  const scale = scaleOf(model);
  const bias = model.biases[exerciseId] ?? 0;
  const parts: Explanation[] = FEATURE_ORDER.map((feature, i) => ({
    feature,
    value: x[i]!,
    weight: model.weights[i]!,
    contribution: (model.weights[i]! * x[i]!) / scale,
  }));
  parts.push({
    feature: "bias",
    value: 1,
    weight: bias,
    contribution: bias / scale,
  });
  return parts;
}

export interface RankedCandidate {
  exerciseId: string;
  score: number;
  explanation: Explanation[];
}

/** Rank candidates for one decision context, best first (stable by id). */
export function rankCandidates(
  model: DecisionModel,
  featuresOf: (exerciseId: string) => DecisionFeatures,
  exerciseIds: string[],
): RankedCandidate[] {
  return exerciseIds
    .map((exerciseId) => {
      const f = featuresOf(exerciseId);
      return {
        exerciseId,
        score: scoreExercise(model, f, exerciseId),
        explanation: explain(model, f, exerciseId),
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.exerciseId.localeCompare(b.exerciseId),
    );
}

// ── Learning from real outcomes ─────────────────────────────────────────────

export interface SetOutcome {
  /** Reps actually completed on the working sets (average). */
  avgReps: number;
  /** Prescribed rep range for the slot. */
  repsMin: number;
  repsMax: number;
  /** Working sets completed vs prescribed. */
  setsDone: number;
  setsPrescribed: number;
  /** Optional: how the user rated the session (1 hard … 5 easy). */
  rpe?: number;
}

/**
 * Reward in -1..1 from a logged slot.
 *   +1 = hit the top of the range on every prescribed set (progress next time)
 *    0 = exactly as prescribed
 *   -1 = missed the bottom of the range or abandoned the slot
 */
export function rewardFromOutcome(o: SetOutcome): number {
  const completion =
    o.setsPrescribed > 0 ? clamp(o.setsDone / o.setsPrescribed, 0, 1) : 1;
  const range = Math.max(1, o.repsMax - o.repsMin + 1);
  const repPosition = clamp((o.avgReps - o.repsMin + 1) / range, 0, 1); // 0 at/below min, 1 at max
  const effort = o.rpe === undefined ? 0 : clamp((3 - o.rpe) / 2, -1, 1); // easier than expected = +
  const value =
    (repPosition - 0.5) * 1.4 + (completion - 1) * 0.6 + effort * 0.2;
  return clamp(Math.round(value * 1000) / 1000, -1, 1);
}

/**
 * Fold one outcome into the model (one online gradient step).
 * Linear reward model: `w += lr * reward * x`, then clamp. Deterministic.
 */
export function updateModel(
  model: DecisionModel,
  features: DecisionFeatures,
  exerciseId: string,
  reward: number,
  learningRate = 0.06,
): DecisionModel {
  const x = vector(features);
  // A non-finite reward is a logging bug, not a signal: fold in a no-op step
  // so the weights can never become NaN.
  const r = Number.isFinite(reward) ? clamp(reward, -1, 1) : 0;
  const weights = model.weights.map((w, i) =>
    clamp(w + learningRate * r * x[i]!, -WEIGHT_LIMIT, WEIGHT_LIMIT),
  );
  const prevBias = model.biases[exerciseId] ?? 0;
  const biases = {
    ...model.biases,
    [exerciseId]: clamp(prevBias + learningRate * r, -BIAS_LIMIT, BIAS_LIMIT),
  };
  return { version: 1, weights, biases, updates: model.updates + 1 };
}

/**
 * How far each weight has moved from its prior — shown in the UI so the user
 * can see the model learning (and reset it) instead of trusting a black box.
 */
export function drift(
  model: DecisionModel,
): { feature: DecisionFeature; weight: number; prior: number }[] {
  return FEATURE_ORDER.map((feature, i) => ({
    feature,
    weight: Math.round((model.weights[i] ?? 0) * 1000) / 1000,
    prior: PRIOR_WEIGHTS[i]!,
  }));
}
