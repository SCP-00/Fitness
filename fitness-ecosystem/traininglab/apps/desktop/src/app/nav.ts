/**
 * The eight destinations of the approved mockup — one definition, one rail.
 *
 * **2026-10-14 (migration).** The mockup (`fitness-ecosystem/mockup/`,
 * `01-hoy.html` … `09-ajustes.html`) is the production front now, so this list
 * is the mockup's rail, in the mockup's order: the day first, then the queue,
 * the record, the shape of the work, the library, the week, the templates and
 * the settings. The icons are the mockup's own glyphs (`ui/mockup-icons.tsx`),
 * not the old drawn set, so the rail renders exactly like the pages the owner
 * approved.
 *
 * The session (ZEN logger) is deliberately absent: in the mockup it is opened
 * from Hoy with "Empezar" and closed with "Salir", never a destination of its
 * own. Its route lives on in `app/router.ts` (`#/sesion`).
 *
 * @module app/nav
 */

import type { ComponentType } from "react";
import { MIcons, type MockIconProps } from "../ui/mockup-icons";
import type { RouteId } from "./router";

export interface Destination {
  id: RouteId;
  /** i18n key, resolved by the shell (`t(dest.labelKey)`). */
  labelKey: string;
  icon: ComponentType<MockIconProps>;
}

export const DESTINATIONS: Destination[] = [
  { id: "today", labelKey: "nav.today", icon: MIcons.home },
  { id: "training", labelKey: "nav.training", icon: MIcons.dumbbell },
  { id: "history", labelKey: "nav.history", icon: MIcons.clock },
  { id: "progress", labelKey: "nav.progress", icon: MIcons.chart },
  { id: "exercises", labelKey: "nav.exercises", icon: MIcons.library },
  { id: "week", labelKey: "nav.week", icon: MIcons.calendar },
  { id: "routines", labelKey: "nav.routines", icon: MIcons.list },
  { id: "settings", labelKey: "nav.settings", icon: MIcons.settings },
];

/**
 * The phone's four fixed destinations plus the "More" sheet (2026-10-19).
 *
 * The rail is a desktop surface: at 390 px its eight labels needed 2.55 screens
 * of horizontal scrolling and every target was 41 px tall. The phone gets one
 * bottom bar with four destinations and a sheet for the other four, so nothing
 * scrolls, every target is 56 px, and the active destination is the only one
 * that spends width on its name. The split is deliberately by *frequency of
 * use while training*, not by the mockup's rail order: Hoy, Entrenamiento,
 * Historial and Progreso are the four a session touches; Ejercicios, Semana,
 * Rutinas and Configuración are planning surfaces.
 *
 * Every destination appears exactly once across the two lists — pinned by
 * `tests/training/test_mobile_nav.test.ts`.
 */
export const MOBILE_PRIMARY: RouteId[] = [
  "today",
  "training",
  "history",
  "progress",
];

export const MOBILE_SECONDARY: RouteId[] = [
  "exercises",
  "week",
  "routines",
  "settings",
];

/** The destination a control renders, by id. */
export function destinationFor(id: RouteId): Destination {
  return DESTINATIONS.find((dest) => dest.id === id) ?? DESTINATIONS[0]!;
}
