/**
 * Daily planning bridge — catalog + inventory + log → today's session.
 *
 * TrainingLab no longer NEEDS a BodyLab import to be useful: the shared
 * catalog ships inside the app (`@fitness/bodylab-exercises`), the inventory
 * gates what is possible, and the deterministic session builder answers "what
 * fits in my next 90 minutes". A BodyLab export only ADDS personalisation
 * (anthropometric weakness, conditioning score, PRs).
 *
 * @module lib/plan
 */

import {
  ALL_EXERCISES,
  getTraits,
  ownedCapabilities,
  satisfies,
  maxLoadFor,
  incrementFor,
  type Exercise,
  type MuscleGroup,
  type OwnedEquipment,
  type ProgressionAxis,
} from "@fitness/bodylab-exercises";
import {
  buildSession,
  buildWeek,
  muscleFamilyOf,
  scoreExercise,
  type BuiltSession,
  type BuiltWeek,
  type DecisionFeatures,
  type DecisionModel,
  type ExperienceLevel,
  type FamilyWeakness,
  type MuscleFamily,
  type Readiness,
  type SessionAdvisory,
  type SessionCatalogEntry,
  type SessionGoal,
  type SessionReason,
  type WeekDaySpec,
} from "@fitness/bodylab-training";
import { fuseWeakness, type ImportPayload } from "./adapter";
import { deriveFatigue, type FatigueReport } from "./recovery";
import {
  progressionFor,
  summariseExerciseDays,
  type ProgressionAdvice,
} from "./progression";
import { t, tInterp } from "./i18n";
import type { TLSet } from "./types";

// ── Catalog: one row per exercise the planner can use ───────────────────────

export interface PlannerExercise {
  exercise: Exercise;
  traits: ReturnType<typeof getTraits>;
  /** Muscles that count as directly worked (intensity >= 2), all if none are. */
  directMuscles: MuscleGroup[];
  families: MuscleFamily[];
  primary: MuscleFamily;
}

let plannerCache: PlannerExercise[] | null = null;

/** The whole catalog prepared once (94 entries; cheap, but stable). */
export function plannerCatalog(): PlannerExercise[] {
  if (plannerCache) return plannerCache;
  plannerCache = ALL_EXERCISES.map((exercise) => {
    const traits = getTraits(exercise.id);
    const direct = exercise.muscles.filter((m) => m.intensity >= 2);
    const directMuscles = (direct.length > 0 ? direct : exercise.muscles).map(
      (m) => m.muscle as MuscleGroup,
    );
    const families: MuscleFamily[] = [];
    for (const m of directMuscles) {
      const fam = muscleFamilyOf(m);
      if (!families.includes(fam)) families.push(fam);
    }
    return { exercise, traits, directMuscles, families, primary: families[0]! };
  });
  return plannerCache;
}

/** Name lookup that never returns undefined (display only). */
export function exerciseName(id: string, lang: "en" | "es" = "es"): string {
  const found = ALL_EXERCISES.find((e) => e.id === id);
  return found ? found.name[lang] : id;
}

/** Can the user perform it with the declared inventory? */
export function isUsable(entry: PlannerExercise, owned: Set<string>): boolean {
  return satisfies(entry.traits.requires, owned as never);
}

// ── Log → rolling weekly volume and freshness ───────────────────────────────

export interface FamilyLogStats {
  weeklyVolume: Partial<Record<MuscleFamily, number>>;
  /** Days since the family was last trained (null = never). */
  daysSince: Partial<Record<MuscleFamily, number>>;
  /** How many times each exercise was performed (all time). */
  timesPerformed: Record<string, number>;
  /** Days since each exercise was performed (its most recent set). */
  lastDays: Record<string, number>;
}

