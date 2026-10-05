/**
 * Symmetry history → TrainingLab records (`lib/symmetry.ts`).
 *
 * The import must be safe to run twice (deterministic ids + `mergeById`),
 * must never invent an `exerciseId`, and must keep every set on its session's
 * local calendar day regardless of the machine's timezone.
 *
 * @module tests/training/symmetry-import
 */

import { describe, it, expect } from "vitest";
import {
  SYMMETRY_SOURCE,
  parseSymmetry,
} from "../../traininglab/apps/desktop/src/lib/symmetry";
import {
  buildBackup,
  parseBackup,
  mergeById,
} from "../../traininglab/apps/desktop/src/lib/backup";

const SESSION_ONE = {
  id: "65726a70e0f335ce",
  startedAt: "2026-09-02T00:00:00.000Z",
  durationMin: 61,
  location: "gym",
  title: "Back and Triceps",
  sets: [
    {
      exerciseId: "tricep-pushdown",
      exerciseName: "Tricep Pushdown",
      weightKg: 31.7,
      reps: 15,
      warmup: true,
    },
    {
      exerciseId: "tricep-pushdown",
      exerciseName: "Tricep Pushdown",
      weightKg: 40.8,
      reps: 10,
      notes: "D",
    },
    {
      exerciseId: "dead-hang",
      exerciseName: "Dead Hang",
      weightKg: null,
      reps: null,
      durationSec: 70,
    },
    {
      // 13 names have no catalog equivalent — must be skipped, never invented.
      exerciseId: null,
      exerciseName: "pa® (Maquina)",
      weightKg: 18,
      reps: 10,
    },
    {
      // A literal 0-rep set from Symmetry: kept, faithful to the capture.
      exerciseId: "pause-squat",
      exerciseName: "Pause Squat",
      weightKg: 75,
      reps: 0,
      notes: "F",
    },
  ],
};

const SESSION_TWO = {
  id: "9be1a2c3d4e5f607",
  startedAt: "2026-09-29T00:00:00.000Z",
  durationMin: 39,
  location: "home",
  title: "Monday's Workout",
  sets: [
    {
      exerciseId: "push-ups",
      exerciseName: "Standard Push-ups",
      weightKg: null,
      reps: 20,
    },
  ],
};

const FILE = JSON.stringify({
  source: SYMMETRY_SOURCE,
  sessions: [SESSION_ONE, SESSION_TWO],
});

