/**
 * @fitness/bodylab-conditioning
 *
 * Physical-conditioning metrics: normative classification for popular field
 * tests and directly measured conditioning inputs, for men and women, with
 * age-aware interpretation.
 *
 * Pure TypeScript — no React, no DOM, no I/O, no dependencies.
 * Normative tables are from the primary literature (Cooper 1968; ACSM;
 * Jackson-Pollock 1978; AHA/ESC) with explicit provenance on every table.
 *
 * @module conditioning
 */

export type BiologicalSex = 'male' | 'female';

// ============================================================================
// Shared types
// ============================================================================

/** 5-band normative classification used by every classifier in this package. */
export type NormBand =
  | 'excellent'
  | 'above_average'
  | 'average'
  | 'below_average'
  | 'poor';

export interface NormResult<TBand = NormBand> {
  /** Classified band against the age/sex normative table. */
  band: TBand;
  /** Score 0-100 (excellent ≈ 100 … poor ≈ 0) for UI coloring/weighting. */
  score: number;
  /** The percentile-style boundaries actually used, surfaced for UI display. */
  bounds: string;
  /** Provenance of the normative table. */
  source: string;
}

function isFinitePositive(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

/** Map a band to the canonical 0-100 score used across the app. */
function bandScore(band: NormBand): number {
  switch (band) {
    case 'excellent': return 95;
    case 'above_average': return 78;
    case 'average': return 55;
    case 'below_average': return 35;
    case 'poor': return 15;
  }
}

// ============================================================================
// 1. COOPER 12-MINUTE RUN TEST (aerobic capacity)
// ============================================================================

/**
 * Cooper (1968) normative bands, 12-minute run/walk distance in metres.
 * Source: Cooper, K.H. (1968) "A means of assessing maximal oxygen intake",
 * JAMA 203:135-138 — table as reproduced by BrianMac Sports Coaching.
 * Bands are half-open: [low, high) with `excellent` open-ended above.
 */
interface CooperBand {
  /** Inclusive lower bound (metres) of the band. */
  min: number;
  band: NormBand;
}

/** male 13-14, 15-16, 17-19, 20-29, 30-39, 40-49, 50+ (the 17-x keys are sex-asymmetric) */
const COOPER_MALE: Partial<Record<CooperAgeKey, CooperBand[]>> = {
  '13-14': [{ min: 2700, band: 'excellent' }, { min: 2400, band: 'above_average' }, { min: 2200, band: 'average' }, { min: 2100, band: 'below_average' }, { min: 0, band: 'poor' }],
  '15-16': [{ min: 2800, band: 'excellent' }, { min: 2500, band: 'above_average' }, { min: 2300, band: 'average' }, { min: 2200, band: 'below_average' }, { min: 0, band: 'poor' }],
  '17-19': [{ min: 3000, band: 'excellent' }, { min: 2700, band: 'above_average' }, { min: 2500, band: 'average' }, { min: 2300, band: 'below_average' }, { min: 0, band: 'poor' }],
  '20-29': [{ min: 2800, band: 'excellent' }, { min: 2400, band: 'above_average' }, { min: 2200, band: 'average' }, { min: 1600, band: 'below_average' }, { min: 0, band: 'poor' }],
  '30-39': [{ min: 2700, band: 'excellent' }, { min: 2300, band: 'above_average' }, { min: 1900, band: 'average' }, { min: 1500, band: 'below_average' }, { min: 0, band: 'poor' }],
  '40-49': [{ min: 2500, band: 'excellent' }, { min: 2100, band: 'above_average' }, { min: 1700, band: 'average' }, { min: 1400, band: 'below_average' }, { min: 0, band: 'poor' }],
  '50+': [{ min: 2400, band: 'excellent' }, { min: 2000, band: 'above_average' }, { min: 1600, band: 'average' }, { min: 1300, band: 'below_average' }, { min: 0, band: 'poor' }],
};

/** female 13-14, 15-16, 17-20, 20-29, 30-39, 40-49, 50+ */
const COOPER_FEMALE: Partial<Record<CooperAgeKey, CooperBand[]>> = {
  '13-14': [{ min: 2000, band: 'excellent' }, { min: 1900, band: 'above_average' }, { min: 1600, band: 'average' }, { min: 1500, band: 'below_average' }, { min: 0, band: 'poor' }],
  '15-16': [{ min: 2100, band: 'excellent' }, { min: 2000, band: 'above_average' }, { min: 1700, band: 'average' }, { min: 1600, band: 'below_average' }, { min: 0, band: 'poor' }],
  '17-20': [{ min: 2300, band: 'excellent' }, { min: 2100, band: 'above_average' }, { min: 1800, band: 'average' }, { min: 1700, band: 'below_average' }, { min: 0, band: 'poor' }],
  '20-29': [{ min: 2700, band: 'excellent' }, { min: 2200, band: 'above_average' }, { min: 1800, band: 'average' }, { min: 1500, band: 'below_average' }, { min: 0, band: 'poor' }],
  '30-39': [{ min: 2500, band: 'excellent' }, { min: 2000, band: 'above_average' }, { min: 1700, band: 'average' }, { min: 1400, band: 'below_average' }, { min: 0, band: 'poor' }],
  '40-49': [{ min: 2300, band: 'excellent' }, { min: 1900, band: 'above_average' }, { min: 1500, band: 'average' }, { min: 1200, band: 'below_average' }, { min: 0, band: 'poor' }],
  '50+': [{ min: 2200, band: 'excellent' }, { min: 1700, band: 'above_average' }, { min: 1400, band: 'average' }, { min: 1100, band: 'below_average' }, { min: 0, band: 'poor' }],
};

/** Age keys used by the Cooper tables (note the 17-19 / 17-20 asymmetry of the source). */
export type CooperAgeKey = '13-14' | '15-16' | '17-19' | '17-20' | '20-29' | '30-39' | '40-49' | '50+';

const COOPER_SOURCE = 'Cooper, K.H. (1968) JAMA 203:135-138 (table via BrianMac)';

/** Map a chronological age to the Cooper table key for the given sex. */
export function cooperAgeKey(age: number, sex: BiologicalSex): CooperAgeKey {
  if (age <= 14) return '13-14';
  if (age <= 16) return '15-16';
  if (sex === 'male') {
    if (age <= 19) return '17-19';
  } else {
    if (age <= 20) return '17-20';
  }
  if (age <= 29) return '20-29';
  if (age <= 39) return '30-39';
  if (age <= 49) return '40-49';
  return '50+';
}

function classifyAgainstBands(distanceM: number, bands: CooperBand[]): { band: NormBand; bounds: string } | null {
  for (const b of bands) {
    if (distanceM >= b.min) {
      if (b.band === 'excellent') return { band: b.band, bounds: `≥${b.min}m` };
      return { band: b.band, bounds: `${b.min}-${(bands[bands.indexOf(b) - 1]?.min ?? b.min) - 1}m` };
    }
  }
  return null;
}

/**
 * Upper plausibility bound for a 12-minute run/walk: the best human 12-min
 * efforts approach ~5000 m. Anything above is a measurement/typo error,
 * not a performance — classifying it "excellent" would be a lie.
 */
const COOPER_MAX_PLAUSIBLE_M = 5000;

/**
 * Classify a Cooper 12-minute run/walk distance against the age/sex table.
 * Returns null for non-finite, non-positive or physically impossible
 * distances (> 5000 m in 12 minutes).
 */
export function classifyCooperTest(
  distanceM: number,
  age: number,
  sex: BiologicalSex
): NormResult | null {
  if (!isFinitePositive(distanceM) || distanceM > COOPER_MAX_PLAUSIBLE_M) return null;
  if (!Number.isFinite(age) || age <= 0) return null;
  const key = cooperAgeKey(age, sex);
  const table = sex === 'male' ? COOPER_MALE : COOPER_FEMALE;
  const bands = table[key];
  if (!bands) return null; // unreachable for known keys — belt and braces
  const classified = classifyAgainstBands(distanceM, bands);
  if (!classified) return null;
  return { band: classified.band, score: bandScore(classified.band), bounds: classified.bounds, source: COOPER_SOURCE };
}

/**
 * Estimated VO2max from the Cooper 12-minute test (Cooper 1968):
 *   VO2max ≈ (distance in metres − 504.9) / 44.73   [ml/kg/min]
 * Guarded: non-positive or implausible distances return null rather than a
 * negative (meaningless) VO2max.
 */
export function estimateVo2maxFromCooper(distanceM: number): number | null {
  if (!isFinitePositive(distanceM)) return null;
  const vo2 = (distanceM - 504.9) / 44.73;
  if (!Number.isFinite(vo2) || vo2 <= 0) return null;
  return Math.round(vo2 * 10) / 10;
}

// ============================================================================
// 2. RESTING HEART RATE (cardiovascular/recovery status)
// ============================================================================

/**
 * Resting HR bands (bpm). Source: AHA / ASCM conventions for adults
 * (18+). Age-robust: adult resting HR changes little with age, so one
 * adult table is used (with a note that trained athletes commonly sit
 * in the excellent band).
 */
const RHR_SOURCE = 'AHA/ASCM resting-HR conventions (adults 18+)';

const RHR_BANDS: { max: number; band: NormBand; bounds: string }[] = [
  { max: 54, band: 'excellent', bounds: '≤54 bpm' },
  { max: 61, band: 'above_average', bounds: '55-61 bpm' },
  { max: 70, band: 'average', bounds: '62-70 bpm' },
  { max: 79, band: 'below_average', bounds: '71-79 bpm' },
  { max: Number.POSITIVE_INFINITY, band: 'poor', bounds: '≥80 bpm' },
];

/**
 * Classify resting heart rate (bpm). Physiologically plausible adult range
 * is enforced (30-220); anything outside returns null (a measurement error,
 * not a classification). Sex/age do not change the adult table.
 */
export function classifyRestingHeartRate(bpm: number): NormResult | null {
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 220) return null;
  const hit = RHR_BANDS.find(b => bpm <= b.max)!;
  return { band: hit.band, score: bandScore(hit.band), bounds: hit.bounds, source: RHR_SOURCE };
}