export function familyLogStats(
  sets: TLSet[],
  now: Date = new Date(),
): FamilyLogStats {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const stats: FamilyLogStats = {
    weeklyVolume: {},
    daysSince: {},
    timesPerformed: {},
    lastDays: {},
  };
  const catalog = plannerCatalog();
  const byId = new Map(catalog.map((c) => [c.exercise.id, c]));

  for (const set of sets) {
    const entry = byId.get(set.exerciseId);
    if (!entry) continue;
    stats.timesPerformed[set.exerciseId] =
      (stats.timesPerformed[set.exerciseId] ?? 0) + 1;
    const t = new Date(set.timestamp).getTime();
    if (Number.isNaN(t)) continue;
    const days = Math.max(0, (now.getTime() - t) / (24 * 60 * 60 * 1000));
    const prevLast = stats.lastDays[set.exerciseId];
    if (prevLast === undefined || days < prevLast)
      stats.lastDays[set.exerciseId] = days;
    if (t >= weekAgo) {
      const fam = entry.primary;
      stats.weeklyVolume[fam] = (stats.weeklyVolume[fam] ?? 0) + 1;
    }
    for (const fam of entry.families) {
      const prev = stats.daysSince[fam];
      if (prev === undefined || days < prev) stats.daysSince[fam] = days;
    }
  }
  return stats;
}

// ── Decision features per candidate ─────────────────────────────────────────

export interface DecisionContext {
  weakness: FamilyWeakness;
  logStats: FamilyLogStats;
  readiness: Readiness;
  level: ExperienceLevel;
  /** Patterns already in the session (variety feature) — empty before building. */
  usedPatterns?: Set<string>;
  conditioningScore?: number | null;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Math.abs(v)));
}

/** The 0..1 context vector the JEV-class model scores (documented in core). */
export function featuresFor(
  entry: PlannerExercise,
  ctx: DecisionContext,
): DecisionFeatures {
  const strength = ctx.weakness[entry.primary] ?? 50;
  const done = ctx.logStats.weeklyVolume[entry.primary] ?? 0;
  // Weekly target vs the published dose–response band (12–20 direct sets;
  // Baz-Valle 2022 — see `lib/volume-target.ts`): beginners aim just above
  // Schoenfeld's >9 floor, intermediate sits on the band minimum, advanced
  // works the middle of the band. (Was 8/12/15 — the beginner value sat
  // below every published floor.)
  const target =
    ctx.level === "beginner" ? 10 : ctx.level === "advanced" ? 15 : 12;
  const days = ctx.logStats.daysSince[entry.primary];
  const performed = ctx.logStats.timesPerformed[entry.exercise.id] ?? 0;
  const total = Object.values(ctx.logStats.timesPerformed).reduce(
    (a, b) => a + b,
    0,
  );
  const last = ctx.logStats.lastDays[entry.exercise.id];
  /* Consistency — "did you do THIS exercise in last week's slot?" (owner,
     2026-10-08): repeating the week is how progressive overload becomes
     measurable; a plan that invents fresh exercises weekly can never be
     judged. Performed ~5–9 days ago = same slot last week → full credit;
     adjacent windows get half; done in the last 2 days gets little (the
     muscle may still be recovering — `freshness` handles that side). */
  const consistency =
    last === undefined
      ? 0
      : last < 3
        ? 0.2
        : last <= 9
          ? last >= 5
            ? 1
            : 0.5
          : last <= 14
            ? 0.5
            : 0;

  return {
    weaknessGap: clamp01((100 - strength) / 100),
    weeklyGap: done >= target ? 0 : clamp01((target - done) / target),
    freshness: days === undefined ? 1 : clamp01(Math.min(days, 21) / 21),
    consistency,
    // Already-sore areas and joint-heavy movements score lower on a bad day.
    readinessFit:
      ctx.readiness.soreness <= 2
        ? clamp01(1 - (entry.traits.jointStress - 1) / 2) *
          (entry.traits.spineLoad >= 3 ? 0.6 : 1)
        : clamp01(
            0.6 +
              0.4 * ((ctx.readiness.energy + ctx.readiness.motivation) / 10),
          ),
    variety: ctx.usedPatterns?.has(entry.traits.pattern) ? 0.2 : 1,
    preference: total === 0 ? 0.5 : clamp01(performed / Math.max(1, total / 8)),
    cheapness: clamp01(1 - entry.traits.setupMin / 4),
  };
}

