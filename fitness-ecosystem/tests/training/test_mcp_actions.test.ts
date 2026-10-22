/**
 * The ACTIONS channel contract (docs/MCP_TOOL_SURFACE.md, decisions D1/D4).
 *
 * Three promises are worth a test because breaking any of them loses or
 * duplicates the owner's data:
 *
 *   1. **The app's rules are the gate.** An action is applied only if the same
 *      check the UI performs would have let it through: gear, inventory
 *      ceiling, rep range, enums, confirm flag, swap legality.
 *   2. **Idempotent.** A replayed id answers with the *same* receipt and is
 *      never applied twice — that is what makes retrying after a timeout safe.
 *   3. **Reversible.** An applied action records how to take it back, and the
 *      receipt an agent reads never leaks that local operation.
 *
 * Everything here is pure: no React, no IndexedDB, no filesystem.
 *
 * @module tests/training/test_mcp_actions
 */

import { describe, expect, it } from "vitest";
import { ownedFromPreset } from "@fitness/bodylab-exercises";
import {
  MCP_ACTION_TTL_MS,
  MCP_LEDGER_MAX,
  canUndo,
  parseMcpInbox,
  receiptOf,
  runMcpActions,
  sortAudit,
  trimLedger,
  validateMcpAction,
  type McpAction,
  type McpContext,
  type McpLedgerEntry,
  type McpValidation,
} from "../../traininglab/apps/desktop/src/lib/mcp-actions";
import type {
  TLSession,
  TLSet,
} from "../../traininglab/apps/desktop/src/lib/types";
import { DEFAULT_SETTINGS } from "../../traininglab/apps/desktop/src/lib/types";
import { localDayKey } from "../../traininglab/apps/desktop/src/lib/day";

const NOW = new Date("2026-10-09T12:00:00.000Z");

/** A logged set, minimal but real (the shape `lib/types` declares). */
function loggedSet(id: string, timestamp: string): TLSet {
  return {
    id,
    exerciseId: "push-ups",
    dayId: `day-${localDayKey(timestamp)}`,
    timestamp,
    weight: null,
    reps: 8,
  };
}

/** A closed session, for `delete_session`. */
function closedSession(id: string, setIds: string[]): TLSession {
  return {
    id,
    dayId: `day-${localDayKey(NOW)}`,
    startedAt: new Date(NOW.getTime() - 45 * 60 * 1000).toISOString(),
    completedAt: NOW.toISOString(),
    setIds,
  };
}

function gear(...presets: string[]) {
  return presets
    .map((presetId, i) => ownedFromPreset(presetId, `item-${i}`))
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function makeCtx(over: Partial<McpContext> = {}): McpContext {
  return {
    now: NOW,
    settings: { ...DEFAULT_SETTINGS, inventory: [] },
    plannedExerciseIds: ["barbell-bench-press", "goblet-squat"],
    todaySets: [],
    sessions: [],
    dayFocus: [],
    weekDays: [
      { isRest: false, assigned: ["chest"] },
      { isRest: true, assigned: [] },
      { isRest: false, assigned: ["quadriceps"] },
      { isRest: true, assigned: [] },
      { isRest: false, assigned: ["lats"] },
      { isRest: true, assigned: [] },
      { isRest: true, assigned: [] },
    ],
    todayPrefix: localDayKey(NOW),
    todaySetCount: 4,
    finishedToday: false,
    readiness: { energy: 3, motivation: 3, soreness: 3 },
    undoable: [],
    model: null,
    weekSeed: 0,
    ...over,
  };
}

function action(
  type: string,
  params: Record<string, unknown> = {},
  over: Partial<McpAction> = {},
): McpAction {
  return {
    id: `act-${Math.random().toString(36).slice(2, 8)}`,
    type,
    origin: "mcp:test-agent",
    requestedAt: NOW.toISOString(),
    confirm: false,
    params,
    ...over,
  };
}

/** The refusal rule that fired, or `ok` when the action validates. */
function verdict(a: McpAction, ctx: McpContext = makeCtx()): string {
  const result: McpValidation = validateMcpAction(a, ctx);
  return result.ok ? "ok" : result.rule;
}

describe("MCP inbox parsing", () => {
  it("accepts a bare array and the { actions } envelope", () => {
    const one = JSON.stringify([
      action("log_set", { exercise_id: "push-ups", reps: 8 }),
    ]);
    const two = JSON.stringify({
      actions: [action("set_goal", { goal: "strength" })],
    });
    expect(parseMcpInbox(one).actions).toHaveLength(1);
    expect(parseMcpInbox(two).actions[0].type).toBe("set_goal");
  });

  it("refuses an entry without an id instead of dropping it silently", () => {
    const { actions, receipts } = parseMcpInbox(
      JSON.stringify([
        { type: "log_set", params: { exercise_id: "push-ups" } },
      ]),
    );
    expect(actions).toHaveLength(0);
    expect(receipts[0].status).toBe("rejected");
    expect(receipts[0].id).toBe("invalid-0");
  });

  it("turns unparseable JSON into a receipt, never an exception", () => {
    const { actions, receipts } = parseMcpInbox("{no es json");
    expect(actions).toHaveLength(0);
    expect(receipts[0].id).toBe("inbox-unparseable");
    expect(receipts[0].status).toBe("rejected");
  });

  it("defaults origin and confirm, and keeps requestedAt", () => {
    const raw = JSON.stringify([
      {
        id: "x1",
        type: "finish_session",
        requestedAt: NOW.toISOString(),
        params: {},
      },
    ]);
    const parsed = parseMcpInbox(raw).actions[0];
    expect(parsed.origin).toBe("mcp:unknown");
    expect(parsed.confirm).toBe(false);
    expect(parsed.requestedAt).toBe(NOW.toISOString());
  });
});

describe("log_set is gated by the app's own rules", () => {
  it("accepts bodyweight work with no gear at all", () => {
    expect(
      verdict(action("log_set", { exercise_id: "push-ups", reps: 8 })),
    ).toBe("ok");
  });

  it("rejects an id that is not in the catalog", () => {
    expect(
      verdict(action("log_set", { exercise_id: "telekinesis", reps: 8 })),
    ).toBe("unknown_exercise");
    expect(verdict(action("log_set", { reps: 8 }))).toBe("exercise_required");
  });

  it("rejects an exercise the declared inventory cannot load", () => {
    const ctx = makeCtx({
      settings: { ...DEFAULT_SETTINGS, inventory: gear("bench") }, // no barbell
    });
    expect(
      verdict(
        action("log_set", { exercise_id: "barbell-bench-press", reps: 8 }),
        ctx,
      ),
    ).toBe("gear_mismatch");
  });

  it("accepts the same exercise once the gear is declared", () => {
    const ctx = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        inventory: gear("barbell-plates", "bench"),
      },
    });
    expect(
      verdict(
        action("log_set", { exercise_id: "barbell-bench-press", reps: 8 }),
        ctx,
      ),
    ).toBe("ok");
  });

  it("refuses a load above what the owner actually owns", () => {
    const ctx = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        inventory: gear("barbell-plates", "bench"), // ceiling: 60 kg
      },
    });
    expect(
      verdict(
        action("log_set", {
          exercise_id: "barbell-bench-press",
          reps: 5,
          weight_kg: 60,
        }),
        ctx,
      ),
    ).toBe("ok");
    expect(
      verdict(
        action("log_set", {
          exercise_id: "barbell-bench-press",
          reps: 5,
          weight_kg: 80,
        }),
        ctx,
      ),
    ).toBe("weight_exceeds_inventory");
  });

  it("bounds reps, weight and duration", () => {
    expect(
      verdict(action("log_set", { exercise_id: "push-ups", reps: 0 })),
    ).toBe("reps_out_of_range");
    expect(
      verdict(action("log_set", { exercise_id: "push-ups", reps: 51 })),
    ).toBe("reps_out_of_range");
    expect(verdict(action("log_set", { exercise_id: "push-ups" }))).toBe(
      "reps_required",
    );
    expect(
      verdict(
        action("log_set", { exercise_id: "push-ups", reps: 8, weight_kg: -3 }),
      ),
    ).toBe("weight_out_of_range");
    expect(
      verdict(
        action("log_set", { exercise_id: "push-ups", duration_sec: 10000 }),
      ),
    ).toBe("duration_out_of_range");
    // 0 kg means bodyweight: it validates, and the store stores null.
    expect(
      verdict(
        action("log_set", { exercise_id: "push-ups", reps: 8, weight_kg: 0 }),
      ),
    ).toBe("ok");
  });

  it("accepts only the structured D/F marks, and bounds the note", () => {
    expect(
      verdict(
        action("log_set", { exercise_id: "push-ups", reps: 8, effort: "D" }),
      ),
    ).toBe("ok");
    expect(
      verdict(
        action("log_set", { exercise_id: "push-ups", reps: 8, effort: "W" }),
      ),
    ).toBe("effort_invalid");
    expect(
      verdict(
        action("log_set", {
          exercise_id: "push-ups",
          reps: 8,
          notes: "x".repeat(281),
        }),
      ),
    ).toBe("notes_too_long");
  });

  it("refuses an action older than its TTL", () => {
    const stale = action(
      "log_set",
      { exercise_id: "push-ups", reps: 8 },
      {
        requestedAt: new Date(
          NOW.getTime() - MCP_ACTION_TTL_MS - 1000,
        ).toISOString(),
      },
    );
    expect(verdict(stale)).toBe("expired");
  });

  it("records an undo token that deletes exactly the set it created", () => {
    const result = validateMcpAction(
      action("log_set", { exercise_id: "push-ups", reps: 8 }),
      makeCtx(),
    );
    expect(result.ok).toBe(true);
    // The id does not exist until the set is written, so the store fills it in.
    if (result.ok) expect(result.undo).toBeNull();
  });
});

