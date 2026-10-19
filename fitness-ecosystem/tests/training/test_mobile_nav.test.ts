/**
 * The phone's navigation partition (2026-10-19).
 *
 * The bug this prevents is silent: add a ninth destination to the rail and
 * forget one of the two mobile lists, and that screen becomes unreachable on a
 * phone (or reachable twice under different names). The rail remains the one
 * source of destinations; these lists only choose where each one lives.
 *
 * @module tests/training/mobile-nav
 */

import { describe, expect, it } from "vitest";
import {
  DESTINATIONS,
  MOBILE_PRIMARY,
  MOBILE_SECONDARY,
  destinationFor,
} from "../../traininglab/apps/desktop/src/app/nav";

describe("mobile navigation: one destination, one home", () => {
  it("covers every rail destination exactly once", () => {
    const all = [...MOBILE_PRIMARY, ...MOBILE_SECONDARY];
    const rail = DESTINATIONS.map((dest) => dest.id);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...rail].sort());
  });

  it("keeps four primary destinations and four behind More", () => {
    expect(MOBILE_PRIMARY).toHaveLength(4);
    expect(MOBILE_SECONDARY).toHaveLength(4);
  });

  it("resolves a destination by id, with a safe fallback", () => {
    expect(destinationFor("week").labelKey).toBe("nav.week");
    // A stale route must still render something rather than crash the bar.
    expect(destinationFor("nope" as never).id).toBe("today");
  });
});
