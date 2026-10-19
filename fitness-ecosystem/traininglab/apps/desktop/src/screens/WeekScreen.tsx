/**
 * Semana — the shape of the week, and why it looks like that.
 *
 * This screen exists because Inicio was answering too many questions at once
 * (owner note, 2026-09-30). The weekly plan is reference material: you read it
 * when you sit down to plan, not while standing at the rack. Moving it here
 * leaves Inicio with one job (what do I do now?) without *hiding* anything —
 * a destination is one tap away in both shells, and Inicio's hero links here.
 *
 * Four blocks, in the order the questions are asked:
 *
 *   1. **the strip** (`WeekCard`): seven tiles, derived from the log, so a
 *      planned day that was skipped says "Pendiente" instead of pretending;
 *   2. **one row per day**: what the planner intends — families, sets, minutes
 *      and the first exercises — with today marked and rest days muted. Each
 *      row carries its **estimated stress** and an **Editar** control: his
 *      authored days (`settings.weekOverrides`) sit *over* the generated plan
 *      and survive every regeneration — the owner's rule (2026-10-08) is that
 *      user-created content is never rewritten without his own action;
 *   3. **estimated stress of the week** (`lib/week-stress.ts`): a 0–10 score
 *      built from his design, the catalog's joint/spine load and the 12–20
 *      evidence band, with the warnings it earns. An estimate, labelled as
 *      one; nothing is logged;
 *   4. **the reasons**: the plan's own advisories, the families the week could
 *      not cover and the gear note. A plan the user cannot interrogate is a
 *      plan they will not follow.
 *
 * Nothing here invents a number: every figure comes from `weekPlan` or the
 * pure stress module, both fed by the shared `core/training` generator and the
 * user's own inputs.
 *
 * @module screens/WeekScreen
 */

import { useState } from "react";
import { Activity, CalendarDays, Pencil } from "lucide-react";
import { navigate } from "../app/router";
import { useStore } from "../app/store";
import { allFamilies } from "../features/exercises/library";
import { familyLabel, formatAdvisory } from "../lib/format";
import { t, tInterp } from "../lib/i18n";
import type { WeekDayOverride } from "../lib/types";
import {
  SETS_PER_FAMILY_DAY,
  bandFor,
  type WeekStressBand,
} from "../lib/week-stress";
import { Badge, Button, Chip, EmptyState } from "../ui/primitives";
import { IconCalendar } from "../ui/icons";
import { MIcons } from "../ui/mockup-icons";
import { usePointerDrop } from "../ui/pointer-drag";
import { WeekCard } from "../features/today/WeekCard";

const BAND_TONE: Record<WeekStressBand, "success" | "neutral" | "warning" | "danger"> = {
  low: "success",
  moderate: "neutral",
  high: "warning",
  excessive: "danger",
};

const BAND_COLOR: Record<WeekStressBand, string> = {
  low: "var(--tl-success)",
  moderate: "var(--tl-text-secondary)",
  high: "var(--tl-warning)",
  excessive: "var(--tl-danger)",
};

const BAND_KEY: Record<WeekStressBand, string> = {
  low: "week.stress.band.low",
  moderate: "week.stress.band.moderate",
  high: "week.stress.band.high",
  excessive: "week.stress.band.excessive",
};

