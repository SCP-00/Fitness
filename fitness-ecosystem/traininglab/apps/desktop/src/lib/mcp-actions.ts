/**
 * The ACTIONS channel — every write a local model can ask TrainingLab to do.
 *
 * Design: `docs/MCP_TOOL_SURFACE.md` (decisions D1/D4 of 2026-10-09). The
 * transport is two narrow Tauri commands and two JSON files next to the
 * autobackups; this module is the part that must never depend on React, the
 * WebView or the filesystem: parsing the inbox, validating an action **with the
 * same rules the UI applies**, building the receipt and the undo operation.
 *
 * Three properties are non-negotiable and live here, because they are what the
 * tests assert:
 *
 *   1. **Validated, not trusted.** An action is applied only if it would be
 *      legal in the app: the exercise must exist, the declared gear must be
 *      able to load it, the weight must fit inside what the owner actually
 *      owns, reps and readiness must be in range, destructive actions must
 *      carry `confirm: true`. A refusal names the rule that fired, with the
 *      numbers, so the coach can explain it instead of guessing.
 *   2. **Idempotent.** Every action carries an `id`; the store keeps a ledger
 *      of every id it has seen, so a replay (the MCP retrying after a timeout,
 *      or the inbox file surviving a crash) answers with the *same* receipt and
 *      never logs a second set.
 *   3. **Reversible.** Each applied action records how to take it back, and
 *      Ajustes shows that list with a "Deshacer". Past sessions stay
 *      immutable: the only undo that touches history is *reopening a session
 *      the agent just closed* — it never edits or deletes closed sets.
 *
 * 2026-10-13 — the owner asked the surface to reach the plan itself, so five
 * actions joined the eight: `add_exercise` (a row added to today's session),
 * `set_day_focus` ("hoy toca abdomen"), `set_week_override` (authoring one day
 * of the week), `delete_session` and `set_set_time` (the hour of a set),
 * plus `occurred_at` on `log_set`. Two of them touch HISTORY by his explicit
 * order — deleting a *whole* session, which the app itself already allowed —
 * and both demand `confirm: true` and carry a full restore as their undo.
 * Nothing here can *edit* a closed set or session; that door stays shut.
 *
 * @module lib/mcp-actions
 */

import type { Capability, OwnedEquipment } from "@fitness/bodylab-exercises";
import {
  EQUIPMENT_PRESETS,
  maxLoadFor,
  ownedCapabilities,
  ownedFromPreset,
} from "@fitness/bodylab-exercises";
import type {
  DecisionModel,
  MuscleFamily,
  Readiness,
  SessionGoal,
} from "@fitness/bodylab-training";
import { localDayKey } from "./day";
import { focusFamiliesOf, isMuscleFamily } from "./day-focus";
import { plannerCatalog } from "./plan";
import {
  ROUTINE_LIMITS,
  isKnownExercise,
  makeRoutine,
  normalizeRoutine,
  normalizeRoutines,
  removeRoutine,
  routineItemFor,
  upsertRoutine,
  type RoutineItem,
} from "./routines";
import { swapWeekOverrides, type WeekDayShape } from "./week-swap";
import type {
  TLSession,
  TLSettingsData,
  TLSet,
  WeekDayOverride,
} from "./types";

/** How long an action stays worth applying. The inbox survives a closed app:
 *  a set requested yesterday and applied this morning would be a lie about
 *  when the work happened, so stale requests are refused instead. */
export const MCP_ACTION_TTL_MS = 24 * 60 * 60 * 1000;

/** Ledger cap: the audit list is a memory, not a second database. */
export const MCP_LEDGER_MAX = 200;

export const MCP_ACTION_TYPES = [
  "log_set",
  "finish_session",
  "set_readiness",
  "set_goal",
  "set_level",
  "set_time_budget",
  "set_inventory",
  "swap_exercise",
  "add_exercise",
  "set_day_focus",
  "set_week_override",
  "delete_session",
  "set_set_time",
  "reorder_row",
  "set_exercise_state",
  "reset_order",
  "swap_week_days",
  /* 2026-10-19 (second round): parity with the rest of the interface. */
  "undo",
  "save_routine",
  "apply_routine",
  "delete_routine",
  "set_language",
  "set_sound",
  "reset_model",
  "regenerate_week",
] as const;

export type McpActionType = (typeof MCP_ACTION_TYPES)[number];

/** A normalised action out of the inbox. `type` stays a string so an unknown
 *  one can be *rejected with a receipt* instead of vanishing silently. */
export interface McpAction {
  id: string;
  type: string;
  /** `mcp:<agent>` — who asked, kept on every receipt. */
  origin: string;
  requestedAt: string | null;
  confirm: boolean;
  params: Record<string, unknown>;
}

/** How an applied action is taken back. Persisted with the ledger, so the
 *  button still works after a restart. */
export type McpUndoOp =
  | { kind: "remove_set"; setId: string }
  | { kind: "remove_session"; sessionId: string }
  | { kind: "settings"; before: Partial<TLSettingsData> }
  | { kind: "readiness"; before: Readiness }
  | { kind: "swap_row"; from: string; to: string }
  /* Added 2026-10-13, with the five plan actions. */
  /** Drop a row the agent added to today's session. */
  | { kind: "remove_row"; exerciseId: string }
  /** Put the day's focus back the way it was (`[]` = automatic). */
  | { kind: "day_focus"; before: MuscleFamily[] }
  /** Put back the whole session a `delete_session` removed, sets included. */
  | { kind: "restore_session"; session: TLSession; sets: TLSet[] }
  /** Restore one set's own hour (`timestamp`, ISO). */
  | { kind: "set_time"; setId: string; before: string }
  /* Added 2026-10-19 (second round), with the parity actions. */
  /** Drop the several rows an `apply_routine` poured into today. */
  | { kind: "remove_rows"; exerciseIds: string[] }
  /** Put the local decision model back (a reset is otherwise re-learned). */
  | { kind: "decision_model"; before: DecisionModel | null }
  /** Put the week seed back, so a regeneration is reversible. */
  | { kind: "week_seed"; before: number };

export interface McpText {
  en: string;
  es: string;
}

/** The receipt an agent (and the audit view) reads back. */
export interface McpReceipt {
  id: string;
  type: string;
  origin: string;
  status: "applied" | "rejected";
  /** What happened, in both languages: the agent reads `en`, Ajustes `es`. */
  detail: McpText;
  requestedAt?: string;
  appliedAt?: string;
  /** Machine-readable refusal, e.g. `weight_exceeds_inventory`. */
  rule?: string;
  undoToken?: string;
  undoneAt?: string;
}

/** A receipt plus the operation that reverses it — the Ajustes audit row. */
export interface McpLedgerEntry extends McpReceipt {
  undo?: McpUndoOp;
}

/** Everything validation needs to know about the app's current state. */
export interface McpContext {
  now: Date;
  settings: TLSettingsData | null;
  /** Exercise ids in today's plan (the swap rule operates on slots). */
  plannedExerciseIds: readonly string[];
  /** Sets logged today, the day's own work — what `set_set_time` can address
   *  (the rest of the log belongs to HISTORY and is not editable). */
  todaySets: readonly TLSet[];
  /** Closed sessions in the log, so `delete_session` can refuse an unknown id. */
  sessions: readonly TLSession[];
  /** Today's focus (`[]` = automatic), so `set_day_focus` can be undone. */
  dayFocus: readonly MuscleFamily[];
  /** The seven effective days of the week, for `swap_week_days`. */
  weekDays: readonly WeekDayShape[];
  /** Local day key `YYYY-MM-DD` of today: the boundary a set may not cross. */
  todayPrefix: string;
  /** Sets logged today — an empty day has nothing to finish. */
  todaySetCount: number;
  /** Whether today's session is already closed. */
  finishedToday: boolean;
  readiness: Readiness;
  /** Ledger entries this caller may still undo (`canUndo`): the `undo` action
   *  only reaches its **own** tokens, and never into closed history. */
  undoable: readonly { id: string; origin: string; type: string }[];
  /** The local decision model, so `reset_model` can carry its restore. */
  model: DecisionModel | null;
  /** The in-memory week seed: `regenerate_week`'s undo restores it. */
  weekSeed: number;
}

export type McpValidation =
  | {
      ok: true;
      detail: McpText;
      /** `null` = the store fills it in after applying (the id only exists then). */
      undo: McpUndoOp | null;
      /** Settings keys this action writes, so a batch of them merges into ONE
       *  write instead of each one clobbering the last with a stale base. */
      settingsPatch?: Partial<TLSettingsData>;
      readiness?: Readiness;
      /** Normalised `occurred_at` (ISO-8601) of a set action, when one was sent:
       *  the store dates the set with this and never re-parses the payload. */
      occurredAt?: string;
      /** The focus a `set_day_focus` resolved to (`[]` = automatic), so the
       *  store applies exactly the list validation approved. */
      dayFocus?: MuscleFamily[];
    }
  | { ok: false; rule: string; detail: McpText };

// ── Parsing ─────────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Turn the inbox file into actions. Accepts `{ actions: [...] }` or a bare
 * array; anything unusable becomes a **rejected receipt** rather than an
 * exception, so one malformed entry cannot block the rest of the batch.
 */