// ============================================================================
// 3. REAL BODY-FAT % (measured, not estimated)
// ============================================================================

/**
 * Body-fat % bands (ACE clinical + athletic reference, adults):
 *   male: essential 2-5, athletes 6-13, fitness 14-17, average 18-24, obese ≥25
 *   female: essential 10-13, athletes 14-20, fitness 21-24, average 25-31, obese ≥32
 * Source: American Council on Exercise (ACE) body-composition guidelines.
 */
const BF_SOURCE = 'ACE body-composition guidelines (adults)';

const BF_BANDS: Record<BiologicalSex, { max: number; band: NormBand; bounds: string }[]> = {
  male: [
    { max: 13.9, band: 'excellent', bounds: '6-13.9% (athletic)' },
    { max: 17.9, band: 'above_average', bounds: '14-17.9% (fitness)' },
    { max: 24.9, band: 'average', bounds: '18-24.9% (acceptable)' },
    { max: Number.POSITIVE_INFINITY, band: 'poor', bounds: '≥25% (obese range)' },
  ],
  female: [
    { max: 20.9, band: 'excellent', bounds: '14-20.9% (athletic)' },
    { max: 24.9, band: 'above_average', bounds: '21-24.9% (fitness)' },
    { max: 31.9, band: 'average', bounds: '25-31.9% (acceptable)' },
    { max: Number.POSITIVE_INFINITY, band: 'poor', bounds: '≥32% (obese range)' },
  ],
};

