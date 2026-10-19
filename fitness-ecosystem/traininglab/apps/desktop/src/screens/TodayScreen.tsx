/**
 * Hoy — the approved mockup's first screen (`mockup/01-hoy.html`), in React.
 *
 * **2026-10-14 (linear replacement).** The owner promoted the mockup to the
 * production front and asked for a *linear* swap: the backend stays (store,
 * planner, records, MCP) and each screen is rebuilt from its approved page,
 * deleting the old one as its replacement lands. This file is that swap for
 * screen 01, so the arrangement below is the mockup's, block for block:
 *
 *   ┌ topbar: date · Empezar ─────────────────────────────────────────────┐
 *   │ the day ────────────────────────────────────────────────────────────┐
 *   │ resume row (yesterday / in flight)                                  │
 *   │ "Hoy toca" + gear + exercise rows                                   │
 *   │ focus · add exercise · plan notes · recovery note · today's shape    │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * **2026-10-16 (owner order).** The rail is gone. The owner asked for this
 * screen to be *only* Hoy — "no hace falta el resumen, progreso, coach" — so the
 * four cards that lived to its right were deleted with their helpers: the quick
 * summary, the progress rings, the week strip (Semana has its own destination)
 * and the coach. The two pieces that are about today rather than about
 * history stayed: the **recovery note** (it explains why today's plan repeats or
 * avoids a family) and **Estado de hoy** (readiness is an input to today's
 * session, not a readout). Everything else the old Inicio derived is still
 * here, because it is the *backend* this migration preserves: the session title
 * from primary families, the gear list built from the catalogue's own
 * `requires`, the log-grounded load suggestions in the rows.
 *
 * Two deliberate departures from the page, both additions the app cannot lose:
 *
 *   1. **`Enfoque de hoy` survives**, under the session card. It is how the user
 *      asks for a focused day ("hoy toca abdomen") and it is an input to the
 *      planner, not a readout. The page has no equivalent control.
 *   2. **`Terminar sesión` stays** in the card head while a session is open. The
 *      page would leave it to the session screen; losing the button would mean
 *      walking into ZEN to close a session that is already over.
 *
 * `Estado de hoy` uses the mockup's own stepper control (`.field` / `.stepper`,
 * taken from `03-sesion.html`) and closes the column: it is the other input that
 * shapes today's session and the page has nowhere else for it.
 *
 * What it deliberately dropped: the **inline logger**. The old rows expanded
 * into `SlotCard`, so typing a set happened here *and* in ZEN. The mockup's rows
 * are a plan preview that opens the session, and one logger is what keeps the
 * two from drifting; rows now link to `#/sesion`.
 *
 * Two pieces of the page are *not* built yet, and neither is faked:
 *
 *   * the date pill is a plain label — there is no day picker, and a pill with a
 *     chevron that opened nothing would be a lie;
 *   * the `Casa · Gym · Parque` selector is absent. Nothing in the data model
 *     says which gear belongs to which place, and inventing that mapping would
 *     silently change every plan. It is an owner decision, listed in the
 *     handoff.
 *
 * @module screens/TodayScreen
 */

import { useMemo, useState, type ReactNode } from "react";
import { getTraits, type Capability } from "@fitness/bodylab-exercises";
import type { MuscleFamily } from "@fitness/bodylab-training";
import { SORE_FAMILIES, useStore } from "../app/store";
import { navigate } from "../app/router";
import { localDayKey } from "../lib/day";
import { DAY_FOCUS_PRESETS, focusKeyOf } from "../lib/day-focus";
import { familyLabel, formatAdvisory } from "../lib/format";
import { getLanguage, t, tInterp } from "../lib/i18n";
import { exerciseName, type PlannedRow, type TodayPlan } from "../lib/plan";
import { parseNumberInput } from "../lib/parse-num";
import { workingSets } from "../features/stats/derive";
import { ExerciseThumb } from "../features/exercises/ExerciseThumb";
import { MIcons } from "../ui/mockup-icons";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Below this many minutes between the day's first and last set, the span says
 * nothing about how long the session took (an imported date-only sheet gives
 * ~0), so the resume row does not print a duration at all.
 */
