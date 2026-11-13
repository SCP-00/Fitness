/**
 * One set's editable fields, decoded once for every screen that edits a set.
 *
 * The log stores `weight`/`reps` as numbers or `null`; the editor holds strings
 * while the user types. Empty means "clear this field", an unreadable value
 * keeps what the log already had, and the Spanish decimal comma must survive
 * (`62,5` is 62.5, not 62). Keeping that rule here means the exercise sheet and
 * the History detail cannot disagree about what a saved edit means.
 *
 * @module lib/set-edit
 */

import type { EffortMarker } from "./effort";
import { parseNumberInput } from "./parse-num";
import type { TLSet } from "./types";

export interface SetEditDraft {
  weight: string;
  reps: string;
  effort: EffortMarker | null;
}

export interface SetEditPatch {
  weight: number | null;
  reps: number | null;
  effort: EffortMarker | null;
}

export function setEditPatch(
  set: Pick<TLSet, "weight" | "reps">,
  draft: SetEditDraft,
): SetEditPatch {
  const weight = parseNumberInput(draft.weight);
  const reps = parseNumberInput(draft.reps);

  return {
    weight: draft.weight.trim() === "" ? null : (weight ?? set.weight),
    reps:
      draft.reps.trim() === ""
        ? null
        : reps === null
          ? set.reps
          : Math.round(reps),
    effort: draft.effort,
  };
}