export function parseMcpInbox(text: string): {
  actions: McpAction[];
  receipts: McpReceipt[];
} {
  const actions: McpAction[] = [];
  const receipts: McpReceipt[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      actions,
      receipts: [
        rejection("inbox-unparseable", "unknown", "mcp", {
          en: "The action file is not valid JSON.",
          es: "El fichero de acciones no es JSON válido.",
        }),
      ],
    };
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(asRecord(parsed)?.actions)
      ? ((asRecord(parsed)!.actions as unknown[]))
      : null;

  if (!rows) {
    return {
      actions,
      receipts: [
        rejection("inbox-shape", "unknown", "mcp", {
          en: 'The action file must be an array, or { "actions": [...] }.',
          es: 'El fichero de acciones debe ser un array o { "actions": [...] }.',
        }),
      ],
    };
  }

  rows.forEach((raw, index) => {
    const record = asRecord(raw);
    const id = record ? asString(record.id) : null;
    if (!record || !id) {
      // Without an id there is nothing to deduplicate against, so the entry
      // can only be refused — a receipt still needs an id of its own.
      receipts.push(
        rejection(`invalid-${index}`, "malformed", "mcp", {
          en: "Every action needs a non-empty `id` (the idempotency key).",
          es: "Cada acción necesita un `id` no vacío (la clave de idempotencia).",
        }),
      );
      return;
    }
    actions.push({
      id,
      type: asString(record.type) ?? "unknown",
      origin: asString(record.origin) ?? "mcp:unknown",
      requestedAt: asString(record.requestedAt),
      confirm: record.confirm === true,
      params: asRecord(record.params) ?? {},
    });
  });

  return { actions, receipts };
}

function rejection(
  id: string,
  type: string,
  origin: string,
  detail: McpText,
  rule?: string,
): McpReceipt {
  return {
    id,
    type,
    origin,
    status: "rejected",
    detail,
    ...(rule ? { rule } : {}),
  };
}

// ── Validation ──────────────────────────────────────────────────────────────

function plannerEntry(exerciseId: string) {
  return plannerCatalog().find((e) => e.exercise.id === exerciseId) ?? null;
}

/** Capability groups the declared gear cannot satisfy, in the catalog's own
 *  vocabulary, so the refusal can say *what* is missing. */
function missingGear(entry: ReturnType<typeof plannerEntry>, owned: Set<Capability>): string | null {
  if (!entry) return null;
  const missing = entry.traits.requires.filter(
    (group) => !group.some((cap) => owned.has(cap)),
  );
  if (missing.length === 0) return null;
  return missing.map((group) => group.join(" o ")).join(" + ");
}

const GOALS: SessionGoal[] = ["hypertrophy", "strength", "recomposition"];
const LEVELS: TLSettingsData["level"][] = ["beginner", "intermediate", "advanced"];
const CAPABILITIES: Capability[] = [
  "bodyweight",
  "mat",
  "dumbbell",
  "kettlebell",
  "barbell",
  "bench",
  "rack",
  "pullup_bar",
  "dip_bars",
  "rings",
  "bands",
  "cable",
  "machines",
  "bike",
  "jump_rope",
  "box",
  "ab_wheel",
  "strap",
  "stairs",
];

function failed(rule: string, detail: McpText): McpValidation {
  return { ok: false, rule, detail };
}

/**
 * The hour an agent says the work happened (`occurred_at`, ISO-8601).
 *
 * It has to be a real instant **of today**: a set that belongs to another
 * calendar day would silently leave today's session (the app keys its day on
 * `localDayKey(timestamp)`), so the honest answer is a refusal that says which
 * day it landed on — not a set that the plan, the volume and the finish gate
 * all stop seeing. Shared by `log_set` and `set_set_time` so both cannot
 * disagree about what "today" means.
 */
function validateOccurredAt(
  value: unknown,
  ctx: McpContext,
): { at: string | null } | { rule: string; detail: McpText } {
  if (value === undefined || value === null) return { at: null };
  const raw = typeof value === "string" ? value.trim() : "";
  const parsed = raw === "" ? NaN : Date.parse(raw);
  if (!Number.isFinite(parsed) || localDayKey(new Date(parsed)) === "") {
    return {
      rule: "occurred_at_invalid",
      detail: {
        en: `occurred_at must be an ISO-8601 instant (e.g. "${ctx.now.toISOString()}"); received ${JSON.stringify(value)}.`,
        es: `occurred_at debe ser un instante ISO-8601 (p. ej. «${ctx.now.toISOString()}»); llegó ${JSON.stringify(value)}.`,
      },
    };
  }
  const day = localDayKey(new Date(parsed));
  if (ctx.todayPrefix !== "" && day !== ctx.todayPrefix) {
    return {
      rule: "occurred_at_not_today",
      detail: {
        en: `occurred_at is ${day} and today is ${ctx.todayPrefix}: a set of another day cannot join today's session, and past days are immutable.`,
        es: `occurred_at es ${day} y hoy es ${ctx.todayPrefix}: una serie de otro día no puede entrar en la sesión de hoy, y los días pasados son inmutables.`,
      },
    };
  }
  return { at: new Date(parsed).toISOString() };
}

/**
 * The whole rule set. `ok: false` carries the rule that fired **and** the
 * numbers behind it; `ok: true` carries a bilingual detail for the audit list
 * and the undo operation (or `null` when the store fills it in after applying,
 * because the id only exists once the set is written).
 */
export function validateMcpAction(action: McpAction, ctx: McpContext): McpValidation {
  if (
    action.requestedAt &&
    Number.isFinite(Date.parse(action.requestedAt)) &&
    ctx.now.getTime() - Date.parse(action.requestedAt) > MCP_ACTION_TTL_MS
  ) {
    return failed("expired", {
      en: `The action is older than 24 h (${action.requestedAt}); it was not applied.`,
      es: `La acción tiene más de 24 h (${action.requestedAt}); no se ha aplicado.`,
    });
  }

  switch (action.type) {
    case "log_set":
      return validateLogSet(action, ctx);
    case "finish_session":
      if (!action.confirm) {
        return failed("confirm_required", {
          en: "finish_session closes today's session — call it with confirm: true.",
          es: "finish_session cierra la sesión de hoy: llámala con confirm: true.",
        });
      }
      if (ctx.todaySetCount === 0) {
        return failed("nothing_to_finish", {
          en: "There are no sets logged today, so there is no session to close.",
          es: "No hay series registradas hoy, así que no hay sesión que cerrar.",
        });
      }
      if (ctx.finishedToday) {
        return failed("already_finished", {
          en: "Today's session is already closed; a closed session is immutable.",
          es: "La sesión de hoy ya está cerrada; una sesión cerrada es inmutable.",
        });
      }
      return {
        ok: true,
        detail: {
          en: "Today's session closed.",
          es: "Sesión de hoy cerrada.",
        },
        undo: null, // the store knows the session id it just created
      };

    case "set_readiness":
      return validateReadiness(action, ctx);

    case "set_goal": {
      const goal = asString(action.params.goal);
      if (!goal || !GOALS.includes(goal as SessionGoal)) {
        return failed("goal_invalid", {
          en: `goal must be one of ${GOALS.join(" | ")}; received ${JSON.stringify(action.params.goal)}.`,
          es: `goal debe ser uno de ${GOALS.join(" | ")}; llego ${JSON.stringify(action.params.goal)}.`,
        });
      }
      return {
        ok: true,
        detail: { en: `Goal set to ${goal}.`, es: `Objetivo puesto en ${goal}.` },
        settingsPatch: { goal: goal as SessionGoal },
        undo: { kind: "settings", before: { goal: ctx.settings?.goal ?? "hypertrophy" } },
      };
    }

    case "set_level": {
      const level = asString(action.params.level);
      if (!level || !LEVELS.includes(level as TLSettingsData["level"])) {
        return failed("level_invalid", {
          en: `level must be one of ${LEVELS.join(" | ")}; received ${JSON.stringify(action.params.level)}.`,
          es: `level debe ser uno de ${LEVELS.join(" | ")}; llego ${JSON.stringify(action.params.level)}.`,
        });
      }
      return {
        ok: true,
        detail: { en: `Level set to ${level}.`, es: `Nivel puesto en ${level}.` },
        settingsPatch: { level: level as TLSettingsData["level"] },
        undo: { kind: "settings", before: { level: ctx.settings?.level ?? "intermediate" } },
      };
    }

    case "set_time_budget": {
      const budget = asNumber(action.params.time_budget_min);
      if (budget === null || !Number.isInteger(budget) || budget < 10 || budget > 300) {
        return failed("time_budget_out_of_range", {
          en: "time_budget_min must be a whole number of minutes between 10 and 300.",
          es: "time_budget_min debe ser un número entero de minutos entre 10 y 300.",
        });
      }
      return {
        ok: true,
        detail: {
          en: `Daily time budget set to ${budget} min.`,
          es: `Presupuesto diario de tiempo puesto en ${budget} min.`,
        },
        settingsPatch: { timeBudgetMin: budget },
        undo: {
          kind: "settings",
          before: { timeBudgetMin: ctx.settings?.timeBudgetMin ?? 90 },
        },
      };
    }

    case "set_inventory":
      return validateInventory(action, ctx);

    case "swap_exercise":
      return validateSwap(action, ctx);

    case "add_exercise":
      return validateAddExercise(action, ctx);

    case "set_day_focus":
      return validateDayFocus(action, ctx);

    case "set_week_override":
      return validateWeekOverride(action, ctx);

    case "delete_session":
      return validateDeleteSession(action, ctx);

    case "set_set_time":
      return validateSetTime(action, ctx);

    case "reorder_row":
      return validateReorder(action, ctx);

    case "set_exercise_state":
      return validateExerciseState(action, ctx);

    case "reset_order":
      return validateResetOrder(ctx);

    case "swap_week_days":
      return validateWeekSwap(action, ctx);

    case "undo":
      return validateUndo(action, ctx);

    case "save_routine":
      return validateSaveRoutine(action, ctx);

    case "apply_routine":
      return validateApplyRoutine(action, ctx);

    case "delete_routine":
      return validateDeleteRoutine(action, ctx);

    case "set_language":
      return validateLanguage(action, ctx);

    case "set_sound":
      return validateSound(action, ctx);

    case "reset_model":
      return validateResetModel(action, ctx);

    case "regenerate_week":
      return validateRegenerateWeek(action, ctx);

    default:
      return failed("unknown_action", {
        en: `Unknown action type "${action.type}". Known: ${MCP_ACTION_TYPES.join(", ")}.`,
        es: `Tipo de acción desconocido «${action.type}». Conocidos: ${MCP_ACTION_TYPES.join(", ")}.`,
      });
  }
}

