/**
 * Warm-up generator — the #1 feature request on r/Hevy since 2021 (validated
 * in `docs/RESEARCH_FEATURE_VALIDATION.md`), and Hevy charges for it.
 *
 * Rules the community expects and this module implements:
 *   • a percentage ramp toward the *first* working set's load — empty bar /
 *     bodyweight first, then 50% × 5, 70% × 3, 85% × 1;
 *   • warm-up sets sit **outside** the working volume (they never count
 *     toward the day's sets, the week's volume or any PR logic);
 *   • their rest is their own (30–45 s, not the working 75–150 s);
 *   • bodyweight/time work and cardio get a mobility line instead of fake
 *     percentages.
 *
 * Pure data, no UI. The consumer tags sets with `warmup: true` (see
 * `TLSet`), and every aggregate in the app must filter them out — that is
 * the contract the tests hold.
 *
 * @module lib/warmup
 */

export interface WarmupSet {
  /** Ordered ramp position (1-based). */
  step: number;
  /** Percent of the first working set's weight (null = no-load line). */
  percent: number | null;
  reps: number;
  /** kg, canonical — already rounded to the gear's increment by the caller. */
  weightKg: number | null;
  /** Own rest, deliberately shorter than working rest. */
  restSec: number;
  note: { en: string; es: string };
}

export interface WarmupInput {
  /** First working set's weight, kg canonical (null = bodyweight/time). */
  firstWeightKg: number | null;
  /** The exercise actually needs load for a ramp. */
  isCardio: boolean;
  /** Working rest, to keep the warm-up clearly shorter. */
  workingRestSec: number;
}

const NOTE = {
  empty: {
    en: "Empty bar / easiest version — groove the pattern",
    es: "Barra vacía / la versión más fácil — graba el patrón",
  },
  ramp: {
    en: "Feel the weight move fast — no grinding",
    es: "Siente la barra moverse rápido — sin batallas",
  },
  last: {
    en: "Last ramp set — it should feel easy, that is the point",
    es: "Última de rampa — debe sentirse fácil, para eso es",
  },
  mobility: {
    en: "Mobility first: move the joints the exercise will use",
    es: "Movilidad primero: mueve las articulaciones que va a usar el ejercicio",
  },
} as const;

/**
 * The classic 50/70/85 ramp (5/3/1 heritage). `null` weight ramps reduce to
 * one mobility line. Deterministic.
 */
export function buildWarmup(input: WarmupInput): WarmupSet[] {
  const rest = Math.min(45, Math.max(30, Math.round(input.workingRestSec / 3)));
  if (input.isCardio || input.firstWeightKg === null || input.firstWeightKg <= 0) {
    return [
      {
        step: 1,
        percent: null,
        reps: 0,
        weightKg: null,
        restSec: rest,
        note: NOTE.mobility,
      },
    ];
  }
  const w = input.firstWeightKg;
  const ramp: { percent: number; reps: number; note: keyof typeof NOTE }[] = [
    { percent: 0, reps: 8, note: "empty" },
    { percent: 50, reps: 5, note: "ramp" },
    { percent: 70, reps: 3, note: "ramp" },
    { percent: 85, reps: 1, note: "last" },
  ];
  return ramp.map((r, i) => ({
    step: i + 1,
    percent: r.percent,
    reps: r.reps,
    weightKg: r.percent === 0 ? 0 : Math.round(w * (r.percent / 100) * 10) / 10,
    restSec: rest,
    note: NOTE[r.note],
  }));
}
