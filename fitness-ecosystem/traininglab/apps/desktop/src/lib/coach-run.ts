/**
 * The local coach, in two phases — because one phase does not work.
 *
 * Measured on the owner's Qwen3.5-4B (llama.cpp, :9931, 16k ctx, 2026-10-30):
 * a single conversation with the explore tools and `propose_session` in the
 * same list never produced a session. The model called `get_context`,
 * `get_deterministic_plan`, `report_fatigue_and_query_safe` and
 * `list_available_exercises` twice, hit the step cap or the token cap, and
 * answered nothing. Forcing `tool_choice: {type:"function"}` was accepted by
 * the server and ignored by the model; narrowing the tool list made it call
 * the removed tool by name anyway (llama.cpp does not validate the emitted
 * name against the offered list).
 *
 * What it *does* obey is a narrow question: given the facts and one tool, it
 * proposes a session in one step (302 tokens). So the run is split:
 *
 *   1. **Explore** — read-only tools, hard step cap. Never allowed to apply
 *      anything.
 *   2. **Commit** — a fresh request whose only tool is `propose_session`, whose
 *      context is the same CSV the deterministic planner uses plus a compact
 *      digest of what phase 1 learned. A rejection from `validateProposal` is
 *      fed back verbatim for a second (and last) attempt.
 *
 * The validator still disposes: nothing reaches the screen except through
 * `execute("propose_session", …)`, which the store implements with the same
 * `applyCoachProposal` the MCP path and the pasted answer use.
 *
 * @module lib/coach-run
 */

import {
  buildSystemPrompt,
  buildUserRequest,
  CANCELLED_ERROR,
  chatWithTools,
  type ChatMessage,
  type ChatWithToolsResult,
  type ToolExecutor,
  type ToolSpec,
} from "./llm";
import type { LlmSettings } from "./types";

/** The only ending the app accepts. */
export const FINAL_TOOL = "propose_session";

export interface CoachRunInput {
  settings: LlmSettings;
  /** What the owner typed ("hoy quiero pecho, hombros cansados, 45 min"). */
  request: string;
  /** The same CSV the deterministic plan and the MCP brief are built from. */
  contextCsv: string;
  /** `TOOL_SPECS`, including the terminal tool. */
  tools: ToolSpec[];
  /** Runs one tool call. `propose_session` must be handled here. */
  execute: ToolExecutor;
  /**
   * Families the day is focused on: they may appear twice, everything else
   * once. The app passes the same list the planner is using (2026-10-30).
   */
  focusFamilies?: string[];
  /**
   * Movement patterns the day forbids because the owner reported pain.
   *
   * Derived by the APP from the request text (`evaluateBiomechanicsAndFatigue`),
   * not from the model volunteering a pain report: measured on Qwen3.5-4B, it
   * called `report_fatigue_and_query_safe` in only one of two runs for the exact
   * same request, so a veto that depended on it could vanish (2026-10-30).
   */
  vetoedPatterns?: string[];
  /**
   * Every id the gear allows, with the primary family the validator will use
   * to enforce "one family per session". Both come from the same planner row,
   * so the model and the rule cannot disagree about what an exercise trains —
   * a flat id list made the 4B model propose two chest movements and get
   * rejected twice for a rule it had no way to check (2026-10-30).
   */
  usable: { id: string; family: string; pattern?: string }[];
  /** Explore round-trips before committing (default 3). */
  exploreSteps?: number;
  /** Commit attempts, i.e. how many times a rejection is fed back (default 3). */
  commitRounds?: number;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /**
   * Caller-owned cancellation (the screen's «parar» control). Aborting it ends
   * the run at the next boundary — before the commit request, between rounds,
   * or before a tool result could be applied — and never applies a proposal.
   */
  signal?: AbortSignal;
}

export interface CoachRunResult {
  ok: boolean;
  content: string;
  toolCalls: { name: string; args: Record<string, unknown> }[];
  /** Validator messages of the last rejection (translated at the view edge). */
  errors: string[];
  /** Present only when a proposal survived the hard rules. */
  applied: { slots: number; minutes: number; summary: string } | null;
  /**
   * True when `signal` ended the run. `applied` is null and `errors` holds the
   * single `CANCELLED_ERROR`, so the view says "cancelado" instead of showing
   * a rule rejection; the deterministic plan was never touched.
   */
  cancelled: boolean;
  /**
   * Where the wall-clock went. Measured because a 4B model on a laptop can
   * spend minutes in prompt processing: with the whole 74-exercise list in the
   * commit prompt one run took 245 s and timed out (2026-10-30).
   */
  timings: { exploreMs: number; commitMs: number };
}

