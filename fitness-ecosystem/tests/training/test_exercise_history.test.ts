/**
 * Per-exercise history — the exercise card's "Historial" tab.
 *
 * This tab shows the owner's *own* logged sets, including the ones imported
 * from Symmetry, so the rules that keep it honest are pinned here:
 *
 *   1. only the exact `exerciseId` is counted — no borrowing history from a
 *      similar exercise;
 *   2. warm-up ramp sets are listed but never add volume, a set count or a
 *      best mark (that exclusion is the app-wide contract);
 *   3. a day made only of timed holds reports `volumeKg: 0` and no best load,
 *      so the UI can say "timed work" instead of inventing kilos;
 *   4. literal 0-rep rows (the OCR artefact) count as sets and contribute no
 *      tonnage, matching `weeklyVolume`;
 *   5. days come back newest first and the totals cover **all** days, not the
 *      capped window — a total that forgets older sessions is a lie.
 *
 * @module tests/training/test_exercise_history
 */

import { describe, expect, it } from "vitest";
import { exerciseHistory } from "../../traininglab/apps/desktop/src/features/stats/derive";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

let seq = 0;
const mk = (
  exerciseId: string,
  timestamp: string,
  weight: number | null,
  reps: number | null,
  extra: Partial<TLSet> = {},
): TLSet => ({
  id: `set-${++seq}`,
  exerciseId,
  dayId: "day-1",
  timestamp,
  weight,
  reps,
  ...extra,
});

describe("exerciseHistory", () => {
  it("returns nothing for an exercise that was never logged", () => {
    const sets = [mk("barbell-squat", "2026-10-01T17:00:00.000Z", 100, 5)];
    const history = exerciseHistory(sets, "lat-pulldown");
    expect(history.days).toEqual([]);
    expect(history.totalDays).toBe(0);
    expect(history.totalWorkingSets).toBe(0);
    expect(history.totalVolumeKg).toBe(0);
  });

  it("never mixes two exercises, even ones from the same session", () => {
    const sets = [
      mk("lat-pulldown", "2026-10-01T17:00:00.000Z", 45, 10),
      mk("barbell-squat", "2026-10-01T18:00:00.000Z", 100, 5),
    ];
    const history = exerciseHistory(sets, "lat-pulldown");
    expect(history.days).toHaveLength(1);
    expect(history.totalWorkingSets).toBe(1);
    expect(history.totalVolumeKg).toBe(450);
  });

  it("groups sets by calendar day and orders the days newest first", () => {
    const sets = [
      mk("lat-pulldown", "2026-09-28T17:00:00.000Z", 40, 10),
      mk("lat-pulldown", "2026-09-28T17:20:00.000Z", 42, 8),
      mk("lat-pulldown", "2026-10-01T17:00:00.000Z", 45, 10),
    ];
    const history = exerciseHistory(sets, "lat-pulldown");
    expect(history.days.map((d) => d.date)).toEqual(["2026-10-01", "2026-09-28"]);
    expect(history.days[1]!.workingSets).toBe(2);
    // Heaviest first inside a day, so the best set of that day leads.
    expect(history.days[1]!.sets.map((s) => s.weight)).toEqual([42, 40]);
    expect(history.days[1]!.bestWeightKg).toBe(42);
  });

  it("lists warm-ups but keeps them out of volume, set count and best mark", () => {
    const sets = [
      mk("lat-pulldown", "2026-10-01T16:50:00.000Z", 20, 15, { warmup: true }),
      mk("lat-pulldown", "2026-10-01T17:00:00.000Z", 45, 10),
    ];
    const history = exerciseHistory(sets, "lat-pulldown");
    const day = history.days[0]!;
    expect(day.sets).toHaveLength(2);
    expect(day.sets.filter((s) => s.warmup)).toHaveLength(1);
    expect(day.workingSets).toBe(1);
    expect(day.volumeKg).toBe(450);
    expect(day.bestWeightKg).toBe(45);
    expect(history.totalWorkingSets).toBe(1);
  });

  it("reports a timed-hold day as zero kilos with no best load, not as a fake one", () => {
    const sets = [
      mk("plank", "2026-10-02T17:00:00.000Z", null, null, { durationSec: 60 }),
      mk("plank", "2026-10-02T17:05:00.000Z", null, null, { durationSec: 45 }),
    ];
    const history = exerciseHistory(sets, "plank");
    const day = history.days[0]!;
    expect(day.workingSets).toBe(2);
    expect(day.volumeKg).toBe(0);
    expect(day.bestWeightKg).toBeNull();
    expect(day.sets.map((s) => s.durationSec)).toEqual([60, 45]);
  });

  it("counts literal 0-rep rows as sets and never as tonnage", () => {
    const sets = [
      mk("bench-press", "2026-10-02T17:00:00.000Z", 60, 0),
      mk("bench-press", "2026-10-02T17:10:00.000Z", 60, 8),
    ];
    const history = exerciseHistory(sets, "bench-press");
    const day = history.days[0]!;
    expect(day.workingSets).toBe(2);
    expect(day.volumeKg).toBe(480);
    expect(day.bestWeightKg).toBe(60);
    expect(day.bestReps).toBe(8);
  });

  it("keeps D/F notes so an imported log is not silently rewritten", () => {
    const sets = [
      mk("tricep-pushdown", "2026-09-05T17:00:00.000Z", 31.8, 4, { notes: "F" }),
      mk("tricep-pushdown", "2026-09-05T17:10:00.000Z", 40.8, 10, { notes: "D" }),
    ];
    const history = exerciseHistory(sets, "tricep-pushdown");
    // Heaviest set first, so the drop set (40.8 kg) leads the failure set.
    expect(history.days[0]!.sets.map((s) => s.notes)).toEqual(["D", "F"]);
  });

  it("caps the rendered days but keeps the totals over the whole log", () => {
    const sets = Array.from({ length: 12 }, (_, i) =>
      mk(
        "lat-pulldown",
        `2026-09-${String(i + 1).padStart(2, "0")}T17:00:00.000Z`,
        40 + i,
        10,
      ),
    );
    const history = exerciseHistory(sets, "lat-pulldown", 8);
    expect(history.days).toHaveLength(8);
    expect(history.days[0]!.date).toBe("2026-09-12");
    expect(history.totalDays).toBe(12);
    expect(history.totalWorkingSets).toBe(12);
    // Σ (40+i)×10 for i = 0…11 = 10 × (40+…+51) = 10 × 546.
    expect(history.totalVolumeKg).toBe(5460);
  });

  it("rounds tonnage to one decimal so the card never shows float noise", () => {
    const sets = [
      mk("lat-pulldown", "2026-10-01T17:00:00.000Z", 45.4, 3),
      mk("lat-pulldown", "2026-10-01T17:10:00.000Z", 45.4, 4),
    ];
    const history = exerciseHistory(sets, "lat-pulldown");
    expect(history.totalVolumeKg).toBe(317.8);
  });
});