/** Minimum physiologically possible body fat (essential fat). */
const BF_MIN: Record<BiologicalSex, number> = { male: 2, female: 8 };

/**
 * Classify a MEASURED body-fat % (caliper/DEXA/BIA) by sex. Values below
 * essential fat are rejected as measurement error, not classified.
 */
export function classifyMeasuredBodyFat(
  bodyFatPct: number,
  sex: BiologicalSex
): NormResult | null {
  if (!Number.isFinite(bodyFatPct) || bodyFatPct < BF_MIN[sex] || bodyFatPct > 70) return null;
  const hit = BF_BANDS[sex].find(b => bodyFatPct <= b.max)!;
  return { band: hit.band, score: bandScore(hit.band), bounds: hit.bounds, source: BF_SOURCE };
}

// ============================================================================
// 4. ABDOMINAL SKINFOLD (mm) — Jackson-Pollock 3-site input
// ============================================================================

/**
 * Abdominal skinfold bands (mm). The Jackson-Pollock 3-site formula uses
 * chest/abdominal/thigh; there is no published sex/age population band table
 * for the abdominal site ALONE, so this package provides conservative
 * operational bands labelled as such, plus the J-P 3-site body-density and
 * Siri %BF formulas for the real calculation. Source note: operational
 * bands derived from J-P population descriptors; NOT a primary normative table.
 */
const SKINFOLD_SOURCE =
  'operational bands (Jackson-Pollock population descriptors) — use 3-site J-P for %BF';

const SKINFOLD_BANDS: Record<BiologicalSex, { max: number; band: NormBand; bounds: string }[]> = {
  male: [
    { max: 11.9, band: 'excellent', bounds: '≤11.9 mm' },
    { max: 17.9, band: 'above_average', bounds: '12-17.9 mm' },
    { max: 24.9, band: 'average', bounds: '18-24.9 mm' },
    { max: Number.POSITIVE_INFINITY, band: 'poor', bounds: '≥25 mm' },
  ],
  female: [
    { max: 13.9, band: 'excellent', bounds: '≤13.9 mm' },
    { max: 20.9, band: 'above_average', bounds: '14-20.9 mm' },
    { max: 27.9, band: 'average', bounds: '21-27.9 mm' },
    { max: Number.POSITIVE_INFINITY, band: 'poor', bounds: '≥28 mm' },
  ],
};