/** The app's verdict on a proposal, as `execute` returns it. */
interface ProposalVerdict {
  accepted?: boolean;
  errors?: string[];
  slots?: number;
  /**
   * The store returns `estimatedMinutes` (the validator's name); `minutes` is
   * kept for callers that already shorten it. Reading only `minutes` made every
   * accepted proposal report 0 min, which the benchmark surfaced (2026-11-21).
   */
  estimatedMinutes?: number;
  minutes?: number;
}

/** Ceiling on the digest, in characters — the model has 16k tokens, not more. */
const DIGEST_LIMIT = 3800;
/**
 * How many exercise ids the commit prompt lists.
 *
 * All 74 cost real seconds: a measured commit spent ~50 s per attempt with the
 * full list and dropped to a fraction of that once it was trimmed (2026-10-30).
 * 32 is enough to answer "what else fits" while leaving room for the rules.
 */
const USABLE_LIMIT = 32;
/** Characters kept from each tool note (a phase-1 answer can be 4 kB of JSON). */
const NOTE_LIMIT = 500;

/**
 * Run both phases and return what the screen shows.
 *
 * Never throws: a transport failure comes back as `ok:false` with the reason,
 * so the deterministic session stays exactly as it was.
 */
export async function runCoach(input: CoachRunInput): Promise<CoachRunResult> {
  const terminal = input.tools.find((t) => t.function.name === FINAL_TOOL);
  if (!terminal) {
    return {
      ok: false,
      content: "",
      toolCalls: [],
      errors: [`the app is missing its ${FINAL_TOOL} tool`],
      applied: null,
      cancelled: false,
      timings: { exploreMs: 0, commitMs: 0 },
    };
  }

  const signal = input.signal;
  const stopped = (
    toolCalls: { name: string; args: Record<string, unknown> }[],
    content: string,
    timings: { exploreMs: number; commitMs: number },
  ): CoachRunResult => ({
    ok: false,
    content,
    toolCalls,
    errors: [CANCELLED_ERROR],
    applied: null,
    cancelled: true,
    timings,
  });

  /* Cancelled before the first request: nothing is sent and nothing applies. */
  if (signal?.aborted) return stopped([], "", { exploreMs: 0, commitMs: 0 });

  const readOnly = input.tools.filter((t) => t.function.name !== FINAL_TOOL);
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildUserRequest(input.request, input.contextCsv) },
  ];

  const startedExplore = Date.now();
  const explore = await chatWithTools({
    settings: input.settings,
    messages,
    tools: readOnly,
    execute: async (name, args) => {
      // Belt and braces: the terminal tool is not offered in this phase, but a
      // model can emit any name it likes. Applying a session during
      // exploration is exactly the discrepancy this module exists to prevent.
      if (name === FINAL_TOOL) {
        return { error: `${FINAL_TOOL} is not available while gathering context` };
      }
      return input.execute(name, args);
    },
    maxSteps: Math.max(0, input.exploreSteps ?? 3),
    fetchImpl: input.fetchImpl,
    signal,
  });

  const exploreMs = Date.now() - startedExplore;
  const toolCalls: { name: string; args: Record<string, unknown> }[] = [
    ...explore.toolCalls,
  ];
  /*
   * A cancelled exploration is not a failed one: phase 2 is never attempted,
   * because committing a session after the owner pressed stop would be the
   * exact thing the stop meant to prevent.
   */
  if (explore.cancelled) {
    return stopped(toolCalls, explore.content, { exploreMs, commitMs: 0 });
  }

  /*
   * A step-cap ending is fine: phase 1 gathered what it could and phase 2 asks
   * the narrow question anyway. Any other error (no server, timeout, HTTP
   * status) would fail phase 2 identically, so it is reported as it is.
   */
  if (explore.error && !explore.error.startsWith("the model exceeded")) {
    return {
      ok: false,
      content: explore.content,
      toolCalls,
      errors: [explore.error],
      applied: null,
      cancelled: false,
      timings: { exploreMs, commitMs: 0 },
    };
  }

  const digest = buildDigest(
    input.contextCsv,
    input.usable,
    explore.toolCalls,
    input.vetoedPatterns ?? [],
    input.focusFamilies ?? [],
  );
  let rejection: string[] = [];
  /** Extra, model-facing diagnosis derived from the rejected proposal itself. */
  let hints: string[] = [];
  let lastContent = "";
  const startedCommit = Date.now();
  const commitMsOf = () => Date.now() - startedCommit;

  for (let round = 0; round < Math.max(1, input.commitRounds ?? 3); round++) {
    /* No second attempt, no third: a cancelled run stops asking. */
    if (signal?.aborted) {
      return stopped(toolCalls, lastContent, {
        exploreMs,
        commitMs: commitMsOf(),
      });
    }
    let verdict: ProposalVerdict | null = null;
    const commit = await chatWithTools({
      settings: input.settings,
      messages: commitMessages(input.request, digest, [...hints, ...rejection]),
      tools: [terminal],
      execute: async (name, args) => {
        /*
         * The last line of defence, and the one the screen depends on: a
         * response that was already generating when the owner pressed stop can
         * still arrive with a perfect `propose_session`. It is read (so the
         * model is not lied to) but it is NOT applied — the store's executor is
         * what writes the plan, so refusing to call it is refusing the change.
         */
        if (signal?.aborted) {
          return { error: CANCELLED_ERROR, cancelled: true };
        }
        const out = await input.execute(name, args);
        if (name === FINAL_TOOL) verdict = out as ProposalVerdict;
        return out;
      },
      maxSteps: 0,
      finalTool: FINAL_TOOL,
      finalAfter: 0,
      fetchImpl: input.fetchImpl,
      signal,
    });
    toolCalls.push(...commit.toolCalls);
    lastContent = commit.content || lastContent;
    if (commit.cancelled) {
      return stopped(toolCalls, lastContent, {
        exploreMs,
        commitMs: commitMsOf(),
      });
    }

    const proposed = commit.toolCalls.some((c) => c.name === FINAL_TOOL);
    if (!proposed) {
      return {
        ok: false,
        content: lastContent,
        toolCalls,
        errors: [commit.error ?? `the model answered without calling ${FINAL_TOOL}`],
        applied: null,
        cancelled: false,
        timings: { exploreMs, commitMs: commitMsOf() },
      };
    }
    if (verdict && (verdict as ProposalVerdict).accepted) {
      const v = verdict as ProposalVerdict;
      const accepted = commit.toolCalls.find((c) => c.name === FINAL_TOOL);
      const summary =
        typeof accepted?.args["summary"] === "string"
          ? (accepted.args["summary"] as string)
          : "";
      return {
        ok: true,
        content: lastContent,
        toolCalls,
        errors: [],
        applied: {
          slots: v.slots ?? 0,
          minutes: v.estimatedMinutes ?? v.minutes ?? 0,
          summary,
        },
        cancelled: false,
        timings: { exploreMs, commitMs: commitMsOf() },
      };
    }
    rejection = (verdict as ProposalVerdict | null)?.errors ?? [];
    const focus = input.focusFamilies ?? [];
    /*
     * "repeats the chest work already programmed today" is true but it does not
     * tell a 4B model WHICH two slots collide, and it re-proposed the same pair
     * twice (measured). Naming them is the whole fix.
     */
    const duplicate = duplicateFamilyHint(
      commit.toolCalls.find((c) => c.name === FINAL_TOOL)?.args,
      input.usable,
      focus,
    );
    if (duplicate) hints = [duplicate];
  }

  return {
    ok: false,
    content: lastContent,
    toolCalls,
    errors: rejection,
    applied: null,
    cancelled: false,
    timings: { exploreMs, commitMs: commitMsOf() },
  };
}

