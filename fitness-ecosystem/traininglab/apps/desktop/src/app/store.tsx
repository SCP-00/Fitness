/**
 * The app store — the state the monolith used to keep inside itself.
 *
 * `TodayPage.tsx` (1 559 lines) held every piece of TrainingLab state: settings,
 * the imported BodyLab payload, logged sets, sessions, the decision model,
 * readiness, the rest timer, the coach and the household sync. That is why the
 * app could be one screen and nothing else: navigating away unmounted it.
 *
 * This module is that state, lifted once and shared. It is deliberately a
 * **faithful lift**, not a rewrite: the planning calls, the record detection, the
 * celebration rules, the sync and the coach tool loop are the same ones, moved.
 * Where behaviour looks odd, it is preserved on purpose so the screens can be
 * redesigned without also debugging the engine underneath them.
 *
 * Two things live here rather than in a screen, because they must survive
 * navigation:
 *   * the **rest timer** (walking to another screen cannot cancel a rest), and
 *   * the **celebration banner** (a record logged in ZEN is announced wherever
 *     the user is when it happens).
 *
 * @module app/store
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BellRing, Sparkles, Trophy, X } from "lucide-react";
import {
  emptyModel,
  normalizeModel,
  rewardFromOutcome,
  updateModel,
  type DecisionModel,
  type MuscleFamily,
  type Readiness,
} from "@fitness/bodylab-training";
import { isV2Payload, type ImportPayload } from "../lib/adapter";
import { localDayKey, todayKey } from "../lib/day";
import {
  SET_UNDO_MS,
  setEditDiff,
  setUndoExerciseId,
  setUndoLine,
  type SetUndoEntry,
} from "../lib/set-undo";
import { activeGearName } from "../lib/gear-profiles";
import {
  buildTodayPlan,
  buildWeekPlan,
  exerciseName,
  familyLogStats,
  featuresFor,
  plannerCatalog,
  progressionAdviceFor,
  swapOptions,
  type PlannedRow,
  type TodayPlan,
  type WeekPlan,
} from "../lib/plan";
import type { ProgressionAdvice } from "../lib/progression";
import { progressionVerdictTool } from "../lib/coach-tools";
import {
  TOOL_SPECS,
  buildSystemPrompt,
  buildUserRequest,
  chatWithTools,
  validateProposal,
  evaluateBiomechanicsAndFatigue,
  type ChatMessage,
} from "../lib/llm";
import {
  deleteSession,
  deleteSessionsMany,
  deleteSet,
  deleteSetsMany,
  loadDecisionModel,
  loadHealthRecords,
  loadMcpLedger,
  loadPayload,
  loadReadiness,
  loadSessions,
  loadSettings,
  loadSets,
  normalizeSettings,
  saveDecisionModel,
  saveHealthRecords,
  saveMcpLedger,
  savePayload,
  saveReadiness,
  saveSession,
  saveSessionsMany,
  saveSet,
  saveSetsMany,
  saveSettings,
  updateSession as dbUpdateSession,
} from "../lib/db";
import { buildBackup, mergeById, parseBackup } from "../lib/backup";
import { buildDemoBackup, isDemoId } from "../lib/demo";
import {
  scheduleAutobackup,
  readAutobackup,
  isDesktopHost,
  isWorthRecovering,
  type RecoverableSnapshot,
} from "../lib/autobackup";
import { MCP_POLL_MS, takeMcpInbox, writeMcpResults } from "../lib/mcp-bridge";
import {
  canUndo,
  parseMcpInbox,
  receiptOf,
  runMcpActions,
  trimLedger,
  type McpContext,
  type McpLedgerEntry,
  type McpUndoOp,
} from "../lib/mcp-actions";
import {
  makeRoutine,
  normalizeRoutine,
  normalizeRoutines,
  removeRoutine,
  upsertRoutine,
  type Routine,
  type RoutineItem,
} from "../lib/routines";
import { parseSymmetry } from "../lib/symmetry";
import { dropExisting, parseOwnerLog } from "../lib/owner-log";
import { getLanguage, setLanguage, t, tInterp } from "../lib/i18n";
import {
  configureSounds,
  installAudioUnlock,
  playCue,
  type CueKind,
} from "../lib/sounds";
import {
  detectRecord,
  isExerciseComplete,
  marksOf,
  mergeMarks,
  type BestMarks,
  type RecordEvent,
} from "../lib/records";
import { configureNotifications } from "../lib/notifications";
import {
  deleteRemoteSet,
  mergeSets,
  normalizeBaseUrl,
  pullMemberData,
  pushHealth,
  pushSessions,
  pushSets,
  type HealthRecord,
} from "../lib/shared";
import RestTimer from "../features/today/RestTimer";
import {
  extendRest as extendRestState,
  startRest,
  toggleRestPause as toggleRestPauseState,
  type RestState,
} from "../lib/rest";
import { useRoute } from "./router";
import type { CoachResult } from "../features/today/CoachPanel";
import type { EffortMarker } from "../lib/effort";
import type {
  TLSession,
  TLSet,
  TLSettingsData,
  WeekDayOverride,
} from "../lib/types";
import {
  applyWeekOverrides,
  computeWeekStress,
  type WeekStress,
} from "../lib/week-stress";
import { swapPlanDays } from "../lib/week-swap";
import {
  applyPostponements,
  applyRepOverrides,
  applyRowOrder,
  clearRowOrder,
  rowOrderFor,
  sessionAsideFor,
  withRepOverride,
  withRowOrder,
  withRowOrderSwap,
  withRowPostpone,
  withRowSkip,
} from "../lib/settings";
/*
 * `RestState` is the **deadline** of a rest, not a local countdown — see
 * `lib/rest.ts` for why (the session draws it in its own card and the shell
 * floats it everywhere else, and two views of one rest must not disagree).
 */

/**
 * An exercise added to today's session on top of the engine's plan (MCP
 * `add_exercise`, 2026-10-13): the row and where the caller wanted it.
 *
 * Kept apart from `plan.rows` on purpose — the plan is the engine's, rebuilt
 * whenever anything it depends on moves, and hand-written rows must survive
 * that rebuild (the same reason `settings.rowOrder` is applied last).
 */
interface AddedRow {
  row: PlannedRow;
  atStart: boolean;
}

/**
 * A moment worth showing (and hearing) for a couple of seconds.
 *
 * Kept separate from the sound so the banner still appears when the user has
 * muted the cues (or the browser refused to play them) — the feedback is the
 * feature, the audio is the garnish.
 */
interface Celebration {
  id: string;
  cue: CueKind;
  title: string;
  detail: string;
}

const NEUTRAL: Readiness = { energy: 3, motivation: 3, soreness: 3 };

/** A finite number out of an untyped MCP payload, else `null`. */
function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Big families a user can flag as still sore before a session. */
export const SORE_FAMILIES: MuscleFamily[] = [
  "chest",
  "shoulders",
  "lats",
  "quadriceps",
  "hamstrings",
  "glutes",
  "core",
];

export interface TrainingLabStore {
  /* ── Raw state ───────────────────────────────────────────────────────── */
  settings: TLSettingsData | null;
  payload: ImportPayload | null;
  sets: TLSet[];
  sessions: TLSession[];
  health: HealthRecord[];
  model: DecisionModel;
  readiness: Readiness;
  soreFamilies: MuscleFamily[];
  /** Today's focus ([] = automatic). Ephemeral: see the comment on the state. */
  dayFocus: MuscleFamily[];
  /** True until settings and the plan are ready — the screens show a loader. */
  loading: boolean;

  /* ── Derived ─────────────────────────────────────────────────────────── */
  plan: TodayPlan | null;
  weekPlan: WeekPlan | null;
  /** Estimated stress of the (possibly user-designed) week, 0–10 + warnings. */
  weekStress: WeekStress | null;
  /** Deterministic rows with the user's swaps and the coach's plan applied. */
  rows: PlannedRow[];
  /** Working sets logged today (warm-ups excluded by contract). */
  todaySets: TLSet[];
  todayVolume: number;
  plannedMinutes: number;
  totalSetsToday: number;
  logStats: ReturnType<typeof familyLogStats>;
  coachResult: CoachResult | null;
  coachBusy: boolean;
  coachRows: PlannedRow[] | null;
  syncing: boolean;
  sharedError: string | null;
  loadError: string | null;
  finished: TLSession | null;
  /** Non-null when the log is empty but an automatic snapshot has data. */
  recoverable: RecoverableSnapshot | null;
  restoreAutobackup: () => Promise<{ ok: boolean; message: string }>;

