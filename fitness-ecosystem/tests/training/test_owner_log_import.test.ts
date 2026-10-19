/**
 * The owner's corrected training log → TrainingLab records
 * (`lib/owner-log.ts`).
 *
 * The rules pinned here are the ones that protect his real history:
 *  - ids are ROW IDENTITY (date | exercise | set number), so editing a weight
 *    in the sheet and re-importing replaces the stale row instead of stacking a
 *    second copy of the same set on top of it;
 *  - rows already in the log are dropped on content, so importing the CSV after
 *    the older Symmetry JSON cannot double-count volume or fake a PR;
 *  - a row with no catalog id and no curated mapping is skipped and counted,
 *    never given an invented id;
 *  - a file without `warmup` / `duration_sec` is refused, because guessing
 *    there would count ramp sets as work and drop timed holds.
 *
 * @module tests/training/owner-log-import
 */

import { describe, it, expect } from "vitest";
import {
  parseOwnerLog,
  dropExisting,
} from "../../traininglab/apps/desktop/src/lib/owner-log";
import { mergeById } from "../../traininglab/apps/desktop/src/lib/backup";

const HEADER = [
  "date",
  "exercise_id",
  "exercise_name",
  "set_number",
  "sets_prescribed",
  "reps",
  "duration_sec",
  "weight_kg_per_implement",
  "weight_kg_total",
  "implements",
  "side",
  "warmup",
  "source",
  "notes",
].join(",");

/** Rows are written as arrays so the column count cannot drift by hand. */
const ROWS: string[][] = [
  // Monday: the chat session. No exercise_id — the curated map must resolve
  // these four names, and `weight_kg_total` (26) must NOT be reinterpreted.
  ["2026-10-05", "", "Elevaciones laterales con mancuerna", "1", "", "10", "", "13", "26", "2", "ambas", "false", "owner_chat", '"13 por lado, no 26"'],
  ["2026-10-05", "", "Elevaciones laterales con mancuerna", "2", "", "10", "", "13", "26", "2", "ambas", "false", "owner_chat", ""],
  ["2026-10-05", "", "Press de hombros con mancuernas (sentado)", "1", "", "8", "", "10", "", "", "", "false", "owner_chat", ""],
  ["2026-10-05", "", "Encogimiento con mancuernas", "1", "", "12", "", "16", "", "", "", "false", "owner_chat", ""],
  // Same session, name with no honest catalog equivalent → skipped + counted.
  ["2026-10-05", "", "Extensión de tríceps con una mancuerna", "1", "", "10", "", "10", "", "", "", "false", "owner_chat", ""],
  // Tuesday: warm-up ramp (excluded from volume) with a numeric "badge".
  ["2026-10-04", "lateral-raise", "Lateral Raise", "1", "", "10", "", "12.5", "", "", "", "true", "symmetry", "1"],
  ["2026-10-04", "lateral-raise", "Lateral Raise", "2", "", "10", "", "12.5", "", "", "", "false", "symmetry", "2"],
  // Timed hold: no reps, only duration.
  ["2026-10-04", "side-plank", "Side Plank", "1", "", "", "60", "", "", "", "", "false", "symmetry", ""],
  // Mobility: deliberately unmapped in scripts/map-symmetry-exercises.mjs.
  ["2026-09-25", "", "Stretching", "1", "", "10", "", "", "", "", "", "false", "symmetry", ""],
];

const CSV = [HEADER, ...ROWS.map((r) => r.join(","))].join("\n") + "\n";

