/**
 * The brief that lets an **agent** be TrainingLab's coach, and the parser that
 * takes its answer back.
 *
 * **2026-10-24 (connection, not a new model).** The app has had a coaching layer
 * since 2026-09-28: a local OpenAI-compatible server (`lib/llm.ts`) whose only
 * terminal tool is `propose_session`, validated before it can reach the screen.
 * The owner's direction for this round is to stop depending on a local model and
 * let **Freebuff speak MCP instead**. MCP already carries the read channels and
 * the ACTIONS channel (`docs/MCP_TOOL_SURFACE.md`), so the coach does not need a
 * second transport — it needs two things:
 *
 *   1. a **brief**: the exact request the agent has to answer, with the context
 *      the local coach would have received, and the one JSON shape the app
 *      accepts;
 *   2. a **parser**: the agent's reply, turned into the same object
 *      `validateProposal` already understands, so a proposal is validated and
 *      applied by the *same* code as the local model's.
 *
 * That is why this module is pure and i18n-free: the brief is text, the parser
 * is a few lines, and both are pinned by a root-suite test. Nothing here
 * invents an exercise, a load or a session — it only carries a question and
 * reads an answer.
 *
 * @module lib/coach-brief
 */

/** One slot of the deterministic plan, as the brief prints it. */
export interface BriefSlot {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
}

export interface CoachBriefInput {
  /** The same CSV the local coach receives (`contextCsv` in the store). */
  contextCsv: string;
  /** Today's deterministic plan, in order. */
  slots: readonly BriefSlot[];
  /** Exercise ids the planner considers usable with the owner's gear. */
  usableIds: readonly string[];
  /** The day's planning budget, in minutes (not the session's estimate). */
  timeBudgetMin: number;
  /** `es` | `en` — the language the app is drawing in. */
  language: string;
  /** `true` when the agent can reach the app through MCP (desktop). */
  mcpReachable: boolean;
}

/** The exact shape `validateProposal` accepts — printed, never re-described. */
const CONTRACT = `{
  "summary": "one or two sentences the owner will read",
  "slots": [
    {
      "exerciseId": "<id from the available list>",
      "sets": 4,
      "repsMin": 8,
      "repsMax": 12,
      "restSec": 120,
      "note": "short cue for this slot (optional)"
    }
  ]
}`;

/**
 * Build the coach's brief.
 *
 * The rules are the app's own hard rules, in the order the validation checks
 * them, because a model that is refused for a rule it was never told about is a
 * bug in the brief, not in the model.
 */
