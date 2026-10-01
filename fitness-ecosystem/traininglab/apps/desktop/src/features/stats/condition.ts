/**
 * Physical-condition lens — "how fit am I against the published average and
 * the athletic band for someone like me (age, sex, weight, height)?"
 *
 * Owner direction (2026-09-30, superseding the per-family strength-ideal idea
 * for this screen's first pass): the goal is NOT jump height or any single
 * sport skill — it is a whole-body fitness read, where "average" is the
 * published P50 and "athletic" is the published top band, computed ONLY from
 * variables each cited source actually supports. Height is not a fudge factor:
 * for FFMI and WHtR it is part of the metric's published definition.
 *
 * The normative classifications (Cooper 12-min by sex+age, %BF by sex) are
 * delegated to `@fitness/bodylab-conditioning` — the same tables BodyLab uses
 * — so the two apps can never disagree about a band. FFMI/WHtR live here
 * because the core package does not carry them (yet).
 *
 * Every axis returns null when its input is missing: "sin dato + cómo
 * medirlo", never a fabricated 0 or a fake band.
 *
 * Sources (provenance strings travel in the results):
 *  - Cooper, K.H. (1968) JAMA 203:135-138 — bands by sex+age (13–50+), core.
 *  - ACE body-composition guidelines — %BF bands by sex, core.
 *  - Ashwell — WHtR <0.5 healthy, <0.6 increased, >=0.6 high (sex-neutral).
 *  - Kouri et al. (1995) Clin J Sport Med 5:223-228 — FFMI = FFM/h² with the
 *    published 6.3×(1.8−h) normalisation; descriptive references only.
 *
 * @module features/stats/condition
 */

import {
  classifyCooperTest,
  classifyMeasuredBodyFat,
  type BiologicalSex,
  type NormResult,
} from "@fitness/bodylab-conditioning";
import type { ImportPayload } from "../../lib/adapter";

/** The five bands the UI paints, mirroring the core `NormBand` grammar. */
export type ConditionBand =
  "excellent" | "above_average" | "average" | "below_average" | "poor";

/** A classified axis: band + honest provenance + the raw inputs used. */
export interface ConditionAxis {
  /** Machine id the UI/i18n keys on (`condition.cardio`, …). */
  id: "cardio" | "composition" | "proportion" | "muscle";
  band: ConditionBand | null;
  /** 0–100 (excellent ≈ 100 … poor ≈ 0), null = unclassified. */
  score: number | null;
  /** Where the norm came from — always shown in the UI. */
  source: string;
  /** The value the classification was made on (unit noted by the axis). */
  value: number | null;
  /** Human-readable band bounds actually applied ("2200-2699 m", "<0.5", …). */
  bounds: string | null;
}

export interface ConditionInput {
  payload: ImportPayload | null;
  /** Height in METRES; null when unknown (see {@link heightMOf}). */
  heightM: number | null;
}

// ── Payload readers (structural, defensive about the units gotcha) ─────────

/** Sex resolved from the imported profile; null when absent/unknown. */
export function sexOf(payload: ImportPayload | null): BiologicalSex | null {
  const s = payload?.profile?.biologicalSex;
  return s === "female" ? "female" : s === "male" ? "male" : null;
}

/** Age from the imported payload; null when the profile carries none. */
export function ageOf(payload: ImportPayload | null): number | null {
  const a = payload?.profile?.age;
  return typeof a === "number" && a >= 10 && a <= 100 ? a : null;
}

/**
 * Height in metres from the imported profile. The v2 contract forwards
 * BodyLab's `Profile.height`, which is metres — but old exports predating the
 * metre convention may carry centimetres, so a value in the 40–260 range is
 * converted once, here, with a comment instead of a silent guess.
 */
export function heightMOf(payload: ImportPayload | null): number | null {
  const h = payload?.profile?.height;
  if (typeof h !== "number" || !Number.isFinite(h) || h <= 0) return null;
  if (h < 3) return h; // metres (the current contract)
  if (h >= 40 && h <= 260) return Math.round((h / 100) * 1000) / 1000;
  return null;
}

/**
 * Latest value of a measurement type from the payload, first occurrence wins
 * (BodyLab's `measurements` list is already latest-per-type).
 */
export function latestMeasurement(
  payload: ImportPayload | null,
  type: string,
): number | null {
  const hit = payload?.measurements.find((m) => m.type === type);
  return hit && Number.isFinite(hit.value) && hit.value > 0 ? hit.value : null;
}

/** Latest body weight in kg: measurement first, then the profile field. */
export function weightKgOf(payload: ImportPayload | null): number | null {
  const m = latestMeasurement(payload, "weight");
  if (m != null) return m;
  const w = payload?.profile?.weight;
  return typeof w === "number" && w > 0 ? w : null;
}

/** Core `NormResult` → the axis shape this screen paints. */
function fromNorm(
  id: ConditionAxis["id"],
  source: string,
  norm: NormResult | null,
  value: number | null,
): ConditionAxis {
  return {
    id,
    band: norm?.band ?? null,
    score: norm?.score ?? null,
    source,
    value,
    bounds: norm?.bounds ?? null,
  };
}

// ── 3. Proportion: WHtR (Ashwell) — height is part of the definition ───────

