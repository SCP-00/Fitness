/**
 * Inicio — what do I do in the next {budget} minutes, with the body I have today?
 *
 * Composition is the owner's sketch (`docs/Boseto_preview.html`, rendered in
 * `docs/reference/traininglab-design/01-inicio-pc.png`) ported *structurally*, not
 * approximated with utilities: a two-column dashboard (wide column + rail, which
 * stacks below 1200 px), a hero that owns the first screenful, a four-tile KPI
 * strip, the week strip, the session itself and the next exercise — and in the
 * rail, the constancia ring, the numbers grid and the ZEN panel.
 *
 * Every card here is `.tl-card` + `.tl-card-head` + `.tl-card-body`, every tile is
 * from the design system, and no screen re-invents a padding. That is the whole
 * difference between "looks like the mockup" and "looks like a React app": the
 * geometry comes from one stylesheet.
 *
 * Three deliberate departures from the sketch, all of them honesty rather than
 * taste:
 *
 *   * **Constancia replaces "racha".** A streak that resets to zero teaches the
 *     user to skip a day rather than log a partial one. Weekly constancia says the
 *     same thing without the punishment.
 *   * **"Tus cifras", not "Tus badges".** "Fuerza +12 %", "Disciplina 4 semanas"
 *     and "Nivel 2" would be inventable, and we do not invent. The tiles show
 *     sessions, working sets, distinct exercises and logged training days — the
 *     same data Progreso charts.
 *   * **The clock pill is real.** It counts from the first set you logged today,
 *     and before that it shows the planned minutes. A ticking timer that counts
 *     nothing would be a decoration.
 *
 * @module screens/TodayScreen
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Flame,
  Heart,
  Info,
  Layers,
  Moon,
  Scale,
  Zap,
} from "lucide-react";
import { navigate } from "../app/router";
import { SORE_FAMILIES, useStore } from "../app/store";
import type { TLSet } from "../lib/types";
import { suggestLoadFor } from "../lib/plan";
import { repRangeFor } from "../lib/settings";
import { formatAdvisory, familyLabel } from "../lib/format";
import { getLanguage, t, tInterp } from "../lib/i18n";
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  MetricTile,
  MiniBars,
  ScaleInput,
  SectionCard,
  Segmented,
  Sparkline,
} from "../ui/primitives";
import { IconChart, IconDumbbell, IconPlay } from "../ui/icons";
import { SlotCard } from "../features/today/SlotCard";
import { WeekCard } from "../features/today/WeekCard";
import {
  consistency,
  trainingDays,
  workingSets,
} from "../features/stats/derive";

export default function TodayScreen() {
  const {
    settings,
    loading,
    rows,
    plan,
    weekPlan,
    readiness,
    soreFamilies,
    toggleSoreFamily,
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
    swapRow,
    finishSession,
    regenerateWeek,
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
  const weekIndex = weekPlan?.rows.findIndex((day) => day.isToday) ?? -1;
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
          <a
            href="#/sesion"
            className="tl-pill is-accent tl-focusable"
            title={t("nav.session")}
          >
            {t("home.badge.zen")}
          </a>
          <ClockPill plannedMinutes={plannedMinutes} />
        </div>
      </header>

      <QuickTags />

      <div className="tl-dash">
        {/* ── Wide column ───────────────────────────────────────────────────── */}
        <div className="tl-col">
          <HeroCard
            isRestDay={isRestDay}
            focus={focusLine(rows.map((r) => r.name[getLanguage()]))}
            plannedMinutes={plannedMinutes}
            exerciseCount={rows.length}
            withBodyLab={payload !== null}
          />

          <MetricStrip />

          {/*
           * The session: the reason the app exists, so it sits above the week. It
           * is **not** wrapped in a card — the slot cards below are the cards, and a
           * card inside a card is the one nesting this design system forbids. The
           * heading and the two actions stand on the page instead.
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
              <Button
                size="sm"
                onClick={finishSession}
                disabled={totalSetsToday === 0 || finished !== null}
              >
                {t("session.finish")}
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={rows.length === 0}
                onClick={() => navigate("session")}
              >
                <IconPlay size={15} />
                {t("zen.start")}
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
                    onSwap={swapRow}
                    customReps={repRangeFor(settings, row)}
                    onRepRange={(range) => setRepRange(row.exerciseId, range)}
                  />
                );
              })
            )}
          </div>

          <div id="today-week">
            <WeekCard
              weekPlan={weekPlan!}
              sets={sets}
              onRegenerate={regenerateWeek}
            />
          </div>

          <NextExerciseCard />
        </div>

        {/* ── Rail ──────────────────────────────────────────────────────────── */}
        <aside className="tl-col">
          <ProgressCard />
          <NumbersCard />
          <ZenCard weekIndex={weekIndex} />

          {/* Readiness: collapsed by default, its values live in the badge. */}
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
        </aside>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Hero
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Context tags keep the main destinations one thumb away. They are deliberately
 * links, not filters hidden inside the long dashboard: the tag is a promise that
 * the user will arrive at a dedicated surface with the relevant task in focus.
 */
