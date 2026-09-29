/**
 * The v2 link: BodyLab export → core/training routine → display days.
 *
 * This is the only place that knows both sides' vocabularies. The payload
 * shape is pinned by BodyLab's `traininglab-export.ts` (contract v2) and the
 * tests here mirror `tests/training/test_export_integration.test.ts`.
 *
 * @module lib/adapter
 */

import {
  generateRoutine,
  muscleFamilyOf,
  type CatalogEntry,
  type FamilyPlan,
  type FamilyWeakness,
  type MuscleFamily,
  type MuscleGroup,
  type Routine,
} from "@fitness/bodylab-training";
import type { PlannedDay, TlGoal, TlLevel } from "./types";

// ── Import payload types (structural subset of the v2 contract) ────────────

export interface ImportProfile {
  height: number;
  weight: number | null;
  age: number | null;
  biologicalSex: string;
  units: string;
}

export interface ImportExercise {
  id: string;
  name: string;
  category?: string;
  equipment: string;
  muscles: { muscle: string; intensity: 1 | 2 | 3 }[];
}

export interface ImportConditioning {
  conditioningScore: number | null;
  classifiedCount: number;
}

export interface ImportRecord {
  exerciseId: string;
  bestWeight: number | null;
  bestReps: number | null;
  /** Epley e1RM already computed by BodyLab (kg). */
  bestEst1RM: number | null;
  achievedAt: string;
}

export interface ImportPayload {
  format: string;
  version: number;
  profile: ImportProfile | null;
  measurements: {
    type: string;
    value: number;
    unit: string;
    timestamp: string;
  }[];
  muscleScores: { segment: string; score: number }[];
  muscleLoad: {
    muscle: string;
    totalSets: number;
    setsLast7d: number;
    intensity: number;
  }[];
  /** v2 conditioning weakness map (null when BodyLab has nothing classified). */
  conditioning?: ImportConditioning | null;
  /** Personal records per exercise, used for the first load suggestion. */
  personalRecords?: ImportRecord[];
  trainingLog?: {
    exerciseId: string;
    timestamp: string;
    weight: number | null;
    reps: number | null;
  }[];
  exerciseCatalog: ImportExercise[];
}

