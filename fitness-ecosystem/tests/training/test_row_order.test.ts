/**
 * Reordering the session — the pure half (2026-10-11).
 *
 * The owner asked for one thing in his own words: *«que el orden nuevo sobreviva
 * a un reinicio y lo entienda el generador»*. Those are two promises, and both
 * are decided here, far from React:
 *
 *   1. **survives a restart** — the sequence lives in `settings.rowOrder`, keyed
 *      by day, so it rides the settings document through IndexedDB, the backup,
 *      `normalizeSettings` and the autobackup mirror;
 *   2. **the generator understands it** — the plan is *rebuilt* whenever anything
 *      it depends on moves (readiness, gear, time budget, the learned model), and
 *      the sequence is applied to whatever rows that rebuild produced, so a
 *      re-plan cannot shuffle the session back.
 *
 * What is pinned here is the part with rules to get wrong: `applyRowOrder` is a
 * **permutation**, never a filter. An order that dropped a row would silently
 * delete an exercise from the session — worse than ignoring the feature.
 */

import { describe, expect, it } from "vitest";
import {
  applyRowOrder,
  clearRowOrder,
  rowOrderFor,
  withRowOrder,
  withRowOrderSwap,
} from "../../traininglab/apps/desktop/src/lib/settings";
import { normalizeSettings } from "../../traininglab/apps/desktop/src/lib/db";
import {
  DEFAULT_SETTINGS,
  type TLSettingsData,
} from "../../traininglab/apps/desktop/src/lib/types";
import type { PlannedRow } from "../../traininglab/apps/desktop/src/lib/plan";

const DAY = "2026-10-11";

/** A row that only needs to be recognisable — order is the subject here. */
function row(exerciseId: string): PlannedRow {
  return {
    exerciseId,
    name: { en: exerciseId, es: exerciseId },
    pattern: "horizontal_push",
    families: ["chest"],
    progression: ["load"],
    loadType: "barbell",
    unilateral: false,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    rir: 2,
    restSec: 90,
    minutes: 9,
    reasons: [],
    jointStress: 1,
    spineLoad: 1,
  };
}

const ids = (rows: PlannedRow[]) => rows.map((r) => r.exerciseId);

const plan = () => [row("bench"), row("row"), row("squat"), row("curl")];

const settingsWith = (
  rowOrder: TLSettingsData["rowOrder"],
): TLSettingsData => ({ ...DEFAULT_SETTINGS, rowOrder }) as TLSettingsData;

describe("the session's sequence", () => {
  it("puts the rows in the order the user dragged", () => {
    const settings = settingsWith({
      date: DAY,
      ids: ["squat", "bench", "curl", "row"],
    });
    expect(ids(applyRowOrder(settings, plan(), DAY))).toEqual([
      "squat",
      "bench",
      "curl",
      "row",
    ]);
  });

  it("never loses nor duplicates a row when the plan changes", () => {
    // He reordered four exercises; the plan that comes back has dropped `row`
    // (shorter budget) and added `plank` (gear changed). Both sides must survive.
    const settings = settingsWith({
      date: DAY,
      ids: ["squat", "bench", "curl", "row"],
    });
    const rebuilt = [
      row("bench"),
      row("plank"),
      row("squat"),
      row("curl"),
    ];
    const out = applyRowOrder(settings, rebuilt, DAY);
    expect(ids(out)).toEqual(["squat", "bench", "curl", "plank"]);
    expect(out).toHaveLength(rebuilt.length);
    expect(new Set(ids(out)).size).toBe(rebuilt.length);
  });

  it("keeps the generator's position for rows the order does not know", () => {
    // The local coach proposed a different session: nothing of his sequence is
    // in it, so his order is inert and the proposal arrives untouched.
    const settings = settingsWith({ date: DAY, ids: ["squat", "bench"] });
    const proposed = [row("press"), row("pullup"), row("lunge")];
    const out = applyRowOrder(settings, proposed, DAY);
    expect(ids(out)).toEqual(["press", "pullup", "lunge"]);
  });

  it("is a decision about one session, not an instruction for every one", () => {
    const settings = settingsWith({ date: DAY, ids: ["curl", "squat"] });
    const tomorrow = "2026-10-12";
    expect(rowOrderFor(settings, tomorrow)).toBeNull();
    const rows = plan();
    // Same array by identity: no order for that day means no work, and no
    // chance of a stale sequence quietly driving a session nobody ordered.
    expect(applyRowOrder(settings, rows, tomorrow)).toBe(rows);
  });

  it("ignores junk instead of persisting it, and clears with fewer than two ids", () => {
    const one = withRowOrder(DEFAULT_SETTINGS as TLSettingsData, DAY, ["squat"]);
    // Asserted through the accessor, not the field: `undefined` and `null` are
    // both "no order" by type, and `rowOrderFor` is the one thing that reads it.
    expect(rowOrderFor(one, DAY)).toBeNull();
    const junk = withRowOrder(DEFAULT_SETTINGS as TLSettingsData, DAY, [
      "squat",
      "",
      " bench ",
    ]);
    expect(junk.rowOrder).toEqual({ date: DAY, ids: ["squat", "bench"] });
    // And a document that already holds a blank entry reads back without it.
    expect(
      rowOrderFor(settingsWith({ date: DAY, ids: ["squat", " "] }), DAY),
    ).toEqual(["squat"]);
  });

  it("restores the generator's own sequence on demand", () => {
    const settings = settingsWith({ date: DAY, ids: ["curl", "squat"] });
    const cleared = clearRowOrder(settings);
    expect(cleared.rowOrder).toBeNull();
    const rows = plan();
    expect(applyRowOrder(cleared, rows, DAY)).toBe(rows);
  });

  it("survives the settings round trip — the restart, in one assertion", () => {
    const written = withRowOrder(DEFAULT_SETTINGS as TLSettingsData, DAY, [
      "curl",
      "squat",
      "bench",
    ]);
    // `normalizeSettings` is what `loadSettings()` puts a stored document
    // through on every launch.
    const reloaded = normalizeSettings(written);
    expect(rowOrderFor(reloaded, DAY)).toEqual(["curl", "squat", "bench"]);
    expect(ids(applyRowOrder(reloaded, plan(), DAY))).toEqual([
      "curl",
      "squat",
      "bench",
      "row",
    ]);
  });

  it("makes a swap keep the slot's position instead of dropping to the end", () => {
    const settings = settingsWith({
      date: DAY,
      ids: ["curl", "squat", "bench"],
    });
    const swapped = withRowOrderSwap(settings, DAY, "squat", "leg-press");
    expect(swapped.rowOrder?.ids).toEqual(["curl", "leg-press", "bench"]);
    // A swap with no sequence for the day leaves settings alone (same object).
    expect(withRowOrderSwap(DEFAULT_SETTINGS as TLSettingsData, DAY, "squat", "leg-press")).toBe(
      DEFAULT_SETTINGS,
    );
    expect(withRowOrderSwap(settings, DAY, "absent", "leg-press")).toBe(
      settings,
    );
  });
});
