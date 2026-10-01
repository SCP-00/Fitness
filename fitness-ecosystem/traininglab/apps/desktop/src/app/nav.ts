/**
 * The six destinations — one definition, two shells.
 *
 * The desktop rail and the phone tab bar are the *same* list rendered in two
 * directions, so a destination can never exist in one and be missing from the
 * other. `centre` marks the phone-only FAB (starting a session is the one action
 * worth a raised button); everything else is a plain item.
 *
 * The order is the user's path: see the day (Inicio), look something up
 * (Ejercicios), check the shape of the week (Semana), execute it (Entrenar),
 * review it (Progreso), configure it (Ajustes).
 *
 * @module app/nav
 */

import type { ComponentType } from "react";
import {
  IconCalendar,
  IconChart,
  IconDumbbell,
  IconHome,
  IconPlay,
  IconSettings,
  type IconProps,
} from "../ui/icons";
import type { RouteId } from "./router";

export interface Destination {
  id: RouteId;
  /** i18n key, resolved by the shell (`t(dest.labelKey)`). */
  labelKey: string;
  icon: ComponentType<IconProps>;
  /** Rendered as the raised centre button on the phone tab bar. */
  centre?: boolean;
}

export const DESTINATIONS: Destination[] = [
  { id: "today", labelKey: "nav.today", icon: IconHome },
  { id: "exercises", labelKey: "nav.exercises", icon: IconDumbbell },
  { id: "week", labelKey: "nav.week", icon: IconCalendar },
  { id: "session", labelKey: "nav.session", icon: IconPlay, centre: true },
  { id: "progress", labelKey: "nav.progress", icon: IconChart },
  { id: "settings", labelKey: "nav.settings", icon: IconSettings },
];
