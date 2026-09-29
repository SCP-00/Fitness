/**
 * Shared LAN history — the client half of the household store.
 *
 * The app works entirely without this. When the local server is started with
 * `--shared`, though, a household can push its logs into one SQLite file on the
 * laptop and see each other's week, instead of every phone keeping a private
 * history that nobody can compare.
 *
 * The contract with the server is deliberately narrow: **id-keyed upserts only**.
 * Every set and session already carries the UUID the app generated, so re-sending
 * a batch is harmless — which is what makes "retry whenever the Wi-Fi comes back"
 * a safe default instead of a conflict-resolution problem. There is no merging,
 * no vector clock and no attempt to be clever about concurrent edits: the last
 * write to a given id wins, and the app says so out loud rather than pretending
 * otherwise.
 *
 * @module lib/shared
 */

import type { Readiness } from "@fitness/bodylab-training";
import type { TLSet, TLSession } from "./types";

/** A member of the household, identified by name alone (see `lan-store.mjs`). */
export interface SharedMember {
  id: string;
  name: string;
  createdAt: string;
  /** Present only in the response that created the member. */
  created?: boolean;
}

/** Per-member totals for the family panel. */
export interface FamilyRow {
  id: string;
  name: string;
  setsLast7d: number;
  volumeLast7d: number;
  lastSetAt: string | null;
}

/** A local health measurement (`traininglab` extension of the BodyLab vocabulary). */
export interface HealthRecord {
  id: string;
  kind: string;
  value: number;
  unit: string | null;
  timestamp: string;
  notes?: string | null;
}

/** Health record kinds the app offers, with the unit it expects. */
export const HEALTH_KINDS = [
  { id: "resting_heart_rate", unit: "bpm" },
  { id: "body_weight", unit: "kg" },
  { id: "sleep_hours", unit: "h" },
  { id: "systolic", unit: "mmHg" },
  { id: "diastolic", unit: "mmHg" },
  { id: "mood", unit: "/5" },
] as const;

export interface SharedSettings {
  enabled: boolean;
  /** Origin of the local server, e.g. `http://192.168.1.7:8090`. */
  baseUrl: string;
  /** Server-side member id, once claimed. */
  memberId: string | null;
  memberName: string;
  /** ISO timestamp of the last successful sync, for the status line. */
  lastSyncAt: string | null;
}

export const DEFAULT_SHARED: SharedSettings = {
  enabled: false,
  baseUrl: "",
  memberId: null,
  memberName: "",
  lastSyncAt: null,
};

/**
 * Where the server probably is.
 *
 * When the app is served *by* the LAN server (the phone case: the browser is on
 * `http://192.168.1.7:8090/traininglab/`) the API is on the same origin, which is
 * both correct and zero-configuration. Inside the desktop shell — or on any other
 * host — the server is on this machine, so loopback is the right guess.
 */
export function defaultSharedBaseUrl(): string {
  if (typeof window !== "undefined" && /^https?:$/.test(window.location.protocol)) {
    return window.location.origin;
  }
  return "http://localhost:8090";
}

/** Normalise a user-typed server URL: trim, drop a trailing slash, require http. */
export function normalizeBaseUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) return null;
  return /^https?:\/\/[^\s]+$/i.test(trimmed) ? trimmed : null;
}

// ── Transport ───────────────────────────────────────────────────────────────

/** How long a single request may take before the app stops waiting for it. */
const TIMEOUT_MS = 8000;

export class SharedError extends Error {
  /** HTTP status, or `null` when the request never reached a server. */
  status: number | null;

  // `erasableSyntaxOnly` (web/desktop tsconfig) rejects TS parameter properties,
  // so the field is declared and assigned by hand.
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "SharedError";
    this.status = status;
  }
}

/**
 * `fetch` with a timeout and a JSON contract.
 *
 * The timeout matters more than it looks: on a phone that walked out of Wi-Fi
 * range, an unbounded fetch leaves the promise (and the "syncing…" spinner)
 * pending forever. Eight seconds is long for a LAN and short enough not to be
 * noticed.
 */
async function request<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    if (!res.ok) {
      const message = typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
      throw new SharedError(message, res.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof SharedError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SharedError("timeout", null);
    }
    throw new SharedError(error instanceof Error ? error.message : "network error", null);
  } finally {
    clearTimeout(timer);
  }
}

/** Is a shared server there, and is it the store we expect? */
export async function pingShared(baseUrl: string): Promise<{ version: number; members: number }> {
  const body = await request<{ version?: number; members?: number }>(baseUrl, "/api/health");
  return { version: body.version ?? 0, members: body.members ?? 0 };
}

/** The soft login: claim a display name and get its id back. */
export async function claimMember(
  baseUrl: string,
  name: string,
  id?: string | null,
): Promise<SharedMember> {
  const body = await request<{ member: SharedMember }>(baseUrl, "/api/members", {
    method: "POST",
    body: JSON.stringify({ name, ...(id ? { id } : {}) }),
  });
  return body.member;
}

/** Everyone's last seven days. */
export async function fetchFamily(baseUrl: string): Promise<FamilyRow[]> {
  const body = await request<{ members: FamilyRow[] }>(baseUrl, "/api/family");
  return body.members ?? [];
}

