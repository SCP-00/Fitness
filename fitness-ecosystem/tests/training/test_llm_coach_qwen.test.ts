/**
 * Qwen Coach biomechanical tool calling & fatigue resolution test suite.
 * Tests the exact scenario: upper chest / front shoulder soreness from dumbbells
 * redirected to core/abdomen and safe groups.
 *
 * @module tests/training/llm_coach_qwen
 */

import { describe, it, expect } from "vitest";
import {
  evaluateBiomechanicsAndFatigue,
  TOOL_SPECS,
  chatWithTools,
  validateProposal,
  type ChatMessage,
} from "../../traininglab/apps/desktop/src/lib/llm";
import type { LlmSettings } from "../../traininglab/apps/desktop/src/lib/types";

const SETTINGS: LlmSettings = {
  enabled: true,
  baseUrl: "http://127.0.0.1:8080/v1",
  model: "qwen3.5-4b",
  apiKey: "",
  timeoutSec: 5,
};

function fakeFetch(responses: unknown[]) {
  const calls: { url: string; body: unknown }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    const payload = responses.shift() ?? { choices: [] };
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("Qwen Coach: Biomechanical fatigue analysis", () => {
  it("diagnoses upper chest and front shoulder pain from dumbbells and contraindicates pushes", () => {
    const constraint = evaluateBiomechanicsAndFatigue([
      "me duelen los musculos que conectan el pecho superior y el hombro bajo por mancuernas",
    ]);

    expect(constraint.excludeJoints).toContain("shoulder");
    expect(constraint.excludeMuscles).toContain("chest");
    expect(constraint.excludeMuscles).toContain("deltoid_anterior");
    expect(constraint.contraindicatedPatterns).toContain("horizontal_push");
    expect(constraint.contraindicatedPatterns).toContain("vertical_push");
    expect(constraint.contraindicatedPatterns).toContain("shoulder_flexion");
    expect(constraint.recommendedPatterns).toContain("core_flexion");
    expect(constraint.recommendedPatterns).toContain("core_anti_extension");
    expect(constraint.clinicalReason).toContain("Sobrecarga o molestia en la inserción clavicular");
  });

  it("handles lumbar and knee complaints appropriately", () => {
    const lumbar = evaluateBiomechanicsAndFatigue(["dolor lumbar"]);
    expect(lumbar.contraindicatedPatterns).toContain("hinge");
    expect(lumbar.excludeJoints).toContain("lower_back");

    const knee = evaluateBiomechanicsAndFatigue(["molestia rotuliana en la rodilla"]);
    expect(knee.contraindicatedPatterns).toContain("knee_extension");
    expect(knee.excludeJoints).toContain("knee");
  });

  it("exposes report_fatigue_and_query_safe and swap_exercise_safe in TOOL_SPECS", () => {
    const names = TOOL_SPECS.map((s) => s.function.name);
    expect(names).toContain("report_fatigue_and_query_safe");
    expect(names).toContain("swap_exercise_safe");
    expect(names).toContain("propose_session");
  });

  it("runs the full multi-step tool conversation for shoulder soreness adapting to abdomen", async () => {
    const { impl, calls } = fakeFetch([
      // Step 1: Model receives user prompt and calls report_fatigue_and_query_safe
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_fatigue_1",
                  type: "function",
                  function: {
                    name: "report_fatigue_and_query_safe",
                    arguments: JSON.stringify({
                      painOrFatigueAreas: ["upper_chest", "front_shoulder"],
                      targetFocus: ["abs"],
                    }),
                  },
                },
              ],
            },
          },
        ],
      },
      // Step 2: Model receives safe exercises and calls propose_session
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_propose_1",
                  type: "function",
                  function: {
                    name: "propose_session",
                    arguments: JSON.stringify({
                      summary: "Sesión adaptada protegiendo pectoral superior y hombro anterior. Enfoque total en core.",
                      slots: [
                        {
                          exerciseId: "hanging-leg-raise",
                          sets: 4,
                          repsMin: 10,
                          repsMax: 15,
                          restSec: 90,
                          note: "Codos estables sin tracción violenta",
                        },
                        {
                          exerciseId: "plank",
                          sets: 3,
                          repsMin: 30,
                          repsMax: 60,
                          restSec: 60,
                          note: "Apoyo en antebrazos neutro",
                        },
                      ],
                    }),
                  },
                },
              ],
            },
          },
        ],
      },
      // Step 3: Model wraps up with coaching message
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: "He adaptado tu rutina para evitar cualquier torque en el pectoral superior y hombro anterior. Tu sesión de abdomen está lista.",
            },
          },
        ],
      },
    ]);

    const messages: ChatMessage[] = [
      { role: "system", content: "You are the TrainingLab coach." },
      { role: "user", content: "Me duele el hombro y pecho alto por mancuernas, solo quiero hacer abdomen." },
    ];

    const result = await chatWithTools({
      settings: SETTINGS,
      messages,
      tools: TOOL_SPECS,
      execute: (name) => {
        if (name === "report_fatigue_and_query_safe") {
          return {
            clinicalDiagnosis: "Dolor en inserción de pectoral y hombro.",
            safeExercises: [
              { id: "hanging-leg-raise", name: "Elevación de piernas colgado", pattern: "core_flexion" },
              { id: "plank", name: "Plancha frontal", pattern: "core_anti_extension" },
            ],
          };
        }
        if (name === "propose_session") {
          return { accepted: true, slots: 2, estimatedMinutes: 20 };
        }
        return {};
      },
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(result.content).toContain("adaptado tu rutina");
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0]!.name).toBe("report_fatigue_and_query_safe");
    expect(result.toolCalls[1]!.name).toBe("propose_session");

    // Validate that propose_session produced valid slots against gear
    const usableIds = new Set(["hanging-leg-raise", "plank"]);
    const proposeCall = result.toolCalls.find((tc) => tc.name === "propose_session");
    expect(proposeCall).toBeDefined();
    const check = validateProposal(proposeCall!.args, {
      usableIds,
      timeBudgetMin: 60,
      primaryFamilyOf: (id) => id,
    });
    expect(check.ok).toBe(true);
    expect(check.slots).toHaveLength(2);
  });
});
