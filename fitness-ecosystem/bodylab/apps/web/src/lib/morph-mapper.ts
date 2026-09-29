/**
 * Measurement-to-Morph Mapper
 *
 * Maps user body measurements to OxiHuman morph parameters.
 * Uses a two-phase approach:
 *   1. Core params (height, weight, muscle, age) from profile
 *   2. Body proportions via morph targets to approximate measurements
 *
 * The engine supports arbitrary named morph targets loaded from the asset pack.
 * We use `apply_preset()` for base body type, then fine-tune with `set_param()`.
 *
 * @module morph-mapper
 */

import type { Profile, Measurement, BiologicalSex } from "./types";
import { profileAge } from "./age";

export interface MorphParams {
  height: number; // 0-1
  weight: number; // 0-1
  muscle: number; // 0-1
  age: number; // 0-1
  extras: Record<string, number>;
}

export interface ModelMeasurements {
  heightCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  weightKg: number;
}

export interface MeasurementFit {
  segment: string;
  userValue: number;
  modelValue: number;
  difference: number;
  percentDiff: number;
}

/**
 * Convert user profile to core OxiHuman params (0-1 normalized).
 */
export function profileToCoreParams(profile: Profile): {
  height: number;
  weight: number;
  muscle: number;
  age: number;
} {
  // Height: 1.5m → 0.0, 2.1m → 1.0
  const height = clamp01((profile.height - 1.5) / 0.6);

  // Weight: 40kg → 0.0, 150kg → 1.0
  const weight = clamp01((profile.weight - 40) / 110);

  // Age: 18 → 0.0, 80 → 1.0 (derived from the birth date, see lib/age.ts)
  const age = clamp01((profileAge(profile) - 18) / 62);

  // Muscle: estimate from BMI
  // Low BMI → less muscle, high BMI → more muscle (with cap)
  const bmi = profile.weight / (profile.height * profile.height);
  // BMI 18 → 0.2, BMI 25 → 0.5, BMI 35 → 0.8
  const muscle = clamp01((bmi - 15) / 25);

  return { height, weight, muscle, age };
}

/**
 * Choose the best OxiHuman preset based on user's body type.
 *
 * Presets (0.2.1): "athletic", "average", "slender" (+ "heavy", "tall", "__reset")
 */
export function choosePreset(profile: Profile): string {
  const bmi = profile.weight / (profile.height * profile.height);

  if (bmi < 20) return "slender";
  if (bmi > 28) return "average";
  return "athletic";
}

/**
 * Map the user's biological sex to the engine's `gender` morph parameter.
 *
 * 0.2.1 keeps `gender` in the engine's extra map and leaves it unset until
 * first written (0 = masc, 1 = fem, default 0.5 = neutral). A profile with
 * `biologicalSex` must drive it, or every model renders gender-neutral/male.
 */
export function biologicalSexToGender(sex: BiologicalSex): number {
  return sex === "female" ? 1 : 0;
}

/**
 * Map user measurements to morph target adjustments.
 *
 * This attempts to match the user's body proportions by adjusting
 * morph targets that affect specific body regions.
 *
 * @param userMeasurements - User's actual body measurements
 * @param modelMeasurements - Current model measurements (from get_measurements())
 * @returns Record of morph target name → adjustment value
 */
export function computeMorphAdjustments(
  userMeasurements: Measurement[],
  modelMeasurements: ModelMeasurements | null,
): Record<string, number> {
  const adjustments: Record<string, number> = {};

  if (!modelMeasurements) return adjustments;

  // Map measurement types to likely morph target names
  const measurementToMorph: Record<string, string[]> = {
    chest: ["chest", "bust", "torso_width", "upper_body"],
    waist: ["waist", "belly", "stomach", "midsection"],
    hips: ["hips", "pelvis", "lower_body"],
    biceps: ["biceps", "arms", "upper_arms"],
    thigh: ["thighs", "legs", "upper_legs"],
    calf: ["calves", "lower_legs"],
    neck: ["neck", "head"],
    shoulders: ["shoulders", "deltoids", "upper_body"],
  };

  // For each user measurement, try to find a matching morph target
  for (const m of userMeasurements) {
    const morphNames = measurementToMorph[m.type];
    if (!morphNames) continue;

    // Get the model's current measurement for this segment
    let modelValue: number | null = null;
    switch (m.type) {
      case "chest":
        modelValue = modelMeasurements.chestCm;
        break;
      case "waist":
        modelValue = modelMeasurements.waistCm;
        break;
      case "hips":
        modelValue = modelMeasurements.hipCm;
        break;
      // Other measurements don't have direct model equivalents
      default:
        continue;
    }

    if (modelValue === null || modelValue <= 0) continue;

    // Calculate how much we need to scale this region
    const ratio = m.value / modelValue;
    // Convert ratio to a morph adjustment: 1.0 = no change, >1 = bigger, <1 = smaller
    // Clamp to reasonable range
    const adjustment = clamp01(0.5 + (ratio - 1.0) * 2.5);

    for (const name of morphNames) {
      adjustments[name] = adjustment;
    }
  }

  return adjustments;
}

/**
 * Calculate fit quality between user and model measurements.
 */