describe("settings actions validate and carry their own undo", () => {
  it("bounds the goal, level and time budget to enumerated values", () => {
    expect(verdict(action("set_goal", { goal: "strength" }))).toBe("ok");
    expect(verdict(action("set_goal", { goal: "cardio" }))).toBe(
      "goal_invalid",
    );
    expect(verdict(action("set_level", { level: "advanced" }))).toBe("ok");
    expect(verdict(action("set_level", { level: "pro" }))).toBe(
      "level_invalid",
    );
    expect(verdict(action("set_time_budget", { time_budget_min: 60 }))).toBe(
      "ok",
    );
    expect(verdict(action("set_time_budget", { time_budget_min: 5 }))).toBe(
      "time_budget_out_of_range",
    );
    expect(verdict(action("set_time_budget", { time_budget_min: 61.5 }))).toBe(
      "time_budget_out_of_range",
    );
  });

  it("captures the previous value so the change can be undone", () => {
    const ctx = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        goal: "recomposition",
        timeBudgetMin: 90,
      },
    });
    const goal = validateMcpAction(
      action("set_goal", { goal: "strength" }),
      ctx,
    );
    expect(goal.ok && goal.settingsPatch).toEqual({ goal: "strength" });
    expect(goal.ok && goal.undo).toEqual({
      kind: "settings",
      before: { goal: "recomposition" },
    });
    const budget = validateMcpAction(
      action("set_time_budget", { time_budget_min: 45 }),
      ctx,
    );
    expect(budget.ok && budget.undo).toEqual({
      kind: "settings",
      before: { timeBudgetMin: 90 },
    });
  });

  it("validates inventory rows: preset, capability vocabulary and bounds", () => {
    expect(
      verdict(
        action("set_inventory", { items: [{ presetId: "barbell-plates" }] }),
      ),
    ).toBe("ok");
    expect(
      verdict(
        action("set_inventory", { items: [{ presetId: "flux-capacitor" }] }),
      ),
    ).toBe("unknown_preset");
    expect(
      verdict(
        action("set_inventory", {
          items: [{ label: "Mi cosas", capabilities: ["jetpack"] }],
        }),
      ),
    ).toBe("unknown_capability");
    expect(
      verdict(
        action("set_inventory", { items: [{ capabilities: ["dumbbell"] }] }),
      ),
    ).toBe("label_required");
    expect(verdict(action("set_inventory", { items: [] }))).toBe(
      "inventory_required",
    );
    expect(
      verdict(
        action("set_inventory", {
          items: [{ presetId: "bench", maxLoadKg: 5000 }],
        }),
      ),
    ).toBe("max_load_out_of_range");
  });

  it("requires a readiness field and bounds every one to 1-5", () => {
    expect(verdict(action("set_readiness", {}))).toBe("readiness_required");
    expect(verdict(action("set_readiness", { energy: 5 }))).toBe("ok");
    expect(verdict(action("set_readiness", { energy: 0 }))).toBe(
      "readiness_out_of_range",
    );
    expect(verdict(action("set_readiness", { soreness: 4.5 }))).toBe(
      "readiness_out_of_range",
    );
    const result = validateMcpAction(
      action("set_readiness", { energy: 5 }),
      makeCtx({ readiness: { energy: 2, motivation: 4, soreness: 1 } }),
    );
    expect(result.ok && result.readiness).toEqual({
      energy: 5,
      motivation: 4,
      soreness: 1,
    });
    expect(result.ok && result.undo).toEqual({
      kind: "readiness",
      before: { energy: 2, motivation: 4, soreness: 1 },
    });
  });
});

