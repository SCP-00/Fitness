/**
 * TrainingLab types — what the user logs, what the app remembers, and the
 * settings that drive the daily plan.
 *
 * The planning vocabulary (Routine/Day/ExerciseSlot/Session) lives in
 * `@fitness/bodylab-training`; the gear model lives in
 * `@fitness/bodylab-exercises`. These are the app-side shapes.
 *
 * @module lib/types
 */

import type { OwnedEquipment } from "@fitness/bodylab-exercises";
import type { Readiness, SessionGoal } from "@fitness/bodylab-training";
import { DEFAULT_SHARED, type SharedSettings } from "./shared";

/** A plan slot resolved for display (name + prescription from core). */
export interface PlannedSlot {
  exerciseId: string;
  /** Display name resolved from the imported catalog (English). */
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  rir?: number;
  restSec: number;
}

/** A planned training day with its slots resolved for display. */
export interface PlannedDay {
  id: string;
  /** Granular muscle ids from the routine's focus (core vocabulary). */
  focus: string[];
  slots: PlannedSlot[];
}

/** One logged set. Weights are kg (canonical, same as BodyLab). */
export interface TLSet {
  id: string;
  exerciseId: string;
  /** Routine day id this set belongs to (e.g. 'day-1'). */
  dayId: string;
  timestamp: string;
  weight: number | null;
  reps: number | null;
  rpe?: number;
  notes?: string;
  /**
   * Warm-up ramp set: lives in the log for history, but is excluded from
   * every volume aggregate, PR detection and the weekly ledger.
   */
  warmup?: boolean;
}

/** A training session = the sets logged between start and finish. */
export interface TLSession {
  id: string;
  dayId: string;
  startedAt: string;
  completedAt: string | null;
  setIds: string[];
  /** Readiness self-report captured when the session started. */
  readiness?: Readiness;
  /** Time budget the session was planned for, minutes. */
  budgetMin?: number;
}

export type TlGoal = SessionGoal;
export type TlLevel = "beginner" | "intermediate" | "advanced";

/** Local LLM configuration — any OpenAI-compatible llama.cpp-family server. */
export interface LlmSettings {
  enabled: boolean;
  /** e.g. http://127.0.0.1:8080/v1 (llama.cpp) or :1234/v1 (LM Studio). */
  baseUrl: string;
  model: string;
  /** Optional bearer token (some local servers require one). */
  apiKey: string;
  /** Seconds before giving up on a local server. */
  timeoutSec: number;
}

export const DEFAULT_LLM: LlmSettings = {
  enabled: false,
  baseUrl: "http://127.0.0.1:8080/v1",
  model: "local-model",
  apiKey: "",
  timeoutSec: 60,
};

export interface TlSoundSettings {
  /** The three cues (session bell, exercise achievement, personal record). */
  enabled: boolean;
  /** 0–1 master volume for the cues. */
  volume: number;
}

export const DEFAULT_SOUND: TlSoundSettings = { enabled: true, volume: 0.5 };

export interface TlNotificationSettings {
  /** Raise a notification when the rest countdown reaches zero. */
  enabled: boolean;
  /** Also notify while the app is the focused tab. Off = avoid double alerts. */
  alsoWhenVisible: boolean;
}

export const DEFAULT_NOTIFICATIONS: TlNotificationSettings = {
  enabled: true,
  alsoWhenVisible: false,
};

export interface TLSettingsData {
  language: "en" | "es";
  /** Filename of the imported BodyLab export (display only). */
  sourcePath: string | null;
  goal: TlGoal;
  level: TlLevel;
  /** The owner's daily limit — the session builder never exceeds it. */
  timeBudgetMin: number;
  /** Training days per week for the horizontalised plan (2–6). */
  daysPerWeek: number;
  /** Display/log unit. Storage stays kg (canonical); this is presentation. */
  unit: "kg" | "lb";
  /** Gear the user declared, item by item. */
  inventory: OwnedEquipment[];
  /** Local decision model settings. */
  useDecisionModel: boolean;
  /** Sound cue preferences. */
  sound: TlSoundSettings;
  /** Local notification preferences. */
  notifications: TlNotificationSettings;
  /**
   * Optional shared household history (see `lib/shared.ts`). Off by default: the
   * app is complete and private without it, and turning it on is a deliberate
   * choice about a server on the LAN that stores your logs in the clear.
   */
  shared: SharedSettings;
  llm: LlmSettings;
  /**
   * Which lens the Progreso body map paints (2026-09-29 e): `training` = how
   * much each family was worked, `goal` = how close it is to a target.
   * Absent in old records → the training lens, which needs no extra data.
   */
  bodyMapMode?: "training" | "goal";
  /**
   * Which goal source feeds the goal lens (when `bodyMapMode` is `goal`):
   * the BodyLab assessment (`measures`), per-family user targets
   * (`targets`), or the classical golden-ratio preset (`golden`).
   */
  bodyMapGoalSource?: "measures" | "targets" | "golden";
  /**
   * A waist the user declared by hand, in cm. It anchors the golden-ratio
   * preset when there is no BodyLab measurement; `null` = derive it from the
   * imported payload only.
   */
  waistCm?: number | null;
  /**
   * Per-family circumference targets in cm (the `targets` source of the goal
   * lens). A family without an entry simply has no target yet.
   */
  goalTargets?: Partial<
    Record<
      | "chest"
      | "shoulders"
      | "biceps"
      | "triceps"
      | "forearms"
      | "lats"
      | "traps"
      | "rhomboids"
      | "core"
      | "glutes"
      | "quadriceps"
      | "hamstrings"
      | "calves",
      number
    >
  >;
  /**
   * Per-exercise rep-range overrides (2026-09-29 e): the user's chosen
   * `repsMin`/`repsMax` for one exercise, replacing the planner's default for
   * as long as the override exists. Never persisted into the plan itself.
   */
  repOverrides?: Record<string, { min: number; max: number }>;
  /**
   * Which anatomical figure the Progreso map draws (2026-09-30 f):
   * `auto` follows the imported BodyLab profile's sex and needs no data of its
   * own (a profile-less user gets the male drawing, and the screen says so),
   * while `male`/`female` are an explicit override for anyone the import gets
   * wrong. Absent in old records → `auto`.
   */
  bodyMapFigure?: "auto" | "male" | "female";
}

/** Sensible defaults: 90 minutes, a real home setup, no network of any kind. */
export const DEFAULT_SETTINGS: TLSettingsData = {
  language: "es",
  sourcePath: null,
  goal: "hypertrophy",
  level: "intermediate",
  timeBudgetMin: 90,
  daysPerWeek: 4,
  unit: "kg",
  inventory: [],
  useDecisionModel: true,
  sound: { ...DEFAULT_SOUND },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  shared: { ...DEFAULT_SHARED },
  llm: { ...DEFAULT_LLM },
  bodyMapFigure: "auto",
};