export function calculateFit(
  userMeasurements: Measurement[],
  modelMeasurements: ModelMeasurements,
): MeasurementFit[] {
  const fits: MeasurementFit[] = [];

  const segmentMap: Record<string, number> = {
    chest: modelMeasurements.chestCm,
    waist: modelMeasurements.waistCm,
    hips: modelMeasurements.hipCm,
  };

  for (const m of userMeasurements) {
    const modelVal = segmentMap[m.type];
    if (modelVal === undefined || modelVal <= 0) continue;

    const diff = m.value - modelVal;
    const percentDiff = (Math.abs(diff) / modelVal) * 100;

    fits.push({
      segment: m.type,
      userValue: m.value,
      modelValue: Math.round(modelVal * 10) / 10,
      difference: Math.round(diff * 10) / 10,
      percentDiff: Math.round(percentDiff * 10) / 10,
    });
  }

  return fits;
}

/**
 * Apply all parameters to an OxiHuman engine instance.
 *
 * @param engine - OxiHumanEngine instance
 * @param profile - User profile
 * @param measurements - User measurements
 */
/**
 * Minimal interface for OxiHuman WASM engine.
 * Only the methods we actually use are declared here.
 */
export interface OxiHumanEngine {
  apply_preset(name: string): boolean | void;
  set_param(name: string, value: number): void;
  refresh_geometry(): void;
  build_mesh_bytes(): Uint8Array;
  get_measurements(): {
    height_cm(): number;
    chest_cm(): number;
    waist_cm(): number;
    hip_cm(): number;
    weight_kg(): number;
  };
  /**
   * Nelder–Mead fit over engine params (height/weight/muscle/gender) to match
   * the given target measurements, then leave the engine set to the fitted
   * params. JSON in, JSON report out (see FitReport).
   */
  fit_to_measurements(options_json: string): string;
  free(): void;
}

// ============================================================================
// Fit-to-measurements (0.2.1 `fit_to_measurements` — the sanctioned solver)
// ============================================================================

export interface FitTargets {
  heightCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
}

export interface FitReportSegment {
  name: string;
  /** Wire key from the engine — target in cm (JSON.parse preserves snake_case). */
  target_cm: number;
  measured_cm: number;
  delta_cm: number; // measured_cm − target_cm
}

export interface FitReport {
  params: Record<string, number>;
  results: FitReportSegment[];
  iterations: number;
  converged: boolean;
}

/**
 * Drive the engine's fit solver: pass any subset of height/chest/waist/hip
 * targets (at least one required), leave the engine set to the fitted params.
 * Returns the parsed fit report (deltas come from a final re-measurement of
 * the fitted geometry, never an echo of the input).
 */
export function fitToMeasurements(
  engine: OxiHumanEngine,
  targets: FitTargets,
): FitReport {
  const payload: Record<string, number> = {};
  if (targets.heightCm !== undefined) payload.height_cm = targets.heightCm;
  if (targets.chestCm !== undefined) payload.chest_cm = targets.chestCm;
  if (targets.waistCm !== undefined) payload.waist_cm = targets.waistCm;
  if (targets.hipCm !== undefined) payload.hip_cm = targets.hipCm;
  if (Object.keys(payload).length === 0)
    throw new Error("No valid fit target supplied");

  const raw = engine.fit_to_measurements(JSON.stringify(payload));
  return JSON.parse(raw) as FitReport;
}

/**
 * Collect the fit targets available for a profile + measurements list
 * (profile height in cm; chest/waist/hips from the measurements array).
 */
/** Human-readable segment label for a fit report result name (e.g. "hip" → "hips"). */
export function fitSegmentLabel(name: string): string {
  if (name === "hip") return "hips";
  return name;
}

export function collectFitTargets(
  profile: Profile | null,
  measurements: Measurement[],
): FitTargets {
  const targets: FitTargets = {};
  if (profile) targets.heightCm = Math.round(profile.height * 100);
  for (const m of measurements) {
    if (m.type === "chest") targets.chestCm = m.value;
    else if (m.type === "waist") targets.waistCm = m.value;
    else if (m.type === "hips") targets.hipCm = m.value;
  }
  return targets;
}

export function applyToEngine(
  engine: OxiHumanEngine,
  profile: Profile,
  measurements: Measurement[],
): void {
  // Phase 1: Apply base preset
  const preset = choosePreset(profile);
  engine.apply_preset(preset);

  // Phase 2: Apply core params
  const core = profileToCoreParams(profile);
  engine.set_param("height", core.height);
  engine.set_param("weight", core.weight);
  engine.set_param("muscle", core.muscle);
  engine.set_param("age", core.age);

  // Phase 3: Try to read current model measurements and adjust
  try {
    const modelM = engine.get_measurements();
    const modelMeasurements: ModelMeasurements = {
      heightCm: modelM.height_cm(),
      chestCm: modelM.chest_cm(),
      waistCm: modelM.waist_cm(),
      hipCm: modelM.hip_cm(),
      weightKg: modelM.weight_kg(),
    };

    const adjustments = computeMorphAdjustments(
      measurements,
      modelMeasurements,
    );

    // Apply adjustments via set_param (will drive matching morph targets)
    for (const [name, value] of Object.entries(adjustments)) {
      engine.set_param(name, value);
    }
  } catch {
    // Engine may not have measurements available yet
  }

  // Phase 4: gender must be written explicitly — 0.2.1 leaves it unset (0.5)
  // until first set_param, so without this every model renders gender-neutral.
  engine.set_param("gender", biologicalSexToGender(profile.biologicalSex));
}

// Utility
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
