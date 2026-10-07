/**
 * Inicio — one question: what do I do now, with the body I have today?
 *
 * **2026-09-30 (f), the slimming.** The owner read the old screen and said the
 * same thing three ways: *too much information, and it repeats itself*. He was
 * right, and the measurement backed him up — 38 controls and two full
 * dashboards' worth of cards on one page, of which only two answered today's
 * question:
 *
 *   * the KPI strip, the constancia ring and the "tus cifras" grid were
 *     **analytics** — the same numbers Progreso already charts, in a worse
 *     place to read them (a 300 px rail);
 *   * the week strip was **planning** — reference material you read once, not
 *     while standing at the rack;
 *   * the "siguiente ejercicio" card repeated the exercise card that is already
 *     expanded right above it (`autoOpen`), and the ZEN card repeated the
 *     hero's CTA.
 *
 * So each of those left for the surface that owns it: analytics → Progreso,
 * planning → the new **Semana** destination, duplicated affordances → deleted.
 * What remains is the session, the hero that starts it, the readiness that
 * shapes it and one genuinely new card — what you did last time, which is the
 * question a logger exists to answer and which Inicio did not answer at all.
 *
 * The rule that follows from this, for whoever edits it next: **a card earns its
 * place on Inicio only if it changes what the user does in the next five
 * minutes.** If it can wait until after the session, it belongs to Progreso.
 *
 * @module screens/TodayScreen
 */

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Info, Moon, Zap } from "lucide-react";
import type { MuscleFamily } from "@fitness/bodylab-training";
import { navigate } from "../app/router";
import { SORE_FAMILIES, useStore } from "../app/store";
import { exerciseName, suggestLoadFor } from "../lib/plan";
import { repRangeFor } from "../lib/settings";
import { formatAdvisory, familyLabel } from "../lib/format";
import { getLanguage, t, tInterp } from "../lib/i18n";
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ScaleInput,
  SectionCard,
} from "../ui/primitives";
import { SlotCard } from "../features/today/SlotCard";
import { workingSets } from "../features/stats/derive";

