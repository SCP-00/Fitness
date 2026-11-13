import { describe, expect, it } from "vitest";
import { setEditPatch } from "../../traininglab/apps/desktop/src/lib/set-edit";

const stored = { weight: 80, reps: 8 };

describe("setEditPatch", () => {
  it("keeps a Spanish decimal comma", () => {
    expect(
      setEditPatch(stored, { weight: "62,5", reps: "10", effort: null }),
    ).toEqual({ weight: 62.5, reps: 10, effort: null });
  });

  it("clears a field when the user empties it", () => {
    expect(
      setEditPatch(stored, { weight: "  ", reps: "", effort: null }),
    ).toEqual({ weight: null, reps: null, effort: null });
  });

  it("keeps the stored number when the input is unreadable", () => {
    expect(
      setEditPatch(stored, { weight: "abc", reps: "nope", effort: null }),
    ).toEqual({ weight: 80, reps: 8, effort: null });
  });

  it("rounds reps but leaves the load's half-kilo alone", () => {
    expect(
      setEditPatch(stored, { weight: "82,5", reps: "9,6", effort: null }),
    ).toEqual({ weight: 82.5, reps: 10, effort: null });
  });

  it("passes the effort marker through unchanged", () => {
    expect(
      setEditPatch(stored, { weight: "80", reps: "8", effort: "F" }),
    ).toEqual({ weight: 80, reps: 8, effort: "F" });
  });
});
