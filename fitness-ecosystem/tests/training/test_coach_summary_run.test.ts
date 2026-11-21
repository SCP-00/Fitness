/**
 * The optional weekly sentence (T07.5).
 *
 * The deterministic card is the product; this run is the garnish, so the tests
 * pin both halves of that claim:
 *
 *   * the request carries the counts and nothing else — no tools, no session or
 *     set ids, the language the app is drawing in;
 *   * every way the local server can fail (owner's stop, timeout, port closed,
 *     HTTP error, empty reply) comes back as a named status with
 *     `fallback: true`, so the caller keeps the card instead of showing a blank
 *     or half-written sentence.
 *
 * The transport is injected: no model, no server, no real waiting.
 */
import { describe, expect, it } from "vitest";
import {
  runCoachSummary,
  type CoachSummaryCounts,
  type CoachSummaryResult,
  type CoachSummaryRunInput,
} from "../../traininglab/apps/desktop/src/lib/coach-summary-run";
import type { LlmSettings } from "../../traininglab/apps/desktop/src/lib/types";

const SETTINGS: LlmSettings = {
  enabled: true,
  baseUrl: "http://127.0.0.1:8080/v1",
  model: "local-model",
  apiKey: "",
  timeoutSec: 10,
  maxTokens: 256,
};

const COUNTS: CoachSummaryCounts = {
  from: "2026-11-16",
  to: "2026-11-22",
  closedSessions: 3,
  workingSets: 42,
  warmupSets: 8,
};

interface Call {
  url: string;
  body: {
    messages: { role: string; content: string }[];
    tools?: unknown[];
    tool_choice?: unknown;
    [key: string]: unknown;
  };
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse(
  message: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { role: "assistant", ...message }, finish_reason: "stop" }],
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

/** A transport that records every request and answers with `content`. */
function replying(content: string, calls: Call[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    return jsonResponse({ content });
  }) as unknown as typeof fetch;
}

/** A transport that never answers until its signal aborts — a slow server. */
function hanging(calls: Call[]): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    const signal = init?.signal ?? undefined;
    await new Promise<never>((_, reject) => {
      const abort = () =>
        reject(new DOMException("The operation was aborted.", "AbortError"));
      if (!signal) return;
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    });
    throw new Error("unreachable");
  }) as unknown as typeof fetch;
}

function run(
  overrides: Partial<CoachSummaryRunInput> = {},
): Promise<CoachSummaryResult> {
  return runCoachSummary({
    counts: COUNTS,
    language: "es",
    settings: SETTINGS,
    ...overrides,
  });
}

