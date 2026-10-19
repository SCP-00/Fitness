/**
 * Demo data — a realistic training history, generated from a template.
 *
 * Why it exists: the reference mockups are judged with twelve fake exercises and
 * four series; the app has to be judged with *weeks*. A fresh profile shows an
 * empty Hoy, an empty Semana and a Progreso with nothing to chart, so there is
 * no way to tell a layout that works from one that merely happens to look tidy
 * when it is empty. This module builds six weeks of believable history so every
 * screen can be read the way it will be read in use.
 *
 * Three deliberate properties:
 *
 *   1. **Deterministic.** No `Math.random`, no `Date.now()` inside the shapes:
 *      the same `now` produces the same log, byte for byte. That is what makes
 *      the ids stable, and stable ids are what make loading the demo twice a
 *      no-op instead of a duplicate (the store merges by id).
 *   2. **Reversible.** Every id starts with `demo-`. Nothing else in the app
 *      generates that prefix, so "remove the demo data" is an exact filter and
 *      can never touch a real series.
 *   3. **Pure.** No DOM, no IndexedDB, no React: it returns a plain backup
 *      object, and the store feeds it through the very same import path a file
 *      restore uses (`lib/backup.ts`). A demo that took its own shortcut would
 *      eventually demonstrate a different app from the one that ships.
 *
 * The weights are ordinary numbers for an intermediate lifter, not records. The
 * point is the shape of the log, not the kilos: a demo that flatters the numbers
 * would hide exactly the cases worth designing for (a stalled lift, a skipped
 * day, a half-finished session).
 *
 * @module lib/demo
 */

import { ownedFromPreset, type OwnedEquipment } from "@fitness/bodylab-exercises";
import type { MuscleFamily, Readiness } from "@fitness/bodylab-training";
import { buildBackup, type TrainingLabBackup } from "./backup";
import type { HealthRecord } from "./shared";
import { DEFAULT_SETTINGS, type TLSet, type TLSession } from "./types";

/** Every id this module mints starts with this. The removal filter depends on it. */
export const DEMO_PREFIX = "demo-";

/** True for a record that came from the demo loader. */
export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}

/** Sets a demo generation is worth: six weeks is long enough for a trend. */
export const DEMO_WEEKS = 6;

interface DemoTemplateSlot {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir: number;
  restSec: number;
  /** Week-1 working weight, kg. Progresses by `stepKg` per week. */
  baseKg: number;
  /** Weekly progression, kg. Compounds move faster than isolations. */
  stepKg: number;
  /** One or two ramp sets before the working sets, for the first compound. */
  warmups?: number;
}

interface DemoTemplateDay {
  title: string;
  families: MuscleFamily[];
  slots: DemoTemplateSlot[];
}

/**
 * The week: a five-day split with **no family trained twice**, Monday-first.
 *
 * The non-overlap is the load-bearing property, and it was learned the hard way.
 * The first draft of this template spread traps over three days, shoulders over
 * three and core over two — which looks like a normal week until the planner
 * reads it: `buildSession` drops every candidate that loads a *fatigued* family,
 * `lib/recovery.ts` derives fatigue from the raw log, and so the app answered
 * today with "no push/pull/legs/core exercise is possible with your equipment".
 * The gear was fine; the demo log was the problem, and it made a healthy planner
 * look broken on the very screens this data exists to review.
 *
 * With one day per family the app reads it the way it reads a real split: the
 * previous day's families are recovering, everything else is fair game, and the
 * generated session is a full one. `null` is a rest day, in the app's own
 * vocabulary rather than a second way of saying "nothing here".
 *
 * Weekly sets per family also land inside the app's own bands (~10–16 against an
 * intermediate ceiling of 18), so the volume advisories stay quiet. A demo that
 * trips every rule would show a red screen and teach nothing about the layout.
 *
 * **`CYCLE[0]` is today**, and the rest follows backwards (yesterday is `[1]`),
 * so the block is anchored to the day the user opens the app rather than to the
 * calendar:
 *
 *   * Hoy always has a session to show. A weekday-anchored template leaves one
 *     day in seven — whichever is today — displaying the rest-day empty state,
 *     which is useless for reviewing the screen that matters most.
 *   * Yesterday is never today's split, so the recovery window never wipes out
 *     the whole plan (see the note above).
 */
