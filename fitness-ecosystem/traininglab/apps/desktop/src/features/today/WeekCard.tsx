/**
 * This week — seven tiles, one per day (the sketch's "Resumen de la semana").
 *
 * It replaced a vertical list of day rows: the sketch puts the week on one line,
 * and a week is a shape you read at a glance (where are the gaps?), not a table
 * you scroll. The tiles below 850 px scroll sideways instead of shrinking to
 * illegibility.
 *
 * The state of each tile is **derived from the log**, never from the plan alone:
 * a day is "completado" when working sets were logged on that date. A planned day
 * that was skipped says "Pendiente" — the card is honest about the week you had,
 * which is the entire point of showing it next to today's session.
 *
 * @module features/today/WeekCard
 */

import { RefreshCw } from "lucide-react";
import { t, tInterp } from "../../lib/i18n";
import type { WeekPlan } from "../../lib/plan";
import type { TLSet } from "../../lib/types";
import { Badge } from "./ui";

const DAY_MS = 24 * 60 * 60 * 1000;

export function WeekCard({
  weekPlan,
  sets,
  onRegenerate,
}: {
  weekPlan: WeekPlan;
  /** The whole log — the week strip counts the days you actually trained. */
  sets: TLSet[];
  onRegenerate: () => void;
}) {
  const trainingDays = weekPlan.rows.filter((r) => !r.isRest).length;
  const todayIndex = weekPlan.rows.findIndex((r) => r.isToday);
  const weekStart = startOfWeek(todayIndex);

  const loggedByDay = new Map<string, number>();
  for (const set of sets) {
    if (set.warmup) continue;
    const day = set.timestamp.slice(0, 10);
    loggedByDay.set(day, (loggedByDay.get(day) ?? 0) + 1);
  }

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("week.card.title")}</h2>
        <Badge tone="neutral">
          {tInterp("week.summary", {
            sets: weekPlan.totalSets,
            min: weekPlan.totalMinutes,
          })}
        </Badge>
      </div>
      <div className="tl-card-body">
        <div className="tl-week">
          {weekPlan.rows.map((row, i) => {
            const date = new Date(weekStart.getTime() + i * DAY_MS);
            const logged = loggedByDay.get(isoDay(date)) ?? 0;
            const done = logged > 0;
            const classes = [
              "tl-day",
              done ? "is-done" : "",
              row.isToday ? "is-today" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={row.label}
                className={classes}
                title={
                  row.isRest
                    ? t("week.rest")
                    : `${row.preview.join(" · ")} — ${tInterp("week.sets", {
                        n: row.sets,
                      })}`
                }
              >
                {/* Icon, then the day name, then the state — the order the mockup
                    reads, and the order that survives a 90 px tile. */}
                <div className="tl-day-icon" aria-hidden>
                  {row.isToday ? "▶" : done ? "✓" : row.isRest ? "·" : "○"}
                </div>
                <div className="tl-day-name">{row.label}</div>
                <div className="tl-day-status">
                  {done
                    ? t("week.card.done")
                    : row.isToday
                      ? t("week.today")
                      : row.isRest
                        ? t("week.rest")
                        : t("week.card.pending")}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-[11px] text-[var(--tl-text-muted)]">
            {weekPlan.uncovered.length > 0
              ? tInterp("week.uncovered", {
                  fams: weekPlan.uncovered.map((u) => u.family).join(", "),
                })
              : tInterp("week.hint", { n: trainingDays })}
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            className="tl-btn tl-btn-ghost tl-focusable text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("week.regenerate")}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function isoDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Monday 00:00 of the week the plan is showing (the plan is Monday-first). */
function startOfWeek(todayIndex: number): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(today.getTime() - Math.max(0, todayIndex) * DAY_MS);
}