/** Caliper plausible domain: 3-80 mm. */
export function classifyAbdominalSkinfold(
  mm: number,
  sex: BiologicalSex
): NormResult | null {
  if (!Number.isFinite(mm) || mm < 3 || mm > 80) return null;
  const hit = SKINFOLD_BANDS[sex].find(b => mm <= b.max)!;
  return { band: hit.band, score: bandScore(hit.band), bounds: hit.bounds, source: SKINFOLD_SOURCE };
}

/**
 * Body density — Jackson-Pollock 3-site, sex-specific, mm.
 *
 * The three site arguments are THE SEX'S PROTOCOL SITES in protocol order
 * (see JP3_SITES): for males chest/abdomen/thigh, for females
 * triceps/suprailiac/thigh — the protocols differ because fat storage
 * differs by sex.
 *
 *   male   (Jackson & Pollock 1978, generalized 3-site):
 *          D = 1.10938 − 0.0008267·Σ + 0.0000016·Σ² − 0.0002574·age
 *   female (Jackson, Pollock & Ward 1980, 3-site):
 *          D = 1.0994921 − 0.0009929·Σ + 0.0000023·Σ²
 *   (Σ = sum of the three protocol sites in mm; the published female
 *   equation has NO age term — age is still validated as input for API
 *   consistency but does not enter the female formula.)
 *
 * Returns null outside the caliper-plausible sum (0 < Σ ≤ 240 mm) so a hostile
 * input can never produce a negative density, and null when the density or
 * the Siri conversion is physiologically impossible.
 */
export function jacksonPollockBodyDensity(
  chestMm: number,
  abdominalMm: number,
  thighMm: number,
  age: number,
  sex: BiologicalSex
): number | null {
  // Every site must be a plausible caliper reading (same 3–80 mm domain as
  // the abdominal classifier): a hostile negative site could otherwise hide
  // inside an "acceptable" sum (e.g. −10 + 20 + 20 = 30).
  for (const site of [chestMm, abdominalMm, thighMm]) {
    if (!Number.isFinite(site) || site < 3 || site > 80) return null;
  }
  const sum = chestMm + abdominalMm + thighMm;
  if (sum > 240) return null;
  if (!Number.isFinite(age) || age <= 0) return null;

  // Published sex-specific equations. The previous non-published female form
  // (1.24947 − 0.0009203·Σ + 0.0000022·Σ² − 0.0000015·Σ·age) was mathematically
  // dead — its density exceeded 1.12 for every plausible Σ — and has been
  // replaced by the primary-literature JPW 1980 equation.
  const density =
    sex === 'male'
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum;
  if (!Number.isFinite(density) || density <= 0.9 || density >= 1.12) return null;
  // The density is only accepted if Siri yields physiologically possible
  // body fat for this sex — impossibly low skinfold sums can produce a
  // "valid-looking" density whose %BF is negative, which is a lie.
  if (siriBodyFat(density, sex) === null) return null;
  return Math.round(density * 100000) / 100000;
}

/**
 * Siri (1961) equation: %BF = 495 / bodyDensity − 450, floored by the
 * sex-specific essential-fat minimum (a formula output below essential fat
 * is impossible physiology = invalid input, not a result).
 */
export function siriBodyFat(bodyDensity: number, sex: BiologicalSex): number | null {
  if (!Number.isFinite(bodyDensity) || bodyDensity <= 0.9 || bodyDensity >= 1.12) return null;
  const pct = 495 / bodyDensity - 450;
  if (!Number.isFinite(pct) || pct < BF_MIN[sex] || pct > 70) return null;
  return Math.round(pct * 10) / 10;
}

/**
 * The Jackson-Pollock 3-site protocols, per sex. The SITES differ — that is
 * the fat-storage-distribution argument: men store proportionally more fat on
 * the trunk, women on hips/glutes/limbs, so the female protocol reads
 * triceps and suprailiac instead of chest and abdomen
 * (Jackson & Pollock 1978; Jackson, Pollock & Ward 1980). The thigh is common
 * to both protocols.
 */
export const JP3_SITES: Record<BiologicalSex, readonly string[]> = {
  male: ['chest', 'abdomen', 'thigh'],
  female: ['triceps', 'suprailiac', 'thigh'],
};