/** Model score (0..1) per exercise id, ready for `buildSession`. */
export function modelScoresFor(
  model: DecisionModel,
  catalog: PlannerExercise[],
  ctx: DecisionContext,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of catalog) {
    out[entry.exercise.id] = scoreExercise(
      model,
      featuresFor(entry, ctx),
      entry.exercise.id,
    );
  }
  return out;
}

// ── Today's plan ────────────────────────────────────────────────────────────

export interface TodayPlanInput {
  inventory: OwnedEquipment[];
  readiness: Readiness;
  timeBudgetMin: number;
  level: ExperienceLevel;
  goal: SessionGoal;
  logStats: FamilyLogStats;
  model: DecisionModel;
  /** Optional BodyLab personalisation. */
  payload?: ImportPayload | null;
  /** Families still sore from a previous session (today's self-report). */
  fatiguedFamilies?: MuscleFamily[];
  /**
   * The raw log (today's own sets already excluded by the caller). Feeds the
   * declared recovery window in `lib/recovery.ts`: a family trained yesterday
   * is not programmable today even when the user did not tick a sore box.
   * Optional — callers that omit it simply get no derived window.
   */
  sets?: TLSet[];
  /** Clock for the recovery window. Injectable so tests stay deterministic. */
  now?: Date;
  /**
   * The user asking for a focused day ("hoy, core"). When set, today looks
   * only at movements whose primary family is in this list. Undefined or empty
   * keeps the automatic behaviour untouched — the session is still subject to
   * gear, fatigue and the weekly volume ceilings.
   */
  focusFamilies?: MuscleFamily[];
}

export interface TodayPlan {
  session: BuiltSession;
  /** Display rows for the chosen slots. */
  rows: PlannedRow[];
  /** Structured notes for today (readiness, gear, volume ceilings…). */
  advisories: PlanAdvisory[];
  /** Everything usable with this inventory (for the swap picker). */
  usable: PlannerExercise[];
  /** Honest summary of what was excluded by gear. */
  gearNote: { excluded: number; usable: number };
  weakness: FamilyWeakness;
  /**
   * The recovery window derived from the log (null when no sets were given).
   * It is what the app and the local coach read to say "these families are
   * still recovering", instead of trusting a small model to remember.
   */
  fatigue: FatigueReport | null;
}

/** Why a slot is in the plan: a core reason, or an app-side one. */
export type PlanReason =
  SessionReason | { code: "swapped" } | { code: "coach"; note?: string };

export interface PlannedRow {
  exerciseId: string;
  name: { en: string; es: string };
  pattern: string;
  families: MuscleFamily[];
  progression: ProgressionAxis[];
  loadType: string;
  unilateral: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  restSec: number;
  minutes: number;
  cardioMin?: number;
  /** Structured: the app renders the copy, in the user's language. */
  reasons: PlanReason[];
  /** Movement joints get stressed by (for the injury cue). */
  jointStress: number;
  spineLoad: number;
}

/** Advisories reach the UI untouched (the app formats them). */
export type PlanAdvisory = SessionAdvisory;

/**
 * Build today's session: gear-gated catalog + readiness + rolling weekly
 * volume + the learned decision model. Deterministic and never throws.
 */
