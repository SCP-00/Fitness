/**
 * Somatotype estimation (endomorphy / mesomorphy / ectomorphy).
 *
 * WHY THIS EXISTS (owner, 2026-10-08): "Añade datos de Endomorfo, Ectomorfo y
 * mesomorfo, investiga cómo determinar esto solo con las métricas recibidas en
 * BodyLab" — including a path that works for women.
 *
 * METHOD AND ITS HONEST LIMITS
 * ─────────────────────────────
 * • **Ectomorphy: the official Heath–Carter decimal equation**, unchanged
 *   (Carter & Heath 1990; equations as published in the Heath–Carter
 *   anthropometric method chapter, INFLIBNET antp06):
 *       HWR  = height_cm / ∛(weight_kg)
 *       HWR > 40.75        →  E = 0.732·HWR − 28.58
 *       38.25 < HWR ≤ 40.75 →  E = 0.463·HWR − 17.63
 *       HWR ≤ 38.25        →  E = 0.1
 *   Needs only height and weight — works identically for men and women.
 *   Sanity check against the published worked example: subject 573, HWR 43.4
 *   → E = 3.2, which is exactly the article's value.
 *
 * • **Mesomorphy: the official Carter equation**, with every substitution
 *   declared in code and reported through `notes`:
 *       M = 0.858·humerus + 0.601·femur + 0.188·(arm − triceps SF)
 *           + 0.161·(calf − calf SF) − 0.131·height + 4.50
 *   BodyLab has no caliper, so:
 *     - humerus breadth ← elbow breadth when measured, else wrist breadth ×
 *      1.15 (distal radius+ulna breadth tracks humeral epicondyles closely
 *      enough for an estimate; the factor is a stated heuristic);
 *     - femur breadth ← knee breadth ONLY inside the physiological window
 *      7–12 cm (ISAK femoral condyles). The owner's tape-measured 23 cm
 *      "knee breadth" is not a caliper breadth — using it would fabricate a
 *      mesomorphy of ~14, so out-of-window values fall back to a sex/height
 *      reference and raise a note;
 *     - skinfolds ← estimated from body fat % with a sex-specific linear
 *      heuristic (flagged via notes). This part is OUR derivation, not a
 *      published equation — the UI says "estimación" for that reason.
 *
 * • **Endomorphy: the official polynomial REQUIRES the height-corrected sum
 *   of three skinfolds we do not have**, so we map body-fat % through a
 *   sex-specific piecewise-linear calibration anchored to the published body-
 *   composition categories (athlete / acceptable / high by sex). This is an
 *   explicit adaptation, reported via `notes`; it is NOT the official
 *   endomorphy rating and the card labels it as an estimate.
 *
 * Ratings follow the method's conventions: ≥ 0.1 (never zero/negative),
 * rounded to 0.1; 0.5–2.5 low, 3–5 moderate, 5.5–7 high, ≥ 7.5 very high.
 *
 * @module lib/somatotype
 */

export type SomatotypeSex = "male" | "female";

export interface SomatotypeInput {
  /** Stature in cm. */
  heightCm: number;
  /** Body weight in kg. */
  weightKg: number;
  /** Measured/entered body fat % (null = unknown). */
  bodyFatPct: number | null;
  sex: SomatotypeSex;
  /** ISAK humerus (bi-epicondylar) breadth, cm. */
  elbowBreadthCm?: number | null;
  /** ISAK wrist (distal radio-ulnar) breadth, cm. */
  wristBreadthCm?: number | null;
  /** ISAK femur (condylar) breadth, cm — must be 7–12 to be trusted. */
  kneeBreadthCm?: number | null;
  /** Arm girth, cm (contracted/flexed preferred by the method). */
  armGirthCm?: number | null;
  /** Calf girth, cm. */
  calfGirthCm?: number | null;
}

