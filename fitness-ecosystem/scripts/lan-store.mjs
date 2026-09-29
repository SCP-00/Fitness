#!/usr/bin/env node
/**
 * Shared LAN store — the optional "household" database.
 *
 * What this is
 * ------------
 * Both apps are 100 % local and stay that way: each device owns its IndexedDB
 * and needs no server for anything. This module adds an *opt-in* alternative for
 * a household — a tiny HTTP + SQLite store that the LAN server exposes so
 * several phones/laptops on the same Wi-Fi can log into one shared history
 * instead of four private ones.
 *
 * What this is NOT
 * ----------------
 * **It is not authentication and must never be described as security.** The
 * "login" is a display name you claim: no password, no token, no session cookie,
 * and every member's rows are readable by anyone who can reach the port. That is
 * an acceptable trade on a home network and unacceptable on a public one — hence
 * the loud warning the server prints, and the deliberate decision not to expose
 * this beyond the LAN.
 *
 * Design rules that come from the rest of the project
 * --------------------------------------------------
 *   * **UUID + upsert, never insert-or-fail.** Every row is keyed by the id the
 *     client already generated (the same convention as BodyLab's import), so
 *     pushing the same batch twice is a no-op and two devices that logged the
 *     same set cannot fork history.
 *   * **`updated_at` on every row**, and last write wins per row. With no
 *     server-clock authority that is the only honest conflict rule.
 *   * **Values are validated at the boundary.** HTTP bodies are hostile until
 *     proven otherwise: unknown fields are dropped, numbers are type-checked,
 *     and a row without the fields the schema requires is rejected instead of
 *     silently stored half-empty.
 *
 * Storage comes from `node:sqlite` (Node 22.5+, stable in 24). That is a real
 * requirement of *this optional feature only* and is checked with a clear error
 * rather than a crash: the apps themselves still run on Node >= 20.
 *
 * @module scripts/lan-store
 */

import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

/** Bumped when the client needs to know something changed (see /api/health). */
export const STORE_VERSION = 1;

/** Name of the file inside the data directory. */
export const DB_FILENAME = "fitness.sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  member_id    TEXT NOT NULL,
  day_id       TEXT NOT NULL,
  started_at   TEXT NOT NULL,
  completed_at TEXT,
  readiness    TEXT,
  budget_min   INTEGER,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_member ON sessions(member_id, started_at);

