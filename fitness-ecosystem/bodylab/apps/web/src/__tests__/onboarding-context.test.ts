/**
 * Tests for the onboarding context: the Sport/Atractivo tracks' pure logic —
 * catalog ids (contract values, must never change silently), the age-bracket
 * to published-source mapping across the owner's 15–90 range, and the exact
 * bracket edges.
 */

import { describe, expect, it } from "vitest";
import {
  AESTHETIC_PRESETS,
  BRACKET_SOURCE,
  OBJECTIVES,
  SPORTS,
  SPORT_FOCUS,
  ageBracket,
} from "../lib/onboarding-context";

describe("onboarding context — catalogs", () => {
  it("keeps the owner's example sports with stable ids", () => {
    expect(SPORTS.map((s) => s.id)).toEqual([
      "general",
      "running",
      "basketball",
      "speed_skating",
    ]);
    // Bilingual labels exist for every entry (UI copy is ES-first for the owner).
    expect(SPORTS.every((s) => s.en && s.es)).toBe(true);
  });

  it("offers the four training focuses and both tracks + aesthetic presets", () => {
    expect(SPORT_FOCUS.map((f) => f.id)).toEqual([
      "endurance",
      "power",
      "speed",
      "mobility",
    ]);
    expect(OBJECTIVES.map((o) => o.id)).toEqual([
      "sport",
      "handsome",
      "health",
    ]);
    expect(AESTHETIC_PRESETS.map((p) => p.id)).toEqual([
      "whtr",
      "ace_bf",
      "golden",
      "own",
    ]);
  });
});

describe("onboarding context — age brackets 15–94", () => {
  it("maps the owner's documented sources per bracket", () => {
    expect(BRACKET_SOURCE["15-19"]).toMatch(/ACE/);
    expect(BRACKET_SOURCE["20-59"]).toMatch(/Cooper/);
    expect(BRACKET_SOURCE["60-94"]).toMatch(/Rikli/);
  });

  it("classifies the bracket edges exactly", () => {
    expect(ageBracket(15)).toBe("15-19");
    expect(ageBracket(19)).toBe("15-19");
    expect(ageBracket(20)).toBe("20-59");
    expect(ageBracket(59)).toBe("20-59");
    expect(ageBracket(60)).toBe("60-94");
    expect(ageBracket(90)).toBe("60-94"); // owner's top of range
    expect(ageBracket(94)).toBe("60-94"); // the SFT's last published year
  });

  it("is null outside the published range and for junk input", () => {
    expect(ageBracket(14)).toBeNull();
    expect(ageBracket(95)).toBeNull();
    expect(ageBracket(null)).toBeNull();
    expect(ageBracket(Number.NaN)).toBeNull();
  });
});