/**
 * Which slots of a rejected proposal share a primary family, in words the model
 * can act on: `chest appears twice (dumbbell-floor-press, band-chest-press) —
 * keep exactly one of them`.
 */
function duplicateFamilyHint(
  args: Record<string, unknown> | undefined,
  usable: { id: string; family: string }[],
  focusFamilies: string[] = [],
): string | null {
  const slots = Array.isArray(args?.["slots"])
    ? (args?.["slots"] as { exerciseId?: unknown }[])
    : [];
  const byFamily = new Map<string, string[]>();
  for (const slot of slots) {
    const id = typeof slot?.exerciseId === "string" ? slot.exerciseId : "";
    const family = usable.find((u) => u.id === id)?.family;
    if (!id || !family) continue;
    const list = byFamily.get(family) ?? [];
    list.push(id);
    byFamily.set(family, list);
  }
  // A focused family is allowed two; every other family one.
  const clashes = [...byFamily.entries()].filter(
    ([family, ids]) => ids.length > (focusFamilies.includes(family) ? 2 : 1),
  );
  if (clashes.length === 0) return null;
  return clashes
    .map(([family, ids]) => {
      const cap = focusFamilies.includes(family) ? 2 : 1;
      return `family ${family} appears ${ids.length} times (${ids.join(", ")}) — keep at most ${cap} of them and fill the rest with other families`;
    })
    .join("; ");
}

