/**
 * The shell — the mockup's rail, in React.
 *
 * **2026-10-14 (migration).** The owner promoted the approved mockup to the
 * production front and asked for a *linear replacement*: this app keeps its
 * backend (store, engine, database, MCP, tests) and the screens are rebuilt —
 * one by one — from the mockup's pages, deleting the old one as its replacement
 * lands. This file is the first replacement: the shell.
 *
 * What changed and why:
 *
 *   * **One rail, not two navigations.** The old shell drew a collapsible rail
 *     *and* a phone tab bar from the same list. The mockup draws a single
 *     `.rail`: a 245 px column from 900 px up, and below that the stylesheet
 *     turns it into a horizontal, scrollable bar across the top. So there is no
 *     toggle to persist and no second navigation that could disagree with the
 *     first — the mockup's own responsive pattern is the contract.
 *   * **The markup is the mockup's** (`.app`, `.rail`, `.rail-brand`,
 *     `.rail-logo`, `.rail-name`, `.rail-nav`, `.rail-item`, `.rail-quote`),
 *     so `src/mockup.css` — the ported stylesheet — styles it as designed.
 *   * **`session` is not a destination.** In the mockup, ZEN opens from Hoy and
 *     is not in the rail; the route stays (`#/sesion`) for the screens that
 *     open it.
 *
 * Screens are lazy, so a phone pays for the screen it opens and not for the
 * other nine. The ported ones — Hoy (01), ZEN (03), Entrenamiento (02),
 * Historial (08), Rutinas (06) — draw their own top bar and content, exactly
 * like their pages; the ones still waiting for their port (Progreso, Ejercicios,
 * Semana, Configuración) are wrapped in `Legacy` for the old shell's gutters.
 *
 * @module app/App
 */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getExerciseById } from "@fitness/bodylab-exercises";
import {
  DESTINATIONS,
  MOBILE_PRIMARY,
  MOBILE_SECONDARY,
  destinationFor,
  type Destination,
} from "./nav";
import { SEGMENT, useRoute, type Route, type RouteId } from "./router";
import { TrainingLabProvider } from "./store";
import { MIcons } from "../ui/mockup-icons";
import { t, tInterp } from "../lib/i18n";