export function buildTodayPlan(input: TodayPlanInput): TodayPlan {
  const owned = ownedCapabilities(input.inventory) as unknown as Set<string>;
  const all = plannerCatalog();
  const usable = all.filter((entry) => isUsable(entry, owned));

  const weakness = input.payload
    ? fuseWeakness(
        input.payload.muscleScores ?? [],
        input.payload.muscleLoad ?? [],
        {
          hasTrainingData:
            (input.payload.trainingLog?.length ?? 0) > 0 ||
            (input.payload.muscleLoad ?? []).some((l) => l.totalSets > 0),
        },
      )
    : {};

  const conditioningScore =
    input.payload?.conditioning?.conditioningScore ?? null;

  const ctx: DecisionContext = {
    weakness,
    logStats: input.logStats,
    readiness: input.readiness,
    level: input.level,
    conditioningScore,
  };

  const modelScores = modelScoresFor(input.model, usable, ctx);

  /*
   * The recovery window is derived, never assumed: the log decides which
   * families were trained too recently (see `lib/recovery.ts`). It is ADDED to
   * the user's own sore list — and it governs the automatic plan only: when he
   * explicitly picks a focus ("hoy toca abdomen") his stated intent beats our
   * window, because his content is never silently rewritten.
   */
  const fatigue = input.sets
    ? deriveFatigue(input.sets, input.readiness, input.now)
    : null;
  const explicitFocus = (input.focusFamilies?.length ?? 0) > 0;
  const fatiguedFamilies = [...(input.fatiguedFamilies ?? [])];
  if (fatigue && !explicitFocus) {
    for (const fam of fatigue.fatigued) {
      if (!fatiguedFamilies.includes(fam)) fatiguedFamilies.push(fam);
    }
  }

  const catalog: SessionCatalogEntry[] = usable.map((entry) => ({
    id: entry.exercise.id,
    muscles: entry.directMuscles,
    pattern: entry.traits.pattern,
    loadType: entry.traits.loadType,
    unilateral: entry.traits.unilateral,
    jointStress: entry.traits.jointStress,
    spineLoad: entry.traits.spineLoad,
    hypertrophy: entry.exercise.hypertrophy,
    difficulty: entry.exercise.difficulty,
    setupMin: entry.traits.setupMin,
    cardio: entry.traits.cardio,
  }));

  const session = buildSession({
    catalog,
    weakness,
    weeklyVolume: input.logStats.weeklyVolume,
    timeBudgetMin: input.timeBudgetMin,
    readiness: input.readiness,
    level: input.level,
    goal: input.goal,
    fatiguedFamilies,
    focusFamilies: input.focusFamilies,
    conditioningScore,
    modelScores,
    seed: 7,
  });

  const byId = new Map(usable.map((entry) => [entry.exercise.id, entry]));
  const rows: PlannedRow[] = session.slots.map((slot) => {
    const entry = byId.get(slot.exerciseId);
    return {
      exerciseId: slot.exerciseId,
      name: entry
        ? entry.exercise.name
        : { en: slot.exerciseId, es: slot.exerciseId },
      pattern: slot.pattern,
      families: slot.families,
      progression: entry ? entry.traits.progression : ["reps"],
      loadType: entry ? entry.traits.loadType : "bodyweight",
      unilateral: entry ? entry.traits.unilateral : false,
      sets: slot.sets,
      repsMin: slot.repsMin,
      repsMax: slot.repsMax,
      rir: slot.rir,
      restSec: slot.restSec,
      minutes: slot.minutes,
      cardioMin: slot.cardioMin,
      reasons: slot.reasons,
      jointStress: entry ? entry.traits.jointStress : 1,
      spineLoad: entry ? entry.traits.spineLoad : 1,
    };
  });

  /*
   * A focused day asked for one family on purpose, so "no push exercise is
   * possible with your equipment" is not information — it is noise that reads
   * as a defect. `gearNote` still reports what the inventory excluded, and the
   * volume ceilings still speak. Nothing else changes.
   */
  const focused = (input.focusFamilies?.length ?? 0) > 0;
  const advisories = focused
    ? session.advisories.filter(
        (a) => a.code !== "group_no_equipment" && a.code !== "group_no_time",
      )
    : session.advisories;

  return {
    session,
    rows,
    advisories,
    usable,
    gearNote: { excluded: all.length - usable.length, usable: usable.length },
    weakness,
    fatigue,
  };
}

