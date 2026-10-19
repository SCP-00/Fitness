/**
 * Estimated stress of the week — auto-planned or user-designed.
 *
 * The owner asked (2026-10-08) for an *estimated stress* of the routine he
 * designs himself in Semana. This module is the answer and it obeys three
 * rules:
 *
 *   1. **Pure and deterministic.** No randomness, no backend, no log writes —
 *      inputs are the rendered `WeekPlan` rows, the time budget and the shared
 *      exercise catalog. Testable from the root suite by relative import.
 *   2. **Declared estimates, not invented measurements.** A user-designed day
 *      has no exercise list yet (he picks exercises at the rack), so its
 *      volume is estimated at `SETS_PER_FAMILY_DAY` working sets per assigned
 *      family — the middle of the 12–20 band (`DEFAULT_WEEKLY_BAND`) spread
 *      over a 4-day week. The trait component comes from the catalog's own
 *      `jointStress`/`spineLoad` (1–3) of the exercises whose primary family
 *      matches. The estimate is always labelled as such in the UI.
 *   3. **User content is never rewritten.** `applyWeekOverrides` only *lays*
 *      his days over the generated week: a day he authored keeps his kind and
 *      families through any `regenerateWeek`, and clearing one is always an
 *      explicit user action.
 *
 * Scoring (0–10, one decimal): `0.40·volumen + 0.30·articular + 0.20·densidad
 * + 0.10·duración`, where volumen = sets of the day capped at 24 (6 families),
 * articular = mean catalog stress of the assigned families, densidad = share of
 * neighbouring days that also train, duración = minutes over a 90-min ruler.
 * Week score = mean of the training days, +1 with no rest day at all and +1 if
 * any family goes above its weekly band.
 *
 * @module lib/week-stress
 */

import type { MuscleFamily } from "@fitness/bodylab-training";
import type { WeekPlan } from "./plan";
import { plannerCatalog } from "./plan";
import { DEFAULT_WEEKLY_BAND, readVolume } from "./volume-target";
import type { WeekDayOverride } from "./types";

/** Declared estimate: working sets per assigned family on a manual day. */
export const SETS_PER_FAMILY_DAY = 4;
/** Six families in one day = volume factor 1 (cap). */
const VOLUME_CAP_SETS = 24;
/** Minutes where the duration factor saturates (the ruler, not a limit). */
const DURATION_SATURATION_MIN = 90;
/** Day score at or above this counts as a "high" day for density warnings. */
export const HIGH_DAY_THRESHOLD = 6.5;

export type WeekStressBand = "low" | "moderate" | "high" | "excessive";

export interface DayStress {
  /** Monday-first index. */
  index: number;
  label: string;
  isRest: boolean;
  /** True when he authored this day (the override layer). */
  isCustom: boolean;
  /** 0–10, one decimal. Rest days are 0. */
  score: number;
  families: MuscleFamily[];
  /** Planned working sets (real for auto days, estimated for manual ones). */
  sets: number;
  minutes: number;
}

export type StressWarning =
  | { code: "no_rest_week" }
  | { code: "dense_day"; index: number; families: number }
  | { code: "back_to_back"; index: number }
  | { code: "family_over"; family: MuscleFamily; sets: number }
  | { code: "family_zero"; families: MuscleFamily[] };

export interface WeekStress {
  days: DayStress[];
  weekScore: number;
  band: WeekStressBand;
  trainingDays: number;
  restDays: number;
  /** Estimated planned working sets per family for this week. */
  familySets: Partial<Record<MuscleFamily, number>>;
  warnings: StressWarning[];
}

/** Mean catalog joint/spine stress of a family's exercises, 0..1. */
function familyTraitLoad(): Record<string, number> {
  const catalog = plannerCatalog();
  const acc = new Map<string, { sum: number; n: number }>();
  for (const entry of catalog) {
    const load =
      (Math.max(entry.traits.jointStress, entry.traits.spineLoad) as number) /
      3;
    const cur = acc.get(entry.primary) ?? { sum: 0, n: 0 };
    cur.sum += load;
    cur.n += 1;
    acc.set(entry.primary, cur);
  }
  const out: Record<string, number> = {};
  for (const [fam, { sum, n }] of acc) out[fam] = n > 0 ? sum / n : 0.4;
  return out;
}

let traitCache: Record<string, number> | null = null;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function bandFor(score: number): WeekStressBand {
  if (score < 4) return "low";
  if (score < 6.5) return "moderate";
  if (score < 8.5) return "high";
  return "excessive";
}

/**
 * Lay the user's day overrides over the generated week.
 *
 * Only days he authored change; every other row keeps the planner's output.
 * His content is never deleted here — even a half-finished day (train with no
 * families yet) is kept as a draft, because *deleting* his words would be the
 * very thing the owner forbade. Totals and `uncovered` are recomputed from the
 * merged rows so no summary contradicts a row.
 */
