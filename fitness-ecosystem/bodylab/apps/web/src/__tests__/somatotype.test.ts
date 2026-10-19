/**
 * Somatotype estimation — owner request 2026-10-08.
 *
 * Pins: (1) the official ectomorphy equation against the published worked
 * example, (2) the owner's own numbers producing a plausible athletic
 * mesomorphic rating, (3) the female path, (4) graceful degradation when
 * measurements are missing.
 */
import { describe, expect, it } from "vitest";
import {
  componentBand,
  ectomorphyFromHWR,
  endomorphyFromBodyFat,
  estimateSomatotype,
} from "../lib/somatotype";

describe("somatotype: official ectomorphy equation", () => {
  it("reproduces the published worked example (HWR 43.4 → 3.2)", () => {
    expect(ectomorphyFromHWR(43.4)).toBeCloseTo(3.2, 1);
  });

  it("uses the second equation inside 38.25–40.75 and floors at 0.1", () => {
    expect(ectomorphyFromHWR(40)).toBeCloseTo(0.9, 1);
    expect(ectomorphyFromHWR(38)).toBe(0.1);
    expect(ectomorphyFromHWR(0)).toBe(0.1);
  });

  it("rises with linearity (taller/lighter → more ectomorphic)", () => {
    expect(ectomorphyFromHWR(45)).toBeGreaterThan(ectomorphyFromHWR(42));
  });
});

describe("somatotype: endomorphy from body fat % (documented adaptation)", () => {
  it("is monotonic for both sexes", () => {
    for (const sex of ["male", "female"] as const) {
      const a = endomorphyFromBodyFat(15, sex);
      const b = endomorphyFromBodyFat(25, sex);
      const c = endomorphyFromBodyFat(35, sex);
      expect(a).toBeLessThan(b);
      expect(b).toBeLessThan(c);
    }
  });

  it("reads a lean man at ~17 % as low endomorphy", () => {
    const v = endomorphyFromBodyFat(17, "male");
    expect(v).toBeGreaterThanOrEqual(1.8);
    expect(v).toBeLessThanOrEqual(2.8);
  });

  it("reads a woman at 28 % as moderate (sex-adjusted, not male rules)", () => {
    const v = endomorphyFromBodyFat(28, "female");
    expect(v).toBeGreaterThanOrEqual(3.5);
    expect(v).toBeLessThanOrEqual(4.5);
    // Same fat % reads as MORE endomorphic for a man — women's essential fat
    // is higher, so the female curve is shifted right (sex-adjusted scales).
    expect(v).toBeLessThan(endomorphyFromBodyFat(28, "male"));
  });
});

describe("somatotype: the owner's own numbers", () => {
  // 176 cm · 76 kg · 17 % BF · wrist breadth 6 · "knee breadth" 23 (tape) ·
  // biceps 32 · calf 39 — all entered 2026-10-08.
  const owner = estimateSomatotype({
    heightCm: 176,
    weightKg: 76,
    bodyFatPct: 17,
    sex: "male",
    wristBreadthCm: 6,
    kneeBreadthCm: 23,
    armGirthCm: 32,
    calfGirthCm: 39,
  });

  it("gives a linear axis consistent with 176 cm / 76 kg (HWR ≈ 41.5)", () => {
    expect(owner.hwr).toBeGreaterThan(41);
    expect(owner.hwr).toBeLessThan(42);
    expect(owner.ectomorphy).toBeGreaterThanOrEqual(1.5);
    expect(owner.ectomorphy).toBeLessThanOrEqual(2.2);
  });

  it("gives a low endomorphy at 17 % body fat", () => {
    expect(owner.endomorphy).toBeGreaterThanOrEqual(1.8);
    expect(owner.endomorphy).toBeLessThanOrEqual(2.8);
  });

  it("gives an athletic mesomorphy — not the absurd value 23 cm knee would cause", () => {
    expect(owner.mesomorphy).toBeGreaterThanOrEqual(4.5);
    expect(owner.mesomorphy).toBeLessThanOrEqual(7);
    expect(owner.dominant).toBe("mesomorphy");
  });

  it("flags every substituted input", () => {
    expect(owner.partial).toBe(true);
    expect(owner.notes).toContain("femur-reference"); // 23 cm tape ≠ caliper
    expect(owner.notes).toContain("humerus-from-wrist");
    expect(owner.notes).toContain("endo-from-bf");
    expect(owner.notes).toContain("skinfolds-estimated");
  });
});

describe("somatotype: female path", () => {
  const woman = estimateSomatotype({
    heightCm: 165,
    weightKg: 60,
    bodyFatPct: 28,
    sex: "female",
    wristBreadthCm: 5.2,
    kneeBreadthCm: null,
    armGirthCm: 28,
    calfGirthCm: 35,
  });

  it("produces a plausible, sex-appropriate rating", () => {
    expect(woman.endomorphy).toBeGreaterThanOrEqual(3.5);
    expect(woman.endomorphy).toBeLessThanOrEqual(4.5);
    expect(woman.mesomorphy).toBeGreaterThanOrEqual(3);
    expect(woman.mesomorphy).toBeLessThanOrEqual(5.5);
    expect(woman.ectomorphy).toBeGreaterThanOrEqual(1.8);
    expect(woman.ectomorphy).toBeLessThanOrEqual(2.8);
    // Every component on the official scale, never negative.
    for (const v of [woman.endomorphy, woman.mesomorphy, woman.ectomorphy]) {
      expect(v).toBeGreaterThanOrEqual(0.1);
      expect(v).toBeLessThanOrEqual(16);
    }
  });
});

describe("somatotype: graceful degradation", () => {
  it("never throws with only height and weight", () => {
    const bare = estimateSomatotype({
      heightCm: 176,
      weightKg: 76,
      bodyFatPct: null,
      sex: "male",
    });
    expect(bare.endomorphy).toBeGreaterThanOrEqual(0.1);
    expect(bare.mesomorphy).toBeGreaterThanOrEqual(0.1);
    expect(bare.ectomorphy).toBeGreaterThanOrEqual(0.1);
    expect(bare.partial).toBe(true);
    expect(bare.notes).toContain("no-bf");
    expect(bare.notes).toContain("no-breadth");
    expect(bare.notes).toContain("girth-reference");
  });

  it("rejects garbage inputs without NaN", () => {
    const junk = estimateSomatotype({
      heightCm: 176,
      weightKg: 0,
      bodyFatPct: Number.NaN,
      sex: "male",
    });
    expect(Number.isFinite(junk.ectomorphy)).toBe(true);
    expect(Number.isFinite(junk.mesomorphy)).toBe(true);
    expect(Number.isFinite(junk.endomorphy)).toBe(true);
  });
});

describe("somatotype: rating bands", () => {
  it("maps the official scale", () => {
    expect(componentBand(2)).toBe("low");
    expect(componentBand(4)).toBe("moderate");
    expect(componentBand(6)).toBe("high");
    expect(componentBand(8)).toBe("very-high");
  });
});
