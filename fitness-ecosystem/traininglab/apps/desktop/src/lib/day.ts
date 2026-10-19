/**
 * The app's one definition of a calendar day.
 *
 * TrainingLab stored real instants (`new Date().toISOString()`, UTC) but derived
 * the *day* by slicing the first ten characters of that string — which is the UTC
 * date, not the day the owner trained. West of Greenwich, every set logged after
 * 19:00 local landed on the UTC date of the next day: one calendar day split into
 * two buckets at 19:00, an evening session filed under tomorrow, and a morning
 * session that stopped counting as "today" the moment the clock passed 19:00.
 * The rest of the app already spoke local time — imported history is written as
 * *local noon* on purpose (`lib/symmetry`, `lib/owner-log`) and the CSV export
 * reads local parts — so the log's own arithmetic disagreed with its imports.
 *
 * From now on the day key is computed from the instant in the machine's local
 * time, in one place, for every screen. `dayId` (the string stored on sets and
 * sessions) keeps its `day-YYYY-MM-DD` shape and now carries the local day too.
 *
 * Pure: no clock of its own (callers pass the timestamp) and no I/O, so it is
 * tested from the root suite (`tests/training/test_day_key`).
 *
 * @module lib/day
 */

/** `YYYY-MM-DD` only — a date the user typed, with no instant behind it. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The local calendar day of an instant, as `YYYY-MM-DD`.
 *
 * Accepts a Date or any ISO timestamp. A `YYYY-MM-DD` string is returned
 * unchanged: it names a day already (and `new Date("2026-10-01")` would parse it
 * as UTC midnight, i.e. the *previous* day for anyone west of Greenwich).
 * Unparseable input yields `""` — an empty key never equals a real day, so the
 * caller's comparison fails closed instead of matching by accident.
 */
export function localDayKey(value: string | Date): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's local day key. `now` is injectable so tests never read the clock. */
export function todayKey(now: Date = new Date()): string {
  return localDayKey(now);
}

/** True when the instant falls on the given local day (`YYYY-MM-DD`). */
export function isLocalDay(value: string | Date, dayKey: string): boolean {
  return dayKey !== "" && localDayKey(value) === dayKey;
}

/**
 * Midnight (local) of a day key, or `null` when the key is unusable.
 *
 * A date that does not exist (2026-13-40, 2026-02-30) would otherwise roll over
 * into another month, so the constructed date has to read back as itself.
 */
export function localDayStart(dayKey: string): Date | null {
  const m = DATE_ONLY.exec(dayKey);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}
