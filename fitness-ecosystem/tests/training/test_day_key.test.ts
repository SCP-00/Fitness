/**
 * Calendar days are **local** days.
 *
 * The bug this pins: TrainingLab stored real UTC instants but derived the day by
 * slicing the first ten characters of the ISO string — the UTC date. West of
 * Greenwich that split one calendar day at 19:00 local (a morning set stopped
 * counting as "today"; the evening's sets were filed under tomorrow), which is
 * exactly when the owner trains. The tests below are written from the *local*
 * wall clock so they hold in any timezone; several of them fail on the old
 * expression whenever the machine is not on UTC.
 *
 * @module tests/training/day_key
 */

import { describe, expect, it } from "vitest";
import {
  isLocalDay,
  localDayKey,
  localDayStart,
  todayKey,
} from "../../traininglab/apps/desktop/src/lib/day";
import { summariseExerciseDays } from "../../traininglab/apps/desktop/src/lib/progression";
import { dayBuckets } from "../../traininglab/apps/desktop/src/features/stats/derive";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

/** A local wall-clock instant — the only honest way to write a day in a test. */
const at = (y: number, mo: number, d: number, h: number, mi = 0): Date =>
  new Date(y, mo - 1, d, h, mi, 0, 0);

let seq = 0;
function set(
  exerciseId: string,
  when: Date,
  weight: number,
  reps: number,
): TLSet {
  seq += 1;
  return {
    id: `d-${seq}`,
    exerciseId,
    dayId: `day-${localDayKey(when)}`,
    timestamp: when.toISOString(),
    weight,
    reps,
  };
}

describe("localDayKey: the day a set actually happened on", () => {
  it("keeps an evening session on the day it was trained", () => {
    // 21:38 local: in any timezone west of Greenwich the UTC date is already
    // tomorrow, which is how the evening sessions were being misfiled.
    expect(localDayKey(at(2026, 10, 11, 21, 38))).toBe("2026-10-11");
  });

  it("starts the day at local midnight, not at 05:00 or 19:00 local", () => {
    expect(localDayKey(at(2026, 10, 11, 23, 59))).toBe("2026-10-11");
    expect(localDayKey(at(2026, 10, 12, 0, 1))).toBe("2026-10-12");
  });

  it("puts a morning and an evening set of the same day in the same bucket", () => {
    // The whole point: one calendar day, one key.
    expect(localDayKey(at(2026, 10, 11, 9, 0))).toBe(
      localDayKey(at(2026, 10, 11, 21, 38)),
    );
  });

  it("reads an imported local-noon timestamp as its own date", () => {
    const noon = new Date(2026, 9, 4, 12, 0, 0, 0).toISOString();
    expect(localDayKey(noon)).toBe("2026-10-04");
  });

  it("returns a date-only string untouched", () => {
    // `new Date("2026-10-01")` is UTC midnight: parsing it would shift the day
    // back for anyone west of Greenwich.
    expect(localDayKey("2026-10-01")).toBe("2026-10-01");
  });

  it("fails closed on input that is not a date", () => {
    expect(localDayKey("not-a-date")).toBe("");
    expect(localDayKey(new Date("nope"))).toBe("");
    expect(isLocalDay("not-a-date", "")).toBe(false);
  });

  it("todayKey follows the local clock, injectably", () => {
    const now = at(2026, 10, 11, 22, 15);
    expect(todayKey(now)).toBe("2026-10-11");
    expect(localDayKey(now)).toBe(todayKey(now));
  });

  it("isLocalDay compares instants to a day key", () => {
    expect(isLocalDay(at(2026, 10, 11, 21, 38), "2026-10-11")).toBe(true);
    expect(isLocalDay(at(2026, 10, 12, 0, 30), "2026-10-11")).toBe(false);
  });

  it("localDayStart is local midnight of that day", () => {
    const start = localDayStart("2026-10-11");
    expect(start).not.toBeNull();
    expect(start!.getFullYear()).toBe(2026);
    expect(start!.getMonth()).toBe(9);
    expect(start!.getDate()).toBe(11);
    expect(start!.getHours()).toBe(0);
    expect(localDayStart("2026-13-40")).toBeNull();
  });
});

describe("the log buckets by that same local day", () => {
  it("summarises one local day as one day, morning and evening together", () => {
    const days = summariseExerciseDays([
      set("dumbbell-row", at(2026, 10, 11, 9, 0), 20, 10),
      set("dumbbell-row", at(2026, 10, 11, 21, 38), 22, 8),
      set("dumbbell-row", at(2026, 10, 12, 0, 5), 22, 9),
    ]);
    expect(days.map((d) => d.day)).toEqual(["2026-10-11", "2026-10-12"]);
    expect(days[0]!.sets).toBe(2);
    expect(days[0]!.topWeightKg).toBe(22);
    expect(days[1]!.sets).toBe(1);
  });

  it("counts an evening session in today's bucket, not tomorrow's", () => {
    const now = at(2026, 10, 11, 22, 30); // he is still in the gym
    const buckets = dayBuckets(
      [set("dumbbell-row", at(2026, 10, 11, 21, 38), 22, 8)],
      7,
      now,
    );
    const today = buckets[buckets.length - 1]!;
    expect(today.date).toBe("2026-10-11");
    expect(today.sets).toBe(1);
    expect(today.volume).toBe(176);
    expect(buckets.slice(0, -1).every((b) => b.sets === 0)).toBe(true);
  });
});
