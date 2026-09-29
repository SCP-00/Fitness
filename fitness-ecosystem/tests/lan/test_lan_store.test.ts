/**
 * Shared LAN store (`scripts/lan-store.mjs`) — the household database.
 *
 * This is the only piece of the project that accepts writes from the network, so
 * the tests that matter are the ones about what it *refuses*:
 *
 *   1. a payload cannot write into another member's history (the member comes
 *      from the route, never from the body);
 *   2. unknown fields are dropped and malformed rows are rejected instead of
 *      being stored half-empty;
 *   3. pushing the same batch twice changes nothing (UUID + upsert), because
 *      every device will retry after a dropped Wi-Fi packet;
 *   4. the soft login reuses a name instead of quietly forking a profile.
 *
 * The store needs `node:sqlite` (Node 22.5+). On an older runtime the whole file
 * is skipped with a clear reason rather than failing, so the root suite still
 * runs on Node 20.
 *
 * @module tests/lan/lan_store
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// @ts-expect-error — plain .mjs module without type declarations
import { createLanStore, normalizeMemberName, normalizeRow, StoreInputError } from "../../scripts/lan-store.mjs";

let hasSqlite = true;
try {
  createRequire(import.meta.url)("node:sqlite");
} catch {
  hasSqlite = false;
}

let dir: string;
let store: any;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "fitness-lan-"));
});

afterAll(() => {
  try {
    store?.close();
  } catch {
    /* already closed */
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  if (!hasSqlite) return;
  store?.close?.();
  // A fresh file per test keeps them independent without a transaction dance.
  const fresh = fs.mkdtempSync(path.join(dir, "db-"));
  store = createLanStore({ dir: fresh });
});

const maybe = () => (hasSqlite ? describe : describe.skip);

maybe()("createLanStore", () => {
  it("creates the database file inside the data directory", () => {
    expect(fs.existsSync(store.file)).toBe(true);
    expect(path.basename(store.file)).toBe("fitness.sqlite");
    expect(store.backend).toBe("sqlite");
  });

  it("starts empty", () => {
    expect(store.members()).toEqual([]);
    expect(store.overview()).toEqual([]);
  });
});

maybe()("the soft login", () => {
  it("creates a member on first claim and returns it afterwards", () => {
    const first = store.ensureMember("Andy");
    expect(first.created).toBe(true);
    expect(first.name).toBe("Andy");
    expect(first.id).toBeTruthy();

    const again = store.ensureMember("Andy");
    expect(again.created).toBe(false);
    expect(again.id).toBe(first.id);
    expect(store.members()).toHaveLength(1);
  });

  it("treats names case-insensitively — 'Ana' and 'ana' are one person", () => {
    const a = store.ensureMember("Ana");
    const b = store.ensureMember("ana");
    expect(b.id).toBe(a.id);
    expect(store.members()).toHaveLength(1);
  });

  it("resumes an existing member when the client still knows its id", () => {
    const first = store.ensureMember("Bea");
    const resumed = store.ensureMember("Bea", first.id);
    expect(resumed.id).toBe(first.id);
    expect(resumed.created).toBe(false);
  });

  it("trims the name and refuses empty or absurd ones", () => {
    expect(store.ensureMember("  Carol  ").name).toBe("Carol");
    expect(() => normalizeMemberName("   ")).toThrow(StoreInputError);
    expect(() => normalizeMemberName("x".repeat(41))).toThrow(StoreInputError);
    expect(() => normalizeMemberName(42 as unknown as string)).toThrow(StoreInputError);
    // Control characters are stripped, not replaced: a pasted name should not
    // gain stray spaces where an invisible character used to be.
    expect(normalizeMemberName("D\u0000an\u001fi")).toBe("Dani");
    expect(normalizeMemberName("Andy\n\t")).toBe("Andy");
  });
});

