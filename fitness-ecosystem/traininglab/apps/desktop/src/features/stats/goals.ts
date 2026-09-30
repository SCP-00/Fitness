/**
 * Goal proximity — "how close is each family to YOUR target?"
 *
 * This is the second lens of the body map, and it answers a different question
 * than the training map. The training map (the default) paints **stimulus**:
 * how much work each family got, relative to your own best-covered family.
 * This lens paints **proximity**: how close the family is to a *goal*.
 *
 * Three goal sources, in priority order:
 *
 *   1. **measures** — the anthropometric map BodyLab exports
 *      (`muscleScores`: measured cm against McCallum/Venus-style ideals). The
 *      honest option, but it only exists when a BodyLab payload was imported.
 *   2. **targets** — per-family circumferences the user sets in Ajustes
 *      (Ajustes → Progreso → Objetivos). Completely theirs; the app does not
 *      know better.
 *   3. **golden** — the classic golden-ratio prescriptions
 *      (`GOLDEN_RATIO_TARGETS`), i.e. the Adonis/McCallum-class ideal scaled
 *      from **your own measured or declared waist**. No waist → no preset:
 *      the ratio system is waist-anchored and would be a fabrication.
 *
 * Whatever the source, the number is never a promise of growth — the map keeps
 * saying "estimación, no medición". Segments without a usable target stay
 * `null` and render as the map's no-data neutral.
 *
 * @module features/stats/goals
 */

import type { ImportPayload } from "../../lib/adapter";

/**
 * Per-family circumference targets in cm — structurally the app's
 * `TLSettingsData["goalTargets"]`. Kept structural so this module stays
 * testable without a settings record.
 */
export type TlGoalTargets = Partial<
  Record<
    | "chest"
    | "shoulders"
    | "biceps"
    | "triceps"
    | "forearms"
    | "lats"
    | "traps"
    | "rhomboids"
    | "core"
    | "glutes"
    | "quadriceps"
    | "hamstrings"
    | "calves",
    number
  >
>;

/** The 13 families the body map paints, as a runtime-friendly type. */
export type GoalFamily =
  | "chest"
  | "shoulders"
  | "triceps"
  | "biceps"
  | "forearms"
  | "lats"
  | "traps"
  | "rhomboids"
  | "core"
  | "glutes"
  | "quadriceps"
  | "hamstrings"
  | "calves";

/**
 * Segment ids BodyLab exports in `muscleScores`. They are measurement
 * circumferences, not families, and one segment can inform two families (the
 * arm measurement covers biceps and triceps alike).
 */
export type GoalSegment =
  | "chest"
  | "shoulders"
  | "biceps"
  | "forearms"
  | "waist"
  | "thigh"
  | "calf"
  | "neck";

/**
 * Family → the segment whose circumference best proxies it, plus the waist
 * ratio used by the golden-ratio preset (value = ideal circumference / waist).
 *
 * Sources of the ratios: the Adonis index (shoulders 1.618 × waist), the
 * McCallum/golden prescriptions the app already uses elsewhere
 * (chest ≈ 6.5 × wrist ≈ 1.4–1.5 × waist classically; arms ≈ 0.5 × chest;
 * calf ≈ arm; thigh ≈ 1.75 × knee ≈ 0.75 × waist) — kept in one table so a
 * future refinement is a one-line edit with its own citation, not a silent
 * magic number in the paint loop.
 */
export const FAMILY_SEGMENT: Record<
  GoalFamily,
  { segment: GoalSegment; ratio: number }
> = {
  chest: { segment: "chest", ratio: 1.4 },
  shoulders: { segment: "shoulders", ratio: 1.618 },
  biceps: { segment: "biceps", ratio: 0.7 },
  triceps: { segment: "biceps", ratio: 0.7 },
  forearms: { segment: "forearms", ratio: 0.48 },
  lats: { segment: "chest", ratio: 1.3 },
  traps: { segment: "neck", ratio: 0.72 },
  rhomboids: { segment: "chest", ratio: 1.3 },
  core: { segment: "waist", ratio: 1 },
  glutes: { segment: "waist", ratio: 1.25 },
  quadriceps: { segment: "thigh", ratio: 0.9 },
  hamstrings: { segment: "thigh", ratio: 0.9 },
  calves: { segment: "calf", ratio: 0.7 },
};

/**
 * The classical golden-ratio prescriptions (Adonis index + McCallum class):
 * each family's ideal circumference as a ratio of the **waist**. Requires a
 * measured or declared waist; without one the preset refuses to fire.
 */
export const GOLDEN_RATIO_TARGETS: Record<GoalFamily, number> =
  Object.fromEntries(
    Object.entries(FAMILY_SEGMENT).map(([family, spec]) => [
      family,
      spec.ratio,
    ]),
  ) as Record<GoalFamily, number>;

