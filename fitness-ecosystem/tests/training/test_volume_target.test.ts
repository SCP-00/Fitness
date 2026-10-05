/**
 * Weekly volume target — the published band, pinned.
 *
 * What this locks down, and why each one matters to the owner reading Progreso:
 *
 *   1. the band is **12–20 direct sets per family per week** (Baz-Valle 2022),
 *      with triceps on the wider 12–24 the same review found better (p = 0.01);
 *   2. the edges are **inclusive** — 12 and 20 are in range, 21 is above;
 *   3. only sets where the family was the exercise's **primary** target count.
 *      Secondary and accessory work gets no credit here, because counting it
 *      would inflate the number against the literature's definition (the body
 *      map's fractional index is a different, separately-labelled metric);
 *   4. **warm-ups never count**, like everywhere else in the app;
 *   5. the window is the last 7 days from `now`, and a set outside it is not
 *      silently included;
 *   6. rows come back **biggest deficit first**, because that is the order that
 *      answers "what should I change on Monday?";
 *   7. a family with no direct set is **absent**, not a fabricated zero — the
 *      card says how many families were trained instead of listing 13 zeroes.
 *
 * @module tests/training/test_volume_target
 */

import { describe, expect, it } from "vitest";
import { weeklyDirectSets } from "../../traininglab/apps/desktop/src/features/stats/derive";
import {
  DEFAULT_WEEKLY_BAND,
  TRICEPS_WEEKLY_BAND,
  WEEKLY_SET_TARGETS,
  WIDER_BAND_FAMILIES,
  readVolume,
  summariseVolume,
} from "../../traininglab/apps/desktop/src/lib/volume-target";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

let seq = 0;
const set = (exerciseId: string, day: string): TLSet => {
  seq += 1;
  return {
    id: `set-${seq}`,
    exerciseId,
    sessionId: "s1",
    dayId: day,
    timestamp: `${day}T10:00:00.000Z`,
    weight: 20,
    reps: 10,
    warmup: false,
  } as TLSet;
};

/** 2026-10-05 is a Monday, so "last 7 days" is 2026-09-29 … 2026-10-05. */
const NOW = new Date("2026-10-05T12:00:00.000Z");

describe("volume target band", () => {
  it("uses the published 12–20 sets/week for every family except triceps", () => {
    expect(DEFAULT_WEEKLY_BAND).toEqual({ min: 12, max: 20 });
    expect(TRICEPS_WEEKLY_BAND).toEqual({ min: 12, max: 24 });
    expect(WIDER_BAND_FAMILIES).toEqual(["triceps"]);
    expect(Object.keys(WEEKLY_SET_TARGETS)).toHaveLength(13);
    for (const [family, band] of Object.entries(WEEKLY_SET_TARGETS)) {
      expect(band, family).toEqual(
        family === "triceps" ? TRICEPS_WEEKLY_BAND : DEFAULT_WEEKLY_BAND,
      );
    }
  });

  it("treats both band edges as in range", () => {
    expect(readVolume("biceps", 11).status).toBe("below");
    expect(readVolume("biceps", 12).status).toBe("in-range");
    expect(readVolume("biceps", 20).status).toBe("in-range");
    expect(readVolume("biceps", 21).status).toBe("above");
    // Triceps only leaves the band above 24.
    expect(readVolume("triceps", 21).status).toBe("in-range");
    expect(readVolume("triceps", 25).status).toBe("above");
  });

  it("reports how many sets are missing and never a negative gap", () => {
    expect(readVolume("chest", 5).missing).toBe(7);
    expect(readVolume("chest", 12).missing).toBe(0);
    expect(readVolume("chest", 30).missing).toBe(0);
    // A negative or non-finite count is read as "nothing logged", never as -12.
    expect(readVolume("chest", -3).directSets).toBe(0);
    expect(readVolume("chest", Number.NaN).directSets).toBe(0);
  });
});

describe("weeklyDirectSets", () => {
  it("counts only primary-target sets inside the 7-day window", () => {
    // 10 bench presses → chest; 4 curls → biceps. Both inside the window.
    const inside = [
      ...Array.from({ length: 10 }, () => set("barbell-bench-press", "2026-10-02")),
      ...Array.from({ length: 4 }, () => set("barbell-curl", "2026-10-03")),
    ];
    const counts = weeklyDirectSets(inside, 7, NOW);
    expect(counts.get("chest")).toBe(10);
    expect(counts.get("biceps")).toBe(4);
  });

  it("ignores warm-ups and days older than the window", () => {
    const warmup = { ...set("barbell-bench-press", "2026-10-02"), warmup: true } as TLSet;
    const old = set("barbell-bench-press", "2026-09-01");
    const counts = weeklyDirectSets([warmup, old], 7, NOW);
    expect(counts.get("chest")).toBeUndefined();
  });

  it("omits families with no direct set instead of reporting a zero", () => {
    const counts = weeklyDirectSets(
      [set("barbell-bench-press", "2026-10-02")],
      7,
      NOW,
    );
    expect([...counts.keys()]).toEqual(["chest"]);
  });
});

describe("summariseVolume", () => {
  it("orders biggest deficit first and counts the three statuses", () => {
    const summary = summariseVolume(
      new Map([
        ["chest", 14],
        ["biceps", 4],
        ["quadriceps", 2],
        ["calves", 30],
      ] as const),
    );
    // quadriceps 2 → missing 10, biceps 4 → missing 8: biggest gap first.
    expect(summary.rows.map((r) => r.family)).toEqual([
      "quadriceps",
      "biceps",
      "chest",
      "calves",
    ]);
    expect(summary.inRange).toBe(1);
    expect(summary.below).toBe(2);
    expect(summary.above).toBe(1);
    expect(summary.trained).toBe(4);
  });

  it("drops zero-entry families and survives an empty week", () => {
    const summary = summariseVolume(
      new Map([["chest", 0], ["lats", 10]] as const),
    );
    expect(summary.rows.map((r) => r.family)).toEqual(["lats"]);
    const empty = summariseVolume(new Map());
    expect(empty.trained).toBe(0);
    expect(empty.rows).toEqual([]);
  });
});