export default function WeekScreen() {
  const {
    settings,
    loading,
    weekPlan,
    weekStress,
    plan,
    sets,
    regenerateWeek,
    setWeekOverride,
    swapWeekDays,
  } = useStore();
  const [editing, setEditing] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const familyOptions = allFamilies();

  /**
   * Move one day's plan onto another (2026-10-19). Swapping is the gesture's
   * meaning: if the destination is a rest day the session simply moves there
   * and the source rests, which is what "arrastrar la sesión al jueves" means.
   */
  const swapDays = (from: number, to: number) => {
    if (!weekPlan) return;
    if (!swapWeekDays(from, to)) return;
    setAnnouncement(
      tInterp("week.swapDone", {
        a: weekPlan.rows[from]?.label ?? String(from + 1),
        b: weekPlan.rows[to]?.label ?? String(to + 1),
      }),
    );
  };
  const drag = usePointerDrop((fromId, toId) =>
    swapDays(Number(fromId), Number(toId)),
  );

  if (loading || !settings || !weekPlan) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const trainingDays = weekPlan.rows.filter((row) => !row.isRest).length;
  const customDays = weekPlan.rows.filter((row) => row.isCustom).length;
  const todayIndex = weekPlan.rows.findIndex((row) => row.isToday);
  const hasDesign = customDays > 0;

  return (
    <div className="tl-page">
      <header className="tl-topbar">
        <div className="tl-welcome">
          <h1>{t("week.pageTitle")}</h1>
          <p>{tInterp("week.pageHint", { n: trainingDays })}</p>
        </div>
        <div className="flex items-center gap-2">
          {weekStress && weekStress.trainingDays > 0 && (
            <span
              className="tl-pill"
              title={t("week.stress.hint")}
              style={{ color: BAND_COLOR[weekStress.band] }}
            >
              <Activity className="w-3.5 h-3.5" aria-hidden />
              {tInterp("week.stress.weekScore", {
                score: weekStress.weekScore,
                band: t(BAND_KEY[weekStress.band]),
              })}
            </span>
          )}
          <span className="tl-pill">
            <CalendarDays className="w-3.5 h-3.5" aria-hidden />
            {tInterp("week.budget", { n: settings.timeBudgetMin })}
          </span>
        </div>
      </header>

      {trainingDays === 0 && !hasDesign ? (
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
              <p className="text-[11px] text-[var(--tl-text-muted)] mb-2">
                {t("week.dragHint")}
              </p>
              <div className="tl-days">
                {weekPlan.rows.map((row, index) => {
                  const stress = weekStress?.days[index];
                  const override: WeekDayOverride | undefined =
                    settings.weekOverrides?.[index];
                  const kind: "rest" | "train" = override
                    ? override.kind
                    : row.isRest
                      ? "rest"
                      : "train";
                  const selected = row.isRest ? [] : row.assigned;
                  const isEditing = editing === index;
                  const dayBand = stress
                    ? bandFor(stress.score)
                    : ("low" as WeekStressBand);
                  return (
                    <article
                      key={row.label}
                      data-drag-id={String(index)}
                      className={`tl-day-row ${row.isToday ? "is-today" : ""} ${
                        row.isRest ? "is-rest" : ""
                      } ${row.isCustom ? "is-custom" : ""} ${
                        drag.draggingId === String(index) ? "is-dragging" : ""
                      } ${
                        drag.overId === String(index) ? "is-drop-target" : ""
                      }`}
                      aria-current={row.isToday ? "date" : undefined}
                    >
                      <header className="tl-day-row-head">
                        <button
                          type="button"
                          className="drag-handle tl-focusable"
                          data-testid={`week-drag-${index}`}
                          aria-label={t("week.dragHandle")}
                          title={t("week.dragHint")}
                          onPointerDown={(event) =>
                            drag.start(event, String(index))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "ArrowLeft") {
                              event.preventDefault();
                              swapDays(index, Math.max(0, index - 1));
                            } else if (event.key === "ArrowRight") {
                              event.preventDefault();
                              swapDays(index, Math.min(6, index + 1));
                            }
                          }}
                        >
                          <MIcons.grip />
                        </button>
                        <h3>{row.label}</h3>
                        {row.isToday && (
                          <Badge tone="accent">{t("week.today")}</Badge>
                        )}
                        {row.isCustom && (
                          <Badge tone="info">{t("week.customBadge")}</Badge>
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[var(--tl-text-muted)]">
                            {t("week.stress.day")}
                          </span>
                          <span
                            className="tabular-nums text-[11px] font-semibold"
                            style={{ color: BAND_COLOR[dayBand] }}
                          >
                            {row.assigned.length === 0
                              ? "—"
                              : tInterp("week.stress.score", {
                                  s: stress?.score ?? 0,
                                })}
                          </span>
                        </div>
                      )}

                      {!row.isRest && (
                        <>
                          <p className="tl-day-row-families">
                            {row.assigned.length > 0
                              ? row.assigned.map(familyLabel).join(" · ")
                              : t("week.pickFamilies")}
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
                          {/* A rest day has no session to start: the swap can
                              make today rest, and offering ZEN there would be a
                              button that opens an empty logger. */}
                          {!row.isRest && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => navigate("session")}
                            >
                              {t("zen.start")}
                            </Button>
                          )}
                          <Button size="sm" onClick={() => navigate("today")}>
                            {t("week.goToday")}
                          </Button>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant={isEditing ? "primary" : "ghost"}
                          title={`${t("week.edit")} — ${row.label}`}
                          onClick={() =>
                            setEditing(isEditing ? null : index)
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden />
                          {isEditing
                            ? tInterp("week.editing", { day: row.label })
                            : t("week.edit")}
                        </Button>
                      </div>

                      {/* ── Authoring: his day, his action, his save ───── */}
                      {isEditing && (
                        <div className="mt-1 p-3 rounded-xl bg-[var(--tl-bg)] border border-[var(--tl-border)] flex flex-col gap-2">
                          <p className="text-[11px] text-[var(--tl-text-muted)] leading-relaxed">
                            {t("week.editHint")}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={kind === "train" ? "primary" : "ghost"}
                              onClick={() => {
                                if (kind === "train") return;
                                setWeekOverride(index, {
                                  kind: "train",
                                  families: [],
                                });
                              }}
                            >
                              {t("week.kindTrain")}
                            </Button>
                            <Button
                              size="sm"
                              variant={kind === "rest" ? "primary" : "ghost"}
                              onClick={() =>
                                setWeekOverride(index, { kind: "rest" })
                              }
                            >
                              {t("week.kindRest")}
                            </Button>
                          </div>

                          {kind === "train" && (
                            <>
                              <span className="text-[11px] text-[var(--tl-text-secondary)]">
                                {t("week.pickFamilies")}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {familyOptions.map((family) => {
                                  const on = selected.includes(family);
                                  return (
                                    <Chip
                                      key={family}
                                      active={on}
                                      onClick={() => {
                                        const next = on
                                          ? selected.filter(
                                              (f) => f !== family,
                                            )
                                          : [...selected, family];
                                        setWeekOverride(index, {
                                          kind: "train",
                                          families: next,
                                        });
                                      }}
                                    >
                                      {familyLabel(family)}
                                    </Chip>
                                  );
                                })}
                              </div>
                              {selected.length > 0 && (
                                <span className="text-[11px] tabular-nums text-[var(--tl-text-muted)]">
                                  {tInterp("week.estimated", {
                                    sets:
                                      selected.length * SETS_PER_FAMILY_DAY,
                                    min: settings.timeBudgetMin,
                                  })}
                                </span>
                              )}
                            </>
                          )}

                          {row.isCustom && (
                            <div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setWeekOverride(index, null);
                                  setEditing(null);
                                }}
                              >
                                {t("week.restoreAuto")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {announcement}
            </p>
          </section>

          {/* ── Estimated stress of (his) week ──────────────────────────── */}
          <section className="tl-card">
            <div className="tl-card-head">
              <div className="min-w-0">
                <h2>{t("week.stress.title")}</h2>
                <span>{t("week.stress.hint")}</span>
              </div>
              {weekStress && weekStress.trainingDays > 0 && (
                <Badge tone={BAND_TONE[weekStress.band]}>
                  {tInterp("week.stress.weekScore", {
                    score: weekStress.weekScore,
                    band: t(BAND_KEY[weekStress.band]),
                  })}
                </Badge>
              )}
            </div>
            <div className="tl-card-body flex flex-col gap-3">
              {!weekStress || weekStress.trainingDays === 0 ? (
                <p className="text-sm text-[var(--tl-text-secondary)]">
                  {t("week.stress.noDays")}
                </p>
              ) : weekStress.warnings.length === 0 ? (
                <p className="text-sm text-[var(--tl-success)]">
                  {t("week.stress.ok")}
                </p>
              ) : (
                <ul className="tl-note">
                  {weekStress.warnings.map((warning, i) => (
                    <li key={i}>
                      {warning.code === "no_rest_week"
                        ? t("week.stress.noRest")
                        : warning.code === "dense_day"
                          ? tInterp("week.stress.denseDay", {
                              i: warning.index + 1,
                              n: warning.families,
                            })
                          : warning.code === "back_to_back"
                            ? tInterp("week.stress.backToBack", {
                                i: warning.index + 1,
                              })
                            : warning.code === "family_over"
                              ? tInterp("week.stress.familyOver", {
                                  fam: familyLabel(warning.family),
                                  sets: warning.sets,
                                })
                              : tInterp("week.stress.familyZero", {
                                  fams: warning.families
                                    .map(familyLabel)
                                    .join(", "),
                                })}
                    </li>
                  ))}
                </ul>
              )}
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
