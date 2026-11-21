/**
 * The coach's weekly summary must quote the log, not its own arithmetic.
 *
 * The cases below pin the contract T07.2 hands to the interface:
 *
 *   * the period is local days and **both ends are included** — a session that
 *     closed on the first or the last day belongs to the week, the day before
 *     and the day after do not;
 *   * a session counts on the day it **closed**, so an open session is not a
 *     session yet and its sets stay out of the week;
 *   * warm-ups are logged but are not work, exactly as in every other
 *     aggregate;
 *   * every count carries its source ids, and an unusable period returns
 *     zeroes instead of a wrong week.
 *
 * @module tests/training/test_coach_weekly_summary
 */

import { describe, expect, it } from "vitest";
import { coachWeeklySummary } from "../../traininglab/apps/desktop/src/lib/coach-weekly-summary";
import type {
  TLSet,
  TLSession,
} from "../../traininglab/apps/desktop/src/lib/types";

const set = (
  id: string,
  timestamp: string,
  over: Partial<TLSet> = {},
): TLSet => ({
  id,
  exerciseId: "goblet-squat",
  dayId: `day-${timestamp.slice(0, 10)}`,
  timestamp,
  weight: 20,
  reps: 10,
  ...over,
});

const session = (
  id: string,
  completedAt: string | null,
  setIds: string[],
  over: Partial<TLSession> = {},
): TLSession => ({
  id,
  dayId: "day-1",
  startedAt: "2026-11-16T18:00:00",
  completedAt,
  setIds,
  ...over,
});

/* Monday 2026-11-16 → Sunday 2026-11-22, the week the owner trained. */
const FROM = "2026-11-16";
const TO = "2026-11-22";

describe("coachWeeklySummary: the period", () => {
  it("returns zeroes and no ids for an empty period", () => {
    const summary = coachWeeklySummary({
      sets: [set("s1", "2026-11-10T18:00:00")],
      sessions: [session("old", "2026-11-10T19:00:00", ["s1"])],
      from: FROM,
      to: TO,
    });

    expect(summary.closedSessions).toBe(0);
    expect(summary.sessionIds).toEqual([]);
    expect(summary.workingSets).toBe(0);
    expect(summary.setIds).toEqual([]);
    expect(summary).toMatchObject({ from: FROM, to: TO });
  });

  it("includes both boundary days and excludes the days around them", () => {
    const summary = coachWeeklySummary({
      sets: [
        set("mon", "2026-11-16T07:30:00"),
        set("sun", "2026-11-22T20:15:00"),
        set("before", "2026-11-15T23:59:00"),
        set("after", "2026-11-23T00:01:00"),
      ],
      sessions: [
        session("s-mon", "2026-11-16T08:10:00", ["mon"]),
        session("s-sun", "2026-11-22T21:00:00", ["sun"]),
        session("s-before", "2026-11-15T23:59:00", ["before"]),
        session("s-after", "2026-11-23T00:01:00", ["after"]),
      ],
      from: FROM,
      to: TO,
    });

    expect(summary.closedSessions).toBe(2);
    expect(summary.sessionIds).toEqual(["s-mon", "s-sun"]);
    expect(summary.workingSets).toBe(2);
    expect(summary.setIds).toEqual(["mon", "sun"]);
  });

  it("uses the local day of the close, not the UTC slice of the instant", () => {
    // 23:30 local on the last day is 02:30 UTC on the next one. Counting the
    // UTC prefix would drop the owner's Sunday-evening session from the week.
    const late = new Date(2026, 10, 22, 23, 30, 0);
    const summary = coachWeeklySummary({
      sets: [set("late", late.toISOString())],
      sessions: [session("s-late", late.toISOString(), ["late"])],
      from: FROM,
      to: TO,
    });

    expect(summary.closedSessions).toBe(1);
    expect(summary.sessionIds).toEqual(["s-late"]);
    expect(summary.workingSets).toBe(1);
    expect(summary.setIds).toEqual(["late"]);
  });

  it("refuses an unusable period instead of quoting a number", () => {
    const week = {
      sets: [set("s1", "2026-11-16T18:00:00")],
      sessions: [session("s", "2026-11-16T19:00:00", ["s1"])],
    };
    const backwards = coachWeeklySummary({ ...week, from: TO, to: FROM });
    const impossible = coachWeeklySummary({
      ...week,
      from: "2026-02-30",
      to: TO,
    });
    const empty = coachWeeklySummary({ ...week, from: "", to: TO });

    for (const summary of [backwards, impossible, empty]) {
      expect(summary.closedSessions).toBe(0);
      expect(summary.workingSets).toBe(0);
      expect(summary.setIds).toEqual([]);
    }
  });
});

describe("coachWeeklySummary: sessions and sets", () => {
  it("leaves open sessions — and their sets — out of the week", () => {
    const summary = coachWeeklySummary({
      sets: [
        set("closed-a", "2026-11-17T18:00:00"),
        set("closed-b", "2026-11-17T18:10:00"),
        set("open-set", "2026-11-18T18:00:00"),
      ],
      sessions: [
        session("closed", "2026-11-17T19:00:00", ["closed-a", "closed-b"]),
        session("open", null, ["open-set"]),
      ],
      from: FROM,
      to: TO,
    });

    expect(summary.closedSessions).toBe(1);
    expect(summary.sessionIds).toEqual(["closed"]);
    expect(summary.workingSets).toBe(2);
    expect(summary.setIds).toEqual(["closed-a", "closed-b"]);
  });

  it("counts warm-ups separately and never as working sets", () => {
    const summary = coachWeeklySummary({
      sets: [
        set("w1", "2026-11-18T18:00:00", { weight: 10, warmup: true }),
        set("w2", "2026-11-18T18:02:00", { weight: 15, warmup: true }),
        set("work-1", "2026-11-18T18:05:00"),
        set("work-2", "2026-11-18T18:10:00"),
      ],
      sessions: [
        session("s", "2026-11-18T19:00:00", ["w1", "w2", "work-1", "work-2"]),
      ],
      from: FROM,
      to: TO,
    });

    expect(summary.closedSessions).toBe(1);
    expect(summary.workingSets).toBe(2);
    expect(summary.warmupSets).toBe(2);
    expect(summary.setIds).toEqual(["w1", "w2", "work-1", "work-2"]);
  });

  it("counts only ids the log still has, once, in the session's own order", () => {
    const summary = coachWeeklySummary({
      sets: [
        set("second", "2026-11-19T18:10:00"),
        set("first", "2026-11-19T18:00:00"),
      ],
      sessions: [
        // "deleted" is no longer in the log; "first" is claimed by both.
        session("a", "2026-11-19T19:00:00", ["second", "deleted", "first"]),
        session("b", "2026-11-20T19:00:00", ["first"]),
      ],
      from: FROM,
      to: TO,
    });

    expect(summary.closedSessions).toBe(2);
    expect(summary.sessionIds).toEqual(["a", "b"]);
    expect(summary.workingSets).toBe(2);
    expect(summary.setIds).toEqual(["second", "first"]);
  });
});
