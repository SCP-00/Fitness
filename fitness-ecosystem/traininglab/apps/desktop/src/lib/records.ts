/**
 * Personal records and set completion — the pure half of the "record" sound.
 *
 * Everything here is a pure function over logged sets: no React, no IndexedDB,
 * no audio. That split is deliberate. Deciding whether a set is a record is the
 * part that has to be *right* (a false "¡récord!" is worse than silence), so it
 * lives where it can be unit-tested directly, and the UI only reacts to the
 * verdict.
 *
 * The Epley estimate deliberately matches BodyLab's
 * (`Math.round(w * (1 + reps / 30) * 10) / 10`, see `lib/store.tsx`) so a record
 * celebrated here is the same number BodyLab shows for the same set. Two apps
 * disagreeing about a personal best would be a bug, not a rounding difference.
 *
 * @module lib/records
 */

/** The best marks known for one exercise. `null` means "nothing known yet". */
export interface BestMarks {
  /** Heaviest load ever moved, kg. */
  bestWeightKg: number | null;
  /** Best estimated one-rep max, kg (Epley). */
  bestEst1RmKg: number | null;
}

/** The minimum a logged set needs to expose for record purposes. */
export interface LoggedSetLike {
  weight: number | null;
  reps: number | null;
}

/**
 * A record was beaten. `previous` is `null` for the very first mark, which the
 * UI can present as "first recorded PR" rather than "you beat 0 kg".
 */
export interface RecordEvent {
  kind: "weight" | "e1rm";
  value: number;
  previous: number | null;
}

export const EMPTY_MARKS: BestMarks = {
  bestWeightKg: null,
  bestEst1RmKg: null,
};

/**
 * Epley one-rep-max estimate, rounded to 0.1 kg exactly like BodyLab.
 *
 * `reps <= 1` returns the load itself: the formula inflates a true single by
 * ~3 %, and calling a fresh single a "record" over the same single would be
 * nonsense.
 */
export function epleyOneRm(
  weightKg: number | null,
  reps: number | null,
): number | null {
  if (weightKg === null || reps === null) return null;
  if (!Number.isFinite(weightKg) || !Number.isFinite(reps)) return null;
  if (weightKg <= 0 || reps <= 0) return null;
  if (reps <= 1) return round1(weightKg);
  return round1(weightKg * (1 + reps / 30));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Flatten a list of logged sets into the best marks for one exercise. */
export function marksOf(sets: LoggedSetLike[]): BestMarks {
  let bestWeightKg: number | null = null;
  let bestEst1RmKg: number | null = null;

  for (const set of sets) {
    if (set.weight !== null && set.weight > 0) {
      bestWeightKg =
        bestWeightKg === null ? set.weight : Math.max(bestWeightKg, set.weight);
    }
    const est = epleyOneRm(set.weight, set.reps);
    if (est !== null) {
      bestEst1RmKg = bestEst1RmKg === null ? est : Math.max(bestEst1RmKg, est);
    }
  }
  return { bestWeightKg, bestEst1RmKg };
}

/** The best of two mark sets — used to fold BodyLab's imported PRs in. */
export function mergeMarks(a: BestMarks, b: BestMarks): BestMarks {
  return {
    bestWeightKg: maxOrNull(a.bestWeightKg, b.bestWeightKg),
    bestEst1RmKg: maxOrNull(a.bestEst1RmKg, b.bestEst1RmKg),
  };
}

function maxOrNull(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/**
 * Does this set beat what we knew before?
 *
 * A heavier *load* wins outright and is reported as such — "180 kg" is a better
 * thing to read after a set than "e1RM 181.2". Only when the load does not beat
 * the old best do we look at the estimate, which is how a hard set of higher
 * reps (a legitimate PR, invisible in the raw weight column) still gets caught.
 *
 * A tie is explicitly **not** a record, so re-logging the same set twice does not
 * fire the fanfare.
 */
export function detectRecord(
  previous: BestMarks,
  weightKg: number | null,
  reps: number | null,
): RecordEvent | null {
  if (weightKg === null || weightKg <= 0) return null;

  if (previous.bestWeightKg !== null && weightKg > previous.bestWeightKg) {
    return { kind: "weight", value: weightKg, previous: previous.bestWeightKg };
  }
  if (previous.bestWeightKg === null) {
    // Nothing logged for this exercise yet — the first real load is a record.
    return { kind: "weight", value: weightKg, previous: null };
  }

  const est = epleyOneRm(weightKg, reps);
  if (est === null) return null;
  if (previous.bestEst1RmKg === null || est > previous.bestEst1RmKg) {
    return { kind: "e1rm", value: est, previous: previous.bestEst1RmKg };
  }
  return null;
}

/**
 * How many sets of `exerciseId` are logged today.
 *
 * Kept separate from {@link isExerciseComplete} so callers can show progress
 * ("2/3") and decide on the cue with the same numbers.
 */
export function setsDoneFor(
  sets: { exerciseId: string }[],
  exerciseId: string,
): number {
  let n = 0;
  for (const set of sets) if (set.exerciseId === exerciseId) n += 1;
  return n;
}

/**
 * True when this was the set that finished the exercise.
 *
 * `justLogged` is the count *including* the new set, `prescribed` the plan's
 * prescription. The equality check is what makes the cue fire once and stop:
 * extra sets beyond the prescription (a drop set, a bit of extra volume) are
 * welcome but are not another achievement.
 */
export function isExerciseComplete(
  justLogged: number,
  prescribed: number,
): boolean {
  return prescribed > 0 && justLogged === prescribed;
}

/** Fraction of the prescription done, clamped to 0–1, for a progress bar. */
export function completionRatio(done: number, prescribed: number): number {
  if (prescribed <= 0) return 0;
  return Math.min(Math.max(done / prescribed, 0), 1);
}

/**
 * Best marks per exercise across a whole log, ready to compare against.
 *
 * Built once per session render rather than per set, so logging stays O(1) in
 * the number of exercises.
 */
export function marksByExercise(
  sets: ({ exerciseId: string } & LoggedSetLike)[],
): Map<string, BestMarks> {
  const grouped = new Map<string, LoggedSetLike[]>();
  for (const set of sets) {
    const list = grouped.get(set.exerciseId);
    if (list) list.push(set);
    else grouped.set(set.exerciseId, [set]);
  }
  const out = new Map<string, BestMarks>();
  for (const [exerciseId, list] of grouped) out.set(exerciseId, marksOf(list));
  return out;
}