export type SomatotypeNote =
  | "endo-from-bf" // endomorphy mapped from body fat % (adaptation)
  | "no-bf" // no body fat % → endomorphy neutral, no skinfold correction
  | "humerus-from-wrist" // humerus breadth substituted from wrist
  | "no-breadth" // neither elbow nor wrist → reference breadth
  | "femur-from-knee" // knee breadth accepted (inside physiological window)
  | "femur-reference" // knee breadth missing/out of window → reference
  | "skinfolds-estimated" // skinfold correction estimated from body fat %
  | "girth-reference"; // arm/calf girth missing → reference girth

export interface SomatotypeResult {
  /** Official-scale components, rounded to 0.1 (min 0.1). */
  endomorphy: number;
  mesomorphy: number;
  ectomorphy: number;
  /** Height ÷ cube-root(weight) — the linearity axis. */
  hwr: number;
  /** Which component dominates, or "balanced" when all three are close. */
  dominant: "endomorphy" | "mesomorphy" | "ectomorphy" | "balanced";
  /** True when at least one input had to be substituted (see `notes`). */
  partial: boolean;
  notes: SomatotypeNote[];
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

const round01 = (v: number): number => Math.round(v * 10) / 10;

/** Official Heath–Carter ectomorphy from the height-weight ratio. */
export function ectomorphyFromHWR(hwr: number): number {
  if (!Number.isFinite(hwr) || hwr <= 0) return 0.1;
  const raw =
    hwr > 40.75 ? 0.732 * hwr - 28.58 : hwr > 38.25 ? 0.463 * hwr - 17.63 : 0.1;
  return round01(Math.max(0.1, raw));
}

/**
 * Endomorphy from body fat % — a sex-specific calibration of the official
 * component onto body-composition categories (heuristic, not published).
 * Anchors: men ~10 % ≈ 1.0 (very lean athlete), 17 % ≈ 2, 25 % ≈ 4.4,
 * 35 % ≈ 7.6; women ~18 % ≈ 1.9 (athlete), 28 % ≈ 4, 38 % ≈ 6.8.
 */
const ENDO_ANCHORS: Record<SomatotypeSex, ReadonlyArray<readonly [number, number]>> = {
  male: [
    [5, 0.5],
    [10, 1.0],
    [15, 1.9],
    [20, 3.0],
    [25, 4.4],
    [30, 6.0],
    [35, 7.6],
    [45, 11.5],
  ],
  female: [
    [12, 1.0],
    [18, 1.9],
    [23, 2.8],
    [28, 4.0],
    [33, 5.3],
    [38, 6.8],
    [45, 9.5],
  ],
};

export function endomorphyFromBodyFat(
  bodyFatPct: number,
  sex: SomatotypeSex,
): number {
  const anchors = ENDO_ANCHORS[sex];
  const bf = clamp(bodyFatPct, anchors[0]![0], anchors[anchors.length - 1]![0]);
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i]!;
    const [x1, y1] = anchors[i + 1]!;
    if (bf <= x1) {
      const t = (bf - x0) / (x1 - x0);
      return round01(clamp(y0 + t * (y1 - y0), 0.1, 16));
    }
  }
  return round01(anchors[anchors.length - 1]![1]);
}

/** Estimated skinfold thickness in cm from body fat % (stated heuristic). */
function estimatedSkinfoldCm(
  bodyFatPct: number | null,
  sex: SomatotypeSex,
  site: "arm" | "calf",
): number {
  if (bodyFatPct === null || !Number.isFinite(bodyFatPct)) {
    return sex === "female" ? 0.12 : 0.07; // neutral default correction
  }
  if (site === "arm") {
    const raw =
      sex === "female"
        ? (bodyFatPct - 17) * 0.01 + 0.12
        : (bodyFatPct - 8) * 0.009 + 0.06;
    return clamp(raw, 0.04, 0.35);
  }
  const raw =
    sex === "female"
      ? (bodyFatPct - 17) * 0.007 + 0.1
      : (bodyFatPct - 8) * 0.006 + 0.05;
  return clamp(raw, 0.03, 0.3);
}

/**
 * Somatotype from the metrics BodyLab actually collects.
 * Never throws: every missing input falls back with a reported note.
 */
