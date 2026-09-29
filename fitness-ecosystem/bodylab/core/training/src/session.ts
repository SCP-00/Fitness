/**
 * Session builder — "what do I actually do today, in the time I have?".
 *
 * `generator.ts` answers the WEEK (`generateRoutine`): a balanced split with
 * weekly volume windows, hard-validated. That model assumes a full gym and a
 * flexible schedule, and it fails loudly on constrained catalogs (a real
 * reproduction: a home setup made `chest` spill to 22 sets/week, above the
 * intermediate ceiling, so no plan was produced at all).
 *
 * This module answers the DAY, which is the question a lifter asks at 19:00:
 *   - a hard time budget (the owner's is 90 minutes, sometimes 30),
 *   - a readiness self-report (energy, motivation, soreness),
 *   - the gear actually owned,
 *   - rolling weekly volume instead of a rigid weekly window.
 * It never throws: when something cannot be programmed it says so as a
 * structured advisory and returns the best honest session it can build.
 *
 * Everything the user reads is emitted as a **code + parameters**, never as
 * prose: the app owns the copy (and the language). Pure: the catalog is
 * injected, exactly like the validator/generator. @module session
 */

import {
  isBigMuscleFamily,
  muscleFamilyOf,
  VOLUME_WINDOWS,
  type ExperienceLevel,
  type MuscleFamily,
  type MuscleGroup,
} from "./plan";
// Type-only: the weakness map lives with the generator (same package, erased at
// runtime, so this is not a runtime import cycle).
import type { FamilyWeakness } from "./generator";

// ── Injected catalog ────────────────────────────────────────────────────────

/** One exercise the planner is allowed to use (built from the real catalog). */
export interface SessionCatalogEntry {
  id: string;
  /** Every muscle the movement works directly (intensity >= 2). */
  muscles: MuscleGroup[];
  /** Pattern id from the exercise traits vocabulary. */
  pattern: string;
  loadType: string;
  unilateral: boolean;
  jointStress: 1 | 2 | 3;
  spineLoad: 1 | 2 | 3;
  /** 1-5 hypertrophy effectiveness from the catalog. */
  hypertrophy: number;
  /** 1-5 technical difficulty from the catalog. */
  difficulty: number;
  /** Minutes of setup + teardown. */
  setupMin: number;
  /** Conditioning block instead of a lift. */
  cardio?: "steady" | "interval";
}

// ── Input ───────────────────────────────────────────────────────────────────

/** 1 = terrible, 5 = great. Soreness is inverted (5 = fresh, no soreness). */
export interface Readiness {
  energy: number;
  motivation: number;
  soreness: number;
}

export const NEUTRAL_READINESS: Readiness = {
  energy: 3,
  motivation: 3,
  soreness: 3,
};

export type SessionGoal = "hypertrophy" | "strength" | "recomposition";

export interface BuildSessionInput {
  catalog: SessionCatalogEntry[];
  /** 0-100 per family, LOWER = weaker (same semantics as the generator). */
  weakness: FamilyWeakness;
  /** Sets already performed per family in the last 7 days (rolling ledger). */
  weeklyVolume?: Partial<Record<MuscleFamily, number>>;
  timeBudgetMin: number;
  readiness?: Readiness;
  level: ExperienceLevel;
  goal: SessionGoal;
  /** Families to leave alone today (still sore, trained yesterday…). */
  fatiguedFamilies?: MuscleFamily[];
  /** 0-100 conditioning score from BodyLab; low adds a cardio block. */
  conditioningScore?: number | null;
  /** Model-provided score per exercise id (see `decision.ts`). */
  modelScores?: Record<string, number>;
  /** Deterministic tie-break; same input + same seed = same session. */
  seed?: number;
}

// ── Output ──────────────────────────────────────────────────────────────────

/** Why a slot was programmed (rendered by the app, with its own i18n). */
export type SessionReasonCode =
  | "weak_family"
  | "no_anthro"
  | "weekly_gap"
  | "stress_aware"
  | "model_ranked"
  | "coverage"
  | "cardio_due"
  | "cardio_goal";

