/**
 * The 2D body map's two lenses — the pure half.
 *
 * The training lens (`familyBalance`) has been pinned indirectly elsewhere;
 * what needed its own suite is the **goal lens** (`goalProximity`) and the
 * **stimulus split** the map paints, because both decide which colour a body
 * zone gets — and a wrong colour is a wrong claim about someone's body.
 *
 * Honesty rules under test: warm-ups never count, partial credit is 1 / 0.66
 * / 0.33 by involvement, sources the user has not supplied produce *absent*
 * families (never a fabricated number), and the golden preset refuses to fire
 * without a waist.
 */

import { describe, expect, it } from "vitest";
import {
  FAMILY_SEGMENT,
  GOLDEN_RATIO_TARGETS,
  clampIndex,
  goalProximity,
  resolveWaistCm,
} from "../../traininglab/apps/desktop/src/features/stats/goals";
import { familyTotals } from "../../traininglab/apps/desktop/src/features/stats/derive";
import {
  DEFAULT_SETTINGS,
  type TLSettingsData,
} from "../../traininglab/apps/desktop/src/lib/types";
import {
  applyRepOverrides,
  repRangeFor,
  withRepOverride,
} from "../../traininglab/apps/desktop/src/lib/settings";
import type { ImportPayload } from "../../traininglab/apps/desktop/src/lib/adapter";
import type { PlannedRow } from "../../traininglab/apps/desktop/src/lib/plan";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

// ── Fixtures ────────────────────────────────────────────────────────────────

const payloadWith: ImportPayload = {
  format: "bodylab-traininglab-link",
  version: 2,
  exportedAt: "2026-09-29T00:00:00.000Z",
  profile: null,
  measurements: [
    {
      type: "chest",
      value: 100,
      unit: "cm",
      timestamp: "2026-09-28T00:00:00.000Z",
    },
    {
      type: "waist",
      value: 80,
      unit: "cm",
      timestamp: "2026-09-28T00:00:00.000Z",
    },
    {
      type: "biceps",
      value: 35,
      unit: "cm",
      timestamp: "2026-09-28T00:00:00.000Z",
    },
  ],
  muscleScores: [
    { segment: "chest", score: 0.9 },
    { segment: "biceps", score: 0.5 },
  ],
  muscleLoad: [],
};

const row = (overrides: Partial<PlannedRow> = {}): PlannedRow => ({
  exerciseId: "barbell-bench-press",
  name: { en: "Bench Press", es: "Press con Barra" },
  pattern: "horizontal_push",
  families: ["chest"],
  progression: ["reps"],
  loadType: "barbell",
  unilateral: false,
  sets: 4,
  repsMin: 8,
  repsMax: 12,
  rir: 2,
  restSec: 120,
  minutes: 10,
  reasons: [],
  jointStress: 1,
  spineLoad: 1,
  ...overrides,
});

const set = (overrides: Partial<TLSet> = {}): TLSet =>
  ({
    id: overrides.id ?? "s1",
    exerciseId: overrides.exerciseId ?? "barbell-bench-press",
    timestamp: overrides.timestamp ?? "2026-09-29T10:00:00.000Z",
    weight: overrides.weight ?? 60,
    reps: overrides.reps ?? 8,
    ...overrides,
  }) as TLSet;

// ── The goal lens ───────────────────────────────────────────────────────────

describe("goalProximity", () => {
  it("measures mode maps BodyLab's own score to 0–100 and skips unmeasured segments", () => {
    const out = goalProximity({
      payload: payloadWith,
      targets: {},
      waistCm: null,
      source: "measures",
    });
    // chest: exported score 0.9 → 90. biceps: 0.5 → 50.
    expect(out.get("chest")?.index).toBe(90);
    expect(out.get("biceps")?.index).toBe(50);
    // A family whose proxy segment was never assessed is absent, not 0.
    expect(out.has("quadriceps")).toBe(false);
  });

  it("measures mode without a payload produces nothing at all", () => {
    const out = goalProximity({
      payload: null,
      targets: {},
      waistCm: null,
      source: "measures",
    });
    expect(out.size).toBe(0);
  });

  it("targets mode compares the latest measurement against the user's number", () => {
    const out = goalProximity({
      payload: payloadWith,
      targets: { chest: 110, biceps: 40 },
      waistCm: null,
      source: "targets",
    });
    expect(out.get("chest")?.index).toBe(Math.round((100 / 110) * 100)); // 91
    expect(out.get("chest")?.targetCm).toBe(110);
    expect(out.get("biceps")?.index).toBe(Math.round((35 / 40) * 100)); // 88
    // A family the user did not target stays out of the map.
    expect(out.has("calves")).toBe(false);
  });

  it("targets mode without a measurement reports the target with an absent index", () => {
    const out = goalProximity({
      payload: payloadWith,
      targets: { calves: 40 },
      waistCm: null,
      source: "targets",
    });
    const calf = out.get("calves");
    expect(calf).toBeDefined();
    expect(calf?.targetCm).toBe(40);
    expect(calf?.actualCm).toBeNull();
    expect(calf?.index).toBe(0);
  });

  it("golden mode scales the classical ratios from the waist and clamps at 100", () => {
    const waist = 80;
    const out = goalProximity({
      payload: payloadWith,
      targets: {},
      waistCm: waist,
      source: "golden",
    });
    const chest = out.get("chest");
    expect(chest?.targetCm).toBeCloseTo(GOLDEN_RATIO_TARGETS.chest * waist, 1);
    // 100 cm measured against a ~112 cm ideal → below 100, never above.
    expect(chest?.index).toBeLessThanOrEqual(100);
    expect(chest?.index).toBeGreaterThan(80);
  });

  it("golden mode refuses to fire without a waist — no anchor, no number", () => {
    const out = goalProximity({
      payload: payloadWith,
      targets: {},
      waistCm: null,
      source: "golden",
    });
    expect(out.size).toBe(0);
  });

  it("shares one segment between the arm families instead of inventing two", () => {
    expect(FAMILY_SEGMENT.biceps.segment).toBe(FAMILY_SEGMENT.triceps.segment);
  });
});

