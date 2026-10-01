/**
 * Hash router — the whole navigation layer, in one file and zero dependencies.
 *
 * Why a hash router rather than a router package: this app is shipped into three
 * very different hosts (the Vite dev server, the one-page LAN server at
 * `/traininglab/`, and the Tauri WebView) and every one of them can serve a
 * static `index.html`. A hash needs no rewrite rules, no server config and no
 * 12 KB of client code — and it gives us, for free, the three things we actually
 * wanted:
 *
 *   1. the iPhone back-swipe and the browser back button work;
 *   2. any card can deep-link to its detail (`#/ejercicios/remo-con-barra`);
 *   3. a screen is addressable, so Playwright and the screenshot script can
 *      open it directly instead of clicking through the UI.
 *
 * @module app/router
 */

import { useEffect, useState } from "react";

/**
 * The six destinations. Everything else is a parameter of one of them.
 *
 * `week` arrived with the Inicio slimming (2026-09-30 f): the weekly plan, its
 * regeneration and its explanation are a surface of their own, so Inicio can
 * answer one question (what do I do now?) instead of four.
 */
export type RouteId =
  "today" | "exercises" | "week" | "session" | "progress" | "settings";

export interface Route {
  id: RouteId;
  /**
   * Segments after the destination. `#/ejercicios/traps/remo` → `["traps", "remo"]`.
   * Screens interpret them; the router never does.
   */
  params: string[];
}

/**
 * URL segment → destination. Spanish segments are canonical (the UI copy is
 * Spanish-first) with the English word accepted as an alias so a hand-typed or
 * bookmarked URL from the mirrored copy still lands.
 */
const SEGMENTS: Record<string, RouteId> = {
  hoy: "today",
  today: "today",
  inicio: "today",
  ejercicios: "exercises",
  exercises: "exercises",
  semana: "week",
  week: "week",
  sesion: "session",
  session: "session",
  entrenamiento: "session",
  progreso: "progress",
  progress: "progress",
  ajustes: "settings",
  settings: "settings",
};

/** The canonical hash for a destination (what `href` and `navigate` write). */
export const HASH: Record<RouteId, string> = {
  today: "#/hoy",
  exercises: "#/ejercicios",
  week: "#/semana",
  session: "#/sesion",
  progress: "#/progreso",
  settings: "#/ajustes",
};

/** Route segment per destination — one source for every plain `<a href>`. */
export const SEGMENT: Record<RouteId, string> = {
  today: "hoy",
  exercises: "ejercicios",
  week: "semana",
  session: "sesion",
  progress: "progreso",
  settings: "ajustes",
};

/** Parse a `location.hash` (with or without the leading `#`) into a route. */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [head = "", ...params] = path.split("/").filter(Boolean);
  return { id: SEGMENTS[head.toLowerCase()] ?? "today", params };
}

/** Build a hash for a destination plus optional params, URL-encoded. */
export function hashFor(id: RouteId, params: string[] = []): string {
  if (params.length === 0) return HASH[id];
  return `${HASH[id]}/${params.map(encodeURIComponent).join("/")}`;
}

/**
 * Navigate imperatively. Assigning `location.hash` pushes a history entry, which
 * is what makes the back gesture work; use `replace` when navigating *because*
 * of a redirect (a deep link to something that no longer exists).
 */
export function navigate(id: RouteId, params: string[] = []): void {
  const next = hashFor(id, params);
  if (window.location.hash === next) return;
  window.location.hash = next;
}

/** Replace the current entry instead of pushing a new one. */
export function replace(id: RouteId, params: string[] = []): void {
  const next = hashFor(id, params);
  window.history.replaceState(null, "", next);
}

/**
 * The current route, re-rendering on every hash change.
 *
 * An empty hash is normalised to `#/hoy` on first paint so a fresh load has an
 * address to come back to (the state itself is not rewritten: replacing the URL
 * before the user has interacted would be a history entry they did not ask for).
 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    onChange();
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}
