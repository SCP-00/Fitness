/**
 * Semana — the shape of the week, and why it looks like that.
 *
 * This screen exists because Inicio was answering too many questions at once
 * (owner note, 2026-09-30). The weekly plan is reference material: you read it
 * when you sit down to plan, not while standing at the rack. Moving it here
 * leaves Inicio with one job (what do I do now?) without *hiding* anything — a
 * destination is one tap away in both shells, and Inicio's hero links here.
 *
 * Three blocks, in the order the questions are asked:
 *
 *   1. **the strip** (`WeekCard`): seven tiles, derived from the log, so a
 *      planned day that was skipped says "Pendiente" instead of pretending;
 *   2. **one row per day**: what the planner intends — families, sets, minutes
 *      and the first exercises — with today marked and rest days muted;
 *   3. **the reasons**: the plan's own advisories, the families the week could
 *      not cover and the gear note. A plan the user cannot interrogate is a
 *      plan they will not follow.
 *
 * Nothing here invents a number: every figure comes from `weekPlan`, which the
 * shared `core/training` generator produced against the user's inventory, time
 * budget and (when imported) BodyLab's weakness map.
 *
 * @module screens/WeekScreen
 */

import { CalendarDays } from "lucide-react";
import { navigate } from "../app/router";
import { useStore } from "../app/store";
import { familyLabel, formatAdvisory } from "../lib/format";
import { t, tInterp } from "../lib/i18n";
import { Badge, Button, EmptyState } from "../ui/primitives";
import { IconCalendar } from "../ui/icons";
import { WeekCard } from "../features/today/WeekCard";

export default function WeekScreen() {
  const { settings, loading, weekPlan, plan, sets, regenerateWeek } = useStore();

  if (loading || !settings || !weekPlan) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const trainingDays = weekPlan.rows.filter((row) => !row.isRest).length;
  const todayIndex = weekPlan.rows.findIndex((row) => row.isToday);

  return (
    <div className="tl-page">
      <header className="tl-topbar">
        <div className="tl-welcome">
          <h1>{t("week.pageTitle")}</h1>
          <p>{tInterp("week.pageHint", { n: trainingDays })}</p>
        </div>
        <span className="tl-pill">
          <CalendarDays className="w-3.5 h-3.5" aria-hidden />
          {tInterp("week.budget", { n: settings.timeBudgetMin })}
        </span>
      </header>

      {trainingDays === 0 ? (
        <EmptyState
          icon={<IconCalendar size={28} />}
          title={t("week.empty")}
          body={t("week.emptyHint")}
          action={
            <Button variant="primary" onClick={() => navigate("settings")}>
              {t("nav.settings")}
            </Button>
          }
        />
      ) : (
        <>
          <WeekCard
            weekPlan={weekPlan}
            sets={sets}
            onRegenerate={regenerateWeek}
          />

          {/* ── One row per day ─────────────────────────────────────────── */}
          <section className="tl-card">
            <div className="tl-card-head">
              <div className="min-w-0">
                <h2>{t("week.planTitle")}</h2>
                <span>{t("week.planHint")}</span>
              </div>
              <Badge tone="neutral">
                {tInterp("week.summary", {
                  sets: weekPlan.totalSets,
                  min: weekPlan.totalMinutes,
                })}
              </Badge>
            </div>
            <div className="tl-card-body">
              <div className="tl-days">
                {weekPlan.rows.map((row) => (
                  <article
                    key={row.label}
                    className={`tl-day-row ${row.isToday ? "is-today" : ""} ${
                      row.isRest ? "is-rest" : ""
                    }`}
                    aria-current={row.isToday ? "date" : undefined}
                  >
                    <header className="tl-day-row-head">
                      <h3>{row.label}</h3>
                      {row.isToday && (
                        <Badge tone="accent">{t("week.today")}</Badge>
                      )}
                      <span className="tabular-nums text-xs text-[var(--tl-text-secondary)]">
                        {row.isRest
                          ? t("week.rest")
                          : tInterp("week.dayDetail", {
                              sets: row.sets,
                              min: row.minutes,
                            })}
                      </span>
                    </header>
                    {!row.isRest && (
                      <>
                        <p className="tl-day-row-families">
                          {row.assigned.map(familyLabel).join(" · ")}
                        </p>
                        {row.preview.length > 0 && (
                          <ul className="tl-day-row-preview">
                            {row.preview.map((name) => (
                              <li key={name}>{name}</li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                    {row.isToday && (
                      <div className="tl-day-row-actions">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => navigate("session")}
                        >
                          {t("zen.start")}
                        </Button>
                        <Button size="sm" onClick={() => navigate("today")}>
                          {t("week.goToday")}
                        </Button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── Why the week looks like this ────────────────────────────── */}
          <section className="tl-card">
            <div className="tl-card-head">
              <h2>{t("week.whyTitle")}</h2>
            </div>
            <div className="tl-card-body flex flex-col gap-3">
              {plan && plan.advisories.length > 0 ? (
                <ul className="tl-note">
                  {plan.advisories.map((advisory, i) => (
                    <li key={i}>{formatAdvisory(advisory)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--tl-text-secondary)]">
                  {t("week.whyNone")}
                </p>
              )}

              {weekPlan.uncovered.length > 0 && (
                <p className="text-xs text-[var(--tl-warning)]">
                  {tInterp("week.uncovered", {
                    fams: weekPlan.uncovered
                      .map((u) => familyLabel(u.family))
                      .join(", "),
                  })}
                </p>
              )}

              <p className="text-[11px] text-[var(--tl-text-muted)] leading-relaxed">
                {plan
                  ? tInterp("week.gear", {
                      usable: plan.gearNote.usable,
                      excluded: plan.gearNote.excluded,
                    })
                  : t("week.whyNone")}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate("settings")}>
                  {t("week.adjustBudget")}
                </Button>
                <Button size="sm" onClick={() => navigate("progress")}>
                  {t("nav.progress")}
                </Button>
              </div>
            </div>
          </section>

          <p className="text-[11px] text-[var(--tl-text-muted)] text-center">
            {tInterp("week.todayIndexNote", { i: todayIndex + 1 })}
          </p>
        </>
      )}
    </div>
  );
}
