/**
 * Entrenamiento — the approved mockup's second screen (`mockup/02-entrenamiento.html`).
 *
 * **2026-10-18 (port).** The destination existed as an honest placeholder
 * because the old front never had it. The page does: the day's *queue*, which is
 * a different question from Hoy's "what is today". Hoy previews and starts; this
 * screen is where the order is decided before you walk into the gym — move a row
 * up or down, swap it for a legal alternative, take it out of today, read why
 * the selection is what it is, see what you need grouped by machine, and add
 * several exercises at once with one common prescription.
 *
 * Everything it does writes through the store's existing verbs, so the screen
 * cannot invent state:
 *
 *   * **order** — `moveRow` / `resetRowOrder` (`settings.rowOrder`), the same
 *     sequence ZEN drags and the same one the plan respects after every rebuild;
 *   * **swap** — `swapRow` + `swapOptionsFor`, which only offers same-pattern,
 *     same-load-type alternatives the declared gear allows;
 *   * **out** — a hand-added row is *removed* (`removeAddedRow`); a planned row
 *     is *skipped* (`skipRow`), because the plan and the week keep the
 *     prescription. The row shows which of the two happened and both undo;
 *   * **add many** — `addExerciseToToday` with the page's own three fields
 *     (series · reps · rest), clamped inside the store.
 *
 * Three parts of the page are deliberately absent rather than faked:
 *
 *   * the **`Casa · Gym · Parque`** switch — nothing in the data model says which
 *     gear lives where, and inventing that mapping would silently change every
 *     plan (owner decision, still open);
 *   * **drag** — the page drags rows, this screen moves them with subir/bajar.
 *     Pointer dragging is a bigger change than a screen, and the buttons are the
 *     accessible path either way (the order itself is the session's own);
 *   * **"Desde mi rutina"** — until 2026-10-18 the Rutinas destination was a
 *     placeholder, so a button that opened nothing would have been a lie. The
 *     port now links to it (the shelf applies the rows through the store's own
 *     `addExerciseToToday`, never through a second path).
 *
 * `¿Por qué estos?` is not copy: it prints the plan's own reasons (the same
 * `formatReason` strings the session shows), the recovery window the log
 * derives and the real totals. A day with no rows says it is a rest day.
 *
 * @module screens/TrainingScreen
 */

import { useMemo, useState, type PointerEvent, type ReactNode } from "react";
import { useStore } from "../app/store";
import {
  budgetFill,
  dayTotals,
  groupByFamily,
  groupByGear,
  startElsewhere,
} from "../lib/day-view";
import { familyLabel, formatReason } from "../lib/format";
import { getLanguage, t, tInterp } from "../lib/i18n";
import { exerciseName, type PlannedRow } from "../lib/plan";
import { ExerciseThumb } from "../features/exercises/ExerciseThumb";
import { MIcons } from "../ui/mockup-icons";
import { usePointerReorder } from "../ui/pointer-drag";

/** The three projections of the same list (mockup 02's segmented control). */
type OrderView = "mine" | "gear" | "muscle";

/** How many candidates the "añadir varios" picker shows before the search. */
const PAGE_SIZE = 24;

/** The page's own prescription presets, in the order the mockup lists them. */
const REP_PRESETS = [
  { min: 8, max: 12 },
  { min: 10, max: 12 },
  { min: 12, max: 15 },
  { min: 6, max: 8 },
  { min: 15, max: 20 },
] as const;
const REST_PRESETS = [60, 90, 120, 150] as const;