  /* ── Actions ─────────────────────────────────────────────────────────── */
  patch: (over: Partial<TLSettingsData>) => void;
  handleFile: (file: File) => Promise<void>;
  addSet: (
    row: PlannedRow,
    weight: number | null,
    /** `null` only for timed work (`durationSec`): a hold has no reps. */
    reps: number | null,
    opts?: {
      warmup?: boolean;
      rpe?: number;
      effort?: EffortMarker;
      durationSec?: number;
      notes?: string;
    },
  ) => TLSet;
  removeSet: (id: string) => void;
  /**
   * Rewrite a logged set in place. Only the keys actually passed are touched,
   * so re-marking a set as `D`/`F` can never wipe its load and reps.
   */
  editSet: (
    id: string,
    patch: {
      weight?: number | null;
      reps?: number | null;
      /** `null` clears the mark and leaves the set as plain work. */
      effort?: EffortMarker | null;
    },
  ) => void;
  /**
   * The last reversible change to a single set — deleting it or rewriting its
   * numbers — while its undo window is open, else null (2026-10-21).
   */
  setUndo: SetUndoEntry | null;
  /**
   * Put the deleted set back, or restore the numbers an edit overwrote. Writes
   * through to IndexedDB, so the undo survives a reload.
   */
  undoSetChange: () => void;
  addHealthRecord: (record: HealthRecord) => void;
  removeHealthRecord: (id: string) => void;
  setReadinessAndPersist: (next: Readiness) => void;
  toggleSoreFamily: (family: MuscleFamily) => void;
  setDayFocus: (families: MuscleFamily[]) => void;
  /** Closes today's session; `null` when there is nothing to close. `extra`
   *  carries sets logged in the same tick (MCP batches). Returns the session so
   *  a `finish_session` receipt can carry its undo token. */
  finishSession: (extra?: readonly TLSet[]) => TLSession | null;
  /** Delete a whole completed session and optionally delete all its associated sets. */
  removeSession: (id: string, opts?: { deleteSets?: boolean }) => void;
  /**
   * Put a deleted session (and the sets it took) back exactly as they were
   * (2026-10-21). Same lane the agent's `restore_session` undo uses, so the human
   * «Deshacer» in Historial and an undo from the MCP cannot restore differently.
   */
  restoreSession: (session: TLSession, removedSets?: readonly TLSet[]) => void;
  /** Update a session's metadata (e.g. readiness, time budget, timestamps). */
  editSession: (id: string, patch: Partial<TLSession>) => void;
  swapRow: (from: string, to: string) => void;
  /** Reorder today's session: positions in the `rows` the user is looking at. */
  moveRow: (from: number, to: number) => void;
  /** Drop the user's sequence and go back to the generator's own order. */
  resetRowOrder: () => void;
  /** True when today's session is in a sequence the user set himself. */
  orderIsCustom: boolean;
  /**
   * Set an exercise aside for the rest of today (*Saltar*) and take it back. It
   * stays in today's plan and in the week: only the session steps over it.
   */
  skipRow: (exerciseId: string) => void;
  unskipRow: (exerciseId: string) => void;
  /** Push an exercise to the end of today's session (*Posponer*), and undo it. */
  postponeRow: (exerciseId: string) => void;
  unpostponeRow: (exerciseId: string) => void;
  /** Exercises set aside today, in the order they were set aside. */
  skippedToday: string[];
  /** Exercises pushed to the end of today's session, in that order. */
  postponedToday: string[];
  /**
   * Exercises the user added to today by hand. They are the only rows that can
   * be *removed*: a planned row is skipped instead, so the plan and the week
   * keep the prescription (mockup 02's Quitar, mockup 03's Saltar).
   */
  addedToday: string[];
  /** Take a hand-added exercise back out of today's session. */
  removeAddedRow: (exerciseId: string) => void;
  /**
   * Add one exercise to today's session (mockup 02's *Añadir varios*). The MCP
   * action `add_exercise` calls the same function, so the screen and an agent
   * cannot prescribe differently. Returns false when the catalog does not know
   * the id or the exercise is already in today's rows.
   */
  addExerciseToToday: (
    exerciseId: string,
    opts?: {
      sets?: number;
      atStart?: boolean;
      repsMin?: number;
      repsMax?: number;
      restSec?: number;
      rir?: number;
    },
  ) => boolean;
  /**
   * The user's routine templates (mockup 06), sanitized on the way in. Newest
   * edit first; an old backup without them simply yields an empty list.
   */
  routines: Routine[];
  /**
   * Create or rewrite one template. Returns the stored routine (`null` when the
   * draft is not saveable: no name, or no known exercise). The editor and any
   * future agent path go through this single verb.
   */
  saveRoutine: (input: {
    id?: string;
    name: string;
    notes?: string;
    items: RoutineItem[];
  }) => Routine | null;
  /** Delete one template by id. */
  deleteRoutine: (id: string) => void;
  /**
   * Add a template's exercises to today's session with *its* prescription —
   * the same `addExerciseToToday` the queue screen uses, so a routine can
   * never prescribe something the app would not accept by hand. Returns how
   * many rows were actually added (rows already in today are left untouched).
   */
  applyRoutineToday: (routine: Routine) => number;
  /**
   * The rest in progress, or `null`. Exposed because it has **two** views — the
   * session's own card (`mockup/03-sesion.html`) and the floating overlay on the
   * other screens — and both render the same deadline (`lib/rest.ts`).
   */
  rest: RestState | null;
  /** `+seconds` on the running rest (the session's card offers +15 s). */
  extendRest: (seconds: number) => void;
  /** Freeze the rest where it is, or resume it. */
  toggleRestPause: () => void;
  /** Drop the rest: the skip button, and the path taken when it reaches zero. */
  skipRest: () => void;
  clearCoach: () => void;
  resetModel: () => void;
  regenerateWeek: () => void;
  /**
   * Author one day of his own week (clear with `null` to restore the
   * planner's day). Only his layer is written — never the generated plan.
   */
  setWeekOverride: (index: number, override: WeekDayOverride | null) => void;
  /**
   * Swap two days' effective plans (the drag gesture of Semana, 2026-10-19).
   * Returns whether anything changed, so the screen can announce it.
   */
  swapWeekDays: (from: number, to: number) => boolean;
  askCoach: (request: string) => Promise<void>;
  runSharedSync: (opts?: { report?: boolean }) => Promise<void>;
  prFor: (
    exerciseId: string,
  ) => NonNullable<ImportPayload["personalRecords"]>[number] | null; /**
   * All-time marks of one exercise (log + imported PRs): the load, the estimate,
   * the bodyweight reps and the longest hold. See `marksFor` above.
   */
  marksFor: (exerciseId: string) => BestMarks;
  /**
   * The cross-session verdict for an exercise in today's plan: raise the load
   * with the exact kilos, escalate to another lever when the load has hit the
   * gear's ceiling, repeat, rebuild, or drop to an easier variant.
   *
   * Computed over the days BEFORE today (the screen, the Inicio card and the
   * local coach all read this same call, so the three cannot disagree), and
   * `null` when the exercise is not part of today's session — off-plan ids are
   * not answered here rather than answered with a guessed rep range.
   */
  progressionFor: (exerciseId: string) => ProgressionAdvice | null;
  swapOptionsFor: (exerciseId: string) => ReturnType<typeof swapOptions>;
  /** Applies a logged warm-up ramp in one shot (see `lib/warmup.ts`). */
  logWarmup: (
    row: PlannedRow,
    steps: { weight: number; reps: number }[],
  ) => void;
  /**
   * Set (or clear with `null`) the user's rep range for one exercise — the
   * 2026-09-29 e feature that lets the prescription answer to the user.
   */
  setRepRange: (
    exerciseId: string,
    range: { min: number; max: number } | null,
  ) => void;
  /**
   * Receipts of everything the local agents have asked this app to do (the
   * ACTIONS channel). Newest first is applied in the screen; this is the raw
   * ledger, persisted so a restart neither forgets nor re-applies anything.
   */
  mcpLedger: McpLedgerEntry[];
  /** Reverse one applied MCP action (Ajustes → auditoría de agentes). */
  undoMcpAction: (id: string) => Promise<void>;
  /** The complete JSON backup of this device's data, as text. */
  exportBackup: () => string;
  /**
   * Restore a backup file: merge by id into IndexedDB (never a wipe), then
   * adopt it in memory. Reports a translated message for the settings screen.
   */
  importBackup: (file: File) => Promise<{ ok: boolean; message: string }>;
  /**
   * Import the OCR-processed Symmetry history (`lib/symmetry.ts`): convert to
   * records, merge by id (importing twice is a no-op), persist and report.
   */
  importSymmetry: (file: File) => Promise<{ ok: boolean; message: string }>;
  /**
   * Import the owner's corrected training log (CSV): convert to records, drop
   * rows the log already holds, merge what is new, persist and report.
   */
  importOwnerLog: (file: File) => Promise<{ ok: boolean; message: string }>;
  /**
   * What `importSymmetry` / `importOwnerLog` **would** do, without doing it.
   *
   * The preview the import screen asks for before the owner commits. It runs
   * the same plan function the import itself runs — parse, dedupe against the
   * current log, count — so the numbers on the preview and the numbers after
   * the import are the same numbers by construction, not by discipline.
   */
  previewOwnerLog: (file: File) => Promise<ImportPreview>;
  previewSymmetry: (file: File) => Promise<ImportPreview>;
  /**
   * Sample history (`lib/demo.ts`), for judging the screens with weeks of data
   * instead of an empty log. It goes through the same merge path a file restore
   * uses, and `clearDemoData` is its exact inverse.
   */
  loadDemoData: () => Promise<{ ok: boolean; message: string }>;
  /** Remove every record whose id carries the demo prefix, and nothing else. */
  clearDemoData: () => Promise<{ ok: boolean; message: string }>;
}

/** What an import would leave behind, once parsed and deduped — never a write. */
interface ImportReport {
  sessions: number;
  sets: number;
  duplicates: number;
  skippedNoId: number;
  skippedBadRow: number;
}

type ImportPlan =
  | { ok: false; errorKey: string }
  | {
      ok: true;
      errorKey: null;
      sets: TLSet[];
      sessions: TLSession[];
      report: ImportReport;
    };

/**
 * What an import would leave behind, once the file has been parsed and deduped
 * against the current log — the preview behind the import screen.
 *
 * Nothing here is estimated: `sets`/`sessions` are the rows that would survive
 * the merge, `duplicates` the rows the log already holds (importing them again
 * changes nothing), and `skipped` the rows the converters refuse to invent an id
 * for. A file that cannot be read comes back `ok: false` with the i18n key of
 * the reason, never with zeroes that would read as "nothing to import".
 */
export interface ImportPreview {
  ok: boolean;
  /** i18n key of the reason when `ok` is false (e.g. `ownerlog.error.xlsx`). */
  errorKey?: string;
  sets: number;
  sessions: number;
  duplicates: number;
  skipped: number;
}

const StoreContext = createContext<TrainingLabStore | null>(null);

/** Read the store. Throws outside the provider, which is a programming error. */
export function useStore(): TrainingLabStore {
  const value = useContext(StoreContext);
  if (!value) {
    throw new Error("useStore must be used inside <TrainingLabProvider>");
  }
  return value;
}

