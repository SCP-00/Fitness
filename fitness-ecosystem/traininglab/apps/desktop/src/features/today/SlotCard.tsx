/**
 * One exercise of today's session.
 *
 * Everything the user needs in one card: the prescription, WHY it was chosen,
 * what weight to use (grounded in their own log, their PRs and the increment
 * their gear actually allows), the sets they already logged, and a
 * keyboard-first input row: weight → Enter → reps → Enter = set logged.
 *
 * @module features/today/SlotCard
 */

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Info,
  Plus,
  Repeat,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { parseNumberInput } from "../../lib/parse-num";
import {
  getExerciseTechnique,
  type MovementPattern,
} from "@fitness/bodylab-exercises";
import { t, tInterp, getLanguage } from "../../lib/i18n";
import type {
  PlannedRow,
  LoadSuggestion,
  PlannerExercise,
} from "../../lib/plan";
import { formatReason } from "../../lib/format";
import type { TLSet } from "../../lib/types";
import { Badge } from "./ui";
import { ExerciseDemoModal } from "./ExerciseDemo";

export function SlotCard({
  row,
  todaySets,
  lastSession,
  suggestion,
  swapOptions,
  onAddSet,
  onRemoveSet,
  onSwap,
}: {
  row: PlannedRow;
  /** Sets already logged today for this exercise. */
  todaySets: TLSet[];
  /** Date of the last session that included it (display only). */
  lastSession: string | null;
  suggestion: LoadSuggestion;
  swapOptions: PlannerExercise[];
  onAddSet: (row: PlannedRow, weight: number | null, reps: number) => void;
  onRemoveSet: (id: string) => void;
  onSwap: (fromId: string, toId: string) => void;
}) {
  const lang = getLanguage();
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const techLvl = getExerciseTechnique(row.exerciseId)?.techniqueLevel ?? null;

  const isCardio = row.cardioMin !== undefined;
  const done = todaySets.length;
  const complete = done >= row.sets;

  const submit = () => {
    const w = parseNumberInput(weight);
    const r = parseNumberInput(reps);
    const effectiveWeight = w ?? suggestion.weight;
    const effectiveReps = r ?? row.repsMin;
    if (effectiveReps === null || effectiveReps <= 0) return;
    onAddSet(row, isCardio ? null : effectiveWeight, effectiveReps);
    setWeight("");
    setReps("");
    weightRef.current?.focus();
  };

  return (
    <div className={`tl-card p-5 ${complete ? "border-emerald-500/40" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight truncate">
            <button
              onClick={() => setDemoOpen(true)}
              title={t("slot.seeHow")}
              className="hover:text-[var(--tl-accent)] transition-colors tl-focusable rounded"
            >
              {row.name[lang]}
            </button>
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <button
              onClick={() => setDemoOpen(true)}
              title={t("slot.seeHow")}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium tl-focusable bg-[var(--tl-accent)]/10 text-[var(--tl-accent)] border-transparent hover:bg-[var(--tl-accent)]/20 transition-colors"
            >
              ▶ {t("slot.seeHow")}
              {techLvl !== null && ` · T${techLvl}`}
            </button>
            <Badge tone="neutral">{row.pattern.replace(/_/g, " ")}</Badge>
            {row.unilateral && (
              <Badge tone="neutral">{t("slot.unilateral")}</Badge>
            )}
            {row.families.slice(0, 2).map((f) => (
              <Badge key={f} tone="accent">
                {f}
              </Badge>
            ))}
            {row.jointStress >= 3 && (
              <Badge tone="warning" title={t("slot.jointCaution")}>
                <AlertTriangle className="w-3 h-3" />
                joint
              </Badge>
            )}
            {row.spineLoad >= 3 && (
              <Badge tone="warning" title={t("slot.spineCaution")}>
                <AlertTriangle className="w-3 h-3" />
                spine
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {!isCardio && (
            <span
              className={`text-xs font-semibold tabular-nums ${complete ? "text-emerald-400" : "text-[var(--tl-text-muted)]"}`}
            >
              {tInterp("slot.of", { done, total: row.sets })}
            </span>
          )}
          {lastSession && (
            <p className="text-[11px] text-[var(--tl-text-muted)] mt-1">
              {tInterp("log.last", { d: lastSession.split("T")[0]!, n: done })}
            </p>
          )}
        </div>
      </div>

      {demoOpen && (
        <ExerciseDemoModal
          exerciseId={row.exerciseId}
          pattern={row.pattern as MovementPattern}
          name={row.name[lang]}
          onClose={() => setDemoOpen(false)}
        />
      )}

      {/* Prescription */}
      <p className="text-sm mt-3 tabular-nums text-[var(--tl-text-secondary)]">
        {isCardio
          ? tInterp("session.cardioDesc", { n: row.cardioMin! })
          : `${row.sets} × ${row.repsMin}–${row.repsMax} · ${tInterp("slot.rir", { r: row.rir })} · ${tInterp("slot.rest", { s: row.restSec })}`}
        <span className="text-[var(--tl-text-muted)]">
          {" "}
          · {tInterp("session.minutes", { n: Math.round(row.minutes) })}
        </span>
      </p>

      {/* Why + progression */}
      <p className="text-xs text-[var(--tl-text-muted)] mt-2 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          <span className="text-[var(--tl-text-secondary)] font-medium">
            {t("session.why")}:{" "}
          </span>
          {row.reasons.map(formatReason).join(" · ")}
          {row.progression.length > 0 && (
            <span className="block mt-0.5">
              {tInterp("slot.progressBy", {
                axes: row.progression.join(" · "),
              })}
            </span>
          )}
        </span>
      </p>

      {/* Load suggestion */}
      {!isCardio && (
        <p className="text-xs mt-2">
          {suggestion.weight === null ? (
            <span className="text-[var(--tl-text-muted)]">
              {suggestion.reason}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[var(--tl-accent)] font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              {tInterp("log.suggested", { w: suggestion.weight })}
              <span className="text-[var(--tl-text-muted)] font-normal">
                · {suggestion.reason}
              </span>
            </span>
          )}
        </p>
      )}

      {/* Logged sets today */}
      {todaySets.length > 0 && (
        <ul className="mt-3 space-y-1">
          {todaySets.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-sm bg-[var(--tl-surface-2)] rounded-lg px-3 py-1.5"
            >
              <span className="text-[var(--tl-text-muted)] tabular-nums">
                #{i + 1}
              </span>
              <span className="font-medium tabular-nums">
                {s.weight === null ? "—" : `${s.weight} kg`} × {s.reps ?? "—"}
              </span>
              <button
                onClick={() => onRemoveSet(s.id)}
                className="p-1 text-[var(--tl-border-strong)] hover:text-red-400 rounded tl-focusable"
                aria-label={t("common.delete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Keyboard-first input row (wraps on phones — see .tl-set-row) */}
      <div className="tl-set-row flex items-center gap-2 mt-3">
        {!isCardio && (
          <>
            <input
              ref={weightRef}
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  repsRef.current?.focus();
                }
              }}
              placeholder={
                suggestion.weight !== null ? String(suggestion.weight) : "kg"
              }
              aria-label={t("log.weight")}
              className="tl-input w-24 px-3 py-2 text-sm tabular-nums"
            />
            <span className="text-[var(--tl-text-muted)] text-sm">×</span>
          </>
        )}
        <input
          ref={repsRef}
          type="text"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            isCardio
              ? String(row.cardioMin ?? 0)
              : `${row.repsMin}–${row.repsMax}`
          }
          aria-label={t("log.reps")}
          className="tl-input w-20 px-3 py-2 text-sm tabular-nums"
        />
        <button
          onClick={submit}
          className="flex items-center gap-1 px-3 py-2 rounded-xl tl-btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          {t("log.add")}
        </button>

        <div className="tl-swap ml-auto relative">
          <button
            onClick={() => setSwapping((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl tl-btn-ghost text-xs"
          >
            <Repeat className="w-3.5 h-3.5" />
            {t("session.swap")}
          </button>
          {swapping && (
            <div className="tl-swap-menu absolute right-0 mt-2 w-72 tl-card p-3 z-30 shadow-xl">
              <p className="text-xs text-[var(--tl-text-muted)] mb-2">
                {t("session.swapTitle")}
              </p>
              {swapOptions.length === 0 ? (
                <p className="text-xs text-[var(--tl-text-muted)]">
                  {t("session.noSwap")}
                </p>
              ) : (
                <ul className="max-h-64 overflow-auto space-y-1">
                  {swapOptions.map((option) => (
                    <li key={option.exercise.id}>
                      <button
                        onClick={() => {
                          onSwap(row.exerciseId, option.exercise.id);
                          setSwapping(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-[var(--tl-surface-2)] tl-focusable"
                      >
                        {option.exercise.name[lang]}
                        <span className="block text-[11px] text-[var(--tl-text-muted)]">
                          {option.traits.loadType} · hypertrophy{" "}
                          {option.exercise.hypertrophy}/5
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
