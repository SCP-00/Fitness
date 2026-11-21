/**
 * Local LLM bridge — opt-in, on demand, and strictly grounded.
 *
 * Works with anything that speaks the OpenAI chat-completions API over
 * loopback: the `llama.cpp` server, LM Studio, Jan, Unsloth Studio, Ollama's
 * OpenAI compatibility endpoint… The user points the app at the port, loads the
 * model manually (exactly like those apps do), and enables it. Nothing is
 * downloaded, nothing leaves the machine, nothing runs unless the user asks.
 *
 * Contract (owner-confirmed): **the LLM proposes, the deterministic maths and
 * the hard rules dispose**. The model is given a small, read-only tool set plus
 * one terminal `propose_session` tool whose output is validated against the
 * gear and the time budget before it can ever reach the screen. If the model
 * is unavailable, wrong, or slow, the app silently keeps the deterministic
 * plan — a session is never blocked by the AI.
 *
 * @module lib/llm
 */

import type { LlmSettings } from "./types";

// ── Wire types (OpenAI-compatible subset) ───────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Executes one tool call. May be async; returns a JSON-serializable result. */
export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown> | unknown;

export interface ChatWithToolsInput {
  settings: LlmSettings;
  messages: ChatMessage[];
  tools: ToolSpec[];
  execute: ToolExecutor;
  /** Hard cap on tool round-trips (protects against a looping model). */
  maxSteps?: number;
  /**
   * The tool the conversation must END in — TrainingLab's `propose_session`.
   *
   * Measured on the owner's Qwen3.5-4B (2026-10-30): left to `tool_choice:
   * "auto"` it explored forever (`get_context` → `get_deterministic_plan` →
   * `report_fatigue…` → `list_available_exercises` twice) and never proposed
   * anything, so five minutes of inference produced no session. Once the
   * terminal tool is forced it answers in one step.
   */
  finalTool?: string;
  /** Explore steps allowed before `finalTool` is forced (default 3). */
  finalAfter?: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /**
   * Caller-owned cancellation (the screen's «parar» button). Aborting it ends
   * the run **without** executing another tool, and is reported as
   * `cancelled: true` — a timeout is a different fact and keeps its own
   * message, because "your model is slow" and "you stopped it" need different
   * words in front of the owner (2026-11-21).
   */
  signal?: AbortSignal;
}

/**
 * The one sentence a cancelled run ends with. Exported so `lib/coach-run.ts`,
 * the view and the tests cannot drift apart about what a cancellation reads.
 */
export const CANCELLED_ERROR = "cancelled by the user";
export const TIMEOUT_ERROR = "local model timed out";

export interface ChatWithToolsResult {
  ok: boolean;
  content: string;
  /**
   * True when the caller's `signal` ended the run. A cancelled result never
   * carries a tool result produced after the abort.
   */
  cancelled?: boolean;
  /**
   * Every tool call the model made, for transparency in the UI — plus the
   * result it got, which is what the commit phase of the coach digest is built
   * from (`lib/coach-run.ts`).
   */
  toolCalls: {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }[];
  error?: string;
}

