import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BellRing,
  Bike,
  Bot,
  Clock,
  Dumbbell,
  FileJson,
  Info,
  Moon,
  Settings2,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import {
  emptyModel,
  normalizeModel,
  rewardFromOutcome,
  updateModel,
  type DecisionModel,
  type MuscleFamily,
  type Readiness,
} from "@fitness/bodylab-training";
import type { OwnedEquipment } from "@fitness/bodylab-exercises";
import { isV2Payload, type ImportPayload } from "../../lib/adapter";
import {
  buildTodayPlan,
  familyLogStats,
  featuresFor,
  plannerCatalog,
  suggestLoadFor,
  swapOptions,
  type PlannedRow,
  type TodayPlan,
} from "../../lib/plan";
import {
  TOOL_SPECS,
  buildSystemPrompt,
  buildUserRequest,
  chatWithTools,
  validateProposal,
  type ChatMessage,
} from "../../lib/llm";
import { formatAdvisory } from "../../lib/format";
import {
  loadSets,
  saveSet,
  deleteSet,
  loadSessions,
  saveSession,
  loadSettings,
  saveSettings,
  loadPayload,
  savePayload,
  loadDecisionModel,
  saveDecisionModel,
  loadReadiness,
  saveReadiness,
  loadHealthRecords,
  saveHealthRecords,
} from "../../lib/db";
import { t, tInterp, setLanguage, getLanguage } from "../../lib/i18n";
import {
  configureSounds,
  installAudioUnlock,
  playCue,
  type CueKind,
} from "../../lib/sounds";
import {
  detectRecord,
  isExerciseComplete,
  marksOf,
  mergeMarks,
  type RecordEvent,
} from "../../lib/records";
import { configureNotifications } from "../../lib/notifications";
import {
  deleteRemoteSet,
  mergeSets,
  normalizeBaseUrl,
  pullMemberData,
  pushHealth,
  pushSessions,
  pushSets,
  type HealthRecord,
} from "../../lib/shared";
import { SharedPanel } from "./SharedPanel";
import type { TLSession, TLSet, TLSettingsData } from "../../lib/types";
import RestTimer from "./RestTimer";
import { GearPanel } from "./GearPanel";
import { SettingsPanel } from "./SettingsPanel";
import { CoachPanel, CoachResultView, type CoachResult } from "./CoachPanel";
import { MobileCard } from "./MobileCard";
import { SlotCard } from "./SlotCard";
import { Badge, SectionCard, ScaleInput, StatCard } from "./ui";

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
const SORE_FAMILIES: MuscleFamily[] = [
  "chest",
  "shoulders",
  "lats",
  "quadriceps",
  "hamstrings",
  "glutes",
  "core",
];

/**
 * Today — the F1+ screen.
 *
 * One question: what do I do in the next {budget} minutes with the body I have?
 * The deterministic builder answers it, the gear inventory bounds it, the
 * readiness report modulates it, the local decision model personalises it and
 * the optional local LLM may reorder it under the same hard rules.
 */
