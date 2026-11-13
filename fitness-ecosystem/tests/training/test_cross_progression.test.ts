/**
 * Tests for cross-exercise load inference and strength transfer.
 *
 * Validates that an unlogged exercise infers a grounded, scientifically backed
 * starting load and bilingual explanation from brother exercises in the log.
 *
 * @module tests/training/test_cross_progression
 */

import { describe, expect, it } from "vitest";
import {
  extractExercise1Rms,
  inferStartingLoad,
} from "../../traininglab/apps/desktop/src/lib/cross-progression";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

function mkSet(
  exerciseId: string,
  weight: number,
  reps: number,
  warmup = false,
): TLSet {
  return {
    id: `set-${Math.random()}`,
    exerciseId,
    dayId: "day-1",
    timestamp: "2026-11-10T12:00:00.000Z",
    weight,
    reps,
    warmup,
  };
}

describe("cross-progression: extractExercise1Rms", () => {
  it("extracts the highest e1RM per exercise, ignoring warmups", () => {
    const sets: TLSet[] = [
      mkSet("barbell-bench-press", 60, 10, true), // warmup, ignored
      mkSet("barbell-bench-press", 80, 8), // working: 80 * (1 + 8/30) = 101.3 kg
      mkSet("barbell-bench-press", 85, 6), // working: 85 * (1 + 6/30) = 102.0 kg
      mkSet("barbell-squat", 100, 10), // working: 100 * (1 + 10/30) = 133.3 kg
    ];

    const map = extractExercise1Rms(sets);
    expect(map.size).toBe(2);
    expect(Math.round(map.get("barbell-bench-press")!)).toBe(102);
    expect(Math.round(map.get("barbell-squat")!)).toBe(133);
  });
});

describe("cross-progression: inferStartingLoad", () => {
  it("infers incline dumbbell press weight from barbell bench press", () => {
    const sets: TLSet[] = [
      mkSet("barbell-bench-press", 80, 10), // 80 * (1 + 10/30) = 106.7 kg e1RM
    ];

    const result = inferStartingLoad({
      targetExerciseId: "incline-dumbbell-press",
      allSets: sets,
      targetReps: 10,
      stepKg: 2,
      lang: "es",
    });

    expect(result).not.toBeNull();
    // 106.7 kg * 0.32 = ~34.1 kg e1RM per dumbbell
    // working reps (10): (34.1 / (1 + 10/30)) * 0.90 = ~23.0 kg
    expect(result!.weightKg).toBeGreaterThanOrEqual(20);
    expect(result!.weightKg).toBeLessThanOrEqual(26);
    expect(result!.sourceExerciseId).toBe("barbell-bench-press");
    expect(result!.reason).toContain("Press con Barra");
    expect(result!.reason).toContain("1RM");
  });

  it("infers leg press weight from barbell squat", () => {
    const sets: TLSet[] = [
      mkSet("barbell-squat", 100, 10), // 133.3 kg e1RM
    ];

    const result = inferStartingLoad({
      targetExerciseId: "leg-press",
      allSets: sets,
      targetReps: 10,
      stepKg: 10,
      lang: "es",
    });

    expect(result).not.toBeNull();
    // 133.3 * 1.65 = ~220 kg e1RM
    // working reps (10): (220 / (1 + 10/30)) * 0.90 = ~148.5 kg -> rounded to 150 kg
    expect(result!.weightKg).toBeGreaterThanOrEqual(130);
    expect(result!.weightKg).toBeLessThanOrEqual(160);
    expect(result!.sourceExerciseId).toBe("barbell-squat");
  });

  it("clamps to gear cap if specified", () => {
    const sets: TLSet[] = [
      mkSet("barbell-squat", 120, 8),
    ];

    const result = inferStartingLoad({
      targetExerciseId: "leg-press",
      allSets: sets,
      targetReps: 10,
      stepKg: 5,
      capKg: 100, // Dumbbell / machine limit
    });

    expect(result).not.toBeNull();
    expect(result!.weightKg).toBe(100);
  });

  it("returns null when no brother exercises exist in user history", () => {
    const sets: TLSet[] = [
      mkSet("barbell-curl", 30, 10),
    ];

    // Trying to infer leg press from bicep curl (different pattern, no transfer)
    const result = inferStartingLoad({
      targetExerciseId: "leg-press",
      allSets: sets,
    });

    expect(result).toBeNull();
  });

  it("returns null for bodyweight movements with no external kg loading", () => {
    const sets: TLSet[] = [
      mkSet("barbell-bench-press", 80, 10),
    ];

    const result = inferStartingLoad({
      targetExerciseId: "push-ups",
      allSets: sets,
    });

    expect(result).toBeNull();
  });
});
