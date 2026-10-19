/**
 * Effort markers — `W`, `D`, `F`, and what they mean for the maths.
 *
 * The owner logs his sets with the badges his gym app draws: `W` warm-up, `D`
 * near failure, `F` to failure (owner-confirmed 2026-10-09; the OCR importer's
 * own note had guessed `D` = drop set, which is why this file exists — the
 * meaning changes what a set costs and it now lives in one place, declared).
 *
 * Two facts shaped the design:
 *
 *   1. **`W` is already modelled**: it is `TLSet.warmup`, excluded from volume,
 *      PRs and the weekly ledger, and repeated here only as `markerOf`'s label.
 *   2. **`D` and `F` used to be free text in `notes`** (`"D"`, `"F"`), because
 *      `TLSet` had no field for them — so the models could not read them and
 *      every consumer would have had to re-parse a note. They are now a
 *      structured `TLSet.effort`, with the note reading kept as a fallback so
 *      logs written before this change still work.
 *
 * Pure data + pure functions: no React, no I/O.
 *
 * @module lib/effort
 */

/** A set taken close to, or at, muscular failure. */
export type EffortMarker = "D" | "F";

/** Every badge a logged set can carry: `W` warm-up, `D` near failure, `F` failure. */
export type SetMarker = "W" | EffortMarker;

export interface EffortMeaning {
  /** Short label — what a chip or a history badge reads. */
  label: { en: string; es: string };
  /** One line saying what the marker means, for a tooltip. */
  detail: { en: string; es: string };
  /**
   * Does the set cost what a normal working set costs, or more? `hard` sets
   * mark the whole family's session as a real one for the recovery window —
   * failing at 3 reps on chin-ups is not the same as three easy sets.
   */
  hard: boolean;
}

export const EFFORT_MEANING: Record<EffortMarker, EffortMeaning> = {
  D: {
    label: { en: "Near failure", es: "Cerca del fallo" },
    detail: { en: "1–2 reps in reserve", es: "1–2 repeticiones en reserva" },
    hard: true,
  },
  F: {
    label: { en: "To failure", es: "Al fallo" },
    detail: { en: "No reps in reserve", es: "Sin repeticiones en reserva" },
    hard: true,
  },
};

/** The D/F choices, in the order the UI offers them. */
export const EFFORT_MARKERS: readonly EffortMarker[] = ["D", "F"];

/**
 * Read an effort marker out of a free-text cell.
 *
 * Accepts what the sources actually contain: `D`, `F`, `d`, `f`, `D.`, a lone
 * badge inside spaces. It deliberately does **not** guess from prose ("fallo en
 * la última") — an effort marker that was not recorded is not an effort marker,
 * and inventing one would corrupt the fatigue maths that depends on it.
 */
export function effortFromNote(note: unknown): EffortMarker | null {
  if (typeof note !== "string") return null;
  const trimmed = note.trim();
  if (/^d\.?$/i.test(trimmed)) return "D";
  if (/^f\.?$/i.test(trimmed)) return "F";
  return null;
}

/** The minimum a logged set needs to expose for its marker to be read. */
export interface SetEffortLike {
  warmup?: boolean;
  effort?: string | null;
  notes?: string;
}

/**
 * The set's marker: the structured field first, the legacy note second, and
 * `W` derived from `warmup` (which is what the field has always meant).
 */
export function markerOf(set: SetEffortLike): SetMarker | null {
  if (set.warmup === true) return "W";
  const field = typeof set.effort === "string" ? set.effort.trim().toUpperCase() : "";
  if (field === "D" || field === "F") return field;
  return effortFromNote(set.notes);
}

/** Was this set taken to failure, or close enough that it cost extra? */
export function isHardSet(set: SetEffortLike): boolean {
  const marker = markerOf(set);
  return marker === "D" || marker === "F";
}
