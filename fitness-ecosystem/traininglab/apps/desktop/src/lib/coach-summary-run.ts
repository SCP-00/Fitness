/**
 * The weekly summary, when there is a model to say it (T07.5).
 *
 * The card the owner already has is deterministic: `coachWeeklySummary` counts
 * the closed sessions and the working sets, and the card prints those numbers.
 * That card is the product. This module is the optional sentence printed above
 * it, written by the same local model the coach uses — and it is allowed to
 * fail in every way a local server can fail, because the card underneath never
 * depends on it.
 *
 * Two rules shape the contract:
 *
 *   * **Counts only.** The model receives the five fields of the summary that
 *     are numbers and dates. `sessionIds` and `setIds` never leave the app, so
 *     the prompt cannot quote an individual record even if one were asked for,
 *     and the summary is impossible to use as a channel into the log.
 *   * **Every non-answer is a named non-answer.** Cancelled by the owner, timed
 *     out, server unreachable, HTTP failure, or a reply with no text all come
 *     back as their own status with `fallback: true`. The caller keeps the
 *     deterministic card and says nothing it does not know; a blank or partial
 *     sentence is never shown as a summary.
 *
 * The transport is the existing one (`lib/llm.ts`), reused rather than
 * re-implemented: it already owns the timeout, the caller's `AbortSignal`, the
 * chat-template thinking hint and the retry that hint needs. No tools are
 * offered and none are executed — this request can only answer with prose.
 *
 * Runs inside the shared inference queue as a `summary` job (T07.4), so it must
 * honour the signal it is given and settle promptly when aborted.
 *
 * @module lib/coach-summary-run
 */

import { chatWithTools } from "./llm";
import type { LlmSettings } from "./types";

/**
 * The counts a weekly summary may quote — exactly the numeric half of
 * `CoachWeeklySummary`, with the id lists deliberately left out.
 */
export interface CoachSummaryCounts {
  /** First local day of the period, `YYYY-MM-DD` — included. */
  from: string;
  /** Last local day of the period, `YYYY-MM-DD` — included. */
  to: string;
  /** Sessions whose local close day falls inside the period. */
  closedSessions: number;
  /** Working sets inside those sessions, warm-ups excluded. */
  workingSets: number;
  /** Warm-up ramp sets, listed by the card but not counted as work. */
  warmupSets: number;
}

export interface CoachSummaryRunInput {
  /** The counts `coachWeeklySummary` produced — never the sets themselves. */
  counts: CoachSummaryCounts;
  /** The language the app is drawing in; the answer is written in it. */
  language: "en" | "es";
  /** The local server settings the coach already uses. */
  settings: LlmSettings;
  /** The queue's stop, or the screen's «parar». Aborting ends the request. */
  signal?: AbortSignal;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * How the optional sentence ended.
 *
 * Every value except `ready` means "keep the deterministic card": the status is
 * the reason the card is the only thing on screen, and it is named so the view
 * can stay silent (or say "sin conexión") without guessing from a string.
 */
export type CoachSummaryStatus =
  | "ready"
  | "cancelled"
  | "timeout"
  | "offline"
  | "empty"
  | "failed";

export interface CoachSummaryResult {
  /** The sentence to show. Always `""` unless `status` is `ready`. */
  text: string;
  status: CoachSummaryStatus;
  /**
   * True whenever the deterministic card must stay. Redundant with
   * `status !== "ready"` on purpose: the caller should not have to re-derive
   * the rule that a fallback is not an error.
   */
  fallback: boolean;
  /**
   * Safe diagnostic for the local log: the transport's message, never the
   * prompt, the counts or the model's output. Absent when `status` is `ready`.
   */
  error?: string;
  /** Wall-clock of the whole request, for the local timing log. */
  durationMs: number;
}

/**
 * Ceiling on the sentence, in characters. The prompt asks for two sentences
 * (~60 words); this is the backstop for a model that ignores it, so a summary
 * can never push the deterministic card off the screen.
 */
const MAX_SUMMARY_CHARS = 480;
/** Don't cut a "sentence" shorter than this; fall back to a word boundary. */
const MIN_SENTENCE_CHARS = 120;

/**
 * The transport's own words for a timeout, from `lib/llm.ts`. Duplicated
 * because that module is outside this card's file scope; if the wording there
 * changes, a timeout degrades to `failed`, which still keeps the card.
 */
const TIMEOUT_ERROR = "local model timed out";

/**
 * Ask the local model for the optional weekly sentence.
 *
 * Never throws and never rejects: a transport failure is a result, because the
 * caller's job is to keep showing the deterministic card either way.
 */
export async function runCoachSummary(
  input: CoachSummaryRunInput,
): Promise<CoachSummaryResult> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const result = (
    status: CoachSummaryStatus,
    text = "",
    error?: string,
  ): CoachSummaryResult => ({
    text,
    status,
    fallback: status !== "ready",
    ...(error ? { error } : {}),
    durationMs: elapsed(),
  });