/** Structural guard: is this file a BodyLab TrainingLab export v2? */
export function isV2Payload(p: unknown): p is ImportPayload {
  if (p === null || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (o["format"] !== "bodylab-traininglab-link") return false;
  if (o["version"] !== 2) return false;
  if (!Array.isArray(o["exerciseCatalog"])) return false;
  return true;
}

// ── Weakness: two independent signals, fused conservatively ────────────────

/** Anthrometric segment → a representative granular muscle (validator vocabulary). */
const SEGMENT_MUSCLE: Record<string, MuscleGroup> = {
  chest: "chest_lower",
  waist: "rectus_abdominis",
  shoulders: "anterior_deltoid",
  biceps: "biceps_long",
  forearm: "forearm_flexors",
  thigh: "quadriceps",
  calf: "calves",
  hips: "gluteus_maximus",
  neck: "traps_upper",
};

/**
 * Fuse the two weakness signals into the core's FamilyWeakness semantics:
 * 0-100 STRENGTH where LOWER = weaker = programmed first (pinned by
 * test_export_integration: segment score 0.32 → weakness 32).
 *
 * Only signals that EXIST are fused. When the user has training data but a
 * family has never been trained, that absence is itself the strongest possible
 * signal (strength 0 for the volume axis) — but a brand-new user with no log at
 * all must not be treated as "everything untrained", or every family would be
 * maximally weak and the ordering would carry no information.
 */
export function fuseWeakness(
  muscleScores: ImportPayload["muscleScores"],
  muscleLoad: ImportPayload["muscleLoad"],
  opts: { hasTrainingData?: boolean } = {},
): FamilyWeakness {
  // Anthrometric strength: score 0-1 (1 = ideal) → 0-100. Weakest head wins.
  const anthro = new Map<MuscleFamily, number>();
  for (const seg of muscleScores) {
    const muscle = SEGMENT_MUSCLE[seg.segment];
    if (!muscle) continue;
    const fam = muscleFamilyOf(muscle);
    const strength = Math.round(seg.score * 100);
    anthro.set(fam, Math.min(anthro.get(fam) ?? 100, strength));
  }

  // Training-load strength: setsLast7d 0 → 0 (undertrained), ≥5 → 100.
  const volume = new Map<MuscleFamily, number>();
  for (const load of muscleLoad) {
    const fam = muscleFamilyOf(load.muscle as MuscleGroup);
    if (!fam) continue;
    const strength = Math.round(Math.min(1, load.setsLast7d / 5) * 100);
    volume.set(fam, Math.min(volume.get(fam) ?? 100, strength));
  }

  // Volume with the "never trained" signal folded in once the user has data.
  const loadedFamilies = new Set(volume.keys());
  if (opts.hasTrainingData) {
    for (const fam of STRUCTURED_FAMILIES) {
      if (!loadedFamilies.has(fam)) volume.set(fam, 0);
    }
  }

  // Weighted fusion where both signals exist (volume dominates: being
  // undertrained matters more for what to do THIS week than the long-term
  // anthropometric gap); otherwise the single available signal is used as-is so
  // it is never diluted toward "you are fine".
  const all = new Set([...anthro.keys(), ...volume.keys()]);
  const out: FamilyWeakness = {};
  for (const fam of all) {
    const a = anthro.get(fam);
    const v = volume.get(fam);
    const strength =
      a !== undefined && v !== undefined ? 0.6 * v + 0.4 * a : (a ?? v ?? 50);
    out[fam] = Math.round(strength * 10) / 10;
  }
  return out;
}

/** Every rule family, so "never trained" can be detected per family. */
const STRUCTURED_FAMILIES: MuscleFamily[] = [
  "chest",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "traps",
  "rhomboids",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

// ── Equipment: capability keys → real catalog equipment strings ─────────────

/** Coarse capability keys (what the user owns) → equipment-string matchers. */
const CAPABILITY_PATTERNS: Record<string, RegExp[]> = {
  bodyweight: [],
  dumbbells: [/dumbbell/i, /kettlebell/i],
  barbell: [
    /barbell/i,
    /^barra$/i,
    /ez bar/i,
    /squat rack/i,
    /bench/i,
    /t-bar/i,
  ],
  cable: [/cable/i, /polea/i],
  machine: [
    /machine/i,
    /máquina/i,
    /leg press/i,
    /prensa/i,
    /pec deck/i,
    /hack/i,
    /calf raise/i,
    /elevación de talones/i,
    /t-bar/i,
  ],
  band: [/band/i, /banda/i],
  pullup: [/pull-up/i, /dominadas/i, /dip/i],
};

function expandCapabilities(caps: string[]): string[] {
  return Object.entries(CAPABILITY_PATTERNS)
    .filter(([cap]) => caps.includes(cap))
    .flatMap(([, patterns]) => patterns.map((p) => p.source));
}

/**
 * Can this catalog exercise be performed with the owned equipment?
 * Bodyweight equipment (`Bodyweight`, `Mat`, …) is always owned.
 */
export function exerciseIsUsable(
  equipment: string,
  capabilities: string[],
): boolean {
  if (/^(bodyweight|mat\b|colchoneta|peso corporal)/i.test(equipment))
    return true;
  if (
    capabilities.includes("bodyweight") &&
    /^(bodyweight|mat\b|colchoneta)/i.test(equipment)
  )
    return true;
  return expandCapabilities(capabilities).some((pattern) =>
    new RegExp(pattern, "i").test(equipment),
  );
}

// ── Family plans: pick candidates per family from the imported catalog ──────

function buildFamilyPlans(
  catalog: CatalogEntry[],
): Partial<Record<MuscleFamily, FamilyPlan>> {
  const byFamily = new Map<MuscleFamily, CatalogEntry[]>();
  for (const ex of catalog) {
    for (const m of ex.muscles) {
      const fam = muscleFamilyOf(m.muscle as MuscleGroup);
      if (!byFamily.has(fam)) byFamily.set(fam, []);
      byFamily.get(fam)!.push(ex);
    }
  }

  /** The split pattern of each family (mirrors core generator's FAMILY_PATTERN). */
  const PATTERN_OF_FAMILY: Record<MuscleFamily, "push" | "pull" | "lower"> = {
    chest: "push",
    shoulders: "push",
    triceps: "push",
    lats: "pull",
    traps: "pull",
    rhomboids: "pull",
    biceps: "pull",
    forearms: "pull",
    core: "pull",
    quadriceps: "lower",
    hamstrings: "lower",
    glutes: "lower",
    calves: "lower",
  };
  /** Patterns spanned by ALL the exercise's DIRECT (intensity ≥ 2) movers. */
  const directPatternsOf = (ex: CatalogEntry): Set<"push" | "pull" | "lower"> =>
    new Set(
      ex.muscles
        .filter((m) => m.intensity >= 2)
        .map((m) => PATTERN_OF_FAMILY[muscleFamilyOf(m.muscle as MuscleGroup)]),
    );

  const plans: Partial<Record<MuscleFamily, FamilyPlan>> = {};

  // Families with NO primary exercise anywhere in the catalog (e.g. traps:
  // rows and face-pulls only involve them as secondaries) can never be dosed
  // legally — their volume window is unreachable. A compound whose direct
  // involvement touches such a family would push un-dosable spill below the
  // window floor, so those compounds are skipped in favour of cleaner
  // alternatives (pull-ups + pulldowns instead of barbell rows).
  const primaryOwner = new Set<MuscleFamily>();
  for (const ex of catalog) {
    const p = ex.muscles.find((m) => m.intensity === 3);
    if (p) primaryOwner.add(muscleFamilyOf(p.muscle as MuscleGroup));
  }
  const noPrimary = new Set<MuscleFamily>();
  for (const fam of byFamily.keys()) {
    if (!primaryOwner.has(fam)) noPrimary.add(fam);
  }

  for (const [family, entries] of byFamily) {
    // Only exercises that DIRECTLY work the family (intensity ≥ 2), compounds first
    const direct = entries.filter((ex) =>
      ex.muscles.some(
        (m) =>
          muscleFamilyOf(m.muscle as MuscleGroup) === family &&
          m.intensity >= 2,
      ),
    );
    // Keep only exercises whose ENTIRE direct involvement (intensity ≥ 2)
    // lives in THIS family's split pattern. Hybrids like the deadlift
    // (lower primaries AND pull secondaries) or the band pull-apart
    // (pull primary AND a push-pattern shoulder secondary) must never be
    // assigned to a split day: their cross-pattern spill would train a big
    // family on two adjacent days and break the hard rule. Within one
    // pattern, shared primaries (squat → quads+glutes) are exactly the
    // spill the generator models safely.
    const seen = new Set<string>();
    const candidates = direct
      .filter((ex) => {
        const pats = directPatternsOf(ex);
        return pats.size === 1 && pats.has(PATTERN_OF_FAMILY[family]);
      })
      .filter((ex) => {
        // Skip compounds that would spill into a no-primary family (above).
        return !ex.muscles
          .filter((m) => m.intensity >= 2)
          .some((m) => noPrimary.has(muscleFamilyOf(m.muscle as MuscleGroup)));
      })
      .filter((ex) => (seen.has(ex.id) ? false : (seen.add(ex.id), true)))
      .sort((a, b) => rank(b) - rank(a));
    if (candidates.length === 0) continue;
    // The generator only DOSES families with an exercise whose PRIMARY mover
    // (first intensity-3 muscle) is that family. In the real BodyLab catalog
    // `traps` has no primary (rows/presses/face-pulls only involve it as a
    // secondary mover), yet compounds like the deadlift train it DIRECTLY —
    // and the generator requires a plan entry for every directly-touched
    // family. Mark those families as explicitly SPILL-ONLY (empty plan):
    // they are accounted for, never dosed, and still grow from the
    // physiological spill of the compounds that hit them.
    const primary = candidates.find(
      (ex) =>
        ex.muscles.find((m) => m.intensity === 3) !== undefined &&
        muscleFamilyOf(
          ex.muscles.find((m) => m.intensity === 3)!.muscle as MuscleGroup,
        ) === family,
    );
    if (!primary) {
      plans[family] = {
        exercises: [],
        exercisesPerSession: 0,
        sessionsPerWeek: 0,
      };
      continue;
    }
    plans[family] = {
      exercises: candidates.map((e) => e.id),
      // F1 keeps ONE exercise per family per session: the dose solver then
      // works with weekly SETS only, which keeps the spill fix-point away
      // from floor violations while the catalog keeps growing.
      exercisesPerSession: 1,
      sessionsPerWeek: defaultSessionsFor(family),
    };
  }
  return plans;
}

/** Rough exercise rank: more direct families = more compound = earlier. */
function rank(ex: CatalogEntry): number {
  return (
    ex.muscles.filter((m) => m.intensity >= 2).length * 10 +
    (ex.muscles.some((m) => m.intensity === 3) ? 1 : 0)
  );
}

/** Sensible per-family frequency defaults (capped by any split the generator picks). */
function defaultSessionsFor(family: MuscleFamily): number {
  switch (family) {
    case "quadriceps":
    case "hamstrings":
    case "glutes":
      return 2;
    case "calves":
    case "forearms":
      return 1;
    default:
      return 2;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface GenerateFromImportInput {
  payload: ImportPayload;
  daysPerWeek: number;
  goal: TlGoal;
  level: TlLevel;
  equipmentCapabilities: string[];
}

export interface GenerateFromImportResult {
  routine: Routine;
  /** The catalog entries the routine actually uses (for display names). */
  usedCatalog: CatalogEntry[];
}

/** Import → weakness → generator. Throws with an actionable message on failure. */
export function generateFromImport(
  input: GenerateFromImportInput,
): GenerateFromImportResult {
  const { payload } = input;
  const catalog: CatalogEntry[] = payload.exerciseCatalog.map((ex) => ({
    id: ex.id,
    muscles: ex.muscles,
    equipment: exerciseIsUsable(ex.equipment, input.equipmentCapabilities)
      ? []
      : ["__unavailable__"],
  }));
  // Equipment trick: exercises the user cannot perform get a token requirement
  // they never own, so the generator's rule 1 filters them out deterministically.
  const equipment = ["__owned__"];

  const weakness = fuseWeakness(payload.muscleScores, payload.muscleLoad);
  const familyPlans = buildFamilyPlans(catalog);

  const routine = generateRoutine({
    weakness,
    equipment,
    daysPerWeek: input.daysPerWeek,
    goal: input.goal,
    level: input.level,
    familyPlans,
    catalog,
    id: "tl-active",
    name: "Active plan",
  });

  return { routine, usedCatalog: catalog };
}

/** Convert a generated Routine into display-ready days with resolved names. */
export function toPlannedDays(
  routine: Routine,
  nameOf: (exerciseId: string) => string,
): PlannedDay[] {
  return routine.days.map((day) => ({
    id: day.id,
    focus: day.focus,
    slots: day.slots.map((slot) => ({
      exerciseId: slot.exerciseId,
      name: nameOf(slot.exerciseId),
      sets: slot.sets,
      repsMin: slot.repsMin,
      repsMax: slot.repsMax,
      rir: slot.rir,
      restSec: slot.restSec,
    })),
  }));
}

// ── Load suggestion (F4 preview: deterministic, grounded in the log) ────────

export interface SuggestLoadInput {
  /** Past sets for this exercise, chronological (any order accepted). */
  history: { weight: number | null; reps: number | null }[];
  repsMin: number;
  repsMax: number;
}

/**
 * Suggest today's working weight for an exercise slot.
 * Rules (deterministic, explainable):
 *   - no history → 20 kg placeholder ("start light")
 *   - last session hit the top of the rep range with clean margin → +2.5 kg
 *   - otherwise → repeat last working weight
 */
export function suggestLoad({
  history,
  repsMax,
}: SuggestLoadInput): number | null {
  const weighted = history.filter(
    (h) =>
      h.weight !== null && h.weight !== undefined && (h.weight as number) > 0,
  );
  if (weighted.length === 0) return null;
  const last = weighted[weighted.length - 1]!;
  const lastWeight = last.weight as number;
  const lastReps = (last.reps ?? 0) as number;
  if (lastReps >= repsMax) return Math.round((lastWeight + 2.5) * 10) / 10;
  return Math.round(lastWeight * 10) / 10;
}
