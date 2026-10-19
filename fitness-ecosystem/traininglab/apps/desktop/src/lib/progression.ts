/**
 * Progression — what to do with an exercise next, decided by the maths.
 *
 * Owner's directive (2026-10-09): *if I hit a lot of reps on an exercise, raise the
 * weight; if raising the weight is not possible, move to a harder variant — isometrics,
 * slower tempo, whatever fits.* That is a rule, and a rule belongs here rather than in
 * a model's prose: the LLM may explain it, it may not compute it. Every verdict below
 * carries the numbers it used, so the coach can say *why* instead of guessing.
 *
 * Inputs are the log and the movement's own vocabulary (its progression axes from
 * `traits.ts`) plus what the owner's gear can actually do (increment, ceiling). Nothing
 * here reads the clock, the network or React: same input, same verdict.
 *
 * @module lib/progression
 */

import { localDayKey } from "./day";
import { epleyOneRm } from "./records";
import { markerOf } from "./effort";
import type { ProgressionAxis } from "@fitness/bodylab-exercises";
import type { TLSet } from "./types";

/** One training day of one exercise, working sets only (warm-ups counted apart). */
export interface ExerciseDaySummary {
  /** Local calendar day, `YYYY-MM-DD` — the same bucketing the weekly ledger uses. */
  day: string;
  /** Working sets (warm-up ramp excluded, as everywhere else in the app). */
  sets: number;
  /** Warm-up sets, kept visible so nothing looks lost. */
  warmupSets: number;
  /** Heaviest working load, kg. `null` = bodyweight or timed work. */
  topWeightKg: number | null;
  /** Working reps, in order. */
  reps: number[];
  /** Reps of the LAST working set — what the prescription compares against. */
  lastReps: number | null;
  /** Seconds of work when the sets are timed holds. */
  seconds: number | null;
  /** Best Epley e1RM of the day, kg (`null` when nothing was loaded). */
  bestEst1RmKg: number | null;
  /** True when any working set of the day was marked to failure (`F`). */
  hadFailure: boolean;
  /** True when any working set was marked near failure (`D`). */
  hadNearFailure: boolean;
}

/** Warm-up sets are excluded from every aggregate (the log's own contract). */
function isWorking(set: TLSet): boolean {
  return set.warmup !== true;
}

/**
 * Group one exercise's sets by local calendar day, oldest first.
 *
 * The day key is the timestamp's first ten characters, which is how the rest of the
 * app buckets days (it stores local-noon ISO strings on purpose, see `lib/symmetry`).
 */
export function summariseExerciseDays(sets: TLSet[]): ExerciseDaySummary[] {
  const byDay = new Map<string, TLSet[]>();
  for (const set of sets) {
    const day = localDayKey(set.timestamp);
    const list = byDay.get(day);
    if (list) list.push(set);
    else byDay.set(day, [set]);
  }

  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, daySets]) => {
      const working = daySets
        .filter(isWorking)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const reps = working
        .map((s) => s.reps)
        .filter((r): r is number => typeof r === "number" && r > 0);
      const weights = working
        .map((s) => s.weight)
        .filter((w): w is number => typeof w === "number" && w > 0);
      const seconds = working.reduce(
        (acc, s) =>
          acc + (typeof s.durationSec === "number" ? s.durationSec : 0),
        0,
      );
      let best: number | null = null;
      for (const s of working) {
        const est = epleyOneRm(s.weight, s.reps);
        if (est !== null) best = best === null ? est : Math.max(best, est);
      }
      return {
        day,
        sets: working.length,
        warmupSets: daySets.length - working.length,
        topWeightKg: weights.length > 0 ? Math.max(...weights) : null,
        reps,
        lastReps: reps.length > 0 ? reps[reps.length - 1]! : null,
        seconds: seconds > 0 ? seconds : null,
        bestEst1RmKg: best,
        hadFailure: working.some((s) => markerOf(s) === "F"),
        hadNearFailure: working.some((s) => markerOf(s) === "D"),
      };
    })
    .filter((d) => d.sets > 0);
}