/** The Ashwell cut-offs, published and sex-neutral. */
export function classifyWhtr(whtr: number): {
  band: ConditionBand;
  score: number;
  bounds: string;
} | null {
  if (!Number.isFinite(whtr) || whtr <= 0 || whtr > 1.5) return null;
  if (whtr < 0.5)
    return { band: "excellent", score: 95, bounds: "<0.5 (sano)" };
  if (whtr < 0.6)
    return { band: "above_average", score: 70, bounds: "0.5–0.6 (aumentado)" };
  return { band: "poor", score: 20, bounds: ">=0.6 (alto)" };
}

/** WHtR from the export's own indicator, or waist(m)/height(m) raw values. */
export function whtrOf(payload: ImportPayload | null): number | null {
  const exported = payload?.indicators?.whtr;
  if (typeof exported === "number" && exported > 0 && exported < 1.5)
    return exported;
  const waist = latestMeasurement(payload, "waist");
  const heightM = heightMOf(payload);
  return waist != null && heightM != null ? waist / 100 / heightM : null;
}

// ── 4. Muscle mass: FFMI (Kouri 1995) — height in the formula, not a hack ──

/** Descriptive FFMI references (adults); informational, no invented percentiles. */
const FFMI_REFERENCE = {
  male: { healthyLow: 18, healthyHigh: 25 },
  female: { healthyLow: 15, healthyHigh: 22 },
} as const;

export interface FfmiResult {
  /** Un-normalised: FFM / height². */
  ffmi: number;
  /** Kouri normalisation: +6.3×(1.8−h). */
  normalised: number;
  band: ConditionBand;
  score: number;
}

/**
 * FFMI from weight, height (metres) and measured %BF. Null outside the
 * plausible domain — a bad input must not become a flattering number.
 */
export function computeFfmi(
  weightKg: number,
  heightM: number,
  bodyFatPct: number,
  sex: BiologicalSex,
): FfmiResult | null {
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 350)
    return null;
  if (!Number.isFinite(heightM) || heightM < 1.2 || heightM > 2.3) return null;
  if (!Number.isFinite(bodyFatPct) || bodyFatPct < 0 || bodyFatPct > 60)
    return null;

  const ffmi = (weightKg * (1 - bodyFatPct / 100)) / (heightM * heightM);
  if (!Number.isFinite(ffmi) || ffmi < 10 || ffmi > 30) return null;

  const normalised = ffmi + 6.3 * (1.8 - heightM);
  const ref = FFMI_REFERENCE[sex];
  // Descriptive read of the published reference band, not a percentile claim:
  // above the band's top → excellent (athletic range); inside → average;
  // below → below_average.
  let band: ConditionBand;
  let score: number;
  if (ffmi > ref.healthyHigh) {
    band = "excellent";
    score = 90;
  } else if (ffmi >= ref.healthyLow) {
    band = "average";
    score = 55;
  } else {
    band = "below_average";
    score = 30;
  }
  return { ffmi, normalised, band, score };
}

const FFMI_SOURCE =
  "FFMI — Kouri et al. (1995) Clin J Sport Med 5:223-228; referencias descriptivas";
const COOPER_SOURCE =
  "Cooper, K.H. (1968) JAMA 203:135-138 — bandas por sexo+edad (core)";
const BF_SOURCE = "ACE body-composition guidelines — bandas por sexo (core)";
const WHTR_SOURCE = "Ashwell — WHtR <0.5 sano, <0.6 aumentado (sexo-neutral)";

/** The four-axis condition profile for the given payload. */
export function conditionProfile(input: ConditionInput): {
  axes: ConditionAxis[];
  mean: number | null;
} {
  const { payload } = input;
  const heightM = input.heightM ?? heightMOf(payload);
  const sex = sexOf(payload);
  const age = ageOf(payload);
  const cooper = latestMeasurement(payload, "cooper_12m_distance");
  const bodyFatPct = latestMeasurement(payload, "body_fat_measured");

  const cardio = fromNorm(
    "cardio",
    COOPER_SOURCE,
    cooper != null && age != null && sex != null
      ? classifyCooperTest(cooper, age, sex)
      : null,
    cooper,
  );
  const composition = fromNorm(
    "composition",
    BF_SOURCE,
    bodyFatPct != null && sex != null
      ? classifyMeasuredBodyFat(bodyFatPct, sex)
      : null,
    bodyFatPct,
  );

  const whtr = whtrOf(payload);
  const whtrHit = whtr != null ? classifyWhtr(whtr) : null;
  const proportion: ConditionAxis = {
    id: "proportion",
    band: whtrHit?.band ?? null,
    score: whtrHit?.score ?? null,
    source: WHTR_SOURCE,
    value: whtr != null ? Math.round(whtr * 1000) / 1000 : null,
    bounds: whtrHit?.bounds ?? null,
  };

  const weight = weightKgOf(payload);
  const ffmiHit =
    weight != null && heightM != null && bodyFatPct != null && sex != null
      ? computeFfmi(weight, heightM, bodyFatPct, sex)
      : null;
  const muscle: ConditionAxis = {
    id: "muscle",
    band: ffmiHit?.band ?? null,
    score: ffmiHit?.score ?? null,
    source: FFMI_SOURCE,
    value: ffmiHit ? Math.round(ffmiHit.normalised * 10) / 10 : null,
    bounds:
      sex === "male"
        ? "18-25 (♂ referencia adulta)"
        : sex === "female"
          ? "15-22 (♀ referencia adulta)"
          : null,
  };

  const axes = [cardio, composition, proportion, muscle];
  const scores = axes.map((a) => a.score).filter((s): s is number => s != null);
  const mean =
    scores.length >= 2
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          ),
        )
      : null;
  return { axes, mean };
}
