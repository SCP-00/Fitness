/**
 * Conditioning bridge — web adapter for `@fitness/bodylab-conditioning`.
 *
 * The core package classifies; this module adds the UI vocabulary (bilingual
 * band labels, colors) and the measurement-array mapper. No math lives here.
 */

import {
  buildConditioningProfile,
  type NormResult,
  type ConditioningProfile,
} from "@fitness/bodylab-conditioning";
import { getLatestValue } from "./queries";
import { profileAge } from "./age";
import type { Measurement, Profile } from "./types";

export type {
  NormResult,
  ConditioningProfile,
} from "@fitness/bodylab-conditioning";

/** Bilingual display names for the normative bands. */
export const NORM_BAND_LABELS: Record<
  NormResult["band"],
  { en: string; es: string }
> = {
  excellent: { en: "Excellent", es: "Excelente" },
  above_average: { en: "Above average", es: "Sobre la media" },
  average: { en: "Average", es: "Media" },
  below_average: { en: "Below average", es: "Bajo la media" },
  poor: { en: "Poor", es: "Malo" },
};

/** Semantic colors per band (same hue discipline as SCORE_COLORS). */
export const NORM_BAND_COLORS: Record<NormResult["band"], string> = {
  excellent: "#10b981",
  above_average: "#22d3ee",
  average: "#f59e0b",
  below_average: "#f97316",
  poor: "#ef4444",
};

const LATEST_KEYS = [
  "cooper_12m_distance",
  "resting_heart_rate",
  "body_fat_measured",
  "abdominal_skinfold",
  "chest_skinfold",
  "thigh_skinfold",
  "triceps_skinfold",
  "suprailiac_skinfold",
] as const;

type ConditioningKey = (typeof LATEST_KEYS)[number];

function latestOf(
  measurements: Measurement[],
  type: ConditioningKey,
): number | null {
  return getLatestValue(measurements, type as never) as number | null;
}

/**
 * Build the conditioning profile from the app's measurement array, using the
 * latest value of each conditioning type. Missing types are simply absent
 * axes of the profile.
 */
export function getConditioningProfile(
  measurements: Measurement[],
  profile: Profile,
): ConditioningProfile {
  return buildConditioningProfile(
    {
      cooper12mMeters: latestOf(measurements, "cooper_12m_distance"),
      restingHeartRateBpm: latestOf(measurements, "resting_heart_rate"),
      measuredBodyFatPct: latestOf(measurements, "body_fat_measured"),
      abdominalSkinfoldMm: latestOf(measurements, "abdominal_skinfold"),
      chestSkinfoldMm: latestOf(measurements, "chest_skinfold"),
      thighSkinfoldMm: latestOf(measurements, "thigh_skinfold"),
      tricepsSkinfoldMm: latestOf(measurements, "triceps_skinfold"),
      suprailiacSkinfoldMm: latestOf(measurements, "suprailiac_skinfold"),
    },
    // Age is derived from the birth date at this boundary; core stays pure.
    profileAge(profile),
    profile.biologicalSex === "female" ? "female" : "male",
  );
}