function validateLogSet(action: McpAction, ctx: McpContext): McpValidation {
  const exerciseId = asString(action.params.exercise_id);
  if (!exerciseId) {
    return failed("exercise_required", {
      en: "log_set needs `exercise_id` (the catalog id, e.g. \"barbell-bench-press\").",
      es: "log_set necesita `exercise_id` (el id del catálogo, p. ej. «barbell-bench-press»).",
    });
  }
  const entry = plannerEntry(exerciseId);
  if (!entry) {
    return failed("unknown_exercise", {
      en: `No exercise with id "${exerciseId}" exists in the catalog.`,
      es: `No existe ningún ejercicio con id «${exerciseId}» en el catálogo.`,
    });
  }
  const name = entry.exercise.name.es;
  const inventory = ctx.settings?.inventory ?? [];
  const owned = ownedCapabilities(inventory);

  const missing = missingGear(entry, owned);
  if (missing !== null) {
    return failed("gear_mismatch", {
      en: `«${entry.exercise.name.en}» requires ${missing}, which the declared inventory does not provide.`,
      es: `«${name}» requiere ${missing}, que tu equipamiento declarado no ofrece.`,
    });
  }

  const rawWeight = action.params.weight_kg;
  const weight = rawWeight === undefined || rawWeight === null ? null : asNumber(rawWeight);
  if (rawWeight !== undefined && rawWeight !== null && weight === null) {
    return failed("weight_invalid", {
      en: "weight_kg must be a number in kg, or null for bodyweight work.",
      es: "weight_kg debe ser un número en kg, o null para trabajo con peso corporal.",
    });
  }
  if (weight !== null && (weight < 0 || weight > 600)) {
    return failed("weight_out_of_range", {
      en: `weight_kg must be between 0 and 600 kg; received ${weight}.`,
      es: `weight_kg debe estar entre 0 y 600 kg; llegó ${weight}.`,
    });
  }
  if (weight !== null && weight > 0) {
    const cap = maxLoadFor(entry.traits.loadType, inventory);
    if (cap !== null && weight > cap) {
      return failed("weight_exceeds_inventory", {
        en: `${weight} kg exceeds the heaviest ${entry.traits.loadType} load you own (${cap} kg).`,
        es: `${weight} kg supera la carga máxima de ${entry.traits.loadType} que poses (${cap} kg).`,
      });
    }
  }

  const durationSec = action.params.duration_sec === undefined
    ? null
    : asNumber(action.params.duration_sec);
  if (action.params.duration_sec !== undefined && durationSec === null) {
    return failed("duration_invalid", {
      en: "duration_sec must be a number of seconds.",
      es: "duration_sec debe ser un número de segundos.",
    });
  }
  if (durationSec !== null && (durationSec < 1 || durationSec > 7200)) {
    return failed("duration_out_of_range", {
      en: `duration_sec must be between 1 and 7200; received ${durationSec}.`,
      es: `duration_sec debe estar entre 1 y 7200; llegó ${durationSec}.`,
    });
  }

  const reps = action.params.reps === undefined ? null : asNumber(action.params.reps);
  if (action.params.reps !== undefined && reps === null) {
    return failed("reps_invalid", {
      en: "reps must be a whole number between 1 and 50.",
      es: "reps debe ser un número entero entre 1 y 50.",
    });
  }
  if (durationSec === null) {
    if (reps === null) {
      return failed("reps_required", {
        en: "log_set needs `reps` (1-50) or `duration_sec` for timed work.",
        es: "log_set necesita `reps` (1-50) o `duration_sec` para el trabajo cronometrado.",
      });
    }
    if (!Number.isInteger(reps) || reps < 1 || reps > 50) {
      return failed("reps_out_of_range", {
        en: `reps must be a whole number between 1 and 50; received ${reps}.`,
        es: `reps debe ser un número entero entre 1 y 50; llegó ${reps}.`,
      });
    }
  }

  const effort = action.params.effort;
  if (effort !== undefined && effort !== "D" && effort !== "F") {
    return failed("effort_invalid", {
      en: 'effort must be "D" (near failure) or "F" (to failure); warm-ups use warmup: true.',
      es: 'effort debe ser «D» (cerca del fallo) o «F» (al fallo); las aproximaciones usan warmup: true.',
    });
  }

  const notes = action.params.notes;
  if (notes !== undefined) {
    if (typeof notes !== "string") {
      return failed("notes_invalid", { en: "notes must be text.", es: "notes debe ser texto." });
    }
    if (notes.length > 280) {
      return failed("notes_too_long", {
        en: `notes is ${notes.length} characters; the limit is 280.`,
        es: `notes tiene ${notes.length} caracteres; el límite es 280.`,
      });
    }
  }

  // When did the work happen? Optional, but if the agent says so it must be
  // today (see validateOccurredAt): the app dates a set by its own timestamp.
  const when = validateOccurredAt(action.params.occurred_at, ctx);
  if ("rule" in when) return failed(when.rule, when.detail);

  // 0 kg means "bodyweight": the maths treats null as unloaded, and a stored
  // zero would be a fake measurement in every aggregate.
  const appliedWeight = weight === null || weight === 0 ? null : weight;
  const bits: string[] = [];
  const bitsEs: string[] = [];
  if (action.params.warmup === true) {
    bits.push("warm-up");
    bitsEs.push("calentamiento");
  }
  if (appliedWeight !== null) {
    bits.push(`${appliedWeight} kg`);
    bitsEs.push(`${appliedWeight} kg`);
  }
  if (durationSec !== null) {
    bits.push(`${durationSec} s`);
    bitsEs.push(`${durationSec} s`);
  } else if (reps !== null) {
    bits.push(`${reps} reps`);
    bitsEs.push(`${reps} reps`);
  }
  if (action.params.effort === "D" || action.params.effort === "F") {
    bits.push(`effort ${action.params.effort}`);
    bitsEs.push(`esfuerzo ${action.params.effort}`);
  }

  if (when.at !== null) {
    bits.push(`at ${when.at}`);
    bitsEs.push(`a las ${when.at}`);
  }

  return {
    ok: true,
    detail: {
      en: `Set logged: ${entry.exercise.name.en} — ${bits.join(" · ")}.`,
      es: `Serie registrada: ${name} — ${bitsEs.join(" · ")}.`,
    },
    ...(when.at !== null ? { occurredAt: when.at } : {}),
    // The store fills in both halves with the id the new set gets.
    undo: null,
  };
}

function validateReadiness(action: McpAction, ctx: McpContext): McpValidation {
  const keys = ["energy", "motivation", "soreness"] as const;
  const provided = keys.filter((k) => action.params[k] !== undefined);
  if (provided.length === 0) {
    return failed("readiness_required", {
      en: "set_readiness needs at least one of energy | motivation | soreness (1-5).",
      es: "set_readiness necesita al menos uno de energy | motivation | soreness (1-5).",
    });
  }
  for (const key of provided) {
    const value = asNumber(action.params[key]);
    if (value === null || !Number.isInteger(value) || value < 1 || value > 5) {
      return failed("readiness_out_of_range", {
        en: `${key} must be a whole number between 1 and 5; received ${JSON.stringify(action.params[key])}.`,
        es: `${key} debe ser un número entero entre 1 y 5; llegó ${JSON.stringify(action.params[key])}.`,
      });
    }
  }
  const next: Readiness = { ...ctx.readiness };
  for (const key of provided) next[key] = asNumber(action.params[key])!;
  return {
    ok: true,
    detail: {
      en: `Readiness updated: energy ${next.energy}, motivation ${next.motivation}, soreness ${next.soreness}.`,
      es: `Estado actualizado: energía ${next.energy}, motivación ${next.motivation}, molestia ${next.soreness}.`,
    },
    readiness: next,
    undo: { kind: "readiness", before: { ...ctx.readiness } },
  };
}