export function TrainingLabProvider({ children }: { children: ReactNode }) {
  // Which destination is on screen. Read here for one decision only: whether the
  // rest belongs in the session's own card or in the floating overlay.
  const route = useRoute();
  const [settings, setSettings] = useState<TLSettingsData | null>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [sets, setSets] = useState<TLSet[]>([]);
  const [model, setModel] = useState<DecisionModel>(() => emptyModel());
  const [readiness, setReadiness] = useState<Readiness>(NEUTRAL);
  const [soreFamilies, setSoreFamilies] = useState<MuscleFamily[]>([]);
  // Ephemeral on purpose: a focus is a decision about *today* ("hoy toca
  // abdomen"), not a setting. Persisting it would silently turn every future
  // day into a core day, which is the opposite of what the plan wants.
  const [dayFocus, setDayFocus] = useState<MuscleFamily[]>([]);
  const [addedRows, setAddedRows] = useState<AddedRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [rest, setRest] = useState<RestState | null>(null);
  const [finished, setFinished] = useState<TLSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachRows, setCoachRows] = useState<PlannedRow[] | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  /** Last reversible change to one set (delete or rewrite), 2026-10-21. */
  const [setUndo, setSetUndo] = useState<SetUndoEntry | null>(null);
  /** Clears that entry when its window closes — one timer, never a queue. */
  const undoTimer = useRef<number | null>(null);
  const [sessions, setSessions] = useState<TLSession[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [weekSeed, setWeekSeed] = useState(0);
  const [recoverable, setRecoverable] = useState<RecoverableSnapshot | null>(
    null,
  );
  /** Receipts of the MCP action channel (idempotency + undo, see lib/mcp-actions). */
  const [mcpLedger, setMcpLedger] = useState<McpLedgerEntry[]>([]);
  /** Mirror of that ledger for code that runs outside a render (the inbox
   *  poller): reading state in a 1 s interval would otherwise see it stale. */
  const mcpLedgerRef = useRef<McpLedgerEntry[]>([]);
  /** One inbox batch at a time — the interval must not race an in-flight one. */
  const mcpBusy = useRef(false);

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSettings();
      if (cancelled) return;
      setSettings(s);
      setLanguage(s.language);
      const [
        storedPayload,
        storedSets,
        storedSessions,
        storedModel,
        storedReadiness,
        storedHealth,
        storedLedger,
      ] = await Promise.all([
        loadPayload(),
        loadSets(),
        loadSessions(),
        loadDecisionModel(),
        loadReadiness(),
        loadHealthRecords(),
        loadMcpLedger(),
      ]);
      if (cancelled) return;
      if (storedPayload && isV2Payload(storedPayload))
        setPayload(storedPayload);
      setSets(storedSets);
      setSessions(storedSessions);
      setModel(normalizeModel(storedModel));
      setHealth(storedHealth);
      setMcpLedger(storedLedger);
      mcpLedgerRef.current = storedLedger;
      if (storedReadiness) setReadiness(storedReadiness.readiness);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Sound cues ──────────────────────────────────────────────────────────
  // The unlock listener has to exist before the first cue, because iOS Safari
  // only lets an AudioContext start from inside a real gesture.
  useEffect(() => {
    installAudioUnlock();
  }, []);

  useEffect(() => {
    if (settings) {
      configureSounds(settings.sound);
      configureNotifications(settings.notifications);
    }
  }, [settings]);

  // Safety copy outside the WebView profile. Watching the state instead of
  // patching each save means no write path can forget it — logging, editing,
  // restoring a backup, importing Symmetry, settings, readiness all land here.
  // The debounce inside collapses a burst into one file, and `logSignature`
  // skips the write when nothing actually changed.
  //
  // Moved below `rows` (2026-10-09): the mirror carries the plan the app is
  // showing, and the readiness, so the agent tools stop guessing both.

  // An empty log with a snapshot on disk is the profile having been reset
  // behind our back. Say so instead of showing an empty app and letting the
  // owner discover the loss later; the restore itself is one tap, because
  // silently rewriting someone's history is worse than asking.
  useEffect(() => {
    if (!settings) return;
    if (sets.length > 0 || sessions.length > 0) {
      setRecoverable(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const backup = await readAutobackup();
      if (cancelled || !backup) return;
      if (!isWorthRecovering({ backup, localSets: 0, localSessions: 0 }))
        return;
      setRecoverable({
        sets: backup.sets.length,
        sessions: backup.sessions.length,
        exportedAt: backup.exportedAt,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [settings, sets.length, sessions.length]);

  // Auto-dismiss the banner. A newer celebration replaces the timer, so a
  // record logged right after an achievement still gets its full moment.
  useEffect(() => {
    if (!celebration) return;
    const id = setTimeout(() => setCelebration(null), 3400);
    return () => clearTimeout(id);
  }, [celebration]);

  const celebrate = useCallback(
    (cue: CueKind, title: string, detail: string) => {
      playCue(cue);
      setCelebration({ id: crypto.randomUUID(), cue, title, detail });
    },
    [],
  );

  /**
   * Best marks previously known for an exercise: everything logged so far plus
   * the personal records BodyLab exported. A PR is a PR regardless of which app
   * saw it first.
   *
   * BodyLab's `bestReps` needs a rule of its own: it is the most reps over
   * **every** set of that exercise, loaded ones included, so a light 20-rep set
   * on a barbell lift would look like a bodyweight mark. It is only accepted as
   * one when BodyLab never saw a load for that exercise (`bestWeight` empty),
   * which is exactly when its reps are bodyweight reps.
   */
  const importedMarksFor = useCallback(
    (exerciseId: string) => {
      const pr = payload?.personalRecords?.find(
        (p) => p.exerciseId === exerciseId,
      );
      const unloaded = (pr?.bestWeight ?? null) === null;
      return {
        bestWeightKg: pr?.bestWeight ?? null,
        bestEst1RmKg: pr?.bestEst1RM ?? null,
        bestReps: unloaded ? (pr?.bestReps ?? null) : null,
        bestHoldSec: null,
      };
    },
    [payload],
  );

  /**
   * The all-time marks of one exercise, local log and imported PRs fused — the
   * number the screens show ("marca: 12 reps") and the number a logged set is
   * compared against. One source, so the mark on screen and the mark that can be
   * beaten cannot disagree.
   *
   * Warm-up sets stay out of it: a ramp rep is not a mark (the log's contract).
   */
  const marksFor = useCallback(
    (exerciseId: string): BestMarks =>
      mergeMarks(
        marksOf(sets.filter((s) => s.exerciseId === exerciseId && !s.warmup)),
        importedMarksFor(exerciseId),
      ),
    [sets, importedMarksFor],
  );

  const applySettings = useCallback((next: TLSettingsData) => {
    setSettings(next);
    setLanguage(next.language);
    void saveSettings(next);
  }, []);

  const patch = useCallback(
    (over: Partial<TLSettingsData>) => {
      if (!settings) return;
      applySettings({ ...settings, ...over });
    },
    [settings, applySettings],
  );

  // ── Shared household history ────────────────────────────────────────────
  /**
   * Push what is local, pull what is remote, merge by id.
   *
   * Deliberately a *full* round trip rather than an incremental one: the dataset
   * is a household's training log (thousands of rows at most), every write is an
   * idempotent upsert, and "send everything, then reconcile" is the version of
   * this that cannot drift. Failure is silent by design when it is an automatic
   * sync — being told the Wi-Fi dropped mid-set is not useful — but an explicit
   * "Sync now" reports the reason.
   */
  const runSharedSync = useCallback(
    async ({ report = false }: { report?: boolean } = {}) => {
      if (!settings) return;
      const base = normalizeBaseUrl(settings.shared.baseUrl);
      const memberId = settings.shared.memberId;
      if (!base || !memberId) return;

      setSyncing(true);
      if (report) setSharedError(null);
      try {
        const pulled = await pullMemberData(base, memberId);

        const known = new Set(sets.map((s) => s.id));
        const fresh = pulled.sets.filter((s) => !known.has(s.id));
        for (const set of fresh) void saveSet(set);
        const merged = mergeSets(sets, pulled.sets);
        if (fresh.length > 0) setSets(merged);

        await pushSets(base, memberId, merged);
        if (sessions.length > 0) await pushSessions(base, memberId, sessions);
        if (health.length > 0) await pushHealth(base, memberId, health);

        applySettings({
          ...settings,
          shared: { ...settings.shared, lastSyncAt: new Date().toISOString() },
        });
      } catch (error) {
        if (report) {
          setSharedError(
            error instanceof Error ? error.message : "sync failed",
          );
        }
      } finally {
        setSyncing(false);
      }
    },
    [settings, sets, sessions, health, applySettings],
  );

  /** Push one freshly logged set without blocking the input row. */
  const pushSetQuietly = useCallback(
    (set: TLSet) => {
      if (!settings?.shared.enabled || !settings.shared.memberId) return;
      const base = normalizeBaseUrl(settings.shared.baseUrl);
      if (!base) return;
      void pushSets(base, settings.shared.memberId, [set]).catch(() => {
        // Offline at the gym is the normal case; the next full sync catches up.
      });
    },
    [settings],
  );

  // Sync once per launch, and again whenever the app comes back to the
  // foreground — the moment a phone rejoins the Wi-Fi.
  useEffect(() => {
    if (!settings?.shared.enabled || !settings.shared.memberId) return;
    void runSharedSync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void runSharedSync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [
    settings?.shared.enabled,
    settings?.shared.memberId,
    settings?.shared.baseUrl,
    runSharedSync,
  ]);

  // ── Backup (the app's own data, JSON) ───────────────────────────────────
  /**
   * Everything this device knows, ids included. Deliberately built from the
   * in-memory state (already the source of truth for the screens) rather than a
   * fresh IndexedDB read.
   */
  const exportBackup = useCallback(
    (): string =>
      JSON.stringify(
        buildBackup({ sets, sessions, health, settings, decisionModel: model }),
        null,
        2,
      ),
    [sets, sessions, health, settings, model],
  );

  const importBackup = useCallback(
    async (file: File): Promise<{ ok: boolean; message: string }> => {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) {
        const message = t(
          parsed.error === "future-version"
            ? "backup.error.version"
            : parsed.error === "wrong-app"
              ? "backup.error.app"
              : "backup.error.invalid",
        );
        return { ok: false, message };
      }

      const nextSets = mergeById(sets, parsed.backup.sets);
      const nextSessions = mergeById(sessions, parsed.backup.sessions);
      const nextHealth = mergeById(health, parsed.backup.health);
      await saveSetsMany(nextSets);
      await saveSessionsMany(nextSessions);
      await saveHealthRecords(nextHealth);
      setSets(nextSets);
      setSessions(nextSessions);
      setHealth(nextHealth);

      if (parsed.backup.decisionModel) {
        setModel(parsed.backup.decisionModel);
        await saveDecisionModel(parsed.backup.decisionModel);
      }
      if (parsed.backup.settings) {
        applySettings(normalizeSettings(parsed.backup.settings));
      }
      return {
        ok: true,
        message: tInterp("backup.restored", {
          n: parsed.backup.sets.length,
        }),
      };
    },
    [sets, sessions, health, applySettings],
  );

  /**
   * Bring back the automatic snapshot by handing it to the very same merge
   * path a file import uses, so a recovery cannot behave differently from a
   * restore the owner chose by hand. Silent rewriting of somebody's history
   * would be worse than asking, hence one explicit tap.
   */
  const restoreAutobackup = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const backup = await readAutobackup();
    if (!backup) return { ok: false, message: t("autobackup.restore.missing") };
    const file = new File(
      [JSON.stringify(backup)],
      "traininglab-autobackup.json",
      {
        type: "application/json",
      },
    );
    const result = await importBackup(file);
    if (result.ok) setRecoverable(null);
    return result;
  }, [importBackup]);

  /*
   * ── The import plan, once per file ────────────────────────────────────
   *
   * Parsing and de-duplicating live in these two callbacks, and BOTH the
   * preview and the import run them. That is the whole point: the numbers the
   * owner sees before pressing *Importar* cannot drift from the numbers after
   * pressing it, because they are the same computation.
   *
   * Neither writes anything. The only side effect is the id-matching against
   * the log the store currently holds, which is exactly what the merge does.
   */
  const planSymmetry = useCallback(
    async (file: File): Promise<ImportPlan> => {
      const parsed = parseSymmetry(await file.text());
      if (!parsed.ok) {
        return {
          ok: false,
          errorKey:
            parsed.error === "not-json"
              ? "symmetry.error.file"
              : parsed.error === "no-sessions"
                ? "symmetry.error.empty"
                : "symmetry.error.shape",
        };
      }
      // Symmetry ids are content hashes, so a second import is a no-op: a row
      // the log already holds is a duplicate by id, which is what `mergeById`
      // will collapse it to.
      const existingIds = new Set(sets.map((set) => set.id));
      const duplicates = parsed.sets.filter((set) =>
        existingIds.has(set.id),
      ).length;
      return {
        ok: true,
        errorKey: null,
        sets: parsed.sets,
        sessions: parsed.sessions,
        report: {
          ...parsed.report,
          duplicates,
        },
      };
    },
    [sets],
  );

  const planOwnerLog = useCallback(
    async (file: File): Promise<ImportPlan> => {
      const parsed = parseOwnerLog(await file.text());
      if (!parsed.ok) {
        return {
          ok: false,
          errorKey:
            parsed.error === "xlsx"
              ? "ownerlog.error.xlsx"
              : parsed.error === "missing-columns"
                ? "ownerlog.error.columns"
                : parsed.error === "wrong-shape"
                  ? "ownerlog.error.shape"
                  : parsed.error === "no-rows"
                    ? "ownerlog.error.empty"
                    : "ownerlog.error.file",
        };
      }
      // `dropExisting` mutates the report in place (that is how the import has
      // always counted duplicates), so the preview gets the same numbers by
      // construction.
      const incoming = dropExisting(parsed, sets);
      return {
        ok: true,
        errorKey: null,
        sets: incoming.sets,
        sessions: incoming.sessions,
        report: incoming.report,
      };
    },
    [sets],
  );

  const previewOf = (plan: ImportPlan): ImportPreview => {
    if (!plan.ok) {
      return {
        ok: false,
        errorKey: plan.errorKey,
        sets: 0,
        sessions: 0,
        duplicates: 0,
        skipped: 0,
      };
    }
    return {
      ok: true,
      sets: plan.report.sets,
      sessions: plan.report.sessions,
      duplicates: plan.report.duplicates,
      skipped: plan.report.skippedNoId + plan.report.skippedBadRow,
    };
  };

  const previewSymmetry = useCallback(
    async (file: File): Promise<ImportPreview> =>
      previewOf(await planSymmetry(file)),
    [planSymmetry],
  );

  const previewOwnerLog = useCallback(
    async (file: File): Promise<ImportPreview> =>
      previewOf(await planOwnerLog(file)),
    [planOwnerLog],
  );

  /**
   * Symmetry history import. Same merge semantics as the backup restore —
   * deterministic ids make a second import a no-op — but the input is the OCR
   * JSON, not this app's own format, so it goes through `lib/symmetry.ts`.
   * Sets whose exercise has no catalog equivalent are skipped by the converter
   * and surfaced in the message; they are never given an invented id.
   */
  const importSymmetry = useCallback(
    async (file: File): Promise<{ ok: boolean; message: string }> => {
      const plan = await planSymmetry(file);
      if (!plan.ok) {
        return { ok: false, message: t(plan.errorKey) };
      }
      const nextSets = mergeById(sets, plan.sets);
      const nextSessions = mergeById(sessions, plan.sessions);
      await saveSetsMany(nextSets);
      await saveSessionsMany(nextSessions);
      setSets(nextSets);
      setSessions(nextSessions);
      const skipped = plan.report.skippedNoId + plan.report.skippedBadRow;
      return {
        ok: true,
        message: tInterp("symmetry.imported", {
          sessions: plan.report.sessions,
          sets: plan.report.sets,
          skipped,
        }),
      };
    },
    [planSymmetry, sets, sessions, saveSetsMany, saveSessionsMany],
  );

  /**
   * The owner's corrected training log (`owner-training-log.csv`). Same merge
   * semantics as the Symmetry import, but the ids are row identity rather than
   * content, so editing a weight in the sheet and re-importing REPLACES the
   * stale row instead of adding a second copy of the same set. Rows already in
   * the log are dropped on content first, which is what makes importing the CSV
   * after the older Symmetry JSON safe.
   */
  const importOwnerLog = useCallback(
    async (file: File): Promise<{ ok: boolean; message: string }> => {
      const plan = await planOwnerLog(file);
      if (!plan.ok) {
        return { ok: false, message: t(plan.errorKey) };
      }
      const nextSets = mergeById(sets, plan.sets);
      const nextSessions = mergeById(sessions, plan.sessions);
      await saveSetsMany(nextSets);
      await saveSessionsMany(nextSessions);
      setSets(nextSets);
      setSessions(nextSessions);
      return {
        ok: true,
        message: tInterp("ownerlog.imported", {
          sessions: plan.report.sessions,
          sets: plan.report.sets,
          duplicates: plan.report.duplicates,
          skipped: plan.report.skippedNoId + plan.report.skippedBadRow,
        }),
      };
    },
    [planOwnerLog, sets, sessions, saveSetsMany, saveSessionsMany],
  );

  /**
   * Load the sample history.
   *
   * Built in memory and handed to `importBackup` as a `File`, so the demo takes
   * the *same* code path as a restore the owner performs by hand. A demo that
   * wrote to IndexedDB directly would eventually demonstrate a different app
   * from the one that ships.
   */
  const loadDemoData = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const backup = buildDemoBackup();
    const file = new File([JSON.stringify(backup)], "traininglab-demo.json", {
      type: "application/json",
    });
    const result = await importBackup(file);
    if (!result.ok) return result;
    return {
      ok: true,
      message: tInterp("demo.loaded", { n: backup.sets.length }),
    };
  }, [importBackup]);

  /**
   * Remove the sample history.
   *
   * Sets and sessions live in their own object stores and `save*Many` is a `put`
   * loop, so writing the filtered arrays back would leave the excluded rows on
   * disk — the deletion has to be explicit. (`health` is a single array in the
   * meta store, where writing the filtered list *is* the removal.)
   *
   * The filter is by id prefix and nothing else: every id `lib/demo.ts` mints
   * starts with `demo-`, so this can never touch a series the owner logged.
   */
  const clearDemoData = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    const demoSetIds = sets.filter((s) => isDemoId(s.id)).map((s) => s.id);
    const demoSessionIds = sessions
      .filter((s) => isDemoId(s.id))
      .map((s) => s.id);
    const nextSets = sets.filter((s) => !isDemoId(s.id));
    const nextSessions = sessions.filter((s) => !isDemoId(s.id));
    const nextHealth = health.filter((h) => !isDemoId(h.id));

    await deleteSetsMany(demoSetIds);
    await deleteSessionsMany(demoSessionIds);
    await saveHealthRecords(nextHealth);

    setSets(nextSets);
    setSessions(nextSessions);
    setHealth(nextHealth);

    return {
      ok: true,
      message: tInterp("demo.removed", { n: demoSetIds.length }),
    };
  }, [sets, sessions, health]);

  const handleFile = useCallback(
    async (file: File) => {
      setLoadError(null);
      try {
        const parsed: unknown = JSON.parse(await file.text());
        if (!isV2Payload(parsed)) {
          setLoadError(t("setup.loadError"));
          return;
        }
        setPayload(parsed);
        await savePayload(parsed);
        if (settings) applySettings({ ...settings, sourcePath: file.name });
      } catch {
        setLoadError(t("setup.loadError"));
      }
    },
    [settings, applySettings],
  );

  // ── Derived planning state ──────────────────────────────────────────────
  const logStats = useMemo(() => familyLogStats(sets), [sets]);
  const todayPrefix = todayKey();

  /**
   * The log as the *planner* should see it: everything except today's sets.
   *
   * Why the exclusion and not "freeze the session": a session is a promise the
   * app already made, and today's own work must not rewrite it. When today's
   * sets fed `buildTodayPlan`, every logged set re-planned the day and the user
   * mid-workout watched the current exercise change under their hands (audited:
   * two rows alternating after each set). Today's work reaches the planner
   * tomorrow, which is also when it can inform anything.
   */
  const planningSets = useMemo(
    () => sets.filter((s) => localDayKey(s.timestamp) !== todayPrefix),
    [sets, todayPrefix],
  );
  const planningStats = useMemo(
    () => familyLogStats(planningSets),
    [planningSets],
  );

  // A day he authored in Semana *is* the automatic focus of today: his design
  // drives the planner unless he explicitly picks another focus in the bar
  // (a non-empty `dayFocus` always wins — his live choice beats his weekly one).
  const weekOverrides = settings?.weekOverrides;
  const customFocus: MuscleFamily[] = useMemo(() => {
    const o = weekOverrides?.[(new Date().getDay() + 6) % 7];
    return o && o.kind === "train" ? o.families : [];
  }, [weekOverrides]);

  const plan: TodayPlan | null = useMemo(() => {
    if (!settings) return null;
    return buildTodayPlan({
      inventory: settings.inventory,
      readiness,
      timeBudgetMin: settings.timeBudgetMin,
      level: settings.level,
      goal: settings.goal,
      logStats: planningStats,
      model: settings.useDecisionModel ? model : emptyModel(),
      payload,
      // The user's own sore list, plus the window the log derives (recovery.ts).
      sets: planningSets,
      fatiguedFamilies: soreFamilies,
      focusFamilies: dayFocus.length > 0 ? dayFocus : customFocus,
    });
  }, [
    settings,
    readiness,
    planningStats,
    planningSets,
    model,
    payload,
    soreFamilies,
    dayFocus,
    customFocus,
  ]);

  /**
   * This week — horizontalised plan. Recomputed only when the inputs that
   * change the week change (not on every logged set; `logStats.weeklyVolume`
   * is the week's own ledger, so it is the one part that does flow through).
   */
  const weekPlan: WeekPlan | null = useMemo(() => {
    if (!settings) return null;
    const jsDay = new Date().getDay();
    const todayIndex = (jsDay + 6) % 7;
    const auto = buildWeekPlan({
      inventory: settings.inventory,
      readiness,
      timeBudgetMin: settings.timeBudgetMin,
      level: settings.level,
      goal: settings.goal,
      logStats,
      payload,
      daysPerWeek: settings.daysPerWeek ?? 4,
      todayIndex,
      lang: settings.language,
    });
    // His authored days sit over the generated week and survive every
    // regeneration; clearing one is only ever an explicit user action.
    return applyWeekOverrides(
      auto,
      settings.weekOverrides,
      settings.timeBudgetMin,
    );
    // weekSeed only forces a recompute; it is not read inside on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, readiness, logStats, payload, weekSeed]);

  /** Estimated stress of the merged week (auto rows + his authored days). */
  const weekStress: WeekStress | null = useMemo(
    () => (weekPlan ? computeWeekStress(weekPlan.rows) : null),
    [weekPlan],
  );

  /**
   * Deterministic rows with the user's swaps, the coach's plan, the rep
   * overrides and **his own sequence** applied — in that order, each one
   * speaking over the last.
   *
   * The sequence goes last, and last is the whole point (2026-10-11): the plan is
   * rebuilt whenever anything it depends on moves — a readiness tick, a gear
   * change, a shorter time budget, the decision model learning — and a rebuild
   * used to shuffle the session back into the generator's order. Sorting here,
   * after every source of rows, is what makes "the order I dragged" survive both
   * a re-plan and a restart, whichever of those sources produced the row list.
   */
  const rows: PlannedRow[] = useMemo(() => {
    const ordered = (next: PlannedRow[]) =>
      settings ? applyRowOrder(settings, next, todayPrefix) : next;
    /**
     * And last of all, the *Posponer* marks (mockup 03): what he pushed to the
     * end of today's session goes there, in the order he pushed it. A derivation
     * like the sequence, never a rewrite of either the plan or `rowOrder`, so
     * taking the mark back restores the position he had chosen himself.
     */
    const aside = (next: PlannedRow[]) =>
      settings ? applyPostponements(settings, next, todayPrefix) : next;
    /**
     * The exercises added by hand (the agent's `add_exercise`, and one day the
     * button that adds from the library) go in last, before the sequence: they
     * are not the engine's rows, so a re-plan must not drop them, and an
     * exercise the plan already schedules is never duplicated by them.
     */
    const withAdded = (next: PlannedRow[]) => {
      if (addedRows.length === 0) return next;
      const present = new Set(next.map((row) => row.exerciseId));
      const extra = addedRows.filter(({ row }) => !present.has(row.exerciseId));
      if (extra.length === 0) return next;
      const head = extra.filter((e) => e.atStart).map((e) => e.row);
      const tail = extra.filter((e) => !e.atStart).map((e) => e.row);
      return [...head, ...next, ...tail];
    };
    if (coachRows) {
      return aside(ordered(withAdded(applyRepOverrides(settings!, coachRows))));
    }
    if (!plan || !settings) return [];
    const swapped: PlannedRow[] = plan.rows.map((row) => {
      const to = overrides[row.exerciseId];
      if (!to) return row;
      const entry = plan.usable.find((u) => u.exercise.id === to);
      if (!entry) return row;
      return {
        ...row,
        exerciseId: entry.exercise.id,
        name: entry.exercise.name,
        pattern: entry.traits.pattern,
        families: entry.families,
        progression: entry.traits.progression,
        loadType: entry.traits.loadType,
        unilateral: entry.traits.unilateral,
        jointStress: entry.traits.jointStress,
        spineLoad: entry.traits.spineLoad,
        reasons: [{ code: "swapped" }],
      };
    });
    return aside(ordered(withAdded(applyRepOverrides(settings, swapped))));
  }, [plan, overrides, coachRows, settings, todayPrefix, addedRows]);

  /**
   * What the user set aside today (mockup 03's *Saltar* / *Posponer*): ids only,
   * because both gestures are marks over the plan — the row keeps its
   * prescription, its position and its place in the week (see `lib/settings`).
   */
  const sessionAside = useMemo(
    () => sessionAsideFor(settings, todayPrefix),
    [settings, todayPrefix],
  );

  useEffect(() => {
    // `settings` is the first thing hydration resolves, so a non-null value
    // means the store is populated rather than mid-load; the debounce then
    // swallows the rest of the hydration writes into a single snapshot.
    if (!settings) return;
    void scheduleAutobackup({
      sets,
      sessions,
      health,
      settings,
      decisionModel: model,
      mirror: {
        date: todayPrefix,
        readiness,
        plan: rows
          .filter((r) => r.cardioMin === undefined)
          .map((r) => ({
            exerciseId: r.exerciseId,
            sets: r.sets,
            repsMin: r.repsMin,
            repsMax: r.repsMax,
            rir: r.rir,
            restSec: r.restSec,
            pattern: r.pattern,
            families: r.families,
          })),
      },
    });
  }, [sets, sessions, health, settings, model, readiness, rows, todayPrefix]);

  // Working sets only: the warm-up ramp lives in the log but is invisible to
  // every aggregate (volume, counters, finish gate) by contract.
  const todaySets = useMemo(
    () =>
      sets.filter((s) => localDayKey(s.timestamp) === todayPrefix && !s.warmup),
    [sets, todayPrefix],
  );
  const todayVolume = useMemo(
    () =>
      todaySets.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0),
    [todaySets],
  );
  const plannedMinutes = rows.reduce((acc, r) => acc + r.minutes, 0);
  const totalSetsToday = todaySets.length;

  const prFor = useCallback(
    (exerciseId: string) =>
      payload?.personalRecords?.find((p) => p.exerciseId === exerciseId) ??
      null,
    [payload],
  );

  const swapOptionsFor = useCallback(
    (exerciseId: string) => (plan ? swapOptions(plan, exerciseId) : []),
    [plan],
  );

  /**
   * The multi-day verdict, in app vocabulary (2026-10-13).
   *
   * It reads the row the owner is actually looking at — his swapped exercise,
   * the coach's plan, his own rep override, his gear — and hands the log to
   * `lib/progression.ts` through `progressionAdviceFor`. Today's sets are
   * excluded on purpose: within a day the load belongs to the D/F mark
   * (`lib/set-proposal.ts`), and a second opinion about the same bar would be
   * two answers where the owner needs one.
   */
  const progressionFor = useCallback(
    (exerciseId: string): ProgressionAdvice | null => {
      if (!settings) return null;
      const row = rows.find((r) => r.exerciseId === exerciseId);
      if (!row || row.cardioMin !== undefined) return null;
      return progressionAdviceFor({
        exerciseId,
        loadType: row.loadType,
        progressionAxes: row.progression,
        // `rows` already carries the user's rep override (applyRepOverrides).
        targetReps: { min: row.repsMin, max: row.repsMax },
        sets,
        inventory: settings.inventory,
        excludeDay: todayPrefix,
      });
    },
    [settings, rows, sets, todayPrefix],
  );

  /**
   * Reps-per-set, decided by the user (2026-09-29 e): persists into settings
   * so the override survives reloads, and flows back into `rows` (Inicio and
   * ZEN read the same numbers) without ever touching the plan engine.
   */
  const setRepRange = useCallback(
    (exerciseId: string, range: { min: number; max: number } | null) => {
      if (!settings) return;
      patch(withRepOverride(settings, exerciseId, range));
    },
    [settings, patch],
  );

  // ── Logging ─────────────────────────────────────────────────────────────
  /** How the celebration banner describes a beaten record. */
  const describeRecord = useCallback((event: RecordEvent): string => {
    /*
     * Four currencies, four sentences (2026-10-13): kilos for a load or an
     * estimated 1RM, **reps** for bodyweight work and **seconds** for a hold.
     * The number is what the mark is, so the format follows the kind rather than
     * being assumed to be kilos.
     */
    const value =
      event.kind === "reps"
        ? tInterp("cue.valueReps", { n: event.value })
        : event.kind === "hold"
          ? tInterp("cue.valueHold", { sec: event.value })
          : `${event.value} kg`;
    if (event.previous === null) return tInterp("cue.firstMark", { v: value });
    const previous =
      event.kind === "reps"
        ? tInterp("cue.valueReps", { n: event.previous })
        : event.kind === "hold"
          ? tInterp("cue.valueHold", { sec: event.previous })
          : `${event.previous} kg`;
    switch (event.kind) {
      case "weight":
        return tInterp("cue.beatWeight", { v: value, prev: previous });
      case "e1rm":
        return tInterp("cue.beatE1rm", { v: value, prev: previous });
      case "reps":
        return tInterp("cue.beatReps", { v: value, prev: previous });
      case "hold":
        return tInterp("cue.beatHold", { v: value, prev: previous });
    }
  }, []);

  /**
   * Log one set. `weight` is always **kg** — the screens convert from the
   * display unit before calling, so the maths never sees a pound.
   *
   * `opts.effort` is the `D`/`F` badge the owner logs his sets with, structured
   * here so the recovery, progression and weekly-volume models can read it
   * instead of parsing a note.
   */
  const addSet = useCallback(
    (
      row: PlannedRow,
      weight: number | null,
      reps: number | null,
      opts?: {
        warmup?: boolean;
        rpe?: number;
        effort?: EffortMarker;
        durationSec?: number;
        notes?: string;
        /** When the work happened, when an agent says so (`occurred_at`).
         *  Validation already proved it falls on today, so the set stays in
         *  today's session and the day key it carries is the right one. */
        occurredAt?: string;
      },
    ): TLSet => {
      const set: TLSet = {
        id: crypto.randomUUID(),
        exerciseId: row.exerciseId,
        dayId: `day-${todayPrefix}`,
        timestamp: opts?.occurredAt ?? new Date().toISOString(),
        weight,
        reps,
        ...(opts?.durationSec !== undefined
          ? { durationSec: opts.durationSec }
          : {}),
        ...(opts?.warmup ? { warmup: true } : {}),
        ...(opts?.rpe !== undefined ? { rpe: opts.rpe } : {}),
        ...(opts?.effort ? { effort: opts.effort } : {}),
        ...(opts?.notes ? { notes: opts.notes } : {}),
      };
      // Snapshot the exercise's history *before* this set lands, so "previous
      // best" means what it says. Warm-up sets never enter that history: a
      // 50% ramp rep can't be a PR, and the completion math must not see it.
      const before = opts?.warmup
        ? []
        : sets.filter((s) => s.exerciseId === row.exerciseId && !s.warmup);

      setSets((prev) => {
        void saveSet(set);
        return [...prev, set];
      });
      pushSetQuietly(set);
      setFinished(null);
      // Warm-up rests are their own (short) thing — see lib/warmup.ts.
      const restSec = opts?.warmup
        ? Math.min(45, Math.max(30, Math.round((row.restSec || 60) / 3)))
        : row.restSec || 60;
      setRest(startRest(row.exerciseId, restSec, Date.now(), Date.now()));

      // ── Cues ──────────────────────────────────────────────────────────
      // Duration work has no load to beat, so only real sets get a verdict.
      if (row.cardioMin !== undefined) return set;
      // Warm-up sets have no verdicts either: no PR fanfare for a ramp set.
      if (opts?.warmup) return set;

      const previous = mergeMarks(
        marksOf(before),
        importedMarksFor(row.exerciseId),
      );
      const record = detectRecord(previous, weight, reps, {
        durationSec: opts?.durationSec ?? null,
      });
      if (record) {
        // A record outranks the achievement: both can land on the same set, and
        // one unmistakable fanfare beats two overlapping cues.
        celebrate("record", t("cue.record"), describeRecord(record));
      } else if (isExerciseComplete(before.length + 1, row.sets)) {
        celebrate(
          "achievement",
          t("cue.achievement"),
          tInterp("cue.exerciseDone", { name: row.name[getLanguage()] }),
        );
      }
      return set;
    },
    [
      todayPrefix,
      sets,
      importedMarksFor,
      celebrate,
      describeRecord,
      pushSetQuietly,
    ],
  );

  /** Log a whole warm-up ramp as consecutive warm-up sets. */
  const logWarmup = useCallback(
    (row: PlannedRow, steps: { weight: number; reps: number }[]) => {
      for (const step of steps) {
        addSet(row, step.weight, step.reps, { warmup: true });
      }
    },
    [addSet],
  );

  /**
   * Remember one reversible change to a set for its undo window.
   *
   * One entry at a time on purpose: a queue of undos would let a single tap
   * walk back several edits without saying which, and the numbers in the bar
   * always describe exactly what «Deshacer» will do.
   */
  const rememberSetUndo = useCallback((entry: SetUndoEntry) => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setSetUndo(entry);
    undoTimer.current = window.setTimeout(() => {
      setSetUndo(null);
      undoTimer.current = null;
    }, SET_UNDO_MS);
  }, []);

  const removeSet = useCallback(
    (id: string) => {
      // Keep the removed set around long enough for an undo — a mis-tap on a
      // trash icon must not destroy data silently (2026-09-30, P0 audit).
      const target = sets.find((s) => s.id === id) ?? null;
      if (target) rememberSetUndo({ kind: "remove", set: target });
      setSets((prev) => prev.filter((s) => s.id !== id));
      void deleteSet(id);
      // Removing a mistake should also remove it from the household history,
      // otherwise the family view keeps counting a set nobody logged.
      if (settings?.shared.enabled && settings.shared.memberId) {
        const base = normalizeBaseUrl(settings.shared.baseUrl);
        if (base)
          void deleteRemoteSet(base, settings.shared.memberId, id).catch(
            () => {},
          );
      }
    },
    [sets, settings, rememberSetUndo],
  );

  const undoSetChange = useCallback(() => {
    const entry = setUndo;
    if (!entry) return;
    if (undoTimer.current) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setSetUndo(null);
    // Both kinds put one version of the set back — the deleted row, or the
    // numbers the edit overwrote. Filtering first makes it idempotent: undoing
    // an edit twice cannot leave two copies of the same set.
    const restore = entry.kind === "remove" ? entry.set : entry.before;
    // Chronological order, because the list mirrors the log's timeline.
    setSets((prev) =>
      [...prev.filter((s) => s.id !== restore.id), restore].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
      ),
    );
    void saveSet(restore);
    pushSetQuietly(restore);
  }, [setUndo, pushSetQuietly]);

  const editSet = useCallback(
    (
      id: string,
      patch: {
        weight?: number | null;
        reps?: number | null;
        effort?: EffortMarker | null;
      },
    ) => {
      const target = sets.find((s) => s.id === id);
      if (!target) return;
      const updated: TLSet = { ...target };
      if ("weight" in patch) updated.weight = patch.weight ?? null;
      if ("reps" in patch) updated.reps = patch.reps ?? null;
      // `effort: null` removes the field entirely, which is what makes a set
      // plain work again — an empty string would be a third state nobody wants.
      if ("effort" in patch) {
        if (patch.effort) updated.effort = patch.effort;
        else delete updated.effort;
      }
      // Saving the numbers that are already there is not an edit: it must not
      // open an undo window that pretends something was overwritten.
      if (!setEditDiff(target, updated).changed) return;
      setSets((prev) => prev.map((s) => (s.id === id ? updated : s)));
      void saveSet(updated);
      // The household push upserts by set id, so an edit travels like a log.
      pushSetQuietly(updated);
      // The overwritten numbers get the same net as a deletion (2026-10-21):
      // a mistyped load saved over the record must be reversible from the bar.
      rememberSetUndo({ kind: "edit", before: target, after: updated });
    },
    [sets, pushSetQuietly, rememberSetUndo],
  );

  // ── Health records ──────────────────────────────────────────────────────
  const addHealthRecord = useCallback(
    (record: HealthRecord) => {
      setHealth((prev) => {
        const next = [...prev, record];
        void saveHealthRecords(next);
        return next;
      });
      if (settings?.shared.enabled && settings.shared.memberId) {
        const base = normalizeBaseUrl(settings.shared.baseUrl);
        if (base)
          void pushHealth(base, settings.shared.memberId, [record]).catch(
            () => {},
          );
      }
    },
    [settings],
  );

  const removeHealthRecord = useCallback((id: string) => {
    setHealth((prev) => {
      const next = prev.filter((r) => r.id !== id);
      void saveHealthRecords(next);
      return next;
    });
  }, []);

  const setReadinessAndPersist = useCallback((next: Readiness) => {
    setReadiness(next);
    void saveReadiness(next);
  }, []);

  const toggleSoreFamily = useCallback((family: MuscleFamily) => {
    setSoreFamilies((prev) =>
      prev.includes(family)
        ? prev.filter((f) => f !== family)
        : [...prev, family],
    );
  }, []);

  /**
   * Close today's session.
   *
   * `extra` carries sets logged in the SAME tick (an MCP batch): React has not
   * re-rendered yet, so without them `log_set` + `finish_session` in one inbox
   * file would close a session that does not contain the set it was asked to
   * close. UI callers pass nothing.
   */
  const finishSession = useCallback(
    (extra: readonly TLSet[] = []): TLSession | null => {
      const logged = extra.length > 0 ? [...todaySets, ...extra] : todaySets;
      if (rows.length === 0 || logged.length === 0) return null;
      const todaySetIds = logged.map((s) => s.id);
      const session: TLSession = {
        id: crypto.randomUUID(),
        dayId: `day-${todayPrefix}`,
        startedAt: logged[0]!.timestamp,
        completedAt: new Date().toISOString(),
        setIds: todaySetIds,
        readiness,
        budgetMin: settings?.timeBudgetMin,
      };
      void saveSession(session);
      setSessions((prev) => [...prev, session]);
      setFinished(session);

      const volume =
        todayVolume +
        extra.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0);

      // The bell closes the session — the one cue that also fires when the user
      // muted nothing else, because "you are done" is the whole point.
      celebrate(
        "bell",
        t("cue.sessionDone"),
        tInterp("cue.sessionSummary", {
          sets: logged.length,
          vol: Math.round(volume),
        }),
      );

      // ── Fold the outcome back into the local decision model ────────────
      if (settings?.useDecisionModel && plan) {
        const usedPatterns = new Set(rows.map((r) => r.pattern));
        let next = model;
        for (const row of rows) {
          if (row.cardioMin !== undefined) continue;
          const rowSets = logged.filter((s) => s.exerciseId === row.exerciseId);
          if (rowSets.length === 0) continue;
          const reps = rowSets.map((s) => s.reps ?? 0).filter((n) => n > 0);
          if (reps.length === 0) continue;
          const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;
          const reward = rewardFromOutcome({
            avgReps,
            repsMin: row.repsMin,
            repsMax: row.repsMax,
            setsDone: rowSets.length,
            setsPrescribed: row.sets,
          });
          const entry = plan.usable.find(
            (u) => u.exercise.id === row.exerciseId,
          );
          if (!entry) continue;
          const features = featuresFor(entry, {
            weakness: plan.weakness,
            logStats,
            readiness,
            level: settings.level,
            usedPatterns,
          });
          next = updateModel(next, features, row.exerciseId, reward);
        }
        if (next.updates !== model.updates) {
          setModel(next);
          void saveDecisionModel(next);
        }
      }
      return session;
    },
    [
      rows,
      todaySets,
      todayVolume,
      todayPrefix,
      readiness,
      settings,
      plan,
      model,
      logStats,
      celebrate,
    ],
  );

  const removeSession = useCallback(
    (id: string, opts?: { deleteSets?: boolean }) => {
      const target = sessions.find((s) => s.id === id);
      if (!target) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      void deleteSession(id);

      if (opts?.deleteSets && target.setIds.length > 0) {
        const idSet = new Set(target.setIds);
        setSets((prev) => prev.filter((s) => !idSet.has(s.id)));
        void deleteSetsMany(target.setIds);
      }
    },
    [sessions],
  );

  const editSession = useCallback((id: string, patch: Partial<TLSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
    void dbUpdateSession(id, patch);
  }, []);

  // Ctrl+Enter finishes the session (keyboard contract, kept from F1)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        finishSession();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishSession]);

  /**
   * Add one exercise to today's session (MCP `add_exercise`, 2026-10-13).
   *
   * `sets: 0` is the honest default and means **no prescription**: nobody said
   * how many series, so the first one logged must not read as "exercise
   * complete". `atStart` is the caller's wish for the position; the user's own
   * sequence, applied last, still has the final word over the order.
   */
  const addExerciseToToday = useCallback(
    (
      exerciseId: string,
      opts?: {
        sets?: number;
        atStart?: boolean;
        /** The common prescription of "Añadir varios" (mockup 02). */
        repsMin?: number;
        repsMax?: number;
        restSec?: number;
        rir?: number;
      },
    ): boolean => {
      const entry = plannerCatalog().find((e) => e.exercise.id === exerciseId);
      if (!entry) return false;
      if (rows.some((row) => row.exerciseId === exerciseId)) return false;
      const sets = Math.max(0, Math.min(12, Math.round(opts?.sets ?? 0)));
      // The prescription a caller can carry is the page's own three fields, and
      // each is clamped to what the planner itself would emit: a bulk-add must
      // not be able to write 0 rest or a 99-rep range into the session.
      const clamp = (
        n: number | undefined,
        min: number,
        max: number,
        at: number,
      ) => Math.max(min, Math.min(max, Math.round(n ?? at)));
      const repsMin = clamp(opts?.repsMin, 1, 30, 8);
      const repsMax = Math.max(repsMin, clamp(opts?.repsMax, 1, 30, 12));
      const restSec = clamp(opts?.restSec, 15, 600, 60);
      const rir = clamp(opts?.rir, 0, 5, 2);
      const row: PlannedRow = {
        exerciseId,
        name: entry.exercise.name,
        pattern: entry.traits.pattern,
        families: entry.families,
        progression: entry.traits.progression,
        loadType: entry.traits.loadType,
        unilateral: entry.traits.unilateral,
        sets,
        repsMin,
        repsMax,
        rir,
        restSec,
        minutes: entry.traits.setupMin + 4,
        reasons: [],
        jointStress: entry.traits.jointStress,
        spineLoad: entry.traits.spineLoad,
      };
      setAddedRows((prev) => [
        ...prev.filter((e) => e.row.exerciseId !== exerciseId),
        { row, atStart: opts?.atStart === true },
      ]);
      return true;
    },
    [rows],
  );

  /** Take a hand-added row back out (its own undo, and the row's X one day). */
  const removeAddedRow = useCallback((exerciseId: string) => {
    setAddedRows((prev) => prev.filter((e) => e.row.exerciseId !== exerciseId));
  }, []);

  /** Which rows of `rows` came from the user's own hand (mockup 02's Quitar). */
  const addedToday = useMemo(
    () => addedRows.map((entry) => entry.row.exerciseId),
    [addedRows],
  );

  /* ══ Routine templates (mockup 06) ════════════════════════════════════════
   * Stored inside `settings` rather than in a new object store: every existing
   * backup already carries settings, so a template survives an export, a
   * restore and the automatic autobackup without a `DB_VERSION` bump — and the
   * sanitizer in `lib/routines.ts` runs on both ends.
   */
  const routines = useMemo(
    () => normalizeRoutines(settings?.routines),
    [settings?.routines],
  );

  const saveRoutine = useCallback(
    (input: {
      id?: string;
      name: string;
      notes?: string;
      items: RoutineItem[];
    }): Routine | null => {
      if (!settings) return null;
      const now = new Date();
      const existing = routines.find((entry) => entry.id === input.id);
      const stored = existing
        ? normalizeRoutine({
            ...existing,
            name: input.name,
            notes: input.notes,
            items: input.items,
            updatedAt: now.toISOString(),
          })
        : makeRoutine(input.name, input.items, now, input.notes);
      if (!stored) return null;
      patch({ routines: upsertRoutine(routines, stored) });
      return stored;
    },
    [settings, routines, patch],
  );

  const deleteRoutine = useCallback(
    (id: string) => {
      if (!settings) return;
      patch({ routines: removeRoutine(routines, id) });
    },
    [settings, routines, patch],
  );

  const applyRoutineToday = useCallback(
    (routine: Routine): number => {
      let added = 0;
      for (const item of routine.items) {
        const ok = addExerciseToToday(item.exerciseId, {
          sets: item.sets,
          repsMin: item.repsMin,
          repsMax: item.repsMax,
          restSec: item.restSec,
          rir: item.rir,
        });
        if (ok) added += 1;
      }
      return added;
    },
    [addExerciseToToday],
  );

  /**
   * Move one set's own hour (`set_set_time`).
   *
   * Only `timestamp` changes: the weight, the reps and the effort are facts the
   * owner recorded, and a correction of the clock must not touch them. `dayId`
   * is deliberately left alone — validation proved the new instant is still
   * today, so the set stays exactly where it was (the day key is what the plan
   * and the finish gate read).
   */
  const setSetTime = useCallback((setId: string, timestamp: string) => {
    setSets((prev) =>
      prev.map((set) => {
        if (set.id !== setId) return set;
        const next: TLSet = { ...set, timestamp };
        void saveSet(next);
        return next;
      }),
    );
  }, []);

  /**
   * Put back a session an agent deleted (the undo of `delete_session`).
   *
   * Sets are restored only when they were taken out with it, and merging by id
   * makes the call idempotent: undoing twice cannot duplicate a set.
   */
  const restoreSession = useCallback(
    (session: TLSession, removedSets: readonly TLSet[] = []) => {
      setSessions((prev) =>
        prev.some((s) => s.id === session.id) ? prev : [...prev, session],
      );
      void saveSession(session);
      if (removedSets.length === 0) return;
      setSets((prev) => {
        const known = new Set(prev.map((s) => s.id));
        const add = removedSets.filter((s) => !known.has(s.id));
        if (add.length === 0) return prev;
        void saveSetsMany(add);
        return [...prev, ...add];
      });
    },
    [],
  );

  const swapRow = useCallback(
    (from: string, to: string) => {
      setCoachRows(null);
      setOverrides((prev) => ({ ...prev, [from]: to }));
      // A swap replaces what sits in a slot without moving the slot: when the
      // user has his own sequence, the new exercise inherits the position of the
      // one it replaced instead of dropping to the end of the list (2026-10-11).
      if (!settings) return;
      const next = withRowOrderSwap(settings, todayPrefix, from, to);
      if (next !== settings) patch(next);
    },
    [settings, patch, todayPrefix],
  );

  /*
   * The rest has three verbs and no state of its own: every one of them is a
   * pure rewrite of the deadline (`lib/rest.ts`), so the session card and the
   * floating overlay see the same number at the same instant.
   */
  const extendRest = useCallback((seconds: number) => {
    setRest((current) => (current ? extendRestState(current, seconds) : null));
  }, []);

  const toggleRestPause = useCallback(() => {
    setRest((current) =>
      current ? toggleRestPauseState(current, Date.now()) : null,
    );
  }, []);

  const skipRest = useCallback(() => setRest(null), []);

  /**
   * Move one exercise of today's session (mockup 03: the list drags).
   *
   * `from`/`to` are positions in the session the user is looking at — the very
   * `rows` array every screen renders — so the drop lands where he dropped it
   * and the plan engine is never asked to guess. Persisted into settings, which
   * means the sequence survives a reload, a re-plan and a restart.
   */
  const moveRow = useCallback(
    (from: number, to: number) => {
      if (!settings) return;
      const ids = rows.map((row) => row.exerciseId);
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= ids.length ||
        to >= ids.length
      ) {
        return;
      }
      const moved = ids.splice(from, 1)[0]!;
      ids.splice(to, 0, moved);
      patch(withRowOrder(settings, todayPrefix, ids));
    },
    [settings, rows, patch, todayPrefix],
  );

  /** Back to the generator's own sequence — the list's explicit way out. */
  const resetRowOrder = useCallback(() => {
    if (!settings) return;
    patch(clearRowOrder(settings));
  }, [settings, patch]);

  /** True when today's session is in a sequence the user set himself. */
  const orderIsCustom = rowOrderFor(settings, todayPrefix) !== null;

  /*
   * The two escape hatches of the session's top bar (mockup 03). Neither touches
   * the plan: *Saltar* leaves the exercise prescribed and out of the way, and
   * *Posponer* moves it to the end of today's session and nothing else. Both are
   * date-keyed marks in settings, so both expire with the day and both are undone
   * by deleting one id — which is what makes the two buttons safe to tap.
   */
  const skipRow = useCallback(
    (exerciseId: string) => {
      if (!settings) return;
      patch(withRowSkip(settings, todayPrefix, exerciseId));
    },
    [settings, patch, todayPrefix],
  );

  const unskipRow = useCallback(
    (exerciseId: string) => {
      if (!settings) return;
      patch(withRowSkip(settings, todayPrefix, exerciseId, false));
    },
    [settings, patch, todayPrefix],
  );

  const postponeRow = useCallback(
    (exerciseId: string) => {
      if (!settings) return;
      patch(withRowPostpone(settings, todayPrefix, exerciseId));
    },
    [settings, patch, todayPrefix],
  );

  const unpostponeRow = useCallback(
    (exerciseId: string) => {
      if (!settings) return;
      patch(withRowPostpone(settings, todayPrefix, exerciseId, false));
    },
    [settings, patch, todayPrefix],
  );

  /** Take a swap back (the undo token of an MCP `swap_exercise`): the swap is
   *  an override keyed by the *original* slot, so undoing is deleting that key
   *  rather than swapping again — a reverse swap would leave a dangling entry
   *  for an exercise today's plan never contained. */
  const clearSwap = useCallback((from: string) => {
    setCoachRows(null);
    setOverrides((prev) => {
      if (!(from in prev)) return prev;
      const next = { ...prev };
      delete next[from];
      return next;
    });
  }, []);

  const clearCoach = useCallback(() => {
    setCoachRows(null);
    setOverrides({});
  }, []);

  const resetModel = useCallback(() => {
    const fresh = emptyModel();
    setModel(fresh);
    void saveDecisionModel(fresh);
  }, []);

  const regenerateWeek = useCallback(() => setWeekSeed((s) => s + 1), []);

  const setWeekOverride = useCallback(
    (index: number, override: WeekDayOverride | null) => {
      if (!settings) return;
      const next: Record<number, WeekDayOverride> = {
        ...(settings.weekOverrides ?? {}),
      };
      if (override === null) delete next[index];
      else next[index] = override;
      patch({ weekOverrides: next });
    },
    [settings, patch],
  );

  /**
   * Drag a day onto another (Semana). The pure swap lives in
   * `lib/week-swap.ts`; this callback only writes the owner's layer.
   */
  const swapWeekDays = useCallback(
    (from: number, to: number) => {
      if (!settings || !weekPlan) return false;
      const next = swapPlanDays(weekPlan, settings.weekOverrides, from, to);
      if (!next) return false;
      patch({ weekOverrides: next });
      return true;
    },
    [settings, weekPlan, patch],
  );

  // ── The optional local coach ────────────────────────────────────────────
  // ── MCP ACTIONS — the inbox a local model writes to ──────────────────────
  //
  // docs/MCP_TOOL_SURFACE.md, decisions D1/D4: the host takes the pending file
  // (one narrow Rust command), every action is validated against the same rules
  // the UI enforces, applied through these very callbacks, and answered with a
  // receipt written back to `mcp-results.json`. The IndexedDB ledger is the only
  // thing that decides whether an action runs: an id it has seen is answered
  // with its original receipt and never applied twice.

  /**
   * A row for an exercise today's plan does not contain: an owner can log
   * anything he did, and so can an agent. `sets: 0` means "no prescription",
   * which is what stops the achievement cue from firing for work nobody
   * prescribed — a record still fires, because a record is a fact.
   */
  const mcpRowFor = useCallback(
    (exerciseId: string): PlannedRow | null => {
      const planned = rows.find((r) => r.exerciseId === exerciseId);
      if (planned) return planned;
      const entry = plannerCatalog().find((e) => e.exercise.id === exerciseId);
      if (!entry) return null;
      return {
        exerciseId,
        name: entry.exercise.name,
        pattern: entry.traits.pattern,
        families: entry.families,
        progression: entry.traits.progression,
        loadType: entry.traits.loadType,
        unilateral: entry.traits.unilateral,
        sets: 0,
        repsMin: 8,
        repsMax: 12,
        rir: 2,
        restSec: 60,
        minutes: entry.traits.setupMin + 4,
        reasons: [],
        jointStress: entry.traits.jointStress,
        spineLoad: entry.traits.spineLoad,
      };
    },
    [rows],
  );

  /**
   * Perform one ledger undo operation — the single implementation shared by
   * Ajustes' «Deshacer» button and the agent `undo` action (2026-10-19): an
   * agent that undoes its own swap must run the exact same code path the human
   * does, or the two would drift into two apps.
   */
  const applyUndoOp = useCallback(
    (undo: McpUndoOp) => {
      switch (undo.kind) {
        case "remove_set":
          removeSet(undo.setId);
          break;
        case "remove_session":
          // Reopening keeps the sets: only the session record goes, so the day
          // goes back to being editable without touching what was logged.
          removeSession(undo.sessionId, { deleteSets: false });
          if (finished?.id === undo.sessionId) setFinished(null);
          break;
        case "settings":
          patch(undo.before);
          break;
        case "readiness":
          setReadinessAndPersist(undo.before);
          break;
        case "swap_row":
          clearSwap(undo.from);
          break;
        case "remove_row":
          removeAddedRow(undo.exerciseId);
          break;
        case "remove_rows":
          // `apply_routine`'s undo: every row it poured comes back out.
          for (const exerciseId of undo.exerciseIds) removeAddedRow(exerciseId);
          break;
        case "day_focus":
          setDayFocus([...undo.before]);
          break;
        case "restore_session":
          // Deletion is whole-session, and so is its undo: the record comes
          // back with the sets it took with it (none when they were kept).
          restoreSession(undo.session, undo.sets);
          break;
        case "set_time":
          setSetTime(undo.setId, undo.before);
          break;
        case "decision_model":
          // `reset_model`'s undo: the weights that existed at that instant.
          {
            const restored = undo.before ?? emptyModel();
            setModel(restored);
            void saveDecisionModel(restored);
          }
          break;
        case "week_seed":
          // `regenerate_week`'s undo: the same seed draws the same week.
          setWeekSeed(undo.before);
          break;
      }
    },
    [
      finished,
      removeSet,
      removeSession,
      patch,
      setReadinessAndPersist,
      clearSwap,
      removeAddedRow,
      setDayFocus,
      restoreSession,
      setSetTime,
    ],
  );

  /** Take the pending batch, apply what validates, answer with receipts. */
  const processMcpInbox = useCallback(async () => {
    if (mcpBusy.current || !settings) return;
    mcpBusy.current = true;
    try {
      const text = await takeMcpInbox();
      if (!text) return;

      const { actions, receipts: malformed } = parseMcpInbox(text);
      // Mutable: each applied action updates it, so action N in the same file
      // is validated against the state action N-1 actually produced.
      const ctx: McpContext = {
        now: new Date(),
        settings,
        plannedExerciseIds: rows.map((r) => r.exerciseId),
        // Warm-ups included: `set_set_time` corrects the hour of *anything*
        // logged today, and a warm-up is a set in the log even though no
        // aggregate counts it as work.
        todaySets: sets.filter((s) => localDayKey(s.timestamp) === todayPrefix),
        sessions,
        dayFocus,
        weekDays: weekPlan?.rows ?? [],
        todayPrefix,
        todaySetCount: totalSetsToday,
        finishedToday: finished !== null,
        readiness,
        // 2026-10-19 (second round): `undo` reaches only this caller's own,
        // still-undoable tokens; `reset_model` and `regenerate_week` carry
        // their restore in the validation.
        undoable: mcpLedgerRef.current.filter(canUndo).map((entry) => ({
          id: entry.id,
          origin: entry.origin,
          type: entry.type,
        })),
        model,
        weekSeed,
      };
      /** Settings written by this batch: N actions collapse into ONE write. */
      let settingsNext: TLSettingsData | null = null;
      /** Sets logged in this batch — not in React state yet (see finishSession). */
      const batchSets: TLSet[] = [];

      const { receipts, fresh } = runMcpActions({
        actions,
        malformed,
        ctx,
        ledger: mcpLedgerRef.current,
        apply: (action, validation) => {
          if (!validation.ok) return;
          if (validation.settingsPatch) {
            settingsNext = {
              ...(settingsNext ?? settings),
              ...validation.settingsPatch,
            };
          }

          switch (action.type) {
            case "undo": {
              const token = String(action.params.undo_token ?? "");
              const target = mcpLedgerRef.current.find((e) => e.id === token);
              if (!target?.undo || target.undoneAt) {
                // Validation checked the same against the snapshot it got;
                // this is the belt to its pair (the ledger moved in between).
                return {
                  ok: false,
                  rule: "undo_token_unknown",
                  detail: {
                    en: `"${token}" is no longer undoable.`,
                    es: `«${token}» ya no es deshacible.`,
                  },
                };
              }
              applyUndoOp(target.undo);
              const undoneAt = new Date().toISOString();
              const marked = mcpLedgerRef.current.map((e) => {
                if (e.id !== token) return e;
                const clone: McpLedgerEntry = { ...e, undoneAt };
                delete clone.undo;
                return clone;
              });
              mcpLedgerRef.current = marked;
              setMcpLedger(marked);
              void saveMcpLedger(marked);
              return { ok: true };
            }

            case "apply_routine": {
              // Read from the batch's own settings, not the memo: a file that
              // saves a routine and pours it in the next action must see the
              // routine it just wrote (validation advances ctx the same way).
              const stored = normalizeRoutines(
                (settingsNext ?? settings)?.routines,
              );
              const routine = stored.find(
                (entry) => entry.id === String(action.params.routine_id ?? ""),
              );
              if (!routine) {
                return {
                  ok: false,
                  rule: "unknown_routine",
                  detail: {
                    en: "That routine no longer exists.",
                    es: "Esa rutina ya no existe.",
                  },
                };
              }
              const added = applyRoutineToday(routine);
              if (added === 0) {
                return {
                  ok: false,
                  rule: "already_in_session",
                  detail: {
                    en: `Nothing of "${routine.name}" could be added to today's session.`,
                    es: `No se ha podido añadir nada de «${routine.name}» a la sesión de hoy.`,
                  },
                };
              }
              return { ok: true };
            }

            case "reset_model":
              resetModel();
              return { ok: true };

            case "regenerate_week":
              regenerateWeek();
              return { ok: true };

            case "log_set": {
              const exerciseId = String(action.params.exercise_id ?? "");
              const row = mcpRowFor(exerciseId);
              if (!row) {
                // Validation already refused an unknown id; this is the belt to
                // that pair — the app never logs a set it cannot explain.
                return {
                  ok: false,
                  rule: "unknown_exercise",
                  detail: {
                    en: `No exercise with id "${exerciseId}" exists in the catalog.`,
                    es: `No existe ningún ejercicio con id «${exerciseId}» en el catálogo.`,
                  },
                };
              }
              const rawWeight = action.params.weight_kg;
              const weight =
                typeof rawWeight === "number" &&
                Number.isFinite(rawWeight) &&
                rawWeight > 0
                  ? rawWeight
                  : null;
              const set = addSet(row, weight, numOrNull(action.params.reps), {
                ...(typeof action.params.duration_sec === "number"
                  ? { durationSec: action.params.duration_sec }
                  : {}),
                ...(action.params.warmup === true ? { warmup: true } : {}),
                ...(action.params.effort === "D" || action.params.effort === "F"
                  ? { effort: action.params.effort }
                  : {}),
                ...(typeof action.params.notes === "string" &&
                action.params.notes.length > 0
                  ? { notes: action.params.notes }
                  : {}),
                // Validation normalised it and proved it belongs to today.
                ...(validation.occurredAt
                  ? { occurredAt: validation.occurredAt }
                  : {}),
              });
              batchSets.push(set);
              return { ok: true, undo: { kind: "remove_set", setId: set.id } };
            }

            case "finish_session": {
              const session = finishSession(batchSets);
              if (!session) {
                return {
                  ok: false,
                  rule: "nothing_to_finish",
                  detail: {
                    en: "There are no sets logged today, so there is no session to close.",
                    es: "No hay series registradas hoy, así que no hay sesión que cerrar.",
                  },
                };
              }
              return {
                ok: true,
                undo: { kind: "remove_session", sessionId: session.id },
              };
            }

            case "set_readiness":
              if (validation.readiness) {
                setReadinessAndPersist(validation.readiness);
              }
              return { ok: true };

            case "swap_exercise":
              swapRow(
                String(action.params.exercise_id ?? ""),
                String(action.params.replacement_id ?? ""),
              );
              // The undo token comes from the validation (`swap_row`).
              return { ok: true };

            case "add_exercise": {
              const exerciseId = String(action.params.exercise_id ?? "");
              const added = addExerciseToToday(exerciseId, {
                ...(typeof action.params.sets === "number"
                  ? { sets: action.params.sets }
                  : {}),
                atStart: action.params.position === "start",
              });
              if (!added) {
                // Validation already refused these cases; this is the belt to
                // its pair (the plan moved between validate and apply).
                return {
                  ok: false,
                  rule: "unknown_exercise",
                  detail: {
                    en: `"${exerciseId}" could not be added to today's session.`,
                    es: `«${exerciseId}» no se ha podido añadir a la sesión de hoy.`,
                  },
                };
              }
              return { ok: true };
            }

            case "set_day_focus":
              if (validation.dayFocus) setDayFocus(validation.dayFocus);
              return { ok: true };

            case "set_set_time": {
              if (validation.occurredAt) {
                setSetTime(
                  String(action.params.set_id ?? ""),
                  validation.occurredAt,
                );
              }
              return { ok: true };
            }

            case "reorder_row": {
              const exerciseId = String(action.params.exercise_id ?? "");
              const from = rows.findIndex(
                (row) => row.exerciseId === exerciseId,
              );
              const to = Number(action.params.position) - 1;
              if (from < 0 || to < 0 || to >= rows.length) {
                return {
                  ok: false,
                  rule: "not_in_today",
                  detail: {
                    en: `"${exerciseId}" is no longer in today's session.`,
                    es: `«${exerciseId}» ya no está en la sesión de hoy.`,
                  },
                };
              }
              moveRow(from, to);
              return { ok: true };
            }

            case "set_exercise_state": {
              const exerciseId = String(action.params.exercise_id ?? "");
              const state = action.params.state;
              if (state === "skipped") skipRow(exerciseId);
              else if (state === "postponed") postponeRow(exerciseId);
              else {
                // "active" clears both marks, whichever one was set.
                unskipRow(exerciseId);
                unpostponeRow(exerciseId);
              }
              return { ok: true };
            }

            case "reset_order":
              resetRowOrder();
              return { ok: true };

            case "swap_week_days": {
              const from = Number(action.params.from_weekday);
              const to = Number(action.params.to_weekday);
              if (!swapWeekDays(from, to)) {
                return {
                  ok: false,
                  rule: "week_days_unchanged",
                  detail: {
                    en: "Those days no longer have different plans.",
                    es: "Esos días ya no tienen planes distintos.",
                  },
                };
              }
              return { ok: true };
            }

            case "delete_session": {
              const sessionId = String(action.params.session_id ?? "");
              const target = sessions.find((s) => s.id === sessionId);
              if (!target) {
                return {
                  ok: false,
                  rule: "unknown_session",
                  detail: {
                    en: `No session with id "${sessionId}" is in the log.`,
                    es: `No hay ninguna sesión con id «${sessionId}» en el registro.`,
                  },
                };
              }
              const deleteSets = action.params.delete_sets === true;
              // What the undo has to put back: the session, plus its sets when
              // they were taken out with it (`deleteSets: false` leaves them in
              // the log, exactly like the screen's own delete).
              const removedSets = deleteSets
                ? sets.filter((s) => target.setIds.includes(s.id))
                : [];
              removeSession(sessionId, { deleteSets });
              if (finished?.id === sessionId) setFinished(null);
              return {
                ok: true,
                undo: {
                  kind: "restore_session",
                  session: target,
                  sets: removedSets,
                },
              };
            }

            // set_goal / set_level / set_time_budget / set_inventory: the patch
            // was accumulated above and is written once, after the batch.
            default:
              return { ok: true };
          }
        },
      });

      if (settingsNext) applySettings(settingsNext);
      if (fresh.length > 0) {
        const next = trimLedger([...mcpLedgerRef.current, ...fresh]);
        mcpLedgerRef.current = next;
        setMcpLedger(next);
        void saveMcpLedger(next);
      }
      if (receipts.length > 0) await writeMcpResults(receipts);
    } catch {
      // The channel never takes the app down with it: the next tick retries and
      // the ledger still holds every receipt already given.
    } finally {
      mcpBusy.current = false;
    }
  }, [
    settings,
    rows,
    sets,
    sessions,
    dayFocus,
    todayPrefix,
    totalSetsToday,
    finished,
    readiness,
    weekPlan,
    model,
    weekSeed,
    mcpRowFor,
    addSet,
    finishSession,
    setReadinessAndPersist,
    swapRow,
    addExerciseToToday,
    setSetTime,
    removeSession,
    applySettings,
    moveRow,
    skipRow,
    unskipRow,
    postponeRow,
    unpostponeRow,
    resetRowOrder,
    swapWeekDays,
    applyUndoOp,
    applyRoutineToday,
    resetModel,
    regenerateWeek,
  ]);

  // The poller always sees the latest callbacks without re-arming its timer on
  // every keystroke (a new set logged would otherwise restart the interval).
  const mcpProcessRef = useRef(processMcpInbox);
  useEffect(() => {
    mcpProcessRef.current = processMcpInbox;
  }, [processMcpInbox]);

  // Poll on a timer and on focus — the moment an agent is most likely to be
  // waiting for its receipt. Desktop host only: the browser build has no file
  // channel at all, and an action written while the app was closed simply waits
  // in the file for this launch.
  useEffect(() => {
    if (!settings || !isDesktopHost()) return;
    let alive = true;
    const tick = () => {
      if (alive) void mcpProcessRef.current();
    };
    const id = window.setInterval(tick, MCP_POLL_MS);
    window.addEventListener("focus", tick);
    tick();
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [settings]);

  /** Reverse one applied action — Ajustes → auditoría de agentes (D4). */
  const undoMcpAction = useCallback(
    async (id: string) => {
      const entry = mcpLedgerRef.current.find((e) => e.id === id);
      if (!entry || !canUndo(entry) || !entry.undo) return;
      applyUndoOp(entry.undo);
      const undoneAt = new Date().toISOString();
      const next = mcpLedgerRef.current.map((e) => {
        if (e.id !== id) return e;
        const clone: McpLedgerEntry = { ...e, undoneAt };
        delete clone.undo;
        return clone;
      });
      mcpLedgerRef.current = next;
      setMcpLedger(next);
      void saveMcpLedger(next);
      await writeMcpResults([receiptOf({ ...entry, undoneAt })]);
    },
    [applyUndoOp],
  );

  const contextCsv = useMemo(() => {
    if (!plan || !settings) return "";
    const weak = Object.entries(plan.weakness)
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .map(([family, score]) => `${family}=${score}`)
      .join("; ");
    const gear = settings.inventory
      .map(
        (i) =>
          `${i.label}${i.maxLoadKg ? ` (max ${i.maxLoadKg}kg, step ${i.incrementKg}kg)` : ""}`,
      )
      .join("; ");
    const volume = Object.entries(logStats.weeklyVolume)
      .map(([f, n]) => `${f}=${n}`)
      .join("; ");
    const planned = rows
      .map(
        (r) =>
          `${r.exerciseId} ${r.sets}x${r.repsMin}-${r.repsMax} rest${r.restSec}`,
      )
      .join(" | ");
    const recent = sets
      .slice(-12)
      .map(
        (s) =>
          `${s.exerciseId},${localDayKey(s.timestamp)},${s.weight ?? ""},${s.reps ?? ""}`,
      )
      .join("\n");
    return [
      `time_budget_min,${settings.timeBudgetMin}`,
      `readiness,energy=${readiness.energy},motivation=${readiness.motivation},freshness=${readiness.soreness}`,
      `goal,${settings.goal}`,
      `level,${settings.level}`,
      `weak_families,${weak || "none"}`,
      // Which room this gear belongs to (2026-10-20): «casa» and «gimnasio» are
      // different inventories, and a coach that is told the gear but not the
      // room cannot explain why the same day looks different in each.
      `gear_profile,${activeGearName(settings) ?? "unnamed"}`,
      `equipment,${gear || "bodyweight only"}`,
      `weekly_sets,${volume || "none"}`,
      `deterministic_plan,${planned}`,
      `recovering_families,${plan?.fatigue?.fatigued.join(";") || "none"}`,
      "recent_sets(exercise,date,kg,reps)",
      recent,
    ].join("\n");
  }, [plan, settings, rows, logStats, sets, readiness]);

  const askCoach = useCallback(
    async (request: string) => {
      if (!settings || !plan) return;
      setCoachBusy(true);
      setCoachResult(null);
      const usableIds = new Set(plan.usable.map((u) => u.exercise.id));
      const executor = async (name: string, args: Record<string, unknown>) => {
        switch (name) {
          case "get_context":
            return {
              timeBudgetMin: settings.timeBudgetMin,
              readiness,
              goal: settings.goal,
              level: settings.level,
              equipment: settings.inventory.map((i) => ({
                label: i.label,
                capabilities: i.capabilities,
                maxLoadKg: i.maxLoadKg,
                incrementKg: i.incrementKg,
              })),
              weakFamilies: Object.entries(plan.weakness)
                .sort((a, b) => (a[1] as number) - (b[1] as number))
                .slice(0, 6),
              bodylabLinked: payload !== null,
              /* The recovery window the log derives — the coach must not have
                 to remember yesterday's work on its own. */
              recoveringFamilies: plan.fatigue?.fatigued ?? [],
              recoveryWindowHours: plan.fatigue?.windowHours ?? null,
              soreFamilies,
            };
          case "get_deterministic_plan":
            return {
              totalMinutes: plan.session.totalMinutes,
              advisories: plan.session.advisories,
              slots: rows.map((r) => ({
                exerciseId: r.exerciseId,
                sets: r.sets,
                repsMin: r.repsMin,
                repsMax: r.repsMax,
                restSec: r.restSec,
                pattern: r.pattern,
              })),
            };
          case "list_available_exercises": {
            const pattern =
              typeof args["pattern"] === "string"
                ? (args["pattern"] as string)
                : null;
            return plan.usable
              .filter((u) => (pattern ? u.traits.pattern === pattern : true))
              .map((u) => ({
                id: u.exercise.id,
                name: u.exercise.name.en,
                pattern: u.traits.pattern,
                loadType: u.traits.loadType,
                hypertrophy: u.exercise.hypertrophy,
                difficulty: u.exercise.difficulty,
                families: u.families,
              }));
          }
          case "get_exercise_history": {
            const id = String(args["exerciseId"] ?? "");
            return sets
              .filter((s) => s.exerciseId === id)
              .slice(-10)
              .map((s) => ({
                date: localDayKey(s.timestamp),
                weight: s.weight,
                reps: s.reps,
              }));
          }
          case "get_progression_verdict":
            /*
             * The multi-day verdict, the same call the session screen and the
             * Inicio card read (`progressionFor`), so a model quoting it cannot
             * contradict what the owner is looking at. Today's sets are out of
             * it on purpose: within a day the D/F mark owns the load. The
             * payload shape lives in `lib/coach-tools.ts`, where it is tested.
             */
            return progressionVerdictTool({
              exerciseId:
                typeof args["exerciseId"] === "string"
                  ? String(args["exerciseId"])
                  : null,
              exerciseIds: rows.map((r) => r.exerciseId),
              adviceFor: progressionFor,
              nameOf: (id) => exerciseName(id),
            });
          case "report_fatigue_and_query_safe": {
            const rawAreas = args["painOrFatigueAreas"];
            const painAreas = Array.isArray(rawAreas)
              ? (rawAreas as string[])
              : [String(rawAreas ?? "")];
            const rawFocus = args["targetFocus"];
            const targetFocus = Array.isArray(rawFocus)
              ? (rawFocus as string[]).map((f) => f.toLowerCase())
              : [];
            const constraint = evaluateBiomechanicsAndFatigue(painAreas);
            const safe = plan.usable.filter((u) => {
              if (
                constraint.contraindicatedPatterns.includes(u.traits.pattern)
              ) {
                return false;
              }
              if (
                constraint.excludeJoints.includes("shoulder") &&
                [
                  "horizontal_push",
                  "vertical_push",
                  "shoulder_flexion",
                  "shoulder_abduction",
                ].includes(u.traits.pattern)
              ) {
                return false;
              }
              if (targetFocus.length > 0) {
                return targetFocus.some(
                  (f) =>
                    u.families.some((fam) => fam.toLowerCase().includes(f)) ||
                    u.exercise.category.toLowerCase().includes(f) ||
                    u.traits.pattern.toLowerCase().includes(f),
                );
              }
              return true;
            });
            return {
              clinicalDiagnosis: constraint.clinicalReason,
              contraindicatedPatterns: constraint.contraindicatedPatterns,
              recommendedPatterns: constraint.recommendedPatterns,
              safeCount: safe.length,
              safeExercises: safe.slice(0, 15).map((u) => ({
                id: u.exercise.id,
                name: u.exercise.name.es || u.exercise.name.en,
                pattern: u.traits.pattern,
                jointStress: u.traits.jointStress,
                families: u.families,
              })),
            };
          }
          case "swap_exercise_safe": {
            const currentId = String(args["currentExerciseId"] ?? "");
            const reason = String(args["reason"] ?? "");
            const alternatives = plan.usable.filter(
              (u) =>
                u.exercise.id !== currentId &&
                ![
                  "horizontal_push",
                  "vertical_push",
                  "shoulder_flexion",
                  "shoulder_abduction",
                ].includes(u.traits.pattern),
            );
            return {
              swappedFrom: currentId,
              reason,
              suggestedAlternatives: alternatives.slice(0, 6).map((u) => ({
                id: u.exercise.id,
                name: u.exercise.name.es || u.exercise.name.en,
                pattern: u.traits.pattern,
                jointStress: u.traits.jointStress,
              })),
            };
          }
          case "propose_session": {
            const check = validateProposal(args, {
              usableIds,
              timeBudgetMin: settings.timeBudgetMin,
              primaryFamilyOf: (id) =>
                plan.usable.find((u) => u.exercise.id === id)?.primary ?? id,
              setupMinOf: (id) =>
                plan.usable.find((u) => u.exercise.id === id)?.traits
                  .setupMin ?? 0,
              familiesOf: (id) =>
                plan.usable.find((u) => u.exercise.id === id)?.families ?? [],
              fatiguedFamilies: [
                ...new Set([
                  ...(plan.fatigue?.fatigued ?? []),
                  ...soreFamilies,
                ]),
              ],
            });
            if (!check.ok) {
              setCoachResult({
                ok: false,
                content: "",
                toolCalls: [],
                errors: check.errors,
              });
              return { accepted: false, errors: check.errors };
            }
            const summary =
              typeof (args as { summary?: unknown }).summary === "string"
                ? String((args as { summary?: unknown }).summary)
                : "";
            const proposed: PlannedRow[] = check.slots.map((slot) => {
              const entry = plan.usable.find(
                (u) => u.exercise.id === slot.exerciseId,
              )!;
              return {
                exerciseId: entry.exercise.id,
                name: entry.exercise.name,
                pattern: entry.traits.pattern,
                families: entry.families,
                progression: entry.traits.progression,
                loadType: entry.traits.loadType,
                unilateral: entry.traits.unilateral,
                sets: slot.sets,
                repsMin: slot.repsMin,
                repsMax: slot.repsMax,
                rir: 2,
                restSec: slot.restSec,
                minutes:
                  Math.round(
                    (entry.traits.setupMin +
                      (slot.sets * (45 + slot.restSec)) / 60) *
                      10,
                  ) / 10,
                reasons: [{ code: "coach", note: slot.note ?? summary }],
                jointStress: entry.traits.jointStress,
                spineLoad: entry.traits.spineLoad,
              };
            });
            setCoachRows(proposed);
            setCoachResult({
              ok: true,
              content: summary,
              toolCalls: [],
              applied: { summary, slots: proposed.length },
              errors: [],
            });
            return {
              accepted: true,
              slots: proposed.length,
              estimatedMinutes: check.estimatedMinutes,
            };
          }
          default:
            return { error: `unknown tool ${name}` };
        }
      };

      const messages: ChatMessage[] = [
        { role: "system" as const, content: buildSystemPrompt() },
        {
          role: "user" as const,
          content: buildUserRequest(request, contextCsv),
        },
      ];
      const result = await chatWithTools({
        settings: settings.llm,
        messages,
        tools: TOOL_SPECS,
        execute: executor,
      });
      setCoachResult((prev) => ({
        ok: result.ok,
        content: result.content || prev?.content || "",
        toolCalls: result.toolCalls,
        applied: prev?.applied,
        errors: result.error ? [result.error] : (prev?.errors ?? []),
      }));
      setCoachBusy(false);
    },
    [
      settings,
      plan,
      rows,
      readiness,
      payload,
      sets,
      contextCsv,
      progressionFor,
    ],
  );

  /** The undo bar's detail line, resolved once with the user's language. */
  const setUndoLabel = setUndo
    ? setUndoLine(
        setUndo,
        exerciseName(setUndoExerciseId(setUndo), getLanguage()),
      )
    : null;

  const value: TrainingLabStore = {
    settings,
    payload,
    sets,
    sessions,
    health,
    model,
    readiness,
    soreFamilies,
    dayFocus,
    loading: !settings || !plan,
    plan,
    weekPlan,
    weekStress,
    rows,
    todaySets,
    todayVolume,
    plannedMinutes,
    totalSetsToday,
    logStats,
    coachResult,
    coachBusy,
    coachRows,
    syncing,
    sharedError,
    loadError,
    finished,
    patch,
    handleFile,
    addSet,
    removeSet,
    editSet,
    setUndo,
    undoSetChange,
    addHealthRecord,
    removeHealthRecord,
    setReadinessAndPersist,
    toggleSoreFamily,
    setDayFocus,
    finishSession,
    removeSession,
    restoreSession,
    editSession,
    swapRow,
    moveRow,
    resetRowOrder,
    orderIsCustom,
    skipRow,
    unskipRow,
    postponeRow,
    unpostponeRow,
    skippedToday: sessionAside.skipped,
    postponedToday: sessionAside.postponed,
    addedToday,
    removeAddedRow,
    addExerciseToToday,
    routines,
    saveRoutine,
    deleteRoutine,
    applyRoutineToday,
    clearCoach,
    resetModel,
    regenerateWeek,
    setWeekOverride,
    swapWeekDays,
    askCoach,
    runSharedSync,
    prFor,
    marksFor,
    progressionFor,
    swapOptionsFor,
    setRepRange,
    logWarmup,
    exportBackup,
    importBackup,
    importSymmetry,
    importOwnerLog,
    previewSymmetry,
    previewOwnerLog,
    loadDemoData,
    clearDemoData,
    rest,
    extendRest,
    toggleRestPause,
    skipRest,
    recoverable,
    restoreAutobackup,
    mcpLedger,
    undoMcpAction,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}

      {/* The visual half of the cues — shown whether or not audio played, so a
          muted device still gets the confirmation. Lives here, not in a screen:
          a record logged in ZEN is announced wherever the user is. */}
      {celebration && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <div
            key={celebration.id}
            className={`tl-card tl-celebration px-4 py-3 flex items-center gap-3 shadow-2xl border-l-4 ${
              celebration.cue === "record"
                ? "border-[var(--tl-warning)]"
                : celebration.cue === "bell"
                  ? "border-[var(--tl-info)]"
                  : "border-[var(--tl-success)]"
            }`}
          >
            <span
              className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                celebration.cue === "record"
                  ? "bg-[color-mix(in_oklab,var(--tl-warning)_16%,transparent)] text-[var(--tl-warning)]"
                  : celebration.cue === "bell"
                    ? "bg-[color-mix(in_oklab,var(--tl-info)_16%,transparent)] text-[var(--tl-info)]"
                    : "bg-[color-mix(in_oklab,var(--tl-success)_16%,transparent)] text-[var(--tl-success)]"
              }`}
            >
              {celebration.cue === "record" ? (
                <Trophy className="w-5 h-5" />
              ) : celebration.cue === "bell" ? (
                <BellRing className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-sm">
                {celebration.title}
              </span>
              <span className="block text-xs text-[var(--tl-text-muted)] truncate">
                {celebration.detail}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Undo for one set — the safety net for a mis-tap on the trash icon and
          for a typo saved over real numbers (2026-10-21). Lives here so it
          follows the user across destinations, like the rest timer, and it says
          *what* comes back: a bare «Deshacer» makes you remember the numbers,
          which is exactly what a tired person cannot do. */}
      {setUndo && setUndoLabel && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-20 z-[55] flex justify-center px-4 pointer-events-none"
        >
          <div className="tl-card px-4 py-2 flex items-center gap-3 shadow-2xl border-l-4 border-[var(--tl-danger)] pointer-events-auto max-w-full">
            <div className="min-w-0">
              <span className="block text-sm text-[var(--tl-text-secondary)]">
                {setUndo.kind === "remove"
                  ? t("log.removed")
                  : t("log.edited")}
              </span>
              {/* Wraps instead of truncating: on a 390 px phone «75 kg × 10 →
                  7 kg × 10» was cut exactly at the arrow, which is the one
                  thing the bar exists to say. */}
              <span
                className="block text-xs text-[var(--tl-text-muted)] break-words"
                data-testid="set-undo-line"
              >
                {setUndoLabel}
              </span>
            </div>
            {/* 44 px of thumb, not 20 px of text: this is the only way back
                from a deletion and it is used one-handed (brief §4). */}
            <button
              type="button"
              onClick={undoSetChange}
              className="text-sm font-semibold text-[var(--tl-accent)] tl-focusable shrink-0 min-h-11 px-2"
            >
              {t("common.undo")}
            </button>
            <button
              type="button"
              onClick={() => setSetUndo(null)}
              aria-label={t("common.close")}
              title={t("common.close")}
              className="grid place-items-center w-11 h-11 -mr-2 text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* The rest must survive navigation: a rest does not stop just because
          the user tapped another destination. Inside the session the same
          deadline is drawn in its Descanso card (mockup 03), so the overlay stays
          away — two views of one rest would be two things to check. */}
      {rest && route.id !== "session" && (
        <RestTimer
          rest={rest}
          variant="floating"
          nextExercise={
            rows.find((r) => r.exerciseId === rest.key)?.name[getLanguage()] ??
            null
          }
          onExtend={extendRest}
          onTogglePause={toggleRestPause}
          onSkip={skipRest}
        />
      )}
    </StoreContext.Provider>
  );
}
