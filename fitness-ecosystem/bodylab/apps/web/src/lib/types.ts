// ============================================================================
// BodyLab Types
// ============================================================================

export type BiologicalSex = "male" | "female";
export type UnitSystem = "metric" | "imperial";
export type Language = "en" | "es";

// ============================================================================
// Profile
// ============================================================================

export interface Profile {
  id: string;
  name: string;
  height: number; // meters
  weight: number; // kg
  /**
   * Birth date, ISO `YYYY-MM-DD` (what `<input type="date">` emits); `null`
   * while the user has not filled it in. Age is *derived* from this via
   * `lib/age.ts` — never stored — so it cannot go stale.
   */
  birthDate: string | null;
  /**
   * @deprecated Legacy field from the hand-typed "Age" input. Still read (and
   * still written on export) so old backups migrate cleanly, but nothing in the
   * app sets it any more: `normalizeProfile` converts it to `birthDate` once.
   */
  age?: number;
  biologicalSex: BiologicalSex;
  units: UnitSystem;
  /**
   * Owner direction 2026-09-30 (docs/RESEARCH_IDEALS_BY_SPORT.md §5): the
   * "Sport" and "Atractivo" onboarding tracks. Ids come from
   * `lib/onboarding-context.ts` and are additive/optional so existing stored
   * profiles and backups keep loading untouched.
   */
  sport?: string;
  sportFocus?: string | null;
  objective?: string;
  aestheticPreset?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileCreate {
  name: string;
  height: number;
  weight: number;
  birthDate: string | null;
  biologicalSex: BiologicalSex;
  units?: UnitSystem;
}

// ============================================================================
// Measurements
// ============================================================================

export type MeasurementType =
  | "wrist"
  | "neck"
  | "shoulders"
  | "chest"
  | "waist"
  | "hips"
  | "biceps"
  | "forearm"
  | "thigh"
  | "calf"
  | "weight"
  // Bilateral (left/right) for symmetry
  | "biceps_left"
  | "biceps_right"
  | "forearm_left"
  | "forearm_right"
  | "thigh_left"
  | "thigh_right"
  | "calf_left"
  | "calf_right"
  | "shoulders_left"
  | "shoulders_right"
  // ── Girths the schema lacked (tape only) ──────────────────────────────────
  | "hip_upper"
  | "triceps"
  | "biceps_flexed"
  | "forearm_flexed"
  | "mid_axillary"
  | "ankle"
  // ── Segment lengths (tape + wall/ruler; measured, never guessed) ──────────
  | "stature_sitting"
  | "arm_span"
  | "subischial_leg_length"
  | "upper_arm_length"
  | "forearm_length"
  | "hand_length"
  | "thigh_length"
  | "lower_leg_length"
  | "foot_length"
  // ── Bone breadths (ruler + two books; no caliper, no scanner) ─────────────
  | "biacromial"
  | "bi_iliac"
  | "wrist_breadth"
  | "elbow_breadth"
  | "knee_breadth"
  | "malleolar_breadth"
  | "hand_width";

export type CompositionType =
  "body_fat_percentage" | "lean_mass" | "bone_mass" | "water_percentage";

/**
 * Physical-conditioning tests and directly measured conditioning inputs
 * (classified in core by `@fitness/bodylab-conditioning` normative tables).
 *
 * The four skinfold types are the Jackson-Pollock 3-site caliper sites:
 * chest + abdomen (male protocol) and triceps + suprailiac (female protocol)
 * share the thigh site.
 */
export type ConditioningType =
  | "cooper_12m_distance"
  | "resting_heart_rate"
  | "body_fat_measured"
  | "abdominal_skinfold"
  | "chest_skinfold"
  | "thigh_skinfold"
  | "triceps_skinfold"
  | "suprailiac_skinfold";

export type AllMeasurementType =
  MeasurementType | CompositionType | ConditioningType;

export interface Measurement {
  id: string;
  profileId: string;
  type: AllMeasurementType;
  value: number;
  unit: string;
  timestamp: string;
  method: "manual" | "photo" | "scan";
  confidence: "high" | "medium" | "low";
  notes?: string;
}

export interface MeasurementCreate {
  type: AllMeasurementType;
  value: number;
  unit?: string;
  method?: "manual" | "photo" | "scan";
  confidence?: "high" | "medium" | "low";
  notes?: string;
}

export interface MeasurementTypeInfo {
  id: AllMeasurementType;
  label: { en: string; es: string };
  unit: string;
  min: number;
  max: number;
  category:
    | "circumference"
    | "length"
    | "breadth"
    | "composition"
    | "conditioning";
}

// ============================================================================
// Anthropometric Results
// ============================================================================

export interface McCallumResult {
  chest: number;
  waist: number;
  hips: number;
  biceps: number;
  thigh: number;
  neck: number;
  calf: number;
  forearm: number;
}

export interface AdonisResult {
  ratio: number;
  goldenRatio: number;
  deviation: number;
  status: "optimal" | "near" | "far";
}

export interface WHtRResult {
  ratio: number;
  status: "healthy" | "elevated" | "high_risk";
  description: string;
}

export interface FrameSizeResult {
  frameSize: "small" | "medium" | "large";
  ratio: number;
  description: string;
}

export interface AnthropometricAssessment {
  segment: string;
  actual: number;
  ideal: number;
  deviation: number;
  score: number; // 0-1
  status: "optimal" | "near" | "moderate" | "significant";
  color: string;
}

// ============================================================================
// Symmetry
// ============================================================================

export interface SymmetryPair {
  muscleGroup: string;
  left: Measurement | null;
  right: Measurement | null;
  leftScore: number;
  rightScore: number;
  difference: number; // absolute difference in cm
  percentDiff: number; // percentage difference
  symmetryScore: number; // 0-1, 1 = perfectly symmetric
  status: "balanced" | "mild" | "significant";
}

// ============================================================================
// Body Snapshot
// ============================================================================

export interface BodySnapshot {
  id: string;
  profileId: string;
  timestamp: string;
  measurements: Measurement[];
  bodyParameters: {
    height: number;
    weight: number;
    bodyFatPercentage?: number;
    leanMass?: number;
  };
  referenceProfileId: string;
  assessmentResults: AnthropometricAssessment[];
  algorithmVersion: string;
  notes?: string;
}

// ============================================================================
// Reference Profile
// ============================================================================

export type ReferenceCategory =
  "health" | "anthropometric" | "athletic" | "user_defined";

export interface ReferenceProfile {
  id: string;
  name: { en: string; es: string };
  description: { en: string; es: string };
  category: ReferenceCategory;
  source: string;
  biologicalSex: BiologicalSex | "both";
  measurements: {
    type: string;
    value: number;
    range?: { min: number; max: number };
  }[];
  version: string;
}

// ============================================================================
// UI State
// ============================================================================

export type ViewMode = "front" | "back";
export type BodyViewMode = "2d" | "3d";

export interface AppState {
  // Profile
  profile: Profile | null;
  profiles: Profile[];

