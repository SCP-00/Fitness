/**
 * Age handling — BodyLab stores a **birth date**, never a frozen number.
 *
 * Why this module exists
 * ----------------------
 * `Profile.age` used to be a plain number typed in by hand. That is wrong on two
 * counts:
 *
 *   1. it silently goes stale — a profile created at 30 is still 30 three
 *      birthdays later, and every age-aware calculation in core
 *      (`@fitness/bodylab-analytics` body-fat/BMI regression, body age,
 *      health-risk thresholds, `@fitness/bodylab-conditioning` Cooper tables)
 *      quietly drifts with it; and
 *   2. it throws away information you cannot reconstruct.
 *
 * So the profile now keeps `birthDate` (ISO `YYYY-MM-DD`, the format a
 * `<input type="date">` produces) and the age is *derived* wherever it is
 * needed. Legacy profiles that only carry `age` are migrated once, on load, by
 * `normalizeProfile` in this file.
 *
 * Core APIs still take `age: number`: they are pure maths and must not know
 * about dates or time zones. The conversion happens here, at the UI boundary.
 *
 * @module lib/age
 */

import type { Profile } from "./types";

/** Age used when a profile has no usable birth date (matches the old default). */
export const DEFAULT_AGE = 25;

/** `YYYY-MM-DD` — the only shape we store. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whole years between `birthDate` and `at` (default: now).
 *
 * Returns `null` for a missing or malformed date so callers can decide between
 * "hide the field" and "use the fallback" instead of guessing. Comparison is
 * done on month/day rather than on a millisecond difference, which is what makes
 * the day *before* a birthday still count as the previous age.
 */
export function ageFromBirthDate(
  birthDate: string | null | undefined,
  at: Date = new Date(),
): number | null {
  if (!birthDate || !ISO_DATE.test(birthDate)) return null;

  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible dates that pass the regex (2026-02-31 → Mar 3).
  if (birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day)
    return null;

  let age = at.getUTCFullYear() - year;
  const hadBirthday =
    at.getUTCMonth() > month - 1 ||
    (at.getUTCMonth() === month - 1 && at.getUTCDate() >= day);
  if (!hadBirthday) age -= 1;

  return age >= 0 && age <= 130 ? age : null;
}

/**
 * Inverse of {@link ageFromBirthDate}: the birth date that makes a person
 * exactly `age` years old *today*.
 *
 * Used only to migrate legacy `age` numbers and to prefill the date picker, so
 * the "unknown day and month" is reported as January 1st. The resulting profile
 * is accurate to the year, which is all the old field ever claimed.
 */
export function birthDateFromAge(age: number, at: Date = new Date()): string {
  const safeAge = Number.isFinite(age)
    ? Math.min(Math.max(Math.round(age), 0), 130)
    : DEFAULT_AGE;
  return `${at.getUTCFullYear() - safeAge}-01-01`;
}

/**
 * The age to feed core calculations.
 *
 * Prefers a real birth date, falls back to a legacy `age` field, and finally to
 * {@link DEFAULT_AGE} — never throws, so no analytics panel can blank out
 * because the profile is incomplete.
 */
export function profileAge(
  profile: Pick<Profile, "birthDate"> & { age?: number | null },
  at: Date = new Date(),
): number {
  return ageFromBirthDate(profile.birthDate, at) ?? profile.age ?? DEFAULT_AGE;
}

/**
 * True when the profile has no age information at all (neither a birth date nor
 * a migrated legacy number) — the UI uses this to nudge the user once instead of
 * silently computing with {@link DEFAULT_AGE}.
 */
export function isAgeUnknown(
  profile: Pick<Profile, "birthDate"> & { age?: number | null },
): boolean {
  return ageFromBirthDate(profile.birthDate) === null && profile.age == null;
}

/** Days until the next birthday (0 = today), or `null` when unknown. */
export function daysUntilBirthday(
  birthDate: string | null | undefined,
  at: Date = new Date(),
): number | null {
  if (ageFromBirthDate(birthDate, at) === null || !birthDate) return null;

  const [, month, day] = birthDate.split("-").map(Number);
  const today = Date.UTC(
    at.getUTCFullYear(),
    at.getUTCMonth(),
    at.getUTCDate(),
  );
  let next = Date.UTC(at.getUTCFullYear(), month - 1, day);
  // Already passed this year (or it is Feb 29 in a non-leap year) → next year.
  if (next < today) next = Date.UTC(at.getUTCFullYear() + 1, month - 1, day);
  return Math.round((next - today) / 86_400_000);
}

/**
 * Upgrade a stored profile to the current shape, exactly once.
 *
 * A profile saved before the birth-date change carries only `age`; we keep the
 * legacy field (so an export/import round-trip through an older build still
 * works) and synthesise a `birthDate` from it. Returns the *same object* when
 * nothing needs doing, so `loadProfile` can cheaply decide whether to write
 * back.
 */
export function normalizeProfile(profile: Profile): Profile {
  if (profile.birthDate !== undefined && profile.birthDate !== null)
    return profile;

  const birthDate =
    typeof profile.age === "number" && Number.isFinite(profile.age)
      ? birthDateFromAge(profile.age)
      : null;

  return { ...profile, birthDate, age: undefined };
}

/** Format for display, honouring the app language (`14/05/1990` vs `05/14/1990`). */
export function formatBirthDate(
  birthDate: string | null | undefined,
  language: "en" | "es",
): string {
  if (!birthDate || !ISO_DATE.test(birthDate)) return "—";
  const [year, month, day] = birthDate.split("-");
  return language === "es"
    ? `${day}/${month}/${year}`
    : `${month}/${day}/${year}`;
}
