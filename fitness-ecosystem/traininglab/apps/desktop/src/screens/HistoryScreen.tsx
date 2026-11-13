/**
 * Historial — what has already been trained, newest first.
 *
 * **2026-11-09 (P0).** This screen used to draw the old `.tl-page` /
 * `.tl-topbar` shell. It now uses the same `topbar` + `content` + `card`
 * language as Hoy, Entrenamiento and Rutinas, so the record no longer looks
 * like a second product. The data contract did not change:
 *
 *   * one card per **closed** session (`closedSessionHistory` decides that);
 *   * working sets and volume exclude warm-ups, and a duration is printed only
 *     when the source supports it;
 *   * the detail lists **all** sets through `summariseSession`, the same
 *     derivation the post-session summary uses — no second set-by-set rule;
 *   * renaming and deleting keep the existing confirmation and 20-second undo,
 *     both routed through the store's `editSession`/`removeSession` actions.
 *
 * Filters (period + exercise/name search) only narrow what is on screen; they
 * never touch the log. The card's totals and the KPI strip follow the visible
 * rows so a filtered list cannot show numbers from sessions it is hiding.
 *
 * @module screens/HistoryScreen
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLanguage, t, tInterp } from "../lib/i18n";
import { EFFORT_MARKERS, EFFORT_MEANING } from "../lib/effort";
import { exerciseName } from "../lib/plan";
import { localDayKey } from "../lib/day";
import { useStore } from "../app/store";
import { hashFor } from "../app/router";
import {
  closedSessionHistory,
  type SessionHistoryEntry,
} from "../features/stats/derive";
import { filterSessionHistory } from "../lib/history-filter";
import { summariseSession, type SummarySet } from "../lib/session-summary";
import { setEditPatch } from "../lib/set-edit";
import { sessionDeletePlan } from "../lib/session-delete";
import { ExerciseThumb } from "../features/exercises/ExerciseThumb";
import { MIcons } from "../ui/mockup-icons";
import type { TLSet, TLSession } from "../lib/types";

/** How long «Deshacer» stays available after a deletion. */
const UNDO_MS = 20_000;

type Period = "all" | "30" | "90";

/** The period selector labels live here, not in a template-string key. */
function periodLabel(period: Period): string {
  if (period === "30") return t("hist.period.30");
  if (period === "90") return t("hist.period.90");
  return t("hist.period.all");
}

