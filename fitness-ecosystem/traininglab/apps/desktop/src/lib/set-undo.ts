/**
 * Undo for a single logged set (2026-10-21).
 *
 * A set is the smallest thing this app stores and the only thing it cannot
 * regenerate: a `100 kg × 5` that was logged or imported exists nowhere else.
 * Both ways of destroying one therefore leave an undo entry —
 *
 *   * **deleting it**, and
 *   * **rewriting it** in the exercise's history, where a mistyped `10` for
 *     `100` overwrites the record and the old numbers would otherwise be gone;
 *
 * — and this module is what that entry needs: the field-level diff, so saving
 * untouched numbers does not claim to be an edit, and one line that says
 * exactly what comes back. It renders the same wording the history column uses
 * (`ex.history.setLoad` / `setTime` / `setBodyweight`), so a set is described
 * identically before and after the undo.
 *
 * Pure and free of React, so the root suite tests it directly.
 *
 * @module lib/set-undo
 */

import { getLanguage, t, tInterp } from "./i18n";
import type { TLSet } from "./types";

/** How long an undo entry stays reachable, in ms. */
export const SET_UNDO_MS = 20_000;

/** What editing a set actually touched, field by field. */
export interface SetEditDiff {
  /** False when the save wrote back the numbers that were already there. */
  changed: boolean;
  weight: { from: number | null; to: number | null } | null;
  reps: { from: number | null; to: number | null } | null;
  /** `null` means the mark was cleared (a plain working set). */
  effort: { from: "D" | "F" | null; to: "D" | "F" | null } | null;
}

/**
 * The change that can be reversed: the set that went away, or the two versions
 * of the set that was rewritten.
 */
export type SetUndoEntry =
  | { kind: "remove"; set: TLSet }
  | { kind: "edit"; before: TLSet; after: TLSet };

/**
 * Compare a stored set with its rewritten version.
 *
 * Only the three fields the history column edits are compared — a set's id,
 * exercise and timestamp are identity, not content, and `warmup` / `durationSec`
 * are never written by that form. Comparing exactly what can change is what
 * lets a no-op save be a no-op.
 */
export function setEditDiff(before: TLSet, after: TLSet): SetEditDiff {
  const weight =
    before.weight === after.weight
      ? null
      : { from: before.weight, to: after.weight };
  const reps =
    before.reps === after.reps ? null : { from: before.reps, to: after.reps };
  const beforeEffort = before.effort ?? null;
  const afterEffort = after.effort ?? null;
  const effort =
    beforeEffort === afterEffort
      ? null
      : { from: beforeEffort, to: afterEffort };

  return {
    changed: weight !== null || reps !== null || effort !== null,
    weight,
    reps,
    effort,
  };
}

/** `1 234,5` in Spanish, `1,234.5` in English — the user's own separators. */
function number(n: number): string {
  return new Intl.NumberFormat(getLanguage() === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * One set in words: `100 kg × 5`, `45 s`, `8 reps`, plus its warm-up tag and
 * its `D`/`F` mark when it carries them.
 *
 * A bodyweight set keeps its repetitions because that is what it was — calling
 * `8 reps` of dips just "bodyweight" would hide the only number it has.
 */
export function describeSet(set: TLSet): string {
  let text: string;
  if (set.weight !== null) {
    text = tInterp("ex.history.setLoad", {
      kg: `${number(set.weight)} kg`,
      // A loaded set with no reps is an import defect, not a hold: show the load
      // and let the reps read as 0 rather than inventing a duration.
      reps: set.reps ?? 0,
    });
  } else if (set.durationSec !== undefined && set.durationSec !== null) {
    text = tInterp("ex.history.setTime", { sec: set.durationSec });
  } else if (set.reps !== null) {
    text = tInterp("log.repsOnly", { n: set.reps });
  } else {
    text = t("ex.history.setBodyweight");
  }
  if (set.warmup) text += ` · ${t("ex.history.warmup")}`;
  if (set.effort) text += ` · ${set.effort}`;
  return text;
}

/**
 * The undo bar's detail line: which exercise, and what it costs to undo.
 *
 * `Sentadilla · 100 kg × 5` for a deletion, `Sentadilla · 100 kg × 5 → 10 kg × 5`
 * for an edit — the arrow reads in both languages and needs no translation.
 */
export function setUndoLine(entry: SetUndoEntry, exerciseName: string): string {
  if (entry.kind === "remove") {
    return `${exerciseName} · ${describeSet(entry.set)}`;
  }
  return `${exerciseName} · ${describeSet(entry.before)} → ${describeSet(entry.after)}`;
}

/** The exercise the undo entry belongs to (both kinds carry it). */
export function setUndoExerciseId(entry: SetUndoEntry): string {
  return entry.kind === "remove"
    ? entry.set.exerciseId
    : entry.before.exerciseId;
}

/** The version of the set that undo writes back. */
export function setUndoRestore(entry: SetUndoEntry): TLSet {
  return entry.kind === "remove" ? entry.set : entry.before;
}