/** What the coach should tell the owner to do next. */
export type ProgressionVerdict =
  | "first_time"
  | "increase_load"
  | "escalate_variant"
  | "repeat"
  | "reduce"
  /**
   * Below the range's floor on a movement with no load to take off
   * (bodyweight, timed). Telling the owner to "lighten" a set of chin-ups that
   * only reaches 6 reps would be nonsense: what he needs is an *easier* lever
   * (band, negatives, assisted) until the reps are there. Added 2026-10-09
   * after the real log produced exactly that case.
   */
  | "regress_variant";

export interface ProgressionInput {
  /** Summaries of this exercise, oldest first (`summariseExerciseDays`). */
  days: ExerciseDaySummary[];
  /** Prescribed rep range for today, inclusive. `null` = unknown. */
  targetReps: { min: number; max: number } | null;
  /** How the movement is loaded (`traits.loadType`). */
  loadType: string;
  /** Levers this movement actually has (`traits.progression`). */
  progressionAxes: ProgressionAxis[];
  /** Smallest jump the owner's gear allows for this load type (`null` = none). */
  incrementKg: number | null;
  /** Heaviest load the owner's gear can put on this movement (`null` = unknown). */
  maxLoadKg: number | null;
}

export interface ProgressionAdvice {
  verdict: ProgressionVerdict;
  /** Load to use next time, kg. Only for `increase_load` (and `repeat`/`reduce`). */
  weightKg: number | null;
  /** The lever to pull when the load cannot move any further. */
  axis: ProgressionAxis | null;
  /** Human-readable reason, in the owner's language, with the numbers in it. */
  reason: { en: string; es: string };
  /** The numbers the verdict used — never hidden from the model. */
  evidence: {
    day: string | null;
    sets: number;
    topWeightKg: number | null;
    lastReps: number | null;
    /**
     * Best and worst working set of that day. The decision already rests on
     * the WEAKEST set, so a surface that shows the range ("12–9 reps") tells
     * the owner the same story the verdict read. Added 2026-10-13: the screens
     * needed the spread, not just the last set.
     */
    minReps: number | null;
    maxReps: number | null;
    targetMin: number | null;
    targetMax: number | null;
    incrementKg: number | null;
    maxLoadKg: number | null;
    hadFailure: boolean;
  };
}

/**
 * Order in which to escalate a movement when the load cannot grow.
 *
 * Same load, harder execution first — leverage, then tempo, then time under
 * tension, then range — and then the two ways of adding work: reps and extra
 * volume. Axes the movement does not have are skipped, and `load` is skipped by
 * construction (it is precisely what could not move).
 *
 * `reps` was added to the list on 2026-10-13, and the reason is the owner's own
 * case: adjustable dumbbells that stop at 24 kg. A movement whose only other
 * lever is `reps` (dumbbell rows are `["load", "reps"]`) used to come back with
 * `axis: null` while the sentence said "vía volume" — the one lever he actually
 * has, beating the top of the range with the same load, was named nowhere.
 */
const ESCALATION_ORDER: ProgressionAxis[] = [
  "leverage",
  "tempo",
  "time",
  "range",
  "reps",
  "volume",
];