/**
 * Full Jackson-Pollock 3-site pipeline: skinfolds (mm) → body density →
 * Siri %BF. The three site arguments are THE SEX'S PROTOCOL SITES in protocol
 * order (male: chest/abdomen/thigh; female: triceps/suprailiac/thigh — see
 * JP3_SITES). Null for any invalid site, implausible density or impossible %BF.
 */
export function jacksonPollockBodyFatPct(
  site1Mm: number,
  site2Mm: number,
  site3Mm: number,
  age: number,
  sex: BiologicalSex
): number | null {
  const density = jacksonPollockBodyDensity(site1Mm, site2Mm, site3Mm, age, sex);
  return density ? siriBodyFat(density, sex) : null;
}

// ============================================================================
// 5. AGGREGATED CONDITIONING PROFILE
// ============================================================================

export interface ConditioningInputs {
  cooper12mMeters?: number | null;
  restingHeartRateBpm?: number | null;
  measuredBodyFatPct?: number | null;
  abdominalSkinfoldMm?: number | null;
  /** Optional J-P 3-site MALE-protocol companions: chest + thigh (with the abdominal site). */
  chestSkinfoldMm?: number | null;
  thighSkinfoldMm?: number | null;
  /** Optional J-P 3-site FEMALE-protocol companions: triceps + suprailiac (with the thigh site). */
  tricepsSkinfoldMm?: number | null;
  suprailiacSkinfoldMm?: number | null;
}

export interface ConditioningProfile {
  cooper: (NormResult & { vo2max: number | null }) | null;
  restingHeartRate: NormResult | null;
  measuredBodyFat: NormResult | null;
  abdominalSkinfold: NormResult | null;
  /** Siri %BF from the MALE J-P 3-site formula (chest/abdomen/thigh), when all three exist. */
  jacksonPollockBodyFatPct: number | null;
  /** Siri %BF from the FEMALE J-P 3-site formula (triceps/suprailiac/thigh), when all three exist. */
  jacksonPollockFemaleBodyFatPct: number | null;
  /** 0-100 mean of the available scores (null when nothing is classifiable). */
  conditioningScore: number | null;
  /** How many of the 4 axes produced a classification. */
  classifiedCount: number;
}

/**
 * Build the full conditioning profile from whatever inputs exist. Partial
 * data is fine: each axis classifies independently, and the aggregate score
 * averages only the classified axes.
 */
export function buildConditioningProfile(
  inputs: ConditioningInputs,
  age: number,
  sex: BiologicalSex
): ConditioningProfile {
  const cooper =
    inputs.cooper12mMeters != null
      ? classifyCooperTest(inputs.cooper12mMeters, age, sex)
      : null;
  const rhr = inputs.restingHeartRateBpm != null ? classifyRestingHeartRate(inputs.restingHeartRateBpm) : null;
  const bf =
    inputs.measuredBodyFatPct != null ? classifyMeasuredBodyFat(inputs.measuredBodyFatPct, sex) : null;
  const skinfold =
    inputs.abdominalSkinfoldMm != null ? classifyAbdominalSkinfold(inputs.abdominalSkinfoldMm, sex) : null;

  // The two sex-specific 3-site pipelines are independent axes: the female
  // protocol reads triceps/suprailiac/thigh (JPW 1980), the male one
  // chest/abdomen/thigh. A profile exposes whichever set was measured.
  const jpMale =
    inputs.chestSkinfoldMm != null && inputs.abdominalSkinfoldMm != null && inputs.thighSkinfoldMm != null
      ? jacksonPollockBodyFatPct(inputs.chestSkinfoldMm, inputs.abdominalSkinfoldMm, inputs.thighSkinfoldMm, age, 'male')
      : null;
  const jpFemale =
    inputs.tricepsSkinfoldMm != null && inputs.suprailiacSkinfoldMm != null && inputs.thighSkinfoldMm != null
      ? jacksonPollockBodyFatPct(inputs.tricepsSkinfoldMm, inputs.suprailiacSkinfoldMm, inputs.thighSkinfoldMm, age, 'female')
      : null;

  const scores = [cooper?.score, rhr?.score, bf?.score, skinfold?.score].filter(
    (s): s is number => typeof s === 'number'
  );
  const conditioningScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return {
    cooper: cooper ? { ...cooper, vo2max: estimateVo2maxFromCooper(inputs.cooper12mMeters!) } : null,
    restingHeartRate: rhr,
    measuredBodyFat: bf,
    abdominalSkinfold: skinfold,
    jacksonPollockBodyFatPct: jpMale,
    jacksonPollockFemaleBodyFatPct: jpFemale,
    conditioningScore,
    classifiedCount: scores.length,
  };
}