export default function HistoryScreen() {
  const {
    sessions,
    sets,
    loading,
    removeSession,
    restoreSession,
    editSession,
    editSet,
  } = useStore();
  const lang = getLanguage();

  // The archive is the whole local log, not the MCP/list default of 60: a
  // period or exercise filter must be able to reach an old session too.
  const { entries, total } = useMemo(
    () =>
      closedSessionHistory(sessions, sets, undefined, Number.MAX_SAFE_INTEGER),
    [sessions, sets],
  );

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /** The session that can still be brought back, with the sets it took. */
  const [undo, setUndo] = useState<{
    session: TLSession;
    sets: TLSet[];
    expiresAt: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!undo) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [undo]);

  const secondsLeft = undo
    ? Math.max(0, Math.ceil((undo.expiresAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (undo && secondsLeft <= 0) setUndo(null);
  }, [undo, secondsLeft]);

  const closeDetail = useCallback(() => setSelectedId(null), []);

  const query = search.trim().toLocaleLowerCase(lang);
  const cutoff = useMemo(() => {
    const days = period === "30" ? 30 : period === "90" ? 90 : 0;
    if (days === 0) return null;
    return localDayKey(new Date(Date.now() - days * 86_400_000));
  }, [period]);

  const filtered = useMemo(
    () =>
      filterSessionHistory(
        entries,
        { query, notBefore: cutoff },
        (exerciseId) => exerciseName(exerciseId, lang),
      ),
    [cutoff, entries, lang, query],
  );

  const shownSets = filtered.reduce((sum, entry) => sum + entry.workingSets, 0);
  const shownVolume = filtered.reduce((sum, entry) => sum + entry.volumeKg, 0);
  const filtering = query.length > 0 || period !== "all";

  const selectedEntry = selectedId
    ? entries.find((entry) => entry.id === selectedId)
    : undefined;
  const selectedSession = selectedId
    ? sessions.find((session) => session.id === selectedId)
    : undefined;

  if (loading) return <div className="tl-loading">{t("common.loading")}</div>;

  /** Delete one session, remembering exactly what it took for the undo. */
  const deleteSession = (session: TLSession) => {
    const plan = sessionDeletePlan(session, sets);
    const removed = new Set(plan.setIds);
    const removedSets = sets.filter((row) => removed.has(row.id));
    removeSession(session.id, { deleteSets: true });
    setUndo({
      session,
      sets: removedSets,
      expiresAt: Date.now() + UNDO_MS,
    });
    setSelectedId(null);
  };

  return (
    <>
      <header className="topbar">
        <span className="pill">
          <MIcons.clock />
          {total === 1
            ? t("hist.countPillOne")
            : tInterp("hist.countPill", { n: total })}
        </span>
        <div className="spacer" />
        {total > 0 && (
          <span className="badge badge-accent">
            <MIcons.layers />
            {tInterp("hist.pillSets", { n: shownSets })}
          </span>
        )}
      </header>

      <div className="content">
        <div className="stack" style={{ gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.6px" }}>
            {t("nav.history")}
          </h1>
          <p className="small muted" style={{ margin: 0 }}>
            {total === 0
              ? t("hist.pageHintEmpty")
              : tInterp("hist.pageHint", { n: total })}
          </p>
        </div>

        {undo && (
          <div
            role="status"
            aria-live="polite"
            className="card card-pad history-undo"
          >
            <MIcons.rotate className="icon" />
            <span className="small">
              {t("hist.deleted")}
              <span className="muted">
                {" · "}
                {tInterp("hist.undoSets", { n: undo.sets.length })}
              </span>
            </span>
            <div className="row-wrap">
              <button
                type="button"
                className="btn btn-primary tl-focusable"
                onClick={() => {
                  restoreSession(undo.session, undo.sets);
                  setUndo(null);
                }}
              >
                {tInterp("hist.undoIn", { n: secondsLeft })}
              </button>
              <button
                type="button"
                className="btn btn-ghost tl-focusable"
                onClick={() => setUndo(null)}
              >
                {t("hist.dismiss")}
              </button>
            </div>
          </div>
        )}

        {total > 0 && (
          <div className="history-tools">
            <label className="field history-search">
              <MIcons.search />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("hist.searchPlaceholder")}
                aria-label={t("hist.searchPlaceholder")}
              />
            </label>
            <div
              className="seg"
              role="group"
              aria-label={t("hist.periodLabel")}
            >
              {(["all", "30", "90"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`seg-item tl-focusable${period === id ? " is-active" : ""}`}
                  aria-pressed={period === id}
                  onClick={() => setPeriod(id)}
                >
                  {periodLabel(id)}
                </button>
              ))}
            </div>
          </div>
        )}

        {total === 0 ? (
          <section className="card card-pad history-empty">
            <MIcons.clock style={{ width: 28, height: 28 }} />
            <h2>{t("hist.empty")}</h2>
            <p className="small muted">{t("hist.emptyHint")}</p>
          </section>
        ) : (
          <>
            <div className="summary-kpis history-kpis">
              <div className="summary-kpi">
                <b>{filtered.length}</b>
                <span>{t("hist.kpiSessions")}</span>
              </div>
              <div className="summary-kpi">
                <b>{shownSets}</b>
                <span>{t("hist.kpiSets")}</span>
              </div>
              <div className="summary-kpi">
                <b>{formatKg(shownVolume, lang)}</b>
                <span>{t("hist.kpiVolume")}</span>
              </div>
            </div>

            <div className="row-wrap">
              <span className="card-title" style={{ fontSize: 17 }}>
                <MIcons.list />
                {t("hist.listTitle")}
              </span>
              <span className="spacer" />
              <span className="small muted">
                {filtering
                  ? tInterp("hist.filtered", {
                      shown: filtered.length,
                      total,
                    })
                  : tInterp("hist.shownCount", { n: filtered.length })}
              </span>
            </div>

            {filtered.length === 0 ? (
              <section className="card card-pad history-empty">
                <MIcons.search style={{ width: 28, height: 28 }} />
                <h2>{t("hist.noMatches")}</h2>
                <p className="small muted">{t("hist.noMatchesHint")}</p>
                <button
                  type="button"
                  className="btn tl-focusable"
                  onClick={() => {
                    setSearch("");
                    setPeriod("all");
                  }}
                >
                  {t("hist.clearFilters")}
                </button>
              </section>
            ) : (
              <ul className="history-list">
                {filtered.map((entry) => (
                  <SessionCard
                    key={entry.id}
                    entry={entry}
                    lang={lang}
                    onOpen={() => setSelectedId(entry.id)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {selectedEntry && (
        <SessionDetail
          entry={selectedEntry}
          session={selectedSession}
          sets={sets}
          lang={lang}
          onClose={closeDetail}
          onEdit={editSession}
          onEditSet={editSet}
          onDelete={deleteSession}
        />
      )}
    </>
  );
}

/** One closed session: the day, what it cost, and the way into its sets. */
function SessionCard({
  entry,
  lang,
  onOpen,
}: {
  entry: SessionHistoryEntry;
  lang: "es" | "en";
  onOpen: () => void;
}) {
  const shown = entry.exercises.slice(0, 4);
  const hidden = entry.exercises.length - shown.length;

  return (
    <li className="card history-card" data-testid="history-card">
      <div className="history-card-head">
        <div style={{ minWidth: 0 }}>
          <div className="history-card-title">
            {formatDay(entry.date, lang)}
          </div>
          {entry.title && (
            <div className="small secondary ellipsis">{entry.title}</div>
          )}
          <div className="history-card-meta">
            {entry.location && (
              <span className="badge">{t(`hist.place.${entry.location}`)}</span>
            )}
            {entry.source && entry.source !== "traininglab" && (
              <span className="badge badge-info" title={t("hist.sourceHint")}>
                {entry.source}
              </span>
            )}
          </div>
        </div>
        <div className="row-wrap history-card-marks">
          {EFFORT_MARKERS.filter((mark) => entry.markers[mark] > 0).map(
            (mark) => (
              <span
                key={mark}
                className={`badge ${mark === "F" ? "badge-danger" : "badge-warning"}`}
                title={`${EFFORT_MEANING[mark].label[lang]} · ${EFFORT_MEANING[mark].detail[lang]}`}
              >
                {mark} · {entry.markers[mark]}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="history-card-stats">
        <span>
          {entry.workingSets === 1
            ? t("hist.setOne")
            : tInterp("hist.sets", { n: entry.workingSets })}
          {entry.warmupSets > 0 &&
            ` · ${tInterp("hist.warmup", { n: entry.warmupSets })}`}
        </span>
        <span>
          {entry.exercises.length === 1
            ? t("hist.exerciseOne")
            : tInterp("hist.exercises", { n: entry.exercises.length })}
        </span>
        {entry.volumeKg > 0 && (
          <span>
            {tInterp("hist.volume", { kg: formatKg(entry.volumeKg, lang) })}
          </span>
        )}
        {entry.durationMin !== null && (
          <span>{tInterp("hist.duration", { n: entry.durationMin })}</span>
        )}
      </div>

      <div className="row-wrap">
        {shown.map((line) => (
          <span className="chip" key={line.exerciseId}>
            {exerciseName(line.exerciseId, lang)} ×{line.sets}
          </span>
        ))}
        {hidden > 0 && (
          <span className="chip chip-optional">
            {tInterp("hist.moreExercises", { n: hidden })}
          </span>
        )}
      </div>

      <div className="history-card-actions">
        <button
          type="button"
          className="btn btn-lg tl-focusable"
          onClick={onOpen}
          data-testid="history-open"
        >
          <MIcons.chevronRight />
          {t("hist.open")}
        </button>
      </div>
    </li>
  );
}

/**
 * The session's own record. It reuses the summary's `SummarySet` rows so a set
 * cannot be one thing here and another on the close-of-session screen.
 */
function SessionDetail({
  entry,
  session,
  sets,
  lang,
  onClose,
  onEdit,
  onEditSet,
  onDelete,
}: {
  entry: SessionHistoryEntry;
  /** Missing only if the list and the log disagree. */
  session: TLSession | undefined;
  sets: readonly TLSet[];
  lang: "es" | "en";
  onClose: () => void;
  onEdit: (id: string, patch: Partial<TLSession>) => void;
  onEditSet: (
    id: string,
    patch: {
      weight?: number | null;
      reps?: number | null;
      effort?: "D" | "F" | null;
    },
  ) => void;
  onDelete: (session: TLSession) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [name, setName] = useState(session?.title ?? "");
  const [place, setPlace] = useState<"" | "gym" | "home">(
    session?.location ?? "",
  );
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editEffort, setEditEffort] = useState<"D" | "F" | null>(null);
  const editTrigger = useRef<string | null>(null);

  const summary = useMemo(
    () => (session ? summariseSession(session, [...sets]) : null),
    [session, sets],
  );
  const plan = useMemo(
    () => (session ? sessionDeletePlan(session, [...sets]) : null),
    [session, sets],
  );

  /** Focus the close button, keep Tab inside, and give focus back on unmount. */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
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
      previous?.focus();
    };
  }, [onClose]);

  if (!session || !summary) return null;

  const startEdit = () => {
    setName(session.title ?? "");
    setPlace(session.location ?? "");
    setMode("edit");
  };

  const saveEdit = () => {
    const trimmed = name.trim();
    onEdit(session.id, {
      title: trimmed.length > 0 ? trimmed.slice(0, 80) : undefined,
      location: place === "" ? undefined : place,
    });
    setMode("view");
  };

  const startSetEdit = (set: SummarySet) => {
    editTrigger.current = set.id;
    setEditingSetId(set.id);
    setEditWeight(set.weightKg !== null ? String(set.weightKg) : "");
    setEditReps(set.reps !== null ? String(set.reps) : "");
    setEditEffort(set.marker);
  };

  const stopSetEdit = () => {
    setEditingSetId(null);
    // Escape/Guardar removes the row's form; without this the focus would fall
    // back to the document and a keyboard user would lose their place. A timer,
    // not rAF: the preview tab can be throttled and never run the frame.
    window.setTimeout(() => {
      if (!editTrigger.current) return;
      document
        .querySelector<HTMLButtonElement>(
          `[data-testid="history-detail-set-edit"][data-set-id="${editTrigger.current}"]`,
        )
        ?.focus();
    }, 0);
  };

  const saveSetEdit = (set: SummarySet) => {
    onEditSet(
      set.id,
      setEditPatch(
        { weight: set.weightKg, reps: set.reps },
        { weight: editWeight, reps: editReps, effort: editEffort },
      ),
    );
    stopSetEdit();
  };

  let workNo = 0;
  let warmupNo = 0;

  return (
    <div
      className="mobile-sheet-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="mobile-sheet history-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        data-testid="history-detail"
      >
        <div className="mobile-sheet-head">
          <span className="mobile-sheet-brand">
            <MIcons.clock />
            <span>{t("hist.detailTitle")}</span>
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

        <div className="history-detail">
          <div className="history-detail-head">
            <span className="badge badge-accent">
              <MIcons.calendar />
              {formatDay(entry.date, lang)}
            </span>
            <h2 id="history-detail-title">
              {session.title ?? t("hist.detailHeading")}
            </h2>
            <div className="row-wrap small muted">
              {entry.location && (
                <span>{t(`hist.place.${entry.location}`)}</span>
              )}
              {entry.source && entry.source !== "traininglab" && (
                <span>{entry.source}</span>
              )}
              {entry.durationMin !== null ? (
                <span>
                  {tInterp("hist.duration", { n: entry.durationMin })}
                </span>
              ) : (
                <span title={t("summary.noDuration")}>—</span>
              )}
            </div>
          </div>

          <div className="summary-kpis">
            <div className="summary-kpi">
              <b>{summary.workingSets}</b>
              <span>{t("summary.setsLabel")}</span>
            </div>
            <div className="summary-kpi">
              <b>{summary.exercises.length}</b>
              <span>{t("summary.exercisesLabel")}</span>
            </div>
            <div className="summary-kpi">
              <b>{formatKg(summary.volumeKg, lang)}</b>
              <span>{t("summary.volumeLabel")}</span>
            </div>
            <div className="summary-kpi">
              <b>
                {entry.durationMin !== null ? `${entry.durationMin} min` : "—"}
              </b>
              <span>{t("summary.durationLabel")}</span>
            </div>
          </div>

          {mode === "view" && (
            <>
              <div>
                {summary.exercises.map((row) => (
                  <section className="summary-ex" key={row.exerciseId}>
                    <a
                      className="summary-ex-head tl-focusable"
                      href={hashFor("exercises", [row.exerciseId])}
                      onClick={onClose}
                    >
                      <ExerciseThumb exerciseId={row.exerciseId} size={40} />
                      <span>
                        <span className="summary-ex-name">
                          {exerciseName(row.exerciseId, lang)}
                        </span>
                        <span className="summary-ex-sub">
                          {tInterp("summary.setsShort", { n: row.sets })}
                          {row.warmupSets > 0 && (
                            <>
                              {" · "}
                              {tInterp("summary.warmups", {
                                n: row.warmupSets,
                              })}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="summary-ex-vol">
                        <b>
                          {row.volumeKg > 0
                            ? formatKg(row.volumeKg, lang)
                            : "—"}
                        </b>
                        <span>{t("summary.volumeShort")}</span>
                      </span>
                    </a>

                    <div className="summary-sets-wrap">
                      <table
                        className="summary-sets"
                        aria-label={`${exerciseName(row.exerciseId, lang)} · ${t("summary.what")}`}
                      >
                        <thead>
                          <tr>
                            <th scope="col">{t("summary.set")}</th>
                            <th scope="col">{t("summary.weight")}</th>
                            <th scope="col">{t("summary.reps")}</th>
                            <th scope="col" title={t("summary.effortHint")}>
                              {t("summary.effort")}
                            </th>
                            <th scope="col">{t("summary.mark")}</th>
                            <th scope="col">{t("common.edit")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.entries.map((set) => {
                            const number = set.warmup
                              ? `${t("summary.warmupShort")}${++warmupNo}`
                              : String(++workNo);
                            if (editingSetId === set.id) {
                              return (
                                <tr
                                  key={set.id}
                                  className="summary-set-editing"
                                  data-testid="history-detail-set-editing"
                                >
                                  <td colSpan={6}>
                                    <div
                                      className="summary-set-edit-form"
                                      onKeyDown={(event) => {
                                        if (event.key !== "Escape") return;
                                        event.preventDefault();
                                        event.stopPropagation();
                                        stopSetEdit();
                                      }}
                                    >
                                      <span className="summary-set-edit-number">
                                        {number}
                                      </span>
                                      <input
                                        autoFocus
                                        className="tl-input summary-set-edit-input"
                                        inputMode="decimal"
                                        aria-label={t("summary.weight")}
                                        value={editWeight}
                                        onChange={(event) =>
                                          setEditWeight(event.target.value)
                                        }
                                        placeholder={t("summary.weight")}
                                      />
                                      <span className="tiny muted">×</span>
                                      <input
                                        className="tl-input summary-set-edit-input"
                                        inputMode="numeric"
                                        aria-label={t("summary.reps")}
                                        value={editReps}
                                        onChange={(event) =>
                                          setEditReps(event.target.value)
                                        }
                                        placeholder={t("summary.reps")}
                                      />
                                      {EFFORT_MARKERS.map((mark) => (
                                        <button
                                          key={mark}
                                          type="button"
                                          value={mark}
                                          aria-pressed={editEffort === mark}
                                          aria-label={
                                            EFFORT_MEANING[mark].label[lang]
                                          }
                                          title={`${EFFORT_MEANING[mark].label[lang]} · ${EFFORT_MEANING[mark].detail[lang]}`}
                                          onClick={() =>
                                            setEditEffort((current) =>
                                              current === mark ? null : mark,
                                            )
                                          }
                                          className={`summary-set-edit-mark ${editEffort === mark ? "is-active" : ""}`}
                                        >
                                          {mark}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm tl-focusable"
                                        onClick={() => saveSetEdit(set)}
                                      >
                                        {t("common.save")}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm tl-focusable"
                                        onClick={stopSetEdit}
                                      >
                                        {t("common.cancel")}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <tr
                                key={set.id}
                                className={set.warmup ? "is-warmup" : undefined}
                                data-testid="history-detail-set"
                              >
                                <th scope="row">
                                  <span className="summary-set-number">
                                    {number}
                                  </span>
                                </th>
                                <td>
                                  {set.weightKg !== null
                                    ? formatWeight(set.weightKg)
                                    : "—"}
                                </td>
                                <td>
                                  {set.reps !== null
                                    ? set.reps
                                    : set.durationSec !== null
                                      ? `${set.durationSec} s`
                                      : "—"}
                                </td>
                                <td>
                                  {set.effort !== null
                                    ? `${set.effort}/5`
                                    : "—"}
                                </td>
                                <td>
                                  {set.marker ? (
                                    <span className="summary-mark">
                                      {set.marker}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="summary-set-edit tl-focusable"
                                    data-testid="history-detail-set-edit"
                                    aria-label={t("common.edit")}
                                    title={t("common.edit")}
                                    data-set-id={set.id}
                                    onClick={() => startSetEdit(set)}
                                  >
                                    {t("common.edit")}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>

              <div className="history-detail-actions">
                <button
                  type="button"
                  className="btn tl-focusable"
                  onClick={startEdit}
                >
                  <MIcons.settings />
                  {t("hist.edit")}
                </button>
                <button
                  type="button"
                  className="btn tl-focusable history-danger"
                  onClick={() => setMode("delete")}
                >
                  <MIcons.trash />
                  {t("hist.delete")}
                </button>
              </div>
            </>
          )}

          {mode === "edit" && (
            <div className="history-edit">
              <label className="field-label" htmlFor="history-name">
                {t("hist.editName")}
              </label>
              <input
                id="history-name"
                type="text"
                className="field"
                style={{ width: "100%", fontSize: 16 }}
                value={name}
                maxLength={80}
                placeholder={t("hist.editNamePlaceholder")}
                onChange={(event) => setName(event.target.value)}
              />
              <label className="field-label" htmlFor="history-place">
                {t("hist.editPlace")}
              </label>
              <select
                id="history-place"
                className="field"
                style={{ width: "100%", fontSize: 16 }}
                value={place}
                onChange={(event) =>
                  setPlace(event.target.value as "" | "gym" | "home")
                }
              >
                <option value="">{t("hist.place.none")}</option>
                <option value="gym">{t("hist.place.gym")}</option>
                <option value="home">{t("hist.place.home")}</option>
              </select>
              <div className="row-wrap">
                <button
                  type="button"
                  className="btn btn-primary tl-focusable"
                  onClick={saveEdit}
                >
                  {t("hist.save")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost tl-focusable"
                  onClick={() => setMode("view")}
                >
                  {t("hist.cancel")}
                </button>
              </div>
            </div>
          )}

          {mode === "delete" && plan && (
            <div
              role="alertdialog"
              aria-label={t("hist.deleteTitle")}
              className="history-delete"
            >
              <p className="font-semibold">{t("hist.deleteTitle")}</p>
              <p className="small secondary">
                {tInterp("hist.deleteBody", {
                  n: plan.workingSets + plan.warmupSets,
                  kg: formatKg(plan.volumeKg, lang),
                })}
              </p>
              {plan.warmupSets > 0 && (
                <p className="tiny muted">
                  {plan.warmupSets === 1
                    ? t("hist.deleteWarmupOne")
                    : tInterp("hist.deleteWarmup", { n: plan.warmupSets })}
                </p>
              )}
              {plan.missingSets > 0 && (
                <p className="tiny muted">
                  {tInterp("hist.deleteMissing", { n: plan.missingSets })}
                </p>
              )}
              <div className="row-wrap">
                <button
                  type="button"
                  className="btn tl-focusable history-danger-btn"
                  onClick={() => {
                    onDelete(session);
                    onClose();
                  }}
                >
                  {t("hist.deleteConfirm")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost tl-focusable"
                  onClick={() => setMode("view")}
                >
                  {t("hist.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** `mié, 7 oct 2026` — the day as the owner reads it, never a UTC slice. */
function formatDay(date: string, lang: "es" | "en"): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    lang === "es" ? "es-ES" : "en-GB",
    { weekday: "short", day: "numeric", month: "short", year: "numeric" },
  );
}

/** Tonnage with the user's thousands separator (`149 107 kg` in Spanish). */
function formatKg(kg: number, lang: "es" | "en"): string {
  return `${Math.round(kg).toLocaleString(lang === "es" ? "es-ES" : "en-GB")} kg`;
}

/** A single set's load, keeping the half-kilo the log may hold. */
function formatWeight(kg: number): string {
  return `${Math.round(kg * 10) / 10} kg`;
}
