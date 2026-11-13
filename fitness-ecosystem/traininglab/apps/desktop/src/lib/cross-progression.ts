/**
 * Cross-exercise progression & strength transfer.
 *
 * Owner's directive (2026-11-13): when an exercise is performed for the first
 * time (no prior sets and no PR in the user's log), the app should NOT leave
 * the field blank or say "0 kg". It should infer a realistic starting weight
 * and rep target based on brother exercises already logged by the user with
 * proven biomechanical strength transfer ratios.
 *
 * Example:
 *   - User has 1RM of 100 kg on Barbell Bench Press
 *   - User trains Incline DB Press for the first time
 *   - Transfer prior: ~0.32x per dumbbell (32 kg e1RM)
 *   - Suggested working set for 8-10 reps (at ~75%): ~24 kg per dumbbell
 *   - Reason: "Estimado 24 kg a partir de tu Press con Barra (1RM 100 kg)"
 *
 * HONESTY NOTE (2026-11-13): the ratios below are **coach priors**, not
 * measurements. No published study gives a validated exercise-to-exercise
 * transfer coefficient for this catalogue, and a single-arm dumbbell ratio
 * depends on limb length, technique and machine leverage. They are therefore
 * presented to the user as an *estimate* that they can override, never as a
 * prescription, and `sourceIsHeuristic` travels with the result so the UI can
 * say so. The only claims backed by literature here are the exercise-selection
 * notes in `exercise-substitutes.ts` (Maeo 2021 / 2023).
 *
 * Pure, mathematical, explainable, and testable.
 *
 * @module lib/cross-progression
 */

import {
  ALL_EXERCISES,
  EXERCISE_TRAITS,
  getTraits,
} from "@fitness/bodylab-exercises";
import { epleyOneRm } from "./records";
import type { TLSet } from "./types";

/** Direct transfer ratios between specific exercises (source -> target). */
/**
 * Heuristic transfer priors (source -> target). See the honesty note above:
 * these are coaching estimates, and every result carries `sourceIsHeuristic`.
 * A wrong prior costs one adjusted warm-up set, which is why the app starts the
 * first set light and lets the logged reps correct the next one.
 */
export const DIRECT_TRANSFER_RATIOS: Record<string, Record<string, number>> = {
  // ── Horizontal Push ───────────────────────────────────────────────────────
  "barbell-bench-press": {
    "incline-bench-press": 0.82,
    "decline-bench-press": 1.05,
    "close-grip-bench": 0.86,
    "dumbbell-bench-press": 0.35, // per dumbbell
    "incline-dumbbell-press": 0.32,
    "machine-bench-press": 0.95,
    "dumbbell-fly": 0.18,
    "cable-crossover": 0.22,
    "dips": 1.05, // total load including bodyweight
  },
  "incline-bench-press": {
    "barbell-bench-press": 1.20,
    "incline-dumbbell-press": 0.38,
    "close-grip-bench": 1.02,
  },
  "dumbbell-bench-press": {
    "barbell-bench-press": 1.40, // 2x dumbbells -> barbell
    "incline-dumbbell-press": 0.88,
    "machine-bench-press": 1.35,
    "dumbbell-fly": 0.50,
  },
  "incline-dumbbell-press": {
    "dumbbell-bench-press": 1.12,
    "incline-bench-press": 1.30,
    "overhead-press": 0.85,
  },

  // ── Squat / Quads ─────────────────────────────────────────────────────────
  "barbell-squat": {
    "front-squat": 0.80,
    "leg-press": 1.65,
    "hack-squat": 1.10,
    "goblet-squat": 0.38, // single dumbbell
    "bulgarian-split-squat": 0.22, // per dumbbell
    "romanian-deadlift": 0.75,
    "walking-lunge": 0.22,
  },
  "front-squat": {
    "barbell-squat": 1.25,
    "hack-squat": 1.35,
    "goblet-squat": 0.45,
    "leg-press": 2.05,
  },
  "leg-press": {
    "barbell-squat": 0.60,
    "hack-squat": 0.68,
    "front-squat": 0.48,
  },
  "hack-squat": {
    "barbell-squat": 0.90,
    "leg-press": 1.50,
    "front-squat": 0.74,
  },

  // ── Hinge / Hamstrings & Glutes ───────────────────────────────────────────
  "deadlift": {
    "romanian-deadlift": 0.72,
    "barbell-row": 0.58,
    "kettlebell-swing": 0.24,
  },
  "romanian-deadlift": {
    "deadlift": 1.38,
    "dumbbell-romanian-deadlift": 0.45,
    "single-leg-rdl": 0.24,
    "seated-leg-curl": 0.55,
  },

  // ── Vertical Pull ─────────────────────────────────────────────────────────
  "pull-ups": {
    "lat-pulldown": 0.95,
    "chin-ups": 1.05,
    "seated-cable-row": 0.88,
  },
  "chin-ups": {
    "pull-ups": 0.95,
    "lat-pulldown": 0.90,
    "barbell-curl": 0.48,
  },
  "lat-pulldown": {
    "pull-ups": 1.05,
    "seated-cable-row": 0.92,
    "straight-arm-pulldown": 0.40,
  },

  // ── Horizontal Pull ───────────────────────────────────────────────────────
  "barbell-row": {
    "dumbbell-row": 0.42, // single arm dumbbell
    "chest-supported-row": 0.40,
    "seated-cable-row": 0.88,
    "t-bar-row": 0.85,
    "lat-pulldown": 0.92,
  },
  "dumbbell-row": {
    "barbell-row": 2.30,
    "chest-supported-row": 0.95,
    "seated-cable-row": 2.10,
  },
  "seated-cable-row": {
    "barbell-row": 1.12,
    "chest-supported-row": 0.45,
    "lat-pulldown": 1.08,
  },

  // ── Vertical Push / Shoulders ─────────────────────────────────────────────
  "overhead-press": {
    "seated-dumbbell-overhead-press": 0.38, // per dumbbell
    "arnold-press": 0.32,
    "lateral-raise": 0.12, // per dumbbell
    "machine-shoulder-press": 0.95,
    "push-press": 1.15,
  },
  "seated-dumbbell-overhead-press": {
    "overhead-press": 1.30,
    "arnold-press": 0.88,
    "lateral-raise": 0.30,
  },

  // ── Arms ──────────────────────────────────────────────────────────────────
  "barbell-curl": {
    "dumbbell-curl": 0.42,
    "incline-dumbbell-curl": 0.36,
    "hammer-curl": 0.46,
    "preacher-curl": 0.88,
    "cable-curl": 0.90,
  },
  "dumbbell-curl": {
    "barbell-curl": 2.35,
    "incline-dumbbell-curl": 0.86,
    "hammer-curl": 1.10,
  },
  "close-grip-bench": {
    "skull-crusher": 0.55,
    "triceps-pushdown": 0.70,
    "overhead-triceps-extension": 0.45,
  },
  "skull-crusher": {
    "close-grip-bench": 1.80,
    "overhead-triceps-extension": 0.82,
    "triceps-pushdown": 1.15,
  },
};

