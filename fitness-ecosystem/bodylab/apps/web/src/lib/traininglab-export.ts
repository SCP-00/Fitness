/**
 * TrainingLab export — the data bridge to the gym-planning app.
 *
 * TrainingLab (V2, plan in docs/TRAININGLAB_UI_PLAN.md) will consume this JSON to
 * build AI/deterministic routines (locally via an LLM such as Qwen). The
 * contract is designed so the planner can answer: "which muscles are weak
 * (anthropometry) and which are undertrained (volume) → program them first".
 *
 * Everything here is derived from state that already exists; nothing new is
 * persisted. The export is a plain JSON file — no cloud, same privacy model.
 *
 * Contract version: 1 (semver for the shape itself; consumers must ignore
 * unknown fields to stay forward-compatible).
 */

import {
  ALL_EXERCISES,
  getMusclesForExercise,
  type Exercise,
} from "./exercises";
import { MUSCLE_GROUPS } from "./constants";
import { getLatestValue } from "./queries";
import { profileAge } from "./age";
import {
  buildConditioningProfile,
  type ConditioningProfile,
} from "@fitness/bodylab-conditioning";
import type { ExerciseSet, MaxEffort, Measurement, Profile } from "./types";

/** Minimal state shape this module needs (structural subset of the app store). */
interface ExportState {
  profile: Profile | null;
  measurements: Measurement[];
  assessment: {
    segment: string;
    actual: number;
    ideal: number;
    score: number;
  }[];
  whtrResult: { ratio: number } | null;
  adonisResult: { ratio: number } | null;
  exerciseSets: ExerciseSet[];
  maxEfforts: MaxEffort[];
}

export const TRAININGLAB_EXPORT_VERSION = 2;

/** Anthrometric weakness signal per measurable segment (0-1, 1 = ideal). */
interface SegmentScore {
  segment: string;
  /** latest measured circumference (cm) */
  actual: number;
  /** reference ideal (cm) from McCallum/Venus, when available */
  ideal: number | null;
  /** 0-1 attenuation score, 1 = on target */
  score: number;
  status: "optimal" | "near" | "moderate" | "significant";
}

/**
 * Conditioning weakness map (v2): the cardiorespiratory + body-composition
 * axes the planner needs alongside the anthropometric ones. It is the full
 * core `ConditioningProfile` (nulls = axis not measured or not classifiable),
 * plus a ready-to-use 0-100 aggregate. Planners should program the axes with
 * the lowest scores first.
 */
export interface ConditioningWeakness {
  /** 0-100 mean of the classified axes, null = nothing measurable. */
  conditioningScore: number | null;
  /** Per-axis normative results (null = axis absent). */
  axes: ConditioningProfile;
  /** Which axes were classified, for quick prioritization. */
  classifiedCount: number;
}

/** Per-muscle training load summary (all 19 registry groups). */
interface MuscleLoad {
  muscle: string;
  /** total logged sets all-time (sets × logged count) */
  totalSets: number;
  /** sets in the last 7 days */
  setsLast7d: number;
  /** ISO timestamp of the last set touching this muscle, null = never */
  lastTrained: string | null;
  /** 0=untrained 1=low 2=moderate 3=high (same scale as the 2D body map) */
  intensity: 0 | 1 | 2 | 3;
  /** measurement type that proxies this muscle's size, when one exists */
  proxyMeasurement: string | null;
  /** latest value of the proxy measurement (cm), null = not measured */
  proxyValue: number | null;
}
interface TraininglabProfile {
  height: number; // cm
  weight: number | null; // kg (latest)
  /** Derived from `birthDate` at export time; kept for contract compatibility. */
  age: number | null;
  /** ISO `YYYY-MM-DD` when the user has recorded it. Additive in v2. */
  birthDate: string | null;
  biologicalSex: "male" | "female" | string;
  units: string;
  /** Onboarding context (additive in v2; consumers ignore unknown fields). */
  sport?: string;
  sportFocus?: string | null;
  objective?: string;
  aestheticPreset?: string | null;
}