export default function TodayPage() {
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
  /** Phone-only pane switch; on `sm` and up every pane renders at once. */
  const [pane, setPane] = useState<"train" | "setup">("train");
  /** Transient banner for a record / finished exercise / finished session. */
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  /** Sessions are kept in state so the shared sync can push them. */
  const [sessions, setSessions] = useState<TLSession[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);

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

        // Remote rows this device has never seen become local ones. Everything
        // is keyed by the UUID the logging device generated, so this cannot
        // duplicate a set that came from here.
        const known = new Set(sets.map((s) => s.id));
        const fresh = pulled.sets.filter((s) => !known.has(s.id));
        for (const set of fresh) void saveSet(set);
        const merged = mergeSets(sets, pulled.sets);
        if (fresh.length > 0) setSets(merged);

        await pushSets(base, memberId, merged);
        if (sessions.length > 0) await pushSessions(base, memberId, sessions);
        if (health.length > 0) await pushHealth(base, memberId, health);

        // `applySettings` (not `patch`) on purpose: the sync has no opinion about
        // the UI, it only stamps when it last succeeded.
        applySettings({
          ...settings,
          shared: { ...settings.shared, lastSyncAt: new Date().toISOString() },
        });
      } catch (error) {
        if (report) {
          setSharedError(error instanceof Error ? error.message : "sync failed");
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
    // Intentionally keyed on the connection identity, not on every data change:
    // an effect on `sets` would re-sync on every logged set.
  }, [settings?.shared.enabled, settings?.shared.memberId, settings?.shared.baseUrl, runSharedSync]);

  const patch = useCallback(
    (over: Partial<TLSettingsData>) => {
      if (!settings) return;
      applySettings({ ...settings, ...over });
    },
    [settings, applySettings],
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

  const plan: TodayPlan | null = useMemo(() => {
    if (!settings) return null;
    return buildTodayPlan({
      inventory: settings.inventory,
      readiness,
      timeBudgetMin: settings.timeBudgetMin,
      level: settings.level,
      goal: settings.goal,
      logStats,
      model: settings.useDecisionModel ? model : emptyModel(),
      payload,
      fatiguedFamilies: soreFamilies,
    });
  }, [settings, readiness, logStats, model, payload, soreFamilies]);

  /** Deterministic rows with the user's swaps (and the coach's plan) applied. */
  const rows: PlannedRow[] = useMemo(() => {
    if (coachRows) return coachRows;
    if (!plan) return [];
    return plan.rows.map((row) => {
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
  }, [plan, overrides, coachRows]);

  const todaySets = useMemo(
    () => sets.filter((s) => s.timestamp.startsWith(todayPrefix)),
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

  // ── Logging ─────────────────────────────────────────────────────────────
  /** How the celebration banner describes a beaten record. */
  const describeRecord = useCallback((event: RecordEvent): string => {
    const value = `${event.value} kg`;
    if (event.previous === null) {
      return tInterp("cue.firstMark", { v: value });
    }
    return event.kind === "weight"
      ? tInterp("cue.beatWeight", { v: value, prev: event.previous })
      : tInterp("cue.beatE1rm", { v: value, prev: event.previous });
  }, []);

  const addSet = useCallback(
    (row: PlannedRow, weight: number | null, reps: number) => {
      const set: TLSet = {
        id: crypto.randomUUID(),
        exerciseId: row.exerciseId,
        dayId: `day-${todayPrefix}`,
        timestamp: new Date().toISOString(),
        weight,
        reps,
      };
      // Snapshot the exercise's history *before* this set lands, so "previous
      // best" means what it says.
      const before = sets.filter((s) => s.exerciseId === row.exerciseId);

      setSets((prev) => {
        void saveSet(set);
        return [...prev, set];
      });
      pushSetQuietly(set);
      setFinished(null);
      // Bodyweight and conditioning work does not need a rest countdown beyond
      // the prescribed time; everything else does.
      setRest({
        key: row.exerciseId,
        seconds: row.restSec || 60,
        nonce: Date.now(),
      });

      // ── Cues ──────────────────────────────────────────────────────────
      // Duration work has no load to beat, so only real sets get a verdict.
      if (row.cardioMin !== undefined) return;

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
    [todayPrefix, sets, importedMarksFor, celebrate, describeRecord, pushSetQuietly],
  );

  const removeSet = useCallback(
    (id: string) => {
      setSets((prev) => {
        void deleteSet(id);
        return prev.filter((s) => s.id !== id);
      });
      // Removing a mistake should also remove it from the household history,
      // otherwise the family view keeps counting a set nobody logged.
      if (settings?.shared.enabled && settings.shared.memberId) {
        const base = normalizeBaseUrl(settings.shared.baseUrl);
        if (base) void deleteRemoteSet(base, settings.shared.memberId, id).catch(() => {});
      }
    },
    [settings],
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
        if (base) void pushHealth(base, settings.shared.memberId, [record]).catch(() => {});
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

  if (!settings || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--tl-text-muted)]">
        {t("common.loading")}
      </div>
    );
  }

  const isRestDay = rows.length === 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[var(--tl-surface)]/95 backdrop-blur border-b border-[var(--tl-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* The real app mark (resources/brand/traininglab-icon.jpg).
                BASE_URL-relative so the app also works when served from a
                subpath (the LAN server mounts it at /traininglab/). */}
            <img
              src={`${import.meta.env.BASE_URL}favicon.svg`}
              alt=""
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl"
            />
            <div>
              <h1 className="font-bold leading-tight">{t("app.title")}</h1>
              <p className="text-xs text-[var(--tl-text-muted)]">
                {t("app.tagline")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 min-w-0 max-w-[52vw] sm:max-w-none ${payload ? "text-[var(--tl-text-secondary)]" : "text-[var(--tl-text-muted)]"}`}
            >
              <FileJson className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {payload
                  ? `${t("today.source")}: ${settings.sourcePath ?? "import"}`
                  : t("today.noSource")}
              </span>
            </span>
            <button
              onClick={() =>
                patch({ language: settings.language === "es" ? "en" : "es" })
              }
              className="px-2.5 py-1 rounded-lg tl-btn-ghost font-medium"
            >
              {t("lang.toggle")}
            </button>
          </div>
        </div>

        {/* Phone-only pane switch: logging is never more than one tap away. */}
        <div className="sm:hidden max-w-5xl mx-auto px-4 pb-3">
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--tl-surface-2)] border border-[var(--tl-border)]">
            <button
              onClick={() => setPane("train")}
              aria-pressed={pane === "train"}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold tl-focusable transition-colors ${
                pane === "train"
                  ? "bg-[var(--tl-accent)] text-[#0a0a0a]"
                  : "text-[var(--tl-text-secondary)]"
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              {t("nav.train")}
            </button>
            <button
              onClick={() => setPane("setup")}
              aria-pressed={pane === "setup"}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold tl-focusable transition-colors ${
                pane === "setup"
                  ? "bg-[var(--tl-accent)] text-[#0a0a0a]"
                  : "text-[var(--tl-text-secondary)]"
              }`}
            >
              <Settings2 className="w-4 h-4" />
              {t("nav.setup")}
            </button>
          </div>
        </div>
      </header>

      {/*
       * Phone layout: one flex column with three ordered panes.
       *
       * The old screen stacked ~1.5 phone-heights of cards (stats, sliders,
       * gear, preferences, coach, import) before the first exercise, so logging
       * started after a long scroll. Now a phone shows a *Train* pane (stats
       * strip + advisories + the session) and a *Setup* pane behind the tab in
       * the header. `sm:order-*` restores the desktop order (readiness first,
       * then stats, then the session) for the one-page layout above 640 px.
       */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-5">
        {/* ── Pane 1: train ───────────────────────────────────────────────── */}
        <div
          className={`${pane === "setup" ? "hidden" : "flex"} sm:order-2 sm:flex flex-col gap-5`}
        >
          {/* Summary — a sideways strip on a phone, a 4-up grid above `sm` */}
          <div className="tl-hscroll flex gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:overflow-visible">
            <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
              <StatCard
                label={t("stats.budget")}
                value={`${settings.timeBudgetMin}′`}
                hint={tInterp("stats.ofBudget", { n: settings.timeBudgetMin })}
                icon={<Clock className="w-3.5 h-3.5" />}
              />
            </div>
            <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
              <StatCard
                label={t("stats.planned")}
                value={`${Math.round(plannedMinutes)}′`}
                hint={tInterp("stats.exercises", { n: rows.length })}
                icon={<Activity className="w-3.5 h-3.5" />}
              />
            </div>
            <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
              <StatCard
                label={t("stats.setsToday")}
                value={totalSetsToday}
                hint={tInterp("session.sets", { n: totalSetsToday })}
                icon={<Zap className="w-3.5 h-3.5" />}
              />
            </div>
            <div className="min-w-[9.5rem] flex-1 sm:min-w-0">
              <StatCard
                label={t("stats.volumeToday")}
                value={`${Math.round(todayVolume)} kg`}
                hint={tInterp("stats.plannedSets", {
                  n: rows.reduce((acc, r) => acc + r.sets, 0),
                })}
                icon={<Dumbbell className="w-3.5 h-3.5" />}
              />
            </div>
          </div>

          {finished && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-2 text-emerald-400 text-sm">
              <Zap className="w-4 h-4" />
              {tInterp("session.done", {
                sets: finished.setIds.length,
                vol: Math.round(todayVolume),
              })}
            </div>
          )}

          {/* Advisories */}
          {plan.advisories.length > 0 && (
            <div className="tl-card p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mb-2">
                <Info className="w-3.5 h-3.5" />
                {t("session.advisories")}
              </p>
              <ul className="space-y-1 text-sm text-[var(--tl-text-secondary)]">
                {plan.advisories.map((a, i) => (
                  <li key={i}>• {formatAdvisory(a)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Session */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {t("session.title")}
              {coachRows && (
                <Badge tone="success">
                  <Bot className="w-3 h-3" />
                  {t("session.rebuilt")}
                </Badge>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {coachRows && (
                <button
                  onClick={() => {
                    setCoachRows(null);
                    setOverrides({});
                  }}
                  className="px-3 py-1.5 rounded-xl tl-btn-ghost text-xs"
                >
                  {t("settings.modelReset")}
                </button>
              )}
              <button
                onClick={finishSession}
                disabled={totalSetsToday === 0 || finished !== null}
                className="px-4 py-2 rounded-xl tl-btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("session.finish")}
              </button>
            </div>
          </div>

          {isRestDay ? (
            <div className="tl-card p-10 text-center">
              <Moon className="w-10 h-10 mx-auto text-[var(--tl-text-muted)] mb-3" />
              <p className="font-semibold">{t("session.none")}</p>
              <p className="text-sm text-[var(--tl-text-muted)]">
                {plan.advisories[0]
                  ? formatAdvisory(plan.advisories[0])
                  : t("day.restHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => {
                const rowToday = todaySets.filter(
                  (s) => s.exerciseId === row.exerciseId,
                );
                const history = sets
                  .filter((s) => s.exerciseId === row.exerciseId)
                  .slice(-10);
                const lastSession =
                  rowToday.length > 0
                    ? rowToday[rowToday.length - 1]!.timestamp
                    : history.length > 0
                      ? history[history.length - 1]!.timestamp
                      : null;
                return (
                  <SlotCard
                    key={row.exerciseId}
                    row={row}
                    todaySets={rowToday}
                    lastSession={lastSession}
                    suggestion={suggestLoadFor({
                      loadType: row.loadType,
                      repsMin: row.repsMin,
                      repsMax: row.repsMax,
                      history: history.map((s) => ({
                        weight: s.weight,
                        reps: s.reps,
                      })),
                      pr: prFor(row.exerciseId),
                      inventory: settings.inventory,
                      readiness,
                    })}
                    swapOptions={plan ? swapOptions(plan, row.exerciseId) : []}
                    onAddSet={addSet}
                    onRemoveSet={removeSet}
                    onSwap={(from, to) => {
                      setCoachRows(null);
                      setOverrides((prev) => ({ ...prev, [from]: to }));
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pane 2: readiness (modulates the plan, so it stays next to it) ── */}
        <div
          className={`${pane === "train" ? "hidden" : "flex"} sm:order-1 sm:flex flex-col gap-5`}
        >
          {/* Readiness — collapsed by default: the badge carries the three values
            and the three sliders cost a lot of phone height. */}
          <SectionCard
            title={t("readiness.title")}
            hint={t("readiness.hint")}
            icon={<Activity className="w-4 h-4" />}
            defaultOpen={false}
            actions={
              <Badge tone="neutral">
                <span
                  title={tInterp("readiness.badge", {
                    e: readiness.energy,
                    m: readiness.motivation,
                    s: readiness.soreness,
                  })}
                >
                  {readiness.energy}/{readiness.motivation}/{readiness.soreness}
                </span>
              </Badge>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ScaleInput
                label={t("readiness.energy")}
                value={readiness.energy}
                onChange={(v) =>
                  setReadinessAndPersist({ ...readiness, energy: v })
                }
                lowHint={t("readiness.low")}
                highHint={t("readiness.high")}
              />
              <ScaleInput
                label={t("readiness.motivation")}
                value={readiness.motivation}
                onChange={(v) =>
                  setReadinessAndPersist({ ...readiness, motivation: v })
                }
                lowHint={t("readiness.low")}
                highHint={t("readiness.high")}
              />
              <ScaleInput
                label={t("readiness.soreness")}
                value={readiness.soreness}
                onChange={(v) =>
                  setReadinessAndPersist({ ...readiness, soreness: v })
                }
                lowHint={t("readiness.low")}
                highHint={t("readiness.high")}
              />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2">
                {t("readiness.soreFamilies")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SORE_FAMILIES.map((family) => {
                  const active = soreFamilies.includes(family);
                  return (
                    <button
                      key={family}
                      onClick={() =>
                        setSoreFamilies((prev) =>
                          active
                            ? prev.filter((f) => f !== family)
                            : [...prev, family],
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] border tl-focusable ${
                        active
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                      }`}
                    >
                      {family}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Pane 3: setup (gear, preferences, coach, import, phone) ─────── */}
        <div
          className={`${pane === "train" ? "hidden" : "flex"} sm:order-3 sm:flex flex-col gap-5`}
        >
          {/* Gear */}
          <GearPanel
            inventory={settings.inventory}
            onChange={(inventory: OwnedEquipment[]) => patch({ inventory })}
            available={plan.gearNote.usable}
            total={plan.gearNote.usable + plan.gearNote.excluded}
          />

          {/* Preferences */}
          <SettingsPanel
            goal={settings.goal}
            level={settings.level}
            budgetMin={settings.timeBudgetMin}
            useModel={settings.useDecisionModel}
            model={model}
            sound={settings.sound}
            notifications={settings.notifications}
            onGoal={(goal) => patch({ goal })}
            onLevel={(level) => patch({ level })}
            onBudget={(timeBudgetMin) =>
              patch({
                timeBudgetMin: Math.max(10, Math.min(240, timeBudgetMin || 30)),
              })
            }
            onToggleModel={(useDecisionModel) => patch({ useDecisionModel })}
            onResetModel={() => {
              const fresh = emptyModel();
              setModel(fresh);
              void saveDecisionModel(fresh);
            }}
            onSound={(p) => patch({ sound: { ...settings.sound, ...p } })}
            onNotifications={(p) =>
              patch({
                notifications: { ...settings.notifications, ...p },
              })
            }
          />

          {/* Coach */}
          <CoachPanel
            llm={settings.llm}
            onLlmChange={(llm) => patch({ llm })}
            onAsk={askCoach}
            busy={coachBusy}
          />
          {coachResult && <CoachResultView result={coachResult} />}

          {/* BodyLab link */}
          <SectionCard
            title={t("setup.title")}
            hint={t("setup.hint")}
            icon={<FileJson className="w-4 h-4" />}
            defaultOpen={payload === null}
            actions={
              <Badge tone={payload ? "success" : "neutral"}>
                {payload ? t("setup.loaded") : t("today.noSource")}
              </Badge>
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl tl-btn-ghost text-sm cursor-pointer">
                {t("setup.chooseFile")}
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
              </label>
              {payload?.profile && (
                <span className="text-xs text-[var(--tl-text-muted)]">
                  {payload.profile.height} cm · {payload.profile.weight ?? "—"}{" "}
                  kg · {payload.profile.age ?? "—"} a
                </span>
              )}
              {payload?.conditioning?.conditioningScore != null && (
                <Badge
                  tone={
                    payload.conditioning.conditioningScore < 60
                      ? "warning"
                      : "success"
                  }
                >
                  conditioning {payload.conditioning.conditioningScore}/100
                </Badge>
              )}
              {!payload && (
                <span className="text-xs text-[var(--tl-text-muted)] flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  {t("gear.available")
                    .replace("{n}", String(plan.gearNote.usable))
                    .replace(
                      "{total}",
                      String(plan.gearNote.usable + plan.gearNote.excluded),
                    )}
                </span>
              )}
              {payload === null && (
                <span className="text-xs text-[var(--tl-text-muted)] flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5" />
                  {plannerCatalog().length} exercises in the built-in catalog
                </span>
              )}
              {loadError && (
                <span className="text-xs text-red-400">{loadError}</span>
              )}
            </div>
          </SectionCard>

        {/* Shared household history (optional) */}
        <SharedPanel
          settings={settings.shared}
          health={health}
          syncing={syncing}
          lastError={sharedError}
          onSettings={(p) => patch({ shared: { ...settings.shared, ...p } })}
          onAddHealth={addHealthRecord}
          onRemoveHealth={removeHealthRecord}
          onSyncNow={() => void runSharedSync({ report: true })}
        />

        {/* Phone / LAN */}
        <MobileCard />
        </div>
      </main>

      {/* The visual half of the cues — shown whether or not audio played, so
          a muted device still gets the confirmation. */}
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
                ? "border-amber-400"
                : celebration.cue === "bell"
                  ? "border-sky-400"
                  : "border-emerald-400"
            }`}
          >
            <span
              className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                celebration.cue === "record"
                  ? "bg-amber-400/15 text-amber-300"
                  : celebration.cue === "bell"
                    ? "bg-sky-400/15 text-sky-300"
                    : "bg-emerald-400/15 text-emerald-300"
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

      {rest && (
        <RestTimer
          key={rest.nonce}
          seconds={rest.seconds}
          // After a rest you normally go again on the same exercise, so that is
          // the name worth surfacing in the notification.
          nextExercise={
            rows.find((r) => r.exerciseId === rest.key)?.name[getLanguage()] ??
            null
          }
          onDone={() => setRest(null)}
          onDismiss={() => setRest(null)}
        />
      )}
    </div>
  );
}