describe("resolveWaistCm", () => {
  it("prefers the declared waist over the measured one", () => {
    expect(resolveWaistCm(payloadWith, 85)).toBe(85);
  });

  it("falls back to the export's latest waist", () => {
    expect(resolveWaistCm(payloadWith, null)).toBe(80);
  });

  it("returns null when neither source exists", () => {
    expect(resolveWaistCm(null, null)).toBeNull();
    expect(
      resolveWaistCm({ ...payloadWith, measurements: [] }, null),
    ).toBeNull();
  });
});

// ── The training lens' stimulus split ───────────────────────────────────────

describe("familyTotals stimulus", () => {
  it("credits 1 / 0.66 / 0.33 by involvement and never counts warm-ups", () => {
    // Incline press per the catalog: chest_upper 3 (→ chest) AND
    // anterior_deltoid 3 (→ shoulders), triceps 2. Two hard sets credit both
    // families as primaries; a warm-up set counts for nothing.
    const sets = [
      set({
        id: "a",
        exerciseId: "incline-dumbbell-press",
        timestamp: "2026-09-29T10:00:00.000Z",
      }),
      set({
        id: "b",
        exerciseId: "incline-dumbbell-press",
        timestamp: "2026-09-29T10:10:00.000Z",
      }),
      set({
        id: "w",
        exerciseId: "incline-dumbbell-press",
        timestamp: "2026-09-29T09:30:00.000Z",
        warmup: true,
      }),
    ];
    const totals = familyTotals(sets, null);
    const chest = totals.get("chest")!;
    const shoulders = totals.get("shoulders")!;
    expect(chest.stimulus).toBeCloseTo(2, 5);
    expect(shoulders.stimulus).toBeCloseTo(2, 5);
    // Triceps rode along at intensity 2 → 0.66 per set.
    expect(totals.get("triceps")?.stimulus).toBeCloseTo(1.32, 5);
  });

  it("returns an empty map for an empty log instead of throwing", () => {
    expect(familyTotals([], null).size).toBe(0);
  });
});

// ── Reps per set, decided by the user ───────────────────────────────────────

describe("rep overrides", () => {
  const settingsWith = (repOverrides: TLSettingsData["repOverrides"]) =>
    ({ ...DEFAULT_SETTINGS, repOverrides }) as TLSettingsData;

  it("override replaces the plan's range in the rows Inicio renders", () => {
    const rows = [
      row(),
      row({ exerciseId: "pull-up", repsMin: 5, repsMax: 8 }),
    ];
    const out = applyRepOverrides(
      settingsWith({ "pull-up": { min: 10, max: 12 } }),
      rows,
    );
    expect(out[0]?.repsMin).toBe(8); // untouched
    expect(out[1]?.repsMin).toBe(10);
    expect(out[1]?.repsMax).toBe(12);
  });

  it("an inverted range is normalised instead of persisted backwards", () => {
    const next = withRepOverride(
      DEFAULT_SETTINGS as TLSettingsData,
      "pull-up",
      {
        min: 12,
        max: 8,
      },
    );
    expect(next.repOverrides?.["pull-up"]).toEqual({ min: 12, max: 12 });
  });

  it("null clears the override; the range falls back to the plan's", () => {
    let settings = withRepOverride(
      DEFAULT_SETTINGS as TLSettingsData,
      "pull-up",
      {
        min: 10,
        max: 12,
      },
    );
    settings = withRepOverride(settings, "pull-up", null);
    expect(settings.repOverrides?.["pull-up"]).toBeUndefined();
    const out = repRangeFor(
      settings,
      row({ exerciseId: "pull-up", repsMin: 5, repsMax: 8 }),
    );
    expect(out).toEqual({ min: 5, max: 8, custom: false });
  });

  it("repRangeFor flags the override as the user's", () => {
    const settings = settingsWith({
      "barbell-bench-press": { min: 6, max: 9 },
    });
    const out = repRangeFor(settings, row());
    expect(out).toEqual({ min: 6, max: 9, custom: true });
  });
});

// ── Shared guards ───────────────────────────────────────────────────────────

describe("clampIndex", () => {
  it("clamps to 0–100 and refuses non-finite input", () => {
    expect(clampIndex(140)).toBe(100);
    expect(clampIndex(-3)).toBe(0);
    expect(clampIndex(Number.NaN)).toBe(0);
  });
});
