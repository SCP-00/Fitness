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
import { BellRing, Sparkles, Trophy } from "lucide-react";
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
import {
  buildTodayPlan,
  buildWeekPlan,
  familyLogStats,
  featuresFor,
  swapOptions,
  type PlannedRow,
  type TodayPlan,
  type WeekPlan,
} from "../lib/plan";
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
  deleteSet,
  loadDecisionModel,
  loadHealthRecords,
  loadPayload,
  loadReadiness,
  loadSessions,
  loadSettings,
  loadSets,
  normalizeSettings,
  saveDecisionModel,
  saveHealthRecords,
  savePayload,
  saveReadiness,
  saveSession,
  saveSessionsMany,
  saveSet,
  saveSetsMany,
  saveSettings,
} from "../lib/db";
import { buildBackup, mergeById, parseBackup } from "../lib/backup";
import { parseSymmetry } from "../lib/symmetry";
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
import type { CoachResult } from "../features/today/CoachPanel";
import type { TLSession, TLSet, TLSettingsData } from "../lib/types";
import { applyRepOverrides, withRepOverride } from "../lib/settings";
interface RestState {
  key: string;
  seconds: number;
  nonce: number;
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
  /** True until settings and the plan are ready — the screens show a loader. */
  loading: boolean;

  /* ── Derived ─────────────────────────────────────────────────────────── */
  plan: TodayPlan | null;
  weekPlan: WeekPlan | null;
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

