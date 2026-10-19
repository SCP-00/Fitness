/**
 * The next-set proposal — the load of the following set, decided by how the
 * previous one ended.
 *
 * Owner's directive (2026-10-11): *the app should propose the weight of the
 * next set by itself, from whether the previous set failed or came close to
 * failure — that is what maximum hypertrophy is.* This suite pins the rule
 * declared in `lib/set-proposal.ts` so the number that lands in the field
 * cannot drift silently:
 *
 *   F inside the range   → −10 % back-off, rounded down to the gear's step
 *   D inside the range   → repeat (that load produced the stimulus)
 *   below the range      → −1 step, whatever the marker says
 *   unmarked above range → +1 step (absent marker is NOT near-failure)
 *   unmarked in range    → repeat, with a nudge to mark the next one
 *   bodyweight / warmups → never adjusted, never counted
 */

import { describe, expect, it } from "vitest";
import { proposeNextSet } from "../../traininglab/apps/desktop/src/lib/set-proposal";
import type { ProposalSet } from "../../traininglab/apps/desktop/src/lib/set-proposal";

const RANGE = { min: 8, max: 12 };

const set = (
  weight: number | null,
  reps: number | null,
  extra: Partial<ProposalSet> = {},
): ProposalSet => ({ weight, reps, ...extra });

const propose = (
  sets: ProposalSet[],
  over: Partial<{
    targetReps: { min: number; max: number } | null;
    stepKg: number | null;
    capKg: number | null;
    suggestionKg: number | null;
  }> = {},
) =>
  proposeNextSet({
    sets,
    targetReps: over.targetReps === undefined ? RANGE : over.targetReps,
    stepKg: over.stepKg === undefined ? 1 : over.stepKg,
    capKg: over.capKg === undefined ? null : over.capKg,
    suggestionKg: over.suggestionKg === undefined ? 20 : over.suggestionKg,
  });

describe("proposeNextSet — before any set", () => {
  it("hands the planner's suggestion through on the first set", () => {
    const p = propose([], { suggestionKg: 22.5 });
    expect(p.move).toBe("first");
    expect(p.weightKg).toBe(22.5);
  });

  it("is honest about bodyweight work when there is nothing to suggest", () => {
    const p = propose([], { suggestionKg: null });
    expect(p.move).toBe("first");
    expect(p.weightKg).toBeNull();
  });
});

describe("proposeNextSet — the previous set went to failure (F)", () => {
  it("backs off ~10 %, rounded down to the gear's step", () => {
    // 20 kg × 0.9 = 18 exactly on a 1 kg grid.
    expect(propose([set(20, 10, { effort: "F" })]).weightKg).toBe(18);
    // 20 kg on a 2.5 kg grid: floor(18 / 2.5) × 2.5 = 17.5, never a number
    // the plates cannot make.
    const stepped = propose([set(20, 10, { effort: "F" })], { stepKg: 2.5 });
    expect(stepped.weightKg).toBe(17.5);
    expect(stepped.move).toBe("decrease");
  });

  it("falls back to a plain hold when the gear has no step to round to", () => {
    const p = propose([set(20, 10, { effort: "F" })], { stepKg: null });
    expect(p.move).toBe("repeat");
    expect(p.weightKg).toBe(20);
  });

  it("drops one step when failure came below the bottom of the rep range", () => {
    // Below the range is judged first: 6 of 8-12 is a load problem, and −10 %
    // on top of it would undershoot the range twice.
    const p = propose([set(20, 6, { effort: "F" })]);
    expect(p.move).toBe("decrease");
    expect(p.weightKg).toBe(19);
  });
});

describe("proposeNextSet — near failure (D) inside the range", () => {
  it("repeats the load that produced the stimulus", () => {
    const p = propose([set(20, 10, { effort: "D" })]);
    expect(p.move).toBe("repeat");
    expect(p.weightKg).toBe(20);
  });

  it("reads the legacy free-text note when the field predates it", () => {
    const p = propose([set(20, 10, { notes: "D" })]);
    expect(p.move).toBe("repeat");
    expect(p.evidence.marker).toBe("D");
  });
});

describe("proposeNextSet — the range decides first", () => {
  it("drops one step when the set stayed below the range, marked or not", () => {
    expect(propose([set(20, 6, { effort: "D" })]).weightKg).toBe(19);
    expect(propose([set(20, 6)]).weightKg).toBe(19);
  });

  it("raises one step when an UNMARKED set beat the top of the range", () => {
    const p = propose([set(20, 13)]);
    expect(p.move).toBe("increase");
    expect(p.weightKg).toBe(21);
  });

  it("does NOT raise a set marked D that beat the range — it already worked", () => {
    const p = propose([set(20, 13, { effort: "D" })]);
    expect(p.move).toBe("repeat");
    expect(p.weightKg).toBe(20);
  });

  it("repeats an unmarked in-range set and asks for the mark", () => {
    const p = propose([set(20, 10)]);
    expect(p.move).toBe("repeat");
    expect(p.weightKg).toBe(20);
  });

  it("never proposes past the gear's ceiling", () => {
    const capped = propose([set(24, 13)], { capKg: 24 });
    expect(capped.move).toBe("repeat");
    expect(capped.weightKg).toBe(24);
    const clampable = propose([set(23, 13)], { capKg: 24 });
    expect(clampable.weightKg).toBe(24); // 23 + 1 lands exactly on the cap
  });
});

describe("proposeNextSet — sets that carry no load decision", () => {
  it("keeps bodyweight work at bodyweight", () => {
    const p = propose([set(null, 9, { effort: "F" })]);
    expect(p.move).toBe("repeat");
    expect(p.weightKg).toBeNull();
  });

  it("ignores warm-up sets entirely — a ramp set is not work", () => {
    const p = propose([
      set(30, 5, { warmup: true, effort: "F" }),
      set(20, 10),
    ]);
    expect(p.evidence.marker).toBeNull();
    expect(p.move).toBe("repeat");
    expect(p.weightKg).toBe(20);
  });

  it("judges the LAST working set, not an earlier one", () => {
    const p = propose([set(20, 13), set(20, 8, { effort: "D" })]);
    expect(p.move).toBe("repeat");
    expect(p.evidence.lastReps).toBe(8);
    expect(p.evidence.marker).toBe("D");
  });
});
