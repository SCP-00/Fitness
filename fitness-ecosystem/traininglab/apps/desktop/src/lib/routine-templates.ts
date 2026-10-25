/**
 * Weekly templates — three splits the owner asked for (`PPL`, `Upper/Lower`,
 * `Full body`), built from the exercises the user can actually perform.
 *
 * **2026-10-23 (F2, «plantillas»).** The brief's rule is explicit: templates are
 * *editable routines the user confirms*, and applying one must never overwrite
 * a routine or a session that is already saved. This module therefore only
 * **adds** routines; it has no verb that edits or deletes anything.
 *
 * Two decisions keep a template from becoming a fiction:
 *
 *   1. **It is built from `usable`, not from the catalogue.** The `usable` list
 *      is the planner's own gear-filtered set, so a PPL for a home gym with
 *      dumbbells and a bench is a real PPL, not a barbell program with rows
 *      nobody can perform. A slot with no compatible exercise is **reported**
 *      (`gaps`), never filled with an invented id.
 *   2. **The prescription is the routine's own.** Sets, reps, rest and RIR go
 *      through `routineItemFor`, which clamps to the same bounds the planner
 *      respects. The template chooses the *slot*; the user's editor still owns
 *      every number afterwards.
 *
 * The module is pure (no React, no i18n, no IndexedDB): names arrive as a
 * lookup callback so the same data can be tested from the root suite and
 * printed in either language.
 *
 * @module lib/routine-templates
 */

import type { MovementPattern } from "@fitness/bodylab-exercises";
import type { MuscleFamily } from "@fitness/bodylab-training";
import { makeRoutine, routineItemFor, type Routine } from "./routines";

/** What one template slot asks the catalogue for. */
interface TemplateSlot {
  family: MuscleFamily;
  /** Patterns that honestly fill the slot, best first. Empty = any pattern. */
  patterns: MovementPattern[];
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
}

/** One session of a split. `nameKey` is an i18n key, never a printed string. */
export interface TemplateDay {
  /** Stable within its template; also the i18n key of the routine's name. */
  nameKey: string;
  slots: TemplateSlot[];
}

/** A weekly split offered on the Rutinas shelf. */
export interface RoutineTemplate {
  id: "ppl" | "upper_lower" | "full_body";
  nameKey: string;
  blurbKey: string;
  daysPerWeek: number;
  days: TemplateDay[];
}

/**
 * The three splits. Seven sessions in total; every one is a normal routine the
 * user can edit, duplicate, start today or delete afterwards.
 */
