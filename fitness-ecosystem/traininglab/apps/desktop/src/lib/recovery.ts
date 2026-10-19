/**
 * The recovery window — why today must not repeat yesterday.
 *
 * Owner report (2026-10-09): he asked the coach what to train, said his chest
 * and obliques were beat up from the previous day, and was handed a session
 * with chin-ups AND pull-ups — the exact families (lats, biceps, forearms) he
 * had trained 20 hours earlier, on a bar that leaves his hands blistered. The
 * log already held every fact needed to refuse that; nothing read it. Fatigue
 * was only ever a checkbox the user had to tick himself (`soreFamilies`), and
 * the learned model's `freshness` feature is a soft nudge inside a weighted
 * sum, not a rule a 4B-parameter model can be trusted to respect.
 *
 * This module turns the log into that rule. It is:
 *
 *   1. **Pure and deterministic** — sets + readiness in, the same report out.
 *      No randomness, no I/O, no clock reads other than the injected `now`.
 *   2. **A declared rule, not an invented measurement.** The 48-hour window
 *      after a real session for a given muscle is the standard spacing of
 *      hypertrophy programming (2–3 sessions per muscle group per week, e.g.
 *      Schoenfeld et al. 2016 on frequency). It is stated as such in the UI
 *      and can be shortened by the user's own fresh-feeling report.
 *   3. **Explainable** — every family comes with hours since its last direct
 *      set, how many sets it took, and the window that was applied, so the app
 *      can say *why* today's plan skips his arms instead of silently dropping
 *      them.
 *
 * The user's explicit sore-family list is never replaced by this: it is ADDED
 * to it (`buildTodayPlan`). And an explicit focus the user picks himself ("hoy
 * toca abdomen") is honoured — his stated intent beats the automatic window.
 *
 * @module lib/recovery
 */

import {
  ALL_EXERCISES,
  type MuscleGroup,
} from "@fitness/bodylab-exercises";
import {
  muscleFamilyOf,
  type MuscleFamily,
  type Readiness,
} from "@fitness/bodylab-training";
import { isHardSet } from "./effort";
import type { TLSet } from "./types";

/** Direct sets inside the lookback that make the last session a real one. */
export const HARD_SETS = 3;
/** How far back we look to decide whether the last session was real. */
export const LOOKBACK_HOURS = 48;
/** Recovery after a real session (hours). */
export const HARD_WINDOW_HOURS = 48;
/** Recovery after token work on a family (hours). */
export const LIGHT_WINDOW_HOURS = 24;

/**
 * Readiness factor, applied to both windows. Feeling beaten up widens the
 * window; feeling fresh shortens it — the user's own body outranks our table.
 */
export function windowFactor(readiness: Readiness): number {
  if (readiness.soreness >= 4) return 0.5;
  if (readiness.soreness <= 2) return 1.5;
  return 1;
}

export interface FatigueEntry {
  family: MuscleFamily;
  /** Hours since the last direct set that touched this family. */
  hoursSince: number;
  /** Direct sets inside the applied window. */
  sets: number;
  /** Did the last session include a set taken near/at failure? */
  hard: boolean;
  /** Window applied today, hours (readiness factor already included). */
  windowHours: number;
  /** Why it is still considered recovering. */
  reason: "logged_recently" | "readiness_low";
}

export interface FatigueReport {
  /** Families that should not be programmed in the automatic plan today. */
  fatigued: MuscleFamily[];
  /** The same families, with the evidence (UI copy and coach context). */
  entries: FatigueEntry[];
  /** Window applied to a real session today (hours) — the headline number. */
  windowHours: number;
  /** True when the report widened because the user reported low freshness. */
  readinessLow: boolean;
}

/** exercise id → muscle families directly worked (intensity ≥ 2), memoised. */
let familiesCache: Map<string, MuscleFamily[]> | null = null;