function QuickTags() {
  return (
    <nav className="tl-context-tags" aria-label="Accesos rápidos">
      <a href="#/sesion" className="tl-context-tag is-primary tl-focusable">
        <IconPlay size={15} />
        {t("nav.session")}
      </a>
      <a href="#/ejercicios" className="tl-context-tag tl-focusable">
        <IconDumbbell size={15} />
        {t("nav.exercises")}
      </a>
      <a href="#/progreso" className="tl-context-tag tl-focusable">
        <IconChart size={15} />
        {t("nav.progress")}
      </a>
      <a href="#today-week" className="tl-context-tag tl-focusable">
        <CalendarDays className="w-3.5 h-3.5" aria-hidden />
        {t("week.title")}
      </a>
    </nav>
  );
}

function HeroCard({
  isRestDay,
  focus,
  plannedMinutes,
  exerciseCount,
  withBodyLab,
}: {
  isRestDay: boolean;
  focus: string;
  plannedMinutes: number;
  exerciseCount: number;
  withBodyLab: boolean;
}) {
  const { settings, rows } = useStore();
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

        <Button
          variant="primary"
          disabled={rows.length === 0}
          onClick={() => navigate("session")}
        >
          {t("home.hero.cta")} →
        </Button>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   KPI strip — four tiles, exactly the sketch's four questions
   ══════════════════════════════════════════════════════════════════════════ */

function MetricStrip() {
  const { settings, sets, weekPlan, readiness, payload } = useStore();
  const stats = useMemo(
    () => consistency(sets, settings?.daysPerWeek ?? 4),
    [sets, settings?.daysPerWeek],
  );
  const week = useMemo(() => lastWeekSets(sets), [sets]);
  // Body weight over the imported measurements — the only weight history we have,
  // and the honest source for the tile's sparkline.
  const weights = useMemo(
    () =>
      (payload?.measurements ?? [])
        .filter((m) => m.type === "weight")
        .slice(-8)
        .map((m) => m.value),
    [payload],
  );

  // Three bands, and the *key* drives both the label and the one-line
  // explanation — never a translated string used as a dictionary key.
  const average =
    (readiness.energy + readiness.motivation + readiness.soreness) / 3;
  const band = average >= 3.67 ? "ready" : average >= 2.5 ? "fair" : "low";

  const bodyWeight = payload?.profile?.weight ?? null;

  return (
    <section className="tl-metrics">
      <MetricTile
        icon={<Activity className="w-4 h-4" />}
        label={t("home.kpi.consistency")}
        value={tInterp("home.kpi.daysOf", {
          done: stats.days,
          target: stats.target,
        })}
        info={t("home.kpi.consistencyHint")}
      />
      <MetricTile
        icon={<Heart className="w-4 h-4" />}
        label={t("home.kpi.readiness")}
        value={t(`home.kpi.${band}`)}
        info={t(`home.kpi.${band}Hint`)}
      />
      <MetricTile
        icon={<Dumbbell className="w-4 h-4" />}
        label={t("home.kpi.volume")}
        value={`${stats.weekSets} / ${weekPlan?.totalSets ?? 0}`}
        info={t("home.kpi.volumeHint")}
        trailing={<MiniBars values={week} />}
      />
      <MetricTile
        icon={<Scale className="w-4 h-4" />}
        label={t("home.kpi.bodyweight")}
        value={bodyWeight !== null ? `${bodyWeight} kg` : "—"}
        info={
          bodyWeight !== null
            ? t("home.kpi.bodyweightFrom")
            : t("home.kpi.bodyweightNone")
        }
        trailing={
          weights.length >= 2 ? <Sparkline values={weights} /> : undefined
        }
      />
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Rail — ring, numbers, ZEN
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * "Tu progreso": a period selector, the constancia ring and the shape of that
 * period. All three read the same window, so the ring and the bars can never
 * describe different spans of time.
 */
function ProgressCard() {
  const { sets, settings, weekPlan } = useStore();
  const [days, setDays] = useState<7 | 30 | 90>(7);

  const series = useMemo(() => periodSeries(sets, days), [sets, days]);
  const peak = Math.max(1, ...series);
  const logged = series.reduce((a, b) => a + b, 0);
  // The plan's own target for the same window — never a made-up goal.
  const target = Math.max(
    1,
    Math.round(((weekPlan?.totalSets ?? 0) * days) / 7),
  );
  const pct = Math.min(100, Math.round((logged / target) * 100));
  const trainedWeeks = trainedWeeksIn(sets, 4, settings?.daysPerWeek ?? 4);

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("home.progress.title")}</h2>
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { value: 7, label: t("home.progress.week") },
            { value: 30, label: t("home.progress.month") },
            { value: 90, label: t("home.progress.year") },
          ]}
        />
      </div>
      <div className="tl-card-body">
        <div className="tl-ring-row">
          <div
            className="tl-ring"
            style={{ "--pct": String(pct) } as CSSProperties}
          >
            <strong>{pct}%</strong>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm">
              {t("home.progress.constancy")}
            </h3>
            <p className="text-xs text-[var(--tl-text-secondary)] mt-1 leading-relaxed">
              {tInterp("home.progress.sets", { done: logged, target })}
            </p>
            <div className="tl-mini-chart">
              {series.map((n, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(9, (n / peak) * 100)}%` }}
                  title={tInterp("home.progress.daySets", { n })}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="tl-callout">
          <span aria-hidden>🏆</span>
          {trainedWeeks > 0
            ? tInterp("home.progress.note", { n: trainedWeeks })
            : t("home.progress.noteNone")}
        </p>
      </div>
    </section>
  );
}

/**
 * The shape of the period, in 5–7 bars whatever the span: days for a week, weeks
 * for a month, months for a quarter. One bar per day would be 90 slivers in a
 * 245 px rail, which is noise, not a trend.
 */
function periodSeries(sets: TLSet[], days: 7 | 30 | 90): number[] {
  const working = workingSets(sets);
  const dayOf = (s: TLSet) => s.timestamp.slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets = days === 7 ? 7 : days === 30 ? 5 : 6;
  const span = Math.ceil(days / buckets);
  const out = Array.from({ length: buckets }, () => 0);

  for (const set of working) {
    const diff = Math.floor(
      (today.getTime() - new Date(`${dayOf(set)}T00:00:00`).getTime()) /
        86400000,
    );
    if (diff < 0 || diff >= buckets * span) continue;
    const index = buckets - 1 - Math.floor(diff / span);
    out[index] += 1;
  }
  return out;
}

/** How many of the last `weeks` weeks hit the training-days target. */
function trainedWeeksIn(
  sets: { timestamp: string; warmup?: boolean }[],
  weeks: number,
  daysPerWeek: number,
): number {
  const working = sets.filter((s) => !s.warmup);
  const trained = new Set(working.map((s) => s.timestamp.slice(0, 10)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(
    today.getTime() - ((today.getDay() + 6) % 7) * 86400000,
  );
  let hit = 0;
  for (let w = 0; w < weeks; w++) {
    const start = new Date(monday.getTime() - w * 7 * 86400000);
    let count = 0;
    for (let d = 0; d < 7; d++) {
      const date = isoDate(new Date(start.getTime() + d * 86400000));
      if (trained.has(date)) count += 1;
    }
    if (count >= Math.max(1, daysPerWeek)) hit += 1;
  }
  return hit;
}

function isoDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/**
 * The numbers grid (the sketch's "badges"): four real figures from the log. It is
 * a 2 × 2 grid of accent circles because that is what the sketch draws — the
 * content is what changed, not the shape.
 */
function NumbersCard() {
  const { sets, sessions, payload } = useStore();
  const working = workingSets(sets);
  const distinct = new Set(working.map((s) => s.exerciseId)).size;
  const records = payload?.personalRecords?.length ?? 0;

  const tiles = [
    {
      icon: <Flame className="w-5 h-5" />,
      value: String(sessions.length),
      label: t("home.tiles.sessions"),
    },
    {
      icon: <Dumbbell className="w-5 h-5" />,
      value: String(working.length),
      label: t("home.tiles.sets"),
    },
    {
      icon: <Layers className="w-5 h-5" />,
      value: String(distinct),
      label: t("home.tiles.exercises"),
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      value: String(trainingDays(sets)),
      label: t("home.tiles.days"),
    },
  ];

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("home.numbers.title")}</h2>
        <button
          type="button"
          onClick={() => navigate("progress")}
          className="tl-focusable hover:text-[var(--tl-text)] transition-colors"
        >
          {t("common.seeAll")} →
        </button>
      </div>
      <div className="tl-card-body">
        <div className="tl-badges">
          {tiles.map((tile) => (
            <div key={tile.label} className="tl-badge-tile">
              <div className="tl-badge-icon">{tile.icon}</div>
              <div className="tl-badge-title tabular-nums">{tile.value}</div>
              <div className="tl-badge-desc">{tile.label}</div>
            </div>
          ))}
        </div>
        {records > 0 && (
          <p className="text-[11px] text-[var(--tl-text-muted)] mt-3">
            {tInterp("home.numbers.records", { n: records })}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * ZEN — the sketch's focus panel, with the progress bar wired to the real session
 * (sets logged / sets planned). No button: the hero's CTA and the tab bar are the
 * two ways in, and a third would dilute both.
 */
function ZenCard({ weekIndex }: { weekIndex: number }) {
  const { plannedMinutes, totalSetsToday, weekPlan } = useStore();
  const plannedSets =
    weekPlan?.rows[weekIndex]?.sets ?? Math.max(totalSetsToday, 1);
  const pct =
    plannedSets > 0
      ? Math.min(100, Math.round((totalSetsToday / plannedSets) * 100))
      : 0;

  return (
    <section className="tl-card">
      <div className="tl-zen-panel">
        <div className="tl-zen-label">{t("home.focus.badge")}</div>
        <h3 className="text-xl font-bold mb-1.5">{t("home.focus.title")}</h3>
        <p className="text-xs text-[var(--tl-text-secondary)] leading-relaxed">
          {t("home.focus.body")}
        </p>
        <div className="tl-zen-progress">
          <span
            style={{ width: `${pct}%` }}
            title={tInterp("home.zen.progress", { pct })}
          />
        </div>
        <p className="text-[11px] text-[var(--tl-text-muted)] mt-2 tabular-nums">
          {tInterp("slot.of", { done: totalSetsToday, total: plannedSets })} ·{" "}
          {tInterp("session.minutes", { n: plannedMinutes })}
        </p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Next exercise
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The sketch's "Siguiente ejercicio" row: what is left to do right now, with the
 * same 100 × 70 media slot and the circular arrow that jumps into ZEN. It picks
 * today's first exercise that is not finished, so the card always answers "and
 * then what?".
 */
function NextExerciseCard() {
  const { rows, todaySets } = useStore();
  const lang = getLanguage();

  const next = rows.find((row) => {
    const done = todaySets.filter(
      (s) => s.exerciseId === row.exerciseId,
    ).length;
    return done < row.sets;
  });

  if (!next) return null;

  const done = todaySets.filter((s) => s.exerciseId === next.exerciseId).length;

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("home.next.title")}</h2>
        <span>{t("home.next.current")}</span>
      </div>
      <div className="tl-card-body">
        <div className="tl-next">
          <div className="tl-thumb" aria-hidden>
            <span className="text-2xl font-black">
              {next.name[lang].trim().charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate">
              {next.name[lang]}
            </h3>
            <p className="text-[11px] text-[var(--tl-text-muted)] mt-0.5 truncate">
              {next.families.slice(0, 2).map(familyLabel).join(" · ")}
              {next.pattern ? ` · ${next.pattern.replace(/_/g, " ")}` : ""}
            </p>
            <p className="text-[11px] text-[var(--tl-text-secondary)] mt-1.5 tabular-nums">
              {tInterp("slot.of", { done, total: next.sets })} · {next.repsMin}–
              {next.repsMax} · {tInterp("slot.rest", { s: next.restSec })}
            </p>
          </div>
          <button
            type="button"
            className="tl-arrow-btn tl-focusable"
            title={t("home.next.go")}
            aria-label={t("home.next.go")}
            onClick={() => navigate("session")}
          >
            →
          </button>
        </div>
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

/** Working sets logged per day over the last seven days, oldest first. */
function lastWeekSets(
  sets: { timestamp: string; warmup?: boolean }[],
): number[] {
  const out = Array.from({ length: 7 }, () => 0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (const set of sets) {
    if (set.warmup) continue;
    const day = new Date(`${set.timestamp.slice(0, 10)}T00:00:00`);
    const diff = Math.round((start.getTime() - day.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) out[6 - diff] += 1;
  }
  return out;
}

/** "Press de banca · Sentadilla · Remo"-style focus line, from today's rows. */
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
