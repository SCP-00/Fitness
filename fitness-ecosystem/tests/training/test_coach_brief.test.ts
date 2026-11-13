/**
 * The coach contract: the brief an agent receives, and the parser that takes
 * its answer back.
 *
 * Why this file exists (2026-10-24): the app now has **three transports for one
 * question** — the local model in Ajustes, a human pasting a JSON, and an agent
 * over MCP (`propose_plan`). Nothing stops them from drifting except the fact
 * that all three end in `validateProposal`. The brief is the half nobody
 * validated: a model refused for a rule it was never told is a bug in the
 * brief, and the parser is the half that could quietly become a second, weaker
 * rule set.
 *
 * So the promises here are the ones that keep the seam honest:
 *
 *   1. **the brief states the rules, in the app's numbers** — the budget it
 *      prints is the budget `validateProposal` enforces;
 *   2. **the brief carries the contract verbatim** — the JSON shape in the text
 *      is the shape `validateProposal` reads;
 *   3. **the brief only promises MCP when MCP exists** — a browser build has no
 *      inbox file, and telling an agent to "send `propose_plan`" there would be
 *      a fake affordance;
 *   4. **the parser is tolerant about packaging and strict about content** — a
 *      fence, a sentence before the JSON, a `{proposal:{…}}` wrapper are all the
 *      same answer; an array or an object without `slots` is not;
 *   5. **an empty `slots` array is a legal answer** — it is the model refusing,
 *      and the app keeps the deterministic plan.
 */

import { describe, expect, it } from "vitest";
import {
  buildCoachBrief,
  parseCoachAnswer,
} from "../../traininglab/apps/desktop/src/lib/coach-brief";
import { validateProposal } from "../../traininglab/apps/desktop/src/lib/llm";

const BASE = {
  contextCsv: "day,2026-10-24\ngear_profile,casa\n",
  slots: [
    {
      exerciseId: "pull-ups",
      sets: 4,
      repsMin: 6,
      repsMax: 10,
      restSec: 120,
    },
  ],
  usableIds: ["pull-ups", "dips", "goblet-squat", "push-ups"],
  timeBudgetMin: 75,
  language: "es",
  mcpReachable: true,
};

describe("coach brief: it asks the question the app will judge", () => {
  it("prints the budget the validator enforces", () => {
    const brief = buildCoachBrief(BASE);
    expect(brief).toContain("75 min");
    // The number in the text and the number in the rules are one value.
    expect(brief).toContain("10 %");
  });

  it("states the three rules a proposal actually fails on", () => {
    const brief = buildCoachBrief(BASE);
    expect(brief).toContain("ids disponibles");
    expect(brief.toLowerCase()).toContain("una familia muscular principal");
    expect(brief.toLowerCase()).toContain("recuperándose");
  });

  it("carries the contract the validator reads, key for key", () => {
    const brief = buildCoachBrief(BASE);
    for (const key of [
      "exerciseId",
      "sets",
      "repsMin",
      "repsMax",
      "restSec",
      "slots",
      "summary",
    ]) {
      expect(brief).toContain(key);
    }
  });

  it("lists every usable id, so nothing legal is hidden from the model", () => {
    const brief = buildCoachBrief(BASE);
    for (const id of BASE.usableIds) expect(brief).toContain(id);
  });

  it("includes the same context CSV the local coach receives", () => {
    const brief = buildCoachBrief(BASE);
    expect(brief).toContain("gear_profile,casa");
    expect(brief).toContain("```csv");
  });

  it("names the deterministic plan it is replacing", () => {
    const brief = buildCoachBrief(BASE);
    expect(brief).toContain("pull-ups — 4×6-10");
  });

  it("says there is no plan instead of printing an empty list", () => {
    const brief = buildCoachBrief({ ...BASE, slots: [] });
    expect(brief).toContain("sin sesión planificada hoy");
  });

  it("only promises MCP where an inbox exists", () => {
    expect(buildCoachBrief(BASE)).toContain("propose_session");
    const browser = buildCoachBrief({ ...BASE, mcpReachable: false });
    expect(browser).not.toContain("propose_session");
    expect(browser).not.toContain("read_current_state");
  });

  it("names the tool the agent has, not the app's internal action id", () => {
    // `propose_plan` is the action the store handles; an agent told to call it
    // by that name finds no such tool. The brief must say `propose_session`.
    const brief = buildCoachBrief(BASE);
    expect(brief).not.toContain("propose_plan");
    expect(brief).toContain("exercise_id");
    expect(brief).toContain("exerciseId");
  });

  it("answers in the language the app is drawing in", () => {
    const en = buildCoachBrief({ ...BASE, language: "en" });
    expect(en).toContain("# Brief: today's session");
    expect(en).toContain("## Hard rules");
    expect(en).not.toContain("Reglas duras");
  });

  it("tells the model that a refusal is a valid answer", () => {
    const brief = buildCoachBrief(BASE);
    expect(brief).toContain("slots");
    expect(brief.toLowerCase()).toContain("plan determinista");
  });
});

