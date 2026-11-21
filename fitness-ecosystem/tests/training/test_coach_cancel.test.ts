/**
 * Stopping the local coach (2026-11-21, T07.1).
 *
 * The owner's model runs on his own laptop, so a five-minute answer is normal
 * and the screen needs a «parar» control. The promises this file pins:
 *
 *   1. A signal that is already spent sends nothing at all.
 *   2. Cancelling during exploration ends the run before the commit request —
 *      no retry, no session, the deterministic plan exactly as it was.
 *   3. A response that was already generating when the button was pressed may
 *      still arrive with a perfect `propose_session`. It must be read and
 *      discarded: `applyCoachProposal` is never called and the plan is
 *      byte-for-byte what the deterministic engine built.
 *
 * The executor below is the store's `applyCoachProposal`, reduced to the two
 * facts that matter here: how many times it ran and which plan it wrote. The
 * plan is a plain object, so "untouched" is a deep equality and not a promise.
 *
 * Plus the distinction the UI depends on: a timeout is not a cancellation, and
 * a run with no signal behaves exactly as it did before the signal existed.
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

/** What the day holds. Written only by `applyCoachProposal`. */
interface Plan {
  source: "deterministic" | "coach";
  slots: string[];
}

const DETERMINISTIC_PLAN: Plan = {
  source: "deterministic",
  slots: ["goblet-squat", "v-up"],
};

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

/**
 * The store, reduced to what this contract is about: `applyCoachProposal` is
 * the only writer of the plan, and every tool call goes through the executor.
 */
function store(initial: Plan = DETERMINISTIC_PLAN) {
  const plan = { current: { ...initial, slots: [...initial.slots] } };
  const seen: string[] = [];
  let proposals = 0;
  const run = async (name: string, args: Record<string, unknown>) => {
    seen.push(name);
    if (name !== FINAL_TOOL) return { ok: true };
    proposals += 1;
    // The real one validates and then writes today's session. Writing is the
    // effect the cancel button exists to prevent.
    const slots = Array.isArray(args["slots"])
      ? (args["slots"] as { exerciseId?: string }[]).map((s) => String(s.exerciseId))
      : [];
    plan.current = { source: "coach", slots };
    return { accepted: true, slots: slots.length, minutes: 30 };
  };
  return {
    run,
    seen,
    plan,
    proposals: () => proposals,
    /** A snapshot that a later mutation cannot rewrite. */
    snapshot: () => ({ source: plan.current.source, slots: [...plan.current.slots] }),
  };
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
    const s = store();
    const before = s.snapshot();

    const result = await runCoach({
      settings: SETTINGS,
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: s.run,
      usable: USABLE,
      signal: controller.signal,
      fetchImpl: hangingFetch(calls),
    });

    expect(calls).toEqual([]);
    expect(s.seen).toEqual([]);
    expect(result.cancelled).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.applied).toBeNull();
    expect(result.errors).toEqual([CANCELLED_ERROR]);
    expect(result.timings).toEqual({ exploreMs: 0, commitMs: 0 });
    // Nothing was applied and the deterministic plan is untouched.
    expect(s.proposals()).toBe(0);
    expect(s.snapshot()).toEqual(before);
  });

  it("stops during exploration, never sends the commit request and keeps the plan", async () => {
    const controller = new AbortController();
    const calls: Call[] = [];
    const s = store();
    const before = s.snapshot();

    const pending = runCoach({
      settings: SETTINGS,
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: s.run,
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
    expect(s.seen).toEqual([]);
    expect(result.cancelled).toBe(true);
    expect(result.applied).toBeNull();
    expect(result.errors).toEqual([CANCELLED_ERROR]);
    expect(s.proposals()).toBe(0);
    expect(s.snapshot()).toEqual(before);
  });

  it("reads but never applies a late proposal that arrives after the cancel", async () => {
    const controller = new AbortController();
    const calls: Call[] = [];
    const s = store();
    const before = s.snapshot();

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
      execute: s.run,
      usable: USABLE,
      commitRounds: 3,
      signal: controller.signal,
      fetchImpl: impl,
    });

    /*
     * The proposal was read — that is why the model is not asked again — but it
     * never reached the store: `applyCoachProposal` ran zero times, so today's
     * session is still the deterministic one, slot for slot.
     */
    expect(s.proposals()).toBe(0);
    expect(s.seen).toEqual([]);
    expect(result.cancelled).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.applied).toBeNull();
    expect(result.errors).toEqual([CANCELLED_ERROR]);
    expect(s.snapshot()).toEqual(before);
    // Exactly the two requests: the cancel did not trigger a retry round.
    expect(calls.length).toBe(2);
  });

  it("does not retry when the cancel lands between commit rounds", async () => {
    const controller = new AbortController();
    const calls: Call[] = [];
    const plan: Plan = {
      source: DETERMINISTIC_PLAN.source,
      slots: [...DETERMINISTIC_PLAN.slots],
    };
    const before = { source: plan.source, slots: [...plan.slots] };
    let proposals = 0;

    /* Round 1 is rejected; the owner stops while reading the rejection. */
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

    const impl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")) as Call["body"],
      });
      return ok(calls.length === 1 ? prose("explored") : toolCall(FINAL_TOOL, SESSION));
    }) as unknown as typeof fetch;

    // Three rounds are allowed; the abort between rounds stops the loop, so only
    // one commit request is ever sent and the second proposal never happens.
    const result = await runCoach({
      settings: SETTINGS,
      request: "core, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: run,
      usable: USABLE,
      commitRounds: 3,
      signal: controller.signal,
      fetchImpl: impl,
    });

    expect(result.cancelled).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.applied).toBeNull();
    expect(calls.length).toBe(2);
    expect(result.errors).toEqual([CANCELLED_ERROR]);
    // One attempt reached the store and wrote nothing; the plan is unchanged.
    expect(proposals).toBe(1);
    expect(plan).toEqual(before);
  });

  it("keeps a timeout readable as a timeout, not as a cancellation", async () => {
    const calls: Call[] = [];
    const s = store();

    const result = await runCoach({
      settings: { ...SETTINGS, timeoutSec: 0.05 },
      request: "piernas, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: s.run,
      usable: USABLE,
      fetchImpl: hangingFetch(calls),
    });

    expect(result.cancelled).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(["local model timed out"]);
    expect(result.errors).not.toContain(CANCELLED_ERROR);
  });

  it("without a signal behaves exactly as before: it applies and reports cancelled:false", async () => {
    const calls: Call[] = [];
    const s = store();
    const impl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")) as Call["body"],
      });
      return ok(calls.length === 1 ? prose("explored") : toolCall(FINAL_TOOL, SESSION));
    }) as unknown as typeof fetch;

    // The store's current call site passes no `signal` at all.
    const result = await runCoach({
      settings: SETTINGS,
      request: "piernas y core, 45 min",
      contextCsv: CONTEXT,
      tools: TOOL_SPECS,
      execute: s.run,
      usable: USABLE,
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(result.cancelled).toBe(false);
    expect(result.applied).toEqual({ slots: 2, minutes: 30, summary: "Piernas y core" });
    expect(result.errors).toEqual([]);
    expect(s.proposals()).toBe(1);
    expect(s.snapshot()).toEqual({
      source: "coach",
      slots: ["goblet-squat", "v-up"],
    });
  });
});
