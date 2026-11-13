/**
 * Integration proof for the load suggestion the app actually shows.
 *
 * `inferStartingLoad` has its own unit tests; this file checks that
 * `suggestLoadFor` — the function SessionScreen and ZEN call — really reaches
 * it, and that it still refuses to invent a number when it has nothing solid.
 * Before this, a first-time exercise answered "sin historial, empieza ligero"
 * because the cross-exercise branch was not wired in.
 *
 * @module tests/training/test_plan_load_suggestion
 */

import { describe, expect, it } from "vitest";
import { ownedFromPreset } from "@fitness/bodylab-exercises";
import { suggestLoadFor } from "../../traininglab/apps/desktop/src/lib/plan";
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

// `suggestLoadFor` reads the *resolved* inventory (capabilities + increment),
// exactly what the store builds from a preset, not the stored {presetId} row.
const dumbbells = ownedFromPreset("dumbbells-adjustable", "gear-1")!;
const barAndBench = [
  ownedFromPreset("barbell", "gear-2"),
  ownedFromPreset("bench", "gear-3"),
].filter((item): item is NonNullable<typeof item> => item !== null);
const inventory = [dumbbells, ...barAndBench];
const fine = { energy: 3, motivation: 3, soreness: 3 } as never;

describe("suggestLoadFor — primera vez en un ejercicio", () => {
  it("hereda un peso del ejercicio hermano del historial, en vez de dejarlo en blanco", () => {
    const result = suggestLoadFor({
      loadType: "dumbbell",
      repsMin: 8,
      repsMax: 12,
      history: [],
      inventory,
      readiness: fine,
      exerciseId: "incline-dumbbell-press",
      allSets: [mkSet("barbell-bench-press", 80, 10)],
      lang: "es",
    });

    expect(result.weight).not.toBeNull();
    expect(result.weight).toBeGreaterThan(0);
    // Y lo dice: la app no presenta una estimación como una medición.
    expect(result.reason).toContain("Estimado");
    expect(result.reason).toContain("prior");
  });

  it("no inventa nada cuando no hay ningún ejercicio hermano registrado", () => {
    const result = suggestLoadFor({
      loadType: "dumbbell",
      repsMin: 8,
      repsMax: 12,
      history: [],
      inventory,
      readiness: fine,
      exerciseId: "incline-dumbbell-press",
      allSets: [mkSet("leg-press", 120, 10)],
      lang: "es",
    });

    expect(result.weight).toBeNull();
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("respeta el techo del equipamiento cuando el prior se pasa", () => {
    const result = suggestLoadFor({
      loadType: "dumbbell",
      repsMin: 8,
      repsMax: 12,
      history: [],
      inventory: [dumbbells],
      readiness: fine,
      exerciseId: "incline-dumbbell-press",
      allSets: [mkSet("barbell-bench-press", 140, 8)],
      lang: "es",
    });

    expect(result.weight).not.toBeNull();
    // The preset's ceiling is the ceiling: the prior never proposes past it.
    expect(result.weight!).toBeLessThanOrEqual(dumbbells.maxLoadKg as number);
  });

  it("no inventa kilos en un ejercicio de peso corporal", () => {
    const result = suggestLoadFor({
      loadType: "bodyweight",
      repsMin: 6,
      repsMax: 10,
      history: [],
      inventory,
      readiness: fine,
      exerciseId: "pull-ups",
      allSets: [mkSet("barbell-bench-press", 80, 10)],
      lang: "es",
    });

    expect(result.weight).toBeNull();
  });
});
