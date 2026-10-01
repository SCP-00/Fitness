/**
 * Focus muscles the supplied surface drawings can represent, plus exercises
 * whose shared catalog marks that muscle as a primary target (intensity 3).
 * This is a catalog lookup, not an EMG measurement or a per-muscle strength
 * estimate. Deep abdominal layers are intentionally not surfaced as if they
 * were visible in this superficial line drawing.
 */

import { ALL_EXERCISES, type MuscleGroup } from "@fitness/bodylab-exercises";
import type { MuscleFamily } from "@fitness/bodylab-training";

export interface AnatomyFocus {
  id: string;
  muscle: MuscleGroup;
  labelKey: string;
}

const FOCUSES: Partial<Record<MuscleFamily, AnatomyFocus[]>> = {
  chest: [
    {
      id: "serratus_anterior",
      muscle: "serratus_anterior",
      labelKey: "progress.body.focus.serratus",
    },
  ],
  core: [
    {
      id: "rectus_abdominis",
      muscle: "rectus_abdominis",
      labelKey: "progress.body.focus.rectus",
    },
    {
      id: "obliques",
      muscle: "obliques",
      labelKey: "progress.body.focus.obliques",
    },
  ],
  quadriceps: [
    {
      id: "quadriceps",
      muscle: "quadriceps",
      labelKey: "progress.body.focus.quadriceps",
    },
  ],
};

const PREFERRED_EXERCISES: Record<string, string[]> = {
  serratus_anterior: ["push-up-plus"],
  rectus_abdominis: ["dead-bug", "plank", "cable-crunch", "hanging-knee-raise"],
  obliques: ["side-plank", "pallof-press", "bicycle-crunch", "suitcase-carry"],
  quadriceps: ["leg-extension", "leg-press", "barbell-squat", "lunges"],
};

export function anatomyFocusesForFamily(family: string): AnatomyFocus[] {
  return FOCUSES[family as MuscleFamily] ?? [];
}

/** Primary-target catalog entries only, with simpler movements first. */
export function primaryExercisesForFocus(focusId: string) {
  const focus = Object.values(FOCUSES)
    .flat()
    .find((entry) => entry.id === focusId);
  if (!focus) return [];

  const primary = ALL_EXERCISES.filter(
    (exercise) =>
      exercise.category !== "cardio" &&
      exercise.muscles.some(
        (involvement) =>
          involvement.muscle === focus.muscle && involvement.intensity === 3,
      ),
  );
  const byId = new Map(primary.map((exercise) => [exercise.id, exercise]));
  const preferred = (PREFERRED_EXERCISES[focusId] ?? [])
    .map((id) => byId.get(id))
    .filter((exercise) => exercise !== undefined);
  const preferredIds = new Set(preferred.map((exercise) => exercise.id));
  const remaining = primary
    .filter((exercise) => !preferredIds.has(exercise.id))
    .sort(
      (a, b) =>
        a.difficulty - b.difficulty || a.name.es.localeCompare(b.name.es),
    );
  return [...preferred, ...remaining].slice(0, 4);
}
