/**
 * The physical-condition lens — the pure half.
 *
 * This module decides which published band a user's whole-body axes get; a
 * wrong band is a wrong claim about someone's health, so every honest-semantic
 * rule is pinned here:
 *
 *  - Cooper and %BF reuse the core tables (same bands as BodyLab, by sex+age
 *    and sex respectively) — pinned against the core's own test values.
 *  - WHtR is sex-neutral with the Ashwell cut-offs; the "increased" 0.5–0.6
 *    band must never read as healthy.
 *  - FFMI uses the Kouri (1995) definition and normalisation; the descriptive
 *    references are sex-specific and the guards reject impossible inputs
 *    instead of flattering them.
 *  - Missing data is null (→ "sin dato" in the UI), never 0, and no axis can
 *    classify without the sex/age its source actually stratifies by.
 *
 * @module tests/training/test_condition
 */

import { describe, expect, it } from "vitest";
import {
  computeFfmi,
  conditionProfile,
  heightMOf,
  sexOf,
  classifyWhtr,
  type ConditionAxis,
  type ConditionInput,
} from "../../traininglab/apps/desktop/src/features/stats/condition";
import type { ImportPayload } from "../../traininglab/apps/desktop/src/lib/adapter";

// ── Payload builders ───────────────────────────────────────────────────────

function profilePatch(
  patch: Partial<NonNullable<ImportPayload["profile"]>> = {},
): ImportPayload["profile"] {
  return {
    height: 1.68,
    weight: 65,
    age: 32,
    biologicalSex: "female",
    units: "metric",
    ...patch,
  };
}

function payload(
  patch: Partial<ImportPayload> = {},
): ImportPayload {
  return {
    format: "bodylab-traininglab-link",
    version: 2,
    profile: profilePatch(),
    measurements: [],
    muscleScores: [],
    muscleLoad: [],
    exerciseCatalog: [],
    ...patch,
  };
}

function meas(type: string, value: number): ImportPayload["measurements"][number] {
  return { type, value, unit: type === "cooper_12m_distance" ? "m" : "cm", timestamp: "2026-09-30T10:00:00Z" };
}

function axesOf(input: ConditionInput): Record<string, ConditionAxis> {
  return Object.fromEntries(conditionProfile(input).axes.map((a) => [a.id, a]));
}

// ── 1. Cardio: the core Cooper bands, by sex AND age ───────────────────────

describe("condition lens — cardio (Cooper 1968 via core)", () => {
  it("classifies a woman 20–29 at 2250 m as above_average", () => {
    const p = payload({
      measurements: [meas("cooper_12m_distance", 2250)],
      profile: profilePatch({ biologicalSex: "female", age: 25 }),
    });
    const a = axesOf({ payload: p, heightM: null }).cardio!;
    expect(a.band).toBe("above_average");
    expect(a.score).toBe(78);
    expect(a.bounds).toContain("2200");
  });

  it("classifies a woman 30–39 at 1750 m as average (the band drops with age)", () => {
    const p = payload({
      measurements: [meas("cooper_12m_distance", 1750)],
      profile: profilePatch({ biologicalSex: "female", age: 35 }),
    });
    expect(axesOf({ payload: p, heightM: null }).cardio!.band).toBe("average");
  });

  it("classifies a man 20–29 at 2450 m as above_average", () => {
    const p = payload({
      measurements: [meas("cooper_12m_distance", 2450)],
      profile: profilePatch({ biologicalSex: "male", age: 28 }),
    });
    expect(axesOf({ payload: p, heightM: null }).cardio!.band).toBe("above_average");
  });

  it("classifies a man 50+ at 1650 m as average", () => {
    const p = payload({
      measurements: [meas("cooper_12m_distance", 1650)],
      profile: profilePatch({ biologicalSex: "male", age: 62 }),
    });
    expect(axesOf({ payload: p, heightM: null }).cardio!.band).toBe("average");
  });

  it("refuses to classify without the variables the source stratifies by", () => {
    // No age → the Cooper table key is unknown → null, not a guessed band.
    const p = payload({
      measurements: [meas("cooper_12m_distance", 2250)],
      profile: profilePatch({ age: null }),
    });
    expect(axesOf({ payload: p, heightM: null }).cardio!.band).toBeNull();
  });
});

// ── 2. Composition: %BF vs the ACE sex bands ───────────────────────────────

describe("condition lens — composition (ACE by sex)", () => {
  it("reads 19 % in a woman as the athletic band (excellent)", () => {
    const p = payload({
      measurements: [meas("body_fat_measured", 19)],
      profile: profilePatch({ biologicalSex: "female" }),
    });
    const a = axesOf({ payload: p, heightM: null }).composition!;
    expect(a.band).toBe("excellent");
    expect(a.bounds).toContain("athletic");
  });

  it("reads 16 % in a man as fitness (above_average), not athletic", () => {
    const p = payload({
      measurements: [meas("body_fat_measured", 16)],
      profile: profilePatch({ biologicalSex: "male" }),
    });
    expect(axesOf({ payload: p, heightM: null }).composition!.band).toBe("above_average");
  });

  it("cannot classify %BF without sex", () => {
    const p = payload({
      measurements: [meas("body_fat_measured", 19)],
      profile: profilePatch({ biologicalSex: "unspecified" as never }),
    });
    expect(axesOf({ payload: p, heightM: null }).composition!.band).toBeNull();
  });
});

