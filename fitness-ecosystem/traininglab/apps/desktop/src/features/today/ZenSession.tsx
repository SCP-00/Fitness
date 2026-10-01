/**
 * ZEN — the session, with the exercise owning the screen.
 *
 * The owner's mockup (`docs/reference/traininglab-design/04-zen-mode.png`) shows
 * three columns of attention, and this file is that composition:
 *
 *   * **the stage** (left): the exercise, the set you are on, the load, the reps
 *     and — after the set — how hard it was, in one tap;
 *   * **the rails** (right): *Enfócate* (why you are here), *Guía rápida* (three
 *     steps, from the shared technique library), *Registro actual* (the set table
 *     with the `Anterior` column) and *Notas* (what to watch for).
 *
 * Two deliberate departures from the mockup, both because this is a logger, not a
 * poster:
 *
 *   * **The rest countdown is not the middle of this screen.** The rest timer is
 *     owned by the store and drawn as a bar over *every* destination, so a rest
 *     that is going while you read something else is never lost. Duplicating it
 *     here would show two countdowns for one rest.
 *   * **The screen scrolls to the log, not the log to the screen.** The weight
 *     stepper is the largest control on the page: that is the thing your thumb
 *     finds mid-set.
 *
 * The warm-up ramp survives exactly as it was: buildWarmup's 50/70/85 % steps are
 * tagged `warmup: true`, so no aggregate anywhere in the app counts them.
 *
 * @module features/today/ZenSession
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Minus, Plus, Repeat, Timer } from "lucide-react";
import { getExerciseTechnique } from "@fitness/bodylab-exercises";
import { t, tInterp, getLanguage } from "../../lib/i18n";
import { familyLabel } from "../../lib/format";
import { fromKg, toKg, type WeightUnit } from "../../lib/units";
import { parseNumberInput } from "../../lib/parse-num";
import type { PlannedRow } from "../../lib/plan";
import type { TLSet } from "../../lib/types";
import { buildWarmup } from "../../lib/warmup";
import { SectionCard } from "../../ui/primitives";
import { useKeyboardOffset } from "../../ui/use-keyboard-offset";

const FATIGUE_LABELS: Record<1 | 2 | 3 | 4 | 5, { en: string; es: string }> = {
  1: { en: "Easy", es: "Fácil" },
  2: { en: "Light", es: "Ligero" },
  3: { en: "Solid", es: "Duro" },
  4: { en: "Hard", es: "Muy duro" },
  5: { en: "Limit", es: "Al límite" },
};

export function ZenSession({
  rows,
  unit,
  suggestionFor,
  loggedToday,
  previousSetsFor,
  onLogSet,
  onFinish,
  onExit,
  repRangeFor,
  onRepRange,
}: {
  rows: PlannedRow[];
  unit: WeightUnit;
  /** Suggested first-set load per exercise (kg canonical). */
  suggestionFor: (exerciseId: string) => number | null;
  /** Working sets already logged today for an exercise. */
  loggedToday: (exerciseId: string) => TLSet[];
  /** The sets of the previous session that trained this exercise, oldest first. */
  previousSetsFor: (exerciseId: string) => TLSet[];
  onLogSet: (
    row: PlannedRow,
    weightKg: number | null,
    reps: number,
    opts?: { warmup?: boolean; rpe?: number },
  ) => void;
  onFinish: () => void;
  onExit: () => void;
  /** The effective rep range for a row (override or plan default). */
  repRangeFor?: (exerciseId: string) => {
    min: number;
    max: number;
    custom: boolean;
  };
  /** Sets (or clears, with `null`) the user's rep range for an exercise. */
  onRepRange?: (
    exerciseId: string,
    range: { min: number; max: number } | null,
  ) => void;
}) {
  const lang = getLanguage();
  const [rowIdx, setRowIdx] = useState(0);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [lastFatigue, setLastFatigue] = useState<number | null>(null);
  const [phase, setPhase] = useState<"warmup" | "work">("warmup");
  const [warmupStep, setWarmupStep] = useState(0);
  // The reps-per-set editor, inline in the facts row (2026-09-29 e).
  const [editingReps, setEditingReps] = useState(false);
  const [repDraftMin, setRepDraftMin] = useState("");
  const [repDraftMax, setRepDraftMax] = useState("");
  // Pixels covered by the phone's keyboard: the action bar lifts by this much so
  // the confirmation is never under the numeric pad (plan QA, P0 móvil).
  const keyboardOffset = useKeyboardOffset();
  const weightInputRef = useRef<HTMLInputElement>(null);
  const repsInputRef = useRef<HTMLInputElement>(null);

  const row = rows[rowIdx]!;
  const isCardio = row.cardioMin !== undefined;
  const todaySets = loggedToday(row.exerciseId);
  const done = todaySets.length;
  const complete = done >= row.sets;
  // The user's range when they set one; the plan's otherwise. Everything
  // below — prefill, target fact, submit fallback — reads this, so the
  // override is real in ZEN and not just a label on Inicio.
  const repRange = repRangeFor?.(row.exerciseId) ?? {
    min: row.repsMin,
    max: row.repsMax,
    custom: false,
  };

  const warmup = useMemo(
    () =>
      buildWarmup({
        firstWeightKg: suggestionFor(row.exerciseId),
        isCardio,
        workingRestSec: row.restSec,
      }),
    [row.exerciseId, isCardio, row.restSec, suggestionFor],
  );

  // Suggested working weight in the display unit, prefilled.
  const suggestedKg = suggestionFor(row.exerciseId);
  useEffect(() => {
    setWeight(suggestedKg !== null ? String(fromKg(suggestedKg, unit)) : "");
    setReps(String(repRange.min));
    // Reset per **exercise**, not per suggestion. `suggestedKg` is recomputed
    // from the log, so depending on it made every logged set re-enter the
    // warm-up ramp and wipe the RPE feedback (audited 2026-09-30, P0).
    // Mounting mid-exercise (a trip to Progreso and back) keeps the ramp done:
    // if a working set exists, the warm-up is behind the user, not ahead.
    setPhase(loggedToday(row.exerciseId).length > 0 ? "work" : "warmup");
    setWarmupStep(0);
    setLastFatigue(null);
    // repRange is derived per-row too; including it would re-reset mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.exerciseId, unit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const nextRow = rows[rowIdx + 1] ?? null;
  const totalWorkSets = rows.reduce((a, r) => a + r.sets, 0);
  const doneWorkSets = rows.reduce(
    (a, r) => a + Math.min(loggedToday(r.exerciseId).length, r.sets),
    0,
  );
  const previous = previousSetsFor(row.exerciseId);
  const technique = getExerciseTechnique(row.exerciseId);

  const currentWeightKg = (): number | null => {
    if (isCardio) return null;
    const v = parseNumberInput(weight);
    if (v === null || v <= 0) return suggestedKg;
    return toKg(v, unit);
  };

  const logCurrent = (fatigue?: number) => {
    if (phase === "warmup" && warmup.length > 0) {
      const step = warmup[warmupStep]!;
      onLogSet(row, step.weightKg, step.reps, { warmup: true });
      if (warmupStep + 1 < warmup.length) setWarmupStep(warmupStep + 1);
      else setPhase("work");
      return;
    }
    const r = parseNumberInput(reps) ?? repRange.min;
    if (r === null || r <= 0) return;
    onLogSet(row, currentWeightKg(), r, { rpe: fatigue });
    setLastFatigue(fatigue ?? null);
    setReps(String(repRange.min));
  };

  /** Advance to the next exercise (or finish) when the prescription is done. */
  const goNext = () => {
    if (rowIdx + 1 < rows.length) setRowIdx(rowIdx + 1);
    else onFinish();
  };

  const warmupSet = phase === "warmup" ? (warmup[warmupStep] ?? null) : null;
  const unitLabel = unit;

  return (
    <div className="tl-zen-grid">
      {/* ── Stage ────────────────────────────────────────────────────────── */}
      <div className="tl-col">
        <section className="tl-card">
          <div className="tl-zen-stage">
            <div className="flex flex-col items-center gap-2">
              <div
                className="tl-dots"
                role="img"
                aria-label={tInterp("slot.of", { done, total: row.sets })}
              >
                {Array.from({ length: row.sets }, (_, i) => (
                  <span
                    key={i}
                    className={`tl-dot ${i < done ? "is-on" : ""}`}
                  />
                ))}
              </div>
              <h2 className="text-2xl font-bold leading-tight">
                {row.name[lang]}
              </h2>
              <p className="text-sm text-[var(--tl-text-muted)]">
                {row.families.slice(0, 2).map(familyLabel).join(" · ")}
                {row.pattern ? ` · ${row.pattern.replace(/_/g, " ")}` : ""}
              </p>
            </div>

            {/* Warm-up ramp: the same three steps, one at a time. */}
            {warmupSet && !isCardio ? (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs uppercase tracking-wide text-[var(--tl-text-muted)]">
                  {t("zen.warmup")} · {warmupStep + 1}/{warmup.length}
                </p>
                <p className="text-5xl font-bold tabular-nums">
                  {/* Three cases, not two: an empty bar is a real 0 %, a
                      bodyweight/cardio opener has no percentage at all. */}
                  {warmupSet.percent === 0
                    ? t("zen.emptyBar")
                    : warmupSet.percent === null
                      ? t("zen.mobilityLine")
                      : `${warmupSet.percent}%`}
                </p>
                <p className="text-lg text-[var(--tl-text-secondary)] tabular-nums">
                  {warmupSet.reps > 0
                    ? tInterp("zen.warmupReps", {
                        reps: warmupSet.reps,
                        w:
                          warmupSet.weightKg !== null
                            ? fromKg(warmupSet.weightKg, unit).toFixed(1)
                            : "—",
                        unit: unitLabel,
                      })
                    : warmupSet.note[lang]}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--tl-text-secondary)] tabular-nums">
                  {tInterp("zen.setOf", {
                    done: Math.min(done + 1, row.sets),
                    total: row.sets,
                  })}
                </p>

                {/* The load: the largest control on the page. */}
                {!isCardio && (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setWeight((w) =>
                          String(
                            Math.max(
                              0,
                              (parseNumberInput(w) ?? 0) - stepOf(unit),
                            ),
                          ),
                        )
                      }
                      aria-label={t("zen.less")}
                      className="p-4 rounded-2xl bg-[var(--tl-surface-2)] border border-[var(--tl-border)] tl-focusable"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <div className="text-center min-w-[8rem]">
                      <input
                        ref={weightInputRef}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            repsInputRef.current?.focus();
                            repsInputRef.current?.select();
                          }
                        }}
                        inputMode="decimal"
                        aria-label={t("log.weight")}
                        className="tl-zen-input w-full bg-transparent text-center text-6xl font-bold tabular-nums outline-none"
                      />
                      <span className="text-sm text-[var(--tl-text-muted)]">
                        {unitLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setWeight((w) =>
                          String((parseNumberInput(w) ?? 0) + stepOf(unit)),
                        )
                      }
                      aria-label={t("zen.more")}
                      className="p-4 rounded-2xl bg-[var(--tl-surface-2)] border border-[var(--tl-border)] tl-focusable"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                )}

                <div className="tl-zen-facts">
                  <Fact
                    value={
                      editingReps ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            value={repDraftMin}
                            onChange={(e) => setRepDraftMin(e.target.value)}
                            inputMode="numeric"
                            aria-label={t("slot.repsMin")}
                            className="w-10 bg-transparent text-center tabular-nums outline-none border-b border-[var(--tl-border)]"
                          />
                          –
                          <input
                            value={repDraftMax}
                            onChange={(e) => setRepDraftMax(e.target.value)}
                            inputMode="numeric"
                            aria-label={t("slot.repsMax")}
                            className="w-10 bg-transparent text-center tabular-nums outline-none border-b border-[var(--tl-border)]"
                          />
                        </span>
                      ) : (
                        `${repRange.min}–${repRange.max}`
                      )
                    }
                    label={
                      <button
                        type="button"
                        onClick={() => {
                          if (editingReps) {
                            const min = parseNumberInput(repDraftMin);
                            const max = parseNumberInput(repDraftMax);
                            if (min !== null && min >= 1 && onRepRange) {
                              onRepRange(row.exerciseId, {
                                min,
                                max: max === null ? min : Math.max(min, max),
                              });
                            }
                            setEditingReps(false);
                          } else {
                            setRepDraftMin(String(repRange.min));
                            setRepDraftMax(String(repRange.max));
                            setEditingReps(true);
                          }
                        }}
                        title={t("slot.repsHint")}
                        className="tl-focusable underline decoration-dotted underline-offset-4 hover:text-[var(--tl-accent)] transition-colors"
                      >
                        {editingReps ? t("common.save") : t("log.reps")}
                        {repRange.custom && !editingReps
                          ? ` · ${t("slot.repsCustom")}`
                          : ""}
                      </button>
                    }
                  />
                  <Fact
                    value={
                      isCardio
                        ? `${row.cardioMin}′`
                        : `${Math.round(fromKg(currentWeightKg() ?? 0, unit) * 10) / 10} ${unitLabel}`
                    }
                    label={isCardio ? t("ex.cardio") : t("log.weight")}
                  />
                  <Fact
                    value={tInterp("slot.rest", { s: row.restSec })}
                    label={t("settings.model")}
                  />
                </div>

                <div className="flex flex-col items-center gap-1">
                  <input
                    ref={repsInputRef}
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        logCurrent();
                        weightInputRef.current?.focus();
                        weightInputRef.current?.select();
                      }
                    }}
                    inputMode="numeric"
                    aria-label={t("log.reps")}
                    className="tl-zen-input w-24 bg-transparent text-center text-xl tabular-nums outline-none text-[var(--tl-text-secondary)] border-b border-[var(--tl-border)]"
                  />
                  <span className="text-[11px] text-[var(--tl-text-muted)] hidden sm:inline select-none">
                    ↵ Enter para registrar
                  </span>
                </div>

                {/* Optional effort is collapsed so the sticky primary action
                    never competes with or covers the five-choice selector. */}
                <details className="w-full max-w-md tl-zen-effort">
                  <summary className="tl-zen-effort-summary tl-focusable">
                    <span>{t("zen.fatigueOptional")}</span>
                    <span className="text-[var(--tl-text-secondary)]">
                      {lastFatigue !== null
                        ? FATIGUE_LABELS[
                            lastFatigue as 1 | 2 | 3 | 4 | 5
                          ][lang]
                        : "＋"}
                    </span>
                  </summary>
                  <div className="tl-zen-effort-body">
                    <p className="text-center text-xs uppercase tracking-wide text-[var(--tl-text-muted)] mb-2">
                      {t("zen.fatigue")}
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {([1, 2, 3, 4, 5] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => logCurrent(v)}
                          className={`min-h-[3.25rem] rounded-xl border text-sm font-semibold tl-focusable transition-colors ${
                            lastFatigue === v
                              ? "bg-[var(--tl-accent)] text-[var(--tl-on-accent)] border-transparent"
                              : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <p className="text-center text-[11px] text-[var(--tl-text-muted)] mt-1">
                      {t("zen.fatigueHint")}
                    </p>
                  </div>
                </details>
              </>
            )}

            <div
              className="tl-zen-actions flex flex-col gap-2 w-full max-w-md"
              style={
                keyboardOffset ? { bottom: keyboardOffset + 8 } : undefined
              }
            >
              {warmupSet && !isCardio ? (
                <button
                  type="button"
                  onClick={() => logCurrent()}
                  className="min-h-[3.25rem] rounded-2xl tl-btn-primary text-base font-semibold"
                >
                  {t("zen.doneWarmup")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => logCurrent()}
                  disabled={complete}
                  className="min-h-[3.25rem] rounded-2xl tl-btn-primary text-base font-semibold disabled:opacity-40"
                >
                  {t("zen.logSet")}
                </button>
              )}
              {complete && (
                <button
                  type="button"
                  onClick={goNext}
                  className="min-h-[3.25rem] rounded-2xl tl-btn-ghost text-base"
                >
                  {nextRow
                    ? tInterp("zen.next", { name: nextRow.name[lang] })
                    : t("zen.finish")}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Next up: the mockup's "Siguiente serie" row. */}
        <section className="tl-card">
          <div className="tl-card-body">
            <div className="tl-next">
              <span className="tl-day-icon shrink-0" aria-hidden>
                {complete ? "✓" : Math.min(done + 1, row.sets)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
                  {complete ? t("zen.upNext") : t("home.next.title")}
                </p>
                <p className="text-sm font-semibold truncate mt-0.5">
                  {complete && nextRow ? nextRow.name[lang] : row.name[lang]}
                </p>
                <p className="text-[11px] text-[var(--tl-text-secondary)] mt-1 tabular-nums">
                  {tInterp("slot.of", { done, total: row.sets })} ·{" "}
                  {repRange.min}–{repRange.max} ·{" "}
                  {tInterp("slot.rest", { s: row.restSec })}
                </p>
              </div>
              <button
                type="button"
                className="tl-arrow-btn tl-focusable"
                title={complete ? t("zen.finish") : t("zen.logSet")}
                aria-label={complete ? t("zen.finish") : t("zen.logSet")}
                onClick={() => (complete ? goNext() : logCurrent())}
              >
                →
              </button>
            </div>
          </div>
        </section>

        <p className="flex items-center justify-center gap-2 text-[11px] text-[var(--tl-text-muted)]">
          <Timer className="w-3.5 h-3.5" />
          {tInterp("zen.progress", {
            done: doneWorkSets,
            total: totalWorkSets,
          })}{" "}
          · {t("zen.sessionRunning")}
        </p>
      </div>

      {/*
       * ── Rails ────────────────────────────────────────────────────────────
       *
       * "Focused, not empty" (`TRAININGLAB_UI_PLAN.md` §5): on a phone the
       * stage has to own the screen, so everything below it is a `<details>`
       * that opens on demand — the panels are one tap away, never in the way,
       * and never hidden from a screen reader. `Enfócate` stays open because it
       * carries the session's own progress; the set table, once duplicated by
       * the stage, waits collapsed.
       */}
      <aside className="tl-col">
        <SectionCard
          title={t("home.focus.title")}
          hint={t("home.focus.badge")}
          icon={<Timer className="w-4 h-4" />}
        >
          <div className="tl-zen-panel">
            <div className="tl-zen-label">{t("home.focus.badge")}</div>
            <h3 className="text-xl font-bold mb-1.5">
              {t("home.focus.title")}
            </h3>
            <p className="text-xs text-[var(--tl-text-secondary)] leading-relaxed">
              {t("home.focus.body")}
            </p>
            <div className="tl-zen-progress">
              <span
                style={{
                  width: `${progressPct(doneWorkSets, totalWorkSets)}%`,
                }}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t("zen.guide")}
          hint={tInterp("slot.techniqueLvl", {
            n: technique?.techniqueLevel ?? 1,
          })}
          icon={<Repeat className="w-4 h-4" />}
          defaultOpen={false}
        >
          <div className="tl-card-body">
            <div className="tl-steps">
              <Step
                n={1}
                title={t("zen.step1")}
                body={
                  suggestedKg !== null
                    ? tInterp("log.suggested", {
                        w: Math.round(fromKg(suggestedKg, unit) * 10) / 10,
                      })
                    : t("zen.step1b")
                }
              />
              <Step
                n={2}
                title={t("zen.step2")}
                body={
                  technique ? cue(technique.execution[0], lang) : t("ex.noCues")
                }
              />
              <Step n={3} title={t("zen.step3")} body={t("zen.step3b")} />
            </div>
          </div>
        </SectionCard>

        {/* Registro actual — the set table, `Anterior` column included. */}
        <SectionCard
          title={t("zen.log")}
          hint={tInterp("slot.of", { done, total: row.sets })}
          icon={<CheckCircle2 className="w-4 h-4" />}
          defaultOpen={false}
        >
          <div className="tl-card-body">
            <table className="tl-table">
              <thead>
                <tr>
                  <th>{t("zen.col.set")}</th>
                  <th className="num">{t("log.reps")}</th>
                  <th className="num">{t("zen.col.kg")}</th>
                  <th className="num">{t("zen.col.previous")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: row.sets }, (_, i) => {
                  const logged = todaySets[i];
                  const previousSet = previous[i];
                  const current = i === done;
                  return (
                    <tr key={i} className={current ? "is-current" : ""}>
                      <td className="tabular-nums">{i + 1}</td>
                      <td className="num">
                        {logged?.reps ?? (current ? reps || repRange.min : "—")}
                      </td>
                      <td className="num">
                        {logged?.weight !== null && logged?.weight !== undefined
                          ? Math.round(fromKg(logged.weight, unit) * 10) / 10
                          : current && !isCardio
                            ? Math.round(
                                fromKg(currentWeightKg() ?? 0, unit) * 10,
                              ) / 10
                            : "—"}
                      </td>
                      <td className="num">
                        {previousSet
                          ? `${previousSet.reps ?? "—"}×${
                              previousSet.weight !== null
                                ? Math.round(
                                    fromKg(previousSet.weight, unit) * 10,
                                  ) / 10
                                : "—"
                            }`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Notas — what to watch out for, straight from the shared library. */}
        <SectionCard
          title={t("ex.tab.guide")}
          hint={t("ex.guide.mistakes")}
          icon={<Repeat className="w-4 h-4" />}
          defaultOpen={false}
        >
          <div className="tl-card-body flex flex-col gap-2">
            <p className="flex items-start gap-2 text-xs text-[var(--tl-text-secondary)] leading-relaxed">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--tl-accent)]" />
              {technique ? cue(technique.mistakes[0], lang) : t("ex.noCues")}
            </p>
            <p className="flex items-start gap-2 text-xs text-[var(--tl-text-muted)] leading-relaxed">
              <Repeat className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {technique
                ? tInterp("zen.tempo", {
                    tempo: technique.tempo,
                    rir: technique.effort.rir,
                  })
                : t("ex.noCues")}
            </p>
          </div>
        </SectionCard>
      </aside>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Small pieces
   ══════════════════════════════════════════════════════════════════════════ */

function Fact({ value, label }: { value: ReactNode; label: ReactNode }) {
  return (
    <div className="tl-zen-fact">
      <div className="tl-zen-fact-value">{value}</div>
      <div className="tl-zen-fact-label">{label}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="tl-step">
      <span className="tl-step-icon" aria-hidden>
        {n}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] text-[var(--tl-text-muted)] mt-0.5 leading-relaxed">
          {body}
        </span>
      </span>
    </div>
  );
}

/** A cue in the app language, falling back to English — never an empty string. */
function cue(
  value: { en: string; es: string } | undefined,
  lang: "en" | "es",
): string {
  if (!value) return t("ex.noCues");
  return value[lang] ?? value.en;
}

function progressPct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

/** ±step for the ± buttons: 2.5 kg (≈5.5 lb) or the lb display of it. */
function stepOf(unit: WeightUnit): number {
  return unit === "kg" ? 2.5 : 5.5;
}

export type { TLSet };
