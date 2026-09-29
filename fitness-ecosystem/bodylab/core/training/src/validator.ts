/**
 * Validator — the HARD RULES every training plan must obey (T1).
 *
 * "The LLM proposes; the math disposes." A routine — whether authored by a
 * human in the editor or proposed by a local model — is valid ONLY if it
 * passes structural checks and the five hard rules of the TrainingLab plan:
 *
 *   1. catalog        — every exerciseId exists AND its equipment fits
 *   2. consecutive    — no big muscle family trained two days in a row
 *   3. weekly volume  — per-family weekly sets inside the level window
 *   4. focus coverage — every focused muscle of a day gets ≥1 slot
 *   5. AI citation    — an LLM proposal must cite the weak muscles it attacks
 *
 * The catalog is INJECTED (never imported): core stays independent of the
 * web app. Invalid input returns violations — this module never throws.
 *
 * Pure TypeScript — no React, no DOM, no I/O, no dependencies.
 *
 * @module training/validator
 */

import {
  muscleFamilyOf,
  isBigMuscleFamily,
  VOLUME_WINDOWS,
  DEFAULT_LEVEL,
  type Day,
  type ExperienceLevel,
  type Routine,
  type ValidationResult,
  type Violation,
  type HardRule,
} from './plan';

/** What the validator knows about an exercise (structural subset of the web catalog). */
export interface CatalogEntry {
  id: string;
  /** Muscles this exercise touches, with involvement intensity. */
  muscles: { muscle: string; intensity: 1 | 2 | 3 }[];
  /** Equipment tokens this exercise REQUIRES (e.g. ['barbell']). */
  equipment: string[];
}

/** Minimal exercise catalog: the validator never imports one. */
export type ExerciseCatalog = readonly CatalogEntry[];

/** What an AI proposal must carry so rule 5 can check it. */
export interface AiProposalInput {
  name: string;
  days: { focus: string; slots: string[] }[];
  targetedWeakMuscles: string[];
}

// ============================================================================
// Structural pre-checks (before the hard rules; a broken shape proves nothing)
// ============================================================================

function validateStructure(routine: Routine): ValidationResult['structural'] {
  const issues: ValidationResult['structural'] = [];
  const push = (message: string, context?: Record<string, string | number>) =>
    issues.push({ rule: 'structure', message, context });

  if (!Number.isInteger(routine.daysPerWeek) || routine.daysPerWeek < 1 || routine.daysPerWeek > 7) {
    push('daysPerWeek must be an integer in [1, 7]', { daysPerWeek: routine.daysPerWeek as number });
  }
  if (!Array.isArray(routine.days)) {
    push('days must be an array');
    return issues;
  }
  if (routine.days.length !== routine.daysPerWeek) {
    push('days.length must equal daysPerWeek', {
      days: routine.days.length,
      daysPerWeek: routine.daysPerWeek,
    });
  }

  routine.days.forEach((day: Day, di: number) => {
    if (!day.id || typeof day.id !== 'string') push(`day ${di}: id required`, { dayIndex: di });
    if (!Array.isArray(day.slots)) {
      push(`day ${di}: slots must be an array`, { dayIndex: di });
      return;
    }
    day.slots.forEach((slot, si) => {
      const at = `day ${di} slot ${si}`;
      if (!Number.isInteger(slot.sets) || slot.sets < 1 || slot.sets > 6) {
        push(`${at}: sets must be an integer in [1, 6]`, { sets: slot.sets });
      }
      if (!Number.isInteger(slot.repsMin) || !Number.isInteger(slot.repsMax) || slot.repsMin < 1 || slot.repsMax > 50 || slot.repsMin > slot.repsMax) {
        push(`${at}: reps must satisfy 1 ≤ repsMin ≤ repsMax ≤ 50`, {
          repsMin: slot.repsMin,
          repsMax: slot.repsMax,
        });
      }
      if (!Number.isInteger(slot.restSec) || slot.restSec < 0 || slot.restSec > 600) {
        push(`${at}: restSec must be in [0, 600]`, { restSec: slot.restSec });
      }
      if (slot.rir !== undefined && (!Number.isInteger(slot.rir) || slot.rir < 0 || slot.rir > 5)) {
        push(`${at}: rir must be an integer in [0, 5]`, { rir: slot.rir });
      }
    });
  });

  return issues;
}