export function applyWeekOverrides(
  plan: WeekPlan,
  overrides: Record<number, WeekDayOverride> | undefined,
  timeBudgetMin: number,
): WeekPlan {
  if (!overrides || Object.keys(overrides).length === 0) return plan;

  const rows = plan.rows.map((row, i) => {
    const override = overrides[i];
    if (!override) return { ...row, isCustom: false };
    if (override.kind === "rest") {
      return {
        ...row,
        isRest: true,
        assigned: [] as MuscleFamily[],
        sets: 0,
        minutes: 0,
        preview: [] as string[],
        isCustom: true,
      };
    }
    // A train override with no families yet is a *draft*, not a mistake: he
    // pressed "Entrenar" and has not picked families. Keep it authored (never
    // silently delete his content), show zero sets and let the editor finish
    // the job — the stress module skips family-less days by contract.
    const families = override.families;
    return {
      ...row,
      isRest: false,
      assigned: families,
      sets: families.length * SETS_PER_FAMILY_DAY,
      minutes: timeBudgetMin,
      preview: [] as string[],
      isCustom: true,
    };
  });

  // Families still covered after the override layer (the auto `uncovered`
  // would lie once he rest-days a family the planner had assigned).
  const covered = new Set<MuscleFamily>();
  for (const row of rows) for (const fam of row.assigned) covered.add(fam);
  const uncovered = plan.uncovered.filter((entry) => !covered.has(entry.family));

  return {
    ...plan,
    rows,
    totalSets: rows.reduce((a, r) => a + r.sets, 0),
    totalMinutes: rows.reduce((a, r) => a + r.minutes, 0),
    uncovered,
  };
}

/**
 * Score the (already merged) week. Pure: same rows in → same numbers out.
 */
export function computeWeekStress(rows: WeekPlan["rows"]): WeekStress {
  if (!traitCache) traitCache = familyTraitLoad();
  const traits = traitCache;

  const base: DayStress[] = rows.map((row, index) => ({
    index,
    label: row.label,
    isRest: row.isRest,
    isCustom: row.isCustom ?? false,
    score: 0,
    families: row.isRest ? [] : [...row.assigned],
    sets: row.sets,
    minutes: row.minutes,
  }));

  const trains = (i: number): boolean => {
    const row = rows[i];
    return !!row && !row.isRest && row.assigned.length > 0;
  };

  for (let i = 0; i < base.length; i++) {
    const day = base[i]!;
    if (day.isRest || day.families.length === 0) continue;

    // Volumen: real planned sets (auto) or the declared estimate (manual).
    const volume = clamp01(day.sets / VOLUME_CAP_SETS);
    // Articular: mean catalog stress of the assigned families.
    const trait =
      day.families.reduce((a, f) => a + (traits[f] ?? 0.4), 0) /
      day.families.length;
    // Densidad: how much of the neighbourhood also trains (no wrap-around:
    // Monday's neighbour is last week's Sunday, which we do not know here).
    const prev = i > 0 && trains(i - 1);
    const next = i < base.length - 1 && trains(i + 1);
    const density = (prev ? 0.5 : 0) + (next ? 0.5 : 0);
    const duration = clamp01(day.minutes / DURATION_SATURATION_MIN);

    day.score = round1(
      Math.max(
        0,
        Math.min(10, 10 * (0.4 * volume + 0.3 * trait + 0.2 * density + 0.1 * duration)),
      ),
    );
  }

  const training = base.filter((d) => !d.isRest && d.families.length > 0);
  const restDays = base.length - training.length;

  // Planned weekly sets per family: auto rows carry a real set total split
  // across their families; manual rows use the declared estimate.
  const familySets: Partial<Record<MuscleFamily, number>> = {};
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.isRest || row.assigned.length === 0) continue;
    const perFamily = row.isCustom
      ? SETS_PER_FAMILY_DAY
      : row.sets / row.assigned.length;
    for (const fam of row.assigned) {
      familySets[fam] = round1((familySets[fam] ?? 0) + perFamily);
    }
  }

  const mean =
    training.length === 0
      ? 0
      : training.reduce((a, d) => a + d.score, 0) / training.length;

  const warnings: StressWarning[] = [];
  if (training.length > 0 && restDays === 0) {
    warnings.push({ code: "no_rest_week" });
  }
  for (const day of training) {
    if (day.families.length > 5) {
      warnings.push({
        code: "dense_day",
        index: day.index,
        families: day.families.length,
      });
    }
    const prevBusy = day.index > 0 && trains(day.index - 1);
    const nextBusy = day.index < rows.length - 1 && trains(day.index + 1);
    if (day.score >= HIGH_DAY_THRESHOLD && (prevBusy || nextBusy)) {
      warnings.push({ code: "back_to_back", index: day.index });
    }
  }

  let weekScore = mean;
  if (training.length > 0 && restDays === 0) weekScore += 1;

  const zeroFamilies: MuscleFamily[] = [];
  const over: { family: MuscleFamily; sets: number }[] = [];
  for (const [fam, sets] of Object.entries(familySets) as [
    MuscleFamily,
    number,
  ][]) {
    const reading = readVolume(fam, Math.round(sets));
    if (reading.status === "above") over.push({ family: fam, sets });
  }
  if (over.length > 0) {
    weekScore += 1;
    for (const o of over) {
      warnings.push({ code: "family_over", family: o.family, sets: o.sets });
    }
  }
  // Families nobody plans: informational (the planner's own `uncovered` has
  // the same job for the auto week; this covers his design too).
  const allFamilies = new Set<string>();
  for (const entry of plannerCatalog()) allFamilies.add(entry.primary);
  for (const fam of allFamilies) {
    if (!familySets[fam as MuscleFamily]) zeroFamilies.push(fam as MuscleFamily);
  }
  if (training.length > 0 && zeroFamilies.length > 0) {
    warnings.push({ code: "family_zero", families: zeroFamilies.sort() });
  }

  weekScore = round1(Math.max(0, Math.min(10, weekScore)));

  return {
    days: base,
    weekScore,
    band: bandFor(weekScore),
    trainingDays: training.length,
    restDays,
    familySets,
    warnings,
  };
}

/** Exposed for tests/UI parity with the volume card's band. */
export const STRESS_BAND = DEFAULT_WEEKLY_BAND;
