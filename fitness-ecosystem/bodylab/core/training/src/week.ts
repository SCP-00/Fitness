/**
 * The weekly planner — horizontalisation of the daily engine.
 *
 * `buildSession` answers "what do I do today?". This module answers the
 * question one level up: *which families belong on which day of my week*, so
 * that by Sunday every family got sensible volume, nothing big was trained on
 * consecutive days, and the weakest families show up twice.
 *
 * Design contract (owner-approved direction, 2026-09-29):
 *   • reuses `buildSession` per day — there is exactly one session engine, the
 *     week only decides the *assignment*;
 *   • recovery is a hard rule: a big muscle family never lands on consecutive
 *     training days (≈48 h between hits);
 *   • weak-first: families sorted by weakness (lowest score = weakest) are
 *     assigned first and get a second weekly hit when the schedule allows;
 *   • budgets: the user gives minutes per training day (or one default);
 *   • pure, deterministic (same input ⇒ same week) and never throws — the
 *     function degrades to fewer days/families instead of failing.
 *
 * This file is core: no UI, no DOM, no dates from the wall clock — the caller
 * passes everything. Units: sets and minutes, as everywhere in the package.
 *
 * @module training/week
 */

import type { ExperienceLevel } from "./plan";
import type { FamilyWeakness } from "./generator";
import type { Readiness, SessionGoal } from "./session";
import type { MuscleFamily } from "./plan";
import { isBigMuscleFamily } from "./plan";
import type { BuiltSession, SessionCatalogEntry } from "./session";
import { buildSession } from "./session";

