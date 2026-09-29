/**
 * Deterministic generator (TrainingLab plan T2).
 *
 * Builds a weekly routine from a weakness map + available equipment using
 * ONLY pure rules — no randomness, no LLM. Same input → same plan (golden
 * outputs). It ATTACKS THE WEAKEST MUSCLE FAMILY FIRST and validates its own
 * output against the hard rules of `validator.ts`: a plan the generator
 * cannot validate is a bug, not a plan.
 *
 * Architecture (why it always satisfies the hard rules):
 *   - Families map to SPLIT PATTERNS: push (chest/shoulders/triceps),
 *     pull (lats/traps/rhomboids/biceps/forearms/core), lower (quads/hams/
 *     glutes/calves). Families that share exercises (squat → quads+glutes+
 *     hams) live in the SAME pattern, so secondary-mover spill lands on the
 *     same day, never on an adjacent one → rule 2 holds by construction.
 *   - Pattern days cycle deterministically (`lower → push → pull`), with the
 *     cycle rotated so the WEAKEST family's pattern gets the extra day. The
 *     7th day is a rest day (legal and realistic).
 *   - Doses: weak families (< 50) target the TOP of the level's volume
 *     window, strong ones a maintenance dose at the BOTTOM. Spill makes the
 *     real totals a fix-point problem: after assembly the generator measures
 *     REAL weekly totals (`weeklySetsByFamily`) and adjusts owned slots
 *     deterministically until every family is inside its window.
 *   - Day `focus` is emitted in GRANULAR muscle ids (the validator's
 *     coverage vocabulary), derived from the day's actual slots.
 *   - Self-validation closes the loop: the generator never returns an
 *     invalid plan — it throws `GeneratorError` instead.
 *
 * Pure TypeScript — no React, no DOM, no I/O, no dependencies.
 *
 * @module training/generator
 */

import {
  VOLUME_WINDOWS,
  muscleFamilyOf,
  DEFAULT_LEVEL,
  type Day,
  type ExperienceLevel,
  type ExerciseSlot,
  type MuscleFamily,
  type MuscleGroup,
  type Routine,
  type TrainingGoal,
} from './plan';
import { validateRoutine, weeklySetsByFamily, type CatalogEntry, type ExerciseCatalog } from './validator';

/** Error thrown when the input is ungeneratable or the output fails self-validation. */
export class GeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

/** Input weakness signal per family (0-100; lower = weaker = programmed first). */
export type FamilyWeakness = Partial<Record<MuscleFamily, number>>;

/** Per-family exercise plan supplied by the caller (app-side vocabulary glue). */
export interface FamilyPlan {
  /** Candidate catalog exercises for this family, in preference order. */
  exercises: string[];
  /** How many exercises of this family appear per session. */
  exercisesPerSession: number;
  /** Requested weekly sessions (= number of its pattern's days; capped by the split). */
  sessionsPerWeek: number;
}

export interface GeneratorInput {
  /** Weakness map: family → score 0-100 (lower = weaker). Missing = 50 (neutral). */
  weakness: FamilyWeakness;
  /** Available equipment tokens (validator rule 1). */
  equipment: string[];
  /** Training days (1-7). Day 7 is always a rest day. */
  daysPerWeek: number;
  goal: TrainingGoal;
  level?: ExperienceLevel;
  /** Per-family candidates + session shape. MUST cover every DIRECT-touched family. */
  familyPlans: Partial<Record<MuscleFamily, FamilyPlan>>;
  /** The exercise catalog (injected; the same array the validator receives). */
  catalog: ExerciseCatalog;
  id?: string;
  name?: string;
}

/** Rep ranges by goal — deterministic, evidence-conventional. */
const GOAL_REPS: Record<TrainingGoal, { min: number; max: number; rest: number; rir?: number }> = {
  strength: { min: 3, max: 6, rest: 180, rir: 2 },
  hypertrophy: { min: 8, max: 12, rest: 90, rir: 2 },
  recomposition: { min: 10, max: 15, rest: 75 },
};

type Pattern = 'push' | 'pull' | 'lower' | 'upper' | 'fullbody';

/** Family → split pattern. Shared-exercise families co-locate (spill safety). */
const FAMILY_PATTERN: Record<MuscleFamily, Pattern> = {
  chest: 'push',
  shoulders: 'push',
  triceps: 'push',
  lats: 'pull',
  traps: 'pull',
  rhomboids: 'pull',
  biceps: 'pull',
  forearms: 'pull',
  core: 'pull',
  quadriceps: 'lower',
  hamstrings: 'lower',
  glutes: 'lower',
  calves: 'lower',
};

