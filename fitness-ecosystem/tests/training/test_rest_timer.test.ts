/**
 * The rest between sets, as arithmetic (2026-10-14, mockup 03 port).
 *
 * The rest used to be a component's own `useState`, which meant the whole rest
 * died whenever that component was remounted — and the approved session page
 * draws it in a card *inside* the screen while every other destination shows a
 * floating overlay: two views that a local countdown cannot keep in agreement.
 * The store keeps a **deadline** now (`lib/rest.ts`) and both views only render
 * it. What is pinned here is exactly what makes that shape work:
 *
 *   1. **the deadline is absolute** — `endsAt` is what both views read, so the
 *      seconds left do not depend on when a view was mounted;
 *   2. **a pause is not a reset** — pausing freezes the remainder and resuming
 *      rebuilds the deadline from it, so a rest paused for a minute still owes
 *      that minute;
 *   3. **+15 s grows the prescription too** — `total` is the denominator of the
 *      ring, and a rest that only pushed the deadline would draw a bar that can
 *      pass 100 %;
 *   4. **nothing is ever negative** — the views format `mm:ss` from these
 *      numbers, and a `-3` would render as `0:-3`.
 *
 * The clock is passed in (`now`), never read from `Date.now()` inside the
 * module, which is what makes all four testable out here.
 */

import { describe, expect, it } from "vitest";
import {
  REST_EXTRA_SEC,
  extendRest,
  restIsDone,
  restPercent,
  restRemaining,
  startRest,
  toggleRestPause,
} from "../../traininglab/apps/desktop/src/lib/rest";

const T0 = 1_700_000_000_000;

describe("lib/rest — the rest as a deadline", () => {
  it("starts a rest that ends `seconds` from now, not from a mount", () => {
    const rest = startRest("press-banca", 90, 1, T0);
    expect(rest.endsAt).toBe(T0 + 90_000);
    expect(rest.total).toBe(90);
    expect(rest.pausedRemaining).toBeNull();
    // The same deadline read at three different moments: what the two views see
    // is a function of the clock, not of when each of them mounted.
    expect(restRemaining(rest, T0)).toBe(90);
    expect(restRemaining(rest, T0 + 30_000)).toBe(60);
    expect(restRemaining(rest, T0 + 89_500)).toBe(1);
  });

  it("counts to zero and stops there", () => {
    const rest = startRest("sentadilla", 60, 2, T0);
    expect(restRemaining(rest, T0 + 60_000)).toBe(0);
    expect(restRemaining(rest, T0 + 61_234)).toBe(0);
    expect(restIsDone(rest, T0 + 59_999)).toBe(false);
    expect(restIsDone(rest, T0 + 60_000)).toBe(true);
  });

  it("keeps the configured seconds sane", () => {
    // A fractional or negative setting must not produce a rest that ends in the
    // past or a `total` the ring divides by.
    const rest = startRest("remo", -30, 3, T0);
    expect(rest.total).toBe(0);
    expect(rest.endsAt).toBe(T0);
    expect(restIsDone(rest, T0)).toBe(true);
    expect(restPercent(rest, 0)).toBe(0);
  });

  it("freezes the remainder while paused and gives it back on resume", () => {
    const rest = startRest("dominadas", 120, 4, T0);
    // Paused 20 s in, with 100 s still owed.
    const paused = toggleRestPause(rest, T0 + 20_000);
    expect(paused.pausedRemaining).toBe(100);

    // A whole minute of being paused: the numbers do not move, and the rest is
    // emphatically not done — that is the difference between paused and over.
    const later = T0 + 80_000;
    expect(restRemaining(paused, later)).toBe(100);
    expect(restIsDone(paused, later)).toBe(false);

    const resumed = toggleRestPause(paused, later);
    expect(resumed.pausedRemaining).toBeNull();
    expect(resumed.endsAt).toBe(later + 100_000);
    expect(restRemaining(resumed, later)).toBe(100);
  });

  it("+15 s grows the prescription, pushes the deadline and survives a pause", () => {
    const rest = startRest("press-militar", 90, 5, T0);
    const longer = extendRest(rest, REST_EXTRA_SEC);
    expect(longer.total).toBe(105);
    expect(longer.endsAt).toBe(T0 + 105_000);
    expect(restRemaining(longer, T0 + 45_000)).toBe(60);

    const paused = toggleRestPause(longer, T0 + 45_000);
    expect(extendRest(paused, REST_EXTRA_SEC).pausedRemaining).toBe(75);
  });

  it("draws a ring that never passes a full turn", () => {
    const rest = startRest("curl-biceps", 60, 6, T0);
    expect(restPercent(rest, 60)).toBe(0);
    expect(restPercent(rest, 30)).toBe(50);
    expect(restPercent(rest, 0)).toBe(100);
    // Reading the ring after the rest has expired (or with a clock that lagged)
    // must not overflow it: the stylesheet's conic-gradient has no clamp.
    expect(restPercent(rest, -10)).toBe(100);
    expect(restPercent(rest, 200)).toBe(0);
  });

  it("is a plain object, so it rides the store without identity surprises", () => {
    // The store rewrites it with pure functions on every verb; the check is that
    // no verb mutates its argument, or `setRest` would be a no-op on a value React
    // never sees change.
    const rest = startRest("peso-muerto", 180, 7, T0);
    const snapshot = { ...rest };
    extendRest(rest, 15);
    toggleRestPause(rest, T0 + 10_000);
    restRemaining(rest, T0 + 10_000);
    expect(rest).toEqual(snapshot);
  });
});
