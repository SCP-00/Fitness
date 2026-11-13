/**
 * Tests for biomechanical exercise substitutes and SFR scoring.
 *
 * Verifies that:
 *   1. SFR (Stimulus-to-Fatigue Ratio) score is calculated accurately.
 *   2. Alternatives are ranked according to biomechanics, joint/spine health,
 *      and individual anthropometric levers (e.g. long femurs in squats).
 *   3. Stretch-mediated hypertrophy advantages are recognized.
 *
 * @module tests/training/test_exercise_substitutes
 */

import { describe, expect, it } from "vitest";
import {
  calculateSfrScore,
  findExerciseSubstitutes,
} from "../../traininglab/apps/desktop/src/lib/exercise-substitutes";
import { ownedFromPreset } from "@fitness/bodylab-exercises";

describe("exercise-substitutes: calculateSfrScore", () => {
  it("rewards high hypertrophy with low joint and spine wear", () => {
    // Chest-supported row: hypertrophy 5, jointStress 1, spineLoad 1
    const highSfr = calculateSfrScore(5, 1, 1);
    // Barbell bent-over row: hypertrophy 4, jointStress 2, spineLoad 3
    const lowSfr = calculateSfrScore(4, 2, 3);

    expect(highSfr).toBeGreaterThan(lowSfr);
    expect(highSfr).toBe(6.3); // (5 * 2.5) / 2 = 6.25 -> 6.3
  });
});

describe("exercise-substitutes: findExerciseSubstitutes", () => {
  it("prioritizes long-femur friendly variants for barbell squat", () => {
    const substitutes = findExerciseSubstitutes({
      exerciseId: "barbell-squat",
      hasLongFemur: true,
      lang: "es",
    });

    expect(substitutes.length).toBeGreaterThan(0);
    // Front squat, hack squat, goblet squat or leg press should lead
    const topIds = substitutes.slice(0, 3).map((s) => s.exercise.id);
    const hasLongFemurSolution = topIds.some((id) =>
      ["front-squat", "hack-squat", "goblet-squat", "leg-press"].includes(id),
    );
    expect(hasLongFemurSolution).toBe(true);

    const frontSquat = substitutes.find((s) => s.exercise.id === "front-squat");
    expect(frontSquat?.anatomicalNote).toContain("fémur largo");
  });

  it("prioritizes spine-friendly alternatives when low spine load is preferred", () => {
    const substitutes = findExerciseSubstitutes({
      exerciseId: "barbell-row",
      preferLowSpineLoad: true,
      lang: "es",
    });

    expect(substitutes.length).toBeGreaterThan(0);
    const chestSupported = substitutes.find(
      (s) => s.exercise.id === "chest-supported-dumbbell-row",
    );
    expect(chestSupported).toBeDefined();
    expect(chestSupported?.spineFriendly).toBe(true);
    expect(chestSupported?.scientificReason).toContain("lumbar");
  });

  it("flags stretch-mediated hypertrophy benefits (Maeo et al. 2021)", () => {
    const substitutes = findExerciseSubstitutes({
      exerciseId: "leg-curl",
      preferStretchMediated: true,
      lang: "es",
    });

    const seatedCurl = substitutes.find(
      (s) => s.exercise.id === "seated-leg-curl",
    );
    expect(seatedCurl).toBeDefined();
    expect(seatedCurl?.stretchAdvantage).toBe(true);
    expect(seatedCurl?.scientificReason).toContain("Maeo 2021");
  });

  it("identifies gear legality based on user inventory", () => {
    const homeInv = [
      ownedFromPreset("pullup-bar", "i1")!,
      ownedFromPreset("dumbbells-adjustable", "i2")!,
      ownedFromPreset("bench", "i3")!,
    ];

    const substitutes = findExerciseSubstitutes({
      exerciseId: "barbell-bench-press",
      inventory: homeInv,
      lang: "es",
    });

    const dbPress = substitutes.find(
      (s) => s.exercise.id === "dumbbell-bench-press",
    );
    expect(dbPress?.isGearLegal).toBe(true);

    const machinePress = substitutes.find(
      (s) => s.exercise.id === "machine-bench-press",
    );
    expect(machinePress?.isGearLegal).toBe(false);
  });
});