/** System + user of the commit request: one question, one tool. */
function commitMessages(
  request: string,
  digest: string,
  rejection: string[],
): ChatMessage[] {
  const system = buildSystemPrompt(
    [
      "This is the final step: answer with ONE propose_session tool call.",
      "Do not ask questions, do not answer in prose, do not use any other tool.",
      "Only ids present in usable_exercises are accepted.",
      // The rule the 4B model kept breaking, stated where it can check it.
      "One exercise per primary family, EXCEPT a family listed in focus_families,",
      "which may appear twice — never three times. Never repeat a movement pattern",
      "(third column of usable_exercises) unless it is the second slot of that focused",
      "family, where one repeat is allowed.",
      "Never program an exercise whose pattern is listed in vetoed_patterns: the app rejects the whole proposal.",
      // The contradiction a real request produces: "hoy pecho" + sore shoulders.
      "If what the user asked for is itself vetoed, say it plainly in summary and",
      "program only allowed families — a shorter legal session beats one the app rejects.",
    ].join(" "),
  );
  const lines = [
    "Context table (CSV-like):",
    digest,
    "",
    "Request:",
    request,
  ];
  if (rejection.length > 0) {
    lines.push(
      "",
      "The app REJECTED your previous proposal for these reasons:",
      ...rejection.map((e) => `- ${e}`),
      "Propose again, fixing exactly these and changing nothing else that passed.",
    );
  }
  return [
    { role: "system", content: system },
    { role: "user", content: lines.join("\n") },
  ];
}

/**
 * The facts the commit phase needs, in the smallest form that is still honest:
 * the planner's own CSV, the ids the gear allows, and what phase 1 actually
 * came back with (a pain report is worthless if the model cannot see it).
 */
function buildDigest(
  contextCsv: string,
  usable: { id: string; family: string; pattern?: string }[],
  calls: ChatWithToolsResult["toolCalls"],
  vetoedPatterns: string[],
  focusFamilies: string[],
): string {
  const notes = calls
    .filter((c) => c.result !== undefined)
    .map((c) => `## ${c.name}\n${stringify(c.result).slice(0, NOTE_LIMIT)}`)
    .join("\n");

  /*
   * Order matters more than length: the focused families first, then whatever
   * the deterministic plan already picked, then the rest. A model that gets a
   * truncated list still sees the exercises its answer depends on.
   */
  const planIds = new Set(
    contextCsv
      .split("\n")
      .filter((line) => line.startsWith("deterministic_plan,"))
      .flatMap((line) => line.replace("deterministic_plan,", "").split("|"))
      .map((row) => row.trim().split(" ")[0] ?? ""),
  );
  const ranked = [...usable].sort(
    (a, b) =>
      rank(b, planIds, focusFamilies) - rank(a, planIds, focusFamilies),
  );
  const listed = ranked.slice(0, USABLE_LIMIT);
  const out = [
    contextCsv.trim(),
    /*
     * id:primary_family:pattern — the three things the validator judges. The
     * pattern is not decoration: chest has fifteen `horizontal_push` exercises
     * and one `shoulder_extension`, so a model told only families could never
     * find the legal second chest slot (measured 2026-10-30).
     */
    `usable_exercises(id:family:pattern),${listed
      .map((u) => `${u.id}:${u.family}:${u.pattern ?? "-"}`)
      .join(";")}`,
    vetoedPatterns.length > 0
      ? `vetoed_patterns,${vetoedPatterns.join(";")}`
      : "vetoed_patterns,none",
    focusFamilies.length > 0
      ? `focus_families,${focusFamilies.join(";")}`
      : "focus_families,none",
    notes ? `\nTool notes:\n${notes}` : "",
  ]
    .filter((part) => part.length > 0)
    .join("\n");
  return out.length > DIGEST_LIMIT ? out.slice(0, DIGEST_LIMIT) : out;
}

function rank(
  entry: { id: string; family: string },
  planIds: Set<string>,
  focusFamilies: string[],
): number {
  return (
    (focusFamilies.includes(entry.family) ? 4 : 0) +
    (planIds.has(entry.id) ? 2 : 0)
  );
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}
