/**
 * Weekly set-volume target — the published dose–response, encoded once.
 *
 * WHY THIS FILE EXISTS (owner, 2026-10-05): Progreso showed *what* was trained
 * (kg, sets, an abstract exposure index) but never answered "is this enough?".
 * The only honest way to answer that is with the hypertrophy literature, so the
 * numbers live here with their citations instead of being retyped per screen.
 *
 * THE EVIDENCE (as of 2026-10-05):
 *
 *  1. **Baz-Valle et al. 2022**, *J Hum Kinet* 81:199–210 (PMID 35291645) —
 *     systematic review + meta-analysis of 7 RCTs in trained men 18–35 with
 *     ≥1 year of lifting and direct muscle-thickness measurements. A range of
 *     **12–20 hard sets per muscle group per week** is proposed as the optimum
 *     standard recommendation. Moderate (12–20) vs high (>20) volume did **not**
 *     differ significantly for quadriceps (p = 0.19) or biceps brachii
 *     (p = 0.59), but **high volume was better for triceps brachii
 *     (p = 0.01)** — which is why `triceps` gets its own, wider band here.
 *  2. **Pelland et al. 2025/2026**, *Resistance training dose-response
 *     meta-regressions*, 67 studies / 2 058 participants (doi 10.51224/SRXIV.460):
 *     more volume always won on hypertrophy (100 % posterior probability of a
 *     positive marginal slope) **with diminishing returns**, while the frequency
 *     effect on hypertrophy was compatible with being negligible. Diminishing
 *     returns are the reason this is a *band* and not "more is always better".
 *  3. **Schoenfeld et al. 2017**, *J Sports Sci* 35:1073–1082 — dose–response
 *     meta-analysis favouring >9 weekly sets per muscle group; the reason the
 *     band starts at 12 and not at 9.
 *
 * WHAT THIS IS **NOT**, and the UI must say so on screen:
 *
 *  * a medical recommendation — it is the published training-volume optimum for
 *    trained adults, nothing more;
 *  * a per-muscle prescription. The literature counts **sets per muscle group**,
 *    and this app's unit is the 13-family grouping (`muscleFamilyOf`), so one
 *    "family" here can be several muscles. The screen says "grupo", not
 *    "músculo";
 *  * a proof of hypertrophy. Sets logged are not sets completed, and the count
 *    here says nothing about proximity to failure or load.
 *  * a second, competing volume number next to the body map's exposure index.
 *    That index keeps its fractional credit (1 / 0.66 / 0.33) for the heat map;
 *    this file counts **direct sets only** (intensity 3), which is the literal
 *    reading of "sets per muscle group". Pelland's fractional method (indirect =
 *    0.5) is the strongest-supported alternative and is deliberately *not* mixed
 *    in: one screen, one definition, both cited.
 *
 * @module lib/volume-target
 */

import type { MuscleFamily } from "@fitness/bodylab-training";

/** Inclusive weekly band, in hard sets per muscle group. */
export interface VolumeBand {
  min: number;
  max: number;
}

/** The band every family uses unless a study says otherwise. */
export const DEFAULT_WEEKLY_BAND: VolumeBand = { min: 12, max: 20 };

/**
 * Triceps: the only family where the 2022 review found a significant
 * moderate-vs-high difference (p = 0.01 for >20 sets/week). Widening the band is
 * the finding; it is not a licence to bury the muscle in 40 isolation sets.
 */
export const TRICEPS_WEEKLY_BAND: VolumeBand = { min: 12, max: 24 };

/** Weekly target per family — the single source of truth for the screen. */
export const WEEKLY_SET_TARGETS: Record<MuscleFamily, VolumeBand> = {
  chest: DEFAULT_WEEKLY_BAND,
  shoulders: DEFAULT_WEEKLY_BAND,
  triceps: TRICEPS_WEEKLY_BAND,
  biceps: DEFAULT_WEEKLY_BAND,
  forearms: DEFAULT_WEEKLY_BAND,
  lats: DEFAULT_WEEKLY_BAND,
  traps: DEFAULT_WEEKLY_BAND,
  rhomboids: DEFAULT_WEEKLY_BAND,
  core: DEFAULT_WEEKLY_BAND,
  glutes: DEFAULT_WEEKLY_BAND,
  quadriceps: DEFAULT_WEEKLY_BAND,
  hamstrings: DEFAULT_WEEKLY_BAND,
  calves: DEFAULT_WEEKLY_BAND,
};

/** Family ids whose band is not the default one, for the on-screen footnote. */
export const WIDER_BAND_FAMILIES: MuscleFamily[] = ["triceps"];

/** Citations rendered in the UI (short form) and pinned in the tests. */
export const VOLUME_TARGET_SOURCE = {
  band: "Baz-Valle 2022 (J Hum Kinet 81:199–210, PMID 35291645)",
  diminishing: "Pelland 2025 (doi 10.51224/SRXIV.460)",
  floor: "Schoenfeld 2017 (J Sports Sci 35:1073–1082)",
} as const;

export type VolumeStatus = "below" | "in-range" | "above";

/** How a family's logged direct sets read against its published band. */
export interface VolumeReading {
  family: MuscleFamily;
  /** Hard sets where this family was the primary target, in the window. */
  directSets: number;
  min: number;
  max: number;
  status: VolumeStatus;
  /** Sets still missing to reach `min`; `0` when at or above it. */
  missing: number;
}

/**
 * Classify one family's count against its band.
 *
 * The band edges are inclusive, matching how the studies grouped their arms
 * ("12–20" and ">20"): 12 sets is in range, 20 is in range, 21 is above.
 */
export function readVolume(family: MuscleFamily, directSets: number): VolumeReading {
  const { min, max } = WEEKLY_SET_TARGETS[family];
  const sets = Number.isFinite(directSets) && directSets > 0 ? directSets : 0;
  const status: VolumeStatus =
    sets < min ? "below" : sets > max ? "above" : "in-range";
  return {
    family,
    directSets: sets,
    min,
    max,
    status,
    missing: Math.max(0, min - sets),
  };
}

/** Headline numbers for the card: how many families are inside their band. */
export interface VolumeSummary {
  rows: VolumeReading[];
  inRange: number;
  below: number;
  above: number;
  /** Families with at least one direct set in the window. */
  trained: number;
}

/**
 * Build the whole reading: `directSetsByFamily` is the window count (see
 * `features/stats/derive.ts`), rows come back biggest deficit first so the top
 * of the card is the actionable one.
 */
export function summariseVolume(
  directSetsByFamily: Map<MuscleFamily, number>,
): VolumeSummary {
  const rows = [...directSetsByFamily.entries()]
    .filter(([, sets]) => sets > 0)
    .map(([family, sets]) => readVolume(family, sets))
    .sort(
      (a, b) =>
        b.missing - a.missing ||
        a.directSets - b.directSets ||
        a.family.localeCompare(b.family),
    );

  return {
    rows,
    inRange: rows.filter((r) => r.status === "in-range").length,
    below: rows.filter((r) => r.status === "below").length,
    above: rows.filter((r) => r.status === "above").length,
    trained: rows.length,
  };
}