/** Which families a day of the given pattern trains (upper/fullbody merge patterns). */
function familiesOfPattern(p: Pattern, ranked: { family: MuscleFamily }[]): MuscleFamily[] {
  if (p === 'fullbody') return ranked.map((r) => r.family);
  if (p === 'upper') return ranked.filter((r) => FAMILY_PATTERN[r.family] !== 'lower').map((r) => r.family);
  return ranked.filter((r) => FAMILY_PATTERN[r.family] === p).map((r) => r.family);
}

/** Score accessor: missing/invalid family = neutral 50. */
function weaknessScore(weakness: FamilyWeakness, family: MuscleFamily): number {
  const v = weakness[family];
  return typeof v === 'number' && Number.isFinite(v) ? v : 50;
}

/** Families an exercise trains DIRECTLY (intensity ≥ 2). */
function directFamiliesOf(ex: CatalogEntry): MuscleFamily[] {
  const fams = new Set<MuscleFamily>();
  for (const m of ex.muscles) {
    if (m.intensity >= 2) fams.add(muscleFamilyOf(m.muscle as MuscleGroup));
  }
  return [...fams];
}

/** The family owning an exercise for dosing: its PRIMARY mover's family. */
function primaryFamilyOf(ex: CatalogEntry): MuscleFamily | null {
  const primary = ex.muscles.find((m) => m.intensity === 3);
  return primary ? muscleFamilyOf(primary.muscle as MuscleGroup) : null;
}

/** Filter the family's candidates: exists, directly trains it, equipment owned. */
function usableExercises(
  family: MuscleFamily,
  plan: FamilyPlan,
  byId: Map<string, CatalogEntry>,
  equipment: Set<string>
): CatalogEntry[] {
  const picked: CatalogEntry[] = [];
  for (const id of plan.exercises) {
    const ex = byId.get(id);
    if (!ex) continue;
    if (!directFamiliesOf(ex).includes(family)) continue;
    const required = ex.equipment.filter((t) => t.length > 0);
    if (required.length > 0 && !required.some((t) => equipment.has(t))) continue;
    picked.push(ex);
  }
  return picked;
}