/** Everything the goal lens needs to produce its per-family proximity. */
export interface GoalInput {
  /** The imported BodyLab payload, when there is one. */
  payload: ImportPayload | null;
  /** User-set targets in cm (Ajustes → Objetivos). */
  targets: TlGoalTargets;
  /**
   * The waist in cm — measured (BodyLab) or declared (Ajustes). The anchor of
   * the golden-ratio preset; `null` disables the preset for every family.
   */
  waistCm: number | null;
  /** The goal source the user picked. */
  source: "measures" | "targets" | "golden";
}

export interface FamilyGoal {
  family: GoalFamily;
  /** 0–100 proximity to the goal (100 = at/above target). */
  index: number;
  /** The goal this index was computed against (cm, when known). */
  targetCm: number | null;
  /** The measurement that fed the comparison, when one exists (cm). */
  actualCm: number | null;
}

/** Clamp to the map's 0–100 index range. */
export function clampIndex(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Per-family goal proximity for the selected source.
 *
 * Coverage, honestly: the BodyLab assessment exports measured segments
 * (chest, biceps, forearms, thigh, calf, …) — a family whose proxy segment
 * was never measured stays `null` instead of pretending a number. User
 * targets are per-family by construction; the golden preset needs a waist.
 */
export function goalProximity(input: GoalInput): Map<GoalFamily, FamilyGoal> {
  const out = new Map<GoalFamily, FamilyGoal>();
  const waist =
    input.waistCm !== null && input.waistCm > 0 ? input.waistCm : null;

  // Latest measured value per segment, from the export's measurement list.
  // Read in every mode: the measurement is the body's state; what changes per
  // source is only *which target* it is compared against.
  const measured = new Map<string, number>();
  if (input.payload) {
    for (const m of input.payload.measurements) {
      if (!measured.has(m.type)) measured.set(m.type, m.value);
    }
  }

  // Segment score from the assessment (measures mode): 0–1, 1 = on target.
  const segmentScore = new Map<string, number>();
  if (input.source === "measures" && input.payload) {
    for (const row of input.payload.muscleScores ?? []) {
      if (!segmentScore.has(row.segment)) {
        segmentScore.set(row.segment, row.score);
      }
    }
  }

  for (const family of Object.keys(FAMILY_SEGMENT) as GoalFamily[]) {
    const { segment } = FAMILY_SEGMENT[family]!;
    let targetCm: number | null = null;
    let actualCm: number | null = null;

    if (input.source === "targets" && input.targets[family] != null) {
      targetCm = input.targets[family]!;
      actualCm = measured.get(segment) ?? null;
      // Without a measurement there is no distance to a target: null, not 0.
      if (actualCm === null) {
        out.set(family, {
          family,
          index: 0,
          targetCm: targetCm as number,
          actualCm: null,
        });
        continue;
      }
    } else if (input.source === "golden" && waist !== null) {
      targetCm = Math.round(GOLDEN_RATIO_TARGETS[family]! * waist * 10) / 10;
      actualCm = measured.get(segment) ?? null;
      if (actualCm === null) {
        out.set(family, {
          family,
          index: 0,
          targetCm: targetCm as number,
          actualCm: null,
        });
        continue;
      }
    } else if (input.source === "measures" && input.payload) {
      // BodyLab's own attenuation score, scaled straight to the map's 0–100.
      const score = segmentScore.get(segment);
      if (score === undefined) {
        continue; // never measured: the map renders the no-data neutral
      }
      out.set(family, {
        family,
        index: clampIndex(score * 100),
        targetCm: null,
        actualCm: measured.get(segment) ?? null,
      });
      continue;
    } else {
      continue; // source not usable (no payload / no waist / no targets yet)
    }

    // Linear proximity on the circumference: 100 at/above target, decaying
    // towards 0 at half the target. Linear beats ratio here because the map
    // is a *reading aid*: a family at 80 % of its target should sit visibly
    // closer to the top band than one at 50 %, and it does.
    const goal = targetCm as number; // narrowed by construction above
    out.set(family, {
      family,
      index: clampIndex(((actualCm as number) / goal) * 100),
      targetCm: goal,
      actualCm: actualCm as number,
    });
  }

  return out;
}

/**
 * The waist, from wherever it actually lives: the export's latest `waist`
 * measurement first, then the user's declared value. `null` = no anchor for
 * the golden preset.
 */
export function resolveWaistCm(
  payload: ImportPayload | null,
  declaredCm: number | null,
): number | null {
  if (declaredCm !== null && declaredCm > 0) return declaredCm;
  const measured = payload?.measurements.find((m) => m.type === "waist");
  return measured && measured.value > 0 ? measured.value : null;
}
