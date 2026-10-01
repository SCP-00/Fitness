/**
 * Statistics derived from what the user actually logged — pure, no React.
 *
 * These are the numbers Inicio and Progreso put on screen, and they exist for
 * one reason: **the screen must not be able to disagree with the plan**. The
 * planner and progress screen share the same 34-muscle → 13-family mapping from
 * `core/training`. The map adds explicit partial credit for secondary and
 * accessory involvement so its heat reflects estimated hard-set stimulus.
 *
 * The set-type split (`effective / complementary / accessory`) is the mockups'
 * "series efectivas / complementarias / accesorias", and it comes straight from
 * the catalog's `MuscleInvolvement.intensity` (3 / 2 / 1). No new data was
 * invented to draw it.
 *
 * Warm-up sets are excluded everywhere, by the same contract the planner uses:
 * a ramp set is not volume.
 *
 * @module features/stats/derive
 */

import { muscleFamilyOf, type MuscleFamily } from "@fitness/bodylab-training";
import { epleyOneRm } from "../../lib/records";
import { exerciseFamilies } from "../exercises/lookup";
import type { ImportPayload } from "../../lib/adapter";
import type { TLSession, TLSet } from "../../lib/types";
import { exerciseName, plannerCatalog } from "../../lib/plan";

const DAY_MS = 24 * 60 * 60 * 1000;
/** One hard primary set is 1 equivalent set; supporting work gets partial credit. */
const STIMULUS_CREDIT: Record<1 | 2 | 3, number> = {
  1: 0.33,
  2: 0.66,
  3: 1,
};

/** Local calendar day of a timestamp, as `YYYY-MM-DD` (never UTC-shifted). */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Working sets only: the warm-up ramp is logged but is not training volume. */
export function workingSets(sets: TLSet[]): TLSet[] {
  return sets.filter((s) => !s.warmup);
}

export interface DayBucket {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Weekday index, Monday = 0 (the planner's own convention). */
  weekIndex: number;
  sets: number;
  volume: number;
}

/**
 * The last `days` calendar days, oldest first, with what was logged on each.
 * Days with nothing logged are present with zeros — a gap in a chart is
 * information, and omitting it would silently compress the axis.
 */
export function dayBuckets(
  sets: TLSet[],
  days: number,
  now: Date = new Date(),
): DayBucket[] {
  const buckets: DayBucket[] = [];
  const index = new Map<string, DayBucket>();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(start.getTime() - i * DAY_MS);
    const bucket: DayBucket = {
      date: isoDay(date),
      weekIndex: (date.getDay() + 6) % 7,
      sets: 0,
      volume: 0,
    };
    buckets.push(bucket);
    index.set(bucket.date, bucket);
  }

  for (const set of workingSets(sets)) {
    const bucket = index.get(set.timestamp.slice(0, 10));
    if (!bucket) continue;
    bucket.sets += 1;
    bucket.volume += (set.weight ?? 0) * (set.reps ?? 0);
  }

  return buckets;
}

export interface Consistency {
  /** Distinct days trained in the current week (Monday-based). */
  days: number;
  /** Days per week the user asked for. */
  target: number;
  /** 0–100, capped: training six times when you planned four is not 150 %. */
  pct: number;
  /** Sets logged in the current week. */
  weekSets: number;
}

/** Weekly constancia: days trained this week against the days you planned. */
export function consistency(
  sets: TLSet[],
  daysPerWeek: number,
  now: Date = new Date(),
): Consistency {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monday = new Date(
    today.getTime() - ((today.getDay() + 6) % 7) * DAY_MS,
  );
  const weekStart = isoDay(monday);

  const trained = new Set<string>();
  let weekSets = 0;
  for (const set of workingSets(sets)) {
    const day = set.timestamp.slice(0, 10);
    if (day >= weekStart) {
      trained.add(day);
      weekSets += 1;
    }
  }

  const target = Math.max(1, daysPerWeek);
  return {
    days: trained.size,
    target,
    pct: Math.min(100, Math.round((trained.size / target) * 100)),
    weekSets,
  };
}

export interface FamilyVolume {
  family: MuscleFamily;
  /** Sets where this family was the target (intensity 3). */
  effective: number;
  /** Sets where it helped substantially (intensity 2). */
  complementary: number;
  /** Sets where it held on (intensity 1). */
  accessory: number;
  total: number;
  /** Estimated hard-set equivalents: primary 1, secondary 0.66, accessory 0.33. */
  stimulus: number;
}

/**
 * Sets per muscle family inside a **date range**, split by how hard that family
 * worked in the set.
 *
 * A set can count for several families at different intensities — that is the
 * point of the split, and it is why the three columns do not sum to the exercise
 * count.
 *
 * `from` / `to` are inclusive `YYYY-MM-DD` bounds; `null` means open-ended. Both
 * `volumeByFamily` and `familyBalance` go through here, so a family can never be
 * counted one way in the heat map and another way in the body map.
 */