  // Measurements
  measurements: Measurement[];

  // Snapshots
  snapshots: BodySnapshot[];
  currentSnapshot: BodySnapshot | null;

  // Reference
  selectedReference: ReferenceProfile | null;

  // UI
  language: Language;
  viewMode: ViewMode;
  bodyViewMode: BodyViewMode;
  selectedMuscle: string | null;

  // Assessment
  assessment: AnthropometricAssessment[];
  adonisResult: AdonisResult | null;
  whtrResult: WHtRResult | null;
  frameSizeResult: FrameSizeResult | null;
}

// ============================================================================
// Export
// ============================================================================

export interface ExportData {
  profile: Profile;
  measurements: Measurement[];
  snapshots: BodySnapshot[];
  exportedAt: string;
  version: string;
}

// ==============================================================================
// Exercise Tracking
// ==============================================================================

/** A single logged exercise set */
export interface ExerciseSet {
  id: string;
  exerciseId: string;
  timestamp: string;
  weight?: number; // kg
  reps?: number;
  sets?: number;
  duration?: number; // seconds
  notes?: string;
  /** RPE (Rate of Perceived Exertion) 1-10 */
  rpe?: number;
}

/** Max effort record for an exercise */
export interface MaxEffort {
  exerciseId: string;
  bestWeight?: number;
  bestReps?: number;
  bestEst1RM?: number; // estimated 1RM using Epley formula
  achievedAt: string;
  setCount: number;
}

/** Per-muscle training volume summary */
export interface MuscleTrainingSummary {
  muscle: string;
  totalSets: number;
  exerciseCount: number;
  lastTrained: string | null;
  intensityLevel: 0 | 1 | 2 | 3; // 0=untrained, 1=low, 2=moderate, 3=high
}