/** Find k ∈ [1,6] with `slots × k` inside [min, max], closest to target (ties → smaller k). */
function setsPerSlotFor(slots: number, target: number, min: number, max: number): number | null {
  let best: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let k = 1; k <= 6; k++) {
    const total = slots * k;
    if (total < min || total > max) continue;
    const dist = Math.abs(total - target);
    if (dist < bestDist) {
      best = k;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Build the weekly routine. Deterministic: identical inputs produce an
 * identical plan byte-for-byte (golden outputs pinned in tests).
 */
export function generateRoutine(input: GeneratorInput): Routine {
  const level: ExperienceLevel = input.level ?? DEFAULT_LEVEL;
  const window = VOLUME_WINDOWS[level];
  const byId = new Map(input.catalog.map((e) => [e.id, e]));
  const equipment = new Set(input.equipment);

  if (!Number.isInteger(input.daysPerWeek) || input.daysPerWeek < 1 || input.daysPerWeek > 7) {
    throw new GeneratorError(`daysPerWeek must be an integer in [1, 7], got ${input.daysPerWeek}`);
  }

  // ── 1. Rank families by weakness (weakest first; stable sort) ────────────
  const ranked = (Object.entries(input.familyPlans) as [MuscleFamily, FamilyPlan][])
    .map(([family, plan]) => ({ family, plan, score: weaknessScore(input.weakness, family) }))
    .filter(({ family, plan }) => usableExercises(family, plan, byId, equipment).length > 0)
    .sort((a, b) => a.score - b.score);

  if (ranked.length === 0) {
    throw new GeneratorError('no family has usable exercises with the available equipment');
  }

  // Every DIRECT-touched family of every usable exercise must have a plan.
  for (const { family, plan } of ranked) {
    for (const ex of usableExercises(family, plan, byId, equipment)) {
      for (const fam of directFamiliesOf(ex)) {
        if (!input.familyPlans[fam]) {
          throw new GeneratorError(
            `exercise "${ex.id}" trains "${fam}" directly but familyPlans has no entry for it — ` +
              `secondary-mover volume must be accounted for (add a FamilyPlan for "${fam}")`
          );
        }
      }
    }
  }

  // Every ranked family needs at least one exercise whose PRIMARY mover is
  // that family — otherwise its weekly volume is spill-only and can never be
  // steered to its window floor (fail early with an actionable message).
  for (const { family, plan } of ranked) {
    const hasOwn = usableExercises(family, plan, byId, equipment).some(
      (ex) => primaryFamilyOf(ex) === family
    );
    if (!hasOwn) {
      throw new GeneratorError(
        `family "${family}" has no exercise whose PRIMARY mover is it (candidates: ` +
          `${plan.exercises.join(', ')}) — its weekly volume would be spill-only and ` +
          `cannot meet the ${level} window. Add an exercise primary for "${family}".`
      );
    }
  }

  // ── 2. The split: pattern layout rotated so the WEAKEST pattern leads ────
  const patternWeakness = (p: Pattern): number => {
    const fams = ranked.filter((r) =>
      p === 'fullbody' ? true : p === 'upper' ? FAMILY_PATTERN[r.family] !== 'lower' : FAMILY_PATTERN[r.family] === p
    );
    return fams.length ? Math.min(...fams.map((f) => f.score)) : 101; // unused pattern last
  };
  // Weeks of 3-6 days: lower/pull/push cycle (no pattern adjacent to itself).
  // Week of 2 days: lower + upper. Week of 1 day: fullbody. Day 7: rest.
  const dayPatterns: (Pattern | null)[] =
    input.daysPerWeek === 1
      ? ['fullbody']
      : input.daysPerWeek === 2
        ? (() => {
            const lowerFirst = patternWeakness('lower') <= Math.min(patternWeakness('push'), patternWeakness('pull'));
            return lowerFirst ? (['lower', 'upper'] as Pattern[]) : (['upper', 'lower'] as Pattern[]);
          })()
        : (() => {
            const cycle = (['lower', 'push', 'pull'] as Pattern[]).sort(
              (a, b) => patternWeakness(a) - patternWeakness(b)
            );
            return Array.from({ length: input.daysPerWeek }, (_, d) => (d === 6 ? null : cycle[d % 3]));
          })();

  const patternDaysCount = (p: Pattern): number =>
    dayPatterns.filter((x) => x === p || (p !== 'fullbody' && p !== 'upper' && x === 'fullbody') || (p !== 'fullbody' && x === 'upper' && (p === 'push' || p === 'pull'))).length;

  // ── 3. Doses: own-slots solve, then a spill fix-point against REAL totals ─
  // A family's requested sessions may not reach its window floor (e.g. 1
  // session × 1 exercise can never hit the advanced min of 8). Sessions are
  // a PREFERENCE, so the dose solver first tries the requested slots and, if
  // no k fits, WIDENS the slots (more exercises per session, then more
  // sessions up to the pattern's day count) until a solution exists — still
  // deterministic. Only when even 7 slots × 6 sets cannot fit the window
  // (impossible with sane inputs) does it throw.
  const doses = new Map<MuscleFamily, { k: number; slots: number }>();
  for (const { family, plan } of ranked) {
    const days = patternDaysCount(FAMILY_PATTERN[family]);
    const perSession = Math.max(1, plan.exercisesPerSession);
    const weak = weaknessScore(input.weakness, family) < 50;
    const target = weak ? window.max : window.min;

    let solution: { k: number; slots: number } | null = null;
    // Try increasing slot counts: requested first, then widen (repeats across
    // days are legitimate training practice; within one day the `used` set
    // deduplicates). Cap: days × 6 exercises at 6 sets is the sane ceiling.
    const requestedSlots = Math.max(1, Math.min(plan.sessionsPerWeek, days)) * perSession;
    const maxSlots = days * 6;
    for (let slots = requestedSlots; slots <= maxSlots && !solution; slots++) {
      const k = setsPerSlotFor(slots, target, window.min, window.max);
      if (k !== null) solution = { k, slots };
    }
    if (!solution) {
      throw new GeneratorError(
        `family "${family}": no slot count can reach the ${level} window (${window.min}-${window.max}). ` +
          `Add exercises for it to the catalog or family plan.`
      );
    }
    doses.set(family, solution);
  }

  // ── 4. Assemble days (weakest family claims shared exercises first) ──────
  // `over` maps family → sets-per-own-slot override (the spill fix-point).
  const assemble = (over: Map<MuscleFamily, number>): Day[] => {
    const days: Day[] = [];
    for (let d = 0; d < input.daysPerWeek; d++) {
      const pattern = dayPatterns[d];
      if (!pattern) {
        days.push({ id: `day-${d + 1}`, focus: [], slots: [] }); // rest day
        continue;
      }
      const famsToday = familiesOfPattern(pattern, ranked)
        .map((f) => ranked.find((r) => r.family === f)!)
        .filter(Boolean);
      const slots: ExerciseSlot[] = [];
      const used = new Set<string>();
      for (const { family, plan } of famsToday) {
        const k = over.get(family) ?? doses.get(family)?.k ?? 1;
        const doseSlots = doses.get(family)?.slots ?? Math.max(1, plan.exercisesPerSession);
        const perSession = Math.max(1, Math.min(plan.exercisesPerSession, doseSlots));
        const exs = usableExercises(family, plan, byId, equipment);
        let taken = 0;
        for (const ex of exs) {
          if (taken >= perSession) break;
          if (used.has(ex.id)) continue;
          used.add(ex.id);
          taken++;
          const reps = GOAL_REPS[input.goal];
          slots.push({
            exerciseId: ex.id,
            sets: k,
            repsMin: reps.min,
            repsMax: reps.max,
            restSec: reps.rest,
            ...(reps.rir !== undefined ? { rir: reps.rir } : {}),
          });
        }
      }
      // Focus: granular primary-mover muscles of the day's actual slots.
      const focus = [
        ...new Set(
          slots.flatMap((s) => {
            const ex = byId.get(s.exerciseId)!;
            return ex.muscles.filter((m) => m.intensity === 3).map((m) => m.muscle);
          })
        ),
      ] as MuscleGroup[];
      days.push({ id: `day-${d + 1}`, focus, slots });
    }
    return days;
  };

  // ── 5. Spill fix-point: measure REAL totals, adjust owned slots ──────────
  const working = new Map<MuscleFamily, number>();
  for (const [f, d] of doses) working.set(f, d.k);
  const days = assemble(working);
  const MAX_PASSES = 24;
  const seen = new Set<string>();
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const signature = [...working.entries()].sort().map(([f, k]) => `${f}:${k}`).join(',');
    if (seen.has(signature)) break; // deterministic stop; self-validation arbitrates
    seen.add(signature);

    const probe: Routine = {
      id: input.id ?? 'generated',
      name: input.name ?? 'Generated plan',
      goal: input.goal,
      daysPerWeek: days.length,
      equipment: [...equipment],
      createdAt: '1970-01-01T00:00:00.000Z',
      days,
      level,
    };
    const totals = weeklySetsByFamily(probe, input.catalog);
    let changed = false;

    // Ceilings: reduce the offending family's OWN slots; if already at 1, the
    // excess is SPILL — trim the strongest spiller's dose instead (attack-first
    // principle: strong families are trimmed before weak ones).
    for (const { family } of ranked) {
      const total = totals.get(family) ?? 0;
      if (total > window.max) {
        const k = working.get(family) ?? 1;
        if (k > 1) {
          working.set(family, k - 1);
          changed = true;
          continue;
        }
        const spillers = ranked
          .filter((r) => r.family !== family)
          .filter((r) => (working.get(r.family) ?? 1) > 1)
          .filter((r) => {
            const plan = input.familyPlans[r.family]!;
            return usableExercises(r.family, plan, byId, equipment)
              .slice(0, Math.max(1, plan.exercisesPerSession))
              .some((ex) => primaryFamilyOf(ex) === r.family && directFamiliesOf(ex).includes(family));
          });
        if (spillers.length > 0) {
          const victim = spillers[spillers.length - 1]; // ranked is weakest-first → strongest victim
          working.set(victim.family, (working.get(victim.family) ?? 1) - 1);
          changed = true;
        }
      }
    }
    if (changed) {
      for (const d of days) {
        for (const s of d.slots) {
          const ex = byId.get(s.exerciseId)!;
          const owner = primaryFamilyOf(ex);
          if (owner && working.has(owner)) s.sets = working.get(owner)!;
        }
      }
      continue;
    }

    // Floors: a family below min whose OWN slots can carry more gets raised.
    for (const { family } of ranked) {
      const total = totals.get(family) ?? 0;
      if (total < window.min) {
        const ownSlots = days
          .flatMap((d) => d.slots)
          .filter((s) => primaryFamilyOf(byId.get(s.exerciseId)!) === family).length;
        const k = setsPerSlotFor(ownSlots, window.min, window.min, window.max);
        if (k !== null && k > (working.get(family) ?? 1)) {
          working.set(family, k);
          for (const d of days) {
            for (const s of d.slots) {
              const ex = byId.get(s.exerciseId)!;
              if (primaryFamilyOf(ex) === family) s.sets = k;
            }
          }
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // ── 6. Emit the routine (recompute focus + drop empty non-rest days) ─────
  const finalDays: Day[] = days.map((d, i) => ({
    ...d,
    id: `day-${i + 1}`,
  }));

  const routine: Routine = {
    id: input.id ?? 'generated',
    name: input.name ?? 'Generated plan',
    goal: input.goal,
    daysPerWeek: finalDays.length,
    equipment: [...equipment],
    createdAt: '1970-01-01T00:00:00.000Z', // deterministic; the caller stamps the real date
    days: finalDays,
    level,
  };

  // ── 7. Self-validation: the generator eats its own dog food ──────────────
  const result = validateRoutine(routine, input.catalog);
  if (!result.valid) {
    const problems = [
      ...result.structural.map((s) => `[structure] ${s.message}`),
      ...result.violations.map((v) => `[${v.rule}] ${v.message}`),
    ];
    throw new GeneratorError(`generated plan failed self-validation: ${problems.join(' | ')}`);
  }
  return routine;
}
