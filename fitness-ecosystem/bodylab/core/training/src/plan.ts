/**
 * Plan types — the Routine vocabulary (TrainingLab plan §4, T1).
 *
 * Pure TypeScript — no React, no DOM, no I/O, no dependencies. These types are
 * the shared contract between a deterministic generator, a human routine
 * editor and an LLM proposal: everything a plan could express lives here, and
 * `validator.ts` decides whether a given plan is ALLOWED.
 *
 * @module training/plan
 */

/** Training goal, per the plan's product vocabulary. */
export type TrainingGoal = 'strength' | 'hypertrophy' | 'recomposition';

/** Experience level — drives the weekly-volume windows in the validator. */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * The 34 granular muscle ids of the exercise vocabulary (web `exercises.ts`).
 * Duplicated as a type here so core can validate muscle focus without
 * importing the catalog (core stays UI- and web-independent).
 */
export type MuscleGroup =
  // Upper body — push
  | 'chest_upper' | 'chest_lower'
  | 'pectoralis_minor'
  | 'serratus_anterior'
  | 'anterior_deltoid' | 'lateral_deltoid' | 'posterior_deltoid'
  | 'triceps_long' | 'triceps_lateral' | 'triceps_medial'
  // Upper body — pull
  | 'biceps_long' | 'biceps_short'
  | 'brachioradialis' | 'forearm_flexors' | 'forearm_extensors'
  | 'lats_upper' | 'lats_mid' | 'lats_lower'
  | 'traps_upper' | 'traps_mid' | 'traps_lower'
  | 'rhomboids'
  // Core
  | 'rectus_abdominis' | 'obliques' | 'erector_spinae'
  | 'iliopsoas'
  // Lower body
  | 'gluteus_maximus' | 'gluteus_medius'
  | 'quadriceps' | 'adductors'
  | 'hamstrings' | 'calves' | 'soleus' | 'tibialis_anterior';

/** Muscle families — the granularity at which the HARD RULES operate. */
export type MuscleFamily =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'lats'
  | 'traps'
  | 'rhomboids'
  | 'core'
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'calves';

/** Map a granular muscle id to its rule-level family. */
export function muscleFamilyOf(muscle: MuscleGroup): MuscleFamily {
  if (muscle.startsWith('chest') || muscle === 'pectoralis_minor' || muscle === 'serratus_anterior') return 'chest';
  if (muscle.endsWith('_deltoid')) return 'shoulders';
  if (muscle.startsWith('triceps')) return 'triceps';
  if (muscle.startsWith('biceps') || muscle === 'brachioradialis') return 'biceps';
  if (muscle.startsWith('forearm_')) return 'forearms';
  if (muscle.startsWith('lats')) return 'lats';
  if (muscle.startsWith('traps')) return 'traps';
  if (muscle === 'rhomboids') return 'rhomboids';
  if (muscle === 'rectus_abdominis' || muscle === 'obliques' || muscle === 'erector_spinae' || muscle === 'iliopsoas') return 'core';
  if (muscle.startsWith('gluteus')) return 'glutes';
  if (muscle === 'quadriceps' || muscle === 'adductors') return 'quadriceps';
  if (muscle === 'hamstrings') return 'hamstrings';
  return 'calves';
}

/** True when the family is a "big" muscle group for rule 2 (no consecutive days). */
export function isBigMuscleFamily(family: MuscleFamily): boolean {
  return (
    family === 'chest' ||
    family === 'shoulders' ||
    family === 'triceps' ||
    family === 'biceps' ||
    family === 'lats' ||
    family === 'quadriceps' ||
    family === 'hamstrings' ||
    family === 'glutes'
  );
}

/** One prescribed exercise inside a day. */
export interface ExerciseSlot {
  /** Must resolve to a real exercise in the injected catalog (rule 1). */
  exerciseId: string;
  /** 1–6 sets (validated structurally). */
  sets: number;
  /** Target rep range, inclusive (validated: 1 ≤ repsMin ≤ repsMax ≤ 50). */
  repsMin: number;
  repsMax: number;
  /** Reps in reserve, optional (0–5). */
  rir?: number;
  /** Rest in seconds (validated: 0–600). */
  restSec: number;
}

/** One training day: a focus + the slots that attack it. */
export interface Day {
  id: string;
  focus: MuscleGroup[];
  slots: ExerciseSlot[];
}

/** A complete routine. */
export interface Routine {
  id: string;
  name: string;
  goal: TrainingGoal;
  daysPerWeek: number;
  /** Equipment available to the athlete (e.g. ['barbell', 'dumbbells']). */
  equipment: string[];
  createdAt: string;
  days: Day[];
  level?: ExperienceLevel;
}

/** What an LLM may PROPOSE (never raw slots — it names exercises, not params). */
export interface AiProposal {
  name: string;
  rationale: string;
  days: { focus: string; slots: string[] }[];
  /** The LLM must cite the weak muscles its plan attacks (rule 5). */
  targetedWeakMuscles: string[];
}

// ============================================================================
// ValidationResult vocabulary (shared by every hard rule)
// ============================================================================

/** Which hard rule produced a violation (plan §4, rules 1–5). */
export type HardRule =
  | 'catalog' // 1: exerciseIds exist + equipment compatible
  | 'consecutive_days' // 2: no big family two days in a row
  | 'weekly_volume' // 3: family volume inside the level window
  | 'focus_coverage' // 4: every focused group has ≥1 slot
  | 'weak_muscle_citation'; // 5: AI proposals cite the weak muscles they attack

export interface Violation {
  rule: HardRule;
  /** Human-readable, bilingual-safe identifier-safe message (English base). */
  message: string;
  /** Machine-readable context: day id, family, exerciseId… */
  context?: Record<string, string | number>;
}

export interface ValidationIssue {
  /** Structural (types/ranges) or one of the 5 hard rules. */
  rule: HardRule | 'structure';
  message: string;
  context?: Record<string, string | number>;
}

export interface ValidationResult {
  /** True only when structure AND every hard rule pass. */
  valid: boolean;
  /** Structural problems (ranges, empty fields) — checked before the rules. */
  structural: ValidationIssue[];
  /** Hard-rule violations (empty when structural checks failed). */
  violations: Violation[];
}

// ============================================================================
// Weekly volume windows (rule 3) — the plan's [4, 22] range, refined by level
// ============================================================================

/** Weekly sets per muscle family, inside the plan's adjustable [4, 22] band. */
export const VOLUME_WINDOWS: Record<ExperienceLevel, { min: number; max: number }> = {
  beginner: { min: 4, max: 12 },
  intermediate: { min: 6, max: 18 },
  advanced: { min: 8, max: 22 },
};

/** Default when a routine omits `level`. */
export const DEFAULT_LEVEL: ExperienceLevel = 'intermediate';