/** Same-pattern, gear-legal swaps for the "change exercise" action. */
export function swapOptions(
  plan: TodayPlan,
  exerciseId: string,
): PlannerExercise[] {
  const current = plan.rows.find((r) => r.exerciseId === exerciseId);
  if (!current) return [];
  const inSession = new Set(plan.rows.map((r) => r.exerciseId));
  return plan.usable
    .filter(
      (entry) =>
        entry.traits.pattern === current.pattern &&
        !inSession.has(entry.exercise.id) &&
        // Interchangeable only when the loading style matches (you cannot swap
        // a band press for a machine press and keep the same prescription).
        entry.traits.loadType ===
          plan.usable.find((u) => u.exercise.id === exerciseId)?.traits
            .loadType,
    )
    .sort((a, b) => b.exercise.hypertrophy - a.exercise.hypertrophy);
}

// ── Load suggestion: grounded in the log, PRs and the gear you own ──────────

export interface LoadSuggestion {
  /** Suggested working weight, kg (null = bodyweight/time work). */
  weight: number | null;
  /** Why — shown next to the number. */
  reason: string;
  /** How much the number can move given the inventory (kg). */
  stepKg: number | null;
  /** Inventory ceiling for this load type, when known. */
  capKg: number | null;
}

export interface LoadSuggestionInput {
  loadType: string;
  repsMin: number;
  repsMax: number;
  /** Past sets for this exercise, chronological. */
  history: { weight: number | null; reps: number | null }[];
  /** BodyLab personal record (Epley e1RM) when exported. */
  pr?: { bestWeight: number | null; bestEst1RM: number | null } | null;
  inventory: OwnedEquipment[];
  readiness: Readiness;
}

/**
 * Deterministic, explainable load suggestion:
 *   1. no history and no PR  → no weight (bodyweight or "start light")
 *   2. a PR with no history  → 70 % of the e1RM projected to the target reps
 *   3. hit the top of range  → +1 increment
 *   4. missed the bottom     → −1 increment (honest reset)
 *   5. a bad day             → −5 %, rounded to the inventory increment
 * Always clamped to the heaviest weight the user actually owns.
 */
export function suggestLoadFor(input: LoadSuggestionInput): LoadSuggestion {
  const stepKg = incrementFor(input.loadType, input.inventory);
  const capKg = maxLoadFor(input.loadType, input.inventory);
  if (
    input.loadType === "bodyweight" ||
    input.loadType === "band" ||
    input.loadType === "time"
  ) {
    return {
      weight: null,
      reason: t("load.noLoad"),
      stepKg: null,
      capKg: null,
    };
  }
  const step = stepKg ?? 2.5;

  const weighted = input.history.filter(
    (h) => typeof h.weight === "number" && h.weight > 0,
  );
  const last = weighted[weighted.length - 1];
  const round = (w: number) => Math.max(step, Math.round(w / step) * step);

  let weight: number | null = null;
  let reason = "";

  if (!last && input.pr?.bestEst1RM) {
    // Epley inverse: from e1RM to a load for the middle of the rep range.
    const targetReps = Math.round((input.repsMin + input.repsMax) / 2);
    const projected = input.pr.bestEst1RM / (1 + targetReps / 30);
    weight = round(projected * 0.9);
    reason = tInterp("load.pr", {
      w: Math.round(projected * 0.9 * 10) / 10,
      reps: targetReps,
    });
  } else if (last) {
    const lastWeight = last.weight as number;
    const reps = last.reps ?? 0;
    weight = lastWeight;
    reason = tInterp("load.repeat", { w: lastWeight, reps });
    if (reps >= input.repsMax) {
      weight = lastWeight + step;
      reason = tInterp("load.topRange", { step });
    } else if (reps < input.repsMin) {
      weight = Math.max(step, lastWeight - step);
      reason = tInterp("load.below", { step });
    }
  } else {
    return { weight: null, reason: t("load.first"), stepKg, capKg };
  }

  if (weight !== null && input.readiness.soreness <= 2) {
    const eased = round(weight * 0.95);
    if (eased < weight) {
      weight = eased;
      reason += ` · ${t("load.sore")}`;
    }
  }
  if (weight !== null && capKg !== null && weight > capKg) {
    weight = capKg;
    reason += ` · ${tInterp("load.capped", { cap: capKg })}`;
  }
  return {
    weight: weight === null ? null : Math.round(weight * 100) / 100,
    reason,
    stepKg,
    capKg,
  };
}