describe("coach answer: tolerant about packaging, strict about content", () => {
  const answer = { summary: "Sesión corta", slots: [] };

  it("reads a bare object", () => {
    const parsed = parseCoachAnswer(JSON.stringify(answer));
    expect(parsed.ok).toBe(true);
  });

  it("reads a fenced block", () => {
    const parsed = parseCoachAnswer(
      "```json\n" + JSON.stringify(answer) + "\n```",
    );
    expect(parsed.ok).toBe(true);
  });

  it("reads JSON surrounded by a sentence", () => {
    const parsed = parseCoachAnswer(
      `Aquí tienes la sesión:\n${JSON.stringify(answer)}\n¿Algo más?`,
    );
    expect(parsed.ok).toBe(true);
  });

  it("unwraps a {proposal:{…}} envelope instead of refusing a correct session", () => {
    const parsed = parseCoachAnswer(
      JSON.stringify({ proposal: { summary: "x", slots: [] } }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(Array.isArray(parsed.value.slots)).toBe(true);
  });

  it("refuses empty input", () => {
    const parsed = parseCoachAnswer("   ");
    expect(parsed).toEqual({ ok: false, reason: "no_json" });
  });

  it("refuses broken JSON", () => {
    const parsed = parseCoachAnswer('{ "slots": [ ');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe("bad_json");
  });

  it("refuses an array", () => {
    const parsed = parseCoachAnswer("[1,2,3]");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe("not_an_object");
  });

  it("refuses an object with no slots", () => {
    const parsed = parseCoachAnswer('{"summary":"hola"}');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason).toBe("no_slots");
  });

  it("accepts an empty slots array: that is the model declining", () => {
    const parsed = parseCoachAnswer('{"summary":"no puedo","slots":[]}');
    expect(parsed.ok).toBe(true);
  });

  it("does not re-judge anything: the object arrives untouched", () => {
    const raw = { summary: "s", slots: [{ exerciseId: "inventado" }] };
    const parsed = parseCoachAnswer(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    // `validateProposal` must be the only judge, so the parser keeps the slot.
    if (parsed.ok) expect(parsed.value).toEqual(raw);
  });
});

describe("the seam: a parsed answer is judged by the app's own rules", () => {
  const ctx = {
    usableIds: new Set(["pull-ups", "dips", "goblet-squat", "push-ups"]),
    timeBudgetMin: 75,
    primaryFamilyOf: (id: string) =>
      ({
        "pull-ups": "lats",
        dips: "triceps",
        "goblet-squat": "quadriceps",
        "push-ups": "chest",
      })[id] ?? id,
    setupMinOf: () => 1,
  };

  it("accepts the answer a good agent gives", () => {
    const parsed = parseCoachAnswer(
      JSON.stringify({
        summary: "Tirón y pierna",
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
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const check = validateProposal(parsed.value, ctx);
    expect(check.ok).toBe(true);
    expect(check.slots).toHaveLength(2);
    expect(check.estimatedMinutes).toBeLessThanOrEqual(75 * 1.1);
  });

  it("rejects an invented exercise the parser happily read", () => {
    const parsed = parseCoachAnswer(
      JSON.stringify({
        slots: [
          {
            exerciseId: "barbell-squat",
            sets: 3,
            repsMin: 5,
            repsMax: 8,
            restSec: 180,
          },
        ],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const check = validateProposal(parsed.value, ctx);
    expect(check.ok).toBe(false);
    expect(check.errors.join(" ")).toContain("not available");
  });

  it("treats an empty proposal as a refusal, not as a session", () => {
    const parsed = parseCoachAnswer('{"summary":"descanso","slots":[]}');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const check = validateProposal(parsed.value, ctx);
    expect(check.ok).toBe(false);
    expect(check.errors.length).toBeGreaterThan(0);
  });
});