export function progressionFor(input: ProgressionInput): ProgressionAdvice {
  const {
    days,
    targetReps,
    loadType,
    progressionAxes,
    incrementKg,
    maxLoadKg,
  } = input;
  const last = days.length > 0 ? days[days.length - 1]! : null;
  const dayReps = last?.reps ?? [];
  const maxReps = dayReps.length > 0 ? Math.max(...dayReps) : null;
  const minReps = dayReps.length > 0 ? Math.min(...dayReps) : null;
  const evidence = {
    day: last?.day ?? null,
    sets: last?.sets ?? 0,
    topWeightKg: last?.topWeightKg ?? null,
    lastReps: last?.lastReps ?? null,
    minReps,
    maxReps,
    targetMin: targetReps?.min ?? null,
    targetMax: targetReps?.max ?? null,
    incrementKg,
    maxLoadKg,
    hadFailure: last?.hadFailure ?? false,
  };

  if (!last) {
    return {
      verdict: "first_time",
      weightKg: null,
      axis: null,
      reason: {
        en: "No history for this exercise: start light and leave 2–3 reps in reserve.",
        es: "Sin historial en este ejercicio: empieza ligero y deja 2–3 repeticiones en reserva.",
      },
      evidence,
    };
  }

  const loadable = loadType !== "bodyweight" && loadType !== "time";
  const targetMax = targetReps?.max ?? maxReps;
  const targetMin = targetReps?.min ?? minReps;

  // Did every working set reach the top of the range? The weakest set is what
  // counts: one heroic last set does not mean the prescription was met.
  const reachedTop =
    targetMax !== null && minReps !== null && minReps >= targetMax;

  if (!reachedTop) {
    if (targetMin !== null && maxReps !== null && maxReps < targetMin) {
      if (!loadable) {
        return {
          verdict: "regress_variant",
          weightKg: null,
          axis: "leverage",
          reason: {
            en: `Best set was ${maxReps} reps, below the ${targetMin}-${targetMax} range, and there is no load to take off a ${loadType} movement: use an easier version (band, negatives, assisted) until ${targetMin} clean reps are there.`,
            es: `Tu mejor serie fue de ${maxReps} repeticiones, por debajo del rango ${targetMin}-${targetMax}, y en un movimiento ${loadType} no hay carga que quitar: usa una versión más fácil (banda, negativas, asistido) hasta llegar a ${targetMin} repeticiones limpias.`,
          },
          evidence,
        };
      }
      return {
        verdict: "reduce",
        weightKg: last.topWeightKg,
        axis: null,
        reason: {
          en: `Best set was ${maxReps} reps, below the ${targetMin}-${targetMax} range: repeat or lighten the load before adding anything.`,
          es: `Tu mejor serie fue de ${maxReps} repeticiones, por debajo del rango ${targetMin}-${targetMax}: repite o baja la carga antes de añadir nada.`,
        },
        evidence,
      };
    }
    return {
      verdict: "repeat",
      weightKg: last.topWeightKg,
      axis: null,
      reason: {
        en: `Repeat the load and add reps: ${minReps ?? "?"}–${maxReps ?? "?"} of a ${targetMin ?? "?"}-${targetMax ?? "?"} range so far.`,
        es: `Repite la carga y suma repeticiones: llevas ${minReps ?? "?"}–${maxReps ?? "?"} de un rango ${targetMin ?? "?"}-${targetMax ?? "?"}.`,
      },
      evidence,
    };
  }

  // Top of the range reached. Can the LOAD move?
  const top = last.topWeightKg;
  const step = incrementKg ?? (loadType === "barbell" ? 2.5 : null);
  const nextWeight = top !== null && step !== null ? round1(top + step) : null;
  const withinGear =
    nextWeight !== null && (maxLoadKg === null || nextWeight <= maxLoadKg);

  if (loadable && top !== null && nextWeight !== null && withinGear) {
    return {
      verdict: "increase_load",
      weightKg: nextWeight,
      axis: "load",
      reason: {
        en: `Every set reached ${targetMax} reps: +${step} kg → ${nextWeight} kg (was ${top} kg).`,
        es: `Todas las series llegaron a ${targetMax} repeticiones: +${step} kg → ${nextWeight} kg (antes ${top} kg).`,
      },
      evidence,
    };
  }

  // No headroom: escalate along a lever the movement actually has.
  const axis =
    ESCALATION_ORDER.find((a) => a !== "load" && progressionAxes.includes(a)) ??
    null;

  const gearNote =
    loadable && top !== null && maxLoadKg !== null && nextWeight !== null
      ? {
          en: ` your gear tops out at ${maxLoadKg} kg`,
          es: ` tu material llega como máximo a ${maxLoadKg} kg`,
        }
      : { en: "", es: "" };

  return {
    verdict: "escalate_variant",
    weightKg: top,
    axis,
    reason: {
      en: `Top of the range reached and the load cannot grow${gearNote.en}: keep the load and make the movement harder via ${axis ?? "volume"}.`,
      es: `Llegaste al techo del rango y la carga no puede subir${gearNote.es}: mantén la carga y haz el movimiento más difícil vía ${axis ?? "volume"}.`,
    },
    evidence,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
