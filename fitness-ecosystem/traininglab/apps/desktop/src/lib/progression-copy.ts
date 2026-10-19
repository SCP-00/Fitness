/**
 * The words of the cross-session verdict.
 *
 * `lib/progression.ts` decides (raise / escalate / repeat / rebuild / easier
 * variant) and hands back the numbers it used; this module turns that into the
 * sentence the owner reads, in his language. Pure on purpose — the component
 * only renders — because this is the half of the feature the owner actually
 * sees, and a sentence built from `evidence` is testable from the root suite
 * while a JSX tree is not.
 *
 * Deliberately NOT `advice.reason`: that string is written for the agent channel
 * and names the progression axis by its id (`vía leverage`). The screen composes
 * its own copy from the same numbers, so the two cannot disagree and neither one
 * has to bend to the other's audience.
 *
 * @module lib/progression-copy
 */

import { t, tInterp } from "./i18n";
import { formatWeight, type WeightUnit } from "./units";
import type { ProgressionAdvice, ProgressionVerdict } from "./progression";
import type { ProgressionAxis } from "@fitness/bodylab-exercises";

/** Verdict → its label key. Literal keys on purpose: the dictionary test reads them. */
export const VERDICT_KEY: Record<ProgressionVerdict, string> = {
  increase_load: "progress.verdict.increase_load",
  escalate_variant: "progress.verdict.escalate_variant",
  repeat: "progress.verdict.repeat",
  reduce: "progress.verdict.reduce",
  regress_variant: "progress.verdict.regress_variant",
  first_time: "progress.verdict.first_time",
};

/** The lever's name in the owner's language (the axis ids are English). */
export const AXIS_KEY: Record<ProgressionAxis, string> = {
  load: "progress.axis.load",
  reps: "progress.axis.reps",
  leverage: "progress.axis.leverage",
  tempo: "progress.axis.tempo",
  time: "progress.axis.time",
  range: "progress.axis.range",
  volume: "progress.axis.volume",
};

/** The axis, spelled out; `null` falls back to volume (what the lib assumes). */
export function axisLabel(axis: ProgressionAxis | null): string {
  return t(AXIS_KEY[axis ?? "volume"]);
}

/** `null`-safe display of a weight, in the unit the screens are using. */
function weightLabel(kg: number | null, unit: WeightUnit): string {
  return kg === null ? "—" : formatWeight(kg, unit);
}

/** A number that may be missing, printed as an em dash instead of a lie. */
function num(value: number | null): string {
  return value === null ? "—" : String(value);
}

/**
 * The sentence, built from the numbers the verdict used. One branch per verdict,
 * so a new verdict is a deliberate addition here and not a silent fallback.
 */
export function progressionSentence(
  advice: ProgressionAdvice,
  unit: WeightUnit,
): string {
  const e = advice.evidence;
  switch (advice.verdict) {
    case "increase_load":
      return tInterp("progress.increase", {
        max: num(e.targetMax ?? e.maxReps),
        w: weightLabel(advice.weightKg, unit),
        prev: weightLabel(e.topWeightKg, unit),
      });
    case "escalate_variant":
      return tInterp("progress.escalate", {
        max: num(e.targetMax ?? e.maxReps),
        cap:
          e.maxLoadKg !== null
            ? tInterp("progress.escalateCap", {
                cap: weightLabel(e.maxLoadKg, unit),
              })
            : "",
      });
    case "repeat":
      return tInterp("progress.repeat", {
        min: num(e.minReps),
        max: num(e.maxReps),
        targetMin: num(e.targetMin),
        targetMax: num(e.targetMax),
      });
    case "reduce":
      return tInterp("progress.reduce", {
        reps: num(e.maxReps ?? e.lastReps),
        targetMin: num(e.targetMin),
        targetMax: num(e.targetMax),
      });
    case "regress_variant":
      return tInterp("progress.regress", {
        reps: num(e.maxReps ?? e.lastReps),
        targetMin: num(e.targetMin),
        targetMax: num(e.targetMax),
      });
    case "first_time":
      return t("progress.noBasis");
  }
}

/**
 * The lever line for the two verdicts that name one, or `null`.
 *
 * Kept apart from the sentence because it has to read the same whatever the axis
 * is — it is the one piece of the verdict that tells him where the progression
 * goes next once kilos are exhausted.
 */
export function progressionLever(advice: ProgressionAdvice): string | null {
  const axis = axisLabel(advice.axis);
  switch (advice.verdict) {
    case "escalate_variant":
      return tInterp("progress.escalateLever", { axis });
    case "regress_variant":
      return tInterp("progress.regressLever", { axis });
    default:
      return null;
  }
}