export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "ppl",
    nameKey: "ru.tpl.ppl.name",
    blurbKey: "ru.tpl.ppl.blurb",
    daysPerWeek: 3,
    days: [
      {
        nameKey: "ru.tpl.day.push",
        slots: [
          {
            family: "chest",
            patterns: ["horizontal_push"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "shoulders",
            patterns: ["vertical_push", "shoulder_abduction"],
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "chest",
            patterns: ["horizontal_push"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "triceps",
            patterns: ["elbow_extension"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "shoulders",
            patterns: ["shoulder_abduction"],
            sets: 3,
            repsMin: 12,
            repsMax: 20,
            rir: 1,
          },
          {
            family: "core",
            patterns: ["core_anti_extension", "core_flexion"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 0,
          },
        ],
      },
      {
        nameKey: "ru.tpl.day.pull",
        slots: [
          {
            family: "lats",
            patterns: ["vertical_pull"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "rhomboids",
            patterns: ["horizontal_pull"],
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "lats",
            patterns: ["horizontal_pull", "vertical_pull"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "biceps",
            patterns: ["elbow_flexion"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "traps",
            patterns: ["carry", "horizontal_pull", "shoulder_abduction"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "core",
            patterns: ["core_anti_lateral", "core_anti_extension"],
            sets: 3,
            repsMin: 10,
            repsMax: 20,
            rir: 0,
          },
        ],
      },
      {
        nameKey: "ru.tpl.day.legs",
        slots: [
          {
            family: "quadriceps",
            patterns: ["squat", "lunge"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "hamstrings",
            patterns: ["hinge", "knee_flexion"],
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "glutes",
            patterns: ["hip_extension", "hip_abduction"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "quadriceps",
            patterns: ["knee_extension", "lunge", "squat"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "calves",
            patterns: ["plantar_flexion"],
            sets: 4,
            repsMin: 12,
            repsMax: 20,
            rir: 1,
          },
          {
            family: "core",
            patterns: ["core_flexion", "core_anti_extension"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 0,
          },
        ],
      },
    ],
  },
  {
    id: "upper_lower",
    nameKey: "ru.tpl.upper_lower.name",
    blurbKey: "ru.tpl.upper_lower.blurb",
    daysPerWeek: 2,
    days: [
      {
        nameKey: "ru.tpl.day.upper",
        slots: [
          {
            family: "chest",
            patterns: ["horizontal_push"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "lats",
            patterns: ["vertical_pull"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "shoulders",
            patterns: ["vertical_push"],
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "rhomboids",
            patterns: ["horizontal_pull"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "biceps",
            patterns: ["elbow_flexion"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "triceps",
            patterns: ["elbow_extension"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
        ],
      },
      {
        nameKey: "ru.tpl.day.lower",
        slots: [
          {
            family: "quadriceps",
            patterns: ["squat", "lunge"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "hamstrings",
            patterns: ["hinge", "knee_flexion"],
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "glutes",
            patterns: ["hip_extension", "hip_abduction"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "quadriceps",
            patterns: ["knee_extension", "lunge"],
            sets: 3,
            repsMin: 12,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "calves",
            patterns: ["plantar_flexion"],
            sets: 4,
            repsMin: 12,
            repsMax: 20,
            rir: 1,
          },
          {
            family: "core",
            patterns: ["core_anti_extension", "core_flexion"],
            sets: 3,
            repsMin: 10,
            repsMax: 20,
            rir: 0,
          },
        ],
      },
    ],
  },
  {
    id: "full_body",
    nameKey: "ru.tpl.full.name",
    blurbKey: "ru.tpl.full.blurb",
    daysPerWeek: 2,
    days: [
      {
        nameKey: "ru.tpl.day.fullA",
        slots: [
          {
            family: "quadriceps",
            patterns: ["squat", "lunge"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "chest",
            patterns: ["horizontal_push"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "lats",
            patterns: ["vertical_pull", "horizontal_pull"],
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "hamstrings",
            patterns: ["hinge"],
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "shoulders",
            patterns: ["vertical_push", "shoulder_abduction"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "core",
            patterns: ["core_anti_extension", "core_flexion"],
            sets: 3,
            repsMin: 10,
            repsMax: 20,
            rir: 0,
          },
        ],
      },
      {
        nameKey: "ru.tpl.day.fullB",
        slots: [
          {
            family: "hamstrings",
            patterns: ["hinge", "knee_flexion"],
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            rir: 2,
          },
          {
            family: "shoulders",
            patterns: ["vertical_push"],
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "rhomboids",
            patterns: ["horizontal_pull"],
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            rir: 2,
          },
          {
            family: "quadriceps",
            patterns: ["knee_extension", "lunge", "squat"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "triceps",
            patterns: ["elbow_extension"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 1,
          },
          {
            family: "core",
            patterns: ["core_rotation", "core_anti_lateral"],
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            rir: 0,
          },
        ],
      },
    ],
  },
];

/** The minimum a catalogue entry must expose to fill a slot. */
export interface TemplateCandidate {
  exercise: { id: string };
  traits: { pattern: MovementPattern; loadType: string };
  families: MuscleFamily[];
  primary: MuscleFamily;
}

/** A slot no usable exercise could fill — shown to the user, never hidden. */
export interface TemplateGap {
  dayNameKey: string;
  family: MuscleFamily;
}

/** What the preview sheet prints and what the confirm button writes. */
export interface TemplateBuild {
  routines: Routine[];
  gaps: TemplateGap[];
  /** Candidates that were tried and rejected because of a name collision. */
  skippedDays: string[];
}

/** Look up a template by id; unknown ids are `null`, never a guess. */
export function templateById(id: string): RoutineTemplate | null {
  return ROUTINE_TEMPLATES.find((template) => template.id === id) ?? null;
}

/**
 * Score one candidate for a slot. Higher is better and fully deterministic:
 *
 *   * the family must be one of the exercise's **direct** muscles;
 *   * an explicit pattern match beats a mere family match, and the slot's
 *     pattern order is the preference order (index 0 is the best);
 *   * an **anchor** slot (4+ sets) prefers a loadable movement over a
 *     bodyweight variation when both are available: a template exists to be
 *     progressed, and a barbell has a longer runway than an archer push-up.
 *     This is a stated rule, not a hidden one — the preview shows the pick and
 *     the user can edit it in one tap;
 *   * the family being the exercise's primary one is the tie-breaker.
 *
 * Returns `null` when the candidate is not a legal fill.
 */
function scoreCandidate(
  slot: TemplateSlot,
  candidate: TemplateCandidate,
): number | null {
  if (!candidate.families.includes(slot.family)) return null;
  const patternIndex = slot.patterns.indexOf(candidate.traits.pattern);
  const patternScore =
    slot.patterns.length === 0
      ? 40
      : patternIndex >= 0
        ? 100 - patternIndex * 10
        : 0;
  // A family match without the requested pattern is a weaker but honest fill
  // (the user's gear may simply lack that pattern); an exact pattern match
  // without a primary family is also honest. Both are kept, ranked below the
  // exact match.
  const primaryScore = candidate.primary === slot.family ? 30 : 0;
  const anchor = slot.sets >= 4;
  const loadableScore =
    anchor && candidate.traits.loadType !== "bodyweight" ? 40 : 0;
  const score = patternScore + primaryScore + loadableScore;
  return score > 0 ? score : 1;
}

/** A name that does not collide with the routines the user already has. */
function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let n = 2;
  while (taken.has(`${base} · ${n}`)) n += 1;
  const name = `${base} · ${n}`;
  taken.add(name);
  return name;
}

/**
 * Build the routines of one template against the user's usable catalogue.
 *
 * * `name(key)` resolves the i18n labels (day names only; the module stays
 *   i18n-free).
 * * `existingNames` avoids creating two routines with the same name — the new
 *   one gets `· 2`, `· 3`, … and the old one is untouched.
 * * `now` is injectable so ids and timestamps are deterministic in tests.
 *
 * Every returned routine is a normal `Routine`: the caller saves each one with
 * the store's own `saveRoutine`, which is the only writer of `settings.routines`.
 */
export function buildTemplateRoutines(
  template: RoutineTemplate,
  candidates: readonly TemplateCandidate[],
  name: (key: string) => string,
  existingNames: readonly string[] = [],
  now: Date = new Date(),
): TemplateBuild {
  const taken = new Set(existingNames);
  const routines: Routine[] = [];
  const gaps: TemplateGap[] = [];
  const skippedDays: string[] = [];

  for (const day of template.days) {
    const dayName = name(day.nameKey);
    const used = new Set<string>();
    const items = [];

    for (const slot of day.slots) {
      let best: { id: string; score: number } | null = null;
      for (const candidate of candidates) {
        const id = candidate.exercise.id;
        if (used.has(id)) continue;
        const score = scoreCandidate(slot, candidate);
        if (score === null) continue;
        if (
          best === null ||
          score > best.score ||
          (score === best.score && id < best.id)
        ) {
          best = { id, score };
        }
      }
      if (!best) {
        gaps.push({ dayNameKey: day.nameKey, family: slot.family });
        continue;
      }
      used.add(best.id);
      const item = routineItemFor(best.id, {
        sets: slot.sets,
        repsMin: slot.repsMin,
        repsMax: slot.repsMax,
        rir: slot.rir,
      });
      // A known id always yields an item; the guard keeps the type honest and
      // makes a catalogue regression visible as a gap instead of a crash.
      if (item) items.push(item);
      else gaps.push({ dayNameKey: day.nameKey, family: slot.family });
    }

    if (items.length === 0) {
      skippedDays.push(day.nameKey);
      continue;
    }

    const routine = makeRoutine(uniqueName(dayName, taken), items, now);
    if (routine) routines.push(routine);
    else skippedDays.push(day.nameKey);
  }

  return { routines, gaps, skippedDays };
}
