// ============================================================================
// lib/age — birth date ⇄ age derivation
//
// The bug this guards against: `Profile.age` was a hand-typed number that went
// stale every birthday, so the body-fat regression, body-age score and Cooper
// tables all drifted. These cases pin the calendar arithmetic (including the
// day before a birthday and leap days) and the one-shot legacy migration.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  DEFAULT_AGE,
  ageFromBirthDate,
  birthDateFromAge,
  daysUntilBirthday,
  formatBirthDate,
  isAgeUnknown,
  normalizeProfile,
  profileAge,
} from "../lib/age";
import type { Profile } from "../lib/types";

const at = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

function mkProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    name: "Test",
    height: 1.8,
    weight: 78,
    birthDate: null,
    biologicalSex: "male",
    units: "metric",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ageFromBirthDate", () => {
  it("counts whole years on the birthday itself", () => {
    expect(ageFromBirthDate("1990-05-14", at("2026-05-14"))).toBe(36);
  });

  it("still counts the previous age the day before the birthday", () => {
    expect(ageFromBirthDate("1990-05-14", at("2026-05-13"))).toBe(35);
  });

  it("handles the day after the birthday", () => {
    expect(ageFromBirthDate("1990-05-14", at("2026-05-15"))).toBe(36);
  });

  it("handles a birth date of 29 February in a non-leap year", () => {
    // 2026 is not a leap year: the person turns 36 on 28 Feb or 1 Mar, and
    // either way they are 36 for the whole of March.
    expect(ageFromBirthDate("1992-02-29", at("2026-03-01"))).toBe(34);
    expect(ageFromBirthDate("1992-02-29", at("2024-02-29"))).toBe(32);
  });

  it("rejects malformed and impossible dates instead of guessing", () => {
    expect(ageFromBirthDate("14/05/1990")).toBeNull();
    expect(ageFromBirthDate("2026-02-31")).toBeNull();
    expect(ageFromBirthDate("")).toBeNull();
    expect(ageFromBirthDate(null)).toBeNull();
    expect(ageFromBirthDate(undefined)).toBeNull();
  });

  it("rejects dates in the future and absurd ages", () => {
    expect(ageFromBirthDate("2030-01-01", at("2026-01-01"))).toBeNull();
    expect(ageFromBirthDate("1800-01-01", at("2026-01-01"))).toBeNull();
  });
});

describe("birthDateFromAge", () => {
  it("round-trips to the same age on the same day", () => {
    const today = at("2026-09-28");
    for (const age of [0, 18, 30, 45, 80]) {
      const birthDate = birthDateFromAge(age, today);
      expect(ageFromBirthDate(birthDate, today)).toBe(age);
    }
  });

  it("clamps nonsense input instead of producing a broken date", () => {
    const today = at("2026-09-28");
    expect(ageFromBirthDate(birthDateFromAge(Number.NaN, today), today)).toBe(
      DEFAULT_AGE,
    );
    expect(ageFromBirthDate(birthDateFromAge(-5, today), today)).toBe(0);
    // Absurd input is clamped to the accepted band rather than escaping it.
    expect(ageFromBirthDate(birthDateFromAge(999, today), today)).toBe(130);
  });
});

describe("profileAge", () => {
  it("prefers the birth date", () => {
    expect(
      profileAge(mkProfile({ birthDate: "1990-05-14" }), at("2026-05-20")),
    ).toBe(36);
  });

  it("falls back to the legacy age field", () => {
    expect(profileAge(mkProfile({ age: 42 }), at("2026-05-20"))).toBe(42);
  });

  it("never throws when the profile has no age information", () => {
    expect(profileAge(mkProfile(), at("2026-05-20"))).toBe(DEFAULT_AGE);
  });
});

describe("isAgeUnknown", () => {
  it("is true only when neither source can answer", () => {
    expect(isAgeUnknown(mkProfile())).toBe(true);
    expect(isAgeUnknown(mkProfile({ age: 30 }))).toBe(false);
    expect(isAgeUnknown(mkProfile({ birthDate: "1990-05-14" }))).toBe(false);
  });
});

describe("normalizeProfile (legacy migration)", () => {
  it("synthesises a birth date from a legacy age and drops the number", () => {
    const migrated = normalizeProfile(mkProfile({ age: 30 }));
    expect(migrated.birthDate).toBe(birthDateFromAge(30));
    expect(migrated.age).toBeUndefined();
    // The migration must be a no-op the second time round.
    expect(normalizeProfile(migrated)).toBe(migrated);
  });

  it("leaves an already-migrated profile untouched (same reference)", () => {
    const profile = mkProfile({ birthDate: "1990-05-14" });
    expect(normalizeProfile(profile)).toBe(profile);
  });

  it('records "unknown" rather than inventing an age', () => {
    const profile = mkProfile();
    const migrated = normalizeProfile(profile);
    expect(migrated.birthDate).toBeNull();
  });

  it("is idempotent", () => {
    const once = normalizeProfile(mkProfile({ age: 51 }));
    const twice = normalizeProfile(once);
    expect(twice.birthDate).toBe(once.birthDate);
  });
});

describe("daysUntilBirthday", () => {
  it("counts down to the next birthday", () => {
    expect(daysUntilBirthday("1990-05-14", at("2026-05-04"))).toBe(10);
  });

  it("returns 0 on the day and rolls over right after", () => {
    expect(daysUntilBirthday("1990-05-14", at("2026-05-14"))).toBe(0);
    expect(daysUntilBirthday("1990-05-14", at("2026-05-15"))).toBe(364);
  });

  it("is null without a usable date", () => {
    expect(daysUntilBirthday(null)).toBeNull();
    expect(daysUntilBirthday("nope")).toBeNull();
  });
});

describe("formatBirthDate", () => {
  it("is day-first in Spanish and month-first in English", () => {
    expect(formatBirthDate("1990-05-14", "es")).toBe("14/05/1990");
    expect(formatBirthDate("1990-05-14", "en")).toBe("05/14/1990");
    expect(formatBirthDate(null, "es")).toBe("—");
  });
});