function validateInventory(action: McpAction, ctx: McpContext): McpValidation {
  const items = action.params.items;
  if (!Array.isArray(items) || items.length === 0) {
    return failed("inventory_required", {
      en: "set_inventory needs `items`, a non-empty array of gear rows.",
      es: "set_inventory necesita `items`, un array no vacío de filas de material.",
    });
  }
  if (items.length > 40) {
    return failed("inventory_too_large", {
      en: `${items.length} items; the limit is 40.`,
      es: `${items.length} elementos; el límite es 40.`,
    });
  }

  const built: OwnedEquipment[] = [];
  for (const [index, raw] of items.entries()) {
    const row = asRecord(raw);
    if (!row) {
      return failed("inventory_row_invalid", {
        en: `items[${index}] must be an object.`,
        es: `items[${index}] debe ser un objeto.`,
      });
    }
    const presetId = asString(row.presetId);
    let item: OwnedEquipment | null = null;
    if (presetId) {
      item = ownedFromPreset(presetId, `mcp-${index}-${presetId}`);
      if (!item) {
        return failed("unknown_preset", {
          en: `items[${index}].presetId "${presetId}" is not one of the ${EQUIPMENT_PRESETS.length} gear presets.`,
          es: `items[${index}].presetId «${presetId}» no es uno de los ${EQUIPMENT_PRESETS.length} presets de material.`,
        });
      }
    } else {
      const capabilities = row.capabilities;
      if (!Array.isArray(capabilities) || capabilities.length === 0) {
        return failed("capabilities_required", {
          en: `items[${index}] needs either presetId or a non-empty capabilities array.`,
          es: `items[${index}] necesita presetId o un array de capabilities no vacío.`,
        });
      }
      const caps: Capability[] = [];
      for (const cap of capabilities) {
        if (typeof cap !== "string" || !CAPABILITIES.includes(cap as Capability)) {
          return failed("unknown_capability", {
            en: `Unknown capability ${JSON.stringify(cap)}. Valid: ${CAPABILITIES.join(", ")}.`,
            es: `Capacidad desconocida ${JSON.stringify(cap)}. Válidas: ${CAPABILITIES.join(", ")}.`,
          });
        }
        caps.push(cap as Capability);
      }
      const label = asString(row.label);
      if (!label) {
        return failed("label_required", {
          en: `items[${index}] without presetId needs a label.`,
          es: `items[${index}] sin presetId necesita un label.`,
        });
      }
      item = {
        id: `mcp-${index}`,
        presetId: "custom",
        label,
        capabilities: caps,
        maxLoadKg: null,
        incrementKg: null,
        setupMin: asNumber(row.setupMin) ?? 1,
      };
    }

    if (row.maxLoadKg !== undefined && row.maxLoadKg !== null) {
      const max = asNumber(row.maxLoadKg);
      if (max === null || max < 1 || max > 1000) {
        return failed("max_load_out_of_range", {
          en: `items[${index}].maxLoadKg must be null or a number between 1 and 1000.`,
          es: `items[${index}].maxLoadKg debe ser null o un número entre 1 y 1000.`,
        });
      }
      item.maxLoadKg = max;
    }
    if (row.incrementKg !== undefined && row.incrementKg !== null) {
      const step = asNumber(row.incrementKg);
      if (step === null || step < 0.5 || step > 50) {
        return failed("increment_out_of_range", {
          en: `items[${index}].incrementKg must be null or a number between 0.5 and 50.`,
          es: `items[${index}].incrementKg debe ser null o un número entre 0,5 y 50.`,
        });
      }
      item.incrementKg = step;
    }
    built.push(item);
  }

  return {
    ok: true,
    detail: {
      en: `Inventory set to ${built.length} item(s): ${built.map((i) => i.label).join(", ")}.`,
      es: `Equipamiento puesto en ${built.length} elemento(s): ${built.map((i) => i.label).join(", ")}.`,
    },
    settingsPatch: { inventory: built },
    undo: { kind: "settings", before: { inventory: ctx.settings?.inventory ?? [] } },
  };
}

function validateSwap(action: McpAction, ctx: McpContext): McpValidation {
  const currentId = asString(action.params.exercise_id);
  const replacementId = asString(action.params.replacement_id);
  if (!currentId || !replacementId) {
    return failed("swap_params_required", {
      en: "swap_exercise needs `exercise_id` (the slot) and `replacement_id`.",
      es: "swap_exercise necesita `exercise_id` (la casilla) y `replacement_id`.",
    });
  }
  if (!ctx.plannedExerciseIds.includes(currentId)) {
    return failed("not_in_plan", {
      en: `"${currentId}" is not one of today's slots, so there is nothing to swap.`,
      es: `«${currentId}» no es ninguna de las casillas de hoy, así que no hay nada que cambiar.`,
    });
  }
  if (replacementId === currentId) {
    return failed("same_exercise", {
      en: "The replacement is the exercise already in the slot.",
      es: "El sustituto es el mismo ejercicio que ya está en la casilla.",
    });
  }
  if (ctx.plannedExerciseIds.includes(replacementId)) {
    return failed("already_in_session", {
      en: `"${replacementId}" is already in today's session; one exercise per pattern.`,
      es: `«${replacementId}» ya está en la sesión de hoy; un ejercicio por patrón.`,
    });
  }

  const current = plannerEntry(currentId);
  const replacement = plannerEntry(replacementId);
  if (!current || !replacement) {
    return failed("unknown_exercise", {
      en: `Unknown exercise: "${currentId}" / "${replacementId}".`,
      es: `Ejercicio desconocido: «${currentId}» / «${replacementId}».`,
    });
  }
  if (replacement.traits.pattern !== current.traits.pattern) {
    return failed("pattern_mismatch", {
      en: `Swaps must keep the movement pattern: ${current.traits.pattern} → ${replacement.traits.pattern} is not a swap.`,
      es: `El cambio debe conservar el patrón de movimiento: ${current.traits.pattern} → ${replacement.traits.pattern} no es un cambio.`,
    });
  }
  if (replacement.traits.loadType !== current.traits.loadType) {
    return failed("load_type_mismatch", {
      en: `Swaps must keep the load type: ${current.traits.loadType} → ${replacement.traits.loadType} would change the prescription.`,
      es: `El cambio debe conservar el tipo de carga: ${current.traits.loadType} → ${replacement.traits.loadType} cambiaría la prescripción.`,
    });
  }
  const inventory = ctx.settings?.inventory ?? [];
  const missing = missingGear(replacement, ownedCapabilities(inventory));
  if (missing !== null) {
    return failed("gear_mismatch", {
      en: `«${replacement.exercise.name.en}» requires ${missing}, which the declared inventory does not provide.`,
      es: `«${replacement.exercise.name.es}» requiere ${missing}, que tu equipamiento declarado no ofrece.`,
    });
  }

  return {
    ok: true,
    detail: {
      en: `Slot swapped: ${current.exercise.name.en} → ${replacement.exercise.name.en}.`,
      es: `Casilla cambiada: ${current.exercise.name.es} → ${replacement.exercise.name.es}.`,
    },
    undo: { kind: "swap_row", from: currentId, to: replacementId },
  };
}

/**
 * `add_exercise` — a row the agent adds to today's session.
 *
 * The plan is the deterministic engine's, and this action does not re-plan: it
 * appends one exercise the agent wants there (the same thing the user does at
 * the rack when he decides to do one more). What it will not do is pretend:
 * the exercise must exist, be loadable with the declared gear, not already be
 * in today's session, and today must not be closed yet.
 *
 * `sets` is the prescription for the new row and defaults to 0 = "no
 * prescription": nobody said how many series, so the app must not treat the
 * first one as the completion of three (that is what fires the achievement
 * cue). An agent that *does* prescribe sends the number and owns it.
 */
function validateAddExercise(action: McpAction, ctx: McpContext): McpValidation {
  const exerciseId = asString(action.params.exercise_id);
  if (!exerciseId) {
    return failed("exercise_required", {
      en: "add_exercise needs `exercise_id` (the catalog id, e.g. \"plank\").",
      es: "add_exercise necesita `exercise_id` (el id del catálogo, p. ej. «plank»).",
    });
  }
  if (ctx.finishedToday) {
    return failed("already_finished", {
      en: "Today's session is closed; reopen it in the app before adding an exercise to it.",
      es: "La sesión de hoy está cerrada; reábrela en la app antes de añadirle un ejercicio.",
    });
  }
  const entry = plannerEntry(exerciseId);
  if (!entry) {
    return failed("unknown_exercise", {
      en: `No exercise with id "${exerciseId}" exists in the catalog.`,
      es: `No existe ningún ejercicio con id «${exerciseId}» en el catálogo.`,
    });
  }
  if (ctx.plannedExerciseIds.includes(exerciseId)) {
    return failed("already_in_session", {
      en: `"${exerciseId}" is already in today's session; one exercise per pattern.`,
      es: `«${exerciseId}» ya está en la sesión de hoy; un ejercicio por patrón.`,
    });
  }
  const missing = missingGear(
    entry,
    ownedCapabilities(ctx.settings?.inventory ?? []),
  );
  if (missing !== null) {
    return failed("gear_mismatch", {
      en: `«${entry.exercise.name.en}» requires ${missing}, which the declared inventory does not provide.`,
      es: `«${entry.exercise.name.es}» requiere ${missing}, que tu equipamiento declarado no ofrece.`,
    });
  }

  const rawSets = action.params.sets;
  const sets = rawSets === undefined || rawSets === null ? 0 : asNumber(rawSets);
  if (sets === null || !Number.isInteger(sets) || sets < 0 || sets > 12) {
    return failed("sets_out_of_range", {
      en: `sets must be a whole number between 0 (no prescription) and 12; received ${JSON.stringify(rawSets)}.`,
      es: `sets debe ser un número entero entre 0 (sin prescripción) y 12; llegó ${JSON.stringify(rawSets)}.`,
    });
  }

  const rawPosition = action.params.position;
  if (
    rawPosition !== undefined &&
    rawPosition !== "start" &&
    rawPosition !== "end"
  ) {
    return failed("position_invalid", {
      en: 'position must be "start" or "end" (default "end").',
      es: 'position debe ser «start» o «end» (por defecto «end»).',
    });
  }
  const position = rawPosition === "start" ? "start" : "end";

  return {
    ok: true,
    detail: {
      en: `${entry.exercise.name.en} added to today's session (${position === "start" ? "first" : "last"}${sets > 0 ? `, ${sets} sets` : ", no prescription"}).`,
      es: `${entry.exercise.name.es} añadido a la sesión de hoy (${position === "start" ? "el primero" : "el último"}${sets > 0 ? `, ${sets} series` : ", sin prescripción"}).`,
    },
    // The id is known here, unlike a logged set's, so the undo is complete.
    undo: { kind: "remove_row", exerciseId },
  };
}

/**
 * `set_day_focus` — "hoy toca abdomen".
 *
 * Accepts one of the app's own preset keys (`auto` | `push` | `pull` | `legs` |
 * `core`, the chips on Inicio) or an explicit list of families. Nothing else: a
 * free-text focus group would be a vocabulary no screen could show and no rule
 * could honour.
 */
