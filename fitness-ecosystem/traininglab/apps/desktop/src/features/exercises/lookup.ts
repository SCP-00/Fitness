/**
 * Catalog lookups shared by more than one feature.
 *
 * The library screen and the statistics module both need to answer "which muscle
 * families does this exercise train, and which one is its target?" — and they
 * must answer it identically, or the progress screen would disagree with the
 * plan. The mapping lives here once. It is the same 34-muscle → 13-family
 * function the planner's hard rules use, imported from `core/training`.
 *
 * @module features/exercises/lookup
 */

import { ALL_EXERCISES, type Exercise } from "@fitness/bodylab-exercises";
import { muscleFamilyOf, type MuscleFamily } from "@fitness/bodylab-training";

const BY_ID = new Map<string, Exercise>(
  ALL_EXERCISES.map((exercise) => [exercise.id, exercise]),
);

export function exerciseById(exerciseId: string): Exercise | null {
  return BY_ID.get(exerciseId) ?? null;
}

/** Every family this exercise touches, in catalog order. */
export function exerciseFamilies(exerciseId: string): MuscleFamily[] {
  const exercise = BY_ID.get(exerciseId);
  if (!exercise) return [];
  const out: MuscleFamily[] = [];
  for (const involvement of exercise.muscles) {
    const family = muscleFamilyOf(involvement.muscle);
    if (!out.includes(family)) out.push(family);
  }
  return out;
}

/** The family of the strongest muscle — how a row is filed and filtered. */
export function exercisePrimaryFamily(exerciseId: string): MuscleFamily | null {
  const exercise = BY_ID.get(exerciseId);
  if (!exercise || exercise.muscles.length === 0) return null;
  const strongest = exercise.muscles.find((m) => m.intensity === 3);
  return muscleFamilyOf((strongest ?? exercise.muscles[0]!).muscle);
}
