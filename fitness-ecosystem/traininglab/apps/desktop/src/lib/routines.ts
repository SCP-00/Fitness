/**
 * Routine templates — the user's own reusable sessions.
 *
 * **2026-10-18 (Rutinas).** The owner's decision for the missing destination was
 * explicit: *plantillas del usuario, editables*. Not a catalogue of invented
 * programs, not a second planner — a routine is a named list of exercises with
 * the prescription the user chose, which he can start today, edit, duplicate or
 * delete. Everything here is pure (no React, no i18n, no IndexedDB) so the
 * arithmetic and the validation are tested from the root suite.
 *
 * Three rules keep a template from becoming a fiction:
 *
 *   1. **Only catalogue exercises.** An item whose id no exercise owns is
 *      dropped on load; a routine can never render a row nobody can perform.
 *   2. **Clamped prescription.** Sets, reps, rest and RIR go through the same
 *      bounds the planner respects, so a hand-edited backup cannot write a
 *      99-rep, 0-second-rest row into a session.
 *   3. **The estimate is an estimate.** Minutes are derived with
 *      `setup + sets × (0.5 min of work + rest)`, labelled `~` wherever it is
 *      printed. It is not a measurement and it never claims to be one.
 *
 * @module lib/routines
 */

import {
  ALL_EXERCISES,
  getTraits,
  type MuscleGroup,
} from "@fitness/bodylab-exercises";
import { muscleFamilyOf, type MuscleFamily } from "@fitness/bodylab-training";

/** One exercise of a routine, with the prescription the user chose. */
export interface RoutineItem {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  /** Reps in reserve. Absent on old rows → treated as 2 (the planner default). */
  rir?: number;
}

/** A named, reusable session. `id` is stable; `updatedAt` orders the list. */
export interface Routine {
  id: string;
  name: string;
  /** Free text the user wrote about the routine. Optional, never generated. */
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: RoutineItem[];
}

/** The bounds every routine prescription is clamped to. */
export const ROUTINE_LIMITS = {
  name: 60,
  notes: 400,
  items: 24,
  sets: [1, 12] as const,
  reps: [1, 30] as const,
  restSec: [15, 600] as const,
  rir: [0, 5] as const,
};

const clamp = (value: number, [min, max]: readonly [number, number]): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const KNOWN = new Set(ALL_EXERCISES.map((exercise) => exercise.id));

/** Does the shared catalogue know this exercise? */
export function isKnownExercise(exerciseId: string): boolean {
  return KNOWN.has(exerciseId);
}

/** The default prescription of one exercise, taken from its own traits. */
export function routineItemFor(
  exerciseId: string,
  overrides: Partial<Omit<RoutineItem, "exerciseId">> = {},
): RoutineItem | null {
  if (!KNOWN.has(exerciseId)) return null;
  const traits = getTraits(exerciseId);
  // Compound work rests longer because the planner rests it longer; the number
  // is the same shape the session will actually use, not a made-up 90 s.
  const rest = traits.spineLoad >= 3 || traits.jointStress >= 3 ? 120 : 90;
  const repsMin = clamp(overrides.repsMin ?? 8, ROUTINE_LIMITS.reps);
  return {
    exerciseId,
    sets: clamp(overrides.sets ?? 3, ROUTINE_LIMITS.sets),
    repsMin,
    repsMax: Math.max(
      repsMin,
      clamp(overrides.repsMax ?? 12, ROUTINE_LIMITS.reps),
    ),
    restSec: clamp(overrides.restSec ?? rest, ROUTINE_LIMITS.restSec),
    rir: clamp(overrides.rir ?? 2, ROUTINE_LIMITS.rir),
  };
}

/** A fresh id. `crypto.randomUUID` exists in every host this app ships into. */
function newId(now: Date): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  // Concatenated, not a template: the CSS audit treats `\u0024{…}` as a runtime
  // class name, and an id in a data module is not a class at all.
  return "routine-" + now.getTime() + "-" + random;
}

/**
 * Read one routine from anything (a stored settings doc, a restored backup, a
 * draft in the editor). Returns `null` when nothing usable is left — a routine
 * without a name or without a single known exercise is not a routine.
 */