function validateDayFocus(action: McpAction, ctx: McpContext): McpValidation {
  const raw = action.params.focus;
  let families: MuscleFamily[] | null = null;

  if (typeof raw === "string") {
    families = focusFamiliesOf(raw.trim());
    if (!families) {
      return failed("unknown_focus", {
        en: `focus "${raw}" is not one of the app's presets (auto | push | pull | legs | core); send an array of families for anything else.`,
        es: `focus «${raw}» no es uno de los presets de la app (auto | push | pull | legs | core); manda un array de familias para cualquier otra cosa.`,
      });
    }
  } else if (Array.isArray(raw)) {
    const parsed: MuscleFamily[] = [];
    for (const value of raw) {
      if (!isMuscleFamily(value)) {
        return failed("unknown_family", {
          en: `Unknown muscle family ${JSON.stringify(value)}.`,
          es: `Familia muscular desconocida ${JSON.stringify(value)}.`,
        });
      }
      if (!parsed.includes(value)) parsed.push(value);
    }
    families = parsed;
  } else {
    return failed("focus_required", {
      en: 'set_day_focus needs `focus`: a preset key ("core") or an array of families (["core"]).',
      es: 'set_day_focus necesita `focus`: una clave de preset («core») o un array de familias (["core"]).',
    });
  }

  const label = families.length === 0 ? "auto (no focus)" : families.join(" + ");
  return {
    ok: true,
    detail: {
      en: `Today's focus set to ${label}.`,
      es: `Enfoque de hoy puesto en ${label}.`,
    },
    dayFocus: families,
    undo: { kind: "day_focus", before: [...ctx.dayFocus] },
  };
}

/**
 * `set_week_override` — one day of his own week, in the Semana screen's own
 * vocabulary (Monday-first index 0-6).
 *
 * Three shapes, and each one means exactly what the screen's buttons mean:
 * `rest: true` makes it a rest day, a non-empty `families` array makes it a day
 * he trains those families, and an **empty** array clears his day and hands it
 * back to the planner. The generated plan is never rewritten — only his layer
 * is (the rule `applyWeekOverrides` was built on).
 */
function validateWeekOverride(action: McpAction, ctx: McpContext): McpValidation {
  const weekday = asNumber(action.params.weekday);
  if (
    weekday === null ||
    !Number.isInteger(weekday) ||
    weekday < 0 ||
    weekday > 6
  ) {
    return failed("weekday_out_of_range", {
      en: `weekday must be the Monday-first index 0-6 (0 = Monday); received ${JSON.stringify(action.params.weekday)}.`,
      es: `weekday debe ser el índice lunes-primero 0-6 (0 = lunes); llegó ${JSON.stringify(action.params.weekday)}.`,
    });
  }

  let override: WeekDayOverride | null;
  if (action.params.rest === true) {
    override = { kind: "rest" };
  } else if (Array.isArray(action.params.families)) {
    const families: MuscleFamily[] = [];
    for (const value of action.params.families) {
      if (!isMuscleFamily(value)) {
        return failed("unknown_family", {
          en: `Unknown muscle family ${JSON.stringify(value)}.`,
          es: `Familia muscular desconocida ${JSON.stringify(value)}.`,
        });
      }
      if (!families.includes(value)) families.push(value);
    }
    // Empty clears his day (the screen's own "borrar"): back to the planner's.
    override = families.length > 0 ? { kind: "train", families } : null;
  } else {
    return failed("week_override_params_required", {
      en: "set_week_override needs `rest: true`, or `families` (an empty array clears the day).",
      es: "set_week_override necesita `rest: true`, o `families` (un array vacío borra el día).",
    });
  }

  const next: Record<number, WeekDayOverride> = {
    ...(ctx.settings?.weekOverrides ?? {}),
  };
  if (override === null) delete next[weekday];
  else next[weekday] = override;

  const DAYS_ES = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
  ];
  const DAYS_EN = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const whatEs =
    override === null
      ? "vuelve al plan del motor"
      : override.kind === "rest"
        ? "día de descanso"
        : `entrena ${override.families.join(" + ")}`;
  const whatEn =
    override === null
      ? "back to the planner's day"
      : override.kind === "rest"
        ? "a rest day"
        : `trains ${override.families.join(" + ")}`;

  return {
    ok: true,
    detail: {
      en: `${DAYS_EN[weekday]}: ${whatEn}.`,
      es: `${DAYS_ES[weekday]}: ${whatEs}.`,
    },
    settingsPatch: { weekOverrides: next },
    undo: {
      kind: "settings",
      before: { weekOverrides: ctx.settings?.weekOverrides ?? {} },
    },
  };
}

/**
 * `delete_session` — removing a whole closed session from the log.
 *
 * **This is the one action the owner ordered that touches HISTORY**, and it
 * exists because his own app has had that button in Progreso all along: an
 * agent he is talking to should not be the only one unable to undo a session he
 * logged by mistake. Three things keep it honest: `confirm: true` is
 * mandatory, the unit is a whole session (never a set, never an edit), and the
 * undo carries the session back with its sets — the app rebuilds what it
 * removed. `delete_sets: true` also drops the logged sets themselves; without
 * it the sets stay in the log, detached, exactly like the screen does it.
 */
function validateDeleteSession(action: McpAction, ctx: McpContext): McpValidation {
  if (!action.confirm) {
    return failed("confirm_required", {
      en: "delete_session removes a session from the log — call it with confirm: true.",
      es: "delete_session borra una sesión del registro: llámala con confirm: true.",
    });
  }
  const sessionId = asString(action.params.session_id);
  if (!sessionId) {
    return failed("session_required", {
      en: "delete_session needs `session_id` (see read_history).",
      es: "delete_session necesita `session_id` (míralo en read_history).",
    });
  }
  const session = ctx.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return failed("unknown_session", {
      en: `No session with id "${sessionId}" is in the log.`,
      es: `No hay ninguna sesión con id «${sessionId}» en el registro.`,
    });
  }
  if (
    action.params.delete_sets !== undefined &&
    typeof action.params.delete_sets !== "boolean"
  ) {
    return failed("delete_sets_invalid", {
      en: "delete_sets must be true or false.",
      es: "delete_sets debe ser true o false.",
    });
  }
  const deleteSets = action.params.delete_sets === true;
  const day = localDayKey(session.completedAt || session.startedAt);
  return {
    ok: true,
    detail: {
      en: `Session of ${day} deleted (${session.setIds.length} sets${deleteSets ? ", sets deleted too" : ", sets kept"}); it can be undone from Ajustes.`,
      es: `Sesión del ${day} borrada (${session.setIds.length} series${deleteSets ? ", con sus series" : ", las series se conservan"}); se puede deshacer desde Ajustes.`,
    },
    // The store owns the session object and its sets: it fills the restore in.
    undo: null,
  };
}

/**
 * `set_set_time` — the hour of one set.
 *
 * It corrects a timestamp the app got wrong (a batch applied late, a set logged
 * on the wrong clock). It only ever addresses **today's** sets: a set of a
 * previous day belongs to HISTORY and no tool here edits history. The undo
 * carries the previous hour, so the correction is itself correctable.
 */
function validateSetTime(action: McpAction, ctx: McpContext): McpValidation {
  const setId = asString(action.params.set_id);
  if (!setId) {
    return failed("set_required", {
      en: "set_set_time needs `set_id` (the id the receipt of log_set carried / the app's log).",
      es: "set_set_time necesita `set_id` (el id que traía el acuse de log_set / el registro de la app).",
    });
  }
  const set = ctx.todaySets.find((s) => s.id === setId);
  if (!set) {
    return failed("set_not_found", {
      en: `No set with id "${setId}" was logged today. Past days are immutable, so only today's sets can be re-timed.`,
      es: `Hoy no se ha registrado ninguna serie con id «${setId}». Los días pasados son inmutables: solo se puede corregir la hora de las series de hoy.`,
    });
  }
  const when = validateOccurredAt(action.params.occurred_at, ctx);
  if ("rule" in when) return failed(when.rule, when.detail);
  if (when.at === null) {
    return failed("occurred_at_required", {
      en: "set_set_time needs `occurred_at` (an ISO-8601 instant of today).",
      es: "set_set_time necesita `occurred_at` (un instante ISO-8601 de hoy).",
    });
  }
  return {
    ok: true,
    detail: {
      en: `Set re-timed to ${when.at}.`,
      es: `Serie recolocada a las ${when.at}.`,
    },
    occurredAt: when.at,
    undo: { kind: "set_time", setId, before: set.timestamp },
  };
}

/**
 * `reorder_row` — the drag of Entrenamiento's queue (2026-10-19).
 *
 * The position is 1-based because that is what the screen prints and what a
 * person says ("ponlo tercero"). The app still validates the id against the
 * session it is showing, so a stale plan cannot move a row that is not there.
 */
function validateReorder(action: McpAction, ctx: McpContext): McpValidation {
  const exerciseId = asString(action.params.exercise_id);
  if (!exerciseId) {
    return failed("exercise_required", {
      en: "reorder_row needs `exercise_id` (one of today's rows).",
      es: "reorder_row necesita `exercise_id` (una de las filas de hoy).",
    });
  }
  const from = ctx.plannedExerciseIds.indexOf(exerciseId);
  if (from < 0) {
    return failed("not_in_today", {
      en: `"${exerciseId}" is not in today's session, so it has no position to move.`,
      es: `«${exerciseId}» no está en la sesión de hoy, así que no tiene posición que mover.`,
    });
  }
  const position = asNumber(action.params.position);
  if (
    position === null ||
    !Number.isInteger(position) ||
    position < 1 ||
    position > ctx.plannedExerciseIds.length
  ) {
    return failed("position_out_of_range", {
      en: `position must be a whole number from 1 to ${ctx.plannedExerciseIds.length}; received ${JSON.stringify(action.params.position)}.`,
      es: `position debe ser un entero de 1 a ${ctx.plannedExerciseIds.length}; llegó ${JSON.stringify(action.params.position)}.`,
    });
  }
  return {
    ok: true,
    detail: {
      en: `"${exerciseId}" moved to position ${position} of ${ctx.plannedExerciseIds.length}.`,
      es: `«${exerciseId}» movido a la posición ${position} de ${ctx.plannedExerciseIds.length}.`,
    },
    undo: {
      kind: "settings",
      before: { rowOrder: ctx.settings?.rowOrder ?? null },
    },
  };
}