/** Load-type cross multipliers when direct pair is not registered. */
function patternGenericRatio(sourceLoad: string, targetLoad: string): number {
  if (sourceLoad === targetLoad) return 0.90;
  if (sourceLoad === "barbell" && targetLoad === "dumbbell") return 0.36;
  if (sourceLoad === "dumbbell" && targetLoad === "barbell") return 1.40;
  if (sourceLoad === "barbell" && targetLoad === "machine") return 0.95;
  if (sourceLoad === "machine" && targetLoad === "barbell") return 0.95;
  if (sourceLoad === "machine" && targetLoad === "dumbbell") return 0.38;
  if (sourceLoad === "dumbbell" && targetLoad === "machine") return 1.35;
  if (sourceLoad === "cable" && targetLoad === "dumbbell") return 0.45;
  if (sourceLoad === "dumbbell" && targetLoad === "cable") return 1.10;
  return 0.80;
}

export interface InferredLoadResult {
  /** Suggested working weight, kg. `null` for pure bodyweight work. */
  weightKg: number | null;
  /** Estimated 1RM of the target exercise derived from the brother exercise. */
  inferredEst1RmKg: number | null;
  /** Name of the brother exercise that supplied the reference strength. */
  sourceExerciseId: string;
  sourceExerciseName: string;
  sourceBest1RmKg: number;
  transferRatio: number;
  /**
   * Always true today: the ratio is a coaching prior, not a measured constant.
   * On the result rather than in a comment so any surface that shows the number
   * can also label it as an estimate.
   */
  sourceIsHeuristic: true;
  /** Full bilingual explanation of the derivation. */
  reason: string;
}

/**
 * Scan the user's sets to find the best Epley 1RM for each exercise.
 */
export function extractExercise1Rms(
  sets: readonly TLSet[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const set of sets) {
    if (set.warmup) continue;
    const est = epleyOneRm(set.weight ?? null, set.reps ?? null);
    if (est !== null && est > 0) {
      const current = map.get(set.exerciseId) ?? 0;
      if (est > current) {
        map.set(set.exerciseId, est);
      }
    }
  }
  return map;
}

/**
 * Infer starting load for an exercise that has never been logged, using brother
 * exercises from the user's history that share movement patterns and muscle groups.
 */
