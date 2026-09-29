#!/usr/bin/env node
/**
 * HTTP surface of the shared LAN store.
 *
 * Kept out of `serve-lan.mjs` on purpose: that file is a static file server with
 * one job, and this is a small JSON API with a different job. They meet at a
 * single call site.
 *
 * The wire format mirrors the app's own vocabulary (`TLSet`, `TLSession`, health
 * records) rather than a generic table API, so the client can push the objects it
 * already has without a translation layer that could drift.
 *
 * ### Endpoints
 * ```
 * GET    /api/health                        → { ok, version, backend, members }
 * GET    /api/family                        → per-member 7-day totals
 * GET    /api/members                       → [{ id, name, createdAt }]
 * POST   /api/members        { name, id? }  → member (the soft login)
 * GET    /api/members/:id/data?since=ISO    → { sets, sessions, healthRecords }
 * POST   /api/members/:id/sets       { rows: [...] }
 * POST   /api/members/:id/sessions   { rows: [...] }
 * POST   /api/members/:id/health     { rows: [...] }
 * DELETE /api/members/:id/sets/:setId
 * GET    /api/members/:id/export/:kind      → { json, updatedAt }
 * PUT    /api/members/:id/export/:kind      { json }
 * ```
 *
 * ### What is deliberately missing
 * Any form of credential. Every request is trusted up to the point of not being
 * allowed to write into *another* member's rows (the member comes from the path,
 * never from the body). See the warning in `lan-store.mjs`: this is a household
 * convenience, not a security boundary.
 *
 * @module scripts/lan-api
 */

import { STORE_VERSION, StoreInputError } from "./lan-store.mjs";

/** Bodies larger than this are refused: a household log is never this big. */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Kinds of stored export payload accepted in the `payloads` table. */
const EXPORT_KINDS = new Set(["bodylab-traininglab"]);

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function fail(res, status, message) {
  send(res, status, { ok: false, error: message });
}

/** Read + parse a JSON body with a hard size cap. */
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new StoreInputError(`body larger than ${MAX_BODY_BYTES} bytes`);
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new StoreInputError("body is not valid JSON");
  }
}

/** `{ rows: [...] }` or a bare array — accept both, they cost nothing. */
function rowsOf(body) {
  const rows = Array.isArray(body) ? body : body?.rows;
  if (!Array.isArray(rows)) throw new StoreInputError("expected an array or { rows: [...] }");
  if (rows.length > 2000) throw new StoreInputError("at most 2000 rows per request");
  return rows;
}

/**
 * Build the request handler.
 *
 * @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, url: URL) => Promise<boolean>}
 *   Resolves `true` when the request was an API call (handled), `false` when the
 *   caller should fall through to static file serving.
 */
export function createApiHandler({ store }) {
  return async function handleApi(req, res, url) {
    if (!url.pathname.startsWith("/api/")) return false;

    // The desktop shell runs on a different origin (tauri://localhost, or
    // http://localhost:5174 in dev) than the served web app, so it needs CORS.
    // No credentials are involved, so a permissive origin is safe here — and it
    // is what lets the same server back both hosts.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return true;
    }

    const parts = url.pathname.split("/").filter(Boolean); // ["api", ...]
    const [, resource, memberId, sub, extra] = parts;

    try {
      // ── Health ────────────────────────────────────────────────────────────
      if (resource === "health") {
        send(res, 200, {
          ok: true,
          version: STORE_VERSION,
          backend: store.backend,
          members: store.members().length,
        });
        return true;
      }

      // ── Family overview ───────────────────────────────────────────────────
      if (resource === "family") {
        send(res, 200, { ok: true, members: store.overview() });
        return true;
      }

      // ── Members (the soft login) ──────────────────────────────────────────
      if (resource === "members" && !memberId) {
        if (req.method === "GET") {
          send(res, 200, { ok: true, members: store.members() });
          return true;
        }
        if (req.method === "POST") {
          const body = await readJson(req);
          const created = store.ensureMember(body?.name, body?.id);
          send(res, created.created ? 201 : 200, { ok: true, member: created });
          return true;
        }
        fail(res, 405, "method not allowed");
        return true;
      }

      if (resource === "members" && memberId && !sub) {
        const found = store.member(memberId);
        if (!found) return fail(res, 404, "unknown member"), true;
        send(res, 200, { ok: true, member: found });
        return true;
      }

      // Everything below is member-scoped.
      if (resource !== "members" || !memberId) {
        fail(res, 404, `no such endpoint: ${url.pathname}`);
        return true;
      }
      if (!store.member(memberId)) {
        fail(res, 404, "unknown member");
        return true;
      }

      const ctx = { memberId };

      // ── Bulk read for the initial sync ────────────────────────────────────
      if (sub === "data" && req.method === "GET") {
        const since = url.searchParams.get("since") ?? undefined;
        send(res, 200, {
          ok: true,
          version: STORE_VERSION,
          sets: store.list("sets", { memberId, since }),
          sessions: store.list("sessions", { memberId, since }),
          healthRecords: store.list("healthRecords", { memberId, since }),
        });
        return true;
      }

      // ── Bulk push ─────────────────────────────────────────────────────────
      const tableFor = { sets: "sets", sessions: "sessions", health: "healthRecords" };
      if (sub && tableFor[sub] && req.method === "POST") {
        const body = await readJson(req);
        const upserted = store.upsert(tableFor[sub], rowsOf(body), ctx);
        send(res, 200, { ok: true, upserted });
        return true;
      }

      // ── Delete a mistyped set ─────────────────────────────────────────────
      if (sub === "sets" && extra && req.method === "DELETE") {
        store.removeSet(memberId, extra);
        send(res, 200, { ok: true });
        return true;
      }

      // ── BodyLab export payload (the one thing that genuinely travels) ─────
      if (sub === "export" && extra) {
        if (!EXPORT_KINDS.has(extra)) return fail(res, 400, "unsupported export kind"), true;
        if (req.method === "GET") {
          const found = store.getExport(memberId, extra);
          if (!found) return fail(res, 404, "no export stored"), true;
          send(res, 200, { ok: true, ...found });
          return true;
        }
        if (req.method === "PUT" || req.method === "POST") {
          const body = await readJson(req);
          const json = typeof body?.json === "string" ? body.json : JSON.stringify(body?.json ?? null);
          store.putExport(memberId, extra, json);
          send(res, 200, { ok: true });
          return true;
        }
        fail(res, 405, "method not allowed");
        return true;
      }

      fail(res, 404, `no such endpoint: ${url.pathname}`);
      return true;
    } catch (error) {
      if (error instanceof StoreInputError) {
        fail(res, 400, error.message);
        return true;
      }
      // A store failure is a server problem and must not look like a client
      // mistake: log it for the person running the server, answer 500.
      console.error("[lan-api] unexpected error:", error);
      fail(res, 500, "internal error");
      return true;
    }
  };
}
