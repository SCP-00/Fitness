/**
 * Volumen semanal — the tonnage ledger, week by week (T4).
 *
 * What it is: `weight × reps` of the working sets, Monday to Sunday, warm-ups
 * out, eight weeks at a time, plus the current week's tonnage per target
 * family. It exists to answer "am I lifting more than I used to?", which is a
 * question about the log — and only about the log.
 *
 * What it deliberately does not claim: tonnage going up does not by itself
 * mean muscle or strength went up, and the card says so on screen. Its
 * semantics are also separate from the body map's exposure lens: the map
 * counts sets with partial stimulus credit (1 / 0.66 / 0.33), this card counts
 * kilograms — the two can move in different directions without either being
 * wrong.
 *
 * The trend arrow never compares a partial week against a full one: this week
 * is measured against the same elapsed days of the previous week (see
 * `weeklyVolume`), or Monday would always read as a collapse.
 *
 * @module features/stats/WeeklyVolumeCard
 */

import { useMemo } from "react";
import { useStore } from "../../app/store";
import { familyLabel } from "../../lib/format";
import { t, tInterp } from "../../lib/i18n";
import { weeklyVolume, type Trend } from "./derive";

const arrow = (trend: Trend) =>
  trend === "up" ? "↑" : trend === "down" ? "↓" : "—";
const trendClass = (trend: Trend) =>
  trend === "up"
    ? "tl-trend-up"
    : trend === "down"
      ? "tl-trend-down"
      : "tl-trend-flat";

const kg = (n: number) => `${Math.round(n).toLocaleString()} kg`;

export function WeeklyVolumeCard() {
  const { sets } = useStore();
  const volume = useMemo(() => weeklyVolume(sets, 8), [sets]);

  const peak = Math.max(1, ...volume.weeks.map((w) => w.kg));
  const windowKg = volume.weeks.reduce((acc, w) => acc + w.kg, 0);
  const families = volume.families.slice(0, 5);
  const trendTitle = tInterp("progress.weekly.arrowTrend", {
    prev: kg(volume.previousAligned.kg),
    curr: kg(volume.current.kg),
  });

  return (
    <section className="tl-card" data-testid="weekly-volume">
      <div className="tl-card-head">
        <div className="min-w-0">
          <h2>{t("progress.weekly.title")}</h2>
          <span>{t("progress.weekly.hint")}</span>
        </div>
        <span className="tl-pill is-accent tabular-nums">
          {tInterp("progress.weekly.now", {
            kg: Math.round(volume.current.kg).toLocaleString(),
            sets: volume.current.sets,
          })}
        </span>
      </div>

      <div className="tl-card-body">
        {windowKg <= 0 ? (
          <p className="text-sm text-[var(--tl-text-muted)]">
            {t("progress.weekly.empty")}
          </p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <strong className="text-xl font-semibold tabular-nums">
                {kg(volume.current.kg)}
              </strong>
              <span
                className={`${trendClass(volume.trend)} text-sm`}
                title={trendTitle}
              >
                {arrow(volume.trend)}{" "}
                <span className="text-[11px] text-[var(--tl-text-secondary)] font-normal">
                  {t("progress.weekly.vsPrevious")}
                </span>
              </span>
            </div>

            {/* Bars, not a line: weekly tonnage has no value between weeks. */}
            <div className="tl-chart mt-3">
              {volume.weeks.map((w) => (
                <span
                  key={w.weekStart}
                  className={w.kg > 0 ? "is-live" : "is-empty"}
                  title={tInterp("progress.weekly.bar", {
                    week: w.weekStart,
                    kg: Math.round(w.kg).toLocaleString(),
                    sets: w.sets,
                  })}
                  style={{ height: `${Math.max(4, (w.kg / peak) * 100)}%` }}
                />
              ))}
            </div>
            <div className="tl-chart-axis">
              <span>{volume.weeks[0]?.weekStart}</span>
              <span>
                {tInterp("progress.weekly.peak", {
                  kg: Math.round(peak).toLocaleString(),
                })}
              </span>
            </div>

            {families.length > 0 && (
              <>
                <p className="text-xs text-[var(--tl-text-secondary)] mt-4 mb-1.5">
                  {t("progress.weekly.families")}
                </p>
                <div className="tl-rows">
                  {families.map((f) => (
                    <div key={f.family} className="tl-row">
                      <span className="tl-row-name">
                        {familyLabel(f.family)}
                        <span className="tl-row-sub">
                          {kg(f.previousKg)} → {kg(f.kg)}
                        </span>
                      </span>
                      <span className="tl-row-value tabular-nums">
                        {kg(f.kg)}
                        <span
                          className={`${trendClass(f.trend)} ml-1.5`}
                          aria-hidden
                        >
                          {arrow(f.trend)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-[11px] text-[var(--tl-text-muted)] mt-3 leading-relaxed">
              {t("progress.weekly.disclaimer")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