/**
 * `set_exercise_state` — the three marks a row carries in Entrenamiento:
 * `active` (neither mark), `skipped` (out of the way, still prescribed) and
 * `postponed` (pushed to the end). It is not a delete: the plan keeps the
 * prescription, exactly as the screen's buttons do.
 */
function validateExerciseState(
  action: McpAction,
  ctx: McpContext,
): McpValidation {
  const exerciseId = asString(action.params.exercise_id);
  if (!exerciseId) {
    return failed("exercise_required", {
      en: "set_exercise_state needs `exercise_id`.",
      es: "set_exercise_state necesita `exercise_id`.",
    });
  }
  if (!ctx.plannedExerciseIds.includes(exerciseId)) {
    return failed("not_in_today", {
      en: `"${exerciseId}" is not in today's session.`,
      es: `«${exerciseId}» no está en la sesión de hoy.`,
    });
  }
  const state = asString(action.params.state);
  if (state !== "active" && state !== "skipped" && state !== "postponed") {
    return failed("state_invalid", {
      en: 'state must be "active", "skipped" or "postponed".',
      es: 'state debe ser "active", "skipped" o "postponed".',
    });
  }
  const label =
    state === "active"
      ? { en: "active again", es: "de vuelta a la cola" }
      : state === "skipped"
        ? { en: "skipped for today", es: "saltado por hoy" }
        : { en: "postponed to the end", es: "pospuesto al final" };
  return {
    ok: true,
    detail: {
      en: `"${exerciseId}" ${label.en}.`,
      es: `«${exerciseId}» ${label.es}.`,
    },
    undo: {
      kind: "settings",
      before: { sessionAside: ctx.settings?.sessionAside ?? null },
    },
  };
}

/** `reset_order` — back to the generator's own sequence for today. */
function validateResetOrder(ctx: McpContext): McpValidation {
  const order = ctx.settings?.rowOrder;
  if (!order || order.date !== ctx.todayPrefix) {
    return failed("no_custom_order", {
      en: "Today's session is already in the plan's own order.",
      es: "La sesión de hoy ya está en el orden del plan.",
    });
  }
  return {
    ok: true,
    detail: {
      en: "Today's session returned to the plan's order.",
      es: "La sesión de hoy ha vuelto al orden del plan.",
    },
    undo: { kind: "settings", before: { rowOrder: order } },
  };
}

/**
 * `swap_week_days` — the drag of Semana (2026-10-19). Monday-first indices;
 * the swap is computed over the effective week the screen is showing, and a
 * pair with identical plans is refused instead of writing a custom-day badge
 * for nothing.
 */
function validateWeekSwap(action: McpAction, ctx: McpContext): McpValidation {
  const from = asNumber(action.params.from_weekday);
  const to = asNumber(action.params.to_weekday);
  if (
    from === null ||
    to === null ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from > 6 ||
    to > 6
  ) {
    return failed("weekday_out_of_range", {
      en: "from_weekday and to_weekday must be whole numbers 0-6 (0 = Monday).",
      es: "from_weekday y to_weekday deben ser enteros 0-6 (0 = lunes).",
    });
  }
  if (from === to) {
    return failed("weekday_same", {
      en: "A day cannot be swapped with itself.",
      es: "Un día no se puede intercambiar consigo mismo.",
    });
  }
  if (ctx.weekDays.length !== 7) {
    return failed("week_unavailable", {
      en: "The app has not published this week yet; try again once Semana has rendered.",
      es: "La app aún no ha publicado esta semana; reinténtalo cuando Semana haya cargado.",
    });
  }
  const next = swapWeekOverrides(
    ctx.weekDays,
    ctx.settings?.weekOverrides,
    from,
    to,
  );
  if (!next) {
    return failed("week_days_unchanged", {
      en: "Both days already have the same plan; there is nothing to swap.",
      es: "Ambos días ya tienen el mismo plan; no hay nada que intercambiar.",
    });
  }
  return {
    ok: true,
    detail: {
      en: `Days ${from} and ${to} swapped (Monday-first). Their sessions moved with them.`,
      es: `Días ${from} y ${to} intercambiados (lunes primero). Sus sesiones se han movido con ellos.`,
    },
    undo: {
      kind: "settings",
      before: { weekOverrides: ctx.settings?.weekOverrides ?? {} },
    },
  };
}

/**
 * `undo` (2026-10-19, second round) — the agent closes its own loop.
 *
 * Every applied receipt carries an `undoToken`, but until now only the human
 * could press *Deshacer* in Ajustes. Three guards keep this from loosening
 * anything: the token must be **applied and still undoable**, it must belong to
 * the **same origin** that is asking (one agent does not unwind another
 * agent's work), and it never reaches a **closed session** — undoing
 * `finish_session` (reopening HISTORY) or deleting/restoring a whole session
 * stays a human decision from Ajustes. An undo of an undo is not offered: the
 * loop closes once, and the ledger records it.
 */
function validateUndo(action: McpAction, ctx: McpContext): McpValidation {
  const token = asString(action.params.undo_token);
  if (!token) {
    return failed("undo_token_required", {
      en: "undo needs `undo_token` (the undoToken of an applied receipt).",
      es: "undo necesita `undo_token` (el undoToken de un acuse aplicado).",
    });
  }
  const entry = ctx.undoable.find((e) => e.id === token);
  if (!entry) {
    return failed("undo_token_unknown", {
      en: `No applied, still-undoable action with id "${token}". Check it with read_receipts; an already-undone or rejected action cannot be undone again.`,
      es: `No hay ninguna acción aplicada y aún deshacible con id «${token}». Mírala en read_receipts: una acción ya deshecha o rechazada no se puede deshacer otra vez.`,
    });
  }
  if (entry.origin !== action.origin) {
    return failed("undo_not_yours", {
      en: `Action "${token}" was requested by ${entry.origin}, not by ${action.origin}: only the agent that made a change may undo it.`,
      es: `La acción «${token}» la pidió ${entry.origin}, no ${action.origin}: solo el agente que hizo el cambio puede deshacerlo.`,
    });
  }
  if (entry.type === "finish_session" || entry.type === "delete_session") {
    return failed("undo_session_closed", {
      en: `"${token}" is a ${entry.type}: opening or restoring HISTORY is not undoable by an agent — the owner undoes it from Ajustes → Acciones de agentes.`,
      es: `«${token}» es un ${entry.type}: abrir o restaurar el HISTORIAL no lo deshace un agente — el dueño lo hace desde Ajustes → Acciones de agentes.`,
    });
  }
  return {
    ok: true,
    detail: {
      en: `Undoing "${token}" (${entry.type}).`,
      es: `Deshaciendo «${token}» (${entry.type}).`,
    },
    // The store owns the ledger: it performs the op and drops the token.
    undo: null,
  };
}

/**
 * `save_routine` — create or rewrite one of the user's own templates (06).
 *
 * The same sanitizer the editor uses (`lib/routines.ts`) runs on the way in,
 * but this channel refuses instead of silently clamping: an agent that asked
 * for 20 sets deserves the number back, not a quiet 12. `routine_id` updates
 * an existing template (and is refused when it does not exist); without it a
 * new one is created. Undo restores the whole previous list — a template edit
 * is one write, so one reversal.
 */