// ── 3. Proportion: WHtR (Ashwell, sex-neutral) ─────────────────────────────

describe("condition lens — proportion (WHtR)", () => {
  it("0.47 is the healthy band", () => {
    expect(classifyWhtr(0.47)!.band).toBe("excellent");
  });

  it("0.55 is 'increased', never healthy — the label must say so", () => {
    const hit = classifyWhtr(0.55)!;
    expect(hit.band).toBe("above_average");
    expect(hit.bounds).toContain("aumentado");
  });

  it("prefers the exported WHtR indicator, falls back to waist/height", () => {
    const p = payload({
      profile: profilePatch({ height: 1.7 }),
      measurements: [meas("waist", 85)],
    });
    const viaExport = axesOf({
      payload: { ...p, indicators: { whtr: 0.47, adonis: null } },
      heightM: null,
    }).proportion!;
    expect(viaExport.value).toBeCloseTo(0.47, 3);

    const viaRaw = axesOf({ payload: p, heightM: null }).proportion!;
    expect(viaRaw.value).toBeCloseTo(0.85 / 1.7, 3);
  });
});

// ── 4. Muscle mass: FFMI (Kouri 1995) ──────────────────────────────────────

describe("condition lens — muscle (FFMI)", () => {
  it("computes the Kouri normalisation for an 80 kg man at 1.80 m / 15 %", () => {
    const r = computeFfmi(80, 1.8, 15, "male")!;
    expect(r.ffmi).toBeCloseTo(20.99, 2); // 68 kg FFM / 3.24
    expect(r.normalised).toBeCloseTo(20.99, 2); // +6.3×(1.8−1.8) = +0
    expect(r.band).toBe("average"); // inside the descriptive 18–25 band
  });

  it("a shorter woman at the same build normalises higher, as the formula says", () => {
    const r = computeFfmi(60, 1.65, 24, "female")!;
    expect(r.ffmi).toBeCloseTo(16.75, 2);
    expect(r.normalised).toBeCloseTo(17.69, 2); // +6.3×0.15
    expect(r.band).toBe("average"); // inside ♀ 15–22
  });

  it("guards the domain instead of flattering bad inputs", () => {
    expect(computeFfmi(20, 1.8, 15, "male")).toBeNull(); // implausible weight
    expect(computeFfmi(80, 2.6, 15, "male")).toBeNull(); // implausible height
    expect(computeFfmi(80, 1.8, 65, "male")).toBeNull(); // implausible %BF
  });

  it("is null without height, weight, %BF or sex (never a guessed band)", () => {
    const p = payload({
      measurements: [meas("body_fat_measured", 22)],
      profile: profilePatch({ height: null as never }),
    });
    expect(axesOf({ payload: p, heightM: null }).muscle!.band).toBeNull();
  });
});

// ── 5. Height handling and the aggregate ───────────────────────────────────

describe("condition lens — height units and the mean", () => {
  it("reads metres as-is and converts the legacy centimetre payload once", () => {
    expect(heightMOf(payload({ profile: profilePatch({ height: 1.78 }) }))).toBe(1.78);
    expect(heightMOf(payload({ profile: profilePatch({ height: 178 }) }))).toBe(1.78);
    expect(heightMOf(payload({ profile: profilePatch({ height: 300 }) }))).toBeNull();
  });

  it("the mean needs at least two classified axes to exist", () => {
    const p = payload({
      measurements: [meas("cooper_12m_distance", 2250)],
      profile: profilePatch({ biologicalSex: "female", age: 25 }),
    });
    const one = conditionProfile({ payload: p, heightM: null });
    expect(one.mean).toBeNull(); // one axis alone is not a profile

    const both = payload({
      measurements: [meas("cooper_12m_distance", 2250), meas("body_fat_measured", 24)],
      profile: profilePatch({ biologicalSex: "female", age: 25 }),
    });
    const two = conditionProfile({ payload: both, heightM: null });
    expect(two.mean).not.toBeNull();
    expect(two.mean).toBeGreaterThanOrEqual(0);
    expect(two.mean).toBeLessThanOrEqual(100);
  });

  it("a null payload yields four null axes and no mean — 'sin dato', not 0", () => {
    const r = conditionProfile({ payload: null, heightM: null });
    expect(r.axes).toHaveLength(4);
    expect(r.axes.every((a) => a.band === null && a.score === null)).toBe(true);
    expect(r.mean).toBeNull();
  });

  it("sex is resolved defensively", () => {
    expect(sexOf(payload())).toBe("female");
    expect(sexOf(payload({ profile: null }))).toBeNull();
  });
});