export function estimateSomatotype(input: SomatotypeInput): SomatotypeResult {
  const notes: Set<SomatotypeNote> = new Set();
  const { heightCm, weightKg, sex } = input;

  // ── Ectomorphy (official) ────────────────────────────────────────────
  const cbrt = Math.cbrt(weightKg);
  const hwr = cbrt > 0 ? heightCm / cbrt : 0;
  const ectomorphy = ectomorphyFromHWR(hwr);

  // ── Endomorphy (adapted from body fat %) ─────────────────────────────
  let endomorphy: number;
  if (input.bodyFatPct !== null && Number.isFinite(input.bodyFatPct)) {
    endomorphy = endomorphyFromBodyFat(input.bodyFatPct, sex);
    notes.add("endo-from-bf");
  } else {
    endomorphy = sex === "female" ? 3.5 : 2.5; // neutral midpoint, flagged
    notes.add("no-bf");
  }

  // ── Mesomorphy (official equation, substituted inputs declared) ──────
  const heightFactor = heightCm / 175;
  let humerus: number;
  const elbow = input.elbowBreadthCm;
  const wrist = input.wristBreadthCm;
  if (elbow !== null && elbow !== undefined && elbow >= 4 && elbow <= 9) {
    humerus = elbow;
  } else if (wrist !== null && wrist !== undefined && wrist >= 3 && wrist <= 8) {
    humerus = wrist * 1.15;
    notes.add("humerus-from-wrist");
  } else {
    humerus = (sex === "female" ? 6.0 : 6.7) * heightFactor;
    notes.add("no-breadth");
  }

  let femur: number;
  const knee = input.kneeBreadthCm;
  if (knee !== null && knee !== undefined && knee >= 7 && knee <= 12) {
    femur = knee;
    notes.add("femur-from-knee");
  } else {
    femur = (sex === "female" ? 9.4 : 10.2) * heightFactor;
    notes.add("femur-reference");
  }

  const refArm = (sex === "female" ? 28 : 32) * heightFactor;
  const refCalf = (sex === "female" ? 35 : 37) * heightFactor;
  let arm = input.armGirthCm;
  let calf = input.calfGirthCm;
  if (arm === null || arm === undefined || !Number.isFinite(arm) || arm <= 0) {
    arm = refArm;
    notes.add("girth-reference");
  }
  if (calf === null || calf === undefined || !Number.isFinite(calf) || calf <= 0) {
    calf = refCalf;
    notes.add("girth-reference");
  }

  if (input.bodyFatPct !== null && Number.isFinite(input.bodyFatPct)) {
    notes.add("skinfolds-estimated");
  }

  const correctedArm = Math.max(1, arm - estimatedSkinfoldCm(input.bodyFatPct, sex, "arm"));
  const correctedCalf = Math.max(1, calf - estimatedSkinfoldCm(input.bodyFatPct, sex, "calf"));

  const mesoRaw =
    0.858 * humerus +
    0.601 * femur +
    0.188 * correctedArm +
    0.161 * correctedCalf -
    heightCm * 0.131 +
    4.5;
  const mesomorphy = round01(clamp(mesoRaw, 0.1, 15));

  // ── Dominance ────────────────────────────────────────────────────────
  const parts: Array<["endomorphy" | "mesomorphy" | "ectomorphy", number]> = [
    ["endomorphy", endomorphy],
    ["mesomorphy", mesomorphy],
    ["ectomorphy", ectomorphy],
  ];
  parts.sort((a, b) => b[1] - a[1]);
  const [top, topVal] = parts[0]!;
  const secondVal = parts[1]![1];
  const dominant =
    topVal - parts[2]![1] < 1 && topVal - secondVal < 1
      ? "balanced"
      : top;

  return {
    endomorphy,
    mesomorphy,
    ectomorphy,
    hwr: Math.round(hwr * 100) / 100,
    dominant,
    partial: notes.size > 0,
    notes: [...notes],
  };
}

/** Rating band label for one component (official scale wording). */
export function componentBand(
  value: number,
): "low" | "moderate" | "high" | "very-high" {
  if (value >= 7.5) return "very-high";
  if (value >= 5.5) return "high";
  if (value >= 3) return "moderate";
  return "low";
}