/** The file TrainingLab consumes. Keep flat + explicit: LLM-friendly. */
export interface TraininglabExport {
  format: "bodylab-traininglab-link";
  version: number;
  exportedAt: string;
  profile: TraininglabProfile | null;
  /** Latest value per measurement type (the current body state). */
  measurements: {
    type: string;
    value: number;
    unit: string;
    timestamp: string;
  }[];
  /** Full history for trend-aware planning (chronological). */
  measurementHistory: Measurement[];
  /** Anthropometric weakness map — the "what is underdeveloped" signal. */
  muscleScores: SegmentScore[];
  /** WHtR + Adonis when computable (classic risk/proportion indicators). */
  indicators: { whtr: number | null; adonis: number | null };
  /** Per-muscle training load — the "what is undertrained" signal. */
  muscleLoad: MuscleLoad[];
  /**
   * Cardiorespiratory + body-composition weakness map (v2): Cooper test,
   * resting HR, measured %BF (incl. Navy estimates), J-P skinfolds.
   * v1 consumers must ignore this field per the forward-compatibility rule.
   */
  conditioning: ConditioningWeakness | null;
  /** Personal records per exercise (Epley e1RM) for load prescription. */
  personalRecords: {
    exerciseId: string;
    bestWeight: number | null;
    bestReps: number | null;
    bestEst1RM: number | null;
    achievedAt: string;
  }[];
  /** Full set history, chronological — recent sessions drive progression. */
  trainingLog: ExerciseSet[];
  /** The 64-exercise catalog with muscle involvements (the planning vocabulary). */
  exerciseCatalog: {
    id: string;
    name: string;
    category: string;
    difficulty: number;
    hypertrophy: number;
    equipment: string;
    muscles: { muscle: string; intensity: 1 | 2 | 3 }[];
  }[];
}

function scoreStatus(score: number): SegmentScore["status"] {
  if (score >= 0.9) return "optimal";
  if (score >= 0.7) return "near";
  if (score >= 0.4) return "moderate";
  return "significant";
}

function buildMuscleLoad(state: ExportState): MuscleLoad[] {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const latest = state.measurements;

  return MUSCLE_GROUPS.map((group) => {
    // Which exercises touch this muscle group? Exercise muscles use granular
    // ids (chest_upper, triceps_long…) that may not equal the group id, so we
    // match by prefix family: group id is a prefix of the exercise muscle id
    // (chest → chest_upper/chest_lower) or the group's measurement proxy maps
    // through exercises already tagged for that family via ALL_EXERCISES.
    const familyExercises = ALL_EXERCISES.filter((ex) =>
      getMusclesForExercise(ex).some(
        (m) =>
          m.muscle === group.id ||
          m.muscle.startsWith(group.id + "_") ||
          m.muscle === group.id,
      ),
    );
    const exerciseIds = new Set(familyExercises.map((e) => e.id));

    const sets = state.exerciseSets.filter((s) =>
      exerciseIds.has(s.exerciseId),
    );
    const totalSets = sets.length;
    const setsLast7d = sets.filter(
      (s) => new Date(s.timestamp).getTime() >= weekAgo,
    ).length;
    const lastTrained =
      sets.length > 0
        ? sets.reduce(
            (acc, s) => (s.timestamp > acc ? s.timestamp : acc),
            sets[0].timestamp,
          )
        : null;

    const intensity: 0 | 1 | 2 | 3 =
      setsLast7d >= 6 ? 3 : setsLast7d >= 3 ? 2 : setsLast7d >= 1 ? 1 : 0;

    const proxyValue = group.measurementType
      ? getLatestValue(latest, group.measurementType as never)
      : null;

    return {
      muscle: group.id,
      totalSets,
      setsLast7d,
      lastTrained,
      intensity,
      proxyMeasurement: group.measurementType ?? null,
      proxyValue,
    };
  });
}

function buildCatalog(): TraininglabExport["exerciseCatalog"] {
  const nameOf = (e: Exercise) => e.name.en;
  return ALL_EXERCISES.map((ex) => ({
    id: ex.id,
    name: nameOf(ex),
    category: ex.category,
    difficulty: ex.difficulty,
    hypertrophy: ex.hypertrophy,
    equipment: ex.equipment.en,
    muscles: getMusclesForExercise(ex).map((m) => ({
      muscle: m.muscle,
      intensity: m.intensity,
    })),
  }));
}