  /* A stop that already happened sends nothing — same rule as the coach. */
  if (input.signal?.aborted) return result("cancelled");

  const reply = await chatWithTools({
    settings: input.settings,
    messages: buildSummaryMessages(input.counts, input.language),
    // No tools: this request can only answer with text, and a model that emits
    // a tool call anyway gets the refusal below instead of an action.
    tools: [],
    execute: () => ({ error: "this request has no tools" }),
    maxSteps: 0,
    fetchImpl: input.fetchImpl,
    signal: input.signal,
  });

  if (reply.cancelled) return result("cancelled");

  if (!reply.ok) {
    const error = reply.error ?? "the local server gave no reason";
    return result(classifyFailure(error), "", error);
  }

  const text = tidySummary(reply.content);
  if (text === "") return result("empty");
  return result("ready", text);
}

/**
 * Why a failed request failed, as far as the transport can tell.
 *
 * "The owner stopped it" is already handled above. A timeout is the transport's
 * own message; a server that answered with a status or a broken body did reach
 * the app, which is a different fact from a port nobody is listening on.
 */
function classifyFailure(error: string): CoachSummaryStatus {
  if (error === TIMEOUT_ERROR) return "timeout";
  const serverAnswered =
    error.startsWith("local server answered") ||
    error.startsWith("unexpected response shape") ||
    error.startsWith("the model ") ||
    error === "fetch is unavailable in this environment";
  return serverAnswered ? "failed" : "offline";
}

/** The two messages of the request: rules first, then the counts. */
function buildSummaryMessages(
  counts: CoachSummaryCounts,
  language: "en" | "es",
): { role: "system" | "user"; content: string }[] {
  const es = language === "es";
  const system = es
    ? [
        "Eres el resumen semanal de TrainingLab, una aplicación de entrenamiento 100 % local.",
        "Recibes únicamente recuentos que la propia aplicación ya calculó: no tienes herramientas, no puedes consultar el registro y no debes pedir más datos.",
        "Escribe en español un solo párrafo de dos frases como máximo (60 palabras), en segunda persona y en tono neutro.",
        "No inventes ninguna cifra, ejercicio, sesión ni fecha que no aparezca en los recuentos.",
        "No des consejo médico ni prometas resultados. No uses listas, Markdown ni emojis.",
        "Si no hubo sesiones, dilo con naturalidad y sin dramatizar.",
      ].join(" ")
    : [
        "You are the weekly summary of TrainingLab, a 100 % local training app.",
        "You receive only counts the app has already calculated: you have no tools, you cannot read the log, and you must not ask for more data.",
        "Write one paragraph of at most two sentences (60 words), in the second person and in a neutral tone.",
        "Do not invent any number, exercise, session or date that is not in the counts.",
        "Give no medical advice and promise no outcomes. Do not use lists, Markdown or emojis.",
        "If there were no sessions, say so plainly without dramatising.",
      ].join(" ");

  const user = es
    ? [
        `Periodo: ${counts.from} a ${counts.to} (días locales, ambos incluidos).`,
        `Sesiones cerradas: ${counts.closedSessions}`,
        `Series de trabajo: ${counts.workingSets}`,
        `Series de calentamiento: ${counts.warmupSets}`,
        "",
        "Escribe el resumen de la semana.",
      ].join("\n")
    : [
        `Period: ${counts.from} to ${counts.to} (local days, both included).`,
        `Closed sessions: ${counts.closedSessions}`,
        `Working sets: ${counts.workingSets}`,
        `Warm-up sets: ${counts.warmupSets}`,
        "",
        "Write the summary of the week.",
      ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * One paragraph, with no wrapping quotes and under the ceiling.
 *
 * A local model answers with newlines, a bullet list or a pair of quotes often
 * enough that showing its text verbatim would break the card layout. Joining
 * the whitespace keeps the words and discards the formatting it was told not to
 * use; the length cut is the last resort, applied at a sentence or word edge so
 * the sentence never ends mid-word.
 */
function tidySummary(raw: string): string {
  let text = String(raw ?? "").replace(/\s+/g, " ").trim();
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text.replace(/^["'«»“”]+|["'«»“”]+$/g, "").trim();
  }
  if (text.length <= MAX_SUMMARY_CHARS) return text;

  const window = text.slice(0, MAX_SUMMARY_CHARS);
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  if (sentenceEnd >= MIN_SENTENCE_CHARS) return window.slice(0, sentenceEnd + 1);
  const space = window.lastIndexOf(" ");
  return `${window.slice(0, space > 0 ? space : MAX_SUMMARY_CHARS).trimEnd()}…`;
}