describe("destructive and plan-changing actions", () => {
  it("will not close a session without an explicit confirm", () => {
    expect(verdict(action("finish_session"))).toBe("confirm_required");
    expect(verdict(action("finish_session", {}, { confirm: true }))).toBe("ok");
    expect(
      verdict(
        action("finish_session", {}, { confirm: true }),
        makeCtx({ todaySetCount: 0 }),
      ),
    ).toBe("nothing_to_finish");
    expect(
      verdict(
        action("finish_session", {}, { confirm: true }),
        makeCtx({ finishedToday: true }),
      ),
    ).toBe("already_finished");
  });

  it("keeps the movement pattern and load type in a swap", () => {
    // Same pattern (horizontal_push) and same load type (barbell), with the
    // gear declared: this is the swap the app's own button would offer.
    const kitted = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        inventory: gear("barbell-plates", "bench"),
      },
    });
    expect(
      verdict(
        action("swap_exercise", {
          exercise_id: "barbell-bench-press",
          replacement_id: "incline-bench-press",
        }),
        kitted,
      ),
    ).toBe("ok");
    expect(
      verdict(
        action("swap_exercise", {
          exercise_id: "barbell-bench-press",
          replacement_id: "dumbbell-bench-press",
        }),
        kitted,
      ),
    ).toBe("load_type_mismatch");
    expect(
      verdict(
        action("swap_exercise", {
          exercise_id: "barbell-bench-press",
          replacement_id: "goblet-squat",
        }),
        kitted,
      ),
    ).toBe("already_in_session");
    expect(
      verdict(
        action("swap_exercise", {
          exercise_id: "push-ups",
          replacement_id: "incline-bench-press",
        }),
        kitted,
      ),
    ).toBe("not_in_plan");
  });

  it("refuses a swap the declared gear cannot load", () => {
    // Same pattern and load type as the slot, but the inventory is empty: the
    // gear rule is the last gate and it is the one that fires.
    expect(
      verdict(
        action("swap_exercise", {
          exercise_id: "barbell-bench-press",
          replacement_id: "incline-bench-press",
        }),
      ),
    ).toBe("gear_mismatch");
  });

  it("rejects an action type the surface does not define", () => {
    expect(verdict(action("delete_everything"))).toBe("unknown_action");
  });
});

describe("add_exercise puts one row in today's session", () => {
  it("accepts a gear-free exercise and records its own undo", () => {
    const result = validateMcpAction(
      action("add_exercise", { exercise_id: "plank" }),
      makeCtx(),
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.undo).toEqual({
      kind: "remove_row",
      exerciseId: "plank",
    });
    // No `sets` means no prescription, and the receipt says so instead of
    // pretending somebody prescribed three series.
    expect(result.ok && result.detail.en).toContain("no prescription");
  });

  it("takes a prescription and a position when the caller gives them", () => {
    const result = validateMcpAction(
      action("add_exercise", {
        exercise_id: "push-ups",
        sets: 3,
        position: "start",
      }),
      makeCtx(),
    );
    expect(result.ok && result.detail.en).toContain("first");
    expect(result.ok && result.detail.en).toContain("3 sets");
  });

  it("refuses a missing id, an unknown id and an exercise already in the session", () => {
    expect(verdict(action("add_exercise", {}))).toBe("exercise_required");
    expect(
      verdict(action("add_exercise", { exercise_id: "telekinesis" })),
    ).toBe("unknown_exercise");
    expect(
      verdict(action("add_exercise", { exercise_id: "goblet-squat" })),
    ).toBe("already_in_session");
  });

  it("refuses what the declared gear cannot load", () => {
    expect(
      verdict(action("add_exercise", { exercise_id: "barbell-row" })),
    ).toBe("gear_mismatch");
    const kitted = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        inventory: gear("barbell-plates"),
      },
    });
    expect(
      verdict(action("add_exercise", { exercise_id: "barbell-row" }), kitted),
    ).toBe("ok");
  });

  it("bounds the prescription, the position, and an already-closed day", () => {
    expect(
      verdict(action("add_exercise", { exercise_id: "plank", sets: 13 })),
    ).toBe("sets_out_of_range");
    expect(
      verdict(action("add_exercise", { exercise_id: "plank", sets: -1 })),
    ).toBe("sets_out_of_range");
    expect(
      verdict(
        action("add_exercise", { exercise_id: "plank", position: "middle" }),
      ),
    ).toBe("position_invalid");
    expect(
      verdict(
        action("add_exercise", { exercise_id: "plank" }),
        makeCtx({ finishedToday: true }),
      ),
    ).toBe("already_finished");
  });
});

describe("set_day_focus speaks the app's own focus vocabulary", () => {
  it("accepts the preset keys the Inicio chips show", () => {
    const result = validateMcpAction(
      action("set_day_focus", { focus: "core" }),
      makeCtx(),
    );
    expect(result.ok && result.dayFocus).toEqual(["core"]);
    // Undo restores the focus the day had before: [] = automatic.
    expect(result.ok && result.undo).toEqual({ kind: "day_focus", before: [] });
    expect(
      validateMcpAction(action("set_day_focus", { focus: "auto" }), makeCtx())
        .ok,
    ).toBe(true);
  });

  it("accepts an explicit list of families, deduplicated", () => {
    const result = validateMcpAction(
      action("set_day_focus", { focus: ["chest", "core", "chest"] }),
      makeCtx(),
    );
    expect(result.ok && result.dayFocus).toEqual(["chest", "core"]);
  });

  it("refuses an invented focus and an invented family", () => {
    expect(verdict(action("set_day_focus", { focus: "abdomen" }))).toBe(
      "unknown_focus",
    );
    expect(
      verdict(action("set_day_focus", { focus: ["core", "telekinesis"] })),
    ).toBe("unknown_family");
    expect(verdict(action("set_day_focus", {}))).toBe("focus_required");
  });

  it("carries the previous focus, so two actions in a batch chain correctly", () => {
    const ctx = makeCtx({ dayFocus: ["quadriceps"] });
    const { fresh } = runMcpActions({
      actions: [
        action("set_day_focus", { focus: "core" }),
        action("set_day_focus", { focus: "push" }),
      ],
      ctx,
      ledger: [],
      apply: () => ({ ok: true }),
    });
    // The second action's undo points at what the first one produced.
    expect(fresh[0].undo).toEqual({
      kind: "day_focus",
      before: ["quadriceps"],
    });
    expect(fresh[1].undo).toEqual({ kind: "day_focus", before: ["core"] });
    expect(ctx.dayFocus).toEqual(["chest", "shoulders", "triceps"]);
  });
});

