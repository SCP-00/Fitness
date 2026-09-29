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
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export interface ChatWithToolsResult {
  ok: boolean;
  content: string;
  /** Every tool call the model made, for transparency in the UI. */
  toolCalls: { name: string; args: Record<string, unknown> }[];
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

/**
 * Run a bounded tool-calling conversation. Never throws: failures come back as
 * `{ ok: false, error }` so the caller can fall back to the deterministic plan.
 */
export async function chatWithTools(
  input: ChatWithToolsInput,
): Promise<ChatWithToolsResult> {
  const { settings, tools, execute } = input;
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  const maxSteps = input.maxSteps ?? DEFAULT_MAX_STEPS;
  const messages: ChatMessage[] = [...input.messages];
  const toolCalls: { name: string; args: Record<string, unknown> }[] = [];

  if (typeof fetchImpl !== "function") {
    return {
      ok: false,
      content: "",
      toolCalls,
      error: "fetch is unavailable in this environment",
    };
  }

  for (let step = 0; step <= maxSteps; step++) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      (settings.timeoutSec || DEFAULT_TIMEOUT_SEC) * 1000,
    );
    let payload: unknown;
    try {
      const res = await fetchImpl(chatEndpoint(settings.baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.apiKey
            ? { Authorization: `Bearer ${settings.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: settings.model || "local-model",
          messages,
          tools,
          tool_choice: "auto",
          temperature: 0.2,
          stream: false,
        }),
        signal: controller.signal,
      });
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
      return {
        ok: false,
        content: "",
        toolCalls,
        error: controller.signal.aborted ? "local model timed out" : message,
      };
    } finally {
      clearTimeout(timeout);
    }

    const message = extractMessage(payload);
    if (!message) {
      return {
        ok: false,
        content: "",
        toolCalls,
        error: "unexpected response shape from the local server",
      };
    }

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      return { ok: true, content: message.content ?? "", toolCalls };
    }

    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: calls,
    });
    for (const call of calls) {
      const args = safeJson(call.function.arguments);
      toolCalls.push({ name: call.function.name, args });
      let result: unknown;
      try {
        result = await execute(call.function.name, args);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
      }
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

function safeJson(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    return parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
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
  const seenFamilies = new Set<string>();
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
    const family = ctx.primaryFamilyOf(id);
    if (seenFamilies.has(family)) {
      errors.push(
        `"${id}" repeats the ${family} work already programmed today`,
      );
      continue;
    }
    seenFamilies.add(family);
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
export function buildSystemPrompt(): string {
  return [
    "You are the coaching layer of TrainingLab, a 100% local fitness app.",
    "You NEVER invent exercises, equipment or numbers: everything you propose must come from the tools.",
    "The deterministic planner has already built a session from real measurements; your job is to improve it",
    "for TODAY (time available, energy, motivation, soreness, equipment at hand) and to explain your choices",
    "in one short paragraph, in the language of the user (Spanish unless told otherwise).",
    "Hard rules: respect the time budget; never program equipment the user does not own; never repeat a muscle",
    "family twice in one session; leave more reps in reserve (higher RIR) when readiness is low; prefer the",
    "weakest muscle family first. Finish by calling propose_session. Be concise.",
  ].join(" ");
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