describe("coach weekly summary run: the request", () => {
  it("asks once, with no tools, and returns the model's sentence", async () => {
    const calls: Call[] = [];
    const result = await run({
      fetchImpl: replying("Cerraste tres sesiones y sumaste 42 series de trabajo.", calls),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://127.0.0.1:8080/v1/chat/completions");
    expect(calls[0].body.tools).toEqual([]);
    expect(result.status).toBe("ready");
    expect(result.fallback).toBe(false);
    expect(result.text).toBe(
      "Cerraste tres sesiones y sumaste 42 series de trabajo.",
    );
    expect(result.error).toBeUndefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("sends the period and the three counts, in Spanish", async () => {
    const calls: Call[] = [];
    await run({ fetchImpl: replying("Resumen.", calls) });

    const prompt = calls[0].body.messages.map((m) => m.content).join("\n");
    expect(prompt).toContain("2026-11-16");
    expect(prompt).toContain("2026-11-22");
    expect(prompt).toContain("Sesiones cerradas: 3");
    expect(prompt).toContain("Series de trabajo: 42");
    expect(prompt).toContain("Series de calentamiento: 8");
    expect(prompt).toContain("español");
    // No terminal tool, no proposal, no equipment: this is prose only.
    expect(prompt).not.toContain("propose_session");
  });

  it("writes the request in English when the app is in English", async () => {
    const calls: Call[] = [];
    await run({ language: "en", fetchImpl: replying("Two sentences.", calls) });

    const prompt = calls[0].body.messages.map((m) => m.content).join("\n");
    expect(prompt).toContain("Period: 2026-11-16 to 2026-11-22");
    expect(prompt).toContain("Closed sessions: 3");
    expect(prompt).toContain("Working sets: 42");
    expect(prompt).toContain("Write the summary of the week.");
  });

  it("never lets the ids of individual records reach the prompt", async () => {
    const calls: Call[] = [];
    // A full summary object is structurally a valid `counts`; its id lists are
    // not part of the type and must not be forwarded.
    const withIds = {
      ...COUNTS,
      sessionIds: ["session-secret-1", "session-secret-2"],
      setIds: ["set-secret-1"],
    };
    const result = await run({ counts: withIds, fetchImpl: replying("ok", calls) });

    const sent = JSON.stringify(calls[0].body);
    expect(sent).not.toContain("session-secret");
    expect(sent).not.toContain("set-secret");
    expect(result.status).toBe("ready");
  });
});

describe("coach weekly summary run: every non-answer keeps the card", () => {
  it("sends nothing when the queue's signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const calls: Call[] = [];

    const result = await run({
      signal: controller.signal,
      fetchImpl: hanging(calls),
    });

    expect(calls).toEqual([]);
    expect(result.status).toBe("cancelled");
    expect(result.fallback).toBe(true);
    expect(result.text).toBe("");
  });

  it("reports a stop that lands mid-request as cancelled", async () => {
    const controller = new AbortController();
    const calls: Call[] = [];
    const pending = run({
      signal: controller.signal,
      fetchImpl: hanging(calls),
    });

    await delay(5);
    controller.abort();
    const result = await pending;

    expect(calls).toHaveLength(1);
    expect(result.status).toBe("cancelled");
    expect(result.fallback).toBe(true);
    expect(result.text).toBe("");
  });

  it("reports a closed port as offline, not as a bad answer", async () => {
    const result = await run({
      fetchImpl: (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch,
    });

    expect(result.status).toBe("offline");
    expect(result.fallback).toBe(true);
    expect(result.text).toBe("");
    expect(result.error).toBe("fetch failed");
  });

  it("reports a slow server as timeout", async () => {
    const calls: Call[] = [];
    const result = await run({
      // 20 ms: the transport's own timer aborts the request while the fake
      // server is still holding it.
      settings: { ...SETTINGS, timeoutSec: 0.02 },
      fetchImpl: hanging(calls),
    });

    expect(result.status).toBe("timeout");
    expect(result.fallback).toBe(true);
    expect(result.text).toBe("");
    expect(result.error).toBe("local model timed out");
  });

  it("treats an HTTP error and a broken body as failures, not as prose", async () => {
    const http = await run({
      fetchImpl: (async () =>
        new Response("nope", { status: 503, statusText: "Service Unavailable" })) as unknown as typeof fetch,
    });
    expect(http.status).toBe("failed");
    expect(http.fallback).toBe(true);
    expect(http.error).toContain("503");

    const broken = await run({
      fetchImpl: (async () =>
        new Response(JSON.stringify({ choices: [] }), { status: 200 })) as unknown as typeof fetch,
    });
    expect(broken.status).toBe("failed");
    expect(broken.text).toBe("");
  });

  it("treats an empty or blank reply as empty, not as a summary", async () => {
    const blank = await run({ fetchImpl: replying("") });
    expect(blank.status).toBe("empty");
    expect(blank.text).toBe("");
    expect(blank.fallback).toBe(true);

    const whitespace = await run({ fetchImpl: replying(" \n\t ") });
    expect(whitespace.status).toBe("empty");
  });
});

describe("coach weekly summary run: keeping the sentence presentable", () => {
  it("collapses newlines, bullets and wrapping quotes into one paragraph", async () => {
    const result = await run({
      fetchImpl: replying(
        '"Entrenaste **tres** días.\n\n- 42 series de trabajo.\n- Descansa bien."',
      ),
    });

    expect(result.status).toBe("ready");
    expect(result.text).toBe(
      "Entrenaste **tres** días. - 42 series de trabajo. - Descansa bien.",
    );
    expect(result.text).not.toContain("\n");
  });

  it("cuts a runaway answer at a sentence, never mid-word", async () => {
    const sentences = await run({
      fetchImpl: replying("Entrenaste con constancia esta semana. ".repeat(40)),
    });
    expect(sentences.status).toBe("ready");
    expect(sentences.text.length).toBeLessThanOrEqual(480);
    expect(sentences.text.endsWith(".")).toBe(true);

    const words = await run({ fetchImpl: replying("palabra ".repeat(200)) });
    expect(words.status).toBe("ready");
    expect(words.text.length).toBeLessThanOrEqual(481);
    expect(words.text.endsWith("…")).toBe(true);
    expect(words.text).not.toMatch(/palabr…$/);
  });
});