  /* ── Actions ─────────────────────────────────────────────────────────── */
  patch: (over: Partial<TLSettingsData>) => void;
  handleFile: (file: File) => Promise<void>;
  addSet: (
    row: PlannedRow,
    weight: number | null,
    reps: number,
    opts?: { warmup?: boolean; rpe?: number },
  ) => void;
  removeSet: (id: string) => void;
  /** Rewrite a logged set's weight (kg) and reps, in place. */
  editSet: (
    id: string,
    patch: { weight: number | null; reps: number | null },
  ) => void;
  /** The last removed set while the undo window is open, else null. */
  removedSet: TLSet | null;
  /** Put the last removed set back (restores it in IndexedDB too). */
  undoRemoveSet: () => void;
  addHealthRecord: (record: HealthRecord) => void;
  removeHealthRecord: (id: string) => void;
  setReadinessAndPersist: (next: Readiness) => void;
  toggleSoreFamily: (family: MuscleFamily) => void;
  finishSession: () => void;
  swapRow: (from: string, to: string) => void;
  clearCoach: () => void;
  resetModel: () => void;
  regenerateWeek: () => void;
  askCoach: (request: string) => Promise<void>;
  runSharedSync: (opts?: { report?: boolean }) => Promise<void>;
  prFor: (
    exerciseId: string,
  ) => NonNullable<ImportPayload["personalRecords"]>[number] | null;
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
  const [settings, setSettings] = useState<TLSettingsData | null>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [sets, setSets] = useState<TLSet[]>([]);
  const [model, setModel] = useState<DecisionModel>(() => emptyModel());
  const [readiness, setReadiness] = useState<Readiness>(NEUTRAL);
  const [soreFamilies, setSoreFamilies] = useState<MuscleFamily[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [rest, setRest] = useState<RestState | null>(null);
  const [finished, setFinished] = useState<TLSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachRows, setCoachRows] = useState<PlannedRow[] | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [removedSet, setRemovedSet] = useState<TLSet | null>(null);
  const undoTimer = useRef<number | null>(null);
  const [sessions, setSessions] = useState<TLSession[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [weekSeed, setWeekSeed] = useState(0);

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
      ] = await Promise.all([
        loadPayload(),
        loadSets(),
        loadSessions(),
        loadDecisionModel(),
        loadReadiness(),
        loadHealthRecords(),
      ]);
      if (cancelled) return;
      if (storedPayload && isV2Payload(storedPayload))
        setPayload(storedPayload);
      setSets(storedSets);
      setSessions(storedSessions);
      setModel(normalizeModel(storedModel));
      setHealth(storedHealth);
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
   */
  const importedMarksFor = useCallback(
    (exerciseId: string) => {
      const pr = payload?.personalRecords?.find(
        (p) => p.exerciseId === exerciseId,
      );
      return {
        bestWeightKg: pr?.bestWeight ?? null,
        bestEst1RmKg: pr?.bestEst1RM ?? null,
      };
    },
    [payload],
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

  /**
   * Merge a backup into this device: union by id for sets, sessions and health
   * records, settings and the learned model only when the file carries them.
   * Nothing is deleted — see `lib/backup.ts` for why a restore must not wipe.
   */
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
   * Symmetry history import. Same merge semantics as the backup restore —
   * deterministic ids make a second import a no-op — but the input is the OCR
   * JSON, not this app's own format, so it goes through `lib/symmetry.ts`.
   * Sets whose exercise has no catalog equivalent are skipped by the converter
   * and surfaced in the message; they are never given an invented id.
   */
  const importSymmetry = useCallback(
    async (file: File): Promise<{ ok: boolean; message: string }> => {
      const parsed = parseSymmetry(await file.text());
      if (!parsed.ok) {
        return {
          ok: false,
          message: t(
            parsed.error === "not-json"
              ? "symmetry.error.file"
              : parsed.error === "no-sessions"
                ? "symmetry.error.empty"
                : "symmetry.error.shape",
          ),
        };
      }
      const nextSets = mergeById(sets, parsed.sets);
      const nextSessions = mergeById(sessions, parsed.sessions);
      await saveSetsMany(nextSets);
      await saveSessionsMany(nextSessions);
      setSets(nextSets);
      setSessions(nextSessions);
      const skipped = parsed.report.skippedNoId + parsed.report.skippedBadRow;
      return {
        ok: true,
        message: tInterp("symmetry.imported", {
          sessions: parsed.report.sessions,
          sets: parsed.report.sets,
          skipped,
        }),
      };
    },
    [sets, sessions],
  );

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
  const todayPrefix = new Date().toISOString().slice(0, 10);

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
  const planningStats = useMemo(
    () =>
      familyLogStats(sets.filter((s) => !s.timestamp.startsWith(todayPrefix))),
    [sets, todayPrefix],
  );

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
      fatiguedFamilies: soreFamilies,
    });
  }, [settings, readiness, planningStats, model, payload, soreFamilies]);

  /**
   * This week — horizontalised plan. Recomputed only when the inputs that
   * change the week change (not on every logged set; `logStats.weeklyVolume`
   * is the week's own ledger, so it is the one part that does flow through).
   */
  const weekPlan: WeekPlan | null = useMemo(() => {
    if (!settings) return null;
    const jsDay = new Date().getDay();
    const todayIndex = (jsDay + 6) % 7;
    return buildWeekPlan({
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
    // weekSeed only forces a recompute; it is not read inside on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, readiness, logStats, payload, weekSeed]);

  /**
   * Deterministic rows with the user's swaps, the coach's plan and the rep
   * overrides applied — in that order, each one speaking over the last.
   */
  const rows: PlannedRow[] = useMemo(() => {
    if (coachRows) return applyRepOverrides(settings!, coachRows);
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
    return applyRepOverrides(settings, swapped);
  }, [plan, overrides, coachRows, settings]);

  // Working sets only: the warm-up ramp lives in the log but is invisible to
  // every aggregate (volume, counters, finish gate) by contract.
  const todaySets = useMemo(
    () => sets.filter((s) => s.timestamp.startsWith(todayPrefix) && !s.warmup),
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
    const value = `${event.value} kg`;
    if (event.previous === null) return tInterp("cue.firstMark", { v: value });
    return event.kind === "weight"
      ? tInterp("cue.beatWeight", { v: value, prev: event.previous })
      : tInterp("cue.beatE1rm", { v: value, prev: event.previous });
  }, []);

  /**
   * Log one set. `weight` is always **kg** — the screens convert from the
   * display unit before calling, so the maths never sees a pound.
   */
  const addSet = useCallback(
    (
      row: PlannedRow,
      weight: number | null,
      reps: number,
      opts?: { warmup?: boolean; rpe?: number },
    ) => {
      const set: TLSet = {
        id: crypto.randomUUID(),
        exerciseId: row.exerciseId,
        dayId: `day-${todayPrefix}`,
        timestamp: new Date().toISOString(),
        weight,
        reps,
        ...(opts?.warmup ? { warmup: true } : {}),
        ...(opts?.rpe !== undefined ? { rpe: opts.rpe } : {}),
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
      setRest({
        key: row.exerciseId,
        seconds: opts?.warmup
          ? Math.min(45, Math.max(30, Math.round((row.restSec || 60) / 3)))
          : row.restSec || 60,
        nonce: Date.now(),
      });

      // ── Cues ──────────────────────────────────────────────────────────
      // Duration work has no load to beat, so only real sets get a verdict.
      if (row.cardioMin !== undefined) return;
      // Warm-up sets have no verdicts either: no PR fanfare for a ramp set.
      if (opts?.warmup) return;

      const previous = mergeMarks(
        marksOf(before),
        importedMarksFor(row.exerciseId),
      );
      const record = detectRecord(previous, weight, reps);
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

  const removeSet = useCallback(
    (id: string) => {
      // Keep the removed set around long enough for an undo — a mis-tap on a
      // trash icon must not destroy data silently (2026-09-30, P0 audit).
      const target = sets.find((s) => s.id === id) ?? null;
      if (target) {
        setRemovedSet(target);
        if (undoTimer.current) window.clearTimeout(undoTimer.current);
        undoTimer.current = window.setTimeout(() => setRemovedSet(null), 8_000);
      }
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
    [sets, settings],
  );

  const undoRemoveSet = useCallback(() => {
    const set = removedSet;
    if (!set) return;
    if (undoTimer.current) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setRemovedSet(null);
    // Re-insert in chronological order: the list mirrors the log's timeline.
    setSets((prev) =>
      [...prev, set].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    );
    void saveSet(set);
    pushSetQuietly(set);
  }, [removedSet, pushSetQuietly]);

  const editSet = useCallback(
    (id: string, patch: { weight: number | null; reps: number | null }) => {
      const target = sets.find((s) => s.id === id);
      if (!target) return;
      const updated: TLSet = {
        ...target,
        weight: patch.weight,
        reps: patch.reps,
      };
      setSets((prev) => prev.map((s) => (s.id === id ? updated : s)));
      void saveSet(updated);
      // The household push upserts by set id, so an edit travels like a log.
      pushSetQuietly(updated);
    },
    [sets, pushSetQuietly],
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

  const finishSession = useCallback(() => {
    if (rows.length === 0 || totalSetsToday === 0) return;
    const todaySetIds = todaySets.map((s) => s.id);
    const session: TLSession = {
      id: crypto.randomUUID(),
      dayId: `day-${todayPrefix}`,
      startedAt: todaySets[0]!.timestamp,
      completedAt: new Date().toISOString(),
      setIds: todaySetIds,
      readiness,
      budgetMin: settings?.timeBudgetMin,
    };
    void saveSession(session);
    setSessions((prev) => [...prev, session]);
    setFinished(session);

    // The bell closes the session — the one cue that also fires when the user
    // muted nothing else, because "you are done" is the whole point.
    celebrate(
      "bell",
      t("cue.sessionDone"),
      tInterp("cue.sessionSummary", {
        sets: todaySets.length,
        vol: Math.round(todayVolume),
      }),
    );

    // ── Fold the outcome back into the local decision model ────────────────
    if (settings?.useDecisionModel && plan) {
      const usedPatterns = new Set(rows.map((r) => r.pattern));
      let next = model;
      for (const row of rows) {
        if (row.cardioMin !== undefined) continue;
        const rowSets = todaySets.filter(
          (s) => s.exerciseId === row.exerciseId,
        );
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
        const entry = plan.usable.find((u) => u.exercise.id === row.exerciseId);
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
  }, [
    rows,
    totalSetsToday,
    todaySets,
    todayVolume,
    todayPrefix,
    readiness,
    settings,
    plan,
    model,
    logStats,
    celebrate,
  ]);

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

  const swapRow = useCallback((from: string, to: string) => {
    setCoachRows(null);
    setOverrides((prev) => ({ ...prev, [from]: to }));
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

  // ── The optional local coach ────────────────────────────────────────────
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
          `${s.exerciseId},${s.timestamp.slice(0, 10)},${s.weight ?? ""},${s.reps ?? ""}`,
      )
      .join("\n");
    return [
      `time_budget_min,${settings.timeBudgetMin}`,
      `readiness,energy=${readiness.energy},motivation=${readiness.motivation},freshness=${readiness.soreness}`,
      `goal,${settings.goal}`,
      `level,${settings.level}`,
      `weak_families,${weak || "none"}`,
      `equipment,${gear || "bodyweight only"}`,
      `weekly_sets,${volume || "none"}`,
      `deterministic_plan,${planned}`,
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
                date: s.timestamp.slice(0, 10),
                weight: s.weight,
                reps: s.reps,
              }));
          }
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
    [settings, plan, rows, readiness, payload, sets, contextCsv],
  );

  const value: TrainingLabStore = {
    settings,
    payload,
    sets,
    sessions,
    health,
    model,
    readiness,
    soreFamilies,
    loading: !settings || !plan,
    plan,
    weekPlan,
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
    removedSet,
    undoRemoveSet,
    addHealthRecord,
    removeHealthRecord,
    setReadinessAndPersist,
    toggleSoreFamily,
    finishSession,
    swapRow,
    clearCoach,
    resetModel,
    regenerateWeek,
    askCoach,
    runSharedSync,
    prFor,
    swapOptionsFor,
    setRepRange,
    logWarmup,
    exportBackup,
    importBackup,
    importSymmetry,
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

      {/* Undo a deleted set — the safety net for a mis-tap on the trash icon.
          Lives here so it follows the user across destinations, like the rest
          timer. It is the only confirmation a destructive action gets, which
          is why the window is generous. */}
      {removedSet && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-20 z-[55] flex justify-center px-4 pointer-events-none"
        >
          <div className="tl-card px-4 py-2 flex items-center gap-3 shadow-2xl border-l-4 border-[var(--tl-danger)] pointer-events-auto">
            <span className="text-sm text-[var(--tl-text-secondary)]">
              {t("log.removed")}
            </span>
            <button
              type="button"
              onClick={undoRemoveSet}
              className="text-sm font-semibold text-[var(--tl-accent)] tl-focusable"
            >
              {t("common.undo")}
            </button>
          </div>
        </div>
      )}

      {/* The rest timer must survive navigation: a rest does not stop just
          because the user tapped another destination. */}
      {rest && (
        <RestTimer
          key={rest.nonce}
          seconds={rest.seconds}
          nextExercise={
            rows.find((r) => r.exerciseId === rest.key)?.name[getLanguage()] ??
            null
          }
          onDone={() => setRest(null)}
          onDismiss={() => setRest(null)}
        />
      )}
    </StoreContext.Provider>
  );
}