const MINUTES_TRUSTWORTHY = 5;

export default function TodayScreen() {
  const {
    settings,
    loading,
    rows,
    plan,
    readiness,
    soreFamilies,
    toggleSoreFamily,
    dayFocus,
    setDayFocus,
    setReadinessAndPersist,
    todaySets,
    plannedMinutes,
    totalSetsToday,
    finished,
    payload,
    finishSession,
  } = useStore();

  const plannedSets = rows.reduce((acc, row) => acc + row.sets, 0);

  /** Working sets already logged per exercise — the row's own progress. */
  const doneByExercise = useMemo(() => {
    const map = new Map<string, number>();
    for (const set of todaySets) {
      if (set.warmup) continue;
      map.set(set.exerciseId, (map.get(set.exerciseId) ?? 0) + 1);
    }
    return map;
  }, [todaySets]);

  if (loading || !settings || !plan) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const isRestDay = rows.length === 0;
  const gear = gearFor(rows, settings.inventory);
  const title = sessionTitle(rows);
  const inProgress = totalSetsToday > 0 && finished === null;
  const currentId =
    rows.find((row) => (doneByExercise.get(row.exerciseId) ?? 0) < row.sets)
      ?.exerciseId ?? null;

  return (
    <>
      {/* ── Top bar: the date, and the one action that starts the day.
          The mockup's topbar is a *sibling* of the content box — it is sticky,
          with its own background and bottom rule — not a card inside it. ─── */}
      <header className="topbar">
        <span className="pill">
          <MIcons.calendar />
          {todayLabel()}
        </span>
        <div className="spacer" />
        {!isRestDay && (
          <a className="btn btn-primary btn-lg" href="#/sesion">
            <MIcons.play />
            {inProgress ? t("home.hero.continue") : t("hoy.start")}
          </a>
        )}
      </header>

      <div className="content">
        <div className="stack">
          {/* ══ The day: the session, and how far into it you are ══════════ */}
          <ResumeRow
            plannedSets={plannedSets}
            doneSets={totalSetsToday}
            plannedMinutes={plannedMinutes}
            exerciseCount={rows.length}
            finished={finished !== null}
          />

          <section className="card">
            <div className="card-head">
              <span className="card-title" style={{ fontSize: 16 }}>
                <MIcons.dumbbell />
                {isRestDay ? t("week.rest") : t("hoy.today")}
              </span>
              {finished !== null ? (
                <span className="badge badge-success">
                  <MIcons.circleCheck />
                  {t("hoy.complete")}
                </span>
              ) : inProgress ? (
                <span className="badge badge-accent">
                  {t("hoy.inProgress")}
                </span>
              ) : null}
              <div className="spacer" />
              {inProgress && (
                <button
                  type="button"
                  className="btn btn-sm tl-focusable"
                  onClick={() => finishSession()}
                >
                  {t("session.finish")}
                </button>
              )}
            </div>

            <div className="card-body" style={{ paddingTop: 0 }}>
              <h1 style={{ margin: 0, fontSize: 31, letterSpacing: "-0.9px" }}>
                {title}
              </h1>

              {!isRestDay && (
                <div
                  className="row-wrap"
                  style={{
                    margin: "12px 0 10px",
                    color: "var(--tl-text-secondary)",
                    fontSize: 13,
                  }}
                >
                  <span className="row" style={{ gap: 6 }}>
                    <MIcons.clock style={{ width: 16, height: 16 }} />
                    {tInterp("session.minutes", { n: plannedMinutes })}
                  </span>
                  <span className="muted">·</span>
                  <span className="row" style={{ gap: 6 }}>
                    <MIcons.bars style={{ width: 16, height: 16 }} />
                    {tInterp("stats.exercises", { n: rows.length })}
                  </span>
                  <span className="muted">·</span>
                  <span className="row" style={{ gap: 6 }}>
                    <MIcons.target style={{ width: 16, height: 16 }} />
                    {uniqueFamilies(rows).map(familyLabel).join(" · ")}
                  </span>
                </div>
              )}

              {gear.length > 0 && !isRestDay && (
                <div style={{ marginTop: 18 }}>
                  <div
                    className="small bold secondary"
                    style={{ marginBottom: 8 }}
                  >
                    {t("hoy.gear")}
                  </div>
                  <div className="row-wrap">
                    {gear.map((item) => (
                      <span
                        key={item.capability}
                        className={`chip ${item.uses === 0 ? "chip-optional" : ""}`}
                      >
                        {capabilityIcon(item.capability)}
                        {item.label}
                        {item.uses === 0 && (
                          <small>{t("hoy.gearOptional")}</small>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!isRestDay && (
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 15 }}>
                    {t("hoy.sessionExercises")}
                  </h2>
                  <div className="spacer" />
                  <a className="card-link" href="#/sesion">
                    {t("hoy.logNew")} <MIcons.arrowRight />
                  </a>
                </div>
              )}
            </div>

            {!isRestDay && (
              <div className="exlist">
                {rows.map((row, index) => (
                  <SessionRow
                    key={row.exerciseId}
                    row={row}
                    index={index + 1}
                    done={doneByExercise.get(row.exerciseId) ?? 0}
                    isCurrent={row.exerciseId === currentId}
                  />
                ))}
              </div>
            )}

            {isRestDay && plan.advisories.length > 0 && (
              <div className="card-pad" style={{ paddingTop: 0 }}>
                <div className="warn-strip">
                  <MIcons.info />
                  <span>{formatAdvisory(plan.advisories[0]!)}</span>
                </div>
              </div>
            )}
          </section>

          {!isRestDay && (
            <DayFocusBar value={dayFocus} onChange={setDayFocus} />
          )}

          {!isRestDay && (
            <div className="row" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn btn-lg tl-focusable"
                style={{ flex: 1 }}
                onClick={() => navigate("exercises")}
              >
                <MIcons.plus />
                {t("hoy.addExercise")}
              </button>
              <button
                type="button"
                className="btn btn-lg tl-focusable"
                style={{ flex: 1 }}
                onClick={() => navigate("week")}
              >
                <MIcons.list />
                {t("hoy.fromRoutine")}
              </button>
            </div>
          )}

          <PlanNotes plan={plan} />

          {payload === null && (
            <p className="tiny muted" style={{ margin: 0 }}>
              {t("home.hero.linked")}
            </p>
          )}

          {/*
           * The recovery note is the one piece of the old rail that is about
           * *today's plan* and not a readout: it says which families are still
           * inside their window when the planner asks them to work again. It
           * stays; the numbers, the rings, the week and the coach do not
           * (owner order, 2026-10-16: Hoy is only Hoy).
           */}
          {plan.fatigue && plan.fatigue.entries.length > 0 && (
            <p className="tiny muted" style={{ margin: 0 }}>
              <strong>{t("recovery.title")}</strong>{" "}
              {tInterp("recovery.line", {
                families: plan.fatigue.entries
                  .map((entry) => familyLabel(entry.family))
                  .join(", "),
                hours: Math.round(
                  Math.min(
                    ...plan.fatigue.entries.map((entry) => entry.hoursSince),
                  ),
                ),
                window: plan.fatigue.windowHours,
              })}{" "}
              {t("recovery.hint")}
            </p>
          )}

          <ReadinessCard
            readiness={readiness}
            soreFamilies={soreFamilies}
            onReadiness={setReadinessAndPersist}
            onToggleSore={toggleSoreFamily}
          />
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Session — the resume row and the plan's rows
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * One line that answers "where was I?".
 *
 * It prefers today's own session (the one open right now) and, when today has
 * nothing logged, falls back to the last day that had sets — the question a
 * logger exists to answer before you start. With no history at all it renders
 * nothing, because the row would have nothing true to say.
 */
function ResumeRow({
  plannedSets,
  doneSets,
  plannedMinutes,
  exerciseCount,
  finished,
}: {
  plannedSets: number;
  doneSets: number;
  plannedMinutes: number;
  exerciseCount: number;
  finished: boolean;
}) {
  const { sets } = useStore();
  const lang = getLanguage();

  const previous = useMemo(() => {
    if (doneSets > 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const working = workingSets(sets).filter(
      (set) =>
        new Date(`${localDayKey(set.timestamp)}T00:00:00`).getTime() <
        today.getTime(),
    );
    const day = working
      .map((set) => localDayKey(set.timestamp))
      .sort()
      .at(-1);
    if (!day) return null;
    const ofDay = working.filter((set) => localDayKey(set.timestamp) === day);
    // The span between the day's first and last set. A log imported from a
    // date-only sheet collapses to ~0, and printing "1 min" there would be a
    // made-up duration: below `MINUTES_TRUSTWORTHY` the row simply says how
    // many sets there were.
    const spanMin = Math.round(
      (new Date(ofDay[ofDay.length - 1]!.timestamp).getTime() -
        new Date(ofDay[0]!.timestamp).getTime()) /
        60000,
    );
    return {
      day,
      sets: ofDay.length,
      minutes: spanMin >= MINUTES_TRUSTWORTHY ? spanMin : null,
      names: [...new Set(ofDay.map((set) => set.exerciseId))]
        .slice(0, 2)
        .map((id) => exerciseName(id, lang)),
    };
  }, [sets, doneSets, lang]);

  if (doneSets === 0 && !previous) return null;

  const inProgress = doneSets > 0 && !finished;
  const headline = inProgress
    ? t("hoy.stripResume")
    : finished
      ? t("hoy.stripDone")
      : tInterp("hoy.stripPrevious", { n: daysAgo(previous!.day) });
  const detail =
    doneSets > 0
      ? tInterp("hoy.stripToday", {
          done: doneSets,
          total: Math.max(plannedSets, doneSets),
          exercises: exerciseCount,
          min: plannedMinutes,
        })
      : tInterp(
          previous!.minutes === null ? "hoy.stripLastShort" : "hoy.stripLast",
          {
            names: previous!.names.join(" · "),
            sets: previous!.sets,
            min: previous!.minutes ?? 0,
          },
        );

  return (
    <a
      className="card card-pad row tl-focusable"
      style={{ gap: 14 }}
      href={inProgress || finished ? "#/sesion" : "#/progreso"}
    >
      <span
        className="rail-logo"
        style={{ width: 36, height: 36, borderRadius: 10 }}
        aria-hidden
      >
        {inProgress ? <MIcons.refresh /> : <MIcons.clock />}
      </span>
      <span className="grow">
        <span className="bold" style={{ display: "block" }}>
          {headline}
        </span>
        <span className="small muted">{detail}</span>
      </span>
      <MIcons.chevronRight style={{ color: "var(--tl-text-muted)" }} />
    </a>
  );
}

/** One line of the session: what it is, what it costs, and whether it is done. */
function SessionRow({
  row,
  index,
  done,
  isCurrent,
}: {
  row: PlannedRow;
  index: number;
  done: number;
  isCurrent: boolean;
}) {
  const complete = done >= row.sets;
  return (
    <a
      className={`exrow tl-focusable ${isCurrent ? "is-current" : ""}`}
      href="#/sesion"
      title={t("hoy.logNew")}
    >
      <div className={`exrow-idx ${complete ? "exrow-done" : ""}`}>
        {complete ? <MIcons.check /> : index}
      </div>
      <div className="exrow-thumb">
        <ExerciseThumb exerciseId={row.exerciseId} size={40} />
      </div>
      <div className="grow">
        <div className="exrow-name">
          {exerciseName(row.exerciseId, getLanguage())}
        </div>
        <div className="exrow-sub">
          {row.families.map(familyLabel).join(" · ")}
        </div>
      </div>
      <div className="exrow-cell">
        <b>{tInterp("hoy.sets", { n: row.sets })}</b>
        <span>
          {done}/{row.sets}
        </span>
      </div>
      <div className="exrow-cell">
        <b>
          {row.repsMin}–{row.repsMax} {t("hoy.reps")}
        </b>
        <span>RIR {row.rir}</span>
      </div>
      <div className="exrow-cell is-rest">
        <b>{t("hoy.rest")}</b>
        <span>{row.restSec} s</span>
      </div>
      <div className="exrow-go">
        <MIcons.chevronRight />
      </div>
    </a>
  );
}

/**
 * "Enfoque de hoy": the user asking for a focused day.
 *
 * The automatic plan balances the whole body across the week, which is right
 * most days — but a plan of abdominal work needs days that say "hoy toca
 * abdomen", and there was no way to ask for one. The engine already supports it
 * (`focusFamilies` in `buildSession`); the presets live in `lib/day-focus.ts`
 * because the MCP action `set_day_focus` validates against the same table, so
 * the chips and the agents share one vocabulary.
 */
function DayFocusBar({
  value,
  onChange,
}: {
  value: MuscleFamily[];
  onChange: (families: MuscleFamily[]) => void;
}) {
  // Compared by set, not by reference: the store may hand back a new array.
  const activeKey = focusKeyOf(value);
  return (
    <div className="row-wrap" style={{ gap: 8 }}>
      <span
        className="tiny"
        style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        {t("home.focus.label")}
      </span>
      <div className="row-wrap" style={{ gap: 6 }}>
        {DAY_FOCUS_PRESETS.map((option) => (
          <button
            key={option.key}
            type="button"
            className="chip tl-focusable"
            style={
              activeKey === option.key
                ? {
                    borderColor: "var(--tl-accent-border)",
                    background: "var(--tl-accent-wash)",
                    color: "var(--tl-accent-strong)",
                  }
                : undefined
            }
            aria-pressed={activeKey === option.key}
            onClick={() => onChange(option.families)}
          >
            {t(option.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The plan's own notes: advisories, collapsible so a quiet day stays quiet. */
function PlanNotes({ plan }: { plan: TodayPlan }) {
  const [open, setOpen] = useState(false);
  if (plan.advisories.length === 0) return null;
  const shown = open ? plan.advisories : plan.advisories.slice(0, 1);
  return (
    <div className="stack" style={{ gap: 8 }}>
      {shown.map((advisory, i) => (
        <div key={i} className="warn-strip">
          <MIcons.alert />
          <span>{formatAdvisory(advisory)}</span>
        </div>
      ))}
      {plan.advisories.length > 1 && (
        <button
          type="button"
          className="tl-focusable tiny"
          style={{
            alignSelf: "flex-start",
            fontWeight: 600,
            color: "var(--tl-text-muted)",
          }}
          onClick={() => setOpen((value) => !value)}
        >
          {open
            ? t("hoy.hideNotes")
            : tInterp("hoy.moreNotes", { n: plan.advisories.length - 1 })}
        </button>
      )}
    </div>
  );
}

/**
 * "Estado de hoy" — the self-report that steers today's volume, rest and
 * exercise choice (and never the plan).
 *
 * The control is the mockup's own stepper (`.field` / `.stepper` /
 * `.stepper-btn`, from `03-sesion.html`) rather than the old primitive: the
 * approved design already has a way to enter a small number with a thumb, and
 * reusing it is what keeps this screen free of a second visual language.
 */
function ReadinessCard({
  readiness,
  soreFamilies,
  onReadiness,
  onToggleSore,
}: {
  readiness: { energy: number; motivation: number; soreness: number };
  soreFamilies: MuscleFamily[];
  onReadiness: (next: {
    energy: number;
    motivation: number;
    soreness: number;
  }) => void;
  onToggleSore: (family: MuscleFamily) => void;
}) {
  const step = (key: "energy" | "motivation" | "soreness", delta: number) => {
    const next = clamp(readiness[key] + delta, 1, 5);
    if (next !== readiness[key]) onReadiness({ ...readiness, [key]: next });
  };
  const set = (key: "energy" | "motivation" | "soreness", raw: string) => {
    const parsed = parseNumberInput(raw);
    if (parsed === null) return;
    const next = clamp(Math.round(parsed), 1, 5);
    if (next !== readiness[key]) onReadiness({ ...readiness, [key]: next });
  };

  return (
    <details className="card" open>
      <summary className="card-head" style={{ cursor: "pointer" }}>
        <MIcons.activity
          style={{ color: "var(--tl-accent)", width: 16, height: 16 }}
        />
        <h2 className="card-title">{t("readiness.titleShort")}</h2>
        <div className="spacer" />
        <span
          className="badge badge-plain"
          title={tInterp("readiness.badge", {
            e: readiness.energy,
            m: readiness.motivation,
            s: readiness.soreness,
          })}
        >
          {readiness.energy}/{readiness.motivation}/{readiness.soreness}
        </span>
      </summary>
      <div className="card-body" style={{ paddingTop: 0 }}>
        <p className="tiny muted" style={{ margin: "0 0 10px" }}>
          {t("readiness.hint")}
        </p>
        <div className="stepper-row">
          <ReadinessStepper
            label={t("readiness.energy")}
            value={readiness.energy}
            onStep={(delta) => step("energy", delta)}
            onInput={(raw) => set("energy", raw)}
          />
          <ReadinessStepper
            label={t("readiness.motivation")}
            value={readiness.motivation}
            onStep={(delta) => step("motivation", delta)}
            onInput={(raw) => set("motivation", raw)}
          />
          <ReadinessStepper
            label={t("readiness.soreness")}
            value={readiness.soreness}
            onStep={(delta) => step("soreness", delta)}
            onInput={(raw) => set("soreness", raw)}
          />
        </div>
        <p className="small bold secondary" style={{ margin: "14px 0 8px" }}>
          {t("readiness.soreFamilies")}
        </p>
        <div className="row-wrap" style={{ gap: 6 }}>
          {SORE_FAMILIES.map((family) => {
            const on = soreFamilies.includes(family);
            return (
              <button
                key={family}
                type="button"
                className="chip tl-focusable"
                aria-pressed={on}
                onClick={() => onToggleSore(family)}
              >
                <span className={`checkbox ${on ? "is-on" : ""}`} aria-hidden>
                  <MIcons.check />
                </span>
                {familyLabel(family)}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

/** One value of the day's self-report, in the mockup's stepper markup. */
function ReadinessStepper({
  label,
  value,
  onStep,
  onInput,
}: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
  onInput: (raw: string) => void;
}) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="stepper">
        <button
          type="button"
          className="stepper-btn tl-focusable"
          aria-label={`${label} −1`}
          onClick={() => onStep(-1)}
        >
          <MIcons.minus />
        </button>
        <input
          className="stepper-input"
          inputMode="numeric"
          value={String(value)}
          aria-label={label}
          onChange={(event) => onInput(event.target.value)}
        />
        <button
          type="button"
          className="stepper-btn tl-focusable"
          aria-label={`${label} +1`}
          onClick={() => onStep(1)}
        >
          <MIcons.plus />
        </button>
      </div>
      <div className="stepper-unit">1 – 5</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Derivation
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The session's title: the families that carry the day ("Piernas + Trapecios"),
 * never more than three — a title that lists six muscles is a paragraph.
 *
 * Counted by the *primary* family of each row, so a squat that also loads the
 * core still titles the day "Piernas".
 */
function sessionTitle(rows: PlannedRow[]): string {
  const counts = new Map<MuscleFamily, number>();
  for (const row of rows) {
    const primary = row.families[0];
    if (!primary) continue;
    counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    // Family labels are written lowercase for use mid-sentence ("isquios ·
    // glúteos"); a title is not a sentence.
    .map(([family]) => capitalise(familyLabel(family)));
  if (ranked.length === 0) return t("home.restDay");
  return ranked.join(" + ");
}

/** Every family today's rows touch, first appearance first. */
function uniqueFamilies(rows: PlannedRow[]): MuscleFamily[] {
  const seen: MuscleFamily[] = [];
  for (const row of rows) {
    for (const family of row.families) {
      if (!seen.includes(family)) seen.push(family);
    }
  }
  return seen;
}

/** First letter up, rest untouched — "isquios" → "Isquios". */
function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

interface GearItem {
  capability: Capability;
  label: string;
  /** How many of today's exercises actually need it (0 = nice to have). */
  uses: number;
}

/**
 * What today's session needs the user to own.
 *
 * Derived from the catalogue's own `requires` (a list of capability groups: one
 * of each group is enough) intersected with the declared inventory, so the list
 * can never drift from what the planner actually checked. Anything the session
 * does not strictly need stays in the list with a count of zero and reads as
 * optional, because "you own it and it would help" is worth knowing at the rack.
 */
function gearFor(
  rows: PlannedRow[],
  inventory: { capabilities: Capability[]; label: string }[],
): GearItem[] {
  const uses = new Map<Capability, number>();
  for (const row of rows) {
    for (const group of getTraits(row.exerciseId).requires) {
      // The group is satisfied by any of its capabilities; credit the first one
      // the user owns, which is the one they would actually reach for.
      const owned = group.find((cap) =>
        inventory.some((item) => item.capabilities.includes(cap)),
      );
      if (owned) uses.set(owned, (uses.get(owned) ?? 0) + 1);
    }
  }
  return [...uses.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([capability, count]) => ({
      capability,
      label:
        inventory.find((item) => item.capabilities.includes(capability))
          ?.label ?? capabilityLabel(capability),
      uses: count,
    }));
}

/** Fallback label for a capability no inventory row carries. */
function capabilityLabel(capability: Capability): string {
  const KEY: Record<string, { en: string; es: string }> = {
    barbell: { en: "Barbell", es: "Barra" },
    dumbbell: { en: "Dumbbells", es: "Mancuernas" },
    bench: { en: "Bench", es: "Banco" },
    rack: { en: "Rack", es: "Rack" },
    pullup_bar: { en: "Pull-up bar", es: "Barra de dominadas" },
    dip_bars: { en: "Dip bars", es: "Paralelas" },
    cable: { en: "Cable", es: "Polea" },
    machines: { en: "Machine", es: "Máquina" },
    bands: { en: "Bands", es: "Bandas" },
    kettlebell: { en: "Kettlebell", es: "Pesa rusa" },
    mat: { en: "Mat", es: "Esterilla" },
    box: { en: "Box", es: "Cajón" },
    ab_wheel: { en: "Ab wheel", es: "Rueda abdominal" },
    rings: { en: "Rings", es: "Anillas" },
    strap: { en: "Straps", es: "Correas" },
  };
  const entry = KEY[capability];
  if (!entry) return capability;
  return getLanguage() === "es" ? entry.es : entry.en;
}

/**
 * The mockup's gear chips carry a glyph, and the page groups them by kind: the
 * loose weights get the dumbbell, the things you set up get the layers, and the
 * soft kit gets the wind. Kept as the page draws it so a rack does not read like
 * a pair of dumbbells.
 */
function capabilityIcon(capability: Capability): ReactNode {
  if (capability === "bands" || capability === "mat") {
    return <MIcons.wind />;
  }
  if (
    capability === "machines" ||
    capability === "rack" ||
    capability === "bench" ||
    capability === "box"
  ) {
    return <MIcons.layers />;
  }
  return <MIcons.dumbbell />;
}

function daysAgo(day: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (today.getTime() - new Date(`${day}T00:00:00`).getTime()) / DAY_MS,
  );
}

/** `mié, 14 oct` — the date pill's label, in the user's language. */
function todayLabel(): string {
  return new Date().toLocaleDateString(
    getLanguage() === "es" ? "es-ES" : "en-GB",
    { weekday: "short", day: "numeric", month: "short" },
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
