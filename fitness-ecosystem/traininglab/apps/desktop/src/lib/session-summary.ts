/**
 * What a closed session adds up to.
 *
 * The post-session page (`screens/SessionSummaryScreen`) must not recompute
 * numbers from React state: the screen only renders what this function derives
 * from the session and its sets. That keeps the summary, the history and the
 * MCP reads on one definition.
 *
 * Rules, all inherited from the app's existing contracts:
 *
 *   * **warm-ups are logged but are not training volume** — they are counted
 *     separately and never touch tonnage or the best set;
 *   * **no invented numbers** — a bodyweight set has `weight: null`, so it adds
 *     zero volume and no "best weight"; a timed hold has no reps either;
 *   * **a duration is only reported when it is trustworthy** — an imported
 *     date-only sheet leaves `completedAt` ~= `startedAt`, and printing
 *     "1 min" there would be a made-up duration (same `MINUTES_TRUSTWORTHY`
 *     rule the Hoy strip already uses);
 *   * **the session's own order** — exercises are listed in the order the
 *     session stored its set ids, not in whatever order the array happens to
 *     have.
 *
 * @module lib/session-summary
 */

import { localDayKey } from "./day";
import { markerOf } from "./effort";
import type { TLSet, TLSession } from "./types";

/** Below this many minutes, a session span says nothing about its length. */
const MINUTES_TRUSTWORTHY = 5;

export interface SummaryExercise {
  exerciseId: string;
  /** Working sets only. */
  sets: number;
  /** Warm-up ramp sets, listed but never counted as work. */
  warmupSets: number;
  /**
   * Every set of this exercise in the session's own order, warm-ups included.
   * The aggregate fields above stay the volume/best-set contract; this is the
   * detail the close-of-session screen lists and the history can audit.
   */
  entries: SummarySet[];
  /** Reps over working sets (holds contribute their set, not reps). */
  totalReps: number;
  /** weight × reps over working sets, rounded to 0.1 kg. */
  volumeKg: number;
  /** Heaviest working load, `null` for bodyweight/band work. */
  topWeightKg: number | null;
  /** Reps at `topWeightKg`, `null` when the set carried no reps. */
  topReps: number | null;
}

/** One logged set, rendered under its exercise in the summary. */
export interface SummarySet {
  id: string;
  warmup: boolean;
  /** `null` for bodyweight/band work; never invented as zero. */
  weightKg: number | null;
  reps: number | null;
  /** A timed hold's seconds when the source recorded a hold instead of reps. */
  durationSec: number | null;
  /**
   * The app's 1–5 effort field (`TLSet.rpe`), when recorded. It is kept under
   * its own name instead of being called RIR: the training plan prescribes RIR,
   * but the logger stores this 1–5 effort value and the two are not the same
   * scale. `null` means the set has no recorded effort, not an effort of zero.
   */
  effort: number | null;
  /** `D` near failure / `F` to failure, including legacy note-only markers. */
  marker: "D" | "F" | null;
}

export interface SessionSummary {
  id: string;
  /** Local calendar day of the close, `YYYY-MM-DD`. */
  day: string;
  /** The name the source gave the session, when it had one. */
  title: string | null;
  /** Whole minutes, `null` when the span is too short to be real. */
  durationMin: number | null;
  workingSets: number;
  warmupSets: number;
  exercises: SummaryExercise[];
  /** weight × reps over working sets, rounded to 0.1 kg. */
  volumeKg: number;
  /** Working sets marked `D` (near failure) or `F` (failure). */
  marks: number;
}

/** Round to one decimal without carrying floating-point noise into the UI. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Derive the close of `session` from the sets it stored.
 *
 * Returns `null` when none of the session's ids is present — an imported or
 * partially deleted record with no sets is not a zero-volume session, it is a
 * session whose numbers cannot be stated.
 */
export function summariseSession(
  session: TLSession,
  sets: TLSet[],
): SessionSummary | null {
  const ids = new Set(session.setIds);
  const mine = sets
    .filter((set) => ids.has(set.id))
    .sort(
      (a, b) => session.setIds.indexOf(a.id) - session.setIds.indexOf(b.id),
    );
  if (mine.length === 0) return null;

  const byExercise = new Map<string, SummaryExercise>();
  let workingSets = 0;
  let warmupSets = 0;
  let volumeKg = 0;
  let marks = 0;

  for (const set of mine) {
    let row = byExercise.get(set.exerciseId);
    if (!row) {
      row = {
        exerciseId: set.exerciseId,
        sets: 0,
        warmupSets: 0,
        entries: [],
        totalReps: 0,
        volumeKg: 0,
        topWeightKg: null,
        topReps: null,
      };
      byExercise.set(set.exerciseId, row);
    }

    const marker = markerOf(set);
    row.entries.push({
      id: set.id,
      warmup: set.warmup === true,
      weightKg: set.weight ?? null,
      reps: set.reps ?? null,
      durationSec: set.durationSec ?? null,
      effort:
        typeof set.rpe === "number" && Number.isFinite(set.rpe)
          ? set.rpe
          : null,
      marker: marker === "D" || marker === "F" ? marker : null,
    });

    if (set.warmup === true) {
      row.warmupSets += 1;
      warmupSets += 1;
      continue;
    }

    row.sets += 1;
    workingSets += 1;

    const reps = set.reps ?? 0;
    if (reps > 0) row.totalReps += reps;

    const weight = set.weight;
    if (weight !== null && weight > 0) {
      const contribution = weight * Math.max(0, reps);
      row.volumeKg += contribution;
      volumeKg += contribution;

      // Heaviest load wins; at an equal load the set that actually carries reps
      // wins, so a 0-rep artefact row never becomes the session's best set.
      const heavier = row.topWeightKg === null || weight > row.topWeightKg;
      const sameLoadWithReps =
        row.topWeightKg === weight && reps > (row.topReps ?? -1);
      if (heavier || sameLoadWithReps) {
        row.topWeightKg = weight;
        row.topReps = reps > 0 ? reps : null;
      }
    }

    if (set.effort === "D" || set.effort === "F") marks += 1;
  }

  const start = Date.parse(session.startedAt);
  const end = session.completedAt ? Date.parse(session.completedAt) : NaN;
  const spanMin =
    Number.isFinite(start) && Number.isFinite(end) && end >= start
      ? Math.round((end - start) / 60_000)
      : 0;

  return {
    id: session.id,
    day: localDayKey(session.completedAt ?? session.startedAt),
    title: session.title ?? null,
    durationMin: spanMin >= MINUTES_TRUSTWORTHY ? spanMin : null,
    workingSets,
    warmupSets,
    exercises: [...byExercise.values()].map((row) => ({
      ...row,
      volumeKg: round1(row.volumeKg),
    })),
    volumeKg: round1(volumeKg),
    marks,
  };
}
