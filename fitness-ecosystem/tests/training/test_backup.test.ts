/**
 * TrainingLab backup — build, validate and merge.
 *
 * The restore path must never trust a file: a wrong app, a newer version or a
 * corrupt row has to be refused (or dropped) instead of silently corrupting the
 * user's log.
 *
 * @module tests/training/backup
 */

import { describe, it, expect } from "vitest";
import {
  BACKUP_APP,
  BACKUP_VERSION,
  buildBackup,
  mergeById,
  parseBackup,
} from "../../traininglab/apps/desktop/src/lib/backup";
import type { TLSet } from "../../traininglab/apps/desktop/src/lib/types";

const SET: TLSet = {
  id: "set-1",
  exerciseId: "barbell-bench-press",
  dayId: "day-1",
  timestamp: "2026-09-30T10:00:00.000Z",
  weight: 60,
  reps: 8,
};

const SOURCE = {
  sets: [SET],
  sessions: [
    {
      id: "session-1",
      dayId: "day-1",
      startedAt: "2026-09-30T09:55:00.000Z",
      completedAt: null,
      setIds: ["set-1"],
    },
  ],
  health: [
    {
      id: "health-1",
      kind: "body_weight",
      value: 78.5,
      unit: "kg",
      timestamp: "2026-09-30T08:00:00.000Z",
    },
  ],
  settings: null,
  decisionModel: null,
};

describe("backup: build", () => {
  it("stamps the app and version and copies the arrays", () => {
    const now = new Date("2026-09-30T12:00:00.000Z");
    const backup = buildBackup(SOURCE, now);
    expect(backup.app).toBe(BACKUP_APP);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBe("2026-09-30T12:00:00.000Z");
    expect(backup.sets).toHaveLength(1);
    expect(backup.sessions).toHaveLength(1);
    expect(backup.health).toHaveLength(1);
    // Copies, not the same arrays: a later state update must not mutate the file.
    expect(backup.sets).not.toBe(SOURCE.sets);
  });
});

describe("backup: parse", () => {
  it("round-trips a real backup", () => {
    const text = JSON.stringify(buildBackup(SOURCE));
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.dropped).toBe(0);
    expect(parsed.backup.sets[0]!.id).toBe("set-1");
    expect(parsed.backup.sessions[0]!.setIds).toEqual(["set-1"]);
  });

  it("refuses text that is not a backup, with a specific reason", () => {
    expect(parseBackup("not json")).toEqual({
      ok: false,
      error: "not-json",
    });
    expect(parseBackup("[1,2,3]")).toEqual({
      ok: false,
      error: "not-object",
    });
    expect(parseBackup(JSON.stringify({ app: "bodylab", version: 1 }))).toEqual(
      { ok: false, error: "wrong-app" },
    );
    expect(
      parseBackup(JSON.stringify({ app: BACKUP_APP, version: "1" })),
    ).toEqual({ ok: false, error: "no-version" });
    expect(
      parseBackup(JSON.stringify({ app: BACKUP_APP, version: 1 })),
    ).toEqual({ ok: false, error: "missing-arrays" });
  });

  it("refuses a backup from a newer app version", () => {
    const text = JSON.stringify({
      ...buildBackup(SOURCE),
      version: BACKUP_VERSION + 1,
    });
    expect(parseBackup(text)).toEqual({ ok: false, error: "future-version" });
  });

  it("drops unusable rows instead of rejecting the whole file", () => {
    const text = JSON.stringify({
      ...buildBackup(SOURCE),
      sets: [SET, { id: "broken" }, null],
    });
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.sets).toHaveLength(1);
    expect(parsed.dropped).toBe(2);
  });
});

describe("backup: merge", () => {
  it("unions by id and lets the incoming row win", () => {
    const current = [SET, { ...SET, id: "set-2" }];
    const incoming = [{ ...SET, id: "set-2", reps: 12 }];
    const merged = mergeById(current, incoming);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.id === "set-2")!.reps).toBe(12);
  });

  it("keeps local rows that the backup does not contain", () => {
    const merged = mergeById([SET], []);
    expect(merged).toHaveLength(1);
  });
});