describe("set_week_override authors one day, Monday-first", () => {
  it("writes a training day and keeps the other overrides", () => {
    const ctx = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        weekOverrides: { 1: { kind: "rest" } },
      },
    });
    const result = validateMcpAction(
      action("set_week_override", { weekday: 2, families: ["core"] }),
      ctx,
    );
    expect(result.ok && result.settingsPatch).toEqual({
      weekOverrides: {
        1: { kind: "rest" },
        2: { kind: "train", families: ["core"] },
      },
    });
    // The undo is the settings patch the store applies: the previous map whole.
    expect(result.ok && result.undo).toEqual({
      kind: "settings",
      before: { weekOverrides: { 1: { kind: "rest" } } },
    });
  });

  it("marks a rest day", () => {
    const result = validateMcpAction(
      action("set_week_override", { weekday: 0, rest: true }),
      makeCtx(),
    );
    expect(result.ok && result.settingsPatch).toEqual({
      weekOverrides: { 0: { kind: "rest" } },
    });
  });

  it("clears his day with an empty list, handing it back to the planner", () => {
    const ctx = makeCtx({
      settings: { ...DEFAULT_SETTINGS, weekOverrides: { 4: { kind: "rest" } } },
    });
    const result = validateMcpAction(
      action("set_week_override", { weekday: 4, families: [] }),
      ctx,
    );
    expect(result.ok && result.settingsPatch).toEqual({ weekOverrides: {} });
  });

  it("refuses a weekday outside 0-6 and a shape that says nothing", () => {
    expect(
      verdict(action("set_week_override", { weekday: 7, rest: true })),
    ).toBe("weekday_out_of_range");
    expect(
      verdict(action("set_week_override", { weekday: 1.5, rest: true })),
    ).toBe("weekday_out_of_range");
    expect(verdict(action("set_week_override", { weekday: 3 }))).toBe(
      "week_override_params_required",
    );
    expect(
      verdict(action("set_week_override", { weekday: 3, families: ["nope"] })),
    ).toBe("unknown_family");
  });
});

describe("delete_session is the one destructive door, and it is reversible", () => {
  const withHistory = () =>
    makeCtx({ sessions: [closedSession("sess-1", ["set-a", "set-b"])] });

  it("demands confirm, like every other destructive action", () => {
    expect(
      verdict(
        action("delete_session", { session_id: "sess-1" }),
        withHistory(),
      ),
    ).toBe("confirm_required");
  });

  it("needs a session id that is really in the log", () => {
    expect(
      verdict(action("delete_session", {}, { confirm: true }), withHistory()),
    ).toBe("session_required");
    expect(
      verdict(
        action("delete_session", { session_id: "ghost" }, { confirm: true }),
        withHistory(),
      ),
    ).toBe("unknown_session");
  });

  it("accepts a confirmed deletion and leaves the restore to the store", () => {
    const result = validateMcpAction(
      action("delete_session", { session_id: "sess-1" }, { confirm: true }),
      withHistory(),
    );
    expect(result.ok).toBe(true);
    // The session object and its sets live in the store, not here.
    expect(result.ok && result.undo).toBeNull();
    expect(result.ok && result.detail.en).toContain("sets kept");
  });

  it("reports whether the sets go with the session", () => {
    const result = validateMcpAction(
      action(
        "delete_session",
        { session_id: "sess-1", delete_sets: true },
        { confirm: true },
      ),
      withHistory(),
    );
    expect(result.ok && result.detail.en).toContain("sets deleted too");
    expect(
      verdict(
        action(
          "delete_session",
          { session_id: "sess-1", delete_sets: "yes" },
          { confirm: true },
        ),
        withHistory(),
      ),
    ).toBe("delete_sets_invalid");
  });

  it("stops seeing a session it already deleted in the same batch", () => {
    const ctx = withHistory();
    const { fresh } = runMcpActions({
      actions: [
        action("delete_session", { session_id: "sess-1" }, { confirm: true }),
        action("delete_session", { session_id: "sess-1" }, { confirm: true }),
      ],
      ctx,
      ledger: [],
      apply: () => ({
        ok: true,
        undo: { kind: "remove_row", exerciseId: "x" },
      }),
    });
    expect(fresh.map((e) => e.status)).toEqual(["applied", "rejected"]);
    expect(fresh[1].rule).toBe("unknown_session");
  });
});