describe("parseSymmetry", () => {
  it("converts sessions and sets, skipping rows without a catalog id", () => {
    const result = parseSymmetry(FILE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report).toEqual({
      sessions: 2,
      sets: 5, // 4 kept in session one (one skipped) + 1 in session two
      skippedNoId: 1,
      skippedBadRow: 0,
    });
    expect(result.sessions).toHaveLength(2);
    expect(result.sets).toHaveLength(5);
  });

  it("is deterministic: the same file yields the same ids", () => {
    const a = parseSymmetry(FILE);
    const b = parseSymmetry(FILE);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.sets.map((s) => s.id)).toEqual(b.sets.map((s) => s.id));
    expect(a.sessions.map((s) => s.id)).toEqual(b.sessions.map((s) => s.id));
    // and the session id is traceable to the importer's own hash
    expect(a.sessions[0].id).toBe("sym-65726a70e0f335ce");
  });

  it("maps warm-up, badge notes and timed holds", () => {
    const result = parseSymmetry(FILE);
    if (!result.ok) throw new Error("expected ok");
    const [warmup, drop, timed, zero] = result.sets;
    expect(warmup.warmup).toBe(true);
    expect(drop.warmup).toBeUndefined();
    expect(drop.notes).toBe("D");
    expect(timed.durationSec).toBe(70);
    expect(timed.reps).toBeNull();
    expect(timed.weight).toBeNull();
    expect(zero.reps).toBe(0);
    expect(zero.notes).toBe("F");
  });

  it("treats a numeric set index as no note at all, and keeps real notes", () => {
    // The owner's real import: 314 of 410 rows carry the *set number* in the
    // same slot as the badge. Those must not become notes.
    const payload = {
      source: SYMMETRY_SOURCE,
      sessions: [
        {
          startedAt: "2026-09-02T00:00:00.000Z",
          title: "Workout",
          sets: [
            { exerciseId: "seated-cable-row", weightKg: 54.4, reps: 10, notes: "1" },
            { exerciseId: "seated-cable-row", weightKg: 54, reps: 10, notes: "3" },
            { exerciseId: "seated-cable-row", weightKg: 53, reps: 8, notes: "D" },
            { exerciseId: "seated-cable-row", weightKg: 52, reps: 6, notes: "  F  " },
          ],
        },
      ],
    };
    const result = parseSymmetry(JSON.stringify(payload));
    if (!result.ok) throw new Error("expected ok");
    expect(result.sets.map((s) => s.notes)).toEqual([undefined, undefined, "D", "F"]);
    // The rows themselves survive — only the misleading note is dropped.
    expect(result.sets.map((s) => s.reps)).toEqual([10, 10, 8, 6]);
  });

  it("keeps every set on its session's local calendar day", () => {
    const result = parseSymmetry(FILE);
    if (!result.ok) throw new Error("expected ok");
    for (const session of result.sessions) {
      const day = session.startedAt.slice(0, 10);
      const localDay = new Date(session.startedAt);
      const iso = `${localDay.getFullYear()}-${String(localDay.getMonth() + 1).padStart(2, "0")}-${String(localDay.getDate()).padStart(2, "0")}`;
      expect(iso).toBe(day);
      for (const set of result.sets.filter((s) => s.dayId === session.dayId)) {
        const setLocal = new Date(set.timestamp);
        expect(setLocal.getDate()).toBe(localDay.getDate());
      }
    }
  });

  it("carries provenance: title, location and source", () => {
    const result = parseSymmetry(FILE);
    if (!result.ok) throw new Error("expected ok");
    const [first, second] = result.sessions;
    expect(first.title).toBe("Back and Triceps");
    expect(first.location).toBe("gym");
    expect(second.location).toBe("home");
    expect(first.source).toBe("symmetry");
    expect(first.completedAt).not.toBeNull();
    expect(first.dayId).toBe("day-symmetry-2026-09-02");
    expect(first.setIds).toHaveLength(4); // the skipped row is not linked
  });

  it("refuses non-Symmetry input instead of guessing", () => {
    expect(parseSymmetry("not json")).toEqual({ ok: false, error: "not-json" });
    expect(
      parseSymmetry(JSON.stringify({ app: "traininglab", version: 1, sets: [] })),
    ).toEqual({ ok: false, error: "wrong-shape" });
    expect(
      parseSymmetry(JSON.stringify({ source: SYMMETRY_SOURCE, sessions: [] })),
    ).toEqual({ ok: false, error: "no-sessions" });
    // every session broken → nothing to import, still refused
    expect(
      parseSymmetry(
        JSON.stringify({
          source: SYMMETRY_SOURCE,
          sessions: [{ id: "x", startedAt: "2026-02-30T00:00:00.000Z", sets: [] }],
        }),
      ),
    ).toEqual({ ok: false, error: "no-sessions" });
  });

  it("round-trips through the backup contract and merges idempotently", () => {
    const result = parseSymmetry(FILE);
    if (!result.ok) throw new Error("expected ok");
    const backup = buildBackup({
      sets: result.sets,
      sessions: result.sessions,
      health: [],
      settings: null,
      decisionModel: null,
    });
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.dropped).toBe(0);
    expect(parsed.backup.sets).toHaveLength(5);
    expect(parsed.backup.sessions).toHaveLength(2);
    expect(parsed.backup.settings).toBeNull(); // must not wipe app settings

    // importing the same file twice is a no-op, not a duplicated log
    const once = mergeById([], result.sets);
    const twice = mergeById(once, parsed.backup.sets);
    expect(twice).toHaveLength(once.length);
    expect(once).toHaveLength(5);
  });
});
