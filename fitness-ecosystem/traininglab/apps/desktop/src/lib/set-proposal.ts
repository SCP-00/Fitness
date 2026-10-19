/**
 * What the next set should load — decided by how the previous one ended.
 *
 * Owner's directive (2026-10-11): *propose the weight of the next set by
 * itself, from whether the previous set failed or came close to failure — that
 * is what maximum hypertrophy is.* Sets that end near failure are the
 * productive ones, so the load of the next set exists to make that happen
 * again, not to decorate a progression chart.
 *
 * The declared rule, in one place:
 *
 *   1. no working set yet      → the planner's suggestion (nothing to judge);
 *   2. last set **below the range** → the load was too heavy: −1 step, whatever
 *      the marker says — a set that cannot reach the range is not productive
 *      at any effort;
 *   3. last set **marked F** (to failure) and in/at the range → −10 % back-off
 *      (rounded down to the gear's step): failure is what was asked for, and
 *      repeating the same load on fatigued sets would fall out of the range
 *      anyway — the back-off lets the next set earn the range again;
 *   4. last set **marked D** (near failure), in/at the range → repeat: that is
 *      the target stimulus, and the load that produced it is the load to keep;
 *   5. last set **unmarked**, at/above the top → +1 step: it beat the range
 *      without asking for the effort mark, so it was too easy. An absent
 *      marker is *not* a near-failure (`lib/effort.ts` doctrine), so it can
 *      only earn a raise, never the benefit of the doubt;
 *   6. last set unmarked, inside the range → repeat, with a nudge to mark it.
 *
 * Bodyweight/timed sets (no load) keep `null`: there is nothing to propose.
 * Warm-up sets never count — they are not work (the log's own contract).
 *
 * Pure on purpose: sets in, a number and a bilingual reason out. No React, no
 * clock, no I/O. Tested at the root suite (`tests/training/test_set_proposal`).
 *
 * @module lib/set-proposal
 */

import { markerOf } from "./effort";
import { t, tInterp } from "./i18n";

/**
 * The only fields a decision reads. `TLSet` satisfies it structurally, and a
 * test (or the pending-set preview inside the session) can pass a plain object
 * without fabricating ids and timestamps.
 */
export interface ProposalSet {
  weight?: number | null;
  reps?: number | null;
  effort?: string | null;
  /** Legacy carriers of the mark, read by `markerOf` as a fallback. */
  notes?: string;
  warmup?: boolean;
}

/** What the proposal decided. */
export type ProposalMove =
  /** Nothing logged yet: the planner's first-set suggestion. */
  | "first"
  /** Keep the load that just produced the stimulus (or asked for a mark). */
  | "repeat"
  /** Beat the range without the effort mark: the load was light. */
  | "increase"
  /** Could not reach the range, or failed it: the load was heavy. */
  | "decrease";

export interface NextSetProposal {
  /** Kilograms for the next set (`null` = bodyweight/timed work). */
  weightKg: number | null;
  move: ProposalMove;
  /** Why, already in the app language — the UI only prints it. */
  reason: string;
  /** The numbers the decision used, never hidden from the caller. */
  evidence: {
    lastReps: number | null;
    lastWeightKg: number | null;
    marker: "D" | "F" | null;
    targetMin: number | null;
    targetMax: number | null;
    stepKg: number | null;
  };
}