/** Normalize a base URL into a chat-completions endpoint. */
export function chatEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (/\/(chat\/)?completions$/.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

const DEFAULT_TIMEOUT_SEC = 60;
const DEFAULT_MAX_STEPS = 6;
/** Explore steps before the terminal tool is forced (see `finalTool`). */
const DEFAULT_FINAL_AFTER = 3;
/**
 * System-level nudge sent once, right before the terminal tool is forced.
 * A 4B model follows this far better than it infers "stop exploring" from the
 * tool description alone, and it costs ~20 tokens on one request.
 */
const FORCE_NUDGE =
  "You have enough information. Stop calling exploration tools and answer NOW by calling the final tool with your complete session.";
/**
 * Ceiling for one answer, in tokens.
 *
 * Measured on the owner's Qwen3.5-4B (2026-10-30): a reasoning model spends 300–400
 * tokens *thinking* before it emits the first `tool_calls` character, and with the cap at
 * 400 the arguments arrived cut in half (`finish_reason: "length"`). 1024 is the smallest
 * number that fits the reasoning plus a five-slot session; it is a ceiling, not a cost —
 * a model that answers in 200 stops at 200.
 */
const DEFAULT_MAX_TOKENS = 1024;

/**
 * Run a bounded tool-calling conversation. Never throws: failures come back as
 * `{ ok: false, error }` so the caller can fall back to the deterministic plan.
 */
export async function chatWithTools(
  input: ChatWithToolsInput,
): Promise<ChatWithToolsResult> {
  const { settings, tools, execute, signal } = input;
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
  const messages: ChatMessage[] = [...input.messages];
  const toolCalls: {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }[] = [];
  const finalAfter = Math.max(0, input.finalAfter ?? DEFAULT_FINAL_AFTER);
  let nudged = false;
  let finalCalled = false;

  if (typeof fetchImpl !== "function") {
    return {
      ok: false,
      content: "",
      toolCalls,
      error: "fetch is unavailable in this environment",
    };
  }

  /* A signal that is already spent means the request never started: no fetch
   * and no tool call, which is what "cancel before running" has to mean. */
  if (signal?.aborted) return cancelledResult(toolCalls, "");

  for (let step = 0; step <= maxSteps; step++) {
    const scope = abortScope(
      signal,
      (settings.timeoutSec || DEFAULT_TIMEOUT_SEC) * 1000,
    );
    /*
     * Force the terminal tool once the model has had its explore steps. The
     * nudge is pushed once, not every step: repeating it wastes context on the
     * exact turns where the budget is already tight.
     */
    const forcing = Boolean(input.finalTool) && !finalCalled && step >= finalAfter;
    if (forcing && !nudged) {
      messages.push({ role: "user", content: FORCE_NUDGE });
      nudged = true;
    }

    /*
     * `tool_choice: {type:"function"}` alone is not enough: the owner's
     * llama.cpp + Qwen3.5 template accepted it and kept calling
     * `list_available_exercises` anyway (measured 2026-10-30). Narrowing the
     * tool list is not advisory — with only the terminal tool in scope the
     * model has nothing else to call.
     */
    const forcedOnly = forcing
      ? tools.filter((t) => t.function.name === input.finalTool)
      : [];
    const offeredTools = forcedOnly.length > 0 ? forcedOnly : tools;

    const body = (withThinkingHint: boolean) => ({
      model: settings.model || "local-model",
      messages,
      tools: offeredTools,
      tool_choice: forcing
        ? { type: "function" as const, function: { name: input.finalTool } }
        : "auto",
      temperature: 0.2,
      // Without a cap llama.cpp predicts until it stops talking, which a
      // small model can stretch past any timeout the owner sets.
      max_tokens: settings.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: false,
      /*
       * Ask the chat template to skip the reasoning block (2026-10-30).
       * Measured on Qwen3.5-4B: thinking costs 300–500 tokens and, worse, it
       * makes the model explore instead of answering — the same request calls
       * `propose_session` immediately without it. Servers whose template has no
       * such kwarg ignore the field; a strict one that rejects it is retried
       * once below without it.
       */
      ...(withThinkingHint ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    });

    const headers = {
      "Content-Type": "application/json",
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    };
    let res: Response;
    let payload: unknown;
    try {
      res = await fetchImpl(chatEndpoint(settings.baseUrl), {
        method: "POST",
        headers,
        body: JSON.stringify(body(true)),
        signal: scope.signal,
      });
      if (!res.ok && res.status === 400) {
        // A cancel that lands between the two requests is not a reason to send
        // the second one: a stopped run stops.
        if (signal?.aborted) return cancelledResult(toolCalls, "");
        // Unknown-field rejection is not fatal: the hint is an optimisation.
        res = await fetchImpl(chatEndpoint(settings.baseUrl), {
          method: "POST",
          headers,
          body: JSON.stringify(body(false)),
          signal: scope.signal,
        });
      }
      if (!res.ok) {
        return {
          ok: false,
          content: "",
          toolCalls,
          error: `local server answered ${res.status} ${res.statusText}`,
        };
      }
      payload = await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      /*
       * Cancellation and timeout both surface as an abort, and they are not the
       * same event: the first is the owner's decision, the second is the
       * server being too slow. Only the caller's signal means cancelled.
       */
      if (signal?.aborted) return cancelledResult(toolCalls, "");
      return {
        ok: false,
        content: "",
        toolCalls,
        error: scope.didTimeout() ? TIMEOUT_ERROR : message,
      };
    } finally {
      scope.cleanup();
    }

    /*
     * A server that finishes generating after the owner cancelled still answers
     * with a full body. Reading it and executing its tool would apply exactly
     * the session the cancel button was pressed to stop.
     */
    if (signal?.aborted) return cancelledResult(toolCalls, "");

    const message = extractMessage(payload);
    if (!message) {
      return {
        ok: false,
        content: "",
        toolCalls,
        error: "unexpected response shape from the local server",
      };
    }

    /*
     * `length` is not a normal answer: the server stopped mid-sentence because
     * the token cap ran out (2026-10-30, measured on Qwen3.5-4B, which thinks
     * for ~350 tokens before emitting the call). Continuing with half a JSON
     * object — or worse, executing the tool with `{}` — turns a transport fact
     * into a validator rejection the owner cannot act on. Say what happened.
     */
    if (finishReasonOf(payload) === "length") {
      return {
        ok: false,
        content: message.content ?? "",
        toolCalls,
        error: "the model ran out of tokens mid-answer (finish_reason=length) — raise the token cap or shorten the request",
      };
    }

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      /*
       * The terminal tool was forced and the model still answered in prose.
       * Reporting success here would show the owner a paragraph next to an
       * unchanged session with no explanation, so it is a failure with a
       * reason — the deterministic plan stands and the screen says why.
       */
      if (forcing) {
        return {
          ok: false,
          content: message.content ?? "",
          toolCalls,
          error: `the model answered without calling ${input.finalTool}`,
        };
      }
      return { ok: true, content: message.content ?? "", toolCalls };
    }

    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: calls,
    });
    for (const call of calls) {
      if (signal?.aborted) return cancelledResult(toolCalls, "");
      /*
       * llama.cpp does not validate the emitted tool name against the offered
       * list, so a model can keep calling a tool that is no longer in scope
       * (measured: `list_available_exercises` three times after it was
       * removed). Refuse it with a readable reason instead of running it —
       * running it would silently spend the whole step budget again.
       */
      if (forcing && call.function.name !== input.finalTool) {
        toolCalls.push({ name: call.function.name, args: {} });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: `tool "${call.function.name}" is not available now. Call ${input.finalTool} with your complete session — that is the only accepted answer.`,
          }),
        });
        continue;
      }
      const args = parseToolArgs(call.function.arguments);
      /*
       * Un-parseable arguments do NOT reach the tool. Before 2026-10-30 they
       * became `{}` and ran: `propose_session` then refused with "slots_required",
       * which reads as a bad proposal instead of a broken tool call. The model
       * gets one chance to resend the call; if it keeps failing, the loop ends
       * with an error and the deterministic plan stands.
       */
      if (args === null) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error:
              "the tool arguments were not valid JSON — send the same tool call again with complete, valid JSON",
          }),
        });
        continue;
      }
      if (call.function.name === input.finalTool) finalCalled = true;
      let result: unknown;
      try {
        result = await execute(call.function.name, args);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
      }
      toolCalls.push({ name: call.function.name, args, result });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result).slice(0, 4000),
      });
    }
  }

  return {
    ok: false,
    content: "",
    toolCalls,
    error: `the model exceeded ${maxSteps} tool steps without answering`,
  };
}