export interface SessionReason {
  code: SessionReasonCode;
  family?: MuscleFamily;
  score?: number;
  sets?: number;
  group?: string;
}

/** Something the user should know about today's plan. */
export type SessionAdvisoryCode =
  | "readiness_low"
  | "no_equipment"
  | "above_ceiling"
  | "group_no_time"
  | "group_no_equipment"
  | "left_out"
  | "volume_capped"
  | "cardio_no_room"
  | "cardio_no_gear"
  | "fatigued_all";

export interface SessionAdvisory {
  code: SessionAdvisoryCode;
  families?: MuscleFamily[];
  group?: string;
  n?: number;
  level?: ExperienceLevel;
  ceiling?: number;
  /** Exercise ids, for the "left out" case. */
  ids?: string[];
}

export interface SessionSlot {
  exerciseId: string;
  /** Families this slot counts volume for. */
  families: MuscleFamily[];
  pattern: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  restSec: number;
  /** Estimated cost including setup, in minutes. */
  minutes: number;
  /** For conditioning blocks only. */
  cardioMin?: number;
  /** Why this slot exists — the explainability contract. */
  reasons: SessionReason[];
}

export interface BuiltSession {
  slots: SessionSlot[];
  totalMinutes: number;
  timeBudgetMin: number;
  /** Multiplier actually applied to prescribed volume (readiness). */
  volumeFactor: number;
  /** Families the session focuses on, weakest first. */
  focus: MuscleFamily[];
  /** Honest notes: what was dropped and why. */
  advisories: SessionAdvisory[];
}

// ── Dosing tables ───────────────────────────────────────────────────────────

const LEVEL_DOSE: Record<
  ExperienceLevel,
  { setsPerExercise: number; maxSets: number }
> = {
  beginner: { setsPerExercise: 3, maxSets: 14 },
  intermediate: { setsPerExercise: 4, maxSets: 20 },
  advanced: { setsPerExercise: 4, maxSets: 24 },
};

const GOAL_REPS: Record<
  SessionGoal,
  { compound: [number, number]; isolation: [number, number] }
> = {
  hypertrophy: { compound: [8, 12], isolation: [10, 15] },
  strength: { compound: [3, 6], isolation: [8, 12] },
  recomposition: { compound: [6, 10], isolation: [10, 15] },
};

/** Seconds of actual work per working set (rep range + setup/re-rack). */
const WORK_SEC_PER_SET = 45;

/** Rest between sets, seconds. */
function restFor(
  goal: SessionGoal,
  isCompound: boolean,
  spineLoad: number,
): number {
  if (!isCompound) return 75;
  if (goal === "strength" || spineLoad === 3) return 180;
  return 120;
}

/** Weekly set target per family: the middle of the level window. */
function weeklyTarget(level: ExperienceLevel): number {
  const w = VOLUME_WINDOWS[level];
  return Math.round((w.min + w.max) / 2);
}

// ── Scoring ─────────────────────────────────────────────────────────────────

const NEUTRAL_STRENGTH = 50;

/** 0-1, higher = more urgent (family is weak). */
function weaknessGap(weakness: FamilyWeakness, family: MuscleFamily): number {
  const strength = weakness[family] ?? NEUTRAL_STRENGTH;
  return Math.max(0, Math.min(1, (100 - strength) / 100));
}

/** 0-1, higher = further below its weekly target (and not over the ceiling). */
function weeklyGap(
  done: Partial<Record<MuscleFamily, number>>,
  family: MuscleFamily,
  target: number,
  ceiling: number,
): number {
  const sets = done[family] ?? 0;
  if (sets >= ceiling) return 0;
  return Math.max(0, Math.min(1, (target - sets) / target));
}

/** Families an exercise works directly (intensity >= 2 muscles). */
export function familiesOf(entry: SessionCatalogEntry): MuscleFamily[] {
  const out: MuscleFamily[] = [];
  for (const m of entry.muscles) {
    const fam = muscleFamilyOf(m);
    if (!out.includes(fam)) out.push(fam);
  }
  return out;
}

/** Small deterministic hash for stable tie-breaks (no Math.random). */
function tieBreak(seed: number, id: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 1000;
}