maybe()("sets", () => {
  const set = (over: Record<string, unknown> = {}) => ({
    id: "set-1",
    exerciseId: "back-squat",
    dayId: "day-2026-09-28",
    timestamp: "2026-09-28T10:00:00.000Z",
    weight: 100,
    reps: 5,
    ...over,
  });

  it("stores a set with the member from the route", () => {
    const m = store.ensureMember("Andy");
    expect(store.upsert("sets", [set()], { memberId: m.id })).toBe(1);
    const rows = store.list("sets", { memberId: m.id });
    expect(rows).toHaveLength(1);
    expect(rows[0].memberId).toBe(m.id);
    expect(rows[0].weight).toBe(100);
    expect(rows[0].updatedAt).toBeTruthy();
  });

  it("cannot be written into another member's history through the body", () => {
    const andy = store.ensureMember("Andy");
    const bea = store.ensureMember("Bea");
    // A hostile body claiming to be Bea.
    store.upsert("sets", [set({ memberId: bea.id })], { memberId: andy.id });
    expect(store.list("sets", { memberId: andy.id })).toHaveLength(1);
    expect(store.list("sets", { memberId: bea.id })).toHaveLength(0);
  });

  it("is idempotent: pushing the same batch twice changes nothing", () => {
    const m = store.ensureMember("Andy");
    store.upsert("sets", [set()], { memberId: m.id });
    store.upsert("sets", [set()], { memberId: m.id });
    expect(store.list("sets", { memberId: m.id })).toHaveLength(1);
  });

  it("updates in place when the same id arrives with new numbers (last write wins)", () => {
    const m = store.ensureMember("Andy");
    store.upsert("sets", [set()], { memberId: m.id });
    store.upsert("sets", [set({ weight: 105, reps: 3 })], { memberId: m.id });
    const rows = store.list("sets", { memberId: m.id });
    expect(rows).toHaveLength(1);
    expect(rows[0].weight).toBe(105);
    expect(rows[0].reps).toBe(3);
  });

  it("drops unknown fields instead of storing them", () => {
    const m = store.ensureMember("Andy");
    store.upsert("sets", [set({ evil: "payload", __proto__: { x: 1 } })], { memberId: m.id });
    const rows = store.list("sets", { memberId: m.id });
    expect(rows[0]).not.toHaveProperty("evil");
  });

  it("rejects rows missing the fields the schema needs", () => {
    expect(() => normalizeRow("sets", { id: "x" })).toThrow(StoreInputError);
    expect(() => normalizeRow("sets", { exerciseId: "a", dayId: "d", timestamp: "t" })).toThrow(
      StoreInputError,
    );
  });

  it("rejects wrong types instead of coercing them", () => {
    expect(() => normalizeRow("sets", set({ weight: "100" }))).toThrow(StoreInputError);
    expect(() => normalizeRow("sets", set({ reps: Number.NaN }))).toThrow(StoreInputError);
    expect(() => normalizeRow("sets", set({ weight: Number.POSITIVE_INFINITY }))).toThrow(
      StoreInputError,
    );
  });

  it("accepts a bodyweight set (null weight) but not an empty id", () => {
    const m = store.ensureMember("Andy");
    store.upsert("sets", [set({ id: "bw", weight: null })], { memberId: m.id });
    expect(store.list("sets", { memberId: m.id })[0].weight).toBeNull();
    expect(() => normalizeRow("sets", set({ id: "" }))).toThrow(StoreInputError);
  });

  it("orders by time and honours `since`", () => {
    const m = store.ensureMember("Andy");
    store.upsert(
      "sets",
      [
        set({ id: "a", timestamp: "2026-09-01T10:00:00.000Z" }),
        set({ id: "b", timestamp: "2026-09-20T10:00:00.000Z" }),
        set({ id: "c", timestamp: "2026-09-28T10:00:00.000Z" }),
      ],
      { memberId: m.id },
    );
    expect(store.list("sets", { memberId: m.id }).map((r: any) => r.id)).toEqual(["a", "b", "c"]);
    expect(
      store.list("sets", { memberId: m.id, since: "2026-09-15T00:00:00.000Z" }).map((r: any) => r.id),
    ).toEqual(["b", "c"]);
  });

  it("deletes only the requested set, and only for its own member", () => {
    const andy = store.ensureMember("Andy");
    const bea = store.ensureMember("Bea");
    store.upsert("sets", [set({ id: "andy-1" })], { memberId: andy.id });
    store.upsert("sets", [set({ id: "bea-1" })], { memberId: bea.id });

    store.removeSet(bea.id, "andy-1"); // wrong owner: must do nothing
    expect(store.list("sets", { memberId: andy.id })).toHaveLength(1);

    store.removeSet(andy.id, "andy-1");
    expect(store.list("sets", { memberId: andy.id })).toHaveLength(0);
    expect(store.list("sets", { memberId: bea.id })).toHaveLength(1);
  });
});

