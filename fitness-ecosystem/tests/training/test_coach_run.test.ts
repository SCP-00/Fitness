/**
 * The local coach, two phases (2026-10-30).
 *
 * These tests pin the behaviour that a 4B model forced us into: exploration is
 * bounded and can never apply a session, the commit request offers the terminal
 * tool and nothing else, a rejection is fed back with the exact colliding
 * families, and every failure is reported instead of silently doing nothing.
 *
 * The transport is faked; the rules (`validateProposal`) are the real ones.
 */
import { describe, expect, it } from "vitest";
import {
  TOOL_SPECS,
  validateProposal,
  type ChatWithToolsInput,
  type ToolSpec,
} from "../../traininglab/apps/desktop/src/lib/llm";
import { runCoach, FINAL_TOOL } from "../../traininglab/apps/desktop/src/lib/coach-run";
import type { LlmSettings } from "../../traininglab/apps/desktop/src/lib/types";

const SETTINGS: LlmSettings = {
  enabled: true,
  baseUrl: "http://127.0.0.1:9931/v1",
  model: "qwen-4b",
  apiKey: "",
  timeoutSec: 5,
  maxTokens: 1024,
};

const USABLE = [
  { id: "goblet-squat", family: "quadriceps" },
  { id: "single-leg-rdl", family: "hamstrings" },
  { id: "v-up", family: "core" },
  { id: "push-ups", family: "chest" },
  { id: "dumbbell-fly", family: "chest" },
  { id: "dumbbell-pullover", family: "chest" },
];

/** One pattern per exercise, mirroring the catalogue's taxonomy. */
const PATTERN: Record<string, string> = {
  "goblet-squat": "squat",
  "single-leg-rdl": "hinge",
  "v-up": "core_flexion",
  "push-ups": "horizontal_push",
  "dumbbell-fly": "horizontal_push",
  "dumbbell-pullover": "shoulder_extension",
};

const CONTEXT = [
  "time_budget_min,45",
  "readiness,energy=4,motivation=5,freshness=0",
  "equipment,dumbbells",
].join("\n");

interface Call {
  url: string;
  body: ChatWithToolsInput & { tools?: ToolSpec[] };
}

/** Scripted OpenAI-compatible server: each call shifts one response. */
function fakeFetch(responses: unknown[]) {
  const calls: Call[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ url: String(url), body: body as Call["body"] });
    const payload = responses.shift() ?? {
      choices: [{ message: { role: "assistant", content: "done" } }],
    };
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const toolCall = (name: string, args: unknown) => ({
  choices: [
    {
      finish_reason: "tool_calls",
      message: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: `call-${name}`,
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    },
  ],
});

const prose = (text: string) => ({
  choices: [
    { finish_reason: "stop", message: { role: "assistant", content: text } },
  ],
});

/** The store's `applyCoachProposal`, reduced to what this contract needs. */
function executor(vetoes: string[] = [], focus: string[] = []) {
  const seen: string[] = [];
  const run = async (name: string, args: Record<string, unknown>) => {
    seen.push(name);
    if (name !== FINAL_TOOL) return { ok: true };
    const check = validateProposal(args, {
      usableIds: new Set(USABLE.map((u) => u.id)),
      timeBudgetMin: 45,
      primaryFamilyOf: (id) => USABLE.find((u) => u.id === id)?.family ?? "unknown",
      familiesOf: (id) => [USABLE.find((u) => u.id === id)?.family ?? "unknown"],
      setupMinOf: () => 1,
      vetoedPatterns: vetoes,
      patternOf: (id) => PATTERN[id] ?? "",
      focusFamilies: focus,
    });
    // The store returns the validator's own field name (`estimatedMinutes`);
    // `runCoach` must read it, or every accepted proposal reports 0 min.
    return check.ok
      ? {
          accepted: true,
          slots: check.slots.length,
          estimatedMinutes: check.estimatedMinutes,
        }
      : { accepted: false, errors: check.errors };
  };
  return { run, seen };
}

