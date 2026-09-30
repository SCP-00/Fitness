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
import { fromKg, toKg, type WeightUnit } from "../../lib/units";
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
import { IconChevronRight } from "../../ui/icons";
import { Badge } from "./ui";
import { ExerciseDemoModal } from "./ExerciseDemo";

export function SlotCard({
  row,
  todaySets,
  lastSession,
  suggestion,
  swapOptions,
  autoOpen = true,
  unit = "kg",
  onAddSet,
  onRemoveSet,
  onSwap,
  onRepRange,
  customReps = null,
}: {
  row: PlannedRow;
  /** Sets already logged today for this exercise. */
  todaySets: TLSet[];
  /** Date of the last session that included it (display only). */
  lastSession: string | null;
  suggestion: LoadSuggestion;
  swapOptions: PlannerExercise[];
  /** Only the next exercise opens by default, so the dashboard stays scannable. */
  autoOpen?: boolean;
  /** Display unit — storage and suggestion math stay kg. */
  unit?: WeightUnit;
  onAddSet: (row: PlannedRow, weight: number | null, reps: number) => void;
  onRemoveSet: (id: string) => void;
  onSwap: (fromId: string, toId: string) => void;
  /** Sets (or clears, with `null`) the user's rep range for this exercise. */
  onRepRange?: (range: { min: number; max: number } | null) => void;
  /** The effective range — the override when one exists, else the plan's. */
  customReps?: { min: number; max: number; custom: boolean } | null;
}) {
  const lang = getLanguage();
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [expanded, setExpanded] = useState(autoOpen);
  const [editingReps, setEditingReps] = useState(false);
  const [repDraftMin, setRepDraftMin] = useState("");
  const [repDraftMax, setRepDraftMax] = useState("");
  const techLvl = getExerciseTechnique(row.exerciseId)?.techniqueLevel ?? null;

  const isCardio = row.cardioMin !== undefined;
  const done = todaySets.length;
  const complete = done >= row.sets;
  // The effective range: the user's override when one exists, else the plan's.
  const repRange = customReps ?? {
    min: row.repsMin,
    max: row.repsMax,
    custom: false,
  };

  const submitRepRange = () => {
    if (!onRepRange) return;
    const min = parseNumberInput(repDraftMin);
    const max = parseNumberInput(repDraftMax);
    if (min === null || min < 1) return;
    onRepRange({ min, max: max === null ? min : Math.max(min, max) });
    setEditingReps(false);
  };

  const submit = () => {
    const w = parseNumberInput(weight);
    const r = parseNumberInput(reps);
    // The input speaks the display unit; the log speaks kg.
    const effectiveKg =
      w !== null ? toKg(w, unit) : (suggestion.weight ?? null);
    const effectiveReps = r ?? repRange.min;
    if (effectiveReps === null || effectiveReps <= 0) return;
    onAddSet(row, isCardio ? null : effectiveKg, effectiveReps);
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
        <div className="flex items-end gap-2 text-right shrink-0">
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
          <button
            type="button"
            className="tl-slot-toggle tl-focusable"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? t("slot.collapse") : t("slot.expand")}
          >
            <IconChevronRight size={15} />
            <span>{expanded ? t("slot.collapse") : t("slot.expand")}</span>
          </button>
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

      <div hidden={!expanded}>
        {/* Prescription — the rep range is editable (2026-09-29 e) */}
        <p className="text-sm mt-3 tabular-nums text-[var(--tl-text-secondary)]">
          {isCardio
            ? tInterp("session.cardioDesc", { n: row.cardioMin! })
            : `${row.sets} × ${repRange.min}–${repRange.max} · ${tInterp("slot.rir", { r: row.rir })} · ${tInterp("slot.rest", { s: row.restSec })}`}
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

        {/* Reps-per-set override — the prescription answers to the user. */}
        {!isCardio && onRepRange && (
          <div className="mt-2">
            {editingReps ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[var(--tl-text-muted)]">
                  {t("slot.repsLabel")}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={repDraftMin}
                  onChange={(e) => setRepDraftMin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitRepRange();
                    }
                  }}
                  aria-label={t("slot.repsMin")}
                  className="tl-input w-14 px-2 py-1 text-xs tabular-nums"
                />
                <span className="text-[var(--tl-text-muted)]">–</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={repDraftMax}
                  onChange={(e) => setRepDraftMax(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitRepRange();
                    }
                  }}
                  aria-label={t("slot.repsMax")}
                  className="tl-input w-14 px-2 py-1 text-xs tabular-nums"
                />
                <button
                  type="button"
                  onClick={submitRepRange}
                  className="tl-btn tl-btn-primary tl-focusable px-2 py-1 text-xs"
                >
                  {t("common.save")}
                </button>
                {repRange.custom && (
                  <button
                    type="button"
                    onClick={() => {
                      onRepRange(null);
                      setEditingReps(false);
                    }}
                    className="tl-btn tl-btn-ghost tl-focusable px-2 py-1 text-xs"
                  >
                    {t("slot.repsReset")}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRepDraftMin(String(repRange.min));
                  setRepDraftMax(String(repRange.max));
                  setEditingReps(true);
                }}
                title={t("slot.repsHint")}
                className="inline-flex items-center gap-1 text-[11px] tl-focusable text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] transition-colors"
              >
                <Repeat className="w-3 h-3" />
                {t("slot.repsLabel")}: {repRange.min}–{repRange.max}
                {repRange.custom && ` · ${t("slot.repsCustom")}`}
              </button>
            )}
          </div>
        )}

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
                {tInterp("log.suggested", {
                  w: Math.round(fromKg(suggestion.weight, unit) * 10) / 10,
                })}
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
                  {s.weight === null
                    ? "—"
                    : `${Math.round(fromKg(s.weight, unit) * 10) / 10} ${unit}`}{" "}
                  × {s.reps ?? "—"}
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
                  suggestion.weight !== null
                    ? String(
                        Math.round(fromKg(suggestion.weight, unit) * 10) / 10,
                      )
                    : unit
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
                : `${repRange.min}–${repRange.max}`
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
    </div>
  );
}
