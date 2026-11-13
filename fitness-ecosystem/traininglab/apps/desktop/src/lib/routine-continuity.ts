/**
 * Continuity — what a routine means *against the log*, not in the abstract.
 *
 * A template is a promise: "the same exercises, again". That promise only pays
 * off if repeating them lets the load climb, and the load can only climb if the
 * exercise you open today is the one you already know — same movement, same
 * setup, same rep window — and if the app can tell you where you left it.
 *
 * Two rules keep this module honest:
 *
 *   1. **It reads the log; it never stores a weight.** A routine that carried
 *      its own `targetWeightKg` would be a second source of truth and would
 *      drift the day you got stronger (or weaker, or changed gear). The number
 *      shown here is derived from the sets you actually logged, every render.
 *   2. **It never decides progression.** The verdict lives in
 *      `lib/progression.ts`; this module only answers *when* you last did each
 *      exercise and *how much you moved*, so the screen and the set entry cannot
 *      disagree about the same bar.
 *
 * `suggestedRoutines` is the other half: the owner has 30 logged sessions and no
 * routines, because authoring one by hand is work. The groups of exercises he
 * already repeated IS the split — deriving it costs nothing and cannot propose
 * an exercise he has never done.
 *
 * Pure on purpose (no React, no i18n, no IndexedDB): tested from the root suite.
 *
 * @module lib/routine-continuity
 */

import { ALL_EXERCISES } from "@fitness/bodylab-exercises";
import { muscleFamilyOf, type MuscleFamily } from "@fitness/bodylab-training";
import { localDayKey } from "./day";
import {
  routineItemFor,
  type Routine,
  type RoutineItem,
} from "./routines";
import type { MuscleGroup } from "@fitness/bodylab-exercises";
import type { TLSession, TLSet } from "./types";

/** Where one exercise of the routine left off. */
export interface ExerciseContinuity {
  exerciseId: string;
  /** Local day of the last working set, `YYYY-MM-DD` (`null` = never). */
  lastDay: string | null;
  /** Calendar days since that day; `0` means today. `null` when never done. */
  daysAgo: number | null;
  /** Heaviest working load of that day, kg (`null` = bodyweight/timed). */
  topWeightKg: number | null;
  /** Reps of that same heaviest set (`null` when the set carried no reps). */
  topReps: number | null;
  /** Working sets logged that day. */
  workingSets: number;
}

/** The routine measured against the log. */
export interface RoutineContinuity {
  exercises: ExerciseContinuity[];
  /** Exercises with at least one logged working set, ever. */
  known: number;
  /** Total exercises in the routine (denominator of `known`). */
  total: number;
  /** Most recent of all the routine's exercises, in calendar days. */
  lastDaysAgo: number | null;
  /** Exercises the log has never seen — the ones that cannot ramp yet. */
  unheard: string[];
}

/** A routine derived from a repeated shape in the history. */
export interface SuggestedRoutine {
  /** Exercise ids, sorted and joined — the group's identity. */
  signature: string;
  /** How many logged sessions share this shape. */
  times: number;
  /** Local day of the most recent one. */
  lastDay: string;
  /** Prescription taken from that most recent session. */
  items: RoutineItem[];
  /** Primary families of the items, first-seen order. */
  families: MuscleFamily[];
}