export function familyTotals(
  sets: TLSet[],
  from: string | null,
  to: string | null = null,
): Map<MuscleFamily, FamilyVolume> {
  const catalogue = new Map(
    plannerCatalog().map((entry) => [entry.exercise.id, entry]),
  );
  const totals = new Map<MuscleFamily, FamilyVolume>();

  for (const set of workingSets(sets)) {
    const day = set.timestamp.slice(0, 10);
    if (from && day < from) continue;
    if (to && day > to) continue;
    const entry = catalogue.get(set.exerciseId);
    if (!entry) continue;

    // Best intensity per family for this exercise: an exercise that hits the
    // chest with one primary and one secondary muscle counts once as effective.
    const strongest = new Map<MuscleFamily, number>();
    for (const involvement of entry.exercise.muscles) {
      const family = muscleFamilyOf(involvement.muscle);
      const current = strongest.get(family) ?? 0;
      if (involvement.intensity > current) {
        strongest.set(family, involvement.intensity);
      }
    }

    for (const [family, intensity] of strongest) {
      const row =
        totals.get(family) ??
        ({
          family,
          effective: 0,
          complementary: 0,
          accessory: 0,
          total: 0,
          stimulus: 0,
        } satisfies FamilyVolume);
      if (intensity === 3) row.effective += 1;
      else if (intensity === 2) row.complementary += 1;
      else row.accessory += 1;
      row.total += 1;
      row.stimulus += STIMULUS_CREDIT[intensity as 1 | 2 | 3];
      totals.set(family, row);
    }
  }

  return totals;
}

/** The same totals, as an array sorted by volume — what the heat map renders. */
export function volumeByFamily(sets: TLSet[], days?: number): FamilyVolume[] {
  const cutoff = days
    ? isoDay(new Date(Date.now() - (days - 1) * DAY_MS))
    : null;
  return [...familyTotals(sets, cutoff).values()].sort(
    (a, b) => b.total - a.total,
  );
}

export interface FamilyBalance {
  family: MuscleFamily;
  /** Sets in the current period. */
  total: number;
  /** Hard-set equivalents credited to this family for the current period. */
  stimulus: number;
  /** Sets in the immediately preceding period of the same length. */
  previous: number;
  /** Hard-set equivalents in the immediately preceding period. */
  previousStimulus: number;
  /**
   * 0–100 against **your own best-covered family in the same period**, not against
   * a norm. 100 is "the family you trained most", which is a comparison that needs
   * no external data and cannot be wrong.
   */
  index: number;
  trend: Trend;
}

export type Trend = "up" | "down" | "flat";

/**
 * A family is rising or falling only when the change clears 10 % — small enough
 * to notice real progress, large enough that one extra set does not paint an
 * arrow.
 */
function trendOf(current: number, previous: number): Trend {
  if (previous === 0) return current > 0 ? "up" : "flat";
  const ratio = current / previous;
  if (ratio >= 1.1) return "up";
  if (ratio <= 0.9) return "down";
  return "flat";
}

/**
 * Per-family volume for the period, with the previous period for comparison —
 * this is what paints the body map and the muscle rows.
 *
 * Families with nothing logged in either window are omitted: the map has its own
 * neutral colour for them, and a list of thirteen zeros is noise.
 */
export function familyBalance(
  sets: TLSet[],
  days: number,
  now: Date = new Date(),
): FamilyBalance[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentFrom = isoDay(new Date(today.getTime() - (days - 1) * DAY_MS));
  const previousFrom = isoDay(
    new Date(today.getTime() - (2 * days - 1) * DAY_MS),
  );
  const previousTo = isoDay(new Date(today.getTime() - days * DAY_MS));

  const current = familyTotals(sets, currentFrom);
  const previous = familyTotals(sets, previousFrom, previousTo);
  const peak = Math.max(1, ...[...current.values()].map((v) => v.stimulus));

  return [...current.values()]
    .map((row) => ({
      family: row.family,
      total: row.total,
      stimulus: row.stimulus,
      previous: previous.get(row.family)?.total ?? 0,
      previousStimulus: previous.get(row.family)?.stimulus ?? 0,
      index: Math.round((row.stimulus / peak) * 100),
      trend: trendOf(
        row.stimulus,
        previous.get(row.family)?.stimulus ?? 0,
      ),
    }))
    .sort((a, b) => b.index - a.index || b.total - a.total);
}

export interface Mark {
  exerciseId: string;
  name: string;
  /** Heaviest logged set, in kg. */
  bestWeightKg: number;
  reps: number;
  /** Epley estimate from the best set, rounded to 0.5 kg like the app does. */
  est1Rm: number;
  /** `YYYY-MM-DD` of that set. */
  date: string;
}

/**
 * The heaviest set ever logged per exercise, plus BodyLab's exported records
 * when they beat ours. A PR is a PR regardless of which app saw it first — the
 * same rule the logger uses when it decides to celebrate.
 */