const CYCLE: (DemoTemplateDay | null)[] = [
  {
    title: "Pecho + Tríceps",
    families: ["chest", "triceps"],
    slots: [
      { exerciseId: "barbell-bench-press", sets: 4, repsMin: 8, repsMax: 10, rir: 2, restSec: 120, baseKg: 62.5, stepKg: 2.5, warmups: 2 },
      { exerciseId: "incline-dumbbell-press", sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSec: 90, baseKg: 24, stepKg: 2 },
      { exerciseId: "cable-crossover", sets: 3, repsMin: 12, repsMax: 15, rir: 1, restSec: 60, baseKg: 15, stepKg: 1 },
      { exerciseId: "tricep-pushdown", sets: 3, repsMin: 12, repsMax: 15, rir: 1, restSec: 60, baseKg: 25, stepKg: 1.25 },
      { exerciseId: "skull-crushers", sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSec: 75, baseKg: 20, stepKg: 1.25 },
      { exerciseId: "close-grip-bench", sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSec: 90, baseKg: 55, stepKg: 2.5 },
    ],
  },
  {
    title: "Espalda + Bíceps",
    families: ["lats", "rhomboids", "biceps", "forearms"],
    slots: [
      { exerciseId: "pull-ups", sets: 4, repsMin: 6, repsMax: 9, rir: 2, restSec: 120, baseKg: 0, stepKg: 0, warmups: 1 },
      { exerciseId: "barbell-row", sets: 4, repsMin: 8, repsMax: 10, rir: 2, restSec: 105, baseKg: 55, stepKg: 2.5 },
      { exerciseId: "seated-cable-row", sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSec: 90, baseKg: 50, stepKg: 2.5 },
      { exerciseId: "barbell-curl", sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSec: 60, baseKg: 25, stepKg: 1.25 },
      { exerciseId: "hammer-curl", sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSec: 60, baseKg: 12, stepKg: 1 },
      { exerciseId: "dumbbell-row", sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSec: 75, baseKg: 26, stepKg: 2 },
    ],
  },
  null,
  {
    title: "Piernas",
    families: ["quadriceps", "glutes", "hamstrings", "calves"],
    slots: [
      { exerciseId: "barbell-squat", sets: 4, repsMin: 8, repsMax: 10, rir: 2, restSec: 120, baseKg: 70, stepKg: 2.5, warmups: 2 },
      { exerciseId: "leg-press", sets: 3, repsMin: 10, repsMax: 12, rir: 2, restSec: 90, baseKg: 120, stepKg: 5 },
      { exerciseId: "leg-curl", sets: 3, repsMin: 10, repsMax: 12, rir: 1, restSec: 75, baseKg: 45, stepKg: 2.5 },
      { exerciseId: "romanian-deadlift", sets: 3, repsMin: 8, repsMax: 10, rir: 2, restSec: 105, baseKg: 70, stepKg: 2.5 },
      { exerciseId: "hip-thrust", sets: 3, repsMin: 10, repsMax: 12, rir: 2, restSec: 90, baseKg: 80, stepKg: 5 },
      { exerciseId: "calf-raises", sets: 4, repsMin: 12, repsMax: 15, rir: 1, restSec: 60, baseKg: 60, stepKg: 2.5 },
    ],
  },
  {
    title: "Hombro + Trapecios",
    families: ["shoulders", "traps"],
    slots: [
      { exerciseId: "overhead-press", sets: 4, repsMin: 8, repsMax: 10, rir: 2, restSec: 105, baseKg: 35, stepKg: 1.25, warmups: 2 },
      { exerciseId: "lateral-raise", sets: 4, repsMin: 12, repsMax: 15, rir: 1, restSec: 60, baseKg: 9, stepKg: 1 },
      { exerciseId: "face-pulls", sets: 3, repsMin: 15, repsMax: 18, rir: 1, restSec: 60, baseKg: 20, stepKg: 1.25 },
      { exerciseId: "dumbbell-shrugs", sets: 4, repsMin: 10, repsMax: 12, rir: 1, restSec: 75, baseKg: 30, stepKg: 2 },
    ],
  },
  {
    title: "Core + Acondicionamiento",
    families: ["core"],
    slots: [
      { exerciseId: "cable-crunch", sets: 3, repsMin: 12, repsMax: 15, rir: 1, restSec: 60, baseKg: 30, stepKg: 2.5 },
      { exerciseId: "hanging-knee-raise", sets: 3, repsMin: 10, repsMax: 14, rir: 2, restSec: 60, baseKg: 0, stepKg: 0 },
      { exerciseId: "ab-wheel-rollout", sets: 3, repsMin: 8, repsMax: 12, rir: 2, restSec: 60, baseKg: 0, stepKg: 0 },
      { exerciseId: "v-up", sets: 3, repsMin: 10, repsMax: 15, rir: 2, restSec: 60, baseKg: 0, stepKg: 0 },
      { exerciseId: "plank", sets: 3, repsMin: 45, repsMax: 60, rir: 2, restSec: 60, baseKg: 0, stepKg: 0 },
    ],
  },
  null,
];

