/**
 * Effort markers — `W`, `D`, `F`, and the difference they make.
 *
 * Owner-confirmed meaning (2026-10-09): `W` warm-up, `D` near failure (1–2 reps
 * in reserve), `F` to failure. The badges used to arrive as free text in `notes`
 * and nothing read them; these tests pin the structured field, the legacy
 * fallback, and — the reason it matters — the fact that a set taken to failure
 * marks the family's session as a real one for the recovery window even when the
 * session was short.
 *
 * @module tests/training/effort_marker
 */

import { describe, expect, it } from "vitest";
import {
  effortFromNote,
  isHardSet,
  markerOf,
  EFFORT_MEANING,
  EFFORT_MARKERS,
} from "../../traininglab/apps/desktop/src/lib/effort";
import { deriveFatigue } from "../../traininglab/apps/desktop/src/lib/recovery";
import { summariseExerciseDays } from "../../traininglab/apps/desktop/src/lib/progression";
import { parseSymmetry } from "../../traininglab/apps/desktop/src/lib/symmetry";
import { SYMMETRY_SOURCE } from "../../traininglab/apps/desktop/src/lib/symmetry";
import type { Readiness } from "@fitness/bodylab-training";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

const NEUTRAL: Readiness = { energy: 3, motivation: 3, soreness: 3 };

let seq = 0;
function set(
  exerciseId: string,
  timestamp: string,
  extra: Partial<TLSet> = {},
): TLSet {
  seq += 1;
  return {
    id: `e-${seq}`,
    exerciseId,
    dayId: "day-1",
    timestamp,
    weight: null,
    reps: 8,
    ...extra,
  };
}

describe("reading a badge", () => {
  it("accepts the forms the sources actually contain, and refuses prose", () => {
    expect(effortFromNote("D")).toBe("D");
    expect(effortFromNote(" f ")).toBe("F");
    expect(effortFromNote("D.")).toBe("F" === "D" ? "F" : "D");
    expect(effortFromNote("1")).toBeNull();
    expect(effortFromNote("fallo en la última serie")).toBeNull();
    expect(effortFromNote(undefined)).toBeNull();
    expect(effortFromNote(null)).toBeNull();
  });

  it("prefers the structured field and falls back to the legacy note", () => {
    expect(markerOf({ effort: "F" })).toBe("F");
    expect(markerOf({ notes: "D" })).toBe("D");
    // warmup has always meant W, and it still wins over anything else
    expect(markerOf({ warmup: true, effort: "F" })).toBe("W");
    expect(markerOf({ notes: "not a badge" })).toBeNull();
    expect(isHardSet({ notes: "D" })).toBe(true);
    expect(isHardSet({ warmup: true })).toBe(false);
  });

  it("documents what each marker means, with its name in both languages", () => {
    expect(EFFORT_MEANING.D.label.es).toContain("fallo");
    expect(EFFORT_MEANING.F.label.es).toContain("fallo");
    expect(EFFORT_MEANING.D.hard).toBe(true);
    expect(EFFORT_MEANING.F.hard).toBe(true);

    // The UI offers exactly these two marks, `D` first — the order the chips
    // and the ZEN panel render. A short label rides on every chip and history
    // badge, and the detail is the tooltip: "D" alone is not an explanation.
    expect(EFFORT_MARKERS).toEqual(["D", "F"]);
    for (const mark of EFFORT_MARKERS) {
      for (const lang of ["en", "es"] as const) {
        expect(EFFORT_MEANING[mark].label[lang].length).toBeGreaterThan(3);
        expect(EFFORT_MEANING[mark].detail[lang].length).toBeGreaterThan(3);
      }
      // The chip label is genuinely shorter than the line under it, so a badge
      // stays a badge instead of wrapping to three lines.
      expect(EFFORT_MEANING[mark].label.es).not.toContain("(");
    }
    expect(EFFORT_MEANING.F.label.en).toBe("To failure");
    expect(EFFORT_MEANING.D.detail.es).toContain("reserva");
  });
});

