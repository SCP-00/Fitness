import { describe, expect, it } from "vitest";
import {
  anatomyFocusesForFamily,
  primaryExercisesForFocus,
} from "../../traininglab/apps/desktop/src/features/stats/anatomy";

describe("anatomy focus and exercise links", () => {
  it("exposes serratus anterior as a focus inside the chest family", () => {
    const [focus] = anatomyFocusesForFamily("chest");
    expect(focus?.muscle).toBe("serratus_anterior");
    expect(
      primaryExercisesForFocus("serratus_anterior").map((e) => e.id),
    ).toContain("push-up-plus");
  });

  it("separates the visible rectus and oblique focuses under core", () => {
    expect(anatomyFocusesForFamily("core").map((focus) => focus.id)).toEqual([
      "rectus_abdominis",
      "obliques",
    ]);
    expect(
      primaryExercisesForFocus("obliques").map((exercise) => exercise.id),
    ).toEqual([
      "side-plank",
      "pallof-press",
      "bicycle-crunch",
      "suitcase-carry",
    ]);
  });

  it("keeps quadriceps head specificity honest while linking the catalog group", () => {
    expect(
      anatomyFocusesForFamily("quadriceps").map((focus) => focus.id),
    ).toEqual(["quadriceps"]);
    expect(
      primaryExercisesForFocus("quadriceps").map((exercise) => exercise.id),
    ).toEqual(["leg-extension", "leg-press", "barbell-squat", "lunges"]);
  });

  it("does not recommend a muscle-target exercise unless catalog intensity is primary", async () => {
    const { ALL_EXERCISES } = await import("@fitness/bodylab-exercises");
    for (const focusId of [
      "serratus_anterior",
      "rectus_abdominis",
      "obliques",
      "quadriceps",
    ]) {
      const focus = anatomyFocusesForFamily(
        focusId === "serratus_anterior"
          ? "chest"
          : focusId === "quadriceps"
            ? "quadriceps"
            : "core",
      ).find((entry) => entry.id === focusId)!;
      for (const exercise of primaryExercisesForFocus(focusId)) {
        expect(
          ALL_EXERCISES.find((entry) => entry.id === exercise.id)?.muscles,
        ).toContainEqual({ muscle: focus.muscle, intensity: 3 });
        expect(exercise.category).not.toBe("cardio");
      }
    }
  });
});