function familiesByExercise(): Map<string, MuscleFamily[]> {
  if (familiesCache) return familiesCache;
  const map = new Map<string, MuscleFamily[]>();
  for (const ex of ALL_EXERCISES) {
    const direct = ex.muscles.filter((m) => m.intensity >= 2);
    const muscles = (direct.length > 0 ? direct : ex.muscles).map(
      (m) => m.muscle as MuscleGroup,
    );
    const families: MuscleFamily[] = [];
    for (const m of muscles) {
      const fam = muscleFamilyOf(m);
      if (!families.includes(fam)) families.push(fam);
    }
    map.set(ex.id, families);
  }
  familiesCache = map;
  return map;
}

/**
 * Which families must not be trained today, derived from the log.
 *
 * Warm-up ramp sets are ignored: they live in the log for history but are not
 * work (the log's own contract — see `TLSet.warmup`).
 */
export function deriveFatigue(
  sets: TLSet[],
  readiness: Readiness,
  now: Date = new Date(),
): FatigueReport {
  const factor = windowFactor(readiness);
  const windowHours = HARD_WINDOW_HOURS * factor;
  /*
   * The lookback scales with the factor on purpose: reporting "I am beaten up"
   * widens the window to 72 h, and a fixed 48 h lookback would then misread the
   * very session it is judging as token work (its sets fall outside) and cut
   * the window back to 36 h — the opposite of what the user just told us.
   */
  const lookbackHours = LOOKBACK_HOURS * factor;
  const byId = familiesByExercise();
  const nowMs = now.getTime();

  /** family → { lastMs, sets in the lookback, any set taken near/at failure } */
  const acc = new Map<
    MuscleFamily,
    { lastMs: number; recent: number; hard: boolean }
  >();
  for (const set of sets) {
    if (set.warmup) continue;
    const families = byId.get(set.exerciseId);
    if (!families || families.length === 0) continue;
    const ms = new Date(set.timestamp).getTime();
    if (Number.isNaN(ms) || ms > nowMs) continue;
    const hours = (nowMs - ms) / 3_600_000;
    const hard = isHardSet(set);
    for (const fam of families) {
      const cur = acc.get(fam) ?? { lastMs: 0, recent: 0, hard: false };
      if (ms > cur.lastMs) cur.lastMs = ms;
      if (hours <= lookbackHours) {
        cur.recent += 1;
        if (hard) cur.hard = true;
      }
      acc.set(fam, cur);
    }
  }

  const entries: FatigueEntry[] = [];
  for (const [family, { lastMs, recent, hard }] of acc) {
    const hoursSince = (nowMs - lastMs) / 3_600_000;
    /*
     * A set taken to failure (or near it) marks the family's session as a real
     * one on its own: three easy sets and three sets that ended at failure do
     * not cost the same, and the badge is the only place that difference is
     * recorded. Owner-confirmed meaning of D/F, 2026-10-09.
     */
    const base =
      recent >= HARD_SETS || hard ? HARD_WINDOW_HOURS : LIGHT_WINDOW_HOURS;
    const window = base * factor;
    if (hoursSince >= window) continue;
    entries.push({
      family,
      hoursSince: Math.round(hoursSince * 10) / 10,
      sets: recent,
      /** True when the last session for this family included D/F work. */
      hard,
      windowHours: Math.round(window * 10) / 10,
      reason:
        readiness.soreness <= 2 && factor > 1
          ? "readiness_low"
          : "logged_recently",
    });
  }

  entries.sort((a, b) => a.hoursSince - b.hoursSince || a.family.localeCompare(b.family));

  return {
    fatigued: entries.map((e) => e.family),
    entries,
    windowHours: Math.round(windowHours * 10) / 10,
    readinessLow: readiness.soreness <= 2,
  };
}

/** The same rule for one exercise id — used to reject coach proposals. */
export function fatigueOfExercise(
  report: FatigueReport,
  exerciseId: string,
): FatigueEntry | null {
  const families = familiesByExercise().get(exerciseId) ?? [];
  return (
    report.entries.find((e) => families.includes(e.family)) ?? null
  );
}
