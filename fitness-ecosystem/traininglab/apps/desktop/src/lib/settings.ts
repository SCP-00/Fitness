/**
 * Settings → planning: the small pure adapters between what the user configures
 * and what the engines expect.
 *
 * @module lib/settings
 */

import type { RowOrder, TLSettingsData } from "./types";
import type { PlannedRow } from "./plan";
import type { ImportPayload } from "./adapter";

/** Which anatomical drawing the body map shows. */
export type BodyMapFigure = "male" | "female";

/**
 * The figure the map draws, from the user's choice and the imported profile.
 *
 * Two rules, both deliberate:
 *
 *   * **the import is only consulted in `auto`** — an explicit choice is never
 *     overridden by a file the user imported months ago;
 *   * **only the field BodyLab actually exports is read** (`biologicalSex`), and
 *     an unrecognised or missing value falls back to the male drawing instead
 *     of guessing. The screen says when the figure came from the import, so a
 *     wrong guess is visible rather than silent.
 */
export function resolveBodyMapFigure(
  settings: TLSettingsData | null | undefined,
  payload: ImportPayload | null | undefined,
): { figure: BodyMapFigure; from: "choice" | "bodylab" | "default" } {
  const choice = settings?.bodyMapFigure ?? "auto";
  if (choice === "male" || choice === "female") {
    return { figure: choice, from: "choice" };
  }
  const sex = (payload?.profile?.biologicalSex ?? "").trim().toLowerCase();
  if (sex.startsWith("f") || sex.startsWith("muj")) {
    return { figure: "female", from: "bodylab" };
  }
  if (sex.startsWith("m") || sex.startsWith("hom")) {
    return { figure: "male", from: "bodylab" };
  }
  return { figure: "male", from: "default" };
}

/**
 * The rep-range overrides the user set for one exercise, or `null` when the
 * planner's default stands. `null` inside the map removes the override; the
 * whole entry disappears when it becomes empty.
 */
export function applyRepOverrides(
  settings: TLSettingsData,
  rows: PlannedRow[],
): PlannedRow[] {
  const overrides = settings.repOverrides;
  if (!overrides || Object.keys(overrides).length === 0) return rows;
  return rows.map((row) => {
    const over = overrides[row.exerciseId];
    if (!over) return row;
    // The planner's RIR/rest/time stand; only the target range moves.
    return { ...row, repsMin: over.min, repsMax: Math.max(over.min, over.max) };
  });
}

/**
 * Reps per set for one exercise: the user's override, or the planner's
 * default range. One source of truth for ZEN's inputs and the plan's labels.
 */
export function repRangeFor(
  settings: TLSettingsData,
  row: PlannedRow,
): { min: number; max: number; custom: boolean } {
  const over = settings.repOverrides?.[row.exerciseId];
  if (over) {
    return { min: over.min, max: Math.max(over.min, over.max), custom: true };
  }
  return { min: row.repsMin, max: row.repsMax, custom: false };
}

/**
 * Set an override (or clear it with `null`) and return the next settings
 * object. Guarded: a range that arrives inverted is silently normalised, and
 * garbage inputs are ignored rather than persisted.
 */
export function withRepOverride(
  settings: TLSettingsData,
  exerciseId: string,
  range: { min: number; max: number } | null,
): TLSettingsData {
  const next: Record<string, { min: number; max: number }> = {
    ...settings.repOverrides,
  };
  if (range === null) {
    delete next[exerciseId];
  } else {
    const min = Math.max(1, Math.round(range.min));
    const max = Math.max(min, Math.round(range.max));
    if (!Number.isFinite(min) || !Number.isFinite(max)) return settings;
    next[exerciseId] = { min, max };
  }
  return { ...settings, repOverrides: next };
}

/* ══════════════════════════════════════════════════════════════════════════
   The session's sequence, decided by the user (2026-10-11)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The id sequence the user dragged into place for `date`, or `null`.
 *
 * The date check is what keeps a sequence a decision about one session instead
 * of a stale instruction to every future one: an order written yesterday is not
 * "no order", it is not an order for today.
 */