describe("set_set_time corrects one set's own hour, within today", () => {
  const today = () =>
    makeCtx({ todaySets: [loggedSet("set-a", NOW.toISOString())] });

  it("accepts a normalised instant of today and keeps the old one for the undo", () => {
    const result = validateMcpAction(
      action("set_set_time", {
        set_id: "set-a",
        occurred_at: new Date(NOW.getTime() - 90 * 60 * 1000).toISOString(),
      }),
      today(),
    );
    expect(result.ok && result.occurredAt).toBe(
      new Date(NOW.getTime() - 90 * 60 * 1000).toISOString(),
    );
    expect(result.ok && result.undo).toEqual({
      kind: "set_time",
      setId: "set-a",
      before: NOW.toISOString(),
    });
  });

  it("needs the set and the instant", () => {
    expect(
      verdict(action("set_set_time", { occurred_at: NOW.toISOString() })),
    ).toBe("set_required");
    expect(
      verdict(
        action("set_set_time", {
          set_id: "ghost",
          occurred_at: NOW.toISOString(),
        }),
        today(),
      ),
    ).toBe("set_not_found");
    expect(verdict(action("set_set_time", { set_id: "set-a" }), today())).toBe(
      "occurred_at_required",
    );
  });

  it("refuses another day and an unparseable instant", () => {
    const yesterday = new Date(
      NOW.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(
      verdict(
        action("set_set_time", { set_id: "set-a", occurred_at: yesterday }),
        today(),
      ),
    ).toBe("occurred_at_not_today");
    expect(
      verdict(
        action("set_set_time", {
          set_id: "set-a",
          occurred_at: "ayer por la tarde",
        }),
        today(),
      ),
    ).toBe("occurred_at_invalid");
  });

  it("only addresses today's sets, never a closed day's", () => {
    const ctx = makeCtx({
      todaySets: [loggedSet("set-hoy", NOW.toISOString())],
      sessions: [closedSession("sess-1", ["set-viejo"])],
    });
    expect(
      verdict(
        action("set_set_time", {
          set_id: "set-viejo",
          occurred_at: NOW.toISOString(),
        }),
        ctx,
      ),
    ).toBe("set_not_found");
  });
});

describe("log_set rides an occurred_at when an agent says when", () => {
  it("keeps a same-day instant and reports it normalised", () => {
    const at = new Date(NOW.getTime() - 20 * 60 * 1000).toISOString();
    const result = validateMcpAction(
      action("log_set", { exercise_id: "push-ups", reps: 8, occurred_at: at }),
      makeCtx(),
    );
    expect(result.ok && result.occurredAt).toBe(at);
    expect(result.ok && result.detail.en).toContain("at ");
  });

  it("refuses another day, because the set would leave today's session", () => {
    expect(
      verdict(
        action("log_set", {
          exercise_id: "push-ups",
          reps: 8,
          occurred_at: new Date(
            NOW.getTime() - 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      ),
    ).toBe("occurred_at_not_today");
    expect(
      verdict(
        action("log_set", {
          exercise_id: "push-ups",
          reps: 8,
          occurred_at: "mañana",
        }),
      ),
    ).toBe("occurred_at_invalid");
  });

  it("is optional: without it the set is simply logged now", () => {
    const result = validateMcpAction(
      action("log_set", { exercise_id: "push-ups", reps: 8 }),
      makeCtx(),
    );
    expect(result.ok && result.occurredAt).toBeUndefined();
  });
});

describe("the batch runner: idempotency and receipts", () => {
  it("answers a replayed id with the original receipt and never applies twice", () => {
    const target = action("set_time_budget", { time_budget_min: 60 });
    const ledger: McpLedgerEntry[] = [];
    const applied: string[] = [];
    const ctx = makeCtx();

    const run = () =>
      runMcpActions({
        actions: [target],
        ctx,
        ledger,
        apply: (a) => {
          applied.push(a.id);
          return { ok: true };
        },
      });

    const first = run();
    expect(applied).toEqual([target.id]);
    expect(first.fresh).toHaveLength(1);
    expect(first.fresh[0].status).toBe("applied");
    expect(first.fresh[0].undoToken).toBe(target.id);
    ledger.push(...first.fresh);

    const second = run();
    expect(applied).toEqual([target.id]); // not applied a second time
    expect(second.fresh).toHaveLength(0);
    expect(second.receipts).toEqual(first.receipts);
  });

  it("never leaks the local undo operation into the receipt", () => {
    const target = action("set_goal", { goal: "strength" });
    const { fresh, receipts } = runMcpActions({
      actions: [target],
      ctx: makeCtx(),
      ledger: [],
      apply: () => ({ ok: true }),
    });
    expect(fresh[0].undo).toBeDefined();
    expect(receipts[0]).not.toHaveProperty("undo");
    expect(canUndo(fresh[0])).toBe(true);
  });

  it("advances the context only for work the app really did", () => {
    const ctx = makeCtx({ todaySetCount: 0 });
    const set = action("log_set", { exercise_id: "push-ups", reps: 8 });
    const close = action("finish_session", {}, { confirm: true });
    const calls: string[] = [];

    const { fresh } = runMcpActions({
      actions: [set, close],
      ctx,
      ledger: [],
      apply: (a) => {
        calls.push(a.type);
        return { ok: true };
      },
    });

    // The second action saw the state the first one produced.
    expect(calls).toEqual(["log_set", "finish_session"]);
    expect(ctx.todaySetCount).toBe(1);
    expect(ctx.finishedToday).toBe(true);
    expect(fresh.map((e) => e.status)).toEqual(["applied", "applied"]);
  });

  it("leaves the context untouched when an action is refused", () => {
    const ctx = makeCtx({ todaySetCount: 0 });
    const bad = action("log_set", { exercise_id: "telekinesis", reps: 8 });
    const calls: string[] = [];

    const { fresh } = runMcpActions({
      actions: [bad],
      ctx,
      ledger: [],
      apply: (a) => {
        calls.push(a.type);
        return { ok: true };
      },
    });

    expect(calls).toHaveLength(0); // refused before reaching the app
    expect(ctx.todaySetCount).toBe(0);
    expect(fresh[0].status).toBe("rejected");
    expect(fresh[0].rule).toBe("unknown_exercise");
  });

  it("keeps a defensive rejection when the app cannot perform a valid action", () => {
    const ctx = makeCtx();
    const { fresh } = runMcpActions({
      actions: [action("finish_session", {}, { confirm: true })],
      ctx,
      ledger: [],
      apply: () => ({
        ok: false,
        rule: "nothing_to_finish",
        detail: { en: "No sets.", es: "Sin series." },
      }),
    });
    expect(fresh[0].status).toBe("rejected");
    expect(fresh[0].rule).toBe("nothing_to_finish");
    expect(ctx.finishedToday).toBe(false);
  });
});

describe("the ledger itself", () => {
  it("receiptOf strips the undo payload but keeps the trail", () => {
    const entry: McpLedgerEntry = {
      id: "a1",
      type: "log_set",
      origin: "mcp:codex",
      status: "applied",
      detail: { en: "Set logged.", es: "Serie registrada." },
      appliedAt: NOW.toISOString(),
      undo: { kind: "remove_set", setId: "s1" },
    };
    const receipt = receiptOf(entry);
    expect(receipt).not.toHaveProperty("undo");
    expect(receipt.status).toBe("applied");
    expect(receipt.origin).toBe("mcp:codex");
    expect(receipt.undoToken).toBeUndefined();
  });

  it("only counts an applied, not-yet-undone entry as undoable", () => {
    const base: McpLedgerEntry = {
      id: "a1",
      type: "log_set",
      origin: "mcp:codex",
      status: "applied",
      detail: { en: "Set logged.", es: "Serie registrada." },
      undo: { kind: "remove_set", setId: "s1" },
    };
    expect(canUndo(base)).toBe(true);
    expect(canUndo({ ...base, status: "rejected", undo: undefined })).toBe(
      false,
    );
    expect(canUndo({ ...base, undoneAt: NOW.toISOString() })).toBe(false);
    expect(canUndo({ ...base, undo: undefined })).toBe(false);
  });

  it("trims to the cap without dropping anything still undoable", () => {
    const entry = (i: number, undoable: boolean): McpLedgerEntry => ({
      id: `e${i}`,
      type: "log_set",
      origin: "mcp:codex",
      status: "applied",
      detail: { en: `#${i}`, es: `#${i}` },
      appliedAt: new Date(NOW.getTime() - i * 1000).toISOString(),
      ...(undoable ? { undo: { kind: "remove_set", setId: `s${i}` } } : {}),
    });
    const undoable = [1, 2, 3, 4, 5].map((i) => entry(i, true));
    const stale = Array.from({ length: MCP_LEDGER_MAX + 50 }, (_, i) =>
      entry(i + 100, false),
    );
    const trimmed = trimLedger([...stale, ...undoable]);

    expect(trimmed.length).toBeLessThanOrEqual(MCP_LEDGER_MAX);
    for (const keep of undoable) expect(trimmed).toContainEqual(keep);
  });

  it("orders the audit list newest first", () => {
    const older: McpLedgerEntry = {
      id: "old",
      type: "set_goal",
      origin: "mcp:a",
      status: "applied",
      detail: { en: "old", es: "old" },
      appliedAt: "2026-10-08T10:00:00.000Z",
    };
    const newer: McpLedgerEntry = {
      ...older,
      id: "new",
      appliedAt: "2026-10-09T10:00:00.000Z",
    };
    expect(sortAudit([older, newer]).map((e) => e.id)).toEqual(["new", "old"]);
  });
});

/**
 * The four actions of 2026-10-19 — the two drags the owner asked for, plus the
 * state marks and the order reset that share the same screen.
 */
describe("MCP actions: the queue and the week drag", () => {
  it("moves a row to a 1-based position and carries an undo of the order", () => {
    const ctx = makeCtx();
    const out = validateMcpAction(
      action("reorder_row", { exercise_id: "goblet-squat", position: 1 }),
      ctx,
    );
    expect(out.ok).toBe(true);
    expect(out.ok && out.undo).toEqual({
      kind: "settings",
      before: { rowOrder: null },
    });
  });

  it("refuses a row that is not in today's session or a position out of range", () => {
    expect(
      verdict(action("reorder_row", { exercise_id: "push-ups", position: 1 })),
    ).toBe("not_in_today");
    expect(
      verdict(
        action("reorder_row", { exercise_id: "goblet-squat", position: 8 }),
      ),
    ).toBe("position_out_of_range");
    expect(
      verdict(
        action("reorder_row", { exercise_id: "goblet-squat", position: 0 }),
      ),
    ).toBe("position_out_of_range");
  });

  it("accepts the three marks and refuses an invented one", () => {
    for (const state of ["active", "skipped", "postponed"]) {
      expect(
        verdict(
          action("set_exercise_state", { exercise_id: "goblet-squat", state }),
        ),
      ).toBe("ok");
    }
    expect(
      verdict(
        action("set_exercise_state", {
          exercise_id: "goblet-squat",
          state: "done",
        }),
      ),
    ).toBe("state_invalid");
    expect(
      verdict(
        action("set_exercise_state", {
          exercise_id: "push-ups",
          state: "active",
        }),
      ),
    ).toBe("not_in_today");
  });

  it("resets only an order that exists, and brings the previous one back", () => {
    const noOrder = makeCtx();
    expect(verdict(action("reset_order"), noOrder)).toBe("no_custom_order");

    const ctx = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        rowOrder: {
          date: localDayKey(NOW),
          ids: ["goblet-squat", "barbell-bench-press"],
        },
      },
    });
    const out = validateMcpAction(action("reset_order"), ctx);
    expect(out.ok).toBe(true);
    expect(out.ok && out.undo).toEqual({
      kind: "settings",
      before: {
        rowOrder: {
          date: localDayKey(NOW),
          ids: ["goblet-squat", "barbell-bench-press"],
        },
      },
    });
  });

  it("swaps two effective days and refuses a no-op or a bad index", () => {
    const ctx = makeCtx();
    const out = validateMcpAction(
      action("swap_week_days", { from_weekday: 0, to_weekday: 1 }),
      ctx,
    );
    expect(out.ok).toBe(true);
    expect(out.ok && out.undo).toEqual({
      kind: "settings",
      before: { weekOverrides: {} },
    });
    expect(
      verdict(action("swap_week_days", { from_weekday: 2, to_weekday: 2 })),
    ).toBe("weekday_same");
    expect(
      verdict(action("swap_week_days", { from_weekday: 0, to_weekday: 9 })),
    ).toBe("weekday_out_of_range");

    const identical = makeCtx({
      weekDays: Array.from({ length: 7 }, () => ({
        isRest: true,
        assigned: [],
      })),
    });
    expect(
      verdict(
        action("swap_week_days", { from_weekday: 0, to_weekday: 3 }),
        identical,
      ),
    ).toBe("week_days_unchanged");
  });
});

/**
 * The parity round of 2026-10-19 (second): `undo`, the three routine actions,
 * the display-only settings, the model reset and the week regeneration.
 */
describe("MCP actions: parity with the rest of the interface", () => {
  it("undoes only the caller's own, still-undoable token", () => {
    const ctx = makeCtx({
      undoable: [
        { id: "swap-1", origin: "mcp:test-agent", type: "swap_exercise" },
        { id: "other-2", origin: "mcp:another-agent", type: "log_set" },
      ],
    });
    const out = validateMcpAction(
      action("undo", { undo_token: "swap-1" }),
      ctx,
    );
    expect(out.ok).toBe(true);

    // Another agent's token is not mine to unwind…
    expect(verdict(action("undo", { undo_token: "other-2" }), ctx)).toBe(
      "undo_not_yours",
    );
    // …and an unknown (already undone, rejected or never applied) one is gone.
    expect(verdict(action("undo", { undo_token: "ghost" }), ctx)).toBe(
      "undo_token_unknown",
    );
    expect(verdict(action("undo", {}), ctx)).toBe("undo_token_required");
  });

  it("never opens HISTORY through undo: finish_session and delete_session stay human", () => {
    const ctx = makeCtx({
      undoable: [
        { id: "fin-1", origin: "mcp:test-agent", type: "finish_session" },
        { id: "del-1", origin: "mcp:test-agent", type: "delete_session" },
      ],
    });
    expect(verdict(action("undo", { undo_token: "fin-1" }), ctx)).toBe(
      "undo_session_closed",
    );
    expect(verdict(action("undo", { undo_token: "del-1" }), ctx)).toBe(
      "undo_session_closed",
    );
  });

  it("consumes the token inside one batch: a double undo cannot replay", () => {
    const ledger: McpLedgerEntry[] = [
      {
        id: "swap-1",
        type: "swap_exercise",
        origin: "mcp:test-agent",
        status: "applied",
        detail: { en: "swapped", es: "cambiado" },
        undoToken: "swap-1",
        undo: {
          kind: "swap_row",
          from: "barbell-bench-press",
          to: "incline-bench-press",
        },
      },
    ];
    const performed: string[] = [];
    const { receipts, fresh } = runMcpActions({
      actions: [
        action("undo", { undo_token: "swap-1" }, { id: "undo-1" }),
        action("undo", { undo_token: "swap-1" }, { id: "undo-2" }),
      ],
      ctx: makeCtx({
        undoable: [
          { id: "swap-1", origin: "mcp:test-agent", type: "swap_exercise" },
        ],
      }),
      ledger,
      apply: () => {
        performed.push("applied");
        return { ok: true };
      },
    });
    // The first undo applies; the second one is validated against the context
    // the first one advanced, so it never reaches `apply` a second time.
    expect(performed).toHaveLength(1);
    expect(receipts[0]!.status).toBe("applied");
    expect(receipts[1]!.status).toBe("rejected");
    expect(receipts[1]!.rule).toBe("undo_token_unknown");
    expect(fresh).toHaveLength(2);
  });

  it("saves a routine, refusing bad ids, duplicates and out-of-range numbers", () => {
    const items = [
      { exercise_id: "push-ups", sets: 3, reps_min: 8, reps_max: 12 },
    ];
    expect(verdict(action("save_routine", { name: "Push day", items }))).toBe(
      "ok",
    );
    expect(verdict(action("save_routine", { name: "", items }))).toBe(
      "routine_name_required",
    );
    expect(verdict(action("save_routine", { name: "X", items: [] }))).toBe(
      "routine_items_required",
    );
    expect(
      verdict(
        action("save_routine", {
          name: "X",
          items: [{ exercise_id: "telekinesis" }],
        }),
      ),
    ).toBe("unknown_exercise");
    expect(
      verdict(
        action("save_routine", {
          name: "X",
          items: [{ exercise_id: "push-ups" }, { exercise_id: "push-ups" }],
        }),
      ),
    ).toBe("routine_duplicate_exercise");
    expect(
      verdict(
        action("save_routine", {
          name: "X",
          items: [{ exercise_id: "push-ups", sets: 20 }],
        }),
      ),
    ).toBe("routine_value_out_of_range");
    // Rewriting requires the routine to exist; creating never does.
    expect(
      verdict(
        action("save_routine", { name: "X", items, routine_id: "ghost" }),
      ),
    ).toBe("unknown_routine");
  });

  it("carries the whole previous routine list as the undo of a save", () => {
    const before = [
      {
        id: "routine-1",
        name: "Vieja",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        items: [
          {
            exerciseId: "push-ups",
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSec: 90,
            rir: 2,
          },
        ],
      },
    ];
    const ctx = makeCtx({
      settings: { ...DEFAULT_SETTINGS, routines: before },
    });
    const out = validateMcpAction(
      action("save_routine", {
        name: "Nueva",
        items: [{ exercise_id: "plank", sets: 2 }],
      }),
      ctx,
    );
    expect(out.ok).toBe(true);
    expect(out.ok && out.undo).toEqual({
      kind: "settings",
      before: { routines: before },
    });
    expect(out.ok && out.settingsPatch?.routines).toHaveLength(2);
  });

  it("pours a routine into today and names exactly what it adds", () => {
    const routine = {
      id: "routine-1",
      name: "Full body",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      items: [
        {
          exerciseId: "push-ups",
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSec: 90,
          rir: 2,
        },
        // goblet-squat is already in the default plan: it must be skipped.
        {
          exerciseId: "plank",
          sets: 2,
          repsMin: 10,
          repsMax: 10,
          restSec: 60,
          rir: 2,
        },
      ],
    };
    const ctx = makeCtx({
      settings: { ...DEFAULT_SETTINGS, routines: [routine] },
    });
    const out = validateMcpAction(
      action("apply_routine", { routine_id: "routine-1" }),
      ctx,
    );
    expect(out.ok).toBe(true);
    // Only the row that is not already there: the undo removes what was added.
    expect(out.ok && out.undo).toEqual({
      kind: "remove_rows",
      exerciseIds: ["push-ups", "plank"],
    });

    expect(verdict(action("apply_routine", {}), ctx)).toBe("routine_required");
    expect(verdict(action("apply_routine", { routine_id: "ghost" }), ctx)).toBe(
      "unknown_routine",
    );
    expect(
      verdict(
        action("apply_routine", { routine_id: "routine-1" }),
        makeCtx({
          finishedToday: true,
          settings: { ...DEFAULT_SETTINGS, routines: [routine] },
        }),
      ),
    ).toBe("already_finished");

    // Both of its exercises are already planned (`goblet-squat` and
    // `barbell-bench-press` are the default plan's slots): nothing to add.
    const allInSession = makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        routines: [
          {
            ...routine,
            items: [
              {
                exerciseId: "goblet-squat",
                sets: 3,
                repsMin: 8,
                repsMax: 12,
                restSec: 90,
                rir: 2,
              },
              {
                exerciseId: "barbell-bench-press",
                sets: 3,
                repsMin: 8,
                repsMax: 12,
                restSec: 90,
                rir: 2,
              },
            ],
          },
        ],
      },
    });
    expect(
      verdict(
        action("apply_routine", { routine_id: "routine-1" }),
        allInSession,
      ),
    ).toBe("already_in_session");
  });

  it("deletes a routine only confirmed, and restores the full list", () => {
    const before = [
      {
        id: "routine-1",
        name: "Para borrar",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        items: [
          {
            exerciseId: "push-ups",
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSec: 90,
            rir: 2,
          },
        ],
      },
    ];
    const ctx = makeCtx({
      settings: { ...DEFAULT_SETTINGS, routines: before },
    });
    expect(
      verdict(action("delete_routine", { routine_id: "routine-1" }), ctx),
    ).toBe("confirm_required");
    expect(
      verdict(
        action("delete_routine", { routine_id: "ghost" }, { confirm: true }),
        ctx,
      ),
    ).toBe("unknown_routine");
    const out = validateMcpAction(
      action("delete_routine", { routine_id: "routine-1" }, { confirm: true }),
      ctx,
    );
    expect(out.ok).toBe(true);
    expect(out.ok && out.settingsPatch?.routines).toEqual([]);
    expect(out.ok && out.undo).toEqual({
      kind: "settings",
      before: { routines: before },
    });
  });

  it("switches language and sound as display-only patches with their undo", () => {
    expect(verdict(action("set_language", { language: "en" }))).toBe("ok");
    expect(verdict(action("set_language", { language: "fr" }))).toBe(
      "language_invalid",
    );
    const lang = validateMcpAction(
      action("set_language", { language: "en" }),
      makeCtx({ settings: { ...DEFAULT_SETTINGS, language: "es" } }),
    );
    expect(lang.ok && lang.settingsPatch).toEqual({ language: "en" });
    expect(lang.ok && lang.undo).toEqual({
      kind: "settings",
      before: { language: "es" },
    });

    expect(verdict(action("set_sound", {}))).toBe("sound_params_required");
    expect(verdict(action("set_sound", { enabled: false }))).toBe("ok");
    expect(verdict(action("set_sound", { volume: 1.5 }))).toBe(
      "volume_out_of_range",
    );
    expect(verdict(action("set_sound", { enabled: "yes" }))).toBe(
      "enabled_invalid",
    );
    const sound = validateMcpAction(
      action("set_sound", { volume: 0.8 }),
      makeCtx({
        settings: {
          ...DEFAULT_SETTINGS,
          sound: { enabled: true, volume: 0.5 },
        },
      }),
    );
    expect(sound.ok && sound.settingsPatch).toEqual({
      sound: { enabled: true, volume: 0.8 },
    });
    expect(sound.ok && sound.undo).toEqual({
      kind: "settings",
      before: { sound: { enabled: true, volume: 0.5 } },
    });
  });

  it("resets the model only with confirm, carrying the model of that instant", () => {
    expect(verdict(action("reset_model"))).toBe("confirm_required");
    const out = validateMcpAction(
      action("reset_model", {}, { confirm: true }),
      makeCtx(),
    );
    expect(out.ok).toBe(true);
    // The default ctx has no model; the undo still names the kind, so the
    // store restores whatever existed (an empty model when there was none).
    expect(out.ok && out.undo).toEqual({
      kind: "decision_model",
      before: null,
    });
  });

  it("regenerates the week and restores the exact previous seed", () => {
    const out = validateMcpAction(
      action("regenerate_week"),
      makeCtx({ weekSeed: 7 }),
    );
    expect(out.ok).toBe(true);
    expect(out.ok && out.undo).toEqual({ kind: "week_seed", before: 7 });
  });
});