interface Candidate {
  entry: SessionCatalogEntry;
  families: MuscleFamily[];
  primary: MuscleFamily;
  score: number;
  reasons: SessionReason[];
}

const PATTERN_GROUPS: { key: string; patterns: string[] }[] = [
  { key: "push", patterns: ["horizontal_push", "vertical_push"] },
  { key: "pull", patterns: ["horizontal_pull", "vertical_pull"] },
  { key: "legs", patterns: ["squat", "hinge", "lunge"] },
  {
    key: "core",
    patterns: [
      "core_anti_extension",
      "core_flexion",
      "core_anti_lateral",
      "core_rotation",
    ],
  },
];

// ── The builder ─────────────────────────────────────────────────────────────

/**
 * Build today's session. Deterministic for a given input + seed, and it never
 * throws: an unusable catalog yields zero slots plus an advisory.
 */
export function buildSession(input: BuildSessionInput): BuiltSession {
  const {
    catalog,
    weakness,
    weeklyVolume = {},
    timeBudgetMin,
    readiness = NEUTRAL_READINESS,
    level,
    goal,
    fatiguedFamilies = [],
    conditioningScore = null,
    modelScores = {},
    seed = 7,
  } = input;

  const advisories: SessionAdvisory[] = [];
  const dose = LEVEL_DOSE[level];
  const target = weeklyTarget(level);
  const ceiling = VOLUME_WINDOWS[level].max;
  const reps = GOAL_REPS[goal];

  // ── Readiness → volume/intensity modulation (explainable, bounded) ───────
  const sore = clamp01((readiness.soreness - 1) / 4);
  const energy = clamp01((readiness.energy - 1) / 4);
  const motivation = clamp01((readiness.motivation - 1) / 4);
  let volumeFactor = 0.7 + 0.35 * sore + 0.15 * energy + 0.1 * motivation;
  if (
    readiness.energy >= 4 &&
    readiness.motivation >= 4 &&
    readiness.soreness >= 4
  )
    volumeFactor = 1.1;
  volumeFactor = Math.max(
    0.55,
    Math.min(1.1, Math.round(volumeFactor * 100) / 100),
  );
  const avoidHighStress = readiness.soreness <= 2;
  const prescribedRir =
    readiness.soreness <= 2
      ? 3
      : readiness.energy >= 4 && readiness.motivation >= 4
        ? 1
        : 2;

  if (volumeFactor < 0.8)
    advisories.push({
      code: "readiness_low",
      n: Math.round(volumeFactor * 100),
    });

  // Families already at/over their weekly ceiling: say it up front (the user
  // should know why today ignores a muscle). The weekly window is a rolling
  // budget here, never a reason to refuse a session.
  const overCeiling = (Object.keys(weeklyVolume) as MuscleFamily[])
    .filter(
      (fam) => isBigMuscleFamily(fam) && (weeklyVolume[fam] ?? 0) >= ceiling,
    )
    .sort();
  for (const fam of overCeiling) {
    advisories.push({
      code: "above_ceiling",
      families: [fam],
      n: weeklyVolume[fam] ?? 0,
      level,
      ceiling,
    });
  }

  if (catalog.length === 0) {
    advisories.push({ code: "no_equipment" });
    return {
      slots: [],
      totalMinutes: 0,
      timeBudgetMin,
      volumeFactor,
      focus: [],
      advisories,
    };
  }

  // ── Score every usable candidate ─────────────────────────────────────────
  const candidates: Candidate[] = [];
  for (const entry of catalog) {
    const families = familiesOf(entry);
    if (families.length === 0) continue;
    const primary = families[0]!;
    // Skip anything that DIRECTLY loads a fatigued family, not just movements
    // whose first-listed muscle is fatigued: dips list triceps first but load
    // the chest just as hard, and prescribing them for a sore chest would be
    // exactly the mistake this rule exists to prevent.
    if (families.some((fam) => fatiguedFamilies.includes(fam))) continue;
    if (entry.cardio) continue; // cardio is handled separately below

    const wGap = weaknessGap(weakness, primary);
    const vGap = weeklyGap(weeklyVolume, primary, target, ceiling);
    const quality = entry.hypertrophy / 5;
    const stressPenalty = avoidHighStress
      ? (entry.jointStress >= 3 ? 0.35 : 0) + (entry.spineLoad >= 3 ? 0.2 : 0)
      : 0;
    const modelScore = modelScores[entry.id] ?? 0;

    const base =
      0.9 * wGap +
      1.0 * vGap +
      0.6 * quality -
      stressPenalty +
      0.3 * modelScore;

    const reasons: SessionReason[] = [];
    if (weakness[primary] !== undefined) {
      reasons.push({
        code: "weak_family",
        family: primary,
        score: Math.round(weakness[primary]!),
      });
    } else {
      reasons.push({ code: "no_anthro", family: primary });
    }
    if (vGap > 0.35)
      reasons.push({
        code: "weekly_gap",
        family: primary,
        sets: weeklyVolume[primary] ?? 0,
      });
    if (stressPenalty > 0) reasons.push({ code: "stress_aware" });
    if (modelScore > 0.2)
      reasons.push({
        code: "model_ranked",
        score: Math.round(modelScore * 100),
      });

    candidates.push({
      entry,
      families,
      primary,
      score: base + tieBreak(seed, entry.id) / 1000,
      reasons,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    advisories.push({ code: "fatigued_all" });
    return {
      slots: [],
      totalMinutes: 0,
      timeBudgetMin,
      volumeFactor,
      focus: [],
      advisories,
    };
  }

  // ── Greedy fill under the time budget ────────────────────────────────────
  const slots: SessionSlot[] = [];
  const usedPatterns = new Set<string>();
  const volumeCount = new Map<MuscleFamily, number>();
  const chosen = new Set<string>();
  const maxSets = Math.max(3, Math.round(dose.maxSets * volumeFactor));
  let totalSets = 0;
  let minutes = 0;

  const isCompoundOf = (c: Candidate) =>
    c.entry.muscles.length > 2 || c.entry.hypertrophy >= 4;

  const costOf = (c: Candidate, sets: number): number =>
    c.entry.setupMin +
    (sets *
      (WORK_SEC_PER_SET + restFor(goal, isCompoundOf(c), c.entry.spineLoad))) /
      60;

  const setsFor = (c: Candidate): number => {
    let sets = dose.setsPerExercise;
    if (weaknessGap(weakness, c.primary) > 0.5) sets += 1; // the weakest gets the extra set
    if (!isCompoundOf(c)) sets = Math.max(2, sets - 1);
    return Math.max(1, Math.round(sets * volumeFactor));
  };

  const tryAdd = (c: Candidate, extraReasons: SessionReason[]): boolean => {
    if (chosen.has(c.entry.id)) return false;
    const sets = setsFor(c);
    const cost = costOf(c, sets);
    if (totalSets + sets > maxSets || minutes + cost > timeBudgetMin)
      return false;

    const compound = isCompoundOf(c);
    const [repsMin, repsMax] = compound ? reps.compound : reps.isolation;
    slots.push({
      exerciseId: c.entry.id,
      families: c.families,
      pattern: c.entry.pattern,
      sets,
      repsMin,
      repsMax,
      rir: prescribedRir,
      restSec: restFor(goal, compound, c.entry.spineLoad),
      minutes: Math.round(cost * 10) / 10,
      reasons: [...c.reasons, ...extraReasons],
    });
    chosen.add(c.entry.id);
    usedPatterns.add(c.entry.pattern);
    for (const fam of c.families)
      volumeCount.set(fam, (volumeCount.get(fam) ?? 0) + sets);
    totalSets += sets;
    minutes += cost;
    return true;
  };

  // Pass 1 — coverage: a session should hit push, pull, legs and core when the
  // gear allows it, even if one of them is not the top-scoring option.
  for (const group of PATTERN_GROUPS) {
    if (group.patterns.some((p) => usedPatterns.has(p))) continue;
    const best = candidates.find(
      (c) =>
        !chosen.has(c.entry.id) && group.patterns.includes(c.entry.pattern),
    );
    if (!best) {
      advisories.push({ code: "group_no_equipment", group: group.key });
      continue;
    }
    if (!tryAdd(best, [{ code: "coverage", group: group.key }])) {
      advisories.push({
        code: "group_no_time",
        group: group.key,
        n: timeBudgetMin,
      });
    }
  }

  // Pass 2 — fill with the best remaining candidates until budget or dose cap.
  const skipped: string[] = [];
  let blockedBySets = false;
  let blockedByTime = false;
  for (const c of candidates) {
    if (chosen.has(c.entry.id)) continue;
    const sets = setsFor(c);
    if (totalSets + sets > maxSets) {
      blockedBySets = true;
      skipped.push(c.entry.id);
      continue;
    }
    if (minutes + costOf(c, sets) > timeBudgetMin) {
      blockedByTime = true;
      skipped.push(c.entry.id);
      continue;
    }
    tryAdd(c, []);
  }

  if (blockedBySets)
    advisories.push({ code: "volume_capped", n: maxSets, level });
  if (blockedByTime)
    advisories.push({
      code: "left_out",
      ids: skipped.slice(0, 3),
      n: skipped.length,
    });

  // ── Weekly ceiling honesty (what THIS session pushes over) ───────────────
  for (const [fam, sets] of volumeCount) {
    const weekTotal = (weeklyVolume[fam] ?? 0) + sets;
    if (
      weekTotal > ceiling &&
      isBigMuscleFamily(fam) &&
      !overCeiling.includes(fam)
    ) {
      advisories.push({
        code: "above_ceiling",
        families: [fam],
        n: weekTotal,
        level,
        ceiling,
      });
    }
  }

  // ── Conditioning block ───────────────────────────────────────────────────
  const wantsCardio =
    (conditioningScore !== null &&
      conditioningScore < 60 &&
      readiness.energy >= 2) ||
    goal === "recomposition";
  if (wantsCardio && readiness.soreness >= 3) {
    const cardio = catalog
      .filter((e) => e.cardio !== undefined)
      .sort((a, b) => {
        // Intervals first (best conditioning per minute), then stable by id.
        const av = a.cardio === "interval" ? 0 : 1;
        const bv = b.cardio === "interval" ? 0 : 1;
        return av - bv || a.id.localeCompare(b.id);
      })[0];
    if (!cardio) {
      advisories.push({ code: "cardio_no_gear" });
    } else {
      const cardioMin = Math.min(
        cardio.cardio === "steady" ? 30 : 12,
        Math.max(0, Math.floor(timeBudgetMin - minutes - cardio.setupMin)),
      );
      if (cardioMin >= 8) {
        slots.push({
          exerciseId: cardio.id,
          families: familiesOf(cardio),
          pattern: cardio.pattern,
          sets: 1,
          repsMin: 1,
          repsMax: 1,
          rir: 5,
          restSec: 0,
          minutes: cardioMin + cardio.setupMin,
          cardioMin,
          reasons: [
            conditioningScore !== null && conditioningScore < 60
              ? { code: "cardio_due", score: Math.round(conditioningScore) }
              : { code: "cardio_goal" },
          ],
        });
        minutes += cardioMin + cardio.setupMin;
      } else {
        advisories.push({ code: "cardio_no_room" });
      }
    }
  }

  const focus = [...volumeCount.keys()].sort(
    (a, b) => weaknessGap(weakness, b) - weaknessGap(weakness, a),
  );

  return {
    slots,
    totalMinutes: Math.round(minutes * 10) / 10,
    timeBudgetMin,
    volumeFactor,
    focus,
    advisories,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Swap candidates for one slot: same pattern, not already in the session. */
export function alternativeExercises(
  session: BuiltSession,
  slotExerciseId: string,
  catalog: SessionCatalogEntry[],
): string[] {
  const slot = session.slots.find((s) => s.exerciseId === slotExerciseId);
  if (!slot) return [];
  const inSession = new Set(session.slots.map((s) => s.exerciseId));
  return catalog
    .filter((e) => e.pattern === slot.pattern && !inSession.has(e.id))
    .sort((a, b) => b.hypertrophy - a.hypertrophy)
    .map((e) => e.id);
}