function validateSaveRoutine(action: McpAction, ctx: McpContext): McpValidation {
  const name = asString(action.params.name);
  if (!name) {
    return failed("routine_name_required", {
      en: "save_routine needs `name` (the template's name).",
      es: "save_routine necesita `name` (el nombre de la plantilla).",
    });
  }
  if (name.length > ROUTINE_LIMITS.name) {
    return failed("routine_name_too_long", {
      en: `name is ${name.length} characters; the limit is ${ROUTINE_LIMITS.name}.`,
      es: `name tiene ${name.length} caracteres; el límite es ${ROUTINE_LIMITS.name}.`,
    });
  }
  const notes = action.params.notes;
  if (notes !== undefined && typeof notes !== "string") {
    return failed("routine_notes_invalid", {
      en: "notes must be text.",
      es: "notes debe ser texto.",
    });
  }
  if (typeof notes === "string" && notes.length > ROUTINE_LIMITS.notes) {
    return failed("routine_notes_too_long", {
      en: `notes is ${notes.length} characters; the limit is ${ROUTINE_LIMITS.notes}.`,
      es: `notes tiene ${notes.length} caracteres; el límite es ${ROUTINE_LIMITS.notes}.`,
    });
  }

  const current = normalizeRoutines(ctx.settings?.routines);
  const routineId = asString(action.params.routine_id);
  const existing = routineId
    ? current.find((entry) => entry.id === routineId) ?? null
    : null;
  if (routineId && !existing) {
    return failed("unknown_routine", {
      en: `No routine with id "${routineId}" exists; omit routine_id to create one.`,
      es: `No existe ninguna rutina con id «${routineId}»; omite routine_id para crear una.`,
    });
  }

  const rawItems = action.params.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return failed("routine_items_required", {
      en: "save_routine needs `items`, a non-empty array of { exercise_id, sets, reps_min, reps_max, rest_sec, rir }.",
      es: "save_routine necesita `items`, un array no vacío de { exercise_id, sets, reps_min, reps_max, rest_sec, rir }.",
    });
  }
  if (rawItems.length > ROUTINE_LIMITS.items) {
    return failed("routine_items_too_many", {
      en: `${rawItems.length} items; the limit is ${ROUTINE_LIMITS.items}.`,
      es: `${rawItems.length} elementos; el límite es ${ROUTINE_LIMITS.items}.`,
    });
  }

  const items: RoutineItem[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of rawItems.entries()) {
    const row = asRecord(raw);
    const exerciseId = row ? asString(row.exercise_id) : null;
    if (!exerciseId) {
      return failed("exercise_required", {
        en: `items[${index}] needs \`exercise_id\` (a catalog id).`,
        es: `items[${index}] necesita \`exercise_id\` (un id del catálogo).`,
      });
    }
    if (!isKnownExercise(exerciseId)) {
      return failed("unknown_exercise", {
        en: `items[${index}]: no exercise with id "${exerciseId}" exists in the catalog.`,
        es: `items[${index}]: no existe ningún ejercicio con id «${exerciseId}» en el catálogo.`,
      });
    }
    if (seen.has(exerciseId)) {
      return failed("routine_duplicate_exercise", {
        en: `items[${index}] repeats "${exerciseId}": one entry per exercise.`,
        es: `items[${index}] repite «${exerciseId}»: una entrada por ejercicio.`,
      });
    }
    seen.add(exerciseId);

    // Refuse, never clamp: the number an agent asked for comes back with the
    // rule, exactly like reps_out_of_range does for a logged set.
    const bounds: Array<[string, number | undefined, readonly [number, number]]> = [
      ["sets", row?.sets as number | undefined, ROUTINE_LIMITS.sets],
      ["reps_min", row?.reps_min as number | undefined, ROUTINE_LIMITS.reps],
      ["reps_max", row?.reps_max as number | undefined, ROUTINE_LIMITS.reps],
      ["rest_sec", row?.rest_sec as number | undefined, ROUTINE_LIMITS.restSec],
      ["rir", row?.rir as number | undefined, ROUTINE_LIMITS.rir],
    ];
    for (const [key, value, [min, max]] of bounds) {
      if (value === undefined) continue;
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        !Number.isInteger(value) ||
        value < min ||
        value > max
      ) {
        return failed("routine_value_out_of_range", {
          en: `items[${index}].${key} must be a whole number between ${min} and ${max}; received ${JSON.stringify(value)}.`,
          es: `items[${index}].${key} debe ser un entero entre ${min} y ${max}; llegó ${JSON.stringify(value)}.`,
        });
      }
    }
    const item = routineItemFor(exerciseId, {
      ...(typeof row?.sets === "number" ? { sets: row.sets } : {}),
      ...(typeof row?.reps_min === "number" ? { repsMin: row.reps_min } : {}),
      ...(typeof row?.reps_max === "number" ? { repsMax: row.reps_max } : {}),
      ...(typeof row?.rest_sec === "number" ? { restSec: row.rest_sec } : {}),
      ...(typeof row?.rir === "number" ? { rir: row.rir } : {}),
    });
    if (!item) {
      return failed("unknown_exercise", {
        en: `items[${index}]: "${exerciseId}" could not become a routine item.`,
        es: `items[${index}]: «${exerciseId}» no se ha podido convertir en un elemento de rutina.`,
      });
    }
    items.push(item);
  }

  const stored = existing
    ? normalizeRoutine({
        ...existing,
        name,
        ...(typeof notes === "string" ? { notes } : {}),
        items,
        updatedAt: ctx.now.toISOString(),
      })
    : makeRoutine(name, items, ctx.now, typeof notes === "string" ? notes : undefined);
  if (!stored) {
    return failed("routine_invalid", {
      en: "The routine has no name or no usable exercise; nothing was saved.",
      es: "La rutina no tiene nombre ni ningún ejercicio usable; no se ha guardado nada.",
    });
  }

  return {
    ok: true,
    detail: {
      en: `Routine "${stored.name}" saved (${stored.items.length} exercise(s), id ${stored.id}).`,
      es: `Rutina «${stored.name}» guardada (${stored.items.length} ejercicio(s), id ${stored.id}).`,
    },
    settingsPatch: { routines: upsertRoutine(current, stored) },
    undo: { kind: "settings", before: { routines: ctx.settings?.routines ?? [] } },
  };
}

/**
 * `apply_routine` — pour one template into today (the screen's «Usar hoy»).
 *
 * Each item goes through the same `addExerciseToToday` the button uses, so a
 * routine cannot smuggle in an exercise the session would refuse. Rows already
 * in today are skipped, not duplicated; if nothing can be added the action is
 * refused instead of reporting a change that did not happen.
 */
function validateApplyRoutine(action: McpAction, ctx: McpContext): McpValidation {
  const routineId = asString(action.params.routine_id);
  if (!routineId) {
    return failed("routine_required", {
      en: "apply_routine needs `routine_id` (from read_current_state routines or the app).",
      es: "apply_routine necesita `routine_id` (de las rutinas de read_current_state o de la app).",
    });
  }
  const routine =
    normalizeRoutines(ctx.settings?.routines).find((entry) => entry.id === routineId) ?? null;
  if (!routine) {
    return failed("unknown_routine", {
      en: `No routine with id "${routineId}" exists.`,
      es: `No existe ninguna rutina con id «${routineId}».`,
    });
  }
  if (ctx.finishedToday) {
    return failed("already_finished", {
      en: "Today's session is closed; a routine can only be poured into an open day.",
      es: "La sesión de hoy está cerrada; una rutina solo se vierte en un día abierto.",
    });
  }
  const addable = routine.items
    .map((item) => item.exerciseId)
    .filter((id) => !ctx.plannedExerciseIds.includes(id));
  if (addable.length === 0) {
    return failed("already_in_session", {
      en: `Every exercise of "${routine.name}" is already in today's session.`,
      es: `Todos los ejercicios de «${routine.name}» ya están en la sesión de hoy.`,
    });
  }
  return {
    ok: true,
    detail: {
      en: `Routine "${routine.name}" poured into today: ${addable.length} exercise(s) added (${addable.join(", ")}).`,
      es: `Rutina «${routine.name}» vertida en hoy: ${addable.length} ejercicio(s) añadido(s) (${addable.join(", ")}).`,
    },
    // Complete here: the ids that will be added are exactly these.
    undo: { kind: "remove_rows", exerciseIds: addable },
  };
}

/** `delete_routine` — drop one template. Confirmable, and fully restorable. */
function validateDeleteRoutine(action: McpAction, ctx: McpContext): McpValidation {
  if (!action.confirm) {
    return failed("confirm_required", {
      en: "delete_routine removes one of the owner's templates — call it with confirm: true.",
      es: "delete_routine borra una de las plantillas del dueño: llámala con confirm: true.",
    });
  }
  const routineId = asString(action.params.routine_id);
  if (!routineId) {
    return failed("routine_required", {
      en: "delete_routine needs `routine_id`.",
      es: "delete_routine necesita `routine_id`.",
    });
  }
  const current = normalizeRoutines(ctx.settings?.routines);
  const routine = current.find((entry) => entry.id === routineId) ?? null;
  if (!routine) {
    return failed("unknown_routine", {
      en: `No routine with id "${routineId}" exists.`,
      es: `No existe ninguna rutina con id «${routineId}».`,
    });
  }
  return {
    ok: true,
    detail: {
      en: `Routine "${routine.name}" deleted (${routine.items.length} exercise(s)); undo restores it.`,
      es: `Rutina «${routine.name}» borrada (${routine.items.length} ejercicio(s)); deshacer la restaura.`,
    },
    settingsPatch: { routines: removeRoutine(current, routineId) },
    undo: { kind: "settings", before: { routines: ctx.settings?.routines ?? [] } },
  };
}

/** `set_language` — the interface language (en | es). Display-only. */
function validateLanguage(action: McpAction, ctx: McpContext): McpValidation {
  const language = asString(action.params.language);
  if (language !== "en" && language !== "es") {
    return failed("language_invalid", {
      en: 'language must be "en" or "es".',
      es: 'language debe ser "en" o "es".',
    });
  }
  return {
    ok: true,
    detail: {
      en: `Interface language set to ${language}.`,
      es: `Idioma de la interfaz puesto en ${language}.`,
    },
    settingsPatch: { language },
    undo: {
      kind: "settings",
      before: { language: ctx.settings?.language ?? "es" },
    },
  };
}

/** `set_sound` — the three feedback cues: on/off and master volume (0-1). */
function validateSound(action: McpAction, ctx: McpContext): McpValidation {
  const enabled = action.params.enabled;
  const volume = action.params.volume;
  if (enabled === undefined && volume === undefined) {
    return failed("sound_params_required", {
      en: "set_sound needs `enabled` (true/false) or `volume` (0-1).",
      es: "set_sound necesita `enabled` (true/false) o `volume` (0-1).",
    });
  }
  if (enabled !== undefined && typeof enabled !== "boolean") {
    return failed("enabled_invalid", {
      en: "enabled must be true or false.",
      es: "enabled debe ser true o false.",
    });
  }
  if (
    volume !== undefined &&
    (typeof volume !== "number" || !Number.isFinite(volume) || volume < 0 || volume > 1)
  ) {
    return failed("volume_out_of_range", {
      en: `volume must be a number between 0 and 1; received ${JSON.stringify(volume)}.`,
      es: `volume debe ser un número entre 0 y 1; llegó ${JSON.stringify(volume)}.`,
    });
  }
  const before = ctx.settings?.sound ?? { enabled: true, volume: 0.5 };
  const next = {
    enabled: typeof enabled === "boolean" ? enabled : before.enabled,
    volume: typeof volume === "number" ? volume : before.volume,
  };
  return {
    ok: true,
    detail: {
      en: `Sound cues ${next.enabled ? "on" : "off"} at volume ${next.volume}.`,
      es: `Avisos de sonido ${next.enabled ? "activados" : "desactivados"} con volumen ${next.volume}.`,
    },
    settingsPatch: { sound: next },
    undo: { kind: "settings", before: { sound: before } },
  };
}