export function topMarks(
  sets: TLSet[],
  payload: ImportPayload | null,
  limit = 6,
): Mark[] {
  const byExercise = new Map<string, Mark>();

  for (const set of workingSets(sets)) {
    // Local consts, not property reads: the narrowing has to survive the two
    // calls below, and a `number | null` property does not stay narrowed across
    // them.
    const weight = set.weight;
    const reps = set.reps;
    if (weight === null || weight === undefined) continue;
    if (!reps || reps <= 0) continue;
    const previous = byExercise.get(set.exerciseId);
    if (previous && previous.bestWeightKg >= weight) continue;
    // Epley returns null for input it refuses to estimate; the raw weight is
    // then the honest fallback rather than a zero.
    const estimate = epleyOneRm(weight, reps);
    byExercise.set(set.exerciseId, {
      exerciseId: set.exerciseId,
      name: exerciseName(set.exerciseId),
      bestWeightKg: weight,
      reps,
      est1Rm: estimate === null ? weight : Math.round(estimate * 2) / 2,
      date: set.timestamp.slice(0, 10),
    });
  }

  for (const pr of payload?.personalRecords ?? []) {
    const weight = pr.bestWeight ?? null;
    if (weight === null) continue;
    const previous = byExercise.get(pr.exerciseId);
    if (previous && previous.bestWeightKg >= weight) continue;
    byExercise.set(pr.exerciseId, {
      exerciseId: pr.exerciseId,
      name: exerciseName(pr.exerciseId),
      bestWeightKg: weight,
      reps: previous?.reps ?? 1,
      est1Rm: Math.round((pr.bestEst1RM ?? weight) * 2) / 2,
      date: previous?.date ?? "",
    });
  }

  return [...byExercise.values()]
    .sort((a, b) => b.est1Rm - a.est1Rm)
    .slice(0, limit);
}

/** Total working sets ever logged for one exercise. */
export function setsLoggedFor(sets: TLSet[], exerciseId: string): number {
  return workingSets(sets).filter((s) => s.exerciseId === exerciseId).length;
}

/**
 * The best set for one exercise, as `weight × reps`, for the "ANTERIOR" column
 * every logger needs: what did I do last time?
 */
export function previousBestFor(
  sets: TLSet[],
  exerciseId: string,
  excludeToday = false,
  todayPrefix = "",
): { weight: number | null; reps: number } | null {
  const history = workingSets(sets).filter(
    (s) =>
      s.exerciseId === exerciseId &&
      (!excludeToday || !s.timestamp.startsWith(todayPrefix)),
  );
  if (history.length === 0) return null;
  let best = history[history.length - 1]!;
  for (const set of history) {
    if ((set.weight ?? 0) > (best.weight ?? 0)) best = set;
  }
  return { weight: best.weight ?? null, reps: best.reps ?? 0 };
}

/** Distinct training days in the whole log — the honest "días entrenados". */
export function trainingDays(sets: TLSet[]): number {
  return new Set(workingSets(sets).map((s) => s.timestamp.slice(0, 10))).size;
}

/** How many sets a family got in the last `days`, for the balance view. */
export function weeklySetsFor(sessions: TLSession[]): number {
  return sessions.reduce((acc, s) => acc + s.setIds.length, 0);
}

/**
 * The shape of a period in 5–7 bars, whatever the span: days for a week, weeks
 * for a month, months for a quarter. One bar per day would be 90 slivers in a
 * rail, which is noise, not a trend. Oldest bar first; today is the last one.
 */
export function periodSeries(
  sets: TLSet[],
  days: 7 | 30 | 90,
): number[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = days === 7 ? 7 : days === 30 ? 5 : 6;
  const span = Math.ceil(days / buckets);
  const out = Array.from({ length: buckets }, () => 0);

  for (const set of workingSets(sets)) {
    const diff = Math.floor(
      (today.getTime() -
        new Date(`${set.timestamp.slice(0, 10)}T00:00:00`).getTime()) /
        DAY_MS,
    );
    if (diff < 0 || diff >= buckets * span) continue;
    const index = buckets - 1 - Math.floor(diff / span);
    out[index] += 1;
  }
  return out;
}

/**
 * How many of the last `weeks` weeks hit the training-days target. Weekly
 * "constancia" is deliberately not a streak: a chain that can break punishes a
 * partial week instead of rewarding the one you actually trained.
 */
export function trainedWeeksIn(
  sets: { timestamp: string; warmup?: boolean }[],
  weeks: number,
  daysPerWeek: number,
): number {
  const trained = new Set(
    sets.filter((s) => !s.warmup).map((s) => s.timestamp.slice(0, 10)),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(
    today.getTime() - ((today.getDay() + 6) % 7) * DAY_MS,
  );
  let hit = 0;
  for (let w = 0; w < weeks; w += 1) {
    const start = new Date(monday.getTime() - w * 7 * DAY_MS);
    let count = 0;
    for (let d = 0; d < 7; d += 1) {
      if (trained.has(isoDay(new Date(start.getTime() + d * DAY_MS)))) {
        count += 1;
      }
    }
    if (count >= Math.max(1, daysPerWeek)) hit += 1;
  }
  return hit;
}

export { exerciseFamilies };