/** A run the caller stopped: never ok, never a proposal, and marked as such. */
function cancelledResult(
  toolCalls: ChatWithToolsResult["toolCalls"],
  content: string,
): ChatWithToolsResult {
  return {
    ok: false,
    content,
    toolCalls,
    cancelled: true,
    error: CANCELLED_ERROR,
  };
}

/**
 * One request's abort plumbing: the caller's signal and the timeout share a
 * controller, while `didTimeout()` keeps them tellable apart afterwards.
 */
function abortScope(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternal = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onExternal, { once: true });
  }
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onExternal);
    },
  };
}

function extractMessage(payload: unknown): ChatMessage | null {
  if (payload === null || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (message === null || typeof message !== "object") return null;
  const m = message as { content?: unknown; tool_calls?: unknown };
  return {
    role: "assistant",
    content: typeof m.content === "string" ? m.content : null,
    tool_calls: Array.isArray(m.tool_calls)
      ? (m.tool_calls as ToolCall[])
      : undefined,
  };
}

/**
 * Tool arguments, or `null` when they are not a JSON object.
 *
 * `null` is load-bearing: it means "this call never happened", which is different
 * from `{}` ("the call happened with no parameters"). Several tools here take no
 * parameters at all, so returning `{}` on a parse failure made a truncated call
 * indistinguishable from a deliberate empty one.
 */
function parseToolArgs(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The first choice's `finish_reason`, when the server sent one. */
function finishReasonOf(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const reason = (choices[0] as { finish_reason?: unknown }).finish_reason;
  return typeof reason === "string" ? reason : null;
}

/** What a "Probar conexión" click learned about the local server. */
export interface ProbeResult {
  ok: boolean;
  /** The endpoint the app would POST to (so a wrong base URL is visible). */
  endpoint: string;
  /** Model ids the server advertises (empty when it does not answer /models). */
  models: string[];
  /** Round-trip of the probe itself, milliseconds. */
  ms: number;
  error?: string;
}

/**
 * Is there a local server at this URL, and which models does it have?
 *
 * `GET /models` is the cheapest honest check: it exercises DNS, the port, CORS
 * and the auth header without spending a single token of inference. The owner's
 * real failure mode is a URL that looks right and a server that is not running
 * (llama.cpp sits on 8080, his router UI on 9931, LM Studio on 1234), so the
 * probe answers with the endpoint it actually tried.
 */
export async function probeServer(
  settings: LlmSettings,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<ProbeResult> {
  const endpoint = chatEndpoint(settings.baseUrl).replace(
    /\/chat\/completions$/,
    "/models",
  );
  const started = Date.now();
  if (typeof fetchImpl !== "function") {
    return { ok: false, endpoint, models: [], ms: 0, error: "fetch unavailable" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(15, settings.timeoutSec || DEFAULT_TIMEOUT_SEC) * 1000,
  );
  try {
    const res = await fetchImpl(endpoint, {
      method: "GET",
      headers: settings.apiKey
        ? { Authorization: `Bearer ${settings.apiKey}` }
        : undefined,
      signal: controller.signal,
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      return {
        ok: false,
        endpoint,
        models: [],
        ms,
        error: `server answered ${res.status} ${res.statusText}`,
      };
    }
    const payload: unknown = await res.json();
    const data = (payload as { data?: unknown }).data;
    const models = Array.isArray(data)
      ? data
          .map((entry) =>
            entry && typeof entry === "object"
              ? String((entry as { id?: unknown }).id ?? "")
              : "",
          )
          .filter((id) => id.length > 0)
      : [];
    return { ok: true, endpoint, models, ms };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      endpoint,
      models: [],
      ms: Date.now() - started,
      error: controller.signal.aborted ? "timed out" : message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Ports a local inference server actually listens on, in preference order.
 *
 * The owner's own llama.cpp serves the OpenAI routes on 9931 (a router that
 * spawns the model on a random port behind it), while llama.cpp's default is
 * 8080, LM Studio 1234, Ollama 11434, Jan 1337 and vLLM/text-generation-webui
 * 8000. Making him type one of those and the exact model id was the last piece
 * of setup standing between him and a working coach (2026-10-30).
 */
export const LOCAL_SERVER_CANDIDATES = [
  "http://127.0.0.1:8080/v1",
  "http://127.0.0.1:9931/v1",
  "http://127.0.0.1:1234/v1",
  "http://127.0.0.1:11434/v1",
  "http://127.0.0.1:1337/v1",
  "http://127.0.0.1:8000/v1",
];

/** What "find my server" found. */
export interface DetectionResult {
  ok: boolean;
  /** The endpoint to write into the settings, or null when nothing answered. */
  baseUrl: string | null;
  /** First model the server advertises (what the app will ask for). */
  model: string | null;
  models: string[];
  /** Every endpoint tried, so the UI can say what it looked at. */
  tried: string[];
  ms: number;
}

/**
 * Find a local server without asking the owner a single question.
 *
 * All candidates are probed **in parallel** with a short timeout: six GETs on
 * loopback cost nothing, and doing them in sequence would make a miss (nobody
 * running) take six times as long — the exact moment a user gives up. The first
 * candidate in preference order that answers wins; a server that answers with
 * no models still counts as found (the owner may just have no model loaded).
 */
export async function detectLocalServer(
  fetchImpl: typeof fetch = globalThis.fetch,
  opts?: { timeoutSec?: number; candidates?: string[] },
): Promise<DetectionResult> {
  const candidates = opts?.candidates ?? LOCAL_SERVER_CANDIDATES;
  const started = Date.now();
  const probes = await Promise.all(
    candidates.map(async (baseUrl) => ({
      baseUrl,
      probe: await probeServer(
        {
          enabled: true,
          baseUrl,
          model: "",
          apiKey: "",
          timeoutSec: opts?.timeoutSec ?? 2,
        },
        fetchImpl,
      ),
    })),
  );
  const found = probes.find((entry) => entry.probe.ok);
  return {
    ok: Boolean(found),
    baseUrl: found?.baseUrl ?? null,
    model: found?.probe.models[0] ?? null,
    models: found?.probe.models ?? [],
    tried: candidates,
    ms: Date.now() - started,
  };
}

// ── Tools the model may call (read-only) + the single terminal proposal ─────

export const TOOL_SPECS: ToolSpec[] = [
  {
    type: "function",
    function: {
      name: "get_context",
      description:
        "Everything the planner knows right now: time budget, readiness self-report, goal, level, owned equipment and the weak muscle families from BodyLab.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deterministic_plan",
      description:
        "The session the deterministic engine already built for today (ordered slots with sets, reps, rest and the reason each was chosen). Use it as your baseline.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_available_exercises",
      description:
        "Exercises the user can actually perform with the equipment they own, with pattern, load type and hypertrophy rating.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "Optional movement pattern filter (e.g. vertical_pull).",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_exercise_history",
      description:
        "Recent logged sets for one exercise (last 10), newest last.",
      parameters: {
        type: "object",
        properties: { exerciseId: { type: "string" } },
        required: ["exerciseId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_progression_verdict",
      description:
        "What to do the NEXT time each exercise is trained, decided by the multi-day log: raise the load (with the exact kilos), make the movement harder by another lever when the load has hit the gear's ceiling, repeat and add reps, rebuild below the range, or drop to an easier variant. Today's own sets are excluded on purpose — inside a day the D/F mark decides the load. Call it before you propose any load.",
      parameters: {
        type: "object",
        properties: {
          exerciseId: {
            type: "string",
            description:
              "Optional: one exercise from today's plan. Omit it for every slot of today's session.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "report_fatigue_and_query_safe",
      description:
        "Report soreness, fatigue, or joint pain in specific muscle groups/joints to receive safe, alternative exercises from the user's available gear that completely avoid stressing those compromised areas.",
      parameters: {
        type: "object",
        properties: {
          painOrFatigueAreas: {
            type: "array",
            items: { type: "string" },
            description:
              "Anatomical areas with pain or fatigue, e.g. 'upper_chest', 'front_shoulder', 'biceps_tendon', 'rotator_cuff', 'lower_back', 'knees', 'elbows'.",
          },
          targetFocus: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional fresh muscle groups or patterns the user wants to prioritize instead, e.g. 'abs', 'obliques', 'legs', 'lats'.",
          },
        },
        required: ["painOrFatigueAreas"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "swap_exercise_safe",
      description:
        "Swap one specific exercise in the current plan for a biomechanically safe alternative without aggravating the reported soreness.",
      parameters: {
        type: "object",
        properties: {
          currentExerciseId: { type: "string" },
          reason: { type: "string" },
          targetMuscle: { type: "string" },
        },
        required: ["currentExerciseId", "reason"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_session",
      description:
        "FINAL ANSWER tool. Propose the session to show. Only exercises from list_available_exercises are accepted; the app validates the proposal against the equipment, the time budget and the hard rules, and rejects it with reasons otherwise.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "One or two sentences the user will read.",
          },
          slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exerciseId: { type: "string" },
                sets: { type: "integer" },
                repsMin: { type: "integer" },
                repsMax: { type: "integer" },
                restSec: { type: "integer" },
                note: {
                  type: "string",
                  description: "Short coaching cue for this slot.",
                },
              },
              required: ["exerciseId", "sets", "repsMin", "repsMax", "restSec"],
            },
          },
        },
        required: ["slots"],
      },
    },
  },
];

export interface ProposedSlot {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  note?: string;
}

export interface ProposalCheck {
  ok: boolean;
  errors: string[];
  slots: ProposedSlot[];
  /** Estimated minutes including rest (the same model the builder uses). */
  estimatedMinutes: number;
}

/**
 * Validate an LLM proposal. Rejections are returned as readable reasons so the
 * model can retry inside the same conversation (that is the "hard rules
 * dispose" half of the contract).
 */
export function validateProposal(
  raw: unknown,
  ctx: {
    usableIds: Set<string>;
    timeBudgetMin: number;
    /** Primary family per exercise id, for the once-per-family rule. */
    primaryFamilyOf: (exerciseId: string) => string;
    setupMinOf?: (exerciseId: string) => number;
    /**
     * Every direct family of an exercise — the fatigue rule needs the whole
     * list, not just the primary one (pull-ups load lats, biceps AND forearms).
     */
    familiesOf?: (exerciseId: string) => string[];
    /**
     * Families inside their recovery window or flagged sore by the user. A
     * proposal that touches one is rejected with a readable reason, so a small
     * local model cannot prescribe yesterday's muscles today (2026-10-09).
     */
    fatiguedFamilies?: string[];
    /**
     * Movement patterns today's pain constraint forbids (2026-10-30). The
     * deterministic engine already vetoes pressing when the owner reports sore
     * shoulders; without this the agent path accepted exactly what the engine
     * refused — two halves of one app disagreeing about the same day.
     */
    vetoedPatterns?: string[];
    /** Pattern of one exercise, for the veto check above. */
    patternOf?: (exerciseId: string) => string;
    /**
     * Families today is focused on. A focused family may appear TWICE; every
     * other family still appears once (2026-10-30). Why: «hoy pecho» with two
     * chest movements is normal training, and the old one-per-family rule made
     * the app refuse every coach proposal that answered the most common request
     * in the world. The engine already worked this way — its real rule is one
     * slot per movement PATTERN (see `session.ts`), not per family.
     */
    focusFamilies?: string[];
  },
): ProposalCheck {
  const errors: string[] = [];
  const obj = (raw ?? {}) as { slots?: unknown };
  const rawSlots = Array.isArray(obj.slots) ? obj.slots : [];
  if (rawSlots.length === 0)
    return {
      ok: false,
      errors: ["proposal contains no slots"],
      slots: [],
      estimatedMinutes: 0,
    };

  const slots: ProposedSlot[] = [];
  /** How many slots each primary family already has. */
  const familyCount = new Map<string, number>();
  /** How many slots each movement pattern already has. */
  const patternCount = new Map<string, number>();
  let minutes = 0;

  for (const item of rawSlots) {
    const s = (item ?? {}) as Partial<ProposedSlot>;
    const id = typeof s.exerciseId === "string" ? s.exerciseId : "";
    if (!id || !ctx.usableIds.has(id)) {
      errors.push(
        `"${id || "(missing id)"}" is not available with the current equipment`,
      );
      continue;
    }
    const sets = clampInt(s.sets, 1, 8);
    const repsMin = clampInt(s.repsMin, 1, 50);
    const repsMax = clampInt(s.repsMax, repsMin ?? 1, 100);
    const restSec = clampInt(s.restSec, 0, 600);
    if (
      sets === null ||
      repsMin === null ||
      repsMax === null ||
      restSec === null
    ) {
      errors.push(`"${id}" has an invalid prescription`);
      continue;
    }
    const pattern = ctx.patternOf?.(id);
    if (pattern && ctx.vetoedPatterns?.includes(pattern)) {
      errors.push(
        `"${id}" uses the ${pattern} pattern, which is vetoed while the reported areas are sore`,
      );
      continue;
    }
    const family = ctx.primaryFamilyOf(id);
    const loaded = ctx.familiesOf?.(id) ?? [family];
    const fatigued = loaded.find((f) => ctx.fatiguedFamilies?.includes(f));
    if (fatigued) {
      errors.push(
        `"${id}" loads ${fatigued}, which is still inside its recovery window today`,
      );
      continue;
    }
    // One slot per family, except the day's focus, which may take two.
    const isFocus = ctx.focusFamilies?.includes(family) ?? false;
    const cap = isFocus ? 2 : 1;
    const used = familyCount.get(family) ?? 0;
    if (used >= cap) {
      errors.push(
        cap === 1
          ? `"${id}" repeats the ${family} work already programmed today`
          : `"${id}" would be a third ${family} exercise: a focused day allows two`,
      );
      continue;
    }
    /*
     * The pattern rule, with the one exception the focus needs (2026-10-30).
     *
     * Every family gets one slot per pattern — two vertical pulls in a session
     * are the same pull twice, which is why `session.ts` refuses them. But the
     * focused family may repeat its pattern ONCE: the catalogue files fifteen of
     * the sixteen chest exercises under `horizontal_push`, so without this a
     * "chest day" could only ever be a press plus a pullover. Bench plus fly is
     * normal training; three is a catalogue problem, and the family cap stops it.
     */
    const patternCap = isFocus ? 2 : 1;
    const patternUsed = pattern ? (patternCount.get(pattern) ?? 0) : 0;
    if (pattern && patternUsed >= patternCap) {
      errors.push(
        `"${id}" repeats the ${pattern} pattern already in this session`,
      );
      continue;
    }
    familyCount.set(family, used + 1);
    if (pattern) patternCount.set(pattern, patternUsed + 1);
    minutes += (ctx.setupMinOf?.(id) ?? 0) + (sets * (45 + restSec)) / 60;
    slots.push({
      exerciseId: id,
      sets,
      repsMin,
      repsMax,
      restSec,
      note: typeof s.note === "string" ? s.note : undefined,
    });
  }

  // A 10 % grace on the budget: the model is allowed to be slightly optimistic,
  // not to ignore a 90-minute limit.
  if (minutes > ctx.timeBudgetMin * 1.1) {
    errors.push(
      `estimated ${Math.round(minutes)} min exceeds the ${ctx.timeBudgetMin} min budget`,
    );
  }

  return {
    ok: errors.length === 0 && slots.length > 0,
    errors,
    slots,
    estimatedMinutes: Math.round(minutes * 10) / 10,
  };
}

function clampInt(v: unknown, lo: number, hi: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** The system prompt: rules first, data second — the model's actual job. */
export function buildSystemPrompt(extraContext?: string): string {
  const base = [
    "You are the coaching layer of TrainingLab, a 100% local fitness app.",
    "You NEVER invent exercises, equipment or numbers: everything you propose must come from the tools.",
    "The deterministic planner has already built a session from real measurements; your job is to improve it",
    "for TODAY (time available, energy, motivation, soreness, equipment at hand) and to explain your choices",
    "in one short paragraph, in the language of the user (Spanish unless told otherwise).",
    "Hard rules: respect the time budget; never program equipment the user does not own; never repeat a muscle",
    "family twice in one session; never program a movement pattern already used in today's session; never",
    "program a family the tools report as sore or still recovering; leave more reps in reserve (higher RIR)",
    "when readiness is low; prefer the weakest muscle family first. Before you propose any load, call",
    "get_progression_verdict: it carries the multi-day verdict with the exact kilos and the lever to use when",
    "the load cannot grow. If the request mentions pain, soreness, a tired or injured area, you MUST call",
    "report_fatigue_and_query_safe with those areas before proposing anything, and never program a pattern it",
    "reports as vetoed — the app rejects the whole proposal otherwise. Finish by calling propose_session. Be concise.",
  ].join(" ");
  if (extraContext) {
    return `${base} ${extraContext}`;
  }
  return base;
}

/** Biomechanical constraints derived from reported pain or soreness. */
export interface BiomechanicalConstraint {
  contraindicatedPatterns: string[];
  excludeJoints: string[];
  excludeMuscles: string[];
  recommendedPatterns: string[];
  clinicalReason: string;
}

/**
 * Evaluates reported pain/soreness keywords and maps them to biomechanical
 * patterns to avoid and safe alternatives to prioritize.
 */
export function evaluateBiomechanicsAndFatigue(
  reportedIssues: string[],
): BiomechanicalConstraint {
  const issuesLower = reportedIssues.map((s) => s.toLowerCase());
  const hasChestOrFrontShoulder = issuesLower.some(
    (s) =>
      s.includes("pecho") ||
      s.includes("chest") ||
      s.includes("hombro") ||
      s.includes("shoulder") ||
      s.includes("mancuerna") ||
      s.includes("biceps") ||
      s.includes("clavicular") ||
      s.includes("rotator"),
  );

  const hasLowerBack = issuesLower.some(
    (s) =>
      s.includes("lumbar") ||
      s.includes("espalda baja") ||
      s.includes("lower back") ||
      s.includes("spine"),
  );

  const hasKnee = issuesLower.some(
    (s) => s.includes("rodilla") || s.includes("knee") || s.includes("rotuliana"),
  );

  if (hasChestOrFrontShoulder) {
    return {
      contraindicatedPatterns: [
        "horizontal_push",
        "vertical_push",
        "shoulder_flexion",
        "shoulder_abduction",
      ],
      excludeJoints: ["shoulder"],
      excludeMuscles: ["chest", "deltoid_anterior", "biceps"],
      recommendedPatterns: [
        "core_flexion",
        "core_anti_extension",
        "core_anti_lateral",
        "core_rotation",
        "squat",
        "lunge",
        "knee_flexion",
        "knee_extension",
        "plantar_flexion",
      ],
      clinicalReason:
        "Sobrecarga o molestia en la inserción clavicular del pectoral mayor, deltoides anterior o tendón bicipital por torque excéntrico con mancuernas. Se vetan empujes y aperturas que estiren la articulación glenohumeral. Se prioriza core/abdomen y tren inferior.",
    };
  }

  if (hasLowerBack) {
    return {
      contraindicatedPatterns: ["hinge"],
      excludeJoints: ["lower_back"],
      excludeMuscles: ["spinal_erectors"],
      recommendedPatterns: [
        "core_anti_extension",
        "lunge",
        "knee_flexion",
        "knee_extension",
      ],
      clinicalReason:
        "Molestia o sobrecarga axial lumbar. Se vetan cargas axiales y bisagras pesadas. Se prioriza estabilidad de core neutro y trabajo unilateral de piernas.",
    };
  }

  if (hasKnee) {
    return {
      contraindicatedPatterns: ["knee_extension", "lunge"],
      excludeJoints: ["knee"],
      excludeMuscles: ["quadriceps"],
      recommendedPatterns: ["hinge", "hip_extension", "core_flexion"],
      clinicalReason:
        "Molestia rotuliana. Se reduce la flexión profunda de rodilla con carga anterior. Se prioriza cadena posterior y core.",
    };
  }

  return {
    contraindicatedPatterns: [],
    excludeJoints: [],
    excludeMuscles: [],
    recommendedPatterns: ["core_flexion", "core_anti_extension"],
    clinicalReason: "Adaptación general por fatiga autoreportada.",
  };
}

/**
 * Words that make a sentence a report of trouble rather than a training wish.
 *
 * `evaluateBiomechanicsAndFatigue` keys on area names ("pecho", "hombro"), which
 * is right for the model's `painOrFatigueAreas` argument — the app only calls it
 * there when the model is already reporting pain — but wrong for a free-text
 * request: «hoy quiero entrenar pecho» contains "pecho" and was read as a sore
 * chest, so the app vetoed exactly the day the owner asked for (measured
 * 2026-10-30). Requiring a trouble word first fixes it without weakening the
 * real case: «pecho, pero los hombros están cansados» still vetoes pressing.
 */
const PAIN_WORDS =
  /dolor|duele|molest|agujeta|fatigad|cansad|sobrecarg|lesi[oó]n|sore|pain|tired|injured/;

/**
 * Patterns today's request forbids, derived from its own words.
 *
 * Empty when the sentence is about training and not about trouble, which is the
 * common case and the one that must never be vetoed by mistake. "Descansado"
 * is stripped first: it contains "cansad" and means the opposite.
 */
export function painVetoesFor(text: string): string[] {
  const cleaned = String(text ?? "")
    .toLowerCase()
    .replace(/descansad\w*/g, "");
  if (!PAIN_WORDS.test(cleaned)) return [];
  return evaluateBiomechanicsAndFatigue([cleaned]).contraindicatedPatterns;
}

/** One-shot user request (also used by the "chat to plan" mode). */
export function buildUserRequest(request: string, contextCsv: string): string {
  return [
    "Context table (CSV-like):",
    contextCsv,
    "",
    "Request:",
    request,
  ].join("\n");
}

