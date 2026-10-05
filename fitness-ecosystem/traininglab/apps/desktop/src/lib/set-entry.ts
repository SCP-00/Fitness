/**
 * What an empty reps field means when logging a set.
 *
 * The owner asked for this rule on 2026-10-05: you type the reps, and a set you
 * leave blank repeats the previous one — because that is how a log is actually
 * written. The third set of 12 is 12 until it is not; falling back to the
 * bottom of the prescribed range silently turned every repeated set into the
 * minimum, which is both wrong and invisible afterwards in every statistic.
 *
 * Pure on purpose: this is the part that used to be a `??` in the middle of a
 * component, where nothing could test it.
 *
 * @module lib/set-entry
 */

import type { TLSet } from "./types";

/**
 * The reps of the most recent set that actually recorded some, so a trailing
 * bodyweight set with no count does not wipe out the value to inherit.
 */
export function inheritedReps(sets: readonly TLSet[]): number | null {
  for (let i = sets.length - 1; i >= 0; i -= 1) {
    const reps = sets[i].reps;
    if (typeof reps === "number" && reps > 0) return reps;
  }
  return null;
}

export interface RepsResolution {
  /** The number that will be stored. */
  reps: number;
  /** Whether it came from the field or was assumed — the UI says so out loud. */
  inherited: boolean;
  /** Why that number, when it was not typed. */
  source: "typed" | "previous-set" | "prescribed-min";
}

/**
 * Resolve the reps of the set being logged.
 *
 * Typed value wins. An empty field means "same as the previous set", and only
 * when there is no previous set does it fall back to the prescribed minimum —
 * the one case where a guess is unavoidable, and the one worth flagging.
 */
export function resolveReps(input: {
  typed: number | null;
  sets: readonly TLSet[];
  prescribedMin: number;
}): RepsResolution {
  if (input.typed !== null && input.typed > 0) {
    return { reps: input.typed, inherited: false, source: "typed" };
  }
  const previous = inheritedReps(input.sets);
  if (previous !== null) {
    return { reps: previous, inherited: true, source: "previous-set" };
  }
  return { reps: input.prescribedMin, inherited: true, source: "prescribed-min" };
}