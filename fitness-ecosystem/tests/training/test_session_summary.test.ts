/**
 * The post-session summary must say exactly what the log supports.
 *
 * These cases pin the four rules the screen's copy depends on: warm-ups are not
 * work, a bodyweight set has no invented load, a short span has no duration, and
 * the list keeps the session's own order.
 *
 * @module tests/training/test_session_summary
 */

import { describe, expect, it } from "vitest";
import { summariseSession } from "../../traininglab/apps/desktop/src/lib/session-summary";
import type {
  TLSet,
  TLSession,
} from "../../traininglab/apps/desktop/src/lib/types";

const session = (over: Partial<TLSession> = {}): TLSession => ({
  id: "session-1",
  dayId: "day-2026-11-06",
  startedAt: "2026-11-06T10:00:00",
  completedAt: "2026-11-06T10:45:00",
  setIds: ["a", "b", "c"],
  ...over,
});

const set = (
  id: string,
  exerciseId: string,
  over: Partial<TLSet> = {},
): TLSet => ({
  id,
  exerciseId,
  dayId: "day-2026-11-06",
  timestamp: "2026-11-06T10:00:00",
  weight: 20,
  reps: 10,
  ...over,
});

describe("summariseSession", () => {
  it("cuenta series de trabajo, separa calentamientos y suma volumen", () => {
    const summary = summariseSession(session(), [
      set("a", "bench-press", { weight: 40, reps: 5 }),
      set("b", "bench-press", { weight: 20, reps: 10 }),
      set("c", "bench-press", { weight: 10, reps: 10, warmup: true }),
    ]);

    expect(summary).not.toBeNull();
    expect(summary!.workingSets).toBe(2);
    expect(summary!.warmupSets).toBe(1);
    expect(summary!.volumeKg).toBe(400);
    expect(summary!.exercises).toHaveLength(1);
    expect(summary!.exercises[0]!.topWeightKg).toBe(40);
    expect(summary!.exercises[0]!.topReps).toBe(5);
  });

  it("no inventa carga ni volumen en una serie a peso corporal", () => {
    const summary = summariseSession(session({ setIds: ["a"] }), [
      set("a", "pull-up", { weight: null, reps: 8 }),
    ]);

    expect(summary!.volumeKg).toBe(0);
    expect(summary!.exercises[0]!.topWeightKg).toBeNull();
    expect(summary!.exercises[0]!.totalReps).toBe(8);
  });

  it("sólo publica una duración cuando el intervalo es creíble", () => {
    const real = summariseSession(session(), [
      set("a", "bench-press"),
      set("b", "bench-press"),
    ]);
    const imported = summariseSession(
      session({
        startedAt: "2026-11-06T10:00:00",
        completedAt: "2026-11-06T10:02:00",
      }),
      [set("a", "bench-press")],
    );

    expect(real!.durationMin).toBe(45);
    expect(imported!.durationMin).toBeNull();
  });

  it("mantiene el orden en que la sesión guardó sus series", () => {
    const summary = summariseSession(session({ setIds: ["c", "a"] }), [
      set("a", "bench-press"),
      set("c", "barbell-row"),
    ]);

    expect(summary!.exercises.map((row) => row.exerciseId)).toEqual([
      "barbell-row",
      "bench-press",
    ]);
  });

  it("lista cada serie con su carga, reps, esfuerzo y marca", () => {
    const summary = summariseSession(session({ setIds: ["w", "a", "b"] }), [
      set("a", "bench-press", { weight: 40, reps: 5, rpe: 2, effort: "D" }),
      set("w", "bench-press", { weight: 20, reps: 10, warmup: true }),
      set("b", "bench-press", {
        weight: null,
        reps: null,
        durationSec: 30,
        rpe: 4,
      }),
    ]);

    expect(summary!.exercises[0]!.entries).toEqual([
      {
        id: "w",
        warmup: true,
        weightKg: 20,
        reps: 10,
        durationSec: null,
        effort: null,
        marker: null,
      },
      {
        id: "a",
        warmup: false,
        weightKg: 40,
        reps: 5,
        durationSec: null,
        effort: 2,
        marker: "D",
      },
      {
        id: "b",
        warmup: false,
        weightKg: null,
        reps: null,
        durationSec: 30,
        effort: 4,
        marker: null,
      },
    ]);
  });

  it("no convierte los calentamientos en volumen aunque los detalle", () => {
    const summary = summariseSession(session({ setIds: ["a", "w"] }), [
      set("a", "bench-press", { weight: 40, reps: 5 }),
      set("w", "bench-press", { weight: 20, reps: 10, warmup: true }),
    ]);

    expect(summary!.exercises[0]!.entries).toHaveLength(2);
    expect(
      summary!.exercises[0]!.entries.filter((entry) => entry.warmup),
    ).toHaveLength(1);
    expect(summary!.volumeKg).toBe(200);
  });

  it("cuenta las marcas D/F sólo en series de trabajo", () => {
    const summary = summariseSession(session({ setIds: ["a", "b"] }), [
      set("a", "bench-press", { effort: "D" }),
      set("b", "bench-press", { effort: "F", warmup: true }),
    ]);

    expect(summary!.marks).toBe(1);
  });

  it("ignora series que no pertenecen a la sesión", () => {
    const summary = summariseSession(session({ setIds: ["a"] }), [
      set("a", "bench-press"),
      set("foreign", "squat"),
    ]);

    expect(summary!.workingSets).toBe(1);
    expect(summary!.exercises[0]!.exerciseId).toBe("bench-press");
  });

  it("devuelve null cuando no queda ninguna serie que sumar", () => {
    expect(summariseSession(session(), [set("foreign", "squat")])).toBeNull();
  });
});
