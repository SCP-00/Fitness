/**
 * Constancy — did I do what I said I would?
 *
 * This card moved from Inicio to Progreso on 2026-09-30 (f). It was the clearest
 * case of Inicio answering a question that is not "what do I do now": it is a
 * retrospective gauge, and Progreso is where retrospectives live.
 *
 * Two honest details survive the move:
 *
 *   * the **target is the plan's own** (`weekPlan.totalSets` scaled to the
 *     window), never a number the app invented — the ring reads "sets logged vs
 *     sets the planner asked for";
 *   * it shows **weekly constancia, not a streak**. A chain that resets to zero
 *     teaches you to skip a day rather than log a partial one.
 *
 * The period comes from the screen (`Progreso`'s selector), so the ring, the
 * bars and the KPI tiles can never describe different spans of time.
 *
 * @module features/stats/ConstancyCard
 */

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useStore } from "../../app/store";
import { t, tInterp } from "../../lib/i18n";
import { periodSeries, trainedWeeksIn, workingSets } from "./derive";

export function ConstancyCard({ days }: { days: 7 | 30 | 90 }) {
  const { sets, settings, weekPlan } = useStore();

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
  const totalWorking = workingSets(sets).length;

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("progress.constancy.title")}</h2>
        <span className="text-[11px] text-[var(--tl-text-muted)]">
          {tInterp("progress.days", { n: days })}
        </span>
      </div>
      <div className="tl-card-body">
        <div className="tl-ring-row">
          <div className="tl-ring" style={{ "--pct": String(pct) } as CSSProperties}>
            <strong>{pct}%</strong>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--tl-text-secondary)] leading-relaxed">
              {t("progress.constancy.hint")}
            </p>
            <div className="tl-mini-chart">
              {series.map((n, i) => (
                <span
                  key={i}
                  style={{ height: `${Math.max(9, (n / peak) * 100)}%` }}
                  title={tInterp("progress.constancy.daySets", { n })}
                />
              ))}
            </div>
            <p className="text-[11px] text-[var(--tl-text-secondary)] mt-2 tabular-nums">
              {tInterp("progress.constancy.sets", {
                done: logged,
                target,
              })}
            </p>
          </div>
        </div>

        <p className="tl-callout">
          <span aria-hidden>🏆</span>
          {trainedWeeks > 0
            ? tInterp("progress.constancy.note", { n: trainedWeeks })
            : t("progress.constancy.noteNone")}
        </p>
        {totalWorking === 0 && (
          <p className="text-[11px] text-[var(--tl-text-muted)] mt-2">
            {t("progress.emptyHint")}
          </p>
        )}
      </div>
    </section>
  );
}
