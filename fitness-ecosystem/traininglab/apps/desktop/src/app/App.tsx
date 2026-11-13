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
 * Historial (08), Ejercicios (05), Rutinas (06) — draw their own top bar and
 * content, exactly like their pages. Historial joined the ported list on
 * 2026-11-09 (P0); Ejercicios and its sheet joined on 2026-11-10; Semana,
 * Progreso and Configuración on 2026-11-12, when the last `Legacy` wrapper was
 * removed.
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
import { TrainingLabProvider, useStore } from "./store";
import { MIcons } from "../ui/mockup-icons";
import { t, tInterp } from "../lib/i18n";
import Onboarding from "../features/onboarding/Onboarding";

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
const CoachScreen = lazy(() => import("../screens/CoachScreen"));
const SessionSummaryScreen = lazy(
  () => import("../screens/SessionSummaryScreen"),
);

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
  return (
    <TrainingLabProvider>
      <Shell />
    </TrainingLabProvider>
  );
}

/**
 * The provider's child: the only place that can read both the store and the
 * route, which is what lets an open session follow the user across destinations.
 */
function Shell() {
  const route = useRoute();
  const { totalSetsToday, finished, loading } = useStore();
  const showSessionBar =
    !loading &&
    finished === null &&
    totalSetsToday > 0 &&
    route.id !== "today" &&
    route.id !== "session" &&
    route.id !== "summary";

  return (
    <div className="app">
      <Rail active={route.id} />
      <main className={`main ${showSessionBar ? "has-session-bar" : ""}`}>
        <Suspense fallback={<ScreenFallback />}>
          <Screen route={route} />
        </Suspense>
        {showSessionBar && <ActiveSessionBar sets={totalSetsToday} />}
      </main>
      <MobileTabBar active={route.id} />
      <Onboarding />
    </div>
  );
}

/**
 * A session that is open follows the user across destinations (invariant 9,
 * 2026-11-06). Hoy and ZEN already say it; before this, walking into Historial,
 * Progreso or Ajustes made the open log invisible. The bar is a link back to
 * ZEN, never a second place to log.
 */
function ActiveSessionBar({ sets }: { sets: number }) {
  return (
    <a
      className="active-session-bar tl-focusable"
      href="#/sesion"
      data-testid="active-session"
    >
      <span className="active-session-dot" aria-hidden />
      <span className="grow">
        <b style={{ display: "block" }}>{t("sessionBar.title")}</b>
        <span className="small muted">
          {tInterp("sessionBar.sets", { n: sets })}
        </span>
      </span>
      <span className="btn btn-primary btn-sm">
        {t("sessionBar.continue")}
        <MIcons.arrowRight />
      </span>
    </a>
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
      // Hoy and the session draw their own top bar and `.content`, like every
      // other screen in the app.
      return <TodayScreen />;
    case "training":
      // Mockup 02 ported (2026-10-18): the day's queue — order, swap, out,
      // add-many and the plan's own why. It draws its own topbar and `.content`
      // like Hoy.
      return <TrainingScreen />;
    case "history":
      // Port of mockup 08 (2026-11-09): the record the log has been building,
      // now on the shared topbar/content/card shell like Hoy and Entrenamiento.
      return <HistoryScreen />;
    case "week":
      // Port of the week screen (2026-11-12): it now draws its own topbar and
      // `.content` like the other shared-shell destinations.
      return <WeekScreen />;
    case "session":
      return <SessionScreen />;
    case "progress":
      // Port of the progress screen (2026-11-12): it now draws its own topbar
      // and `.content` like the other shared-shell destinations.
      return <ProgressScreen />;
    case "routines":
      // Port of mockup 06 (2026-10-18): the user's own templates. It draws its
      // own topbar and `.content`.
      return <RoutinesScreen />;
    case "coach":
      // New (2026-10-24): the agent's seat. The brief is the contract, the answer
      // is validated by `lib/set-proposal.ts`, and the same path serves the local
      // model and the MCP inbox. Draws its own topbar and `.content`.
      return <CoachScreen />;
    case "summary":
      // The close of the loop (2026-11-06): a finished session has its own
      // address, so the bell lands on the numbers instead of on Hoy.
      return <SessionSummaryScreen />;
    case "settings":
      // Port of the settings screen (2026-11-12): the last `Legacy` wrapper is
      // gone; the rail destinations all draw the shared topbar/content shell.
      return <SettingsScreen />;
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
          <MobileTab
            key={id}
            dest={destinationFor(id)}
            active={id === active}
          />
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
function MoreSheet({
  active,
  onClose,
}: {
  active: RouteId;
  onClose: () => void;
}) {
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
