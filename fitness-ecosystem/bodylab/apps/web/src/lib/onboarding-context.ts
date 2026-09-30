/**
 * Onboarding context — the owner's "Sport" and "Atractivo" tracks (2026-09-30,
 * approved §5 of docs/RESEARCH_IDEALS_BY_SPORT.md).
 *
 * Pure data + bracket logic only: the wizard renders it, the profile stores
 * it, and every downstream consumer (export v2, the future ideal lens) reads
 * the same ids from here. No React, no storage.
 *
 * The ideal *source* per age bracket follows the research doc: 15–19 →
 * ACE/school tables, 20–59 → Cooper/FRIEND, 60–94 → Rikli & Jones Senior
 * Fitness Test. Sexes are covered in parallel (women-first docs, men kept).
 *
 * @module lib/onboarding-context
 */

/** Sports the wizard offers; ids are stable contract values. */
export const SPORTS = [
  { id: "general", en: "General fitness", es: "Aptitud general" },
  { id: "running", en: "Running", es: "Correr" },
  { id: "basketball", en: "Basketball", es: "Baloncesto" },
  { id: "speed_skating", en: "Speed skating", es: "Patinaje de velocidad" },
] as const;

export type SportId = (typeof SPORTS)[number]["id"];

/** What the user trains for — drives which ideal axis leads. */
export const SPORT_FOCUS = [
  { id: "endurance", en: "Endurance", es: "Resistencia" },
  { id: "power", en: "Power / jumps", es: "Potencia / saltos" },
  { id: "speed", en: "Max speed", es: "Velocidad máxima" },
  { id: "mobility", en: "Mobility", es: "Movilidad" },
] as const;

export type SportFocusId = (typeof SPORT_FOCUS)[number]["id"];

/** The two tracks: competitive vs aesthetic. */
export const OBJECTIVES = [
  { id: "sport", en: "Sport performance", es: "Rendimiento deportivo" },
  {
    id: "handsome",
    en: "Look & feel (aesthetic)",
    es: "Verse y sentirse mejor",
  },
  { id: "health", en: "Health", es: "Salud" },
] as const;

export type ObjectiveId = (typeof OBJECTIVES)[number]["id"];

/** Aesthetic presets shown only for the "handsome" objective. */
export const AESTHETIC_PRESETS = [
  {
    id: "whtr",
    en: "Waist-to-height under 0.5",
    es: "Cintura/estatura menor a 0,5",
  },
  {
    id: "ace_bf",
    en: "ACE athletic body-fat band",
    es: "Franja atlética de grasa (ACE)",
  },
  {
    id: "golden",
    en: "Golden-ratio proportions",
    es: "Proporciones de proporción dorada",
  },
  {
    id: "own",
    en: "My own targets",
    es: "Mis propios objetivos",
  },
] as const;

export type AestheticPresetId = (typeof AESTHETIC_PRESETS)[number]["id"];

/** The age range the owner defined (2026-09-30): 15–90. */
export const MIN_AGE = 15;
export const MAX_AGE = 90;

export type AgeBracket = "15-19" | "20-59" | "60-94";

/** Published source backing each bracket (shown in the UI, tested here). */
export const BRACKET_SOURCE: Record<AgeBracket, string> = {
  "15-19": "ACE / school fitness tables (vertical jump, run)",
  "20-59": "Cooper (1968) · FRIEND (Kaminsky 2015/2022)",
  "60-94": "Rikli & Jones Senior Fitness Test (60–94)",
};

/**
 * The bracket a derived age falls in; `null` outside 15–94 — the wizard asks
 * for the birth date, but the classification only *claims* a source inside
 * the published range.
 */
export function ageBracket(age: number | null): AgeBracket | null {
  if (age == null || !Number.isFinite(age)) return null;
  if (age < 15 || age > 94) return null;
  if (age <= 19) return "15-19";
  return age <= 59 ? "20-59" : "60-94";
}

/** Everything the wizard collects for the two tracks. */
export interface OnboardingContext {
  sport: SportId;
  sportFocus: SportFocusId | null;
  objective: ObjectiveId;
  aestheticPreset: AestheticPresetId | null;
}