export function rowOrderFor(
  settings: TLSettingsData | null | undefined,
  date: string,
): string[] | null {
  const order = settings?.rowOrder;
  if (!order || order.date !== date) return null;
  const ids = order.ids.filter(
    (id) => typeof id === "string" && id.trim().length > 0,
  );
  return ids.length > 0 ? ids : null;
}

/**
 * Today's rows in the user's own sequence (mockup 03: "arrastra para cambiar el
 * orden").
 *
 * A permutation, never a filter — reviewed by test:
 *
 *   * ids the plan no longer contains are skipped (he swapped an exercise out,
 *     or the re-plan dropped it for time);
 *   * rows the sequence does not know (the plan added one, or the local coach
 *     proposed a different session) keep the generator's own position, *after*
 *     the ordered ones;
 *   * no row is ever lost or duplicated, and an absent or empty order returns the
 *     rows array untouched, by identity.
 */
export function applyRowOrder(
  settings: TLSettingsData | null | undefined,
  rows: PlannedRow[],
  date: string,
): PlannedRow[] {
  const ids = rowOrderFor(settings, date);
  if (!ids) return rows;
  const pool = [...rows];
  const out: PlannedRow[] = [];
  for (const id of ids) {
    const at = pool.findIndex((row) => row.exerciseId === id);
    if (at === -1) continue;
    out.push(pool.splice(at, 1)[0]!);
  }
  return [...out, ...pool];
}

/**
 * Persist the sequence for `date`. Empty or degenerate input clears it instead
 * of storing an order that would do nothing.
 */
export function withRowOrder(
  settings: TLSettingsData,
  date: string,
  ids: readonly string[],
): TLSettingsData {
  const clean = ids
    .filter((id) => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim());
  // One exercise is not a sequence: storing it would only be a stale instruction
  // waiting to be read as a real one. Clearing is the honest write.
  if (clean.length < 2) return clearRowOrder(settings);
  const next: RowOrder = { date, ids: clean };
  return { ...settings, rowOrder: next };
}

/** Back to the generator's own sequence. */
export function clearRowOrder(settings: TLSettingsData): TLSettingsData {
  if (!settings.rowOrder) return settings;
  return { ...settings, rowOrder: null };
}

/**
 * Follow a swap with the sequence (2026-10-11).
 *
 * A swap replaces *what sits in a slot* without moving the slot, so an active
 * sequence has to be rewritten in place: without this, the exercise that comes in
 * is unknown to the order and would drop to the end of the list — the very
 * shuffle the order exists to prevent. A no-op when there is no sequence for the
 * day, or when the replaced exercise is not in it.
 */