/**
 * `reset_model` — clear the local decision model (Ajustes → reset). It is the
 * one settings action with nothing to restore *by default*: the learned
 * weights are re-learned from the next logs. The undo still carries the model
 * that existed at this instant, so a reset by mistake is recoverable while the
 * receipt lives in the ledger.
 */
function validateResetModel(action: McpAction, ctx: McpContext): McpValidation {
  if (!action.confirm) {
    return failed("confirm_required", {
      en: "reset_model clears the learned local model — call it with confirm: true.",
      es: "reset_model borra el modelo local aprendido: llámala con confirm: true.",
    });
  }
  return {
    ok: true,
    detail: {
      en: "Local decision model reset (it re-learns from the next logs; undo restores this instant's model).",
      es: "Modelo local de decisión reiniciado (volverá a aprender de los próximos registros; deshacer restaura el modelo de este instante).",
    },
    undo: { kind: "decision_model", before: ctx.model },
  };
}

/**
 * `regenerate_week` — the Semana screen's «Regenerar»: re-roll the generated
 * week. The owner's authored layer (`weekOverrides`) is never touched, and the
 * undo restores the seed, so the exact previous week comes back.
 */
function validateRegenerateWeek(action: McpAction, ctx: McpContext): McpValidation {
  void action;
  return {
    ok: true,
    detail: {
      en: "Week regenerated (your authored days in Semana are kept).",
      es: "Semana regenerada (tus días autorizados en Semana se conservan).",
    },
    undo: { kind: "week_seed", before: ctx.weekSeed },
  };
}

// ── The batch runner (idempotency lives here) ───────────────────────────

/** What the impure half (the store) reports back about one applied action. */
export interface McpApplyResult {
  /** `false` = the app could not perform it after all (never assumed). */
  ok?: boolean;
  undo?: McpUndoOp | null;
  detail?: McpText;
  rule?: string;
}

export interface McpRunResult {
  /** Every receipt to write back: malformed entries, replays and new ones. */
  receipts: McpReceipt[];
  /** New ledger entries to persist (replays are already in the ledger). */
  fresh: McpLedgerEntry[];
}

/**
 * Walk one inbox batch: replay what the ledger already knows, validate the
 * rest, hand each to `apply` and build the receipts.
 *
 * `apply` is the only impure part, which is what makes the contract testable
 * without React: an id is answered exactly once with the same receipt, `ctx`
 * advances only for work the app actually did (so action N+1 in the same file
 * is validated against what N really produced), and a rejected action never
 * mutates anything.
 */
export function runMcpActions(input: {
  actions: McpAction[];
  /** Receipts for entries that could not become actions (bad JSON, no id). */
  malformed?: McpReceipt[];
  ctx: McpContext;
  ledger: readonly McpLedgerEntry[];
  apply: (action: McpAction, validation: McpValidation) => McpApplyResult | void;
}): McpRunResult {
  const { ctx, ledger, apply } = input;
  const receipts: McpReceipt[] = [...(input.malformed ?? [])];
  const fresh: McpLedgerEntry[] = [];
  const seen = new Map(ledger.map((e) => [e.id, e] as const));

  for (const action of input.actions) {
    const prior = seen.get(action.id);
    // Idempotency: a replayed id gets its original receipt and changes
    // nothing, however many times the agent retries after a timeout.
    if (prior) {
      receipts.push(receiptOf(prior));
      continue;
    }

    const head = {
      id: action.id,
      type: action.type,
      origin: action.origin,
      ...(action.requestedAt ? { requestedAt: action.requestedAt } : {}),
      appliedAt: new Date().toISOString(),
    };
    const validation = validateMcpAction(action, ctx);
    let entry: McpLedgerEntry;

    if (!validation.ok) {
      entry = {
        ...head,
        status: "rejected",
        detail: validation.detail,
        rule: validation.rule,
      };
    } else {
      const result = apply(action, validation) ?? {};
      const applied = result.ok !== false;
      const detail = result.detail ?? validation.detail;
      const undo = result.undo !== undefined ? result.undo : validation.undo;

      if (applied) {
        // The context advances only for work the app actually did, so action N+1
        // in the same file is validated against what N really produced.
        if (validation.settingsPatch) {
          ctx.settings = {
            ...(ctx.settings ?? {}),
            ...validation.settingsPatch,
          } as TLSettingsData;
        }
        if (validation.readiness) ctx.readiness = validation.readiness;
        if (action.type === "log_set") ctx.todaySetCount += 1;
        if (action.type === "finish_session") ctx.finishedToday = true;
        if (action.type === "swap_exercise") {
          const from = String(action.params.exercise_id ?? "");
          const to = String(action.params.replacement_id ?? "");
          ctx.plannedExerciseIds = ctx.plannedExerciseIds.map((id) =>
            id === from ? to : id,
          );
        }
        // 2026-10-13: the day-level actions advance the context too, so two
        // actions in one file cannot both add the same exercise (or both claim
        // to be the first focus of the day) against a stale picture.
        if (action.type === "add_exercise") {
          ctx.plannedExerciseIds = [
            ...ctx.plannedExerciseIds,
            String(action.params.exercise_id ?? ""),
          ];
        }
        // 2026-10-19 (second round): the four stateful parity actions advance
        // the context too, for the same reason the others do — action N+1 in
        // one file is validated against what N really produced.
        if (action.type === "apply_routine") {
          const routine = normalizeRoutines(ctx.settings?.routines).find(
            (entry) => entry.id === String(action.params.routine_id ?? ""),
          );
          if (routine) {
            const added = routine.items
              .map((item) => item.exerciseId)
              .filter((id) => !ctx.plannedExerciseIds.includes(id));
            ctx.plannedExerciseIds = [...ctx.plannedExerciseIds, ...added];
          }
        }
        if (action.type === "reset_model") ctx.model = null;
        if (action.type === "regenerate_week") ctx.weekSeed += 1;
        if (action.type === "undo") {
          // The token is consumed: a second undo of the same id in the same
          // file hits `undo_token_unknown` instead of replaying the operation.
          const token = String(action.params.undo_token ?? "");
          ctx.undoable = ctx.undoable.filter((entry) => entry.id !== token);
        }
        if (validation.dayFocus) ctx.dayFocus = validation.dayFocus;
        if (action.type === "reorder_row") {
          const id = String(action.params.exercise_id ?? "");
          const to = Number(action.params.position) - 1;
          const from = ctx.plannedExerciseIds.indexOf(id);
          if (from >= 0 && to >= 0 && to < ctx.plannedExerciseIds.length) {
            const next = [...ctx.plannedExerciseIds];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved!);
            ctx.plannedExerciseIds = next;
          }
        }
        if (action.type === "reset_order") {
          ctx.settings = { ...(ctx.settings ?? {}), rowOrder: null } as TLSettingsData;
        }
        if (action.type === "swap_week_days") {
          const next = swapWeekOverrides(
            ctx.weekDays,
            ctx.settings?.weekOverrides,
            Number(action.params.from_weekday),
            Number(action.params.to_weekday),
          );
          if (next) {
            ctx.settings = {
              ...(ctx.settings ?? {}),
              weekOverrides: next,
            } as TLSettingsData;
          }
        }
        if (action.type === "delete_session") {
          const gone = String(action.params.session_id ?? "");
          ctx.sessions = ctx.sessions.filter((s) => s.id !== gone);
        }
      }

      entry = applied
        ? {
            ...head,
            status: "applied",
            detail,
            ...(undo ? { undoToken: action.id, undo } : {}),
          }
        : {
            ...head,
            status: "rejected",
            detail,
            ...(result.rule ? { rule: result.rule } : {}),
          };
    }

    seen.set(entry.id, entry);
    fresh.push(entry);
    receipts.push(receiptOf(entry));
  }

  return { receipts, fresh };
}

// ── Ledger helpers ──────────────────────────────────────────────────────────

/** An applied action is only undoable while it still carries its operation. */
export function canUndo(entry: McpLedgerEntry): boolean {
  return entry.status === "applied" && !!entry.undo && !entry.undoneAt;
}

/**
 * The receipt an agent sees: the ledger entry minus the local undo payload
 * (the operation is the app's business, not the caller's).
 */
export function receiptOf(entry: McpLedgerEntry): McpReceipt {
  const receipt: McpReceipt = {
    id: entry.id,
    type: entry.type,
    origin: entry.origin,
    status: entry.status,
    detail: entry.detail,
  };
  if (entry.requestedAt) receipt.requestedAt = entry.requestedAt;
  if (entry.appliedAt) receipt.appliedAt = entry.appliedAt;
  if (entry.rule) receipt.rule = entry.rule;
  if (entry.undoToken) receipt.undoToken = entry.undoToken;
  if (entry.undoneAt) receipt.undoneAt = entry.undoneAt;
  return receipt;
}

/** Newest first, for the audit list. */
export function sortAudit(entries: readonly McpLedgerEntry[]): McpLedgerEntry[] {
  return [...entries].sort((a, b) => {
    const ta = a.appliedAt ?? a.requestedAt ?? "";
    const tb = b.appliedAt ?? b.requestedAt ?? "";
    return tb.localeCompare(ta);
  });
}

/** Keep the ledger bounded without ever dropping an entry that can still be
 *  undone (those are the ones the owner may still need). */
export function trimLedger(entries: readonly McpLedgerEntry[]): McpLedgerEntry[] {
  if (entries.length <= MCP_LEDGER_MAX) return [...entries];
  const undoable = entries.filter(canUndo);
  const rest = entries.filter((e) => !canUndo(e));
  const room = Math.max(0, MCP_LEDGER_MAX - undoable.length);
  return [...undoable, ...rest.slice(-room)];
}