export interface PulledData {
  sets: TLSet[];
  sessions: TLSession[];
  healthRecords: HealthRecord[];
  version: number;
}

/** Everything the server holds for one member (optionally since a timestamp). */
export async function pullMemberData(
  baseUrl: string,
  memberId: string,
  since?: string,
): Promise<PulledData> {
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const body = await request<PulledData>(baseUrl, `/api/members/${memberId}/data${query}`);
  return {
    sets: body.sets ?? [],
    sessions: body.sessions ?? [],
    healthRecords: body.healthRecords ?? [],
    version: body.version ?? 0,
  };
}

export async function pushSets(baseUrl: string, memberId: string, rows: TLSet[]): Promise<number> {
  const body = await request<{ upserted: number }>(baseUrl, `/api/members/${memberId}/sets`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
  return body.upserted ?? 0;
}

export async function pushSessions(
  baseUrl: string,
  memberId: string,
  rows: TLSession[],
): Promise<number> {
  const body = await request<{ upserted: number }>(baseUrl, `/api/members/${memberId}/sessions`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
  return body.upserted ?? 0;
}

export async function pushHealth(
  baseUrl: string,
  memberId: string,
  rows: HealthRecord[],
): Promise<number> {
  const body = await request<{ upserted: number }>(baseUrl, `/api/members/${memberId}/health`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
  return body.upserted ?? 0;
}

export async function deleteRemoteSet(
  baseUrl: string,
  memberId: string,
  setId: string,
): Promise<void> {
  await request(baseUrl, `/api/members/${memberId}/sets/${encodeURIComponent(setId)}`, {
    method: "DELETE",
  });
}

/** Upload the BodyLab export so every device plans from the same measurements. */
export async function pushExport(
  baseUrl: string,
  memberId: string,
  payload: unknown,
): Promise<void> {
  await request(baseUrl, `/api/members/${memberId}/export/bodylab-traininglab`, {
    method: "PUT",
    body: JSON.stringify({ json: JSON.stringify(payload) }),
  });
}

export async function pullExport(baseUrl: string, memberId: string): Promise<unknown | null> {
  try {
    const body = await request<{ json?: string }>(
      baseUrl,
      `/api/members/${memberId}/export/bodylab-traininglab`,
    );
    return body.json ? (JSON.parse(body.json) as unknown) : null;
  } catch (error) {
    // "nobody has uploaded one yet" is a normal answer, not a failure.
    if (error instanceof SharedError && error.status === 404) return null;
    throw error;
  }
}

// ── Merge ───────────────────────────────────────────────────────────────────

/**
 * Union two set lists by id, newest write winning per id.
 *
 * The server and the device can both be ahead of the other (logged at the gym
 * offline, or on another phone), so the merge is symmetric on purpose: it makes
 * no assumption about which side is authoritative. `updatedAt` is absent on the
 * client's own rows, so it falls back to the timestamp, which is the only clock
 * both sides share.
 */
export function mergeSets(local: TLSet[], remote: TLSet[]): TLSet[] {
  const byId = new Map<string, TLSet>();
  for (const set of local) byId.set(set.id, set);
  for (const set of remote) {
    const existing = byId.get(set.id);
    // A remote row for an id we do not have, or a newer copy of one we do.
    if (!existing || set.timestamp >= existing.timestamp) {
      byId.set(set.id, { ...existing, ...set });
    }
  }
  return [...byId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Same rule as {@link mergeSets}, for sessions. */
export function mergeSessions(local: TLSession[], remote: TLSession[]): TLSession[] {
  const byId = new Map<string, TLSession>();
  for (const s of local) byId.set(s.id, s);
  for (const s of remote) {
    const existing = byId.get(s.id);
    if (!existing || (s.completedAt ?? s.startedAt) >= (existing.completedAt ?? existing.startedAt)) {
      byId.set(s.id, { ...existing, ...s });
    }
  }
  return [...byId.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

/** Same rule again, for health records. */
export function mergeHealth(local: HealthRecord[], remote: HealthRecord[]): HealthRecord[] {
  const byId = new Map<string, HealthRecord>();
  for (const r of local) byId.set(r.id, r);
  for (const r of remote) if (!byId.has(r.id)) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * One-line status for the settings block.
 *
 * Returns a code rather than a sentence, and the UI translates it — the same rule
 * the planner follows, so no Spanish copy can end up baked into a module.
 */
export type SharedStatus =
  | "off"
  | "unconfigured"
  | "never-synced"
  | "ok"
  | "stale"
  | "error";

export function sharedStatus(
  settings: SharedSettings,
  at: Date = new Date(),
): SharedStatus {
  if (!settings.enabled) return "off";
  if (!normalizeBaseUrl(settings.baseUrl) || !settings.memberId) return "unconfigured";
  if (!settings.lastSyncAt) return "never-synced";
  const age = at.getTime() - new Date(settings.lastSyncAt).getTime();
  return age > 10 * 60_000 ? "stale" : "ok";
}

/** A readiness report is stored as JSON by the server; type the round trip. */
export type StoredReadiness = Readiness;