describe("a failure set counts as a real session", () => {
  it("widens the recovery window for a short session that ended near failure", () => {
    // Two sets only: below the 3 direct sets that make a session "hard" — but
    // one of them was taken near failure, and that is the whole point.
    const sets = [
      set("push-ups", "2026-10-08T17:00:00.000Z", { effort: "D" }),
      set("push-ups", "2026-10-08T17:05:00.000Z"),
    ];
    const report = deriveFatigue(sets, NEUTRAL, new Date("2026-10-09T10:00:00Z"));
    const chest = report.entries.find((e) => e.family === "chest");
    expect(chest, "chest must still be recovering").toBeDefined();
    expect(chest!.hard).toBe(true);
    expect(chest!.sets).toBe(2);
    expect(chest!.windowHours).toBe(48);
  });

  it("treats the same short session without a badge as token work", () => {
    const plain = [
      set("push-ups", "2026-10-08T17:00:00.000Z"),
      set("push-ups", "2026-10-08T17:05:00.000Z"),
    ];
    const badged = plain.map((s) => ({ ...s, effort: "F" as const }));
    // 30 h later: two plain sets are done (24 h window), the same two sets taken
    // to failure are not (48 h window). That difference is the badge's whole job.
    const now = new Date("2026-10-09T23:00:00Z");
    expect(deriveFatigue(plain, NEUTRAL, now).fatigued).not.toContain("chest");
    const hard = deriveFatigue(badged, NEUTRAL, now);
    expect(hard.fatigued).toContain("chest");
    expect(hard.entries.find((e) => e.family === "chest")!.windowHours).toBe(48);
  });
});

describe("the summary keeps failure visible", () => {
  it("flags failure and near-failure separately", () => {
    const days = summariseExerciseDays([
      set("chin-ups", "2026-10-07T17:00:00.000Z", { reps: 6, effort: "F" }),
      set("chin-ups", "2026-10-07T17:10:00.000Z", { reps: 5, effort: "D" }),
      set("chin-ups", "2026-10-07T17:20:00.000Z", { reps: 4 }),
    ]);
    expect(days[0]!.hadFailure).toBe(true);
    expect(days[0]!.hadNearFailure).toBe(true);
    expect(days[0]!.reps).toEqual([6, 5, 4]);
  });

  it("does not count a warm-up badge as effort", () => {
    const days = summariseExerciseDays([
      set("chin-ups", "2026-10-07T17:00:00.000Z", { warmup: true, reps: 3 }),
      set("chin-ups", "2026-10-07T17:05:00.000Z", { reps: 6 }),
    ]);
    expect(days[0]!.warmupSets).toBe(1);
    expect(days[0]!.hadFailure).toBe(false);
    expect(days[0]!.hard ?? days[0]!.hadNearFailure).toBe(false);
  });
});

describe("the import carries the badge into the structured field", () => {
  it("maps D and F badges of a real Symmetry capture", () => {
    const payload = {
      source: SYMMETRY_SOURCE,
      sessions: [
        {
          startedAt: "2026-10-07T00:00:00.000Z",
          title: "Back",
          sets: [
            { exerciseId: "chin-ups", weightKg: null, reps: 6, notes: "F" },
            { exerciseId: "chin-ups", weightKg: null, reps: 5, notes: "D" },
            { exerciseId: "chin-ups", weightKg: null, reps: 4 },
          ],
        },
      ],
    };
    const result = parseSymmetry(JSON.stringify(payload));
    if (!result.ok) throw new Error("expected ok");
    expect(result.sets.map((s) => s.effort)).toEqual(["F", "D", undefined]);
    expect(result.sets.every((s) => s.notes === undefined)).toBe(true);
    // …and the same file drives the recovery window for that day.
    const report = deriveFatigue(
      result.sets,
      NEUTRAL,
      new Date("2026-10-08T10:00:00Z"),
    );
    expect(report.fatigued).toContain("lats");
  });
});
