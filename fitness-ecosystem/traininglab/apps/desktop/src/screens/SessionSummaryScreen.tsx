/**
 * Resumen — the close of the training loop.
 *
 * **2026-11-06 (UX round).** Finishing a session used to land on Hoy with only a
 * «Completada» badge: the one moment the user wants to see what the work added
 * up to had no answer. This page is that answer, and it is deliberately built
 * only on numbers the log supports (`lib/session-summary.ts`):
 *
 *   * working sets and volume exclude the warm-up ramp;
 *   * a bodyweight set shows reps, never an invented 0 kg "best set";
 *   * a duration appears only when the start/close span is trustworthy, because
 *     imported date-only sessions collapse to minutes;
 *   * the exercise order is the session's own, not the array's.
 *
 * It is a normal destination (`#/resumen`), so a finished session has an
 * address: the bell can land here, Hoy can link here, and a reload keeps the
 * same record on screen.
 *
 * @module screens/SessionSummaryScreen
 */

import { useMemo } from "react";
import { HASH, hashFor } from "../app/router";
import { useStore } from "../app/store";
import { getLanguage, t, tInterp } from "../lib/i18n";
import { exerciseName } from "../lib/plan";
import { summariseSession } from "../lib/session-summary";
import { ExerciseThumb } from "../features/exercises/ExerciseThumb";
import { MIcons } from "../ui/mockup-icons";

const LB_PER_KG = 2.2046226218488;