export function buildCoachBrief(input: CoachBriefInput): string {
  const es = input.language.startsWith("es");
  const plan = input.slots.length
    ? input.slots
        .map(
          (slot, i) =>
            `${i + 1}. ${slot.exerciseId} — ${slot.sets}×${slot.repsMin}-${slot.repsMax}, ${
              es ? "descanso" : "rest"
            } ${slot.restSec} s`,
        )
        .join("\n")
    : es
      ? "(sin sesión planificada hoy)"
      : "(no session planned today)";

  const lines: string[] = [];
  lines.push(
    es
      ? "# Encargo: la sesión de hoy (TrainingLab)"
      : "# Brief: today's session (TrainingLab)",
  );
  lines.push("");
  lines.push(
    es
      ? "La app ya calculó un plan determinista. Tu trabajo es proponer la sesión de HOY para las condiciones de abajo. La app — no tú — decide si tu propuesta es legal, y la aplica solo si lo es."
      : "The app has already built a deterministic plan. Your job is to propose TODAY's session for the conditions below. The app — not you — decides whether your proposal is legal, and only applies it if it is.",
  );
  lines.push("");
  lines.push(es ? "## Reglas duras" : "## Hard rules");
  const rules = es
    ? [
        "Solo ejercicios que aparezcan en «ids disponibles». Un id inventado se rechaza.",
        `El presupuesto del día es ${input.timeBudgetMin} min (se tolera un 10 %). No lo pases.`,
        "Una familia muscular principal por sesión: el segundo ejercicio de la misma familia se rechaza.",
        "Ninguna familia que esté recuperándose ni la que el dueño marque como dolorida.",
        "Antes de proponer una carga, consulta el veredicto de progresión: los kilos los decide el registro, no tu memoria.",
      ]
    : [
        "Only exercises listed under “available ids”. An invented id is rejected.",
        `The day's budget is ${input.timeBudgetMin} min (a 10 % grace applies). Do not exceed it.`,
        "One primary muscle family per session: a second exercise of the same family is rejected.",
        "No family that is still recovering, nor one the owner flagged as sore.",
        "Before proposing a load, read the progression verdict: the kilos come from the log, not from your memory.",
      ];
  for (const rule of rules) lines.push(`- ${rule}`);
  lines.push("");

  if (input.mcpReachable) {
    lines.push(es ? "## Por MCP" : "## Over MCP");
    lines.push(
      es
        ? "Si estás conectado a la app: `read_current_state`, `propose_training_session` y `read_progression` te dan el mismo contexto con números vivos. Cuando tengas la sesión, envíala con la herramienta `propose_session` (acepta `exercise_id` o `exerciseId`; la app lo valida igual). Si no tienes MCP, responde con el JSON de abajo."
        : "If you are connected to the app: `read_current_state`, `propose_training_session` and `read_progression` give you the same context with live numbers. When you have the session, send it with the `propose_session` tool (it accepts `exercise_id` or `exerciseId`; the app validates it the same way). If you have no MCP, answer with the JSON below.",
    );
    lines.push("");
  }

  lines.push(es ? "## Cómo responder" : "## How to answer");
  lines.push(
    es
      ? "Devuelve UN solo objeto JSON y nada más (sin prosa alrededor, sin bloques de código):"
      : "Return ONE JSON object and nothing else (no prose around it, no code fences):",
  );
  lines.push("");
  lines.push(CONTRACT);
  lines.push("");
  lines.push(es ? "## Contexto (CSV)" : "## Context (CSV)");
  lines.push("```csv");
  lines.push(input.contextCsv.trim());
  lines.push("```");
  lines.push("");
  lines.push(es ? "## Plan determinista de hoy" : "## Today's deterministic plan");
  lines.push(plan);
  lines.push("");
  lines.push(
    es
      ? `## ids disponibles (${input.usableIds.length})`
      : `## Available ids (${input.usableIds.length})`,
  );
  lines.push(input.usableIds.join(", "));
  lines.push("");
  lines.push(
    es
      ? "Si el contexto no permite una propuesta honesta, dilo en `summary` y deja `slots` vacío: la app mantendrá el plan determinista."
      : "If the context does not allow an honest proposal, say so in `summary` and leave `slots` empty: the app keeps the deterministic plan.",
  );
  return lines.join("\n");
}

/** Why an answer could not be read — the UI maps these to its own copy. */
export type CoachAnswerError =
  | "no_json"
  | "bad_json"
  | "not_an_object"
  | "no_slots";

export type CoachAnswer =
  /** A parsed object; `slots` may still be empty (a refusal is a valid answer). */
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: CoachAnswerError };

/**
 * Read an agent's answer. Tolerant about *packaging* (a fenced block, a
 * sentence before the JSON) and strict about *content*: the object is returned
 * untouched and `validateProposal` judges it, so this parser can never become a
 * second, weaker rule set.
 */
export function parseCoachAnswer(raw: string): CoachAnswer {
  const text = raw.trim();
  if (text === "") return { ok: false, reason: "no_json" };

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const source = fenced?.[1]?.trim() ?? text;

  // Parse the whole thing first, so `[1,2]` is reported as "not an object"
  // rather than as "no JSON there"; only then look for an object inside prose.
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    const candidate = sliceFirstObject(source);
    if (!candidate) return { ok: false, reason: "no_json" };
    try {
      parsed = JSON.parse(candidate);
    } catch {
      // A truncated answer (a cut-off paste or stream) has an opening brace and
      // no closer. It is broken JSON, not a missing answer: the copy for
      // `no_json` would send the owner looking for a JSON that is right there.
      return { ok: false, reason: "bad_json" };
    }
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "not_an_object" };
  }
  // A model that wraps its answer in `{ "proposal": { … } }` is answering the
  // same question; unwrap it rather than refusing a correct session.
  const object = parsed as Record<string, unknown>;
  const inner = object["proposal"];
  if (
    inner !== null &&
    typeof inner === "object" &&
    !Array.isArray(inner) &&
    !Array.isArray(object["slots"])
  ) {
    return { ok: true, value: inner as Record<string, unknown> };
  }
  if (!Array.isArray(object["slots"])) {
    return { ok: false, reason: "no_slots" };
  }
  return { ok: true, value: object };
}

/** The first `{` … last `}` of a slice of text, or `null`.
 *
 * With an opening brace and no closer, the tail is returned as-is: `JSON.parse`
 * then fails and the caller reports broken JSON, which is the truth for a
 * truncated answer.
 */
function sliceFirstObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  const end = text.lastIndexOf("}");
  return end > start
    ? text.slice(start, end + 1).trim()
    : text.slice(start).trim();
}