export default function TrainingScreen() {
  const {
    settings,
    plan,
    rows,
    loading,
    totalSetsToday,
    finished,
    orderIsCustom,
    moveRow,
    resetRowOrder,
    swapRow,
    swapOptionsFor,
    skipRow,
    unskipRow,
    skippedToday,
    addedToday,
    removeAddedRow,
    addExerciseToToday,
    plannedMinutes,
  } = useStore();

  const [view, setView] = useState<OrderView>("mine");
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [rx, setRx] = useState({ sets: 3, reps: 1, rest: 90 });
  const [applied, setApplied] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");

  /**
   * The queue drags (2026-10-19). The preview order lives here until the
   * finger lifts; only then does `moveRow` write one sequence. That is what
   * keeps a gesture from rebuilding the day's plan dozens of times.
   */
  const drag = usePointerReorder(
    rows.map((row) => row.exerciseId),
    (order, draggedId) => {
      const from = rows.findIndex((row) => row.exerciseId === draggedId);
      const to = order.indexOf(draggedId);
      if (from < 0 || to < 0 || from === to) return;
      moveRow(from, to);
      setAnnouncement(
        tInterp("ent.order.moved", { n: to + 1, total: order.length }),
      );
    },
  );

  const totals = useMemo(() => dayTotals(rows), [rows]);

  /** Rows in the live drag preview, or the store's own order when idle. */
  const displayRows = useMemo(() => {
    if (!drag.order) return rows;
    const byId = new Map(rows.map((row) => [row.exerciseId, row]));
    return drag.order
      .map((id) => byId.get(id))
      .filter((row): row is PlannedRow => Boolean(row));
  }, [drag.order, rows]);

  /**
   * The plan's own reasons, deduplicated in the order they appear. This is the
   * page's "¿Por qué estos?" — the same strings the session shows, never a
   * second explanation written for this screen.
   */
  const reasons = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of rows) {
      for (const reason of row.reasons) {
        const line = formatReason(reason);
        if (seen.has(line)) continue;
        seen.add(line);
        out.push(line);
      }
    }
    return out.slice(0, 6);
  }, [rows]);

  /** Candidates for "añadir varios": usable, not already today, matching search. */
  const addable = useMemo(() => {
    if (!plan) return [];
    const inPlan = new Set(rows.map((row) => row.exerciseId));
    const query = search.trim().toLocaleLowerCase();
    return plan.usable
      .filter((entry) => !inPlan.has(entry.exercise.id))
      .filter((entry) => {
        if (!query) return true;
        return exerciseName(entry.exercise.id, getLanguage())
          .toLocaleLowerCase()
          .includes(query);
      });
  }, [plan, rows, search]);

  if (loading || !settings || !plan) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const isRestDay = rows.length === 0;
  const inProgress = finished === null && totalSetsToday > 0;
  const addedSet = new Set(addedToday);
  const gearGroups = groupByGear(rows, settings.inventory);
  const familyGroups = groupByFamily(rows);
  const hint = startElsewhere(rows, settings.inventory);
  const fatigue = plan.fatigue;

  const visible = addable.slice(0, PAGE_SIZE);
  const allVisibleSelected =
    visible.length > 0 &&
    visible.every((entry) => selected.includes(entry.exercise.id));

  const toggleSelected = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );

  const toggleAllVisible = () =>
    setSelected(
      allVisibleSelected ? [] : visible.map((entry) => entry.exercise.id),
    );

  const applyBulk = () => {
    const reps = REP_PRESETS[rx.reps] ?? REP_PRESETS[0];
    let added = 0;
    for (const id of selected) {
      const ok = addExerciseToToday(id, {
        sets: rx.sets,
        repsMin: reps.min,
        repsMax: reps.max,
        restSec: rx.rest,
      });
      if (ok) added += 1;
    }
    setApplied(added);
    setSelected([]);
  };

  const removeOrSkip = (row: PlannedRow) => {
    setSwapFor(null);
    if (addedSet.has(row.exerciseId)) removeAddedRow(row.exerciseId);
    else skipRow(row.exerciseId);
  };

  /** The swap picker's data: only gear-legal, same-pattern alternatives. */
  const swapProps = (row: PlannedRow) => ({
    swapOpen: swapFor === row.exerciseId,
    onToggleSwap: () =>
      setSwapFor((current) =>
        current === row.exerciseId ? null : row.exerciseId,
      ),
    onSwap: (to: string) => {
      swapRow(row.exerciseId, to);
      setSwapFor(null);
    },
    swapOptions: swapOptionsFor(row.exerciseId).map((entry) => ({
      id: entry.exercise.id,
      name: exerciseName(entry.exercise.id, getLanguage()),
    })),
  });

  return (
    <>
      <header className="topbar">
        <span className="pill">
          <MIcons.calendar />
          {todayLabel()}
        </span>
        <div className="spacer" />
        {finished !== null ? (
          <span className="badge badge-success">
            <MIcons.circleCheck />
            {t("hoy.complete")}
          </span>
        ) : (
          !isRestDay && (
            <a className="btn btn-primary btn-lg" href="#/sesion">
              <MIcons.play />
              {inProgress ? t("home.hero.continue") : t("hoy.start")}
            </a>
          )
        )}
      </header>

      <div className="content">
        <div className="cols">
          <div className="stack">
            <div className="stack" style={{ gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.6px" }}>
                {t("ent.title")}
              </h1>
              <p className="small muted" style={{ margin: 0 }}>
                {isRestDay
                  ? t("ent.rest")
                  : `${uniqueFamilies(rows).map(familyLabel).join(" · ")} · ${tInterp(
                      "ent.sub",
                      {
                        minutes: plannedMinutes,
                        exercises: totals.exercises,
                        sets: totals.sets,
                      },
                    )}`}
              </p>
            </div>

            {!isRestDay && view === "mine" && (
              <p className="tiny muted" style={{ margin: 0 }}>
                {t("common.dragHint")}
              </p>
            )}

            {!isRestDay && (
              <div className="seg" style={{ alignSelf: "flex-start" }}>
                <SegButton
                  active={view === "mine"}
                  onClick={() => setView("mine")}
                  icon={<MIcons.move />}
                >
                  {t("ent.view.mine")}
                </SegButton>
                <SegButton
                  active={view === "gear"}
                  onClick={() => setView("gear")}
                  icon={<MIcons.dumbbell />}
                >
                  {t("ent.view.gear")}
                </SegButton>
                <SegButton
                  active={view === "muscle"}
                  onClick={() => setView("muscle")}
                  icon={<MIcons.users />}
                >
                  {t("ent.view.muscle")}
                </SegButton>
              </div>
            )}

            <section className="card">
              {isRestDay ? (
                <div className="card-pad">
                  <p style={{ margin: 0 }}>{t("ent.restHint")}</p>
                  <div className="row" style={{ marginTop: 12 }}>
                    <a className="btn" href="#/semana">
                      {t("ent.goWeek")}
                    </a>
                  </div>
                </div>
              ) : view === "mine" ? (
                <div>
                  {displayRows.map((row, index) => (
                    <PlanRowView
                      key={row.exerciseId}
                      row={row}
                      position={index + 1}
                      from={index}
                      showOrder
                      canUp={index > 0}
                      canDown={index < displayRows.length - 1}
                      onMove={(to) => moveRow(index, to)}
                      onDragStart={(event) => drag.start(event, row.exerciseId)}
                      dragging={drag.draggingId === row.exerciseId}
                      added={addedSet.has(row.exerciseId)}
                      out={skippedToday.includes(row.exerciseId)}
                      onRemove={() => removeOrSkip(row)}
                      onRestore={() => unskipRow(row.exerciseId)}
                      {...swapProps(row)}
                    />
                  ))}
                </div>
              ) : view === "gear" ? (
                <div className="card-pad">
                  {gearGroups.map((group) => (
                    <GroupBlock
                      key={group.capability ?? "bodyweight"}
                      label={group.label ?? t("ent.bodyweight")}
                      count={group.rows.length}
                      rows={group.rows}
                      addedSet={addedSet}
                      skipped={skippedToday}
                      positionOf={(row) => rows.indexOf(row) + 1}
                      swapProps={swapProps}
                      onRemove={removeOrSkip}
                      onRestore={unskipRow}
                    />
                  ))}
                </div>
              ) : (
                <div className="card-pad">
                  {familyGroups.map((group) => (
                    <GroupBlock
                      key={group.family}
                      label={familyLabel(group.family)}
                      count={group.rows.length}
                      rows={group.rows}
                      addedSet={addedSet}
                      skipped={skippedToday}
                      positionOf={(row) => rows.indexOf(row) + 1}
                      swapProps={swapProps}
                      onRemove={removeOrSkip}
                      onRestore={unskipRow}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* No longer a lie: Rutinas exists, so the mockup's second button
                opens the shelf instead of nothing. It adds rows through the
                store's own verb — this link only navigates. */}
            <div className="row-wrap">
              <a className="btn tl-focusable" href="#/rutinas">
                <MIcons.list />
                {t("ent.fromRoutine")}
              </a>
            </div>

            {!isRestDay && orderIsCustom && view === "mine" && (
              <button
                type="button"
                className="btn tl-focusable"
                style={{ alignSelf: "flex-start" }}
                onClick={() => resetRowOrder()}
              >
                <MIcons.rotate />
                {t("ent.order.reset")}
              </button>
            )}

            <p className="sr-only" role="status" aria-live="polite">
              {announcement}
            </p>

            {!isRestDay && (
              <div className="stack" style={{ gap: 8 }}>
                <p className="tiny muted" style={{ margin: 0 }}>
                  {tInterp("ent.bar", {
                    minutes: plannedMinutes,
                    budget: settings.timeBudgetMin,
                  })}
                </p>
                <div className="bar">
                  <i
                    style={{
                      width: `${budgetFill(
                        plannedMinutes,
                        settings.timeBudgetMin,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* ══ Añadir varios — the page's own drawer, as a section ══════ */}
            <details className="card" id="ent-add">
              <summary className="card-head" style={{ cursor: "pointer" }}>
                <span className="card-title">
                  <MIcons.plus />
                  {t("ent.add.title")}
                </span>
                <div className="spacer" />
                <span className="badge badge-plain">
                  {tInterp("ent.add.available", { n: addable.length })}
                </span>
              </summary>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <p className="tiny muted" style={{ margin: "0 0 10px" }}>
                  {t("ent.add.hint")}
                </p>

                <div
                  className="field"
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <MIcons.search />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("ent.add.search")}
                    aria-label={t("ent.add.search")}
                    className="grow"
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--tl-text)",
                      // 16 px, not 14: below that iOS Safari zooms the page when
                      // the field takes focus (audited 2026-10-18).
                      fontSize: 16,
                      minWidth: 0,
                    }}
                  />
                </div>

                {visible.length === 0 ? (
                  <p className="small muted" style={{ margin: "12px 0 0" }}>
                    {t("ent.add.empty")}
                  </p>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="row tl-focusable"
                      style={{ gap: 9, padding: "8px 0", width: "100%" }}
                      onClick={toggleAllVisible}
                    >
                      <span
                        className={`checkbox ${allVisibleSelected ? "is-on" : ""}`}
                      >
                        <MIcons.check />
                      </span>
                      <span className="small bold">
                        {tInterp("ent.add.selectAll", { n: visible.length })}
                      </span>
                    </button>
                    {visible.map((entry) => {
                      const on = selected.includes(entry.exercise.id);
                      return (
                        <button
                          key={entry.exercise.id}
                          type="button"
                          className="ent-add tl-focusable"
                          aria-pressed={on}
                          onClick={() => toggleSelected(entry.exercise.id)}
                        >
                          <span className={`checkbox ${on ? "is-on" : ""}`}>
                            <MIcons.check />
                          </span>
                          <ExerciseThumb
                            exerciseId={entry.exercise.id}
                            size={40}
                          />
                          <span>
                            <span className="ent-name">
                              {exerciseName(entry.exercise.id, getLanguage())}
                            </span>
                            <span className="ent-rx">
                              {entry.families
                                .slice(0, 3)
                                .map(familyLabel)
                                .join(" · ")}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    {addable.length > visible.length && (
                      <p className="tiny muted" style={{ margin: "8px 0 0" }}>
                        {tInterp("ent.add.showing", {
                          shown: visible.length,
                          total: addable.length,
                        })}
                      </p>
                    )}
                  </div>
                )}

                <div className="divider" style={{ margin: "14px 0" }} />

                <p className="small bold" style={{ margin: "0 0 8px" }}>
                  {tInterp("ent.add.applyTo", { n: selected.length })}
                </p>
                <div className="ent-fields">
                  <div className="field">
                    <div className="field-label">{t("ent.fields.sets")}</div>
                    <select
                      className="stepper-input"
                      style={{ fontSize: 18, textAlign: "left" }}
                      value={rx.sets}
                      onChange={(event) =>
                        setRx((prev) => ({
                          ...prev,
                          sets: Number(event.target.value),
                        }))
                      }
                    >
                      {[2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <div className="field-label">{t("ent.fields.reps")}</div>
                    <select
                      className="stepper-input"
                      style={{ fontSize: 18, textAlign: "left" }}
                      value={rx.reps}
                      onChange={(event) =>
                        setRx((prev) => ({
                          ...prev,
                          reps: Number(event.target.value),
                        }))
                      }
                    >
                      {REP_PRESETS.map((preset, index) => (
                        <option
                          key={`${preset.min}-${preset.max}`}
                          value={index}
                        >
                          {preset.min}–{preset.max}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <div className="field-label">{t("ent.fields.rest")}</div>
                    <select
                      className="stepper-input"
                      style={{ fontSize: 18, textAlign: "left" }}
                      value={rx.rest}
                      onChange={(event) =>
                        setRx((prev) => ({
                          ...prev,
                          rest: Number(event.target.value),
                        }))
                      }
                    >
                      {REST_PRESETS.map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {seconds} s
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-xl tl-focusable"
                  style={{ marginTop: 14, width: "100%" }}
                  disabled={selected.length === 0}
                  onClick={applyBulk}
                >
                  <MIcons.check />
                  {tInterp("ent.add.apply", { n: selected.length })}
                </button>
                {applied !== null && (
                  <p className="small muted" style={{ margin: "8px 0 0" }}>
                    {applied > 0
                      ? tInterp("ent.add.applied", { n: applied })
                      : t("ent.add.none")}
                  </p>
                )}
              </div>
            </details>
          </div>

          {/* ══ The why, and what to grab first ══════════════════════════ */}
          <div className="stack">
            <section className="card card-pad">
              <h2 className="card-title" style={{ marginBottom: 4 }}>
                <MIcons.lightbulb />
                {t("ent.why.title")}
              </h2>
              <p className="tiny muted" style={{ margin: "0 0 8px" }}>
                {t("ent.why.hint")}
              </p>

              <WhyRow icon={<MIcons.target />} label={t("ent.why.goal")}>
                {t(
                  settings.goal === "strength"
                    ? "goal.strength"
                    : settings.goal === "recomposition"
                      ? "goal.recomposition"
                      : "goal.hypertrophy",
                )}
              </WhyRow>
              <WhyRow icon={<MIcons.bars />} label={t("ent.why.level")}>
                {t(
                  settings.level === "beginner"
                    ? "level.beginner"
                    : settings.level === "advanced"
                      ? "level.advanced"
                      : "level.intermediate",
                )}
              </WhyRow>
              <WhyRow icon={<MIcons.dumbbell />} label={t("ent.why.gear")}>
                {settings.inventory.length > 0
                  ? settings.inventory
                      .slice(0, 3)
                      .map((item) => item.label)
                      .join(", ")
                  : t("ent.why.noGear")}
              </WhyRow>
              <WhyRow icon={<MIcons.clock />} label={t("ent.why.budget")}>
                {tInterp("ent.why.budgetLine", {
                  n: settings.timeBudgetMin,
                  planned: plannedMinutes,
                })}
              </WhyRow>
              <WhyRow icon={<MIcons.timer />} label={t("ent.why.recovery")}>
                {fatigue && fatigue.entries.length > 0
                  ? fatigue.entries
                      .map(
                        (entry) =>
                          `${familyLabel(entry.family)} ${Math.round(entry.hoursSince)} h`,
                      )
                      .join(" · ")
                  : t("ent.why.recoveryNone")}
              </WhyRow>

              {reasons.length > 0 && (
                <>
                  <div className="divider" style={{ margin: "12px 0" }} />
                  <p className="small bold" style={{ margin: "0 0 4px" }}>
                    {t("ent.why.plan")}
                  </p>
                  {reasons.map((line) => (
                    <div key={line} className="ent-why">
                      <MIcons.sparkles />
                      <span>
                        <span>{line}</span>
                      </span>
                    </div>
                  ))}
                </>
              )}

              <div className="divider" style={{ margin: "12px 0" }} />
              <p className="small bold" style={{ margin: "0 0 6px" }}>
                {t("ent.why.numbers")}
              </p>
              <NumRow icon={<MIcons.bars />} label={t("ent.why.exercises")}>
                {totals.exercises}
              </NumRow>
              <NumRow icon={<MIcons.list />} label={t("ent.why.sets")}>
                {totals.sets}
              </NumRow>
              <NumRow icon={<MIcons.clock />} label={t("ent.why.minutes")}>
                {tInterp("session.minutes", { n: totals.minutes })}
              </NumRow>
            </section>

            {gearGroups.length > 0 && (
              <section className="card card-pad">
                <h2 className="card-title" style={{ marginBottom: 4 }}>
                  <MIcons.layers />
                  {t("ent.gear.title")}
                </h2>
                <p className="tiny muted" style={{ margin: "0 0 8px" }}>
                  {t("ent.gear.hint")}
                </p>
                {gearGroups.map((group) => (
                  <div key={group.capability ?? "bodyweight"}>
                    <div className="ent-group">
                      <MIcons.dumbbell />
                      <span>{group.label ?? t("ent.bodyweight")}</span>
                      <span className="n">
                        {tInterp("ent.groupCount", { n: group.rows.length })}
                      </span>
                    </div>
                    <div className="row-wrap">
                      {group.rows.map((row) => (
                        <span key={row.exerciseId} className="tag">
                          {exerciseName(row.exerciseId, getLanguage())}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {hint && (
                  <div className="warn-strip" style={{ marginTop: 12 }}>
                    <MIcons.alert />
                    <span>
                      {tInterp("ent.gear.busy", {
                        gear: hint.gear,
                        exercise: exerciseName(
                          hint.row.exerciseId,
                          getLanguage(),
                        ),
                      })}
                    </span>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Pieces
   ══════════════════════════════════════════════════════════════════════════ */

/** One heading plus its rows, shared by the equipment and muscle projections. */
function GroupBlock({
  label,
  count,
  rows,
  addedSet,
  skipped,
  positionOf,
  swapProps,
  onRemove,
  onRestore,
}: {
  label: string;
  count: number;
  rows: PlannedRow[];
  addedSet: Set<string>;
  skipped: string[];
  positionOf: (row: PlannedRow) => number;
  swapProps: (row: PlannedRow) => {
    swapOpen: boolean;
    onToggleSwap: () => void;
    onSwap: (to: string) => void;
    swapOptions: { id: string; name: string }[];
  };
  onRemove: (row: PlannedRow) => void;
  onRestore: (exerciseId: string) => void;
}) {
  return (
    <div>
      <div className="ent-group">
        <MIcons.layers />
        <span>{label}</span>
        <span className="n">{tInterp("ent.groupCount", { n: count })}</span>
      </div>
      {rows.map((row) => (
        <PlanRowView
          key={row.exerciseId}
          row={row}
          position={positionOf(row)}
          from={-1}
          showOrder={false}
          canUp={false}
          canDown={false}
          onMove={() => undefined}
          added={addedSet.has(row.exerciseId)}
          out={skipped.includes(row.exerciseId)}
          onRemove={() => onRemove(row)}
          onRestore={() => onRestore(row.exerciseId)}
          {...swapProps(row)}
        />
      ))}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`seg-item tl-focusable ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

/** One row of the queue: what it is, what it costs, and what you can do to it. */
function PlanRowView({
  row,
  position,
  from,
  showOrder,
  canUp,
  canDown,
  onMove,
  onDragStart,
  dragging = false,
  added,
  out,
  swapOpen,
  onToggleSwap,
  onSwap,
  swapOptions,
  onRemove,
  onRestore,
}: {
  row: PlannedRow;
  /** The number the row shows (its place in today's session). */
  position: number;
  /** Its 0-based place in `rows` — what `moveRow` takes. */
  from: number;
  showOrder: boolean;
  canUp: boolean;
  canDown: boolean;
  onMove: (to: number) => void;
  /** Starts the pointer drag from the grip. Absent in grouped projections. */
  onDragStart?: (event: PointerEvent) => void;
  dragging?: boolean;
  added: boolean;
  out: boolean;
  swapOpen: boolean;
  onToggleSwap: () => void;
  onSwap: (to: string) => void;
  swapOptions: { id: string; name: string }[];
  onRemove: () => void;
  onRestore: () => void;
}) {
  return (
    <div
      className={`ent-row ${out ? "is-out" : ""} ${dragging ? "is-dragging" : ""}`}
      data-drag-id={showOrder ? row.exerciseId : undefined}
    >
      <span className="ent-grip">
        {showOrder && onDragStart && (
          <button
            type="button"
            className="drag-handle tl-focusable"
            data-testid={`drag-${row.exerciseId}`}
            aria-label={t("common.dragHandle")}
            title={t("common.dragHint")}
            onPointerDown={onDragStart}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" && canUp) {
                event.preventDefault();
                onMove(from - 1);
              } else if (event.key === "ArrowDown" && canDown) {
                event.preventDefault();
                onMove(from + 1);
              }
            }}
          >
            <MIcons.grip />
          </button>
        )}
      </span>
      <span className="ent-idx">{added ? "★" : position}</span>
      <ExerciseThumb exerciseId={row.exerciseId} size={44} />
      <span className="grow">
        <span className="ent-name">
          {exerciseName(row.exerciseId, getLanguage())}
        </span>
        <span className="ent-rx">
          {row.sets} × {row.repsMin}–{row.repsMax} · RIR {row.rir} ·{" "}
          {tInterp("ent.restSec", { s: row.restSec })}
        </span>
        <span className="ent-gear">
          {row.families.slice(0, 2).map((family) => (
            <span key={family} className="tag">
              {familyLabel(family)}
            </span>
          ))}
          {added && (
            <span className="badge badge-accent">{t("ent.row.added")}</span>
          )}
          {out && (
            <span className="badge badge-warning">{t("ent.row.out")}</span>
          )}
        </span>
      </span>
      <span className="ent-actions">
        <a className="btn btn-sm btn-primary" href="#/sesion">
          {t("ent.row.start")}
        </a>
        {showOrder && (
          <>
            <button
              type="button"
              className="icon-btn tl-focusable"
              title={t("ent.row.up")}
              aria-label={t("ent.row.up")}
              disabled={!canUp}
              onClick={() => onMove(from - 1)}
            >
              <MIcons.arrowUp />
            </button>
            <button
              type="button"
              className="icon-btn tl-focusable"
              title={t("ent.row.down")}
              aria-label={t("ent.row.down")}
              disabled={!canDown}
              onClick={() => onMove(from + 1)}
            >
              <MIcons.arrowDown />
            </button>
          </>
        )}
        <button
          type="button"
          className="btn btn-sm tl-focusable"
          aria-expanded={swapOpen}
          disabled={swapOptions.length === 0 && !out}
          onClick={onToggleSwap}
        >
          <MIcons.repeat />
          {t("ent.row.swap")}
        </button>
        <button
          type="button"
          className="icon-btn tl-focusable"
          title={out ? t("ent.row.restore") : t("ent.row.remove")}
          aria-label={out ? t("ent.row.restore") : t("ent.row.remove")}
          onClick={out ? onRestore : onRemove}
        >
          {out ? <MIcons.rotate /> : <MIcons.trash />}
        </button>
      </span>

      {swapOpen && (
        <div className="ent-swap">
          <div className="small bold" style={{ marginBottom: 6 }}>
            {t("session.swapTitle")}
          </div>
          {swapOptions.length === 0 ? (
            <p className="tiny muted" style={{ margin: 0 }}>
              {t("ent.row.noSwap")}
            </p>
          ) : (
            <div className="row-wrap">
              {swapOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="btn btn-sm tl-focusable"
                  onClick={() => onSwap(option.id)}
                >
                  {option.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="tiny tl-focusable"
            style={{
              marginTop: 8,
              fontWeight: 600,
              color: "var(--tl-text-muted)",
            }}
            onClick={onToggleSwap}
          >
            {t("ent.row.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

function WhyRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="ent-why">
      {icon}
      <span>
        <b>{label}</b>
        <span>{children}</span>
      </span>
    </div>
  );
}

function NumRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="ent-num">
      {icon}
      <span>{label}</span>
      <b>{children}</b>
    </div>
  );
}

/** `vie, 18 oct` — the date pill, in the user's language. */
function todayLabel(): string {
  return new Date().toLocaleDateString(
    getLanguage() === "es" ? "es-ES" : "en-GB",
    { weekday: "short", day: "numeric", month: "short" },
  );
}

/** The families of today, in the order they first appear (three at most). */
function uniqueFamilies(rows: PlannedRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    for (const family of row.families) {
      if (seen.has(family)) continue;
      seen.add(family);
      out.push(family);
    }
  }
  return out.slice(0, 3);
}