export default function SessionSummaryScreen() {
  const { sessions, sets, settings, loading } = useStore();
  const lang = getLanguage();

  /**
   * The newest closed session that still has its sets. If the most recent one
   * was emptied (a deleted set, an import without ids), the next one is shown
   * instead of a page of zeros.
   */
  const summary = useMemo(() => {
    const closed = sessions
      .filter((session) => session.completedAt !== null)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
    for (const session of closed) {
      const found = summariseSession(session, sets);
      if (found) return found;
    }
    return null;
  }, [sessions, sets]);

  if (loading || !settings) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const unit = settings.unit;

  return (
    <>
      <header className="topbar">
        <span className="card-title" style={{ fontSize: 18 }}>
          <MIcons.circleCheck />
          {t("nav.summary")}
        </span>
        <div className="spacer" />
        <a className="btn btn-sm tl-focusable" href={HASH.history}>
          <MIcons.clock />
          {t("summary.toHistory")}
        </a>
        <a className="btn btn-primary btn-sm tl-focusable" href={HASH.today}>
          {t("summary.toToday")}
        </a>
      </header>

      <div className="content">
        {!summary ? (
          <section
            className="card card-pad"
            style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}
          >
            <MIcons.sparkles
              style={{ margin: "0 auto 10px", width: 28, height: 28 }}
            />
            <h2 className="card-title" style={{ justifyContent: "center" }}>
              {t("summary.empty")}
            </h2>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {t("summary.emptyHint")}
            </p>
            <a
              className="btn btn-primary btn-lg tl-focusable"
              href={HASH.today}
              style={{ marginTop: 14 }}
            >
              {t("summary.toToday")}
            </a>
          </section>
        ) : (
          <div className="stack" data-testid="summary-screen">
            <section className="card">
              <div className="card-body">
                <div className="row-wrap" style={{ gap: 8 }}>
                  <span className="badge badge-success">
                    <MIcons.circleCheck />
                    {t("summary.title")}
                  </span>
                  <span className="small muted">
                    {dateLabel(summary.day, lang)}
                  </span>
                </div>
                <h1
                  style={{
                    margin: "10px 0 4px",
                    fontSize: 31,
                    letterSpacing: "-0.9px",
                  }}
                >
                  {summary.title ?? t("summary.heading")}
                </h1>
                <p className="small muted" style={{ margin: 0 }}>
                  {summary.durationMin !== null
                    ? tInterp("summary.duration", {
                        n: summary.durationMin,
                      })
                    : t("summary.noDuration")}
                  {summary.warmupSets > 0 && (
                    <>
                      {" · "}
                      {tInterp("summary.warmups", {
                        n: summary.warmupSets,
                      })}
                    </>
                  )}
                </p>
                {summary.marks > 0 && (
                  <span
                    className="badge badge-accent"
                    style={{ marginTop: 10 }}
                  >
                    <MIcons.flame />
                    {tInterp("summary.marks", { n: summary.marks })}
                  </span>
                )}
              </div>
            </section>

            <div className="summary-kpis">
              <Kpi
                value={String(summary.workingSets)}
                label={t("summary.setsLabel")}
              />
              <Kpi
                value={String(summary.exercises.length)}
                label={t("summary.exercisesLabel")}
              />
              <Kpi
                value={`${Math.round(summary.volumeKg)} kg`}
                label={t("summary.volumeLabel")}
              />
              <Kpi
                value={
                  summary.durationMin !== null
                    ? `${summary.durationMin} min`
                    : "—"
                }
                label={t("summary.durationLabel")}
              />
            </div>

            <section className="card">
              <div className="card-head">
                <h2 className="card-title">{t("summary.what")}</h2>
              </div>
              <div>
                {summary.exercises.map((row) => {
                  let workNo = 0;
                  let warmupNo = 0;
                  return (
                    <section className="summary-ex" key={row.exerciseId}>
                      <a
                        className="summary-ex-head tl-focusable"
                        href={hashFor("exercises", [row.exerciseId])}
                      >
                        <ExerciseThumb exerciseId={row.exerciseId} size={40} />
                        <span>
                          <span className="summary-ex-name">
                            {exerciseName(row.exerciseId, lang)}
                          </span>
                          <span className="summary-ex-sub">
                            {row.sets === 1
                              ? t("summary.setOne")
                              : tInterp("summary.setsShort", { n: row.sets })}
                            {row.warmupSets > 0 && (
                              <>
                                {" · "}
                                {tInterp("summary.warmups", {
                                  n: row.warmupSets,
                                })}
                              </>
                            )}
                            {row.topWeightKg !== null ? (
                              <>
                                {" · "}
                                {tInterp("summary.bestSet", {
                                  weight: weightLabel(row.topWeightKg, unit),
                                  reps: row.topReps ?? 0,
                                })}
                              </>
                            ) : row.totalReps > 0 ? (
                              <>
                                {" · "}
                                {tInterp("summary.bwSet", {
                                  n: row.totalReps,
                                })}
                              </>
                            ) : null}
                          </span>
                        </span>
                        <span className="summary-ex-vol">
                          <b>
                            {row.volumeKg > 0
                              ? `${Math.round(row.volumeKg)} kg`
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
                            </tr>
                          </thead>
                          <tbody>
                            {row.entries.map((entry) => {
                              const number = entry.warmup
                                ? `${t("summary.warmupShort")}${++warmupNo}`
                                : String(++workNo);
                              return (
                                <tr
                                  key={entry.id}
                                  className={
                                    entry.warmup ? "is-warmup" : undefined
                                  }
                                >
                                  <th scope="row">
                                    <span className="summary-set-number">
                                      {number}
                                    </span>
                                  </th>
                                  <td>
                                    {entry.weightKg !== null
                                      ? weightLabel(entry.weightKg, unit)
                                      : "—"}
                                  </td>
                                  <td>
                                    {entry.reps !== null
                                      ? entry.reps
                                      : entry.durationSec !== null
                                        ? `${entry.durationSec} s`
                                        : "—"}
                                  </td>
                                  <td>
                                    {entry.effort !== null
                                      ? `${entry.effort}/5`
                                      : "—"}
                                  </td>
                                  <td>
                                    {entry.marker ? (
                                      <span className="summary-mark">
                                        {entry.marker}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <div className="summary-actions">
              <a className="btn tl-focusable" href={HASH.history}>
                <MIcons.clock />
                {t("summary.toHistory")}
              </a>
              <a className="btn tl-focusable" href={HASH.progress}>
                <MIcons.chart />
                {t("summary.toProgress")}
              </a>
              <a className="btn btn-primary tl-focusable" href={HASH.today}>
                {t("summary.toToday")}
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** One number of the close, in the same card/tile language as the rest. */
function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="summary-kpi">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

/** `miércoles, 6 de noviembre` — capitalised, in the user's language. */
function dateLabel(day: string, lang: "en" | "es"): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  const text = date.toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** kg → the unit the user reads the rest of the log in. */
function weightLabel(kg: number, unit: "kg" | "lb"): string {
  const value = unit === "lb" ? kg * LB_PER_KG : kg;
  return `${Math.round(value * 10) / 10} ${unit}`;
}