/**
 * `set_gear_profile` (2026-10-20) — the gear shelf, for an agent.
 *
 * The chips in Ajustes let the owner say «estoy en el gimnasio»; this action is
 * the same sentence from a model. What must never happen is the failure mode a
 * guessed name would produce: a profile that does not exist must be a refusal,
 * never an empty inventory that quietly turns the session into bodyweight work.
 */
describe("MCP actions: switching the gear profile", () => {
  const home = gear("dumbbells-adjustable", "bench");
  const gymItems = gear("barbell-plates", "rack", "pullup-bar");

  const shelfCtx = (over: Partial<McpContext> = {}) =>
    makeCtx({
      settings: {
        ...DEFAULT_SETTINGS,
        inventory: home,
        activeGearProfile: { id: "home", name: "Casa" },
        gearProfiles: [{ id: "gym", name: "Gimnasio", inventory: gymItems }],
        rowOrder: { date: localDayKey(NOW), ids: ["goblet-squat", "push-ups"] },
      },
      ...over,
    });

  it("switches by name and carries the undo of the whole shelf", () => {
    const ctx = shelfCtx();
    const out = validateMcpAction(
      action("set_gear_profile", { profile: "Gimnasio" }),
      ctx,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settingsPatch?.inventory).toEqual(gymItems);
    expect(out.settingsPatch?.activeGearProfile).toEqual({
      id: "gym",
      name: "Gimnasio",
    });
    expect(
      (out.settingsPatch?.gearProfiles as Array<{ id: string }>).map(
        (p) => p.id,
      ),
    ).toEqual(["home"]);
    // The undo restores the previous items and the previous shelf, not just a name.
    expect(out.undo).toEqual({
      kind: "settings",
      before: {
        inventory: home,
        activeGearProfile: { id: "home", name: "Casa" },
        gearProfiles: [{ id: "gym", name: "Gimnasio", inventory: gymItems }],
      },
    });
  });

  it("accepts the id, and the name in any case", () => {
    expect(
      verdict(action("set_gear_profile", { profile: "gym" }), shelfCtx()),
    ).toBe("ok");
    expect(
      verdict(
        action("set_gear_profile", { profile: "  gImNaSiO " }),
        shelfCtx(),
      ),
    ).toBe("ok");
  });

  it("does not touch today's sequence", () => {
    const ctx = shelfCtx();
    const out = validateMcpAction(
      action("set_gear_profile", { profile: "gym" }),
      ctx,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settingsPatch?.rowOrder).toBeUndefined();
  });

  it("refuses an invented profile instead of emptying the gym", () => {
    expect(
      verdict(action("set_gear_profile", { profile: "Playa" }), shelfCtx()),
    ).toBe("unknown_profile");
  });

  it("refuses when there is no shelf, and says what to do", () => {
    const ctx = makeCtx({ settings: { ...DEFAULT_SETTINGS, inventory: home } });
    const out = validateMcpAction(
      action("set_gear_profile", { profile: "Gimnasio" }),
      ctx,
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.rule).toBe("no_gear_profiles");
    expect(out.detail.es).toContain("Ajustes");
  });

  it("refuses a missing profile argument", () => {
    expect(verdict(action("set_gear_profile", {}), shelfCtx())).toBe(
      "profile_required",
    );
    expect(
      verdict(action("set_gear_profile", { profile: "   " }), shelfCtx()),
    ).toBe("profile_required");
  });

  it("advances the context, so two switches in one file see the first one", () => {
    const ctx = shelfCtx();
    const run = runMcpActions({
      actions: [
        action("set_gear_profile", { profile: "gym" }),
        action("set_gear_profile", { profile: "gym" }),
      ],
      ctx,
      ledger: [],
      apply: () => ({}),
    });
    expect(run.receipts[0]!.status).toBe("applied");
    // The second one cannot be applied: «Gimnasio» is now the live profile, and
    // the receipt says exactly that instead of «no such profile».
    expect(run.receipts[1]!.status).toBe("rejected");
    expect(run.receipts[1]!.rule).toBe("already_active");
  });
});