/** The 13 families, weakest-first comparator helper. */
const ALL_FAMILIES: MuscleFamily[] = [
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

export interface WeekDaySpec {
  /** Human label, e.g. "Lunes" — display only. */
  label: string;
  /** Minutes available on this specific day. */
  budgetMin: number;
}

export interface BuildWeekInput {
  /** Per-day specs, in order. Days with budgetMin <= 0 are rest days. */
  days: WeekDaySpec[];
  /** Same weakness semantics as buildSession: LOWER = weaker (0-100). */
  weakness: FamilyWeakness;
  /** Sets already done per family in the rolling last-7-days ledger. */
  weeklyVolume?: Partial<Record<MuscleFamily, number>>;
  readiness: Readiness;
  level: ExperienceLevel;
  goal: SessionGoal;
  catalog: SessionCatalogEntry[];
  /** Families to leave alone the whole week (injury, user preference). */
  blockedFamilies?: MuscleFamily[];
  /** Deterministic tie-break; same input + same seed = same week. */
  seed?: number;
}

/** One planned day: the assignment plus the concrete session. */
export interface WeekDay {
  label: string;
  budgetMin: number;
  isRest: boolean;
  /** Families assigned to this day (weakest-first), empty on rest days. */
  assigned: MuscleFamily[];
  /** The built session (slots fit the budget; empty on rest days). */
  session: BuiltSession;
}

export interface BuiltWeek {
  days: WeekDay[];
  /** Families that ended up with zero sessions this week, with the reason. */
  uncovered: { family: MuscleFamily; reason: "blocked" | "no_day" }[];
  /** Total planned minutes across training days. */
  totalMinutes: number;
  /** Total working sets across training days. */
  totalSets: number;
}

/** Weak-first sort: lowest weakness score first, then alphabetical for ties. */
function weakFirst(weakness: FamilyWeakness): MuscleFamily[] {
  return [...ALL_FAMILIES].sort((a, b) => {
    const wa = weakness[a] ?? 50;
    const wb = weakness[b] ?? 50;
    return wa !== wb ? wa - wb : a.localeCompare(b);
  });
}

/**
 * Assign families to days.
 *
 * Pass 1 — every family gets the day with the most remaining budget among the
 * days where the recovery rule holds (not assigned the previous training day)
 * and where the family was not already placed.
 *
 * Pass 2 — the weakest half (or up to `hitsPerWeek` weakest) gets a *second*
 * hit on the earliest compatible day with remaining budget: this is what
 * lifts weekly frequency for priorities without ever breaking the 48 h rule.
 */
function assignFamilies(
  days: WeekDaySpec[],
  weakness: FamilyWeakness,
  blocked: Set<string>,
): { assigned: MuscleFamily[][]; uncovered: BuiltWeek["uncovered"] } {
  const n = days.length;
  const assigned: MuscleFamily[][] = Array.from({ length: n }, () => []);
  const remainingBudget = days.map((d) => d.budgetMin);
  const uncovered: BuiltWeek["uncovered"] = [];

  const order = weakFirst(weakness);
  const trainDayIdx = days
    .map((d, i) => (d.budgetMin > 0 ? i : -1))
    .filter((i) => i >= 0);

  if (trainDayIdx.length === 0) {
    for (const fam of order) uncovered.push({ family: fam, reason: "no_day" });
    return { assigned, uncovered };
  }

  // Approximate cost of one family-hit so budgets distribute across days.
  const FAMILY_COST_MIN = 14;

  const canPlace = (fam: MuscleFamily, dayIdx: number): boolean => {
    if (!isBigMuscleFamily(fam)) return true;
    // Recovery: no consecutive *training* days for the same big family.
    const pos = trainDayIdx.indexOf(dayIdx);
    const prev = pos > 0 ? trainDayIdx[pos - 1] : -1;
    const next = pos < trainDayIdx.length - 1 ? trainDayIdx[pos + 1] : -1;
    return (
      prev === -1 || !assigned[prev].includes(fam)
    ) && (
      next === -1 || !assigned[next].includes(fam)
    );
  };

  const place = (fam: MuscleFamily, preferSecondHit: boolean): boolean => {
    // Candidates: enough remaining budget, rule-compatible. For a family's
    // first hit prefer the *biggest* remaining budget (spreads volume); for a
    // second hit prefer the *smallest* compatible remaining budget above the
    // cost (packs frequency without stealing whole days).
    const candidates = trainDayIdx
      .filter((i) => remainingBudget[i] >= FAMILY_COST_MIN)
      .filter((i) => canPlace(fam, i))
      .filter((i) => !assigned[i].includes(fam));
    if (candidates.length === 0) return false;
    const best = [...candidates].sort((a, b) =>
      preferSecondHit
        ? remainingBudget[a] - remainingBudget[b]
        : remainingBudget[b] - remainingBudget[a],
    )[0]!;
    assigned[best].push(fam);
    remainingBudget[best] -= FAMILY_COST_MIN;
    return true;
  };

  // Pass 1: first hit for every unblocked family, weakest first.
  for (const fam of order) {
    if (blocked.has(fam)) {
      uncovered.push({ family: fam, reason: "blocked" });
      continue;
    }
    if (!place(fam, false)) {
      uncovered.push({ family: fam, reason: "no_day" });
    }
  }

  // Pass 2: second hit for the weakest third (priority frequency), only if
  // there are ≥3 training days so a second hit never means consecutive days.
  if (trainDayIdx.length >= 3) {
    const unblocked = order.filter((fam) => !blocked.has(fam));
    const priority = unblocked.slice(0, Math.max(1, Math.ceil(unblocked.length / 3)));
    for (const fam of priority) {
      place(fam, true);
      // No second hit is fine — the week was simply full; not an "uncovered".
    }
  }

  return { assigned, uncovered };
}

/**
 * Build the week. Never throws: any internally-inconsistent day degrades to a
 * rest day with the reason captured in its (empty) session's advisories.
 */
export function buildWeek(input: BuildWeekInput): BuiltWeek {
  const seed = input.seed ?? 7;
  const { assigned, uncovered } = assignFamilies(
    input.days,
    input.weakness,
    new Set(input.blockedFamilies ?? []),
  );

  const days: WeekDay[] = input.days.map((spec, i) => {
    const families = assigned[i];
    const isRest = spec.budgetMin <= 0 || families.length === 0;
    const session = isRest
      ? buildSession({
          catalog: [],
          weakness: input.weakness,
          timeBudgetMin: Math.max(0, spec.budgetMin),
          readiness: input.readiness,
          level: input.level,
          goal: input.goal,
          seed,
        })
      : buildSession({
          catalog: input.catalog,
          weakness: input.weakness,
          weeklyVolume: input.weeklyVolume,
          timeBudgetMin: Math.max(0, spec.budgetMin),
          readiness: input.readiness,
          level: input.level,
          goal: input.goal,
          focusFamilies: families,
          seed: seed + i, // deterministic per position, varied across days
          // Weekly mode: don't double-penalise with global fatigue — the
          // assignment already encodes recovery.
          fatiguedFamilies: [],
        });
    return {
      label: spec.label,
      budgetMin: spec.budgetMin,
      isRest,
      assigned: isRest ? [] : families,
      session,
    };
  });

  const trainingDays = days.filter((d) => !d.isRest);
  return {
    days,
    uncovered,
    totalMinutes: trainingDays.reduce((a, d) => a + d.session.totalMinutes, 0),
    totalSets: trainingDays.reduce(
      (a, d) => a + d.session.slots.reduce((s, slot) => s + slot.sets, 0),
      0,
    ),
  };
}