const TodayScreen = lazy(() => import("../screens/TodayScreen"));
const WeekScreen = lazy(() => import("../screens/WeekScreen"));
const ExercisesScreen = lazy(() => import("../screens/ExercisesScreen"));
const ExerciseDetailScreen = lazy(
  () => import("../screens/ExerciseDetailScreen"),
);
const SessionScreen = lazy(() => import("../screens/SessionScreen"));
const TrainingScreen = lazy(() => import("../screens/TrainingScreen"));
const ProgressScreen = lazy(() => import("../screens/ProgressScreen"));
const SettingsScreen = lazy(() => import("../screens/SettingsScreen"));
const HistoryScreen = lazy(() => import("../screens/HistoryScreen"));
const RoutinesScreen = lazy(() => import("../screens/RoutinesScreen"));

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

  return (
    <TrainingLabProvider>
      <div className="app">
        <Rail active={route.id} />
        <main className="main">
          <Suspense fallback={<ScreenFallback />}>
            <Screen route={route} />
          </Suspense>
        </main>
        <MobileTabBar active={route.id} />
      </div>
    </TrainingLabProvider>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Routing
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Migration bridge: a not-yet-replaced screen inside the mockup shell.
 *
 * The old shell's `.tl-main` carried the page gutters; the mockup gives them to
 * `.content` instead, because its pages draw their own topbar and content. Until
 * a destination's port lands, its old screen renders inside `.content` so it
 * keeps the same margins (and never sits edge-to-edge on a phone). One wrapper,
 * deleted with the last old screen.
 */
function Legacy({ children }: { children: ReactNode }) {
  return <div className="content">{children}</div>;
}

function Screen({ route }: { route: Route }) {
  switch (route.id) {
    case "exercises": {
      // `#/ejercicios/<id>` is a detail, `#/ejercicios/<family>` is a filter and
      // `#/ejercicios/<id>/<tab>` is a tab. The catalog is what disambiguates,
      // which keeps the router free of screen knowledge.
      const [first, second] = route.params;
      if (first && getExerciseById(first)) {
        return (
          <Legacy>
            <ExerciseDetailScreen exerciseId={first} tab={second} />
          </Legacy>
        );
      }
      return (
        <Legacy>
          <ExercisesScreen initialFamily={first} />
        </Legacy>
      );
    }
    case "today":
      // Hoy and the session draw their own top bar and `.content` (their pages
      // do), so they are NOT wrapped: `Legacy` exists for the screens still
      // wearing the old shell's gutters.
      return <TodayScreen />;
    case "training":
      // Mockup 02 ported (2026-10-18): the day's queue — order, swap, out,
      // add-many and the plan's own why. It draws its own topbar and `.content`
      // like Hoy, so it is deliberately not wrapped in `Legacy`.
      return <TrainingScreen />;
    case "history":
      // Port of mockup 08: the record the log has been building. Wrapped in
      // `Legacy` while the port keeps the old shell's gutters (like Semana,
      // Progreso and Configuración).
      return (
        <Legacy>
          <HistoryScreen />
        </Legacy>
      );
    case "week":
      return (
        <Legacy>
          <WeekScreen />
        </Legacy>
      );
    case "session":
      return <SessionScreen />;
    case "progress":
      return (
        <Legacy>
          <ProgressScreen />
        </Legacy>
      );
    case "routines":
      // Port of mockup 06 (2026-10-18): the user's own templates. It draws its
      // own topbar and `.content`, so it is not wrapped in `Legacy`.
      return <RoutinesScreen />;
    case "settings":
      return (
        <Legacy>
          <SettingsScreen />
        </Legacy>
      );
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   The rail (mockup markup, one responsive surface)
   ══════════════════════════════════════════════════════════════════════════ */

function Rail({ active }: { active: RouteId }) {
  return (
    <aside className="rail">
      <div className="rail-brand">
        <div className="rail-logo">
          <MIcons.dumbbell />
        </div>
        <div className="rail-name">
          Training<span>Lab</span>
        </div>
      </div>

      <nav className="rail-nav" aria-label={t("nav.label")}>
        {DESTINATIONS.map((dest) => {
          const Icon = dest.icon;
          const on = dest.id === active;
          return (
            <a
              key={dest.id}
              href={`#/${SEGMENT[dest.id]}`}
              aria-current={on ? "page" : undefined}
              className={`rail-item ${on ? "is-active" : ""}`}
              title={t(dest.labelKey)}
            >
              <Icon />
              <span>{t(dest.labelKey)}</span>
            </a>
          );
        })}
      </nav>

      <div className="rail-quote">
        <b>{t("nav.motto")}</b>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   The phone bar (2026-10-19)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Four fixed destinations plus "More".
 *
 * The active destination is the only one that prints its name; every tab keeps
 * the same width, so navigating never moves the targets under the thumb. The
 * fifth control shows the active planning destination when there is one
 * (`Semana`, `Rutinas`, …), so the rule "the active tab reads its name" also
 * holds for the four destinations that live behind the sheet.
 */
function MobileTabBar({ active }: { active: RouteId }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const secondary = MOBILE_SECONDARY.includes(active)
    ? destinationFor(active)
    : null;

  useEffect(() => setMoreOpen(false), [active]);

  const close = useCallback(() => setMoreOpen(false), []);

  return (
    <>
      <nav className="mobile-tabs" aria-label={t("nav.label")}>
        {MOBILE_PRIMARY.map((id) => (
          <MobileTab          key={id}
          dest={destinationFor(id)} active={id === active} />
        ))}
        <button
          type="button"
          data-testid="tab-more"
          className={`mobile-tab ${secondary || moreOpen ? "is-active" : ""}`}
          aria-label={
            secondary
              ? tInterp("nav.moreCurrent", { name: t(secondary.labelKey) })
              : t("nav.more")
          }
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          {secondary ? <secondary.icon /> : <MIcons.menu />}
          <span className="mobile-tab-label" aria-hidden="true">
            {secondary ? t(secondary.labelKey) : t("nav.more")}
          </span>
        </button>
      </nav>
      {moreOpen && <MoreSheet active={active} onClose={close} />}
    </>
  );
}

function MobileTab({ dest, active }: { dest: Destination; active: boolean }) {
  const Icon = dest.icon;
  return (
    <a
      href={`#/${SEGMENT[dest.id]}`}
      data-testid={`tab-${dest.id}`}
      aria-current={active ? "page" : undefined}
      aria-label={t(dest.labelKey)}
      className={`mobile-tab ${active ? "is-active" : ""}`}
    >
      <Icon />
      <span className="mobile-tab-label" aria-hidden="true">
        {t(dest.labelKey)}
      </span>
    </a>
  );
}

/**
 * The "More" sheet. A real modal: Escape closes it, focus starts on the close
 * button and Tab cycles inside, and the page behind cannot scroll while it is
 * open. It lists every secondary destination with the full name, because the
 * whole point of the change is that a name is read *before* the tap.
 */
function MoreSheet({ active, onClose }: { active: RouteId; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(
        panel.current.querySelectorAll<HTMLElement>("a[href], button"),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="mobile-sheet-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.more")}
      >
        <div className="mobile-sheet-head">
          <span className="mobile-sheet-brand">
            <MIcons.dumbbell />
            Training<span>Lab</span>
          </span>
          <button
            ref={closeButton}
            type="button"
            className="icon-btn tl-focusable"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <MIcons.x />
          </button>
        </div>
        <div className="mobile-sheet-list">
          {MOBILE_SECONDARY.map((id) => {
            const dest = destinationFor(id);
            const Icon = dest.icon;
            const on = id === active;
            return (
              <a
                key={id}
                href={`#/${SEGMENT[id]}`}
                data-testid={`sheet-${id}`}
                className={`mobile-sheet-item ${on ? "is-active" : ""}`}
                aria-current={on ? "page" : undefined}
                onClick={onClose}
              >
                <span className="mobile-sheet-icon">
                  <Icon />
                </span>
                <span>{t(dest.labelKey)}</span>
                {on ? <MIcons.check /> : <MIcons.chevronRight />}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