// ── Cross-session progression: the verdict about the NEXT session ──────────

/**
 * Everything the cross-session verdict needs, in app vocabulary.
 *
 * The verdict itself is pure and lives in `lib/progression.ts`; this is the
 * adapter that reads the catalog-backed pieces (the gear's increment and
 * ceiling) and the log, so the session screen, the Inicio card and the local
 * coach all ask the same question and get the same answer.
 */
export interface ProgressionAdviceInput {
  exerciseId: string;
  /** How the movement is loaded (`row.loadType`). */
  loadType: string;
  /** Levers the movement has (`row.progression`, from the shared traits). */
  progressionAxes: ProgressionAxis[];
  /** The range the prescription asks for (with the user's override applied). */
  targetReps: { min: number; max: number } | null;
  /** The whole log; this function picks the exercise's own sets out of it. */
  sets: readonly TLSet[];
  inventory: OwnedEquipment[];
  /**
   * A local day key (`YYYY-MM-DD`) to leave out of the verdict.
   *
   * The session screen passes **today**, on purpose. Inside one day the load is
   * decided by the D/F mark the owner just typed (`lib/set-proposal.ts`, tested
   * there); this verdict answers a different question — what to do the next
   * time he **starts** the exercise — and it must not be rewritten set by set
   * while he is mid-movement, or the same screen would carry two different
   * answers about the same bar.
   */
  excludeDay?: string | null;
}

/**
 * The multi-day verdict for one exercise, grounded in the user's own gear.
 *
 * `null`-safe and never throws: an exercise with no history comes back as
 * `first_time`, which is a real answer ("start light"), not an absence.
 */
export function progressionAdviceFor(
  input: ProgressionAdviceInput,
): ProgressionAdvice {
  const own = input.sets.filter((s) => s.exerciseId === input.exerciseId);
  const days = summariseExerciseDays(own).filter(
    (d) => !input.excludeDay || d.day !== input.excludeDay,
  );
  return progressionFor({
    days,
    targetReps: input.targetReps,
    loadType: input.loadType,
    progressionAxes: input.progressionAxes,
    incrementKg: incrementFor(input.loadType, input.inventory),
    maxLoadKg: maxLoadFor(input.loadType, input.inventory),
  });
}

// ── The week: horizontalisation of today's engine ──────────────────────────

/** Weekday labels in the app language; Monday-first (index 0 = Monday). */
const WEEKDAY_LABELS: Record<"en" | "es", string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  es: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
};

export interface WeekPlanInput {
  inventory: OwnedEquipment[];
  readiness: Readiness;
  /** Budget that applies to every training day. */
  timeBudgetMin: number;
  level: ExperienceLevel;
  goal: SessionGoal;
  logStats: FamilyLogStats;
  payload: ImportPayload | null | undefined;
  /** 0-4: how many days a week the user actually trains. */
  daysPerWeek: number;
  /** Monday-first index of "today" (0 = Mon … 6 = Sun). */
  todayIndex: number;
  lang: "en" | "es";
}

export interface WeekPlan {
  week: BuiltWeek;
  /** Flat view for the UI: one row per day. */
  rows: {
    label: string;
    isRest: boolean;
    isToday: boolean;
    assigned: MuscleFamily[];
    sets: number;
    minutes: number;
    /** First exercise names per assigned family (preview, display only). */
    preview: string[];
    /** True when the user authored this day (`settings.weekOverrides`). */
    isCustom?: boolean;
  }[];
  totalSets: number;
  totalMinutes: number;
  uncovered: BuiltWeek["uncovered"];
}