export interface ProposeNextSetInput {
  /** All sets logged today for this exercise (warm-ups are filtered here). */
  sets: readonly ProposalSet[];
  /** Today's prescribed rep range for the exercise. */
  targetReps: { min: number; max: number } | null;
  /** The gear's own increment for this load type (kg), when known. */
  stepKg: number | null;
  /** The heaviest load the gear can put on this movement (kg), when known. */
  capKg: number | null;
  /** The planner's first-set suggestion (kg) — used only before any set. */
  suggestionKg: number | null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function proposeNextSet(input: ProposeNextSetInput): NextSetProposal {
  const working = input.sets.filter((s) => s.warmup !== true);
  const last: ProposalSet | undefined = working[working.length - 1];
  const evidence = {
    lastReps: null as number | null,
    lastWeightKg: null as number | null,
    marker: null as "D" | "F" | null,
    targetMin: input.targetReps?.min ?? null,
    targetMax: input.targetReps?.max ?? null,
    stepKg: input.stepKg,
  };

  if (!last) {
    return {
      weightKg: input.suggestionKg,
      move: "first",
      reason: input.suggestionKg === null ? t("nextSet.firstBodyweight") : t("nextSet.first"),
      evidence,
    };
  }

  const reps = typeof last.reps === "number" && last.reps > 0 ? last.reps : null;
  const weight =
    typeof last.weight === "number" && last.weight > 0 ? last.weight : null;
  const raw = markerOf(last);
  const marker: "D" | "F" | null = raw === "D" || raw === "F" ? raw : null;
  evidence.lastReps = reps;
  evidence.lastWeightKg = weight;
  evidence.marker = marker;

  // Nothing to adjust on a bodyweight/timed movement: the lever there is the
  // variant, and `lib/progression.ts` owns that decision across sessions.
  if (weight === null) {
    return {
      weightKg: null,
      move: "repeat",
      reason: t("nextSet.bodyweight"),
      evidence,
    };
  }

  const step = input.stepKg && input.stepKg > 0 ? input.stepKg : null;
  const min = input.targetReps?.min ?? null;
  const max = input.targetReps?.max ?? null;
  const clamp = (w: number): number => {
    const capped = input.capKg !== null ? Math.min(w, input.capKg) : w;
    return round1(Math.max(step ?? 0.5, capped));
  };

  // 2 — below the range: too heavy, whatever the badge says.
  if (reps !== null && min !== null && reps < min) {
    const next = step !== null ? clamp(weight - step) : weight;
    return {
      weightKg: next,
      move: next < weight ? "decrease" : "repeat",
      reason: tInterp("nextSet.belowRange", {
        reps,
        min,
        w: round1(next),
      }),
      evidence,
    };
  }

  // 3 — to failure, inside the range: the stimulus is earned; the back-off is
  // what lets the fatigued next set reach the range again.
  if (marker === "F" && step !== null) {
    const next = clamp(Math.floor((weight * 0.9) / step) * step);
    return {
      weightKg: next,
      move: next < weight ? "decrease" : "repeat",
      reason: tInterp("nextSet.backoffF", { w: round1(next), prev: round1(weight) }),
      evidence,
    };
  }

  // 4 — near failure at the load that produced it: repeat.
  if (marker === "D" || marker === "F") {
    return {
      weightKg: weight,
      move: "repeat",
      reason: marker === "F" ? t("nextSet.holdF") : t("nextSet.holdD"),
      evidence,
    };
  }

  // 5 — beat the top of the range without ever asking for the mark: light.
  if (reps !== null && max !== null && reps >= max && step !== null) {
    const next = clamp(weight + step);
    if (next > weight) {
      return {
        weightKg: next,
        move: "increase",
        reason: tInterp("nextSet.raiseTop", {
          reps,
          max,
          w: round1(next),
        }),
        evidence,
      };
    }
    // At the gear's ceiling: the load cannot move, so the honest answer is the
    // same number plus the reason it is stuck (progression across sessions
    // owns the harder-variant lever, see lib/progression.ts).
    return {
      weightKg: weight,
      move: "repeat",
      reason: tInterp("nextSet.capped", { cap: round1(input.capKg ?? weight) }),
      evidence,
    };
  }

  // 6 — inside the range, unmarked: keep it and ask for the mark that makes
  // the next proposal trust it.
  return {
    weightKg: weight,
    move: "repeat",
    reason: t("nextSet.unmarked"),
    evidence,
  };
}
