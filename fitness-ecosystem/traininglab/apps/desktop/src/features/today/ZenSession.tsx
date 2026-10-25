/**
 * ZEN — the session, as the owner approved it in `mockup/03-sesion.html`.
 *
 * **2026-10-14 (mockup 03 port).** The screen is rebuilt on the mockup's own
 * markup and stylesheet (`src/mockup.css`): the top bar with *Ahora / Siguiente*,
 * the media card (`.hero-media` + the frame's Gif · Inicio · Fin switch), the live
 * entry (`stepper-row`), the set log as a real `table` with a *Marca* column, the
 * reorderable *Después de esta serie* strip, and — in the right column — the
 * progression, the technique cues, the rest and the exercise summary.
 *
 * Everything the old ZEN could do still works here, and two of those things are
 * the reason this file is long:
 *
 *   * **the warm-up ramp** (`lib/warmup.ts`): its steps are tagged `warmup: true`,
 *     so no aggregate in the app counts them, and the page draws no block for it.
 *     It lives in the entry card, one step at a time, with the same three numbers;
 *   * **the rep-range editor**: in the page the *objetivo 10–12* line under Reps is
 *     plain text; here it is still the control that rewrites the prescription for
 *     that exercise (`settings.repOverrides`), showing `· propio` when the range on
 *     screen is the owner's and not the plan's.
 *
 * Two gestures changed with the page, deliberately:
 *
 *   * the effort used to be five buttons where **one tap logged the set**; now the
 *     value is a field and *Registrar* writes it (the page's own shape: fields +
 *     one primary action). The D/F marks ride along as a second, small control in
 *     the same field, because they feed the set-proposal maths;
 *   * *Saltar* and *Posponer* are the page's own two escape hatches and both are
 *     wired now (2026-10-15). Neither rewrites today's plan: *Saltar* is a mark
 *     that makes the session step over the exercise while leaving it prescribed
 *     and in the week, and *Posponer* moves it to the end of today's session as a
 *     derivation over the sequence, so taking the mark back puts it exactly where
 *     it was. Both are undone with one tap, in the header and in the strip under
 *     the sequence. *Cambiar* does exist (`swapRow` + `swapOptions`) and is here
 *     too, as the drawer the deleted SlotCard used to open.
 *
 * @module features/today/ZenSession
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getExerciseTechnique,
  type MovementPattern,
} from "@fitness/bodylab-exercises";
import { hashFor } from "../../app/router";
import { t, tInterp, getLanguage } from "../../lib/i18n";
import { familyLabel } from "../../lib/format";
import {
  EFFORT_MARKERS,
  EFFORT_MEANING,
  markerOf,
  type EffortMarker,
} from "../../lib/effort";
import { fromKg, toKg, type WeightUnit } from "../../lib/units";
import { parseNumberInput } from "../../lib/parse-num";
import {
  proposeNextSet,
  type NextSetProposal,
  type ProposalSet,
} from "../../lib/set-proposal";
import type {
  LoadSuggestion,
  PlannedRow,
  PlannerExercise,
} from "../../lib/plan";
import type {
  ProgressionAdvice,
  ProgressionVerdict,
} from "../../lib/progression";
import {
  VERDICT_KEY,
  progressionLever,
  progressionSentence,
} from "../../lib/progression-copy";
import type { RestState } from "../../lib/rest";
import type { TLSet } from "../../lib/types";
import { buildWarmup } from "../../lib/warmup";
import { MIcons } from "../../ui/mockup-icons";
import { useExerciseMedia } from "../exercises/media";
import { ExerciseDemoModal, ExerciseMediaFrame } from "./ExerciseDemo";
import RestTimer from "./RestTimer";

const FATIGUE_LABELS: Record<1 | 2 | 3 | 4 | 5, { en: string; es: string }> = {
  1: { en: "Easy", es: "Fácil" },
  2: { en: "Light", es: "Ligero" },
  3: { en: "Solid", es: "Duro" },
  4: { en: "Hard", es: "Muy duro" },
  5: { en: "Limit", es: "Al límite" },
};

/**
 * Colour by what the verdict ASKS of him, never by how the number looks: going
 * to an easier variant is not a failure (amber, informational), and a raise is
 * the reward for having cleared the range (green). Same mapping the retired
 * `ProgressionNote` used.
 */
const VERDICT_BADGE: Record<ProgressionVerdict, string> = {
  increase_load: "badge-success",
  escalate_variant: "badge-success",
  repeat: "badge-accent",
  reduce: "badge-warning",
  regress_variant: "badge-warning",
  first_time: "",
};