maybe()("sessions and readiness", () => {
  it("keeps the readiness report as structured data, not a string", () => {
    const m = store.ensureMember("Andy");
    store.upsert(
      "sessions",
      [
        {
          id: "s-1",
          dayId: "day-2026-09-28",
          startedAt: "2026-09-28T09:00:00.000Z",
          completedAt: "2026-09-28T10:00:00.000Z",
          readiness: { energy: 4, motivation: 3, soreness: 2 },
          budgetMin: 90,
        },
      ],
      { memberId: m.id },
    );
    const rows = store.list("sessions", { memberId: m.id });
    expect(rows[0].readiness).toEqual({ energy: 4, motivation: 3, soreness: 2 });
    expect(rows[0].budgetMin).toBe(90);
  });
});

maybe()("health records", () => {
  it("stores a measurement with its unit and timestamp", () => {
    const m = store.ensureMember("Andy");
    store.upsert(
      "healthRecords",
      [{ id: "h-1", kind: "resting_heart_rate", value: 58, unit: "bpm", timestamp: "2026-09-28T07:00:00.000Z" }],
      { memberId: m.id },
    );
    const rows = store.list("healthRecords", { memberId: m.id });
    expect(rows[0]).toMatchObject({ kind: "resting_heart_rate", value: 58, unit: "bpm" });
  });

  it("refuses a record without a numeric value", () => {
    expect(() =>
      normalizeRow("healthRecords", { id: "h", kind: "sleep", timestamp: "t" }),
    ).toThrow(StoreInputError);
  });
});

maybe()("the BodyLab export payload", () => {
  it("stores one payload per member and kind, replacing the previous one", () => {
    const m = store.ensureMember("Andy");
    store.putExport(m.id, "bodylab-traininglab", JSON.stringify({ version: 2 }));
    store.putExport(m.id, "bodylab-traininglab", JSON.stringify({ version: 2, muscleScores: [] }));
    const got = store.getExport(m.id, "bodylab-traininglab");
    expect(JSON.parse(got.json)).toMatchObject({ muscleScores: [] });
    expect(got.updatedAt).toBeTruthy();
  });

  it("returns null when nothing has been uploaded", () => {
    const m = store.ensureMember("Andy");
    expect(store.getExport(m.id, "bodylab-traininglab")).toBeNull();
  });
});

maybe()("the family overview", () => {
  it("aggregates the last 7 days per member, empty members included", () => {
    const andy = store.ensureMember("Andy");
    store.ensureMember("Bea");
    const now = new Date();
    const recent = new Date(now.getTime() - 86_400_000).toISOString();
    const old = new Date(now.getTime() - 30 * 86_400_000).toISOString();

    store.upsert(
      "sets",
      [
        { id: "r1", exerciseId: "squat", dayId: "d", timestamp: recent, weight: 100, reps: 5 },
        { id: "r2", exerciseId: "squat", dayId: "d", timestamp: recent, weight: 100, reps: 5 },
        { id: "old", exerciseId: "squat", dayId: "d", timestamp: old, weight: 200, reps: 5 },
      ],
      { memberId: andy.id },
    );

    const overview = store.overview();
    const a = overview.find((r: any) => r.name === "Andy");
    const b = overview.find((r: any) => r.name === "Bea");
    expect(a.setsLast7d).toBe(2);
    expect(a.volumeLast7d).toBe(1000); // the 30-day-old set is excluded
    expect(a.lastSetAt).toBe(recent);
    expect(b.setsLast7d).toBe(0);
    expect(b.volumeLast7d).toBe(0);
  });

  it("ranks by the last week's volume", () => {
    const andy = store.ensureMember("Andy");
    const bea = store.ensureMember("Bea");
    const recent = new Date(Date.now() - 3600_000).toISOString();
    store.upsert(
      "sets",
      [{ id: "b", exerciseId: "squat", dayId: "d", timestamp: recent, weight: 50, reps: 10 }],
      { memberId: bea.id },
    );
    store.upsert(
      "sets",
      [{ id: "a", exerciseId: "squat", dayId: "d", timestamp: recent, weight: 10, reps: 10 }],
      { memberId: andy.id },
    );
    expect(store.overview().map((r: any) => r.name)).toEqual(["Bea", "Andy"]);
  });
});
