/**
 * Stopping means *not starting anything new* (2026-11-21, T07.1).
 *
 * `test_coach_cancel.test.ts` proves the cancellation through what the network
 * and the store see. That is not enough for the two guards that sit before a
 * request: once the signal is spent, `chatWithTools` already refuses, so a
 * missing guard upstream leaves the same result and the same request count.
 * A mutation of those guards therefore survived that file — the assertions were
 * right about the outcome but could not see the guard.
 *
 * This file closes that gap by counting **conversations started**: one per
 * `chatWithTools` entry. A pre-cancelled run must start zero, and a cancel
 * between commit rounds must not start a third. Removing either guard from
 * `lib/coach-run.ts` turns one of these two red.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

/** Label of every conversation the coach started, in order. */
const conversations: string[] = [];

vi.mock("../../traininglab/apps/desktop/src/lib/llm", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../traininglab/apps/desktop/src/lib/llm")>();
  return {
    ...actual,
    chatWithTools: (input: Parameters<typeof actual.chatWithTools>[0]) => {
      conversations.push(input.finalTool ?? "explore");
      return actual.chatWithTools(input);
    },
  };
});

import {
  CANCELLED_ERROR,
  TOOL_SPECS,
  chatWithTools,
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
];

const CONTEXT = [
  "time_budget_min,45",
  "readiness,energy=4,motivation=5,freshness=0",
  "equipment,dumbbells",
].join("\n");

const SESSION = {
  slots: [{ exerciseId: "goblet-squat", sets: 3, repsMin: 8, repsMax: 12, restSec: 90 }],
};

const ok = (payload: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload,
  }) as unknown as Response;

const prose = (text: string) => ({
  choices: [
    { finish_reason: "stop", message: { role: "assistant", content: text } },
  ],
});

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

/** A server that never answers; the cancel is the only way out. */
const silentFetch = (async () => {
  await new Promise(() => {});
}) as unknown as typeof fetch;

const scriptedFetch = (onRequest?: (n: number) => void) => {
  let n = 0;
  return (async () => {
    n += 1;
    onRequest?.(n);
    return ok(n === 1 ? prose("explored") : toolCall(FINAL_TOOL, SESSION));
  }) as unknown as typeof fetch;
};

afterEach(() => {
  conversations.length = 0;
});

describe("coach: a cancelled run starts no new conversation", () => {
  it("never opens one when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const run = async () => ({ ok: true });

    const result = await runCoach({
      settings: SETTINGS,
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      signal: controller.signal,
      fetchImpl: silentFetch,
    });

    expect(conversations).toEqual([]);
    expect(result.cancelled).toBe(true);
    expect(result.errors).toEqual([CANCELLED_ERROR]);
  });

  it("does not open a second commit conversation after a mid-run cancel", async () => {
    const controller = new AbortController();
    let proposals = 0;
    const plan = { source: "deterministic", slots: ["goblet-squat", "v-up"] };
    const before = { source: plan.source, slots: [...plan.slots] };

    /* Round 1 is rejected by the store; the owner stops while reading it. */
    const run = async (name: string) => {
      if (name !== FINAL_TOOL) return { ok: true };
      proposals += 1;
      if (proposals === 1) {
        controller.abort();
        return { accepted: false, errors: ["proposal contains no slots"] };
      }
      plan.source = "coach";
      plan.slots = ["goblet-squat"];
      return { accepted: true, slots: 1, minutes: 20 };
    };

    const result = await runCoach({
      settings: SETTINGS,
      request: "core, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      commitRounds: 3,
      signal: controller.signal,
      fetchImpl: scriptedFetch(),
    });

    // Exploration plus exactly one commit question — never the retry round.
    expect(conversations).toEqual(["explore", FINAL_TOOL]);
    expect(result.cancelled).toBe(true);
    expect(result.applied).toBeNull();
    expect(proposals).toBe(1);
    expect(plan).toEqual(before);
  });
});

describe("coach: the transport refuses a spent signal by itself", () => {
  it("never sends a request when the conversation starts already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    let requests = 0;

    const result = await chatWithTools({
      settings: SETTINGS,
      messages: [{ role: "user", content: "hi" }],
      tools: TOOL_SPECS,
      execute: async () => ({ ok: true }),
      signal: controller.signal,
      fetchImpl: (async () => {
        requests += 1;
        return ok(prose("x"));
      }) as unknown as typeof fetch,
    });

    expect(requests).toBe(0);
    expect(result.cancelled).toBe(true);
    expect(result.error).toBe(CANCELLED_ERROR);
  });
});