/**
 * Build this week with the same personalisation as today (weakness from
 * BodyLab, gear inventory). The daily readiness applies to all days — the
 * week is a plan, today's self-report is the one truth available.
 */
export function buildWeekPlan(input: WeekPlanInput): WeekPlan {
  const owned = ownedCapabilities(input.inventory) as unknown as Set<string>;
  const all = plannerCatalog();
  const usable = all.filter((entry) => isUsable(entry, owned));

  const weakness = input.payload
    ? fuseWeakness(
        input.payload.muscleScores ?? [],
        input.payload.muscleLoad ?? [],
        {
          hasTrainingData:
            (input.payload.trainingLog?.length ?? 0) > 0 ||
            (input.payload.muscleLoad ?? []).some((l) => l.totalSets > 0),
        },
      )
    : {};

  const catalog: SessionCatalogEntry[] = usable.map((entry) => ({
    id: entry.exercise.id,
    muscles: entry.directMuscles,
    pattern: entry.traits.pattern,
    loadType: entry.traits.loadType,
    unilateral: entry.traits.unilateral,
    jointStress: entry.traits.jointStress,
    spineLoad: entry.traits.spineLoad,
    hypertrophy: entry.exercise.hypertrophy,
    difficulty: entry.exercise.difficulty,
    setupMin: entry.traits.setupMin,
    cardio: entry.traits.cardio,
  }));

  // Monday-first specs: the first `daysPerWeek` non-rest slots spread across
  // the week with rest after each training day (spacing beats clustering for
  // recovery, and the core assignment rule enforces it too).
  const labels = WEEKDAY_LABELS[input.lang];
  const specs: WeekDaySpec[] = labels.map(() => ({
    label: "",
    budgetMin: 0,
  }));
  const spread = spreadTrainingDays(input.daysPerWeek, 7);
  for (const idx of spread) {
    specs[idx] = { label: labels[idx]!, budgetMin: input.timeBudgetMin };
  }
  for (const [i, spec] of specs.entries()) {
    if (spec.budgetMin > 0 && spec.label === "") spec.label = labels[i]!;
  }

  const week = buildWeek({
    days: specs,
    weakness,
    weeklyVolume: input.logStats.weeklyVolume,
    readiness: input.readiness,
    level: input.level,
    goal: input.goal,
    catalog,
  });

  const byId = new Map(usable.map((entry) => [entry.exercise.id, entry]));
  const rows = week.days.map((day, i) => ({
    label: day.label || labels[i]!,
    isRest: day.isRest,
    isToday: i === input.todayIndex,
    assigned: day.assigned,
    sets: day.session.slots.reduce((a, s) => a + s.sets, 0),
    minutes: Math.round(day.session.totalMinutes),
    preview: day.session.slots
      .slice(0, 3)
      .map((s) =>
        byId.has(s.exerciseId)
          ? byId.get(s.exerciseId)!.exercise.name[input.lang]
          : s.exerciseId,
      ),
  }));

  return {
    week,
    rows,
    totalSets: week.totalSets,
    totalMinutes: Math.round(week.totalMinutes),
    uncovered: week.uncovered,
  };
}

/**
 * Spread N training days across a 7-day week as evenly as the calendar
 * allows (e.g. 3 → Mon/Wed/Fri, 4 → Mon/Tue/Thu/Fri is avoided in favour of
 * Mon/Wed/Fri/Sat when possible). Deterministic, Monday-first indices.
 */
export function spreadTrainingDays(n: number, total = 7): number[] {
  const count = Math.max(0, Math.min(n, total));
  if (count === 0) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(Math.round((i * total) / count));
  }
  // De-duplicate while keeping order (rounding can collide at high n).
  return [...new Set(out)];
}