describe("coach: phase 1 explores, phase 2 commits", () => {
  it("never applies a session while exploring, even if the model asks for one", async () => {
    const { impl } = fakeFetch([
      // Phase 1: the model tries the terminal tool — it is not on the menu.
      toolCall(FINAL_TOOL, { slots: [{ exerciseId: "v-up", sets: 3, repsMin: 8, repsMax: 12, restSec: 60 }] }),
      prose("explored"),
      // Phase 2: a legal session.
      toolCall(FINAL_TOOL, {
        summary: "Core y piernas",
        slots: [
          { exerciseId: "goblet-squat", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
          { exerciseId: "v-up", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
        ],
      }),
      prose("listo"),
    ]);
    const { run, seen } = executor();
    const result = await runCoach({
      settings: SETTINGS,
      request: "piernas y core, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(result.applied?.slots).toBe(2);
    expect(result.applied?.minutes).toBeGreaterThan(0);
    expect(result.applied?.summary).toBe("Core y piernas");
    // The exploration-time attempt never reached the executor at all: the
    // runner refuses it before the app can touch the plan.
    expect(seen.filter((n) => n === FINAL_TOOL).length).toBe(1);
    expect(result.toolCalls.map((c) => c.name)).toEqual([FINAL_TOOL, FINAL_TOOL]);
  });

  it("offers the commit request the terminal tool AND nothing else", async () => {
    const { impl, calls } = fakeFetch([
      prose("nothing to explore"), // phase 1 ends in prose
      toolCall(FINAL_TOOL, {
        slots: [{ exerciseId: "goblet-squat", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 }],
      }),
      prose("ok"),
    ]);
    const { run } = executor();
    await runCoach({
      settings: SETTINGS,
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      fetchImpl: impl,
    });

    const commit = calls[1];
    const names = (commit.body.tools ?? []).map((t) => t.function.name);
    expect(names).toEqual([FINAL_TOOL]);
    expect(commit.body.tool_choice).toEqual({
      type: "function",
      function: { name: FINAL_TOOL },
    });
    // No reasoning: the measured 4B spends its budget thinking otherwise.
    expect(commit.body.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it("sends the primary family of every usable id, so the rule is checkable", async () => {
    const { impl, calls } = fakeFetch([
      prose("done exploring"),
      toolCall(FINAL_TOOL, {
        slots: [{ exerciseId: "v-up", sets: 3, repsMin: 8, repsMax: 12, restSec: 60 }],
      }),
      prose("ok"),
    ]);
    const { run } = executor();
    await runCoach({
      settings: SETTINGS,
      request: "core, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      vetoedPatterns: ["horizontal_push"],
      fetchImpl: impl,
    });
    const user = String(
      (calls[1].body.messages as { content: string }[]).find((m) => m.role === "user")
        ?.content ?? "",
    );
    expect(user).toContain("goblet-squat:quadriceps");
    expect(user).toContain("push-ups:chest");
    expect(user).toContain("vetoed_patterns,horizontal_push");
  });

  it("names the colliding family when a proposal is rejected, then accepts the fix", async () => {
    const { impl, calls } = fakeFetch([
      prose("explored"),
      // Two chest slots: the exact mistake the live 4B made twice.
      toolCall(FINAL_TOOL, {
        slots: [
          { exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
          { exerciseId: "dumbbell-fly", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
        ],
      }),
      toolCall(FINAL_TOOL, {
        slots: [
          { exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
          { exerciseId: "v-up", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
        ],
      }),
    ]);
    const { run } = executor();
    const result = await runCoach({
      settings: SETTINGS,
      request: "pecho y core",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    const retry = String(
      (calls[2].body.messages as { content: string }[]).find((m) => m.role === "user")
        ?.content ?? "",
    );
    expect(retry).toContain("family chest appears 2 times");
    expect(retry).toContain("push-ups, dumbbell-fly");
    expect(retry).toContain("keep at most 1 of them");
  });

  it("refuses a vetoed pattern instead of applying it", async () => {
    const { impl } = fakeFetch([
      prose("explored"),
      toolCall(FINAL_TOOL, {
        slots: [{ exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 }],
      }),
      toolCall(FINAL_TOOL, {
        slots: [{ exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 }],
      }),
      toolCall(FINAL_TOOL, {
        slots: [{ exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 }],
      }),
    ]);
    const { run } = executor(["horizontal_push"]);
    const result = await runCoach({
      settings: SETTINGS,
      request: "pecho, hombros cansados",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      commitRounds: 2,
      fetchImpl: impl,
    });

    expect(result.ok).toBe(false);
    expect(result.applied).toBeNull();
    expect(result.errors.join(" ")).toContain("horizontal_push");
  });

  it("accepts two exercises of the focused family on a focused day", async () => {
    const { impl, calls } = fakeFetch([
      prose("explored"),
      toolCall(FINAL_TOOL, {
        summary: "Pecho: press y pullover",
        slots: [
          { exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
          { exerciseId: "dumbbell-pullover", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
        ],
      }),
      prose("ok"),
    ]);
    const { run } = executor([], ["chest"]);
    const result = await runCoach({
      settings: SETTINGS,
      request: "hoy quiero pecho, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      focusFamilies: ["chest"],
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(result.applied?.slots).toBe(2);
    const user = String(
      (calls[1].body.messages as { content: string }[]).find((m) => m.role === "user")?.content ?? "",
    );
    expect(user).toContain("focus_families,chest");
  });

  it("lets a third slot of the focused family be rejected, then accepted at two", async () => {
    const { impl, calls } = fakeFetch([
      prose("explored"),
      toolCall(FINAL_TOOL, {
        slots: [
          { exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
          { exerciseId: "dumbbell-fly", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
          { exerciseId: "dumbbell-pullover", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
        ],
      }),
      toolCall(FINAL_TOOL, {
        slots: [
          { exerciseId: "push-ups", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
          { exerciseId: "dumbbell-fly", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
        ],
      }),
    ]);
    const { run } = executor([], ["chest"]);
    const result = await runCoach({
      settings: SETTINGS,
      request: "pecho",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      focusFamilies: ["chest"],
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(result.applied?.slots).toBe(2);
    const retry = String(
      (calls[2].body.messages as { content: string }[]).find((m) => m.role === "user")?.content ?? "",
    );
    // The hint carries the cap, not an absolute "one".
    expect(retry).toContain("family chest appears 3 times");
    expect(retry).toContain("keep at most 2");
  });

  it("reports a model that answers in prose instead of pretending it worked", async () => {
    const { impl } = fakeFetch([prose("explored"), prose("Aquí tienes tu plan…")]);
    const { run } = executor();
    const result = await runCoach({
      settings: SETTINGS,
      request: "algo",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      fetchImpl: impl,
    });
    expect(result.ok).toBe(false);
    expect(result.applied).toBeNull();
    expect(result.errors[0]).toContain("answered without calling");
  });

  it("stops before phase 2 when the server is not there", async () => {
    const impl = (async () => {
      throw new Error("Failed to fetch");
    }) as unknown as typeof fetch;
    const { run } = executor();
    const result = await runCoach({
      settings: SETTINGS,
      request: "algo",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      fetchImpl: impl,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(["Failed to fetch"]);
  });
});