export function withRowOrderSwap(
  settings: TLSettingsData,
  date: string,
  from: string,
  to: string,
): TLSettingsData {
  const ids = rowOrderFor(settings, date);
  if (!ids || !ids.includes(from)) return settings;
  return withRowOrder(
    settings,
    date,
    ids.map((id) => (id === from ? to : id)),
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Saltar y posponer: las dos salidas de la sesión (mockup 03)
   ══════════════════════════════════════════════════════════════════════════════ */

/** What is set aside today: `{ skipped, postponed }`, both usually empty. */
export interface SessionAsideView {
  /** Ids set aside for the rest of the day, in the order they were set aside. */
  skipped: string[];
  /** Ids pushed to the end of today's session, in the order he postponed them. */
  postponed: string[];
}

const NO_ASIDE: SessionAsideView = { skipped: [], postponed: [] };

/**
 * The marks for `date`, sanitised — and **empty for any other day**.
 *
 * Same rule as the sequence: what was set aside on Monday is not an instruction
 * for Tuesday, so a record whose date is not this one is not "nothing recorded",
 * it is not a record for today. Ids are trimmed and deduped; a hand-edited file
 * that puts the same exercise in both lists resolves to *skipped*, which is the
 * wider promise ("not today").
 */
export function sessionAsideFor(
  settings: TLSettingsData | null | undefined,
  date: string,
): SessionAsideView {
  const aside = settings?.sessionAside;
  if (!aside || aside.date !== date) return NO_ASIDE;
  const clean = (ids: unknown): string[] => {
    if (!Array.isArray(ids)) return [];
    const out: string[] = [];
    for (const id of ids) {
      if (typeof id !== "string") continue;
      const trimmed = id.trim();
      if (trimmed.length === 0 || out.includes(trimmed)) continue;
      out.push(trimmed);
    }
    return out;
  };
  const skipped = clean(aside.skipped);
  const postponed = clean(aside.postponed).filter(
    (id) => !skipped.includes(id),
  );
  if (skipped.length === 0 && postponed.length === 0) return NO_ASIDE;
  return { skipped, postponed };
}

/**
 * The one write. An empty result stores `null` instead of an empty record: a
 * mark that does nothing is worse than no mark, because it looks like a state.
 */
function writeAside(
  settings: TLSettingsData,
  date: string,
  next: SessionAsideView,
): TLSettingsData {
  if (next.skipped.length === 0 && next.postponed.length === 0) {
    return clearSessionAside(settings);
  }
  return { ...settings, sessionAside: { date, ...next } };
}

/** Set an exercise aside for `date` (*Saltar*), or take the mark back. */
export function withRowSkip(
  settings: TLSettingsData,
  date: string,
  exerciseId: string,
  skipped = true,
): TLSettingsData {
  const id = typeof exerciseId === "string" ? exerciseId.trim() : "";
  if (id.length === 0) return settings;
  const current = sessionAsideFor(settings, date);
  const next: SessionAsideView = {
    // Setting one aside is also the correction of the other gesture: an exercise
    // cannot be "later" and "not today" at the same time.
    skipped: skipped
      ? [...current.skipped.filter((x) => x !== id), id]
      : current.skipped.filter((x) => x !== id),
    postponed: current.postponed.filter((x) => x !== id),
  };
  return writeAside(settings, date, next);
}

/** Push an exercise to the end of `date`'s session (*Posponer*), or take it back. */
export function withRowPostpone(
  settings: TLSettingsData,
  date: string,
  exerciseId: string,
  postponed = true,
): TLSettingsData {
  const id = typeof exerciseId === "string" ? exerciseId.trim() : "";
  if (id.length === 0) return settings;
  const current = sessionAsideFor(settings, date);
  const next: SessionAsideView = {
    skipped: current.skipped.filter((x) => x !== id),
    postponed: postponed
      ? [...current.postponed.filter((x) => x !== id), id]
      : current.postponed.filter((x) => x !== id),
  };
  return writeAside(settings, date, next);
}

/** Nothing set aside — the day's marks are gone, in one write. */
export function clearSessionAside(settings: TLSettingsData): TLSettingsData {
  if (!settings.sessionAside) return settings;
  return { ...settings, sessionAside: null };
}

/**
 * Today's rows with the postponed ones **last**, in the order he postponed them.
 *
 * A permutation, never a filter — the same contract as `applyRowOrder`, and for
 * the same reason: an exercise dropped here would silently leave the session. Ids
 * today's plan no longer contains (he swapped it out, the re-plan dropped it for
 * time, or the mark is simply stale) are ignored, and with nothing postponed the
 * array is returned by identity so the common case allocates nothing.
 */
export function applyPostponements(
  settings: TLSettingsData | null | undefined,
  rows: PlannedRow[],
  date: string,
): PlannedRow[] {
  const { postponed } = sessionAsideFor(settings, date);
  if (postponed.length === 0) return rows;
  const pool = [...rows];
  const tail: PlannedRow[] = [];
  for (const id of postponed) {
    const at = pool.findIndex((row) => row.exerciseId === id);
    if (at === -1) continue;
    tail.push(pool.splice(at, 1)[0]!);
  }
  if (tail.length === 0) return rows;
  return [...pool, ...tail];
}