/** Whole calendar days between two `YYYY-MM-DD` keys (never negative). */
export function daysBetween(fromDay: string, toDay: string): number {
  const from = Date.UTC(
    Number(fromDay.slice(0, 4)),
    Number(fromDay.slice(5, 7)) - 1,
    Number(fromDay.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toDay.slice(0, 4)),
    Number(toDay.slice(5, 7)) - 1,
    Number(toDay.slice(8, 10)),
  );
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

const isWorking = (set: TLSet): boolean => set.warmup !== true;

/**
 * The last day one exercise was worked, with the load that closed it.
 *
 * "Top" means the heaviest working set of that day, and `topReps` its own reps —
 * the pair the user recognises ("40 × 10"), not the best of two different sets.
 */
export function exerciseContinuity(
  sets: readonly TLSet[],
  exerciseId: string,
  today: Date = new Date(),
): ExerciseContinuity {
  const todayKey = localDayKey(today.toISOString());
  const working = sets.filter(
    (set) => set.exerciseId === exerciseId && isWorking(set),
  );
  if (working.length === 0) {
    return {
      exerciseId,
      lastDay: null,
      daysAgo: null,
      topWeightKg: null,
      topReps: null,
      workingSets: 0,
    };
  }

  const lastDay = working
    .map((set) => localDayKey(set.timestamp))
    .sort()
    .at(-1)!;
  const daySets = working.filter((set) => localDayKey(set.timestamp) === lastDay);

  let top: TLSet | null = null;
  for (const set of daySets) {
    const weight = typeof set.weight === "number" ? set.weight : 0;
    const best = top && typeof top.weight === "number" ? top.weight : 0;
    if (!top || weight > best) top = set;
  }

  return {
    exerciseId,
    lastDay,
    daysAgo: daysBetween(lastDay, todayKey),
    topWeightKg:
      typeof top?.weight === "number" && top.weight > 0 ? top.weight : null,
    topReps: typeof top?.reps === "number" && top.reps > 0 ? top.reps : null,
    workingSets: daySets.length,
  };
}

/** A routine measured against the log, exercise by exercise. */
export function routineContinuity(
  routine: Routine,
  sets: readonly TLSet[],
  today: Date = new Date(),
): RoutineContinuity {
  const exercises = routine.items.map((item) =>
    exerciseContinuity(sets, item.exerciseId, today),
  );
  const known = exercises.filter((entry) => entry.lastDay !== null).length;
  const distances = exercises
    .map((entry) => entry.daysAgo)
    .filter((days): days is number => days !== null);
  return {
    exercises,
    known,
    total: exercises.length,
    lastDaysAgo: distances.length > 0 ? Math.min(...distances) : null,
    unheard: exercises
      .filter((entry) => entry.lastDay === null)
      .map((entry) => entry.exerciseId),
  };
}

/** The identity of a group of exercises: order-insensitive, duplicate-free. */
export function routineSignature(
  items: readonly { exerciseId: string }[],
): string {
  return [...new Set(items.map((item) => item.exerciseId))].sort().join("+");
}

/** Primary families of a list of exercises, first-seen order. */
function familiesOf(exerciseIds: readonly string[]): MuscleFamily[] {
  const families: MuscleFamily[] = [];
  for (const id of exerciseIds) {
    const exercise = ALL_EXERCISES.find((entry) => entry.id === id);
    if (!exercise) continue;
    const direct = exercise.muscles.filter((m) => m.intensity >= 2);
    const muscles = (direct.length > 0 ? direct : exercise.muscles).map(
      (m) => m.muscle as MuscleGroup,
    );
    for (const muscle of muscles) {
      const family = muscleFamilyOf(muscle);
      if (!families.includes(family)) families.push(family);
    }
  }
  return families;
}

/**
 * Routines the owner has *already* been training, read off his own sessions.
 *
 * Only groups repeated at least twice qualify: one session is a day, two is a
 * shape, and a routine is supposed to be a shape. The prescription comes from
 * the **most recent** session of the group, because that is the version of the
 * workout he settled on (his warm-up sets and his own rep range included).
 *
 * @param limit How many suggestions to return (the screen proposes a few).
 */
export function suggestedRoutines(
  sets: readonly TLSet[],
  sessions: readonly TLSession[],
  limit = 3,
): SuggestedRoutine[] {
  const byId = new Map(sets.map((set) => [set.id, set]));
  const groups = new Map<
    string,
    { times: number; lastDay: string; ordered: string[]; sessionSets: TLSet[] }
  >();

  const ordered = [...sessions].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );

  for (const session of ordered) {
    const rows = session.setIds
      .map((id) => byId.get(id))
      .filter((set): set is TLSet => set !== undefined && isWorking(set))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (rows.length === 0) continue;

    const ids: string[] = [];
    for (const set of rows) {
      if (!ids.includes(set.exerciseId)) ids.push(set.exerciseId);
    }
    // A single movement is not a routine: it is a session that logged one lift.
    if (ids.length < 2) continue;

    const lastDay = localDayKey(rows.at(-1)!.timestamp);
    const signature = routineSignature(
      ids.map((exerciseId) => ({ exerciseId })),
    );
    const existing = groups.get(signature);
    if (!existing) {
      groups.set(signature, { times: 1, lastDay, ordered: ids, sessionSets: rows });
      continue;
    }
    existing.times += 1;
    // Later sessions win: the prescription follows the newest version.
    if (lastDay >= existing.lastDay) {
      existing.lastDay = lastDay;
      existing.ordered = ids;
      existing.sessionSets = rows;
    }
  }

  const out: SuggestedRoutine[] = [];
  const emitted = new Set<string>();
  for (const group of groups.values()) {
    if (group.times < 2) continue;
    const items: RoutineItem[] = [];
    for (const exerciseId of group.ordered) {
      const own = group.sessionSets.filter(
        (set) => set.exerciseId === exerciseId,
      );
      const reps = own
        .map((set) => set.reps)
        .filter((value): value is number => typeof value === "number" && value > 0);
      const item = routineItemFor(exerciseId, {
        sets: own.length,
        ...(reps.length > 0
          ? { repsMin: Math.min(...reps), repsMax: Math.max(...reps) }
          : {}),
      });
      if (item) items.push(item);
    }
    // Dropping an unknown id could leave one exercise: that is not a routine.
    if (items.length < 2) continue;
    // Two groups can collapse into the same routine once an id the catalogue
    // does not know is dropped; the split is offered once, not twice.
    const signature = routineSignature(items);
    if (emitted.has(signature)) continue;
    emitted.add(signature);
    out.push({
      signature,
      times: group.times,
      lastDay: group.lastDay,
      items,
      families: familiesOf(items.map((item) => item.exerciseId)),
    });
  }

  return out
    .sort(
      (a, b) =>
        b.times - a.times ||
        b.lastDay.localeCompare(a.lastDay) ||
        a.signature.localeCompare(b.signature),
    )
    .slice(0, Math.max(0, limit));
}