export function inferStartingLoad(opts: {
  targetExerciseId: string;
  allSets: readonly TLSet[];
  targetReps?: number;
  stepKg?: number | null;
  capKg?: number | null;
  userBodyWeightKg?: number;
  lang?: "es" | "en";
}): InferredLoadResult | null {
  const {
    targetExerciseId,
    allSets,
    targetReps = 10,
    stepKg = 2.5,
    capKg = null,
    lang = "es",
  } = opts;

  const targetEntry = ALL_EXERCISES.find((e) => e.id === targetExerciseId);
  const targetTraits = EXERCISE_TRAITS[targetExerciseId] ?? getTraits(targetExerciseId);
  if (!targetEntry || !targetTraits) return null;

  // Bodyweight or band exercises don't use external kg progression directly
  if (
    targetTraits.loadType === "bodyweight" ||
    targetTraits.loadType === "band" ||
    targetTraits.loadType === "time"
  ) {
    return null;
  }

  const best1Rms = extractExercise1Rms(allSets);
  if (best1Rms.size === 0) return null;

  // 1. Look for direct pair transfer first
  let bestCandidate: {
    sourceId: string;
    source1Rm: number;
    ratio: number;
    priority: number;
  } | null = null;

  for (const [sourceId, source1Rm] of best1Rms.entries()) {
    if (sourceId === targetExerciseId) continue;

    const directTable = DIRECT_TRANSFER_RATIOS[sourceId];
    if (directTable && typeof directTable[targetExerciseId] === "number") {
      const ratio = directTable[targetExerciseId]!;
      bestCandidate = {
        sourceId,
        source1Rm,
        ratio,
        priority: 10,
      };
      break; // highest precision match
    }

    // Reverse lookup in direct table
    const targetTable = DIRECT_TRANSFER_RATIOS[targetExerciseId];
    if (targetTable && typeof targetTable[sourceId] === "number" && targetTable[sourceId]! > 0) {
      const ratio = 1 / targetTable[sourceId]!;
      if (!bestCandidate || bestCandidate.priority < 9) {
        bestCandidate = {
          sourceId,
          source1Rm,
          ratio,
          priority: 9,
        };
      }
    }
  }

  // 2. If no direct pair, look for same movement pattern brother
  if (!bestCandidate) {
    for (const [sourceId, source1Rm] of best1Rms.entries()) {
      if (sourceId === targetExerciseId) continue;
      const sourceTraits = EXERCISE_TRAITS[sourceId] ?? getTraits(sourceId);
      if (!sourceTraits) continue;

      if (sourceTraits.pattern === targetTraits.pattern) {
        const ratio = patternGenericRatio(sourceTraits.loadType, targetTraits.loadType);
        const priority = sourceTraits.loadType === targetTraits.loadType ? 7 : 5;
        if (!bestCandidate || priority > bestCandidate.priority) {
          bestCandidate = {
            sourceId,
            source1Rm,
            ratio,
            priority,
          };
        }
      }
    }
  }

  if (!bestCandidate) return null;

  const sourceEntry = ALL_EXERCISES.find((e) => e.id === bestCandidate!.sourceId);
  const sourceName = sourceEntry ? sourceEntry.name[lang] : bestCandidate.sourceId;

  // Inferred e1RM
  const inferred1Rm = bestCandidate.source1Rm * bestCandidate.ratio;

  // Inverse Epley to working reps with an RIR ~2 safety cushion (0.72 - 0.75 of 1RM)
  const repFactor = 1 + targetReps / 30;
  const rawWorkingWeight = (inferred1Rm / repFactor) * 0.90;

  // Clamp and round to equipment increments
  const step = stepKg ?? 2.5;
  let clamped = Math.max(step, Math.round(rawWorkingWeight / step) * step);
  if (capKg !== null && clamped > capKg) {
    clamped = capKg;
  }

  const reason =
    lang === "es"
      ? `Estimado ${clamped} kg a partir de tu 1RM de ${Math.round(bestCandidate.source1Rm)} kg en ${sourceName} (prior ${(bestCandidate.ratio).toFixed(2)}x, ajústalo si no cuadra)`
      : `Estimated ${clamped} kg from your ${Math.round(bestCandidate.source1Rm)} kg 1RM in ${sourceName} (prior ${(bestCandidate.ratio).toFixed(2)}x, adjust if it feels off)`;

  return {
    weightKg: clamped,
    inferredEst1RmKg: Math.round(inferred1Rm * 10) / 10,
    sourceExerciseId: bestCandidate.sourceId,
    sourceExerciseName: sourceName,
    sourceBest1RmKg: bestCandidate.source1Rm,
    transferRatio: bestCandidate.ratio,
    sourceIsHeuristic: true,
    reason,
  };
}
