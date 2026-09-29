/**
 * Local LLM bridge (`traininglab/apps/desktop/src/lib/llm.ts`).
 *
 * The bridge is the one place where a non-deterministic component (a model the
 * user runs locally) can influence the plan, so exactly three things matter:
 *   1. it speaks the OpenAI-compatible wire format local servers actually use,
 *   2. it is bounded (tool loop, timeout) and never throws,
 *   3. anything it proposes is validated against the gear/budget/families first.
 *
 * @module tests/training/llm_bridge
 */

import { describe, it, expect } from "vitest";
import {
  chatEndpoint,
  chatWithTools,
  validateProposal,
  TOOL_SPECS,
  type ChatMessage,
} from "../../traininglab/apps/desktop/src/lib/llm";
import type { LlmSettings } from "../../traininglab/apps/desktop/src/lib/types";

const SETTINGS: LlmSettings = {
  enabled: true,
  baseUrl: "http://127.0.0.1:8080/v1",
  model: "qwen3-4b-instruct",
  apiKey: "",
  timeoutSec: 5,
};

const MESSAGES: ChatMessage[] = [
  { role: "system", content: "you propose, the rules dispose" },
  { role: "user", content: "plan my 90 minutes" },
];

/** Minimal fake of fetch that answers with a queue of JSON responses. */
function fakeFetch(responses: unknown[], opts: { status?: number } = {}) {
  const calls: { url: string; body: unknown }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    const payload = responses.shift() ?? { choices: [] };
    return {
      ok: (opts.status ?? 200) < 400,
      status: opts.status ?? 200,
      statusText: opts.status === 500 ? "Internal Server Error" : "OK",
      json: async () => payload,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("Local LLM bridge: wire format", () => {
  it("normalizes any llama.cpp-family base URL into a chat-completions endpoint", () => {
    expect(chatEndpoint("http://127.0.0.1:8080/v1")).toBe(
      "http://127.0.0.1:8080/v1/chat/completions",
    );
    expect(chatEndpoint("http://127.0.0.1:1234/v1/")).toBe(
      "http://127.0.0.1:1234/v1/chat/completions",
    );
    expect(chatEndpoint("http://127.0.0.1:11434/v1/chat/completions")).toBe(
      "http://127.0.0.1:11434/v1/chat/completions",
    );
  });

  it("sends the tools and returns the final assistant message", async () => {
    const { impl, calls } = fakeFetch([
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Con 90 minutos prioriza dominadas.",
            },
          },
        ],
      },
    ]);
    const result = await chatWithTools({
      settings: SETTINGS,
      messages: MESSAGES,
      tools: TOOL_SPECS,
      execute: () => ({}),
      fetchImpl: impl,
    });
    expect(result.ok).toBe(true);
    expect(result.content).toContain("dominadas");
    expect(calls).toHaveLength(1);
    const body = calls[0]!.body as {
      model: string;
      tools: unknown[];
      tool_choice: string;
    };
    expect(body.model).toBe("qwen3-4b-instruct");
    expect(body.tools).toHaveLength(TOOL_SPECS.length);
    expect(body.tool_choice).toBe("auto");
  });

  it("executes tool calls and feeds the results back to the model", async () => {
    const executed: string[] = [];
    const { impl, calls } = fakeFetch([
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "c1",
                  type: "function",
                  function: { name: "get_context", arguments: "{}" },
                },
                {
                  id: "c2",
                  type: "function",
                  function: {
                    name: "list_available_exercises",
                    arguments: '{"pattern":"vertical_pull"}',
                  },
                },
              ],
            },
          },
        ],
      },
      { choices: [{ message: { role: "assistant", content: "Listo." } }] },
    ]);
    const result = await chatWithTools({
      settings: SETTINGS,
      messages: MESSAGES,
      tools: TOOL_SPECS,
      execute: (name) => {
        executed.push(name);
        return { ok: true };
      },
      fetchImpl: impl,
    });
    expect(result.ok).toBe(true);
    expect(executed).toEqual(["get_context", "list_available_exercises"]);
    expect(result.toolCalls.map((c) => c.name)).toEqual([
      "get_context",
      "list_available_exercises",
    ]);
    // The second request must carry both tool results back.
    const second = calls[1]!.body as { messages: ChatMessage[] };
    const toolMessages = second.messages.filter((m) => m.role === "tool");
    expect(toolMessages).toHaveLength(2);
    expect(toolMessages.map((m) => m.tool_call_id)).toEqual(["c1", "c2"]);
    expect(second.messages.filter((m) => m.role === "assistant")).toHaveLength(
      1,
    );
  });
});