export function ZenSession({
  rows,
  unit,
  suggestionFor,
  progressionFor,
  loggedToday,
  previousSetsFor,
  onLogSet,
  onFinish,
  onExit,
  repRangeFor,
  onRepRange,
  onMoveRow,
  onResetOrder,
  orderCustom,
  swapOptionsFor,
  onSwap,
  rest,
  onExtendRest,
  onToggleRestPause,
  onSkipRest,
  skippedToday,
  postponedToday,
  onSkip,
  onUnskip,
  onPostpone,
  onUnpostpone,
}: {
  rows: PlannedRow[];
  unit: WeightUnit;
  /** Suggested first-set load per exercise, with the reason for it (kg canonical). */
  suggestionFor: (exerciseId: string) => LoadSuggestion | null;
  /**
   * The cross-session verdict for an exercise (raise / escalate / repeat /
   * reduce / regress), computed over the days BEFORE today. `null` when the
   * exercise is not part of today's plan.
   */
  progressionFor: (exerciseId: string) => ProgressionAdvice | null;
  /** Working sets already logged today for an exercise. */
  loggedToday: (exerciseId: string) => TLSet[];
  /** The sets of the previous session that trained this exercise, oldest first. */
  previousSetsFor: (exerciseId: string) => TLSet[];
  onLogSet: (
    row: PlannedRow,
    weightKg: number | null,
    reps: number,
    opts?: { warmup?: boolean; rpe?: number; effort?: EffortMarker },
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
  /** Reorder the session: positions in `rows`, i.e. in the list on screen. */
  onMoveRow: (from: number, to: number) => void;
  /** Back to the generator's own sequence. */
  onResetOrder: () => void;
  /** True when today's sequence is the one the user dragged into place. */
  orderCustom: boolean;
  /** Same-pattern, gear-legal replacements for the *Cambiar* drawer. */
  swapOptionsFor: (exerciseId: string) => PlannerExercise[];
  onSwap: (from: string, to: string) => void;
  /** Ids set aside for the rest of today (*Saltar*), in the order they were. */
  skippedToday: string[];
  /** Ids pushed to the end of today's session (*Posponer*), in that order. */
  postponedToday: string[];
  /** Set one aside, or take the mark back. Neither touches the plan. */
  onSkip: (exerciseId: string) => void;
  onUnskip: (exerciseId: string) => void;
  /** Push one to the end of today's session, or take the mark back. */
  onPostpone: (exerciseId: string) => void;
  onUnpostpone: (exerciseId: string) => void;
  /** The rest in progress, or `null`. Rendered here as page 03's card. */
  rest: RestState | null;
  onExtendRest: (seconds: number) => void;
  onToggleRestPause: () => void;
  onSkipRest: () => void;
}) {
  const lang = getLanguage();
  /*
   * The exercise you are on is tracked by **id**, not by position (2026-10-11).
   * The sequence is the user's and he can change it mid-session, so a reorder
   * must never swap the exercise out from under his hands; the index is derived,
   * and an id the new plan no longer contains falls back to the first row.
   */
  const [currentId, setCurrentId] = useState<string | null>(null);
  // The dragged index lives in a ref *and* in state (2026-10-11): the ref is what
  // the drop reads — inside one native drag the `drop` handler can run before
  // React has committed `dragstart`'s state, and a drop that reads a stale
  // `null` silently does nothing — while the state only drives the highlight.
  const dragFromRef = useRef<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const beginDrag = (i: number) => {
    dragFromRef.current = i;
    setDragFrom(i);
  };
  const endDrag = () => {
    dragFromRef.current = null;
    setDragFrom(null);
  };
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  /*
   * The two things a set can be marked with, held as *fields* rather than as
   * actions (mockup 03): the RIR of this set and, when it applies, the owner's own
   * D/F mark. Both are written by *Registrar*, and both are sticky — the next set
   * usually carries the same RIR and the same mark, and re-tapping it every time
   * would be the tax this screen exists to remove.
   */
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [mark, setMark] = useState<EffortMarker | null>(null);
  /*
   * The load for the NEXT set, proposed by the mark the last one carried
   * (2026-10-11, owner's directive: "propose the weight by itself, from whether
   * the previous set failed or came close"). The rules live in
   * `lib/set-proposal.ts`; this state only holds the current verdict so the
   * weight field can pre-fill with it and the reason can sit under the field
   * instead of being typed by a human.
   */
  const [nextProposal, setNextProposal] = useState<NextSetProposal | null>(
    null,
  );
  const [phase, setPhase] = useState<"warmup" | "work">("warmup");
  const [warmupStep, setWarmupStep] = useState(0);
  // The reps-per-set editor, inline under the reps field (2026-09-29 e).
  const [editingReps, setEditingReps] = useState(false);
  const [repDraftMin, setRepDraftMin] = useState("");
  const [repDraftMax, setRepDraftMax] = useState("");
  // The technique sheet, one tap away from the stage (mockup 03).
  const [demoOpen, setDemoOpen] = useState(false);
  // The *Cambiar* drawer (mockup 03's top bar): the store has had `swapRow` and
  // `swapOptions` since the start; this is the screen that finally asks.
  const [swapping, setSwapping] = useState(false);
  /*
   * Which exercises have finished the warm-up ramp in this visit to the screen.
   * The ramp is not persisted anywhere (warm-up sets stay out of every aggregate),
   * so without this a jump to another exercise and back — the *Después de esta
   * serie* strip makes that one tap — would walk the owner through the ramp again.
   */
  const [rampDone, setRampDone] = useState<Record<string, boolean>>({});

  const rowIdx = useMemo(() => {
    const at = rows.findIndex((r) => r.exerciseId === currentId);
    return at === -1 ? 0 : at;
  }, [rows, currentId]);

  /*
   * Pin the exercise the moment the session is known — not on the first logged
   * set. Without this the stage was derivable from position 0 while nothing had
   * been touched, so dragging another exercise to the top *did* change the
   * exercise on screen; measured exactly that on 2026-10-11. It re-pins only when
   * the plan no longer contains it (a shorter budget dropped it), which is the
   * one case where following the list is the honest behaviour.
   */
  useEffect(() => {
    if (rows.length === 0) return;
    if (currentId && rows.some((r) => r.exerciseId === currentId)) return;
    setCurrentId(rows[0]!.exerciseId);
  }, [rows, currentId]);

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

  /*
   * What is set aside today, as lookup sets. The two lists are ids, and the only
   * thing the session does with them is *step over* the skipped ones: the rows
   * themselves keep their position, their prescription and their place in the
   * week, which is what makes both gestures safe to take back.
   */
  const skipped = useMemo(() => new Set(skippedToday), [skippedToday]);
  const postponed = useMemo(() => new Set(postponedToday), [postponedToday]);

  const row = rows[rowIdx]!;
  const isSkipped = skipped.has(row.exerciseId);
  const isPostponed = postponed.has(row.exerciseId);

  /**
   * The next exercise still waiting for him. The postponed ones are already last
   * (the store applies that derivation), so walking forward *is* "the next thing
   * to do", and the set-aside ones are the only ones to step over. `-1` when
   * today has nothing left after this one.
   */
  const nextLive = (from: number, alsoGone?: string): number => {
    for (let i = from + 1; i < rows.length; i++) {
      const id = rows[i]!.exerciseId;
      if (id === alsoGone) continue;
      if (!skipped.has(id)) return i;
    }
    return -1;
  };

  const nextIdx = nextLive(rowIdx);
  const nextRow = nextIdx === -1 ? null : rows[nextIdx]!;
  const isCardio = row.cardioMin !== undefined;
  const todaySets = loggedToday(row.exerciseId);
  const done = todaySets.length;
  const complete = done >= row.sets;
  const totalWorkSets = rows.reduce((a, r) => a + r.sets, 0);
  const doneWorkSets = rows.reduce(
    (a, r) => a + Math.min(loggedToday(r.exerciseId).length, r.sets),
    0,
  );
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
        firstWeightKg: suggestionFor(row.exerciseId)?.weight ?? null,
        isCardio,
        workingRestSec: row.restSec,
      }),
    [row.exerciseId, isCardio, row.restSec, suggestionFor],
  );

  // Suggested working weight, with its reason, prefilled.
  const suggestion = suggestionFor(row.exerciseId);
  const suggestedKg = suggestion?.weight ?? null;
  useEffect(() => {
    setWeight(suggestedKg !== null ? String(fromKg(suggestedKg, unit)) : "");
    setReps(String(repRange.min));
    // Reset per **exercise**, not per suggestion. `suggestedKg` is recomputed
    // from the log, so depending on it made every logged set re-enter the
    // warm-up ramp and wipe the RPE feedback (audited 2026-09-30, P0).
    // Mounting mid-exercise (a trip to Progreso and back) keeps the ramp done:
    // if a working set exists — or the ramp was finished on this visit — the
    // warm-up is behind the user, not ahead.
    setPhase(
      loggedToday(row.exerciseId).length > 0 || rampDone[row.exerciseId]
        ? "work"
        : "warmup",
    );
    setWarmupStep(0);
    setFatigue(null);
    setMark(null);
    setNextProposal(null);
    setDemoOpen(false);
    setSwapping(false);
    // repRange is derived per-row too; including it would re-reset mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.exerciseId, unit]);

  const previous = previousSetsFor(row.exerciseId);
  const technique = getExerciseTechnique(row.exerciseId);
  /*
   * The hero's pill (mockup 03) names the media the frame below is showing, so it
   * is read from the same manifest the frame reads: a caption that outlives the
   * asset it describes is worse than no caption.
   */
  const media = useExerciseMedia(row.exerciseId);
  const hasGif = !!media?.gif;
  const advice = progressionFor(row.exerciseId);
  const swaps = swapping ? swapOptionsFor(row.exerciseId) : [];

  const currentWeightKg = (): number | null => {
    if (isCardio) return null;
    const v = parseNumberInput(weight);
    if (v === null || v <= 0) return suggestedKg;
    return toKg(v, unit);
  };

  /*
   * ± by the gear's own increment when the plan knows it — dumbbells move in
   * 2 kg jumps, a barbell in 2.5 — because a stepper that moves by 2.5 when the
   * rack only has 2 would suggest a number the owner cannot load. Falling back
   * to the plain plate step keeps bodyweight and band work usable.
   */
  const weightStep =
    suggestion?.stepKg != null
      ? Math.round(fromKg(suggestion.stepKg, unit) * 100) / 100
      : stepOf(unit);

  const bumpWeight = (delta: number) =>
    setWeight((w) =>
      String(
        Math.round(Math.max(0, (parseNumberInput(w) ?? 0) + delta) * 100) / 100,
      ),
    );

  const bumpReps = (delta: number) => {
    const current = parseNumberInput(reps) ?? repRange.min;
    setReps(String(Math.max(1, current + delta)));
  };

  /**
   * The proposal for the set AFTER the one being logged: today's sets plus the
   * pending one, judged by its D/F mark. Warm-ups never reach it — the lib
   * filters them, and the ramp's own weights drive that phase anyway.
   */
  const proposeAfter = (pending: ProposalSet): NextSetProposal =>
    proposeNextSet({
      sets: [...todaySets, pending],
      targetReps: repRange,
      stepKg: suggestion?.stepKg ?? null,
      capKg: suggestion?.capKg ?? null,
      suggestionKg: suggestedKg,
    });

  /**
   * Log the set on screen. The RIR and the D/F mark are the fields above, so the
   * write is one action with three pieces of data instead of a gesture that
   * cannot be corrected before it lands.
   */
  const logCurrent = () => {
    if (phase === "warmup" && warmup.length > 0) {
      const step = warmup[warmupStep]!;
      onLogSet(row, step.weightKg, step.reps, { warmup: true });
      if (warmupStep + 1 < warmup.length) setWarmupStep(warmupStep + 1);
      else {
        setPhase("work");
        setRampDone((state) => ({ ...state, [row.exerciseId]: true }));
      }
      return;
    }
    const r = parseNumberInput(reps);
    if (r === null || r <= 0) return;
    const kg = currentWeightKg();
    onLogSet(row, kg, r, {
      ...(fatigue !== null ? { rpe: fatigue } : {}),
      ...(mark ? { effort: mark } : {}),
    });
    setReps(String(repRange.min));
    /*
     * The weight field is re-proposed, not left alone (2026-10-11): after a
     * set marked to failure the next load drops, after an easy one it climbs —
     * and the owner types nothing. `todaySets` still holds the pre-log array,
     * so the pending set is added here by hand.
     */
    if (!isCardio) {
      const proposal = proposeAfter({
        weight: kg,
        reps: r,
        ...(mark ? { effort: mark } : {}),
      });
      setNextProposal(proposal.move === "first" ? null : proposal);
      setWeight(
        proposal.weightKg !== null
          ? String(Math.round(fromKg(proposal.weightKg, unit) * 100) / 100)
          : "",
      );
    }
  };

  /**
   * *Saltar* / *Posponer* (page 03), the two escape hatches of the top bar.
   *
   * Both leave the plan alone and both take him to the next exercise that is not
   * set aside: a button next to the movement you are leaving must not leave you
   * staring at it. When there is nothing left to move to, the exercise stays on
   * the stage — marked, with the undo in the same button — because the honest end
   * of a session is the *Terminar* button, never a finish he did not ask for.
   */
  const leaveRow = (alsoGone: string) => {
    const to = nextLive(rowIdx, alsoGone);
    if (to !== -1) setCurrentId(rows[to]!.exerciseId);
  };

  const toggleSkip = () => {
    if (isSkipped) {
      onUnskip(row.exerciseId);
      return;
    }
    onSkip(row.exerciseId);
    leaveRow(row.exerciseId);
  };

  const togglePostpone = () => {
    if (isPostponed) {
      onUnpostpone(row.exerciseId);
      return;
    }
    onPostpone(row.exerciseId);
    leaveRow(row.exerciseId);
  };

  /** Advance to the next exercise (or finish) when the prescription is done. */
  const goNext = () => {
    const next = nextLive(rowIdx);
    if (next !== -1) setCurrentId(rows[next]!.exerciseId);
    else onFinish();
  };

  /**
   * *Repetir la anterior* (mockup 03): copy that set's numbers into the fields.
   *
   * Named `copyPrevious` and not `usePrevious`, which it was: it is a plain
   * handler, and a name that starts with `use` made the linter read a Hook call
   * inside an `onClick` — a real diagnostic about the name, not about the code.
   */
  const copyPrevious = (set: TLSet | undefined) => {
    if (!set) return;
    if (set.weight !== null)
      setWeight(String(Math.round(fromKg(set.weight, unit) * 10) / 10));
    if (set.reps !== null) setReps(String(set.reps));
  };

  const saveRepRange = () => {
    const min = parseNumberInput(repDraftMin);
    const max = parseNumberInput(repDraftMax);
    if (min !== null && min >= 1 && onRepRange) {
      onRepRange(row.exerciseId, {
        min,
        max: max === null ? min : Math.max(min, max),
      });
    }
    setEditingReps(false);
  };

  const warmupSet = phase === "warmup" ? (warmup[warmupStep] ?? null) : null;
  const unitLabel = unit;

  /**
   * The day's marks, in the order he made them, with the names today's session
   * knows them by. An id the current plan no longer contains (he swapped it out,
   * or the re-plan dropped it) is not listed: a button to undo something that is
   * not there would be a lie.
   */
  const asideEntries = useMemo(() => {
    const of = (ids: string[], skipped: boolean) =>
      ids.flatMap((id) => {
        const found = rows.find((r) => r.exerciseId === id);
        return found ? [{ id, name: found.name[lang], skipped }] : [];
      });
    return [...of(skippedToday, true), ...of(postponedToday, false)];
  }, [skippedToday, postponedToday, rows, lang]);

  return (
    <>
      {/* ── Top bar: what you are on, what comes next, and the way out. The
          mockup draws it as a sibling of the content box: sticky, with its own
          background and bottom rule. ─────────────────────────────────────── */}
      <header className="topbar">
        <span className="nownext">
          <MIcons.target
            style={{ color: "var(--tl-accent)", width: 19, height: 19 }}
          />
          <span className="small muted">{t("zen.now")}</span>
          <b>{row.name[lang]}</b>
          {/* The stage can hold an exercise he has set aside — it says so here,
              in the same place the name is, rather than hiding the fact. */}
          {isSkipped && (
            <span className="badge badge-warning">{t("zen.skipped")}</span>
          )}
          {isPostponed && (
            <span className="badge badge-info">{t("zen.postponed")}</span>
          )}
          {/* `tl-zen-next` (2026-10-23): `display:contents` on desktop, its own
              line on a phone. Before, both names shared one nowrap row and
              «Ahora:» and «Siguiente:» were each cut to two words at 390 px —
              the exercise you are on was unreadable exactly when it matters. */}
          {nextRow && (
            <span className="tl-zen-next">
              <MIcons.chevronRight
                style={{ width: 15, height: 15, color: "var(--tl-text-muted)" }}
              />
              <span className="small muted">{t("zen.nextUp")}</span>
              <b className="secondary">{nextRow.name[lang]}</b>
            </span>
          )}
        </span>
        <div className="spacer" />
        {/*
         * The page's two escape hatches, and they are toggles: the same button
         * takes the mark back, so a mis-tap costs one tap — never a trip to
         * Ajustes or an edit of the plan. Neither writes anything about the plan:
         * see `lib/settings`.
         */}
        <button
          type="button"
          className="btn tl-focusable"
          onClick={toggleSkip}
          aria-pressed={isSkipped}
          title={t("zen.skipHint")}
        >
          <MIcons.chevronRight />
          {isSkipped ? t("zen.unskip") : t("zen.skip")}
        </button>
        <button
          type="button"
          className="btn tl-focusable"
          onClick={togglePostpone}
          aria-pressed={isPostponed}
          title={t("zen.postponeHint")}
        >
          <MIcons.clock />
          {isPostponed ? t("zen.unpostpone") : t("zen.postpone")}
        </button>
        <button
          type="button"
          className="btn tl-focusable"
          onClick={() => setSwapping(true)}
        >
          <MIcons.repeat />
          {t("session.swap")}
        </button>
        <button
          type="button"
          className="btn tl-focusable"
          onClick={onExit}
          title={t("zen.exit")}
        >
          <MIcons.chevronLeft />
          {t("zen.exit")}
        </button>
      </header>

      <div className="content">
        <div className="cols-wide">
          {/* ══ LEFT: the movement, the set in your hands, the log ══════════ */}
          <div className="stack">
            {/* Media first: there is always a GIF, a still or an honest empty
                state, and the technique sheet is one tap away from it.

                `tl-zen-current` (2026-10-23): the card is what the orange marker
                points at, and the queue's orange row was the only thing saying
                which exercise you are on — while the card the set entry belongs
                to had no marker at all. */}
            <section className="card tl-zen-current">
              <div className="card-head" style={{ paddingBottom: 8 }}>
                <span className="card-title" style={{ fontSize: 22 }}>
                  <MIcons.target />
                  {row.name[lang]}
                </span>
                <div className="spacer" />
                <span className="small muted">
                  {row.families.slice(0, 3).map(familyLabel).join(" · ")}
                </span>
                <button
                  type="button"
                  className="icon-btn tl-focusable"
                  onClick={() => setDemoOpen(true)}
                  title={t("zen.seeFull")}
                  aria-label={t("zen.seeFull")}
                >
                  <MIcons.external />
                </button>
              </div>

              <div className="card-body" style={{ paddingTop: 0 }}>
                {/* `row-wrap`: at 320 px the two buttons plus the media pill are
                    311 px against 290 px of card, and the pill used to push the
                    page 38 px sideways (audited 2026-10-24). */}
                <div className="row row-wrap" style={{ gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn tl-focusable"
                    onClick={() => setDemoOpen(true)}
                  >
                    <MIcons.notebook />
                    {t("zen.guide")}
                  </button>
                  <a
                    className="btn tl-focusable"
                    href={hashFor("exercises", [row.exerciseId])}
                  >
                    <MIcons.users />
                    {t("zen.muscles")}
                  </a>{" "}
                  <div className="spacer" />
                  {/*
                   * The page's pill names the media, not the exercise: it is the
                   * caption of the frame below. The technique level is NOT lost —
                   * the guide opened by *Técnica* prints it (`ExerciseDemo`), which
                   * is where a number about the exercise belongs.
                   */}
                  {hasGif && (
                    <span className="badge badge-accent">
                      <MIcons.image />
                      {t("zen.mediaPill")}
                    </span>
                  )}
                </div>

                {/* `.hero-media` keeps its frame rules; the page zeroes its own
                    box out inline, and so does this port. */}
                <div
                  className="hero-media"
                  style={{ padding: 0, border: "none", background: "none" }}
                >
                  <ExerciseMediaFrame
                    exerciseId={row.exerciseId}
                    pattern={row.pattern as MovementPattern}
                    name={row.name[lang]}
                    variant="stage"
                  />
                  <p
                    className="tiny muted"
                    style={{ margin: 0, textAlign: "center" }}
                  >
                    {t("zen.mediaNote")}
                  </p>
                </div>
              </div>
            </section>

            {/* Live set entry: type it, or tap it. */}
            <section className="card">
              <div className="card-head">
                <h2 className="card-title" style={{ fontSize: 17 }}>
                  {warmupSet
                    ? `${t("zen.warmup")} · ${warmupStep + 1}/${warmup.length}`
                    : tInterp("zen.setOf", {
                        done: Math.min(done + 1, row.sets),
                        total: row.sets,
                      })}
                </h2>
                <div className="spacer" />
                <span className="tiny muted">
                  {warmupSet ? t("zen.warmupHint") : t("zen.entryHint")}
                </span>
              </div>

              <div className="card-body" style={{ paddingTop: 0 }}>
                {warmupSet ? (
                  <>
                    {/*
                     * The warm-up ramp, which the approved page does not draw.
                     * It keeps its own arithmetic (`lib/warmup.ts`): 50/70/85 %
                     * of the suggested load, tagged as warm-up so it stays out of
                     * every aggregate, progression and PR.
                     */}
                    <div
                      className="field"
                      style={{ textAlign: "center", width: "100%" }}
                    >
                      <div className="field-label" style={{ marginBottom: 2 }}>
                        {t("zen.warmup")}
                      </div>
                      <div
                        style={{
                          fontSize: 42,
                          fontWeight: 700,
                          letterSpacing: "-1.5px",
                          lineHeight: 1.1,
                        }}
                      >
                        {/* Three cases, not two: an empty bar is a real 0 %, a
                            bodyweight/cardio opener has no percentage at all. */}
                        {warmupSet.percent === 0
                          ? t("zen.emptyBar")
                          : warmupSet.percent === null
                            ? t("zen.mobilityLine")
                            : `${warmupSet.percent}%`}
                      </div>
                      <div className="stepper-unit" style={{ marginTop: 6 }}>
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
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={logCurrent}
                      className="btn btn-primary btn-xl tl-focusable"
                      style={{ marginTop: 14 }}
                    >
                      <MIcons.check />
                      {t("zen.doneWarmup")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="stepper-row">
                      {!isCardio && (
                        <div className="field">
                          <div className="field-label">
                            {tInterp("zen.weightUnit", { u: unitLabel })}
                          </div>
                          <div className="stepper">
                            <button
                              type="button"
                              onClick={() => bumpWeight(-weightStep)}
                              aria-label={t("zen.less")}
                              className="stepper-btn tl-focusable"
                            >
                              <MIcons.minus />
                            </button>
                            <input
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              inputMode="decimal"
                              aria-label={t("log.weight")}
                              data-testid="set-weight"
                              className="stepper-input"
                            />
                            <button
                              type="button"
                              onClick={() => bumpWeight(weightStep)}
                              aria-label={t("zen.more")}
                              className="stepper-btn tl-focusable"
                            >
                              <MIcons.plus />
                            </button>
                          </div>
                          <div className="stepper-unit">
                            {unitLabel} ·{" "}
                            {tInterp("zen.stepSign", { step: weightStep })}
                          </div>
                        </div>
                      )}

                      <div className="field">
                        <div className="field-label">{t("log.reps")}</div>
                        <div className="stepper">
                          <button
                            type="button"
                            onClick={() => bumpReps(-1)}
                            aria-label={t("zen.lessReps")}
                            className="stepper-btn tl-focusable"
                          >
                            <MIcons.minus />
                          </button>
                          <input
                            value={reps}
                            onChange={(e) => setReps(e.target.value)}
                            inputMode="numeric"
                            aria-label={t("log.reps")}
                            data-testid="set-reps"
                            className="stepper-input"
                          />
                          <button
                            type="button"
                            onClick={() => bumpReps(1)}
                            aria-label={t("zen.moreReps")}
                            className="stepper-btn tl-focusable"
                          >
                            <MIcons.plus />
                          </button>
                        </div>
                        {/*
                         * The line under Reps is the rep-range editor it has
                         * always been: it reads the target, and tapping it lets
                         * the owner change the range for this exercise for good.
                         */}
                        <div className="stepper-unit">
                          {editingReps ? (
                            <span
                              className="row"
                              style={{ gap: 4, justifyContent: "center" }}
                            >
                              <input
                                value={repDraftMin}
                                onChange={(e) => setRepDraftMin(e.target.value)}
                                inputMode="numeric"
                                aria-label={t("slot.repsMin")}
                                className="stepper-input"
                                style={{
                                  height: 26,
                                  fontSize: 15,
                                  width: 44,
                                  flex: "none",
                                }}
                              />
                              –
                              <input
                                value={repDraftMax}
                                onChange={(e) => setRepDraftMax(e.target.value)}
                                inputMode="numeric"
                                aria-label={t("slot.repsMax")}
                                className="stepper-input"
                                style={{
                                  height: 26,
                                  fontSize: 15,
                                  width: 44,
                                  flex: "none",
                                }}
                              />
                              <button
                                type="button"
                                onClick={saveRepRange}
                                className="tl-focusable"
                                style={{
                                  color: "var(--tl-accent)",
                                  fontWeight: 700,
                                }}
                              >
                                {t("common.save")}
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setRepDraftMin(String(repRange.min));
                                setRepDraftMax(String(repRange.max));
                                setEditingReps(true);
                              }}
                              title={t("slot.repsHint")}
                              className="tl-focusable"
                            >
                              {tInterp("zen.repTarget", {
                                min: repRange.min,
                                max: repRange.max,
                              })}
                              {repRange.custom
                                ? ` · ${t("slot.repsCustom")}`
                                : ""}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="field">
                        <div className="field-label">
                          {isCardio ? t("ex.cardio") : t("zen.fatigueField")}
                        </div>
                        {isCardio ? (
                          <div
                            className="stepper-input"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              height: 42,
                              fontSize: 26,
                            }}
                          >
                            {row.cardioMin}′
                          </div>
                        ) : (
                          <select
                            value={fatigue ?? ""}
                            onChange={(e) =>
                              setFatigue(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                              )
                            }
                            aria-label={t("zen.fatigueField")}
                            className="stepper-input"
                            style={{ fontSize: 20, textAlign: "left" }}
                          >
                            <option value="">—</option>
                            {([1, 2, 3, 4, 5] as const).map((v) => (
                              <option key={v} value={v}>
                                {v} · {FATIGUE_LABELS[v][lang]}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="stepper-unit">
                          {isCardio
                            ? tInterp("slot.of", { done, total: row.sets })
                            : t("zen.fatigueScale")}
                        </div>
                        {/*
                         * The owner's own badges: D near failure, F to failure.
                         * They are part of this set's data — they drive the next
                         * load proposal and the recovery maths — so they are set
                         * before *Registrar*, never as a note written afterwards.
                         */}
                        {!isCardio && (
                          <div
                            className="row"
                            style={{
                              gap: 4,
                              marginTop: 8,
                              justifyContent: "center",
                            }}
                          >
                            {EFFORT_MARKERS.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setMark(mark === m ? null : m)}
                                aria-pressed={mark === m}
                                title={`${EFFORT_MEANING[m].label[lang]} · ${EFFORT_MEANING[m].detail[lang]}`}
                                className={`btn btn-sm tl-focusable ${
                                  mark === m ? "btn-primary" : ""
                                }`}
                              >
                                <b>{m}</b>
                                {EFFORT_MEANING[m].label[lang]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/*
                     * What the load field just became and why — the proposal is
                     * never silent: a pre-filled number that moves on its own
                     * without saying so would be a magic trick, not a coach.
                     */}
                    {nextProposal && (
                      <p
                        className="tiny secondary"
                        style={{ marginTop: 12, lineHeight: 1.5 }}
                      >
                        <b style={{ color: "var(--tl-accent)" }}>
                          {t("zen.nextSet")}{" "}
                        </b>
                        {nextProposal.reason}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={logCurrent}
                      disabled={complete}
                      data-testid="log-set"
                      className="btn btn-primary btn-xl tl-focusable"
                      style={{ marginTop: 14, opacity: complete ? 0.4 : 1 }}
                    >
                      <MIcons.check />
                      {t("zen.logSet")}
                    </button>
                    {complete && (
                      <button
                        type="button"
                        onClick={goNext}
                        className="btn btn-xl tl-focusable"
                        style={{ marginTop: 8 }}
                      >
                        {nextRow
                          ? tInterp("zen.next", { name: nextRow.name[lang] })
                          : t("zen.finish")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* The set log lives below the set in your hands, and it is big
                enough to read. */}
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">
                  {t("zen.logToday")}
                  <span className="muted" style={{ fontWeight: 500 }}>
                    · {row.name[lang]}
                  </span>
                </h2>
                <div className="spacer" />
                <span className={`badge ${complete ? "badge-success" : ""}`}>
                  <MIcons.circleCheck />
                  {done} / {row.sets} {t("zen.summary.sets")}
                </span>
              </div>
              <div className="card-body" style={{ padding: "0 0 6px" }}>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 64 }}>{t("zen.col.set")}</th>
                        <th style={{ width: 130 }}>
                          {tInterp("zen.weightUnit", { u: unitLabel })}
                        </th>
                        <th style={{ width: 110 }}>{t("log.reps")}</th>
                        <th>{t("zen.col.mark")}</th>
                        <th style={{ width: 190 }}>{t("zen.col.previous")}</th>
                        <th style={{ width: 44 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: row.sets }, (_, i) => {
                        const logged = todaySets[i];
                        const before = previous[i];
                        const isCurrent = i === done && !complete;
                        const loggedMark = logged ? markerOf(logged) : null;
                        return (
                          <tr key={i} className={isCurrent ? "is-active" : ""}>
                            <td className="bold">{i + 1}</td>
                            <td>
                              {logged ? (
                                <span className="mono">
                                  {logged.weight !== null
                                    ? Math.round(
                                        fromKg(logged.weight, unit) * 10,
                                      ) / 10
                                    : "—"}
                                </span>
                              ) : isCurrent && !isCardio ? (
                                <div
                                  className="field"
                                  style={{ padding: "4px 8px" }}
                                >
                                  <input
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    inputMode="decimal"
                                    aria-label={tInterp("zen.rowWeight", {
                                      n: i + 1,
                                    })}
                                    className="stepper-input"
                                    style={{ fontSize: 19, height: 30 }}
                                  />
                                </div>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td>
                              {logged ? (
                                <span className="mono">
                                  {logged.reps ?? "—"}
                                </span>
                              ) : isCurrent ? (
                                <div
                                  className="field"
                                  style={{ padding: "4px 8px" }}
                                >
                                  <input
                                    value={reps}
                                    onChange={(e) => setReps(e.target.value)}
                                    inputMode="numeric"
                                    aria-label={tInterp("zen.rowReps", {
                                      n: i + 1,
                                    })}
                                    className="stepper-input"
                                    style={{ fontSize: 19, height: 30 }}
                                  />
                                </div>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td>
                              {loggedMark === "D" || loggedMark === "F" ? (
                                <span
                                  className={`badge ${
                                    loggedMark === "F"
                                      ? "badge-danger"
                                      : "badge-warning"
                                  }`}
                                  title={
                                    EFFORT_MEANING[loggedMark].detail[lang]
                                  }
                                >
                                  {loggedMark}
                                </span>
                              ) : logged ? (
                                <span
                                  className="row"
                                  style={{
                                    gap: 6,
                                    color: "var(--tl-success)",
                                  }}
                                >
                                  <MIcons.circleCheck
                                    style={{ width: 15, height: 15 }}
                                  />
                                  {t("zen.completed")}
                                </span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                            <td className="muted mono">
                              {before
                                ? `${before.reps ?? "—"} × ${
                                    before.weight !== null
                                      ? Math.round(
                                          fromKg(before.weight, unit) * 10,
                                        ) / 10
                                      : "—"
                                  }`
                                : "—"}
                            </td>
                            <td>
                              {isCurrent && before && (
                                <button
                                  type="button"
                                  onClick={() => copyPrevious(before)}
                                  title={t("zen.repeatPrev")}
                                  aria-label={t("zen.repeatPrev")}
                                  className="icon-btn tl-focusable"
                                >
                                  <MIcons.rotate />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/*
             * Después de esta serie — the session's sequence, and the user's to
             * change. The order is real (persisted in settings, applied by the
             * store after everything else) and can be edited two ways on purpose:
             * dragging the grip with the mouse — what the mockup draws — and the
             * two arrows, which are what a keyboard and a precise hand use.
             */}
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">
                  <MIcons.layers />
                  {t("zen.after")}
                </h2>
                <div className="spacer" />
                {orderCustom && (
                  <button
                    type="button"
                    onClick={onResetOrder}
                    title={t("zen.orderRestoreHint")}
                    className="card-link tl-focusable"
                  >
                    {t("zen.orderRestore")}
                  </button>
                )}
                <span className="tiny muted">{t("zen.orderHint")}</span>
              </div>
              <div className="card-body" style={{ paddingTop: 0 }}>
                <div className="upnext">
                  {rows.map((r, i) => {
                    const setsDone = Math.min(
                      loggedToday(r.exerciseId).length,
                      r.sets,
                    );
                    const isDone = setsDone >= r.sets;
                    const isNow = i === rowIdx;
                    return (
                      <div
                        key={`${r.exerciseId}-${i}`}
                        className={`upnext-item ${isNow ? "is-now" : ""}`}
                        style={
                          dragFrom === i
                            ? { opacity: 0.5, borderStyle: "dashed" }
                            : undefined
                        }
                        onDragOver={(e) => {
                          if (dragFromRef.current === null) return;
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          const from = dragFromRef.current;
                          endDrag();
                          e.preventDefault();
                          if (from !== null && from !== i) onMoveRow(from, i);
                        }}
                      >
                        <span
                          className="upnext-move"
                          draggable
                          onDragStart={(e) => {
                            beginDrag(i);
                            e.dataTransfer.effectAllowed = "move";
                            // Firefox refuses to start a drag without a payload.
                            e.dataTransfer.setData("text/plain", r.exerciseId);
                          }}
                          onDragEnd={endDrag}
                          title={t("zen.dragHint")}
                          aria-hidden
                        >
                          <MIcons.grip />
                        </span>
                        <span className="idx" aria-hidden>
                          {isDone ? "✓" : i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentId(r.exerciseId)}
                          disabled={isNow}
                          title={isNow ? undefined : t("zen.jumpHint")}
                          className="tl-focusable"
                          style={{ textAlign: "left", minWidth: 0 }}
                        >
                          {/* The two marks live on the row they belong to, so the
                              sequence always shows what today still owes him and
                              what he has taken out of the way. */}
                          <span
                            className="row"
                            style={{ gap: 6, alignItems: "center" }}
                          >
                            <b>{r.name[lang]}</b>
                            {skipped.has(r.exerciseId) && (
                              <span className="badge badge-warning">
                                {t("zen.skipped")}
                              </span>
                            )}
                            {postponed.has(r.exerciseId) &&
                              !skipped.has(r.exerciseId) && (
                                <span className="badge badge-info">
                                  {t("zen.postponed")}
                                </span>
                              )}
                          </span>
                          <small>
                            {r.families
                              .slice(0, 2)
                              .map(familyLabel)
                              .join(" · ")}
                            {" · "}
                            {r.cardioMin !== undefined
                              ? `${r.cardioMin}′`
                              : `${r.sets} × ${r.repsMin}–${r.repsMax}`}
                            {isNow ? ` · ${t("zen.current")}` : ""}
                          </small>
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveRow(i, i - 1)}
                          disabled={i === 0}
                          aria-label={t("zen.moveUp")}
                          title={t("zen.moveUp")}
                          className="icon-btn tl-focusable"
                        >
                          <MIcons.chevronUp />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveRow(i, i + 1)}
                          disabled={i === rows.length - 1}
                          aria-label={t("zen.moveDown")}
                          title={t("zen.moveDown")}
                          className="icon-btn tl-focusable"
                        >
                          <MIcons.chevronDown />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/*
                 * The one place the day's two marks are listed together, with the
                 * undo next to each name. It is not a log: it appears only while
                 * something is set aside, and the moment the last one is taken
                 * back the row disappears — which is what an undo affordance for a
                 * reversible decision should do.
                 */}
                {(skippedToday.length > 0 || postponedToday.length > 0) && (
                  <div
                    className="row"
                    style={{
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "1px solid var(--tl-border)",
                    }}
                  >
                    <span className="tiny muted">{t("zen.asideNote")}</span>
                    {asideEntries.map(({ id, name, skipped: wasSkipped }) => (
                      <button
                        key={id}
                        type="button"
                        className="btn btn-sm tl-focusable"
                        title={tInterp(
                          wasSkipped
                            ? "zen.asideUndoSkip"
                            : "zen.asideUndoPostpone",
                          { name },
                        )}
                        onClick={() =>
                          wasSkipped ? onUnskip(id) : onUnpostpone(id)
                        }
                      >
                        <MIcons.chevronLeft />
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                <p
                  className="tiny muted"
                  style={{ margin: "10px 0 0", textAlign: "center" }}
                >
                  {tInterp("zen.progress", {
                    done: doneWorkSets,
                    total: totalWorkSets,
                  })}{" "}
                  · {t("zen.sessionRunning")}
                </p>
              </div>
            </section>
          </div>

          {/* ══ RIGHT: only recommendations and guidance ════════════════════ */}
          <div className="stack">
            {/* Progresión recomendada — the number, and why it is that number. */}
            <section className="card card-pad">
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                {t("zen.progression")}
              </h2>
              <div className="row" style={{ gap: 10 }}>
                <MIcons.bars
                  style={{
                    color: "var(--tl-accent)",
                    width: 20,
                    height: 20,
                  }}
                />
                <div>
                  <div className="tiny muted">{t("zen.suggestedNext")}</div>
                  <div className="bold" style={{ fontSize: 17 }}>
                    {suggestedKg !== null
                      ? `${Math.round(fromKg(suggestedKg, unit) * 10) / 10} ${unitLabel}`
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="note-box" style={{ marginTop: 12 }}>
                {suggestion?.reason ?? t("zen.step1b")}
              </div>
              <div className="divider" style={{ margin: "12px 0" }} />
              <div
                className="row"
                style={{ gap: 8, color: "var(--tl-text-muted)" }}
              >
                <MIcons.trendingUp style={{ width: 16, height: 16 }} />
                <span className="tiny">
                  {suggestion?.stepKg != null
                    ? tInterp("zen.stepSign", { step: weightStep })
                    : t("zen.step1b")}
                </span>
              </div>

              {/*
               * The OTHER half of the progression (2026-10-13): the number above
               * is what today's next set uses, decided by the mark the last set
               * carried; this is what the multi-day log says to do the next time
               * he starts the exercise — including the harder/easier variant when
               * the load itself cannot move.
               */}
              {advice && (
                <>
                  <div className="divider" style={{ margin: "12px 0" }} />
                  <div className="row-wrap" style={{ gap: 8 }}>
                    <span className="tiny muted">
                      {t("progress.betweenSessions")}
                    </span>
                    <span className={`badge ${VERDICT_BADGE[advice.verdict]}`}>
                      <MIcons.trendingUp style={{ width: 12, height: 12 }} />
                      {t(VERDICT_KEY[advice.verdict])}
                    </span>
                  </div>
                  <p className="tiny secondary" style={{ margin: "6px 0 0" }}>
                    {progressionSentence(advice, unit)}
                    {progressionLever(advice) !== null
                      ? ` ${progressionLever(advice)}`
                      : ""}
                  </p>
                  {/*
                   * Where the numbers come from — the only thing the verdict needs
                   * to be checkable by the owner. Only when there IS a where: a
                   * `first_time` verdict has no session to point at, and its own
                   * sentence already says so — printing the same line twice was a
                   * real defect of the first port (2026-10-14).
                   */}
                  {advice.evidence.day !== null && (
                    <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                      {tInterp("progress.basis", { day: advice.evidence.day })}
                    </p>
                  )}
                </>
              )}
            </section>

            {/* Cues de técnica — how to do the movement, from the shared
                library, plus the tempo and the mistake worth watching. */}
            <section className="card card-pad">
              <h2 className="card-title" style={{ marginBottom: 6 }}>
                {t("zen.cues")}
              </h2>
              {technique ? (
                <>
                  {technique.execution.slice(0, 3).map((c, i) => (
                    <div className="cue" key={i}>
                      <span className="cue-num">{i + 1}</span>
                      <p>{cue(c, lang)}</p>
                    </div>
                  ))}
                </>
              ) : (
                <p className="tiny muted" style={{ margin: 0 }}>
                  {t("ex.noCues")}
                </p>
              )}
              <div className="divider" style={{ margin: "10px 0" }} />
              <p className="tiny muted" style={{ margin: 0 }}>
                {technique
                  ? tInterp("zen.tempo", {
                      tempo: technique.tempo,
                      rir: technique.effort.rir,
                    })
                  : t("ex.noCues")}
              </p>
              <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                {t("tech.mistakes")}:{" "}
                {technique ? cue(technique.mistakes[0], lang) : t("ex.noCues")}
              </p>
            </section>

            {/* Descanso — the mockup's ring, on the store's own deadline, so it
                is the same rest the floating overlay shows elsewhere. */}
            <section className="card card-pad">
              <div className="row" style={{ marginBottom: 14 }}>
                <h2 className="card-title">{t("timer.rest")}</h2>
                <div className="spacer" />
                {rest && (
                  <button
                    type="button"
                    onClick={onSkipRest}
                    title={t("timer.skip")}
                    aria-label={t("timer.skip")}
                    className="icon-btn tl-focusable"
                  >
                    <MIcons.x />
                  </button>
                )}
              </div>
              {rest ? (
                <RestTimer
                  rest={rest}
                  variant="inline"
                  nextExercise={
                    rows.find((r) => r.exerciseId === rest.key)?.name[lang] ??
                    null
                  }
                  onExtend={onExtendRest}
                  onTogglePause={onToggleRestPause}
                  onSkip={onSkipRest}
                />
              ) : (
                <p className="tiny muted" style={{ margin: 0 }}>
                  {t("zen.restNone")}
                </p>
              )}
            </section>

            {/* Resumen del ejercicio */}
            <section className="card card-pad">
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                {t("zen.summary")}
              </h2>
              <div className="summary-grid">
                <div className="summary-cell">
                  <MIcons.bars />
                  <b>{row.sets}</b>
                  <span>{t("zen.summary.sets")}</span>
                </div>
                <div className="summary-cell">
                  <MIcons.repeat />
                  <b>
                    {isCardio
                      ? `${row.cardioMin}′`
                      : `${repRange.min}–${repRange.max}`}
                  </b>
                  <span>{t("zen.summary.reps")}</span>
                </div>
                <div className="summary-cell">
                  <MIcons.clock />
                  <b>{row.restSec} s</b>
                  <span>{t("zen.summary.rest")}</span>
                </div>
                <div className="summary-cell">
                  <MIcons.users />
                  <b style={{ fontSize: 12 }}>
                    {row.families.slice(0, 2).map(familyLabel).join(" · ")}
                  </b>
                  <span>{t("zen.summary.muscles")}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* The only way out that does not go through the rail: ending the day. */}
        <button
          type="button"
          onClick={onFinish}
          className="btn btn-lg tl-focusable"
          style={{ alignSelf: "center" }}
        >
          <MIcons.check />
          {t("zen.finish")}
        </button>
      </div>

      {demoOpen && (
        <ExerciseDemoModal
          exerciseId={row.exerciseId}
          pattern={row.pattern as MovementPattern}
          name={row.name[lang]}
          onClose={() => setDemoOpen(false)}
        />
      )}

      {/*
       * *Cambiar* (mockup 03's top bar): the same-pattern, gear-legal swaps the
       * planner can offer. A drawer rather than a dropdown because the names are
       * long and this is the one place the decision is made.
       */}
      {swapping && (
        <>
          <div className="overlay" onClick={() => setSwapping(false)} />
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t("session.swapTitle")}
          >
            <div className="drawer-head">
              <h2 className="card-title">
                <MIcons.repeat />
                {t("session.swapTitle")}
              </h2>
              <div className="spacer" />
              <button
                type="button"
                onClick={() => setSwapping(false)}
                aria-label={t("tech.close")}
                className="icon-btn tl-focusable"
              >
                <MIcons.x />
              </button>
            </div>
            <div className="drawer-body">
              <p className="tiny muted" style={{ margin: 0 }}>
                {t("zen.swapHint")}
              </p>
              {swaps.length === 0 ? (
                <p className="tiny muted" style={{ margin: 0 }}>
                  {t("session.noSwap")}
                </p>
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  {swaps.map((option) => (
                    <button
                      key={option.exercise.id}
                      type="button"
                      onClick={() => {
                        onSwap(row.exerciseId, option.exercise.id);
                        setSwapping(false);
                      }}
                      className="card card-pad tl-focusable"
                      style={{ textAlign: "left" }}
                    >
                      <span className="row" style={{ gap: 10 }}>
                        <b>{option.exercise.name[lang]}</b>
                        <span className="spacer" />
                        <span className="badge">{option.traits.loadType}</span>
                      </span>
                      <span className="tiny muted">
                        {option.traits.pattern} · hypertrophy{" "}
                        {option.exercise.hypertrophy}/5
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Small pieces
   ══════════════════════════════════════════════════════════════════════════ */

/** A cue in the app language, falling back to English — never an empty string. */
function cue(
  value: { en: string; es: string } | undefined,
  lang: "en" | "es",
): string {
  if (!value) return t("ex.noCues");
  return value[lang] ?? value.en;
}

/** ±step for the ± buttons: 2.5 kg (≈5.5 lb) or the lb display of it. */
function stepOf(unit: WeightUnit): number {
  return unit === "kg" ? 2.5 : 5.5;
}

export type { TLSet };
