/**
 * Weekly volume (T4) — the tonnage ledger's honesty rules.
 *
 * The card on Progreso shows kilograms, so this suite pins the claims that
 * make those kilograms defensible:
 *
 *   1. warm-ups (and sets without weight × reps) are not tonnage;
 *   2. weeks are Monday-based, oldest first, and an empty week is a zero —
 *      never a missing bar;
 *   3. the trend compares this partial week against the *same elapsed days*
 *      of the previous week, so a Monday never reads as a collapse;
 *   4. family tonnage credits only the exercise's target families (intensity
 *      3), counts each family once per set, and shows absent — never a
 *      fabricated zero — when nothing was lifted.
 *
 * @module tests/training/test_weekly_volume
 */

import { describe, expect, it } from "vitest";
import { weeklyVolume } from "../../traininglab/apps/desktop/src/features/stats/derive";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

let seq = 0;
const mk = (
  exerciseId: string,
  timestamp: string,
  weight: number | null,
  reps: number | null,
  warmup?: boolean,
): TLSet => ({
  id: `set-${++seq}`,
  exerciseId,
  dayId: "day-1",
  timestamp,
  weight,
  reps,
  ...(warmup ? { warmup: true } : {}),
});

/** Sunday 2026-10-04: the current week is Mon 2026-09-28 … Sun 2026-10-04. */
const SUNDAY = new Date(2026, 9, 4);
/** Thursday 2026-10-01: the current week is only 4 days old. */
const THURSDAY = new Date(2026, 9, 1);

describe("weeklyVolume: weeks and tonnage", () => {
  it("buckets by Monday, oldest first, and keeps empty weeks as zeros", () => {
    const sets = [
      mk("barbell-bench-press", "2026-09-29T12:00:00", 100, 5), // current week
      mk("dumbbell-curl", "2026-10-04T12:00:00", 20, 10), // current week (Sunday)
      mk("barbell-bench-press", "2026-09-27T12:00:00", 80, 5), // previous week
    ];
    const v = weeklyVolume(sets, 8, SUNDAY);

    expect(v.weeks).toHaveLength(8);
    expect(v.weeks[0]!.weekStart).toBe("2026-08-10"); // 7 weeks before 09-28
    expect(v.weeks[0]!.kg).toBe(0); // an empty week is a zero, not a gap
    expect(v.weeks[6]!.weekStart).toBe("2026-09-21");
    expect(v.weeks[6]!.kg).toBe(400);
    expect(v.weeks[7]!.weekStart).toBe("2026-09-28");
    expect(v.weeks[7]!.kg).toBe(700);
    expect(v.weeks[7]!.sets).toBe(2);
    expect(v.current.weekStart).toBe("2026-09-28");
    expect(v.current.kg).toBe(700);
  });

  it("excludes warm-ups from both the tonnage and the set count", () => {
    const sets = [
      mk("barbell-bench-press", "2026-09-30T12:00:00", 100, 5),
      mk("barbell-bench-press", "2026-09-30T12:05:00", 40, 8, true),
      mk("dumbbell-curl", "2026-09-30T12:10:00", 10, 12, true),
    ];
    const v = weeklyVolume(sets, 8, SUNDAY);

    expect(v.current.kg).toBe(500);
    expect(v.current.sets).toBe(1);
    const chest = v.families.find((f) => f.family === "chest");
    expect(chest?.kg).toBe(500);
  });

  it("counts a set without weight × reps as sets but never as tonnage", () => {
    const sets = [
      // Timed hold (plank): duration instead of reps, no weight.
      mk("plank", "2026-09-30T12:00:00", null, null),
      // The 0-rep sets the OCR recovered literally.
      mk("dumbbell-curl", "2026-09-30T12:05:00", 10, 0),
    ];
    const v = weeklyVolume(sets, 8, SUNDAY);

    expect(v.current.sets).toBe(2);
    expect(v.current.kg).toBe(0);
    expect(v.families).toEqual([]);
    // …and zero across the whole window is an absent card, not a claim of 0.
    const empty = weeklyVolume([], 8, SUNDAY);
    expect(empty.trend).toBe("flat");
    expect(empty.families).toEqual([]);
  });
});