export default function TodayScreen() {
  const {
    settings,
    loading,
    rows,
    plan,
    weekPlan,
    readiness,
    soreFamilies,
    dayFocus,
    toggleSoreFamily,
    setDayFocus,
    setReadinessAndPersist,
    todaySets,
    todayVolume,
    plannedMinutes,
    totalSetsToday,
    sets,
    finished,
    payload,
    addSet,
    removeSet,
    editSet,
    swapRow,
    finishSession,
    prFor,
    swapOptionsFor,
    clearCoach,
    coachRows,
    setRepRange,
  } = useStore();

  if (loading || !settings || !plan) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const isRestDay = rows.length === 0;
  // "Today is a rest day in the week plan" is a different state from "today's
  // session came out empty", and the empty state says so.
  const isRestWeekDay =
    weekPlan?.rows.some((day) => day.isToday && day.isRest) ?? false;
  const nextExerciseId = rows.find(
    (row) =>
      todaySets.filter((set) => set.exerciseId === row.exerciseId).length <
      row.sets,
  )?.exerciseId;

  return (
    <>
      <header className="tl-topbar">
        <div className="tl-welcome">
          <h1>{t("home.greeting")}</h1>
          <p>{isRestDay ? t("home.restDay") : t("home.ready")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="tl-pill">
            <CalendarDays className="w-3.5 h-3.5" aria-hidden />
            {todayLabel()}
          </span>
          <ClockPill plannedMinutes={plannedMinutes} />
        </div>
      </header>

      <div className="tl-dash">
        {/* ── Wide column: today, and nothing else ─────────────────────── */}
        <div className="tl-col">
          <HeroCard
            isRestDay={isRestDay}
            focus={focusLine(rows.map((r) => r.name[getLanguage()]))}
            plannedMinutes={plannedMinutes}
            exerciseCount={rows.length}
            plannedSets={rows.reduce((acc, r) => acc + r.sets, 0)}
            doneSets={totalSetsToday}
            withBodyLab={payload !== null}
          />

          <DayFocusBar value={dayFocus} onChange={setDayFocus} />

          {/*
           * The session: the reason the app exists. It is **not** wrapped in a
           * card — the slot cards below are the cards, and a card inside a card
           * is the one nesting this design system forbids. The heading and the
           * one action that is not in the hero stand on the page instead.
           */}
          <div
            id="today-session"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <h2 className="tl-section-title">
              {t("session.title")}
              {coachRows && (
                <Badge tone="success">{t("session.rebuilt")}</Badge>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {coachRows && (
                <Button size="sm" onClick={clearCoach}>
                  {t("settings.modelReset")}
                </Button>
              )}
              {/* Ending a session is not a hero action; starting it is. */}
              <Button
                size="sm"
                onClick={finishSession}
                disabled={totalSetsToday === 0 || finished !== null}
              >
                {t("session.finish")}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {plan.advisories.length > 0 && (
              <ul className="tl-note">
                {plan.advisories.map((advisory, i) => (
                  <li key={i} className="flex gap-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--tl-text-muted)]" />
                    {formatAdvisory(advisory)}
                  </li>
                ))}
              </ul>
            )}

            {finished && (
              <p className="flex items-center gap-2 text-sm text-[var(--tl-success)]">
                <Zap className="w-4 h-4" />
                {tInterp("session.done", {
                  sets: finished.setIds.length,
                  vol: Math.round(todayVolume),
                })}
              </p>
            )}

            {isRestDay ? (
              <EmptyState
                icon={<Moon size={28} />}
                title={t("session.none")}
                body={
                  plan.advisories[0]
                    ? formatAdvisory(plan.advisories[0])
                    : t("session.noneHint")
                }
                action={
                  isRestWeekDay ? undefined : (
                    <Button
                      variant="primary"
                      onClick={() => navigate("session")}
                    >
                      {t("zen.start")}
                    </Button>
                  )
                }
              />
            ) : (
              rows.map((row) => {
                const rowToday = todaySets.filter(
                  (s) => s.exerciseId === row.exerciseId,
                );
                const history = sets
                  .filter((s) => s.exerciseId === row.exerciseId)
                  .slice(-10);
                const lastSession =
                  rowToday.length > 0
                    ? rowToday[rowToday.length - 1]!.timestamp
                    : history.length > 0
                      ? history[history.length - 1]!.timestamp
                      : null;
                return (
                  <SlotCard
                    key={row.exerciseId}
                    row={row}
                    unit={settings.unit}
                    todaySets={rowToday}
                    lastSession={lastSession}
                    suggestion={suggestLoadFor({
                      loadType: row.loadType,
                      repsMin: repRangeFor(settings, row).min,
                      repsMax: repRangeFor(settings, row).max,
                      history: history.map((s) => ({
                        weight: s.weight,
                        reps: s.reps,
                      })),
                      pr: prFor(row.exerciseId),
                      inventory: settings.inventory,
                      readiness,
                    })}
                    swapOptions={swapOptionsFor(row.exerciseId)}
                    autoOpen={row.exerciseId === nextExerciseId}
                    onAddSet={addSet}
                    onRemoveSet={removeSet}
                    onEditSet={editSet}
                    onSwap={swapRow}
                    customReps={repRangeFor(settings, row)}
                    onRepRange={(range) => setRepRange(row.exerciseId, range)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── Rail: how the body is today, and what it did last time ────── */}
        <aside className="tl-col">
          <SectionCard
            title={t("readiness.titleShort")}
            hint={t("readiness.hint")}
            icon={<Activity className="w-4 h-4" />}
            defaultOpen={false}
            actions={
              <Badge
                tone="neutral"
                title={tInterp("readiness.badge", {
                  e: readiness.energy,
                  m: readiness.motivation,
                  s: readiness.soreness,
                })}
              >
                {readiness.energy}/{readiness.motivation}/{readiness.soreness}
              </Badge>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <ScaleInput
                label={t("readiness.energy")}
                value={readiness.energy}
                onChange={(v) =>
                  setReadinessAndPersist({ ...readiness, energy: v })
                }
                lowHint={t("readiness.low")}
                highHint={t("readiness.high")}
              />
              <ScaleInput
                label={t("readiness.motivation")}
                value={readiness.motivation}
                onChange={(v) =>
                  setReadinessAndPersist({ ...readiness, motivation: v })
                }
                lowHint={t("readiness.low")}
                highHint={t("readiness.high")}
              />
              <ScaleInput
                label={t("readiness.soreness")}
                value={readiness.soreness}
                onChange={(v) =>
                  setReadinessAndPersist({ ...readiness, soreness: v })
                }
                lowHint={t("readiness.low")}
                highHint={t("readiness.high")}
              />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2">
                {t("readiness.soreFamilies")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SORE_FAMILIES.map((family) => (
                  <Chip
                    key={family}
                    active={soreFamilies.includes(family)}
                    onClick={() => toggleSoreFamily(family)}
                  >
                    {familyLabel(family)}
                  </Chip>
                ))}
              </div>
            </div>
          </SectionCard>

          <LastSessionCard />
        </aside>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Hero
   ══════════════════════════════════════════════════════════════════════════ */

function HeroCard({
  isRestDay,
  focus,
  plannedMinutes,
  exerciseCount,
  plannedSets,
  doneSets,
  withBodyLab,
}: {
  isRestDay: boolean;
  focus: string;
  plannedMinutes: number;
  exerciseCount: number;
  plannedSets: number;
  doneSets: number;
  withBodyLab: boolean;
}) {
  const { settings } = useStore();
  const pct =
    plannedSets > 0 ? Math.min(100, Math.round((doneSets / plannedSets) * 100)) : 0;

  return (
    <section className="tl-card tl-hero">
      <div className="tl-hero-art" aria-hidden />
      <div className="tl-hero-slab" aria-hidden />
      <div className="tl-hero-scrim" aria-hidden />
      <div className="tl-hero-content">
        <span className="tl-badge-pill">
          {isRestDay ? t("home.rest") : t("home.today")}
        </span>
        <h2>{isRestDay ? t("session.none") : t("home.hero.title")}</h2>
        <p className="tl-hero-sub">{focus}</p>

        <div className="tl-hero-meta">
          <span>
            {t("stats.budget")}:{" "}
            <strong>{tInterp("session.minutes", { n: plannedMinutes })}</strong>
          </span>
          <span>
            {t("stats.planned")}:{" "}
            <strong>{tInterp("stats.exercises", { n: exerciseCount })}</strong>
          </span>
          <span>
            {settings && settings.inventory.length > 0
              ? t("home.hero.gear")
              : t("home.hero.bodyweight")}
          </span>
          {withBodyLab && <strong>{t("home.hero.linked")}</strong>}
        </div>

        {/* The one number that changes what the user does next: how much of
            today is already logged. It is not analytics — it is the state of
            the session that the CTA below starts or continues. */}
        {!isRestDay && (
          <div className="tl-hero-progress">
            <div className="tl-hero-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular-nums">
              {tInterp("slot.of", { done: doneSets, total: plannedSets })}
            </span>
          </div>
        )}

        <Button
          variant="primary"
          disabled={exerciseCount === 0}
          onClick={() => navigate("session")}
        >
          {doneSets > 0 ? t("home.hero.continue") : t("home.hero.cta")} →
        </Button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Last session — the question a logger exists to answer
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * What the log did the last day you trained (today excluded — that is the hero).
 * Deliberately a handful of figures and three exercise names: it is a
 * memory-jogger before the session, not a report. The report is one tap away in
 * Progreso.
 */
function LastSessionCard() {
  const { sets } = useStore();
  const lang = getLanguage();

  const last = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = new Set(
      workingSets(sets)
        .filter(
          (s) =>
            new Date(`${s.timestamp.slice(0, 10)}T00:00:00`).getTime() <
            today.getTime(),
        )
        .map((s) => s.timestamp.slice(0, 10)),
    );
    const day = [...days].sort().at(-1);
    if (!day) return null;
    const rows = workingSets(sets).filter(
      (s) => s.timestamp.slice(0, 10) === day,
    );
    const names = [...new Set(rows.map((s) => s.exerciseId))].slice(0, 3);
    return {
      day,
      sets: rows.length,
      volume: rows.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0),
      names,
      daysAgo: Math.round(
        (today.getTime() - new Date(`${day}T00:00:00`).getTime()) / 86400000,
      ),
    };
  }, [sets]);

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("home.last.title")}</h2>
        <button
          type="button"
          onClick={() => navigate("progress")}
          className="tl-focusable hover:text-[var(--tl-text)] transition-colors"
        >
          {t("common.seeAll")} →
        </button>
      </div>
      <div className="tl-card-body">
        {!last ? (
          <p className="text-sm text-[var(--tl-text-muted)]">
            {t("home.last.none")}
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold">
              {last.daysAgo === 1
                ? t("home.last.yesterday")
                : tInterp("home.last.daysAgo", { n: last.daysAgo })}
            </p>
            <div className="tl-last-grid">
              <span>
                <strong className="tabular-nums">{last.sets}</strong>
                {t("home.last.sets")}
              </span>
              <span>
                <strong className="tabular-nums">
                  {Math.round(last.volume).toLocaleString()}
                </strong>
                {t("home.last.volume")}
              </span>
              <span>
                <strong className="tabular-nums">{last.names.length}</strong>
                {t("home.last.exercises")}
              </span>
            </div>
            <ul className="tl-last-list">
              {last.names.map((id) => (
                <li key={id}>{exerciseName(id, lang)}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Pieces
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The clock pill. It counts from the **first working set logged today**, and when
 * there is nothing logged it shows the planned minutes instead — so the pill is
 * never a ticking number that measures nothing.
 */
function ClockPill({ plannedMinutes }: { plannedMinutes: number }) {
  const { todaySets } = useStore();
  const startedAt = useMemo(() => {
    const working = todaySets.filter((s) => !s.warmup);
    if (working.length === 0) return null;
    return working.reduce(
      (min, s) => (s.timestamp < min ? s.timestamp : min),
      working[0]!.timestamp,
    );
  }, [todaySets]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  if (!startedAt) {
    return (
      <span className="tl-pill" title={t("stats.budget")}>
        ⏱ {tInterp("session.minutes", { n: plannedMinutes })}
      </span>
    );
  }

  const elapsed = Math.max(
    0,
    Math.round((now - new Date(startedAt).getTime()) / 1000),
  );
  return (
    <span className="tl-pill" title={t("home.pill.elapsedHint")}>
      ⏱ {formatElapsed(elapsed)}
    </span>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "Press de banca · Sentadilla · Remo"-style focus line, from today's rows. */
/**
 * "Enfoque de hoy": the user asking for a focused day.
 *
 * Why it exists: the automatic plan balances the whole body across the week,
 * which is right most days — but a 10-week abdominal plan needs days that say
 * "hoy toca abdomen", and there was no way to ask for one. The engine already
 * supports it (`focusFamilies` in `buildSession`); this is the switch that
 * reaches it.
 *
 * Ephemeral by design (see `dayFocus` in the store), and `Automático` is the
 * empty list, i.e. exactly the behaviour the app had before this control.
 */
const FOCUS_OPTIONS: { key: string; label: string; families: MuscleFamily[] }[] = [
  { key: "auto", label: "home.focus.auto", families: [] },
  {
    key: "push",
    label: "home.focus.push",
    families: ["chest", "shoulders", "triceps"],
  },
  {
    key: "pull",
    label: "home.focus.pull",
    families: ["lats", "traps", "rhomboids", "biceps", "forearms"],
  },
  {
    key: "legs",
    label: "home.focus.legs",
    families: ["glutes", "quadriceps", "hamstrings", "calves"],
  },
  { key: "core", label: "home.focus.core", families: ["core"] },
];

function DayFocusBar({
  value,
  onChange,
}: {
  value: MuscleFamily[];
  onChange: (families: MuscleFamily[]) => void;
}) {
  // Compare by set, not by reference: the store may hand back a new array.
  const activeKey =
    FOCUS_OPTIONS.find(
      (option) =>
        option.families.length === value.length &&
        option.families.every((family) => value.includes(family)),
    )?.key ?? "auto";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
        {t("home.focus.label")}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {FOCUS_OPTIONS.map((option) => (
          <Chip
            key={option.key}
            active={activeKey === option.key}
            onClick={() => onChange(option.families)}
          >
            {t(option.label)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function focusLine(names: string[]): string {
  if (names.length === 0) return t("home.restDay");
  return names.slice(0, 3).join(" · ");
}

function todayLabel(): string {
  return new Date().toLocaleDateString(
    getLanguage() === "es" ? "es-ES" : "en-GB",
    { weekday: "short", day: "numeric", month: "short" },
  );
}
