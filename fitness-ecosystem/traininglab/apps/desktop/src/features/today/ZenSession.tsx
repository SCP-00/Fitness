/**
 * ZEN session — the workout stripped to what matters mid-set.
 *
 * Owner spec (2026-09-29): when a session starts, everything else disappears.
 * Only four things exist here:
 *   1. the exercise you are on (and what comes next, small, at the bottom);
 *   2. the set you are on: "Serie 2 de 5";
 *   3. the weight, huge, in the chosen unit;
 *   4. how hard that set felt: a 1–5 fatigue row per set (RPE-class), one tap.
 *
 * Warm-up ramp lives here too (the 50/70/85 ramp for the first exercise's
 * load) — tagged `warmup: true` so no aggregate ever counts it.
 *
 * Everything else — swaps, stats, settings — waits outside. Escape hatch:
 * a small × top-right (44 px), and Escape on desktop.
 *
 * @module features/today/ZenSession
 */

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { t, tInterp, getLanguage } from "../../lib/i18n";
import { fromKg, toKg, type WeightUnit } from "../../lib/units";
import { parseNumberInput } from "../../lib/parse-num";
import type { PlannedRow } from "../../lib/plan";
import type { TLSet } from "../../lib/types";
import { buildWarmup } from "../../lib/warmup";

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
  onLogSet,
  onFinish,
  onExit,
}: {
  rows: PlannedRow[];
  unit: WeightUnit;
  /** Suggested first-set load per exercise (kg canonical). */
  suggestionFor: (exerciseId: string) => number | null;
  onLogSet: (row: PlannedRow, weightKg: number | null, reps: number, opts?: { warmup?: boolean; rpe?: number }) => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  const lang = getLanguage();
  const [rowIdx, setRowIdx] = useState(0);
  const [setDone, setSetDone] = useState<Record<string, number>>({});
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [lastFatigue, setLastFatigue] = useState<number | null>(null);
  const [phase, setPhase] = useState<"warmup" | "work">("warmup");
  const [warmupStep, setWarmupStep] = useState(0);

  const row = rows[rowIdx]!;
  const isCardio = row.cardioMin !== undefined;
  const done = setDone[row.exerciseId] ?? 0;
  const complete = done >= row.sets;

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
    setReps(String(row.repsMin));
    setPhase("warmup");
    setWarmupStep(0);
    setLastFatigue(null);
  }, [row.exerciseId, suggestedKg, unit, row.repsMin]);

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
  const doneWorkSets = Object.entries(setDone).reduce((a, [id, n]) => {
    const r = rows.find((x) => x.exerciseId === id);
    return a + Math.min(n, r?.sets ?? 0);
  }, 0);

  const currentWeightKg = (): number | null => {
    if (isCardio) return null;
    const v = parseNumberInput(weight);
    if (v === null || v <= 0) return suggestedKg;
    return toKg(v, unit);
  };

  const logCurrent = (fatigue?: number) => {
    if (phase === "warmup" && warmup.length > 0) {
      const s = warmup[warmupStep]!;
      onLogSet(row, s.weightKg, s.reps, { warmup: true });
      if (warmupStep + 1 < warmup.length) {
        setWarmupStep(warmupStep + 1);
      } else {
        setPhase("work");
      }
      return;
    }
    const r = parseNumberInput(reps) ?? row.repsMin;
    if (r === null || r <= 0) return;
    const wKg = currentWeightKg();
    onLogSet(row, wKg, r, { rpe: fatigue });
    setLastFatigue(fatigue ?? null);
    setSetDone((prev: Record<string, number>) => ({
      ...prev,
      [row.exerciseId]: (prev[row.exerciseId] ?? 0) + 1,
    }));
    // Reset reps for the next set; keep the weight (same set scheme).
    setReps(String(row.repsMin));
  };

  /** Advance to the next exercise (or finish) when the prescription is done. */
  const goNext = () => {
    if (rowIdx + 1 < rows.length) setRowIdx(rowIdx + 1);
    else onFinish();
  };

  const unitLabel = unit;
  const warmupSet = phase === "warmup" ? warmup[warmupStep] ?? null : null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black text-[var(--tl-text)] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={t("zen.title")}
    >
      {/* Header: minimal — position + exit */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <span className="text-xs text-[var(--tl-text-muted)] tabular-nums">
          {tInterp("zen.progress", { done: doneWorkSets, total: totalWorkSets })}
        </span>
        <button
          onClick={onExit}
          aria-label={t("zen.exit")}
          className="p-3 -m-1 rounded-xl text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Exercise */}
      <div className="px-6 pt-2 pb-1">
        <h1 className="text-2xl font-bold leading-tight">{row.name[lang]}</h1>
        <p className="text-sm text-[var(--tl-text-muted)] mt-1">
          {isCardio
            ? tInterp("session.cardioDesc", { n: row.cardioMin! })
            : `${row.sets} × ${row.repsMin}–${row.repsMax} · RIR ${row.rir}`}
        </p>
      </div>

      {/* Body: warmup ramp or the set */}
      <div className="flex-1 flex flex-col justify-center px-6 gap-6">
        {warmupSet && !isCardio ? (
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-[var(--tl-text-muted)]">
              {t("zen.warmup")} · {warmupStep + 1}/{warmup.length}
            </p>
            <p className="text-5xl font-bold tabular-nums mt-2">
              {/* Three cases, not two: an empty bar is a real 0 %, a
                  bodyweight/cardio opener has no percentage at all — rendering
                  `${null}%` there was the bug this comment replaces. */}
              {warmupSet.percent === 0
                ? t("zen.emptyBar")
                : warmupSet.percent === null
                  ? t("zen.mobilityLine")
                  : `${warmupSet.percent}%`}
            </p>
            <p className="text-lg text-[var(--tl-text-secondary)] mt-1 tabular-nums">
              {warmupSet.reps > 0
                ? tInterp("zen.warmupReps", {
                    reps: warmupSet.reps,
                    w: warmupSet.weightKg !== null ? fromKg(warmupSet.weightKg, unit).toFixed(1) : "—",
                    unit: unitLabel,
                  })
                : warmupSet.note[lang]}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm text-[var(--tl-text-muted)] tabular-nums">
                {tInterp("zen.setOf", { done: Math.min(done + 1, row.sets), total: row.sets })}
              </p>
              {!isCardio && (
                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    onClick={() => setWeight((w) => String(Math.max(0, (parseNumberInput(w) ?? 0) - stepOf(unit))))}
                    aria-label={t("zen.less")}
                    className="p-4 rounded-2xl bg-[var(--tl-surface-2)] tl-focusable"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  <div className="text-center min-w-[8rem]">
                    <input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      inputMode="decimal"
                      aria-label={t("log.weight")}
                      className="w-full bg-transparent text-center text-6xl font-bold tabular-nums outline-none"
                    />
                    <span className="text-sm text-[var(--tl-text-muted)]">{unitLabel}</span>
                  </div>
                  <button
                    onClick={() => setWeight((w) => String((parseNumberInput(w) ?? 0) + stepOf(unit)))}
                    aria-label={t("zen.more")}
                    className="p-4 rounded-2xl bg-[var(--tl-surface-2)] tl-focusable"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              )}
              <input
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                inputMode="numeric"
                aria-label={t("log.reps")}
                className="mt-3 bg-transparent text-center text-xl tabular-nums outline-none text-[var(--tl-text-secondary)]"
              />
            </div>

            {/* Fatigue per set — one tap after the set */}
            <div>
              <p className="text-center text-xs uppercase tracking-wide text-[var(--tl-text-muted)] mb-2">
                {t("zen.fatigue")}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {([1, 2, 3, 4, 5] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => logCurrent(v)}
                    className={`min-h-[3.25rem] rounded-xl border text-sm font-semibold tl-focusable transition-colors ${
                      lastFatigue === v
                        ? "bg-[var(--tl-accent)] text-black border-transparent"
                        : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-[var(--tl-text-muted)] mt-1">
                {lastFatigue !== null
                  ? FATIGUE_LABELS[lastFatigue as 1 | 2 | 3 | 4 | 5][lang]
                  : t("zen.fatigueHint")}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 flex flex-col gap-2">
        {warmupSet && !isCardio ? (
          <button
            onClick={() => logCurrent()}
            className="min-h-[3.25rem] rounded-2xl tl-btn-primary text-base font-semibold"
          >
            {t("zen.doneWarmup")}
          </button>
        ) : (
          <button
            onClick={() => logCurrent()}
            disabled={complete}
            className="min-h-[3.25rem] rounded-2xl tl-btn-primary text-base font-semibold disabled:opacity-40"
          >
            {t("zen.logSet")}
          </button>
        )}
        {complete && (
          <button
            onClick={goNext}
            className="min-h-[3.25rem] rounded-2xl tl-btn-ghost text-base"
          >
            {nextRow
              ? tInterp("zen.next", { name: nextRow.name[lang] })
              : t("zen.finish")}
          </button>
        )}
        {nextRow && !complete && (
          <p className="text-center text-xs text-[var(--tl-text-muted)]">
            {t("zen.upNext")}: {nextRow.name[lang]}
          </p>
        )}
      </div>
    </div>
  );
}

/** ±step for the ± buttons: 2.5 kg (≈5.5 lb) or the lb display of it. */
function stepOf(unit: WeightUnit): number {
  return unit === "kg" ? 2.5 : 5.5;
}

export type { TLSet };
void (t as unknown as TLSet | undefined);