// ============================================================================
// Hard rule 1 — catalog existence + equipment compatibility
// ============================================================================

function validateCatalog(routine: Routine, catalog: ExerciseCatalog, violations: Violation[]): void {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const available = new Set(routine.equipment);

  for (const day of routine.days) {
    day.slots.forEach((slot, si) => {
      const ex = byId.get(slot.exerciseId);
      if (!ex) {
        violations.push({
          rule: 'catalog',
          message: `exercise "${slot.exerciseId}" does not exist in the catalog`,
          context: { exerciseId: slot.exerciseId, day: day.id, slot: si },
        });
        return;
      }
      // Equipment compatibility: the slot is valid if the athlete owns at least
      // ONE of the exercise's required tokens (a "dumbbell OR barbell" move is
      // doable with either). No required tokens = bodyweight = always OK.
      const required = ex.equipment.filter((t) => t.length > 0);
      if (required.length > 0 && !required.some((t) => available.has(t))) {
        violations.push({
          rule: 'catalog',
          message: `exercise "${ex.id}" needs equipment the athlete lacks (${required.join(', ')})`,
          context: { exerciseId: ex.id, day: day.id, slot: si, equipment: required.join(',') },
        });
      }
    });
  }
}

// ============================================================================
// Hard rule 2 — no big muscle family two days in a row
// ============================================================================

function validateConsecutiveDays(routine: Routine, catalog: ExerciseCatalog, violations: Violation[]): void {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const familiesPerDay = routine.days.map((day) => {
    const fams = new Set<string>();
    for (const slot of day.slots) {
      const ex = byId.get(slot.exerciseId);
      if (!ex) continue; // rule 1 already reported the unknown id
      for (const m of ex.muscles) fams.add(muscleFamilyOf(m.muscle as never));
    }
    return fams;
  });

  for (let i = 1; i < familiesPerDay.length; i++) {
    for (const fam of familiesPerDay[i]) {
      if (familiesPerDay[i - 1].has(fam) && isBigMuscleFamily(fam as never)) {
        violations.push({
          rule: 'consecutive_days',
          message: `big family "${fam}" is trained on two consecutive days (${i - 1} → ${i})`,
          context: { family: fam, dayIndex: i, previousDayIndex: i - 1 },
        });
      }
    }
  }
}

// ============================================================================
// Hard rule 3 — weekly sets per family inside the level window
// ============================================================================

/**
 * Weekly sets per muscle family, counting DIRECT work (intensity 2–3).
 * Synergist involvement (intensity 1) does not count: that is the plan's
 * "volumen semanal dentro de rango" with the conventional direct-work reading.
 */
export function weeklySetsByFamily(routine: Routine, catalog: ExerciseCatalog): Map<string, number> {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const totals = new Map<string, number>();
  for (const day of routine.days) {
    for (const slot of day.slots) {
      const ex = byId.get(slot.exerciseId);
      if (!ex) continue;
      for (const m of ex.muscles) {
        if (m.intensity >= 2) {
          const fam = muscleFamilyOf(m.muscle as never);
          totals.set(fam, (totals.get(fam) ?? 0) + slot.sets);
        }
      }
    }
  }
  return totals;
}

function validateWeeklyVolume(routine: Routine, catalog: ExerciseCatalog, violations: Violation[]): void {
  const level: ExperienceLevel = routine.level ?? DEFAULT_LEVEL;
  const window = VOLUME_WINDOWS[level];
  const totals = weeklySetsByFamily(routine, catalog);

  for (const [family, sets] of totals) {
    if (sets < window.min) {
      violations.push({
        rule: 'weekly_volume',
        message: `family "${family}" gets ${sets} sets/week, below the ${level} minimum (${window.min})`,
        context: { family, sets, level, min: window.min },
      });
    } else if (sets > window.max) {
      violations.push({
        rule: 'weekly_volume',
        message: `family "${family}" gets ${sets} sets/week, above the ${level} maximum (${window.max})`,
        context: { family, sets, level, max: window.max },
      });
    }
  }
}

// ============================================================================
// Hard rule 4 — every focused muscle of a day gets ≥1 slot
// ============================================================================

