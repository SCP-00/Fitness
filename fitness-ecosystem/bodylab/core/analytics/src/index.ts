/**
 * BodyLab Analytics Engine
 *
 * Pure functions — no React, no DOM, no dependencies.
 * All calculations based on peer-reviewed research.
 *
 * @module core/analytics
 */

import type { Measurement } from '../../measurements/src/types';

// ============================================================================
// BODY COMPOSITION (Circumference-based)
// ============================================================================

export interface BodyCompositionResult {
  /** US Navy method body fat % */
  bodyFatNavy: number | null;
  /** BMI-based body fat % (Deurenberg et al.) */
  bodyFatBmi: number | null;
  /** Average of available methods */
  bodyFatEstimate: number | null;
  /** Lean body mass in kg */
  leanMass: number | null;
  /** Fat mass in kg */
  fatMass: number | null;
  /** Method used */
  method: string;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * US Navy Body Fat Formula (Hodgdon & Beasley, 1984)
 * Male: %BF = 495 / (1.0324 - 0.19077×log10(waist-neck) + 0.15456×log10(height)) - 450
 * Female: %BF = 495 / (1.29579 - 0.35004×log10(waist+hip-neck) + 0.22100×log10(height)) - 450
 */
export function calculateBodyFatNavy(
  waist: number,    // cm
  neck: number,     // cm
  height: number,   // cm
  hip: number,      // cm (female only)
  sex: 'male' | 'female'
): number | null {
  const log10 = (x: number) => Math.log(x) / Math.LN10;

  // Hostile-input guards: without these, `waist <= neck` (impossible anatomy)
  // feeds a non-positive argument to log10 → NaN that silently propagates to
  // the UI as "NaN %". Reject the domain instead of returning a poisoned value.
  if (!Number.isFinite(waist) || !Number.isFinite(neck) || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  if (sex === 'male') {
    const circumferenceDelta = waist - neck;
    if (circumferenceDelta <= 0) return null;
    const diff = 1.0324 - 0.19077 * log10(circumferenceDelta) + 0.15456 * log10(height);
    if (!Number.isFinite(diff) || diff <= 0) return null;
    return Math.round((495 / diff - 450) * 10) / 10;
  } else {
    if (!Number.isFinite(hip)) return null;
    const circumferenceDelta = waist + hip - neck;
    if (circumferenceDelta <= 0) return null;
    const diff = 1.29579 - 0.35004 * log10(circumferenceDelta) + 0.22100 * log10(height);
    if (!Number.isFinite(diff) || diff <= 0) return null;
    return Math.round((495 / diff - 450) * 10) / 10;
  }
}

/**
 * BMI-based Body Fat % (Deurenberg et al., 1991)
 * %BF = 1.20 × BMI + 0.23 × age - 16.2 (male)
 * %BF = 1.20 × BMI + 0.23 × age - 5.4 (female)
 */
export function calculateBodyFatBmi(
  weight: number,   // kg
  height: number,   // m
  age: number,
  sex: 'male' | 'female'
): number {
  const bmi = weight / (height * height);
  const base = 1.20 * bmi + 0.23 * age;
  return Math.round((sex === 'male' ? base - 16.2 : base - 5.4) * 10) / 10;
}

/**
 * Full body composition assessment from available measurements
 */
export function assessBodyComposition(
  measurements: Measurement[],
  weight: number,
  height: number,
  age: number,
  sex: 'male' | 'female'
): BodyCompositionResult {
  const getVal = (type: string) => measurements.find(m => m.type === type)?.value ?? null;

  const waist = getVal('waist');
  const neck = getVal('neck');
  const hip = getVal('hips');

  let bodyFatNavy: number | null = null;
  let method = 'BMI-based';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // US Navy (most accurate circumference method)
  if (waist && neck && height) {
    bodyFatNavy = calculateBodyFatNavy(waist, neck, height, hip ?? 0, sex);
    if (bodyFatNavy !== null && bodyFatNavy > 0 && bodyFatNavy < 60) {
      method = 'US Navy';
      confidence = sex === 'female' && hip ? 'high' : 'medium';
    }
  }

  // `height` arrives in cm (the Navy branch above needs cm), but the BMI
  // formula takes metres — pass the converted value, not the raw one.
  const bodyFatBmi = height > 0 ? calculateBodyFatBmi(weight, height / 100, age, sex) : null;
  const bodyFatEstimate = bodyFatNavy ?? bodyFatBmi;

  const fatMass = bodyFatEstimate ? Math.round(weight * bodyFatEstimate / 100 * 10) / 10 : null;
  const leanMass = fatMass ? Math.round((weight - fatMass) * 10) / 10 : null;

  return {
    bodyFatNavy,
    bodyFatBmi,
    bodyFatEstimate,
    leanMass,
    fatMass,
    method,
    confidence,
  };
}

// ============================================================================
// PROGRESS PREDICTION ENGINE
// ============================================================================

export interface PredictionResult {
  /** Current value */
  current: number;
  /** Predicted value at target date */
  predicted: number;
  /** Days to target */
  daysToTarget: number;
  /** Rate of change per week */
  ratePerWeek: number;
  /** R² confidence (0-1) */
  confidence: number;
  /** Trend direction */
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Predict future value using linear regression on measurement history
 */
export function predictProgress(
  measurements: Measurement[],
  type: string,
  daysAhead: number = 30
): PredictionResult | null {
  const typed = measurements
    // Drop non-finite values: a single NaN poisons every downstream statistic.
    .filter(m => m.type === type && Number.isFinite(m.value))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (typed.length < 2) return null;

  // Linear regression
  const n = typed.length;
  const x = typed.map((_, i) => i);
  const y = typed.map(m => m.value);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  const ssRes = y.reduce((a, yi, i) => a + (yi - (slope * x[i] + intercept)) ** 2, 0);
  const ssTot = y.reduce((a, yi) => a + (yi - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Calculate rate per week. Zero/negative time span (e.g. every row sharing a
  // timestamp) must not divide by zero and emit Infinity.
  const timeSpanDays = (new Date(typed[n - 1].timestamp).getTime() - new Date(typed[0].timestamp).getTime()) / (1000 * 60 * 60 * 24);
  const daysPerStep = timeSpanDays > 0 ? timeSpanDays / n : 0;
  const ratePerWeek = daysPerStep > 0 ? Math.round(slope * (7 / daysPerStep) * 100) / 100 : 0;
  const current = y[n - 1];

  // Predict: with no usable time axis, the only defensible answer is "no change".
  const predicted = daysPerStep > 0
    ? Math.round((slope * (n - 1 + daysAhead / daysPerStep) + intercept) * 10) / 10
    : current;

  return {
    current,
    predicted,
    daysToTarget: daysAhead,
    ratePerWeek,
    confidence: Math.round(r2 * 100) / 100,
    trend: slope > 0.01 ? 'improving' : slope < -0.01 ? 'declining' : 'stable',
  };
}

// ============================================================================
// HEALTH RISK INDICATORS
// ============================================================================

export interface HealthRiskResult {
  /** Waist-to-Height Ratio */
  whtr: number;
  /** WHtR status */
  whtrStatus: 'healthy' | 'elevated' | 'high_risk';
  /** BMI */
  bmi: number;
  /** BMI category */
  bmiCategory: 'underweight' | 'normal' | 'overweight' | 'obese';
  /** Overall risk level */
  overallRisk: 'low' | 'moderate' | 'elevated' | 'high';
  /** Risk factors found */
  factors: string[];
  /** Recommendations */
  recommendations: string[];
}

export function assessHealthRisks(
  waist: number,    // cm
  height: number,   // cm
  weight: number,   // kg
  age: number,
  _sex: 'male' | 'female'
): HealthRiskResult {
  const whtr = waist / height;
  const bmi = weight / ((height / 100) ** 2);

  // WHtR categories (Ashwell & Hsieh, 2005)
  const whtrStatus: HealthRiskResult['whtrStatus'] =
    whtr < 0.5 ? 'healthy' : whtr < 0.6 ? 'elevated' : 'high_risk';

  // BMI categories (WHO)
  const bmiCategory: HealthRiskResult['bmiCategory'] =
    bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : 'obese';

  const factors: string[] = [];
  const recommendations: string[] = [];

  if (whtrStatus === 'elevated') {
    factors.push('WHtR above 0.5 — increased health risk');
    recommendations.push('Focus on reducing waist circumference through exercise and nutrition');
  }
  if (whtrStatus === 'high_risk') {
    factors.push('WHtR above 0.6 — significantly elevated risk');
    recommendations.push('Consult a healthcare professional about waist circumference reduction');
  }
  if (bmiCategory === 'overweight') {
    factors.push('BMI in overweight range');
    recommendations.push('Consider a modest caloric deficit combined with resistance training');
  }
  if (bmiCategory === 'obese') {
    factors.push('BMI in obese range');
    recommendations.push('Consult a healthcare professional for a personalized plan');
  }
  if (bmiCategory === 'underweight') {
    factors.push('BMI below healthy range');
    recommendations.push('Consider increasing caloric intake with nutrient-dense foods');
  }
  if (age > 40 && whtr > 0.5) {
    factors.push('Age + central adiposity combination');
    recommendations.push('Regular health check-ups recommended');
  }

  // Overall risk
  let overallRisk: HealthRiskResult['overallRisk'] = 'low';
  if (whtrStatus === 'high_risk' || bmiCategory === 'obese') overallRisk = 'high';
  else if (whtrStatus === 'elevated' || bmiCategory === 'overweight') overallRisk = 'elevated';
  else if (factors.length > 0) overallRisk = 'moderate';

  return {
    whtr: Math.round(whtr * 1000) / 1000,
    whtrStatus,
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory,
    overallRisk,
    factors,
    recommendations,
  };
}

// ============================================================================
// BODY AGE SCORE
// ============================================================================

export interface BodyAgeResult {
  /** Chronological age */
  chronologicalAge: number;
  /** Estimated body age */
  bodyAge: number;
  /** Difference (negative = younger) */
  difference: number;
  /** Component scores */
  components: {
    name: string;
    score: number; // 0-100
    contribution: number; // weight in final score
    status: 'positive' | 'neutral' | 'negative';
  }[];
}

export function calculateBodyAge(
  age: number,
  whtr: number,
  bmi: number,
  measurements: Measurement[],
  assessmentScore: number | null
): BodyAgeResult {
  const components: BodyAgeResult['components'] = [];

  // WHtR component (30% weight)
  const whtrScore = whtr < 0.4 ? 100 : whtr < 0.5 ? 85 : whtr < 0.55 ? 65 : whtr < 0.6 ? 45 : 20;
  components.push({
    name: 'Waist-to-Height Ratio',
    score: whtrScore,
    contribution: 0.30,
    status: whtrScore >= 70 ? 'positive' : whtrScore >= 50 ? 'neutral' : 'negative',
  });

  // BMI component (20% weight)
  const bmiScore = bmi >= 18.5 && bmi < 25 ? 100 : bmi >= 25 && bmi < 30 ? 60 : bmi >= 30 ? 30 : 40;
  components.push({
    name: 'BMI',
    score: bmiScore,
    contribution: 0.20,
    status: bmiScore >= 70 ? 'positive' : bmiScore >= 50 ? 'neutral' : 'negative',
  });

  // Proportions component (25% weight)
  const propScore = assessmentScore !== null ? Math.round(assessmentScore * 100) : 50;
  components.push({
    name: 'Body Proportions',
    score: propScore,
    contribution: 0.25,
    status: propScore >= 70 ? 'positive' : propScore >= 50 ? 'neutral' : 'negative',
  });

  // Measurement count / consistency (15% weight)
  const uniqueTypes = new Set(measurements.map(m => m.type)).size;
  const consistencyScore = Math.min(100, uniqueTypes * 10);
  components.push({
    name: 'Measurement Consistency',
    score: consistencyScore,
    contribution: 0.15,
    status: consistencyScore >= 70 ? 'positive' : consistencyScore >= 40 ? 'neutral' : 'negative',
  });

  // Trend component (10% weight)
  const trendScore = 50; // Default neutral if no trend data
  components.push({
    name: 'Progress Trend',
    score: trendScore,
    contribution: 0.10,
    status: 'neutral',
  });

  // Weighted average
  const weightedSum = components.reduce((sum, c) => sum + c.score * c.contribution, 0);

  // Convert to body age: score 100 = 10 years younger, 0 = 10 years older
  const ageDelta = (50 - weightedSum) / 5; // range: -10 to +10
  const bodyAge = Math.round(age + ageDelta);

  return {
    chronologicalAge: age,
    bodyAge: Math.max(15, bodyAge),
    difference: Math.round(ageDelta),
    components,
  };
}

// ============================================================================
// CORRELATION ENGINE
// ============================================================================

export interface CorrelationResult {
  /** Parameter A */
  paramA: string;
  /** Parameter B */
  paramB: string;
  /** Correlation coefficient (-1 to 1) */
  coefficient: number;
  /** Strength description */
  strength: 'strong_positive' | 'moderate_positive' | 'weak' | 'moderate_negative' | 'strong_negative';
  /** Number of data points */
  sampleSize: number;
}

/**
 * Pearson correlation between two measurement series
 */
export function calculateCorrelation(
  measurements: Measurement[],
  typeA: string,
  typeB: string
): CorrelationResult | null {
  // Group by timestamp (same session)
  const byTimestamp = new Map<string, { a: number; b: number }>();

  for (const m of measurements) {
    if (m.type !== typeA && m.type !== typeB) continue;
    const date = m.timestamp.split('T')[0];
    if (!byTimestamp.has(date)) byTimestamp.set(date, { a: 0, b: 0 });
    const entry = byTimestamp.get(date)!;
    if (m.type === typeA) entry.a = m.value;
    if (m.type === typeB) entry.b = m.value;
  }

  const pairs = [...byTimestamp.values()].filter(p => p.a > 0 && p.b > 0);
  if (pairs.length < 3) return null;

  const n = pairs.length;
  const sumA = pairs.reduce((s, p) => s + p.a, 0);
  const sumB = pairs.reduce((s, p) => s + p.b, 0);
  const sumAB = pairs.reduce((s, p) => s + p.a * p.b, 0);
  const sumA2 = pairs.reduce((s, p) => s + p.a * p.a, 0);
  const sumB2 = pairs.reduce((s, p) => s + p.b * p.b, 0);

  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));

  if (denominator === 0) return null;

  const r = Math.round((numerator / denominator) * 100) / 100;

  let strength: CorrelationResult['strength'];
  if (r > 0.7) strength = 'strong_positive';
  else if (r > 0.3) strength = 'moderate_positive';
  else if (r > -0.3) strength = 'weak';
  else if (r > -0.7) strength = 'moderate_negative';
  else strength = 'strong_negative';

  return { paramA: typeA, paramB: typeB, coefficient: r, strength, sampleSize: n };
}

/**
 * Find all significant correlations in measurements
 */
export function findCorrelations(
  measurements: Measurement[],
  types: string[],
  minSampleSize: number = 3
): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      const corr = calculateCorrelation(measurements, types[i], types[j]);
      if (corr && corr.sampleSize >= minSampleSize && Math.abs(corr.coefficient) > 0.3) {
        results.push(corr);
      }
    }
  }

  return results.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
}