/** The gear the demo owns — a real home setup, matching the template above. */
const DEMO_GEAR = [
  "dumbbells-fixed",
  "barbell-plates",
  "bench",
  "rack",
  "machines",
  "cable",
  "pullup-bar",
  "bands",
  "mat",
];

/** Local calendar date at a fixed wall-clock time, as the app stores it (ISO UTC). */
function stamp(day: Date, hour: number, minute: number): string {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hour,
    minute,
    0,
    0,
  ).toISOString();
}

/** `YYYY-MM-DD` of a local date — the key the app slices off a timestamp. */
function isoDay(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

/**
 * One set's numbers. Deterministic, and deliberately not all equal: real logs
 * have a last set that drops a rep or an extra kilo, and a screen that has only
 * ever seen identical rows hides the alignment problems.
 */
function repsFor(slot: DemoTemplateSlot, setIndex: number): number {
  const span = slot.repsMax - slot.repsMin;
  const drift = (setIndex * 1) % (span + 1);
  return slot.repsMax - drift;
}

function weightFor(slot: DemoTemplateSlot, weekIdx: number): number {
  const raw = slot.baseKg + slot.stepKg * weekIdx;
  // Half-kilo steps are the smallest plate pair most home setups have; rounding
  // here keeps every logged weight loadable instead of inventing 27.3 kg.
  return Math.round(raw * 2) / 2;
}

export interface DemoOptions {
  /** How many weeks of history to generate. */
  weeks?: number;
  /** The day the log ends on (defaults to today). */
  now?: Date;
}

/**
 * Build the demo history. Returns a backup object shaped exactly like a file
 * export, so the caller can hand it to `parseBackup`/`importBackup` unchanged.
 */
export function buildDemoBackup(options: DemoOptions = {}): TrainingLabBackup {
  const weeks = options.weeks ?? DEMO_WEEKS;
  const now = options.now ?? new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sets: TLSet[] = [];
  const sessions: TLSession[] = [];
  const health: HealthRecord[] = [];
  const total = weeks * 7;

  // Walked oldest → newest so the arrays come out chronological, with
  // `daysBefore` counting back from today (0 = today).
  for (let daysBefore = total - 1; daysBefore >= 0; daysBefore -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - daysBefore);
    const key = isoDay(day);
    const cycleIdx = daysBefore % 7;
    const template = CYCLE[cycleIdx];
    if (!template) continue;

    // Which week of the block this day belongs to. `weekAgo` counts back from
    // today, so it must be flipped to make progression monotonic: the oldest
    // week is 0 and today is the last one.
    const weekAgo = Math.floor(daysBefore / 7);
    const weekIdx = Math.max(0, weeks - 1 - weekAgo);
    const dayId = `day-${cycleIdx + 1}`;
    const isToday = daysBefore === 0;

    const daySets: TLSet[] = [];
    template.slots.forEach((slot, slotIndex) => {
      // Today is deliberately *unfinished*: two exercises logged and the rest
      // pending, which is the state that shows whether the screen distinguishes
      // done from next. A demo that ends every day complete would hide it.
      const loggedSets = isToday
        ? slotIndex < 2
          ? Math.max(1, Math.ceil(slot.sets / 2))
          : 0
        : slot.sets;
      if (loggedSets === 0) return;

      const weight = weightFor(slot, weekIdx);
      const minutesIn = slotIndex * 9;

      for (let i = 0; i < (slot.warmups ?? 0); i += 1) {
        daySets.push({
          id: `${DEMO_PREFIX}${key}-${slot.exerciseId}-w${i}`,
          exerciseId: slot.exerciseId,
          dayId,
          timestamp: stamp(day, 18, Math.min(59, minutesIn + i * 2)),
          weight: weight > 0 ? Math.round((weight * (0.6 + i * 0.2)) / 2.5) * 2.5 : null,
          reps: 10 - i * 3,
          warmup: true,
        });
      }

      for (let i = 0; i < loggedSets; i += 1) {
        const lastWorking = i === loggedSets - 1;
        daySets.push({
          id: `${DEMO_PREFIX}${key}-${slot.exerciseId}-${i}`,
          exerciseId: slot.exerciseId,
          dayId,
          timestamp: stamp(
            day,
            18,
            Math.min(59, minutesIn + (slot.warmups ?? 0) * 2 + i * 3),
          ),
          // A holds-in-place movement logs seconds, not kilos: the app models
          // that with `durationSec` and no weight, and the demo must exercise
          // that branch too or the plank rows would read as a broken set.
          weight: weight > 0 ? weight : null,
          reps: weight > 0 ? repsFor(slot, i) : null,
          ...(weight > 0 ? {} : { durationSec: 30 + i * 10 }),
          // The last set of the day is the one that reaches failure in real
          // logs; `D` is "near failure" in the app's own effort vocabulary.
          ...(lastWorking && !isToday ? { effort: "D" as const } : {}),
        });
      }
    });

    /*
     * Today's entries are stamped **backwards from `now`**, not at the
     * template's 18:00.
     *
     * A fixed clock hour cannot work here: opening the app at 01:22 with a
     * session stamped 05:00 puts the whole log in the future, the elapsed pill
     * reads `00:00` and any "hours since" calculation comes out negative. It was
     * an invented floor (`Math.max(5, hour - 2)`) that caused it, and a floor is
     * the wrong shape for this — the constraint is "before now", not "after X".
     * Counting back means today's session is always in the past and always
     * *just* finished, whatever time of day the block is generated.
     */
    if (isToday && daySets.length > 0) {
      const stepMs = 3.5 * 60 * 1000;
      const total = daySets.length;
      daySets.forEach((set, i) => {
        set.timestamp = new Date(
          now.getTime() - (total - i) * stepMs,
        ).toISOString();
      });
      daySets.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    sets.push(...daySets);
    if (daySets.length > 0) {
      sessions.push({
        id: `${DEMO_PREFIX}sess-${key}`,
        dayId,
        startedAt: isToday ? daySets[0]!.timestamp : stamp(day, 18, 0),
        // Today's session is open on purpose — it is the one the user is in.
        completedAt: isToday ? null : stamp(day, 19, 15),
        setIds: daySets.map((s) => s.id),
        readiness: demoReadiness(daysBefore),
        budgetMin: 60,
        title: template.title,
        location: "gym",
      });
    }

    // One body weight per week — enough for a Progreso trend, sparse enough to
    // look like a person who steps on a scale occasionally. Pinned to the
    // cycle's first rest day so it lands on the same weekday every week.
    if (cycleIdx === 2) {
      health.push({
        id: `${DEMO_PREFIX}bw-${key}`,
        kind: "body_weight",
        // A slow, believable cut: the oldest week is the heaviest.
        value: Math.round((79.4 + (weeks - 1 - weekIdx) * 0.15) * 10) / 10,
        unit: "kg",
        timestamp: stamp(day, 7, 30),
      });
    }
  }

  const inventory = DEMO_GEAR.map((presetId) =>
    ownedFromPreset(presetId, `${DEMO_PREFIX}gear-${presetId}`),
  ).filter((item): item is OwnedEquipment => item !== null);

  return buildBackup({
    sets,
    sessions,
    health,
    settings: {
      ...DEFAULT_SETTINGS,
      sourcePath: "datos-de-ejemplo",
      timeBudgetMin: 60,
      daysPerWeek: 5,
      inventory,
    },
    decisionModel: null,
  }, now);
}

/**
 * A believable self-report: energy and motivation drift a little day to day but
 * never sit at the extremes, and soreness tracks how close the previous day was.
 * Deterministic by day, so the same date always reports the same readiness.
 */
function demoReadiness(offset: number): Readiness {
  const wobble = (n: number, span: number) =>
    Math.min(5, Math.max(1, 3 + ((offset * n) % span) - Math.floor(span / 2)));
  return {
    energy: wobble(3, 3),
    motivation: wobble(2, 3),
    soreness: wobble(5, 3),
  };
}

/** The demo as a JSON string — what a file import would have contained. */
export function demoBackupJson(options: DemoOptions = {}): string {
  return JSON.stringify(buildDemoBackup(options), null, 2);
}