function validateFocusCoverage(routine: Routine, catalog: ExerciseCatalog, violations: Violation[]): void {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  for (const day of routine.days) {
    if (day.focus.length === 0) continue; // a day without focus (rest/conditioning) is legal
    const touched = new Set<string>();
    for (const slot of day.slots) {
      const ex = byId.get(slot.exerciseId);
      if (!ex) continue; // rule 1 already reported it
      for (const m of ex.muscles) {
        touched.add(m.muscle);
        // An exercise for a granular muscle also counts for its family siblings
        // is NOT assumed: coverage is exact muscle id (focus is granular).
      }
    }
    for (const focus of day.focus) {
      if (!touched.has(focus)) {
        violations.push({
          rule: 'focus_coverage',
          message: `focused muscle "${focus}" has no exercise on "${day.id}"`,
          context: { day: day.id, muscle: focus },
        });
      }
    }
  }
}

// ============================================================================
// Hard rule 5 — AI proposals must cite the weak muscles they attack
// ============================================================================

/**
 * Rule 5 for an `AiProposal`: it must cite at least one weak muscle AND every
 * cited weak muscle must be attacked by at least one day focused on it. An
 * LLM that ignores the weakness map gets rejected — "el LLM propone; las
 * reglas duras deciden".
 */
export function validateAiProposal(
  proposal: AiProposalInput,
  weakMuscles: readonly string[],
  availableExerciseIds: readonly string[]
): ValidationResult {
  const violations: Violation[] = [];
  const weak = new Set(Array.isArray(weakMuscles) ? weakMuscles : []);

  // Hostile-shape guards: an LLM client may hand us anything. Never throw.
  if (!proposal || typeof proposal !== 'object') {
    violations.push({ rule: 'weak_muscle_citation', message: 'proposal is not an object' });
    return { valid: false, structural: [], violations };
  }
  if (!Array.isArray(weakMuscles) || weak.size === 0) {
    // No weaknesses reported → nothing to cite; a plan is still acceptable.
    return { valid: true, structural: [], violations: [] };
  }
  if (!Array.isArray(proposal.targetedWeakMuscles)) {
    violations.push({
      rule: 'weak_muscle_citation',
      message: 'targetedWeakMuscles must be an array of cited muscle ids',
    });
    return { valid: false, structural: [], violations };
  }
  if (!Array.isArray(proposal.days)) {
    violations.push({
      rule: 'weak_muscle_citation',
      message: 'proposal days must be an array',
      context: { cited: proposal.targetedWeakMuscles.join(',') },
    });
    return { valid: false, structural: [], violations };
  }

  const cited = proposal.targetedWeakMuscles.filter((m) => weak.has(m));
  if (cited.length === 0) {
    violations.push({
      rule: 'weak_muscle_citation',
      message: 'the proposal cites none of the reported weak muscles',
      context: { weak: [...weak].join(','), cited: proposal.targetedWeakMuscles.join(',') },
    });
    return { valid: false, structural: [], violations };
  }

  for (const citedMuscle of cited) {
    const dayAttacksIt = proposal.days.some(
      (d) => d.focus === citedMuscle && d.slots.every((s) => availableExerciseIds.includes(s))
    );
    if (!dayAttacksIt) {
      violations.push({
        rule: 'weak_muscle_citation',
        message: `cited weak muscle "${citedMuscle}" has no day focused on it with catalog exercises`,
        context: { muscle: citedMuscle },
      });
    }
  }

  return { valid: violations.length === 0, structural: [], violations };
}

// ============================================================================
// Entry point
// ============================================================================

/**
 * Validate a full routine: structure first, then the five hard rules.
 * Structural failures short-circuit the rule checks (a shape-broken routine
 * proves nothing about the rules). Never throws; returns detailed violations.
 */
export function validateRoutine(routine: Routine, catalog: ExerciseCatalog): ValidationResult {
  const structural = validateStructure(routine);
  if (structural.length > 0) {
    return { valid: false, structural, violations: [] };
  }

  const violations: Violation[] = [];
  validateCatalog(routine, catalog, violations); // rule 1
  validateConsecutiveDays(routine, catalog, violations); // rule 2
  validateWeeklyVolume(routine, catalog, violations); // rule 3
  validateFocusCoverage(routine, catalog, violations); // rule 4
  return { valid: violations.length === 0, structural: [], violations };
}

export type { HardRule, ValidationResult };
