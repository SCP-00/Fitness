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
  /** Gear the user declared, item by item. */
  inventory: OwnedEquipment[];
  /** Local decision model settings. */
  useDecisionModel: boolean;
  /** Sound cue preferences. */
  sound: TlSoundSettings;
  /** Local notification preferences. */
  notifications: TlNotificationSettings;
  llm: LlmSettings;
}

/** Sensible defaults: 90 minutes, a real home setup, no network of any kind. */
export const DEFAULT_SETTINGS: TLSettingsData = {
  language: "es",
  sourcePath: null,
  goal: "hypertrophy",
  level: "intermediate",
  timeBudgetMin: 90,
  inventory: [],
  useDecisionModel: true,
  sound: { ...DEFAULT_SOUND },
  notifications: { ...DEFAULT_NOTIFICATIONS },
  llm: { ...DEFAULT_LLM },
};
