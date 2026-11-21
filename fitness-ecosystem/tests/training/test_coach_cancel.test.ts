/**
 * Stopping the local coach (2026-11-21, T07.1).
 *
 * The owner's model runs on his own laptop, so a five-minute answer is normal
 * and the screen needs a «parar» control. The three promises this file pins:
 *
 *   1. A signal that is already spent sends nothing at all.
 *   2. Cancelling during exploration ends the run before the commit request —
 *      no retry, no session, the deterministic plan exactly as it was.
 *   3. A response that was already generating when the button was pressed may
 *      still arrive with a perfect `propose_session`. It must be read and
 *      discarded, never applied.
 *
 * Plus the distinction the UI depends on: a timeout is not a cancellation, and
 * it keeps its own sentence.
 */
import { describe, expect, it } from "vitest";
import {
  CANCELLED_ERROR,
  TOOL_SPECS,
  type ChatWithToolsInput,
  type ToolSpec,
} from "../../traininglab/apps/desktop/src/lib/llm";
import { FINAL_TOOL, runCoach } from "../../traininglab/apps/desktop/src/lib/coach-run";
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
  { id: "goblet-squat", family: "quadriceps", pattern: "squat" },
  { id: "v-up", family: "core", pattern: "core_flexion" },
  { id: "push-ups", family: "chest", pattern: "horizontal_push" },
];

const CONTEXT = [
  "time_budget_min,45",
  "readiness,energy=4,motivation=5,freshness=0",
  "equipment,dumbbells",
].join("\n");

interface Call {
  url: string;
  body: ChatWithToolsInput & { tools?: ToolSpec[] };
}

const ok = (payload: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
  }) as unknown as Response;

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

const SESSION = {
  summary: "Piernas y core",
  slots: [
    { exerciseId: "goblet-squat", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 },
    { exerciseId: "v-up", sets: 3, repsMin: 10, repsMax: 15, restSec: 60 },
  ],
};

/** The store's executor, reduced to the question this contract asks. */
function executor() {
  const seen: string[] = [];
  let applied = 0;
  const run = async (name: string) => {
    seen.push(name);
    if (name !== FINAL_TOOL) return { ok: true };
    applied += 1;
    return { accepted: true, slots: 2, minutes: 30 };
  };
  return { run, seen, applied: () => applied };
}

/** Rejects the way a real `fetch` does when its signal fires. */
function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

/** A server that never answers until the request's signal fires. */
function hangingFetch(calls: Call[]) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")) as Call["body"],
    });
    const signal = init?.signal ?? undefined;
    await new Promise<never>((_, reject) => {
      if (!signal) return;
      if (signal.aborted) reject(abortError());
      else signal.addEventListener("abort", () => reject(abortError()), { once: true });
    });
    throw new Error("unreachable");
  }) as unknown as typeof fetch;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("coach: cancelling the local run", () => {
  it("sends nothing when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const calls: Call[] = [];
    const { run, seen } = executor();

    const result = await runCoach({
      settings: SETTINGS,
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      signal: controller.signal,
      fetchImpl: hangingFetch(calls),
    });

    expect(calls).toEqual([]);
    expect(seen).toEqual([]);
    expect(result.cancelled).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.applied).toBeNull();
    expect(result.errors).toEqual([CANCELLED_ERROR]);
    expect(result.timings).toEqual({ exploreMs: 0, commitMs: 0 });
  });

  it("stops during exploration and never sends the commit request", async () => {
    const controller = new AbortController();
    const calls: Call[] = [];
    const { run, seen } = executor();

    const pending = runCoach({
      settings: SETTINGS,
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      commitRounds: 3,
      signal: controller.signal,
      fetchImpl: hangingFetch(calls),
    });
    // Let phase 1 actually reach the transport, then stop.
    await delay(5);
    controller.abort();
    const result = await pending;

    // One request, no retry, no phase 2: the cancel is immediate.
    expect(calls.length).toBe(1);
    expect(seen).toEqual([]);
    expect(result.cancelled).toBe(true);
    expect(result.applied).toBeNull();
    expect(result.errors).toEqual([CANCELLED_ERROR]);
  });

  it("reads but never applies a late proposal that arrives after the cancel", async () => {
    const controller = new AbortController();
    const calls: Call[] = [];
    const { run, seen, applied } = executor();

    const impl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")) as Call["body"],
      });
      if (calls.length === 1) return ok(prose("explored"));
      // The commit request is in flight, the model is still generating, and the
      // owner presses stop. The server finishes anyway (a real llama.cpp does).
      controller.abort();
      await delay(10);
      return ok(toolCall(FINAL_TOOL, SESSION));
    }) as unknown as typeof fetch;

    const result = await runCoach({
      settings: SETTINGS,
      request: "piernas y core, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      commitRounds: 3,
      signal: controller.signal,
      fetchImpl: impl,
    });

    // The proposal was read (that is why the model is not retried) but the
    // store's executor — the only thing that writes the plan — never saw it.
    expect(applied()).toBe(0);
    expect(seen).toEqual([]);
    expect(result.cancelled).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.applied).toBeNull();
    expect(result.errors).toEqual([CANCELLED_ERROR]);
    // Exactly the two requests, no retry rounds after the stop.
    expect(calls.length).toBe(2);
  });

  it("keeps a timeout readable as a timeout, not as a cancellation", async () => {
    const calls: Call[] = [];
    const { run } = executor();

    const result = await runCoach({
      settings: { ...SETTINGS, timeoutSec: 0.05 },
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      fetchImpl: hangingFetch(calls),
    });

    expect(result.cancelled).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(["local model timed out"]);
    expect(result.errors).not.toContain(CANCELLED_ERROR);
  });
});
