/**
 * The payloads the local coach's tools answer with — pure, so they are testable.
 *
 * The tool loop itself lives in `lib/llm.ts` and its executor inside
 * `app/store.tsx` (it needs the live store). What the model *reads* is decided
 * here, where a root-suite test can pin it: the same JSON the store sends, with
 * no React in the way.
 *
 * `progressionVerdictTool` is the newest of them (2026-10-13). It exists because
 * the multi-day verdict used to be reachable only from the agent channel
 * (`scripts/fitness-mcp-server.mjs` → `read_progression`); the owner's own coach
 * — the model that proposes today's session — had no way to ask what the last
 * sessions said about an exercise, so it could re-propose a load the log had
 * already outgrown.
 *
 * @module lib/coach-tools
 */

import type { ProgressionAdvice } from "./progression";

/** One exercise's answer inside `progressionVerdictTool`. */
export interface CoachProgressionVerdict {
  exerciseId: string;
  /** Display name, resolved by the caller (the store knows the catalog). */
  name?: string;
  status?: "not_in_todays_plan";
  note?: string;
  verdict?: ProgressionAdvice["verdict"];
  weightKg?: number | null;
  axis?: ProgressionAdvice["axis"];
  /** Bilingual on purpose: the agent channel and the coach share this shape. */
  reason?: ProgressionAdvice["reason"];
  evidence?: ProgressionAdvice["evidence"];
}

export interface CoachProgressionPayload {
  /** What the verdict was computed from — never left implicit. */
  basis: string;
  verdicts: CoachProgressionVerdict[];
}

/**
 * The answer to `get_progression_verdict`.
 *
 * With no `exerciseId`, it reports every slot of today's session in the session's
 * own order — the question a coach actually has ("what should I raise today?"),
 * and one round trip instead of five.
 *
 * An id outside today's plan is answered honestly rather than guessed: the
 * verdict needs the movement's traits and the prescription's rep range, and
 * fabricating a range for an exercise the planner did not choose is how a model
 * gets told a number nobody computed.
 */
export function progressionVerdictTool(input: {
  /** The exercise the model asked about, if it asked about one. */
  exerciseId?: string | null;
  /** Today's session, in order. */
  exerciseIds: readonly string[];
  adviceFor: (exerciseId: string) => ProgressionAdvice | null;
  nameOf: (exerciseId: string) => string;
}): CoachProgressionPayload {
  const wanted =
    input.exerciseId && input.exerciseId.length > 0
      ? [input.exerciseId]
      : [...input.exerciseIds];

  return {
    basis:
      "días anteriores a hoy (las series de hoy no cuentan: dentro del día decide la marca D/F)",
    verdicts: wanted.map((exerciseId) => {
      const advice = input.adviceFor(exerciseId);
      if (!advice) {
        return {
          exerciseId,
          status: "not_in_todays_plan" as const,
          note: "El veredicto solo se calcula para ejercicios de la sesión de hoy.",
        };
      }
      return {
        exerciseId,
        name: input.nameOf(exerciseId),
        verdict: advice.verdict,
        weightKg: advice.weightKg,
        axis: advice.axis,
        reason: advice.reason,
        evidence: advice.evidence,
      };
    }),
  };
}