describe("parseOwnerLog", () => {
  it("turns the sheet into sessions and sets without inventing anything", () => {
    const result = parseOwnerLog(CSV);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 2026-10-05: 4 mapped rows (the triceps row has no catalog equivalent).
    // 2026-10-04: warm-up + working + timed hold. 2026-09-25: nothing.
    expect(result.report.sessions).toBe(2);
    expect(result.report.sets).toBe(7);
    expect(result.report.skippedNoId).toBe(2);
    expect(result.report.skippedBadRow).toBe(0);

    const monday = result.sessions.find((s) => s.dayId === "day-2026-10-05");
    expect(monday).toBeDefined();
    expect(monday?.setIds).toHaveLength(4);
    expect(monday?.source).toBe("owner-log");
    // Local noon: midnight UTC would bucket the day backwards in any American
    // timezone, which is where the owner trains.
    expect(monday?.startedAt).toBe(new Date(2026, 9, 5, 12, 0, 0, 0).toISOString());

    const lateral = result.sets.find((s) => s.id === monday?.setIds[0]);
    expect(lateral?.exerciseId).toBe("lateral-raise"); // curated name mapping
    expect(lateral?.weight).toBe(13); // per implement, never 26 / 2
    expect(lateral?.notes).toBe("13 por lado, no 26");

    const timed = result.sets.find((s) => s.exerciseId === "side-plank");
    expect(timed?.reps).toBeNull();
    expect(timed?.durationSec).toBe(60);

    const warmup = result.sets.find((s) => s.exerciseId === "lateral-raise" && s.warmup);
    expect(warmup?.warmup).toBe(true);
    // A numeric note is a set index, not a comment (same rule as Symmetry).
    expect(warmup?.notes).toBeUndefined();
  });

  it("derives ids from row identity, so a corrected weight replaces the row", () => {
    const before = parseOwnerLog(CSV);
    // He corrects 13 → 15 per dumbbell in the sheet and imports again.
    const corrected = CSV.replace(
      "2026-10-05,,Elevaciones laterales con mancuerna,1,,10,,13,26",
      "2026-10-05,,Elevaciones laterales con mancuerna,1,,10,,15,26",
    );
    expect(corrected).not.toBe(CSV);
    const after = parseOwnerLog(corrected);
    expect(before.ok && after.ok).toBe(true);
    if (!before.ok || !after.ok) return;

    const firstId = before.sets[0].id;
    expect(firstId).toMatch(/^own-[0-9a-f]{16}$/);
    expect(after.sets[0].id).toBe(firstId); // identity does not depend on weight
    expect(after.sets[0].weight).toBe(15);

    const merged = mergeById(before.sets, after.sets);
    expect(merged).toHaveLength(before.sets.length); // replaced, not stacked
    expect(merged.find((s) => s.id === firstId)?.weight).toBe(15);
  });

  it("is byte-stable: importing the same file twice yields the same ids", () => {
    const a = parseOwnerLog(CSV);
    const b = parseOwnerLog(CSV);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.sets.map((s) => s.id)).toEqual(a.sets.map((s) => s.id));
    expect(b.sessions.map((s) => s.id)).toEqual(a.sessions.map((s) => s.id));
  });

  it("reads a Spanish-locale export (semicolon + decimal comma)", () => {
    const es = [
      "date;exercise_id;exercise_name;set_number;sets_prescribed;reps;duration_sec;weight_kg_per_implement;weight_kg_total;implements;side;warmup;source;notes",
      "2026-10-06;lateral-raise;Lateral Raise;1;;10;;12,5;;;;false;symmetry;",
    ].join("\r\n");
    const result = parseOwnerLog(es);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sets[0].weight).toBe(12.5);
    expect(result.sets[0].dayId).toBe("day-2026-10-06");
  });

  it("refuses files it cannot interpret honestly", () => {
    expect(parseOwnerLog("PK\u0003\u0004rest-of-a-zip")).toEqual({ ok: false, error: "xlsx" });
    expect(parseOwnerLog("date,exercise_name\n2026-10-05,Row")).toEqual({
      ok: false,
      error: "missing-columns",
    });
    expect(parseOwnerLog("exercise_name,reps\nRow,10")).toEqual({ ok: false, error: "wrong-shape" });
    expect(parseOwnerLog(HEADER + "\n")).toEqual({ ok: false, error: "no-rows" });
    // An impossible date is skipped, not rolled over into the next month.
    const feb30 = parseOwnerLog(HEADER + "\n2026-02-30,x,Row,1,,10,,10,,,,false,s,");
    expect(feb30).toEqual({ ok: false, error: "no-rows" });
  });
});

describe("dropExisting", () => {
  it("drops rows the log already holds and keeps only the new days", () => {
    const first = parseOwnerLog(CSV);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = dropExisting(parseOwnerLog(CSV), first.sets);
    expect(second.sets).toHaveLength(0);
    expect(second.sessions).toHaveLength(0);
    expect(second.report.sets).toBe(0);
    expect(second.report.duplicates).toBe(first.report.sets);

    // …while a day the log has never seen still arrives whole.
    const withNewDay = parseOwnerLog(
      CSV + "2026-10-06,lateral-raise,Lateral Raise,1,,10,,12,,,,false,symmetry,\n",
    );
    expect(withNewDay.ok).toBe(true);
    if (!withNewDay.ok) return;
    const third = dropExisting(withNewDay, first.sets);
    expect(third.report.sets).toBe(1);
    expect(third.report.duplicates).toBe(first.report.sets);
    expect(third.sessions.map((s) => s.dayId)).toEqual(["day-2026-10-06"]);
  });
});