CREATE TABLE IF NOT EXISTS sets (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL,
  session_id  TEXT,
  exercise_id TEXT NOT NULL,
  day_id      TEXT NOT NULL,
  timestamp   TEXT NOT NULL,
  weight      REAL,
  reps        INTEGER,
  rpe         REAL,
  notes       TEXT,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sets_member_ts ON sets(member_id, timestamp);

CREATE TABLE IF NOT EXISTS health_records (
  id         TEXT PRIMARY KEY,
  member_id  TEXT NOT NULL,
  kind       TEXT NOT NULL,
  value      REAL NOT NULL,
  unit       TEXT,
  timestamp  TEXT NOT NULL,
  notes      TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS health_member_ts ON health_records(member_id, timestamp);

CREATE TABLE IF NOT EXISTS payloads (
  member_id  TEXT NOT NULL,
  kind       TEXT NOT NULL,
  json       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (member_id, kind)
);
`;

/**
 * Table layout: API field name → human description of the accepted shape.
 *
 * Written out rather than derived, because this doubles as the validation table
 * and as the documentation of what the wire format actually is.
 */
const TABLES = {
  sessions: {
    columns: [
      "id",
      "memberId",
      "dayId",
      "startedAt",
      "completedAt",
      "readiness",
      "budgetMin",
    ],
    text: ["id", "memberId", "dayId", "startedAt", "completedAt"],
    numbers: ["budgetMin"],
    json: ["readiness"],
    required: ["id", "dayId", "startedAt"],
  },
  sets: {
    columns: [
      "id",
      "memberId",
      "sessionId",
      "exerciseId",
      "dayId",
      "timestamp",
      "weight",
      "reps",
      "rpe",
      "notes",
    ],
    text: [
      "id",
      "memberId",
      "sessionId",
      "exerciseId",
      "dayId",
      "timestamp",
      "notes",
    ],
    numbers: ["weight", "reps", "rpe"],
    json: [],
    required: ["id", "exerciseId", "dayId", "timestamp"],
  },
  healthRecords: {
    columns: ["id", "memberId", "kind", "value", "unit", "timestamp", "notes"],
    text: ["id", "memberId", "kind", "unit", "timestamp", "notes"],
    numbers: ["value"],
    json: [],
    required: ["id", "kind", "value", "timestamp"],
  },
};

const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// ── Validation ──────────────────────────────────────────────────────────────

export class StoreInputError extends Error {}

/**
 * Normalise one incoming row against its table definition.
 *
 * Everything not in the table's column list is dropped; text fields must be
 * non-empty strings, numbers must be finite, and a missing required field
 * throws. `memberId` is filled in by the route, never by the body — otherwise a
 * request could write into somebody else's history.
 */
export function normalizeRow(table, raw, { memberId } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new StoreInputError(`${table}: each row must be an object`);
  }
  const spec = TABLES[table];
  if (!spec) throw new StoreInputError(`unknown table ${table}`);

  const row = {};
  for (const field of spec.columns) {
    if (field === "memberId") continue;
    const value = raw[field];
    if (value === undefined) continue;

    if (spec.json.includes(field)) {
      row[field] = value ?? null;
      continue;
    }
    if (spec.text.includes(field)) {
      if (value === null) {
        row[field] = null;
        continue;
      }
      if (typeof value !== "string" || value.length === 0) {
        throw new StoreInputError(`${table}.${field} must be a non-empty string`);
      }
      if (value.length > 4096) {
        throw new StoreInputError(`${table}.${field} is too long`);
      }
      row[field] = value;
      continue;
    }
    if (spec.numbers.includes(field)) {
      if (value === null) {
        row[field] = null;
        continue;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new StoreInputError(`${table}.${field} must be a finite number or null`);
      }
      row[field] = value;
      continue;
    }
  }

  for (const field of spec.required) {
    if (row[field] === undefined || row[field] === null) {
      throw new StoreInputError(`${table}.${field} is required`);
    }
  }

  // The member always comes from the route, never from the payload: a client must
  // not be able to push rows into another member's log by editing the body.
  return { ...row, memberId };
}

/** A display name for the soft login: trimmed, 1–40 chars, no control chars. */
export function normalizeMemberName(raw) {
  if (typeof raw !== "string") throw new StoreInputError("name must be a string");
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (name.length === 0) throw new StoreInputError("name cannot be empty");
  if (name.length > 40) throw new StoreInputError("name is limited to 40 characters");
  return name;
}

// ── Store ───────────────────────────────────────────────────────────────────

/**
 * Open (or create) the shared store in `dir`.
 *
 * @returns {{
 *   backend: string, file: string, close: () => void,
 *   upsert: (table: string, rows: unknown[], ctx: {memberId: string}) => number,
 *   list: (table: string, opts?: object) => unknown[],
 *   removeSet: (memberId: string, id: string) => void,
 *   members: () => unknown[],
 *   ensureMember: (name: string, id?: string) => unknown,
 *   member: (id: string) => unknown | null,
 *   putExport: (memberId: string, kind: string, json: string) => void,
 *   getExport: (memberId: string, kind: string) => { json: string, updatedAt: string } | null,
 *   overview: () => unknown[]
 * }}
 */
export function createLanStore({ dir }) {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = createRequire(import.meta.url)("node:sqlite"));
  } catch {
    throw new Error(
      "the shared LAN store needs the built-in node:sqlite module (Node 22.5+). " +
        `You are on ${process.version}. Run the server on a newer Node, or start it ` +
        "without --shared to keep serving the apps without a shared database.",
    );
  }

  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, DB_FILENAME);

  const db = new DatabaseSync(file);
  // WAL keeps the read path (family overview while somebody is logging) from
  // blocking on the writer, and survives a hard power cut on a laptop.
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = OFF;"); // no FK constraints: partial pushes are legal
  db.exec(SCHEMA);

  /** Bind values in column order, serialising JSON columns. */
  const bind = (row, columns) =>
    columns.map((c) =>
      row[c] === undefined
        ? null
        : row[c] !== null && typeof row[c] === "object"
          ? JSON.stringify(row[c])
          : row[c],
    );

  function upsert(table, rows, ctx) {
    const spec = TABLES[table];
    // `updatedAt` is server-owned: it is added here, never read from the body.
    const all = [...spec.columns, "updatedAt"];
    const cols = all.map(snake);
    const update = all
      .filter((c) => c !== "id" && c !== "memberId")
      .map((c) => `${snake(c)} = excluded.${snake(c)}`)
      .join(", ");
    const stmt = db.prepare(
      `INSERT INTO ${snake(table)} (${cols.join(", ")})
       VALUES (${cols.map(() => "?").join(", ")})
       ON CONFLICT(id) DO UPDATE SET ${update}`,
    );

    let n = 0;
    for (const raw of rows) {
      const row = { ...normalizeRow(table, raw, ctx), updatedAt: new Date().toISOString() };
      stmt.run(...bind(row, all));
      n += 1;
    }
    return n;
  }

  /** Read rows for one member, oldest first, optionally since an ISO timestamp. */
  function list(table, { memberId, since, limit = 5000 } = {}) {
    const where = ["member_id = ?"];
    const params = [memberId];
    if (since) {
      where.push("timestamp >= ?");
      params.push(since);
    }
    const order = table === "sessions" ? "started_at" : "timestamp";
    const stmt = db.prepare(
      `SELECT * FROM ${snake(table)} WHERE ${where.join(" AND ")}
       ORDER BY ${order} ASC LIMIT ?`,
    );
    return stmt.all(...params, limit).map((r) => {
      const out = {};
      for (const [k, v] of Object.entries(r)) out[camel(k)] = decode(v);
      return out;
    });
  }

  function members() {
    return db
      .prepare("SELECT id, name, created_at FROM members ORDER BY created_at ASC")
      .all()
      .map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
  }

  function member(id) {
    const r = db.prepare("SELECT id, name, created_at FROM members WHERE id = ?").get(id);
    return r ? { id: r.id, name: r.name, createdAt: r.created_at } : null;
  }

  /**
   * The soft login: find the name or create it.
   *
   * Case-insensitive on purpose — "Ana" and "ana" are the same person on a home
   * network, and silently creating a second profile is the one failure mode that
   * would make the shared history useless.
   */
  function ensureMember(name, id) {
    const clean = normalizeMemberName(name);
    if (id) {
      const existing = member(id);
      if (existing) return { ...existing, created: false };
    }
    const found = db
      .prepare("SELECT id, name, created_at FROM members WHERE lower(name) = lower(?)")
      .get(clean);
    if (found) return { id: found.id, name: found.name, createdAt: found.created_at, created: false };

    const row = {
      id: id ?? globalThis.crypto.randomUUID(),
      name: clean,
      createdAt: new Date().toISOString(),
    };
    db.prepare("INSERT INTO members (id, name, created_at) VALUES (?, ?, ?)").run(
      row.id,
      row.name,
      row.createdAt,
    );
    return { ...row, created: true };
  }

  function removeSet(memberId, id) {
    db.prepare("DELETE FROM sets WHERE id = ? AND member_id = ?").run(id, memberId);
  }

  function putExport(memberId, kind, json) {
    db.prepare(
      `INSERT INTO payloads (member_id, kind, json, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(member_id, kind) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
    ).run(memberId, kind, json, new Date().toISOString());
  }

  function getExport(memberId, kind) {
    const r = db
      .prepare("SELECT json, updated_at FROM payloads WHERE member_id = ? AND kind = ?")
      .get(memberId, kind);
    return r ? { json: r.json, updatedAt: r.updated_at } : null;
  }

  /**
   * The "family" view: one line per member with the numbers a household actually
   * compares — how much has been trained in the last 7 days, and when they last
   * showed up. Aggregated in SQL so it stays O(1) in the number of sets.
   */
  function overview() {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const rows = db
      .prepare(
        `SELECT m.id, m.name,
                COALESCE(SUM(CASE WHEN s.timestamp >= ? THEN 1 ELSE 0 END), 0) AS sets_7d,
                COALESCE(SUM(CASE WHEN s.timestamp >= ? THEN COALESCE(s.weight,0) * COALESCE(s.reps,0) ELSE 0 END), 0) AS volume_7d,
                MAX(s.timestamp) AS last_set_at
           FROM members m
           LEFT JOIN sets s ON s.member_id = m.id
          GROUP BY m.id
          ORDER BY volume_7d DESC, m.name ASC`,
      )
      .all(since, since);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      setsLast7d: Number(r.sets_7d),
      volumeLast7d: Math.round(Number(r.volume_7d)),
      lastSetAt: r.last_set_at ?? null,
    }));
  }

  return {
    backend: "sqlite",
    file,
    upsert,
    list,
    members,
    member,
    ensureMember,
    removeSet,
    putExport,
    getExport,
    overview,
    close: () => db.close(),
  };
}

/** JSON columns come back as strings; callers want the objects. */
function decode(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}
