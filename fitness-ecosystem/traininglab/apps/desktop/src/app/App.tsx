/**
 * The shell — where the app decides what the user is looking at.
 *
 * One definition of the six destinations drives both navigations: a fixed rail
 * from 1024 px up, a bottom tab bar below it. They come from the same list
 * (`app/nav.ts`), so a destination can never exist in one and be missing from the
 * other, and neither contains a screen. Both read their `href` from
 * `SEGMENT` in `app/router` — the URL is written in exactly one place.
 *
 * The two containers carry their own responsive visibility in CSS
 * (`.tl-rail` / `.tl-tabbar`) rather than through utility classes: the design
 * system is unlayered CSS, so it would otherwise win against Tailwind's layered
 * `hidden` and both would render at once.
 *
 * @module app/App
 */

import { lazy, Suspense, useEffect, useState } from "react";
import { getExerciseById } from "@fitness/bodylab-exercises";
import { DESTINATIONS } from "./nav";
import { SEGMENT, useRoute, type Route, type RouteId } from "./router";
import { TrainingLabProvider } from "./store";
import { t } from "../lib/i18n";

const TodayScreen = lazy(() => import("../screens/TodayScreen"));
const WeekScreen = lazy(() => import("../screens/WeekScreen"));
const ExercisesScreen = lazy(() => import("../screens/ExercisesScreen"));
const ExerciseDetailScreen = lazy(() => import("../screens/ExerciseDetailScreen"));
const SessionScreen = lazy(() => import("../screens/SessionScreen"));
const ProgressScreen = lazy(() => import("../screens/ProgressScreen"));
const SettingsScreen = lazy(() => import("../screens/SettingsScreen"));

function ScreenFallback() {
  return (
    <div
      className="flex items-center justify-center min-h-[40vh] p-8 text-center"
      role="status"
      aria-label="Cargando"
    >
      <div className="w-8 h-8 border-2 border-[var(--tl-border)] border-t-[var(--tl-accent)] rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const [railOpen, setRailOpen] = useState(() => {
    try {
      return window.localStorage.getItem("traininglab.rail") !== "compact";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "traininglab.rail",
        railOpen ? "open" : "compact",
      );
    } catch {
      // The shell remains usable if storage is unavailable in a restricted WebView.
    }
  }, [railOpen]);

  return (
    <TrainingLabProvider>
      <div
        className={`tl-shell ${railOpen ? "is-rail-open" : "is-rail-compact"}`}
      >
        <SideRail
          active={route.id}
          open={railOpen}
          onToggle={() => setRailOpen((value) => !value)}
        />
        <main className="tl-main">
          <Suspense fallback={<ScreenFallback />}>
            <Screen route={route} />
          </Suspense>
        </main>
        <TabBar active={route.id} />
      </div>
    </TrainingLabProvider>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Routing
   ══════════════════════════════════════════════════════════════════════════ */

function Screen({ route }: { route: Route }) {
  switch (route.id) {
    case "exercises": {
      // `#/ejercicios/<id>` is a detail, `#/ejercicios/<family>` is a filter and
      // `#/ejercicios/<id>/<tab>` is a tab. The catalog is what disambiguates,
      // which keeps the router free of screen knowledge.
      const [first, second] = route.params;
      if (first && getExerciseById(first)) {
        return <ExerciseDetailScreen exerciseId={first} tab={second} />;
      }
      return <ExercisesScreen initialFamily={first} />;
    }
    case "today":
      return <TodayScreen />;
    case "week":
      return <WeekScreen />;
    case "session":
      return <SessionScreen />;
    case "progress":
      return <ProgressScreen />;
    case "settings":
      return <SettingsScreen />;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Desktop rail
   ══════════════════════════════════════════════════════════════════════════ */

function SideRail({
  active,
  open,
  onToggle,
}: {
  active: RouteId;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className="tl-rail">
      <div className="tl-rail-head">
        <a href="#/hoy" className="tl-rail-brand tl-focusable">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            width={28}
            height={28}
            className="w-7 h-7 rounded-lg"
          />
          <span className="text-[var(--tl-text)]">
            Training<span>Lab</span>
          </span>
        </a>
        <button
          type="button"
          className="tl-rail-toggle tl-focusable"
          onClick={onToggle}
          aria-label={
            open ? "Contraer panel lateral" : "Expandir panel lateral"
          }
          title={open ? "Contraer panel lateral" : "Expandir panel lateral"}
        >
          <span aria-hidden>{open ? "‹" : "›"}</span>
        </button>
      </div>

      <nav className="tl-nav" aria-label={t("nav.label")}>
        {DESTINATIONS.map((dest) => {
          const Icon = dest.icon;
          const on = dest.id === active;
          return (
            <a
              key={dest.id}
              href={`#/${SEGMENT[dest.id]}`}
              aria-current={on ? "page" : undefined}
              className={`tl-nav-item tl-focusable ${on ? "is-active" : ""}`}
              title={t(dest.labelKey)}
            >
              <Icon size={19} />
              <span className="tl-nav-label">{t(dest.labelKey)}</span>
            </a>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="tl-offline-card">
          <div className="tl-offline-status">
            <span className="tl-offline-dot" />
            <span className="text-sm">{t("nav.offline")}</span>
          </div>
          <p className="text-[11px] text-[var(--tl-text-muted)] leading-relaxed">
            {t("nav.offlineHint")}
          </p>
        </div>
        <p className="tl-quote">{t("nav.motto")}</p>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Phone tab bar
   ══════════════════════════════════════════════════════════════════════════ */

function TabBar({ active }: { active: RouteId }) {
  return (
    <nav className="tl-tabbar" aria-label={t("nav.label")}>
      {DESTINATIONS.map((dest) => {
        const Icon = dest.icon;
        const on = dest.id === active;
        if (dest.centre) {
          return (
            <a
              key={dest.id}
              href={`#/${SEGMENT[dest.id]}`}
              aria-current={on ? "page" : undefined}
              className="tl-tab tl-focusable"
            >
              <span className={`tl-tab-centre ${on ? "is-active" : ""}`}>
                <Icon size={22} />
              </span>
              <span className="sr-only">{t(dest.labelKey)}</span>
            </a>
          );
        }
        return (
          <a
            key={dest.id}
            href={`#/${SEGMENT[dest.id]}`}
            aria-current={on ? "page" : undefined}
            className={`tl-tab tl-focusable ${on ? "is-active" : ""}`}
          >
            <Icon size={21} />
            <span>{t(dest.labelKey)}</span>
          </a>
        );
      })}
    </nav>
  );
}