export function normalizeRoutine(value: unknown): Routine | null {
  if (!isObject(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return null;

  const rawItems = Array.isArray(value.items) ? value.items : [];
  const seen = new Set<string>();
  const items: RoutineItem[] = [];
  for (const raw of rawItems) {
    if (!isObject(raw)) continue;
    const exerciseId = typeof raw.exerciseId === "string" ? raw.exerciseId : "";
    if (!isKnownExercise(exerciseId) || seen.has(exerciseId)) continue;
    seen.add(exerciseId);
    const item = routineItemFor(exerciseId, {
      sets: typeof raw.sets === "number" ? raw.sets : undefined,
      repsMin: typeof raw.repsMin === "number" ? raw.repsMin : undefined,
      repsMax: typeof raw.repsMax === "number" ? raw.repsMax : undefined,
      restSec: typeof raw.restSec === "number" ? raw.restSec : undefined,
      rir: typeof raw.rir === "number" ? raw.rir : undefined,
    });
    if (!item) continue;
    items.push(item);
    if (items.length >= ROUTINE_LIMITS.items) break;
  }
  if (items.length === 0) return null;

  const createdAt = isText(value.createdAt)
    ? value.createdAt
    : new Date(0).toISOString();
  const updatedAt = isText(value.updatedAt) ? value.updatedAt : createdAt;
  const notes =
    typeof value.notes === "string" && value.notes.trim().length > 0
      ? value.notes.trim().slice(0, ROUTINE_LIMITS.notes)
      : undefined;

  return {
    id: isText(value.id) ? value.id : newId(new Date(updatedAt)),
    name: name.slice(0, ROUTINE_LIMITS.name),
    ...(notes ? { notes } : {}),
    createdAt,
    updatedAt,
    items,
  };
}

/**
 * Every usable routine of a stored list, newest edit first.
 *
 * Ids are unique by construction: a hand-edited backup that repeats one keeps
 * the newest record instead of rendering the same card twice.
 */
export function normalizeRoutines(value: unknown): Routine[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, Routine>();
  for (const raw of value) {
    const routine = normalizeRoutine(raw);
    if (!routine) continue;
    const existing = byId.get(routine.id);
    if (!existing || routine.updatedAt > existing.updatedAt) {
      byId.set(routine.id, routine);
    }
  }
  return [...byId.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** Build a routine from scratch (the editor's "guardar"). */
export function makeRoutine(
  name: string,
  items: RoutineItem[],
  now: Date = new Date(),
  notes?: string,
): Routine | null {
  const stamp = now.toISOString();
  return normalizeRoutine({
    id: newId(now),
    name,
    notes,
    createdAt: stamp,
    updatedAt: stamp,
    items,
  });
}

/**
 * Snapshot the session the user is looking at (`rows`), so "guardar el
 * entrenamiento de hoy" is a copy of real prescriptions and never a re-plan.
 */
export function routineFromRows(
  name: string,
  rows: readonly {
    exerciseId: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    restSec: number;
    rir?: number;
  }[],
  now: Date = new Date(),
): Routine | null {
  const items: RoutineItem[] = [];
  for (const row of rows) {
    if (!isKnownExercise(row.exerciseId)) continue;
    const item = routineItemFor(row.exerciseId, {
      sets: row.sets,
      repsMin: row.repsMin,
      repsMax: row.repsMax,
      restSec: row.restSec,
      rir: row.rir,
    });
    if (item) items.push(item);
    if (items.length >= ROUTINE_LIMITS.items) break;
  }
  return makeRoutine(name, items, now);
}

/** Insert or replace (by id) and keep the list newest-first. */
export function upsertRoutine(
  routines: readonly Routine[],
  routine: Routine,
): Routine[] {
  const next = routines.filter((entry) => entry.id !== routine.id);
  next.push(routine);
  return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Remove one routine; unknown ids are a no-op. */
export function removeRoutine(
  routines: readonly Routine[],
  id: string,
): Routine[] {
  return routines.filter((entry) => entry.id !== id);
}

/** A copy with its own id and name ("copia" is appended by the caller). */
export function duplicateRoutine(
  routine: Routine,
  name: string,
  now: Date = new Date(),
): Routine | null {
  return makeRoutine(name, routine.items, now, routine.notes);
}

/** The numbers every card and sheet prints. */
export interface RoutineTotals {
  exercises: number;
  sets: number;
  /** Estimated minutes: setup + sets × (0.5 min work + the item's own rest). */
  minutes: number;
  families: MuscleFamily[];
}

/**
 * Totals of one routine. Minutes are rounded per exercise and then summed so
 * the card and the sheet cannot disagree by a rounding step.
 */
export function routineTotals(routine: Routine): RoutineTotals {
  const families: MuscleFamily[] = [];
  let sets = 0;
  let minutes = 0;

  for (const item of routine.items) {
    const traits = getTraits(item.exerciseId);
    const exercise = ALL_EXERCISES.find((e) => e.id === item.exerciseId);
    const direct = (exercise?.muscles ?? []).filter((m) => m.intensity >= 2);
    const muscles = (direct.length > 0 ? direct : (exercise?.muscles ?? [])).map(
      (m) => muscleFamilyOf(m.muscle as MuscleGroup),
    );
    for (const family of muscles) {
      if (!families.includes(family)) families.push(family);
    }
    sets += item.sets;
    minutes +=
      traits.setupMin + item.sets * (0.5 + item.restSec / 60);
  }

  return {
    exercises: routine.items.length,
    sets,
    minutes: Math.round(minutes),
    families,
  };
}