function buildConditioningWeakness(
  measurements: Measurement[],
  profile: Profile | null,
): ConditioningWeakness | null {
  if (!profile) return null; // classification needs age + biological sex
  const latest = (type: string): number | null =>
    getLatestValue(measurements, type as never) as number | null;
  const p = buildConditioningProfile(
    {
      cooper12mMeters: latest("cooper_12m_distance"),
      restingHeartRateBpm: latest("resting_heart_rate"),
      measuredBodyFatPct: latest("body_fat_measured"),
      abdominalSkinfoldMm: latest("abdominal_skinfold"),
      chestSkinfoldMm: latest("chest_skinfold"),
      thighSkinfoldMm: latest("thigh_skinfold"),
      tricepsSkinfoldMm: latest("triceps_skinfold"),
      suprailiacSkinfoldMm: latest("suprailiac_skinfold"),
    },
    profileAge(profile),
    profile.biologicalSex === "female" ? "female" : "male",
  );
  // Nothing classifiable → the map is absent rather than a shell of nulls.
  if (p.classifiedCount === 0) return null;
  return {
    conditioningScore: p.conditioningScore,
    axes: p,
    classifiedCount: p.classifiedCount,
  };
}

/** Build the full TrainingLab link payload from the current app state. */
export function buildTraininglabExport(state: ExportState): TraininglabExport {
  const {
    profile,
    measurements,
    assessment,
    whtrResult,
    adonisResult,
    exerciseSets,
    maxEfforts,
  } = state;

  const latestTypes = [...new Set(measurements.map((m) => m.type))];
  const latest: TraininglabExport["measurements"] = latestTypes
    .map((type) => {
      const m = measurements.find((x) => x.type === type) ?? null;
      const value = getLatestValue(measurements, type as never);
      if (value === null || !m) return null;
      return { type, value, unit: m.unit, timestamp: m.timestamp };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.type.localeCompare(b.type));

  const weight = getLatestValue(measurements, "weight" as never);

  return {
    format: "bodylab-traininglab-link",
    version: TRAININGLAB_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile
      ? {
          height: profile.height,
          weight: weight,
          age: profileAge(profile),
          birthDate: profile.birthDate ?? null,
          biologicalSex: profile.biologicalSex,
          units: profile.units ?? "metric",
          sport: profile.sport,
          sportFocus: profile.sportFocus ?? null,
          objective: profile.objective,
          aestheticPreset: profile.aestheticPreset ?? null,
        }
      : null,
    measurements: latest,
    measurementHistory: [...measurements].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    ),
    muscleScores: assessment.map((a) => ({
      segment: a.segment,
      actual: a.actual,
      ideal: a.ideal,
      score: a.score,
      status: scoreStatus(a.score),
    })),
    indicators: {
      whtr: whtrResult?.ratio ?? null,
      adonis: adonisResult?.ratio ?? null,
    },
    muscleLoad: buildMuscleLoad(state),
    conditioning: buildConditioningWeakness(measurements, profile),
    personalRecords: maxEfforts.map((m: MaxEffort) => ({
      exerciseId: m.exerciseId,
      bestWeight: m.bestWeight ?? null,
      bestReps: m.bestReps ?? null,
      bestEst1RM: m.bestEst1RM ?? null,
      achievedAt: m.achievedAt,
    })),
    trainingLog: [...exerciseSets].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    ),
    exerciseCatalog: buildCatalog(),
  };
}

/** Suggested filename: bodylab-traininglab-YYYY-MM-DD.json */
export function traininglabFilename(): string {
  return `bodylab-traininglab-${new Date().toISOString().split("T")[0]}.json`;
}

/** Download helper (same approach as the Data Vault page). */
export function downloadTraininglabExport(state: ExportState): void {
  const payload = buildTraininglabExport(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = traininglabFilename();
  a.click();
  URL.revokeObjectURL(url);
}