describe("weeklyVolume: the aligned trend", () => {
  it("compares a partial week against the same elapsed days of the last week", () => {
    const sets = [
      // Current week (Mon 9-28 … Thu 10-01): 500 kg.
      mk("barbell-bench-press", "2026-09-29T12:00:00", 100, 5),
      // Aligned span of the previous week (Mon 9-21 … Thu 9-24): 400 kg.
      mk("barbell-bench-press", "2026-09-22T12:00:00", 80, 5),
      // Friday of last week: inside the full week, OUTSIDE the aligned span.
      mk("barbell-bench-press", "2026-09-25T12:00:00", 200, 5),
    ];
    const v = weeklyVolume(sets, 8, THURSDAY);

    expect(v.current.kg).toBe(500);
    expect(v.previousAligned.weekStart).toBe("2026-09-21");
    expect(v.previousAligned.kg).toBe(400); // Friday's 1000 kg excluded
    expect(v.previousAligned.sets).toBe(1);
    expect(v.trend).toBe("up"); // 500 vs 400 clears the 10 % threshold
    // The full previous week still carries everything logged in it.
    expect(v.weeks[6]!.weekStart).toBe("2026-09-21");
    expect(v.weeks[6]!.kg).toBe(1400);
  });

  it("stays flat on an equal week and rises from nothing", () => {
    const flat = weeklyVolume(
      [
        mk("barbell-bench-press", "2026-09-29T12:00:00", 100, 5),
        mk("barbell-bench-press", "2026-09-22T12:00:00", 100, 5),
      ],
      8,
      THURSDAY,
    );
    expect(flat.trend).toBe("flat");

    const rising = weeklyVolume(
      [mk("barbell-bench-press", "2026-09-29T12:00:00", 100, 5)],
      8,
      THURSDAY,
    );
    expect(rising.trend).toBe("up");
  });
});

describe("weeklyVolume: family tonnage", () => {
  it("credits only target families, once per set, sorted by kilos", () => {
    const sets = [
      // Bench: chest is primary (3); triceps and front delt are secondary (2),
      // so they must receive nothing.
      mk("barbell-bench-press", "2026-09-29T12:00:00", 100, 5), // chest 500
      mk("dumbbell-curl", "2026-09-30T12:00:00", 20, 10), // biceps 200
      mk("dumbbell-curl", "2026-09-30T12:05:00", 20, 10, true), // warm-up: nothing
    ];
    const v = weeklyVolume(sets, 8, SUNDAY);

    expect(v.families.map((f) => f.family)).toEqual(["chest", "biceps"]);
    const chest = v.families[0]!;
    expect(chest.kg).toBe(500); // both chest heads map to one family, once
    expect(chest.previousKg).toBe(0);
    expect(chest.trend).toBe("up");
    expect(v.families[1]!.kg).toBe(200);
    // The secondary triceps work never appears.
    expect(v.families.some((f) => f.family === "triceps")).toBe(false);
  });

  it("keeps an unknown exercise out of the families but inside the week", () => {
    const sets = [mk("ghost-exercise", "2026-09-29T12:00:00", 50, 10)];
    const v = weeklyVolume(sets, 8, SUNDAY);

    expect(v.current.kg).toBe(500); // the kilograms were really lifted
    expect(v.families).toEqual([]); // but no family may claim them
  });

  it("is deterministic for the same inputs", () => {
    const sets = [mk("barbell-bench-press", "2026-09-29T12:00:00", 100, 5)];
    expect(weeklyVolume(sets, 8, SUNDAY)).toEqual(
      weeklyVolume(sets, 8, SUNDAY),
    );
  });
});