describe("Local LLM bridge: bounded and honest failures", () => {
  it("reports a server error instead of throwing", async () => {
    const { impl } = fakeFetch([{}], { status: 500 });
    const result = await chatWithTools({
      settings: SETTINGS,
      messages: MESSAGES,
      tools: TOOL_SPECS,
      execute: () => ({}),
      fetchImpl: impl,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("500");
  });

  it("stops a model that calls tools forever", async () => {
    const loop = {
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "x",
                type: "function",
                function: { name: "get_context", arguments: "{}" },
              },
            ],
          },
        },
      ],
    };
    const { impl, calls } = fakeFetch(Array.from({ length: 10 }, () => loop));
    const result = await chatWithTools({
      settings: SETTINGS,
      messages: MESSAGES,
      tools: TOOL_SPECS,
      execute: () => ({}),
      fetchImpl: impl,
      maxSteps: 3,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("tool steps");
    expect(calls.length).toBe(4); // initial + 3 retries, then it gives up
  });

  it("survives a malformed tool-call argument blob", async () => {
    const { impl } = fakeFetch([
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "x",
                  type: "function",
                  function: { name: "get_context", arguments: "{not json" },
                },
              ],
            },
          },
        ],
      },
      { choices: [{ message: { role: "assistant", content: "ok" } }] },
    ]);
    const seen: Record<string, unknown>[] = [];
    const result = await chatWithTools({
      settings: SETTINGS,
      messages: MESSAGES,
      tools: TOOL_SPECS,
      execute: (_n, args) => {
        seen.push(args);
        return null;
      },
      fetchImpl: impl,
    });
    expect(result.ok).toBe(true);
    expect(seen[0]).toEqual({});
  });
});

describe("Local LLM bridge: the hard rules dispose", () => {
  const ctx = {
    usableIds: new Set(["pull-ups", "dips", "goblet-squat", "push-ups"]),
    timeBudgetMin: 90,
    primaryFamilyOf: (id: string) =>
      ({
        "pull-ups": "lats",
        dips: "triceps",
        "goblet-squat": "quadriceps",
        "push-ups": "chest",
      })[id] ?? id,
    setupMinOf: () => 1,
  };

  it("accepts a legal proposal and estimates its cost", () => {
    const check = validateProposal(
      {
        slots: [
          {
            exerciseId: "pull-ups",
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            restSec: 120,
          },
          {
            exerciseId: "goblet-squat",
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSec: 90,
          },
        ],
      },
      ctx,
    );
    expect(check.ok).toBe(true);
    expect(check.slots).toHaveLength(2);
    expect(check.estimatedMinutes).toBeGreaterThan(10);
    expect(check.estimatedMinutes).toBeLessThan(90);
  });

  it("rejects equipment the user does not own", () => {
    const check = validateProposal(
      {
        slots: [
          {
            exerciseId: "barbell-squat",
            sets: 3,
            repsMin: 5,
            repsMax: 8,
            restSec: 180,
          },
        ],
      },
      ctx,
    );
    expect(check.ok).toBe(false);
    expect(check.errors[0]).toContain("not available");
  });

  it("rejects a rule-breaking or over-budget plan and explains why", () => {
    const repeated = validateProposal(
      {
        slots: [
          {
            exerciseId: "pull-ups",
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            restSec: 120,
          },
          {
            exerciseId: "pull-ups",
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            restSec: 120,
          },
        ],
      },
      ctx,
    );
    expect(repeated.ok).toBe(false);
    expect(repeated.errors.some((e) => e.includes("repeats"))).toBe(true);

    // Four DISTINCT families (duplicate-family rejections would mask this test).
    const tooLong = validateProposal(
      {
        slots: ["pull-ups", "dips", "goblet-squat", "push-ups"].map(
          (exerciseId) => ({
            exerciseId,
            sets: 8,
            repsMin: 5,
            repsMax: 10,
            restSec: 300,
          }),
        ),
      },
      ctx,
    );
    expect(tooLong.ok).toBe(false);
    expect(tooLong.errors.some((e) => e.includes("budget"))).toBe(true);
  });

  it("never returns an empty accepted proposal", () => {
    const check = validateProposal({ slots: [] }, ctx);
    expect(check.ok).toBe(false);
    expect(check.errors.length).toBeGreaterThan(0);
  });
});
