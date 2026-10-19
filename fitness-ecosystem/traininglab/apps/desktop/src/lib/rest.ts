/**
 * The rest between sets, as data — never as one component's local state.
 *
 * **2026-10-14 (mockup 03 port).** The rest used to be `{key, seconds, nonce}`
 * with the countdown living inside a single floating overlay: `RestTimer` owned
 * `remaining` in `useState` and ticked it. The approved page (`mockup/03-sesion.html`)
 * draws the rest as a card *inside* the session, and the app also shows a
 * floating overlay on every other screen — two views of one rest. With a local
 * countdown the two would disagree, and hiding/showing either of them would
 * restart the countdown from the top (which is what a remount does).
 *
 * So the store keeps the **deadline** and the views only render it:
 *
 *   * `endsAt` — epoch ms at which the rest reaches zero;
 *   * `total`  — the prescription, so the ring can show progress honestly;
 *   * `pausedRemaining` — seconds frozen while paused (`null` = running).
 *
 * Everything here is pure and takes `now` from the caller, which is what makes
 * the arithmetic testable from the root suite (see
 * `tests/training/test_rest_timer.test.ts`).
 *
 * @module lib/rest
 */

/** How much one tap on `+15 s` adds. */
export const REST_EXTRA_SEC = 15;

/** A rest in progress. `null` in the store means "no rest". */
export interface RestState {
  /** exerciseId the rest belongs to — named in the alert. */
  key: string;
  /** Seconds prescribed (grows with `+15 s`). */
  total: number;
  /** Epoch ms at which the rest reaches zero. Ignored while paused. */
  endsAt: number;
  /** Frozen remainder while paused, else `null`. */
  pausedRemaining: number | null;
  /** Identity of this rest: a new one re-arms the alert. */
  nonce: number;
}

/** Begin a rest of `seconds` for `key`, starting now. */
export function startRest(
  key: string,
  seconds: number,
  nonce: number,
  now: number,
): RestState {
  const safe = Math.max(0, Math.round(seconds));
  return {
    key,
    total: safe,
    endsAt: now + safe * 1000,
    pausedRemaining: null,
    nonce,
  };
}

/** Seconds left. Never negative, and frozen while paused. */
export function restRemaining(rest: RestState, now: number): number {
  if (rest.pausedRemaining !== null) return Math.max(0, rest.pausedRemaining);
  return Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
}

/** How much of the rest has been served, 0–100. */
export function restPercent(rest: RestState, remaining: number): number {
  if (rest.total <= 0) return 0;
  const served = ((rest.total - remaining) / rest.total) * 100;
  return Math.min(100, Math.max(0, Math.round(served)));
}

/** `+seconds` — grows the prescription and pushes the deadline. */
export function extendRest(rest: RestState, seconds: number): RestState {
  return {
    ...rest,
    total: rest.total + seconds,
    endsAt: rest.endsAt + seconds * 1000,
    pausedRemaining:
      rest.pausedRemaining === null
        ? null
        : Math.max(0, rest.pausedRemaining + seconds),
  };
}

/**
 * Pause, or resume. Pausing freezes the remainder (the deadline stops meaning
 * anything); resuming rebuilds the deadline from the frozen remainder, so a rest
 * paused for a minute does not lose that minute.
 */
export function toggleRestPause(rest: RestState, now: number): RestState {
  if (rest.pausedRemaining !== null) {
    return {
      ...rest,
      endsAt: now + rest.pausedRemaining * 1000,
      pausedRemaining: null,
    };
  }
  return {
    ...rest,
    pausedRemaining: Math.max(0, Math.ceil((rest.endsAt - now) / 1000)),
  };
}

/** A rest is over once nothing is left and it is not paused. */
export function restIsDone(rest: RestState, now: number): boolean {
  return rest.pausedRemaining === null && restRemaining(rest, now) <= 0;
}
