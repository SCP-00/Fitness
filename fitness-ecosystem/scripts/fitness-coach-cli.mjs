#!/usr/bin/env node
/**
 * Fitness Coach CLI — Local LLM Bridge & Biomechanical Reasoning Engine.
 *
 * Connects external tools, subagents or terminal sessions with TrainingLab's
 * local LLM coach (Qwen3.5-4B over llama.cpp loopback) and exercise catalog.
 *
 * Usage:
 *   node scripts/fitness-coach-cli.mjs --chat "Me duelen el pecho superior y el hombro por mancuernas, solo quiero abdomen"
 *   node scripts/fitness-coach-cli.mjs --pain "upper_chest,shoulder" --focus "abs,quads"
 *   node scripts/fitness-coach-cli.mjs --dry-run --pain "upper_chest,shoulder"
 *   node scripts/fitness-coach-cli.mjs --json ...
 */

import { parseArgs } from "node:util";
import path from "node:path";
import { createServer } from "vite";

const ROOT = process.cwd();

// Parse CLI arguments
const { values } = parseArgs({
  options: {
    chat: { type: "string", short: "c" },
    pain: { type: "string", short: "p" },
    focus: { type: "string", short: "f" },
    url: { type: "string", default: "http://127.0.0.1:8080/v1" },
    model: { type: "string", default: "qwen3.5-4b" },
    json: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
\x1b[1m\x1b[38;2;255;115;0mTrainingLab Coach CLI — Biomechanical Reasoning & LLM Bridge\x1b[0m

Opciones:
  -c, --chat <texto>      Consulta en lenguaje natural al coach
  -p, --pain <zonas>      Zonas con dolor (ej. 'upper_chest,shoulder', 'lumbar', 'knee')
  -f, --focus <músculos>  Músculos que se desean priorizar (ej. 'abs', 'legs')
  --url <endpoint>        URL base de llama.cpp (default: http://127.0.0.1:8080/v1)
  --model <id>            Identificador del modelo (default: qwen3.5-4b)
  --dry-run               Ejecuta la evaluación biomecánica local sin enviar HTTP al LLM
  --json                  Muestra la salida como JSON puro
  -h, --help              Muestra esta ayuda
`);
  process.exit(0);
}

// Load Vite SSR environment to resolve @fitness/bodylab-exercises and llm.ts
const server = await createServer({
  root: ROOT,
  server: { middlewareMode: true },
  logLevel: "error",
  resolve: {
    alias: {
      "@fitness/bodylab-exercises": path.resolve(
        ROOT,
        "bodylab/core/exercises/src/index.ts",
      ),
      "@fitness/bodylab-training": path.resolve(
        ROOT,
        "bodylab/core/training/src/index.ts",
      ),
    },
  },
});

const exModule = await server.ssrLoadModule("@fitness/bodylab-exercises");
const llmModule = await server.ssrLoadModule(
  path.resolve(ROOT, "traininglab/apps/desktop/src/lib/llm.ts"),
);
await server.close();

const { ALL_EXERCISES, EXERCISE_TRAITS } = exModule;
const {
  evaluateBiomechanicsAndFatigue,
  chatWithTools,
  buildSystemPrompt,
  TOOL_SPECS,
  validateProposal,
} = llmModule;

// Determine reported issues from either --pain or --chat
const reportedIssues = [];
if (values.pain) {
  reportedIssues.push(...values.pain.split(",").map((s) => s.trim()));
}
if (values.chat) {
  reportedIssues.push(values.chat);
}
if (reportedIssues.length === 0) {
  reportedIssues.push("upper_chest", "front_shoulder");
}

const targetFocus = values.focus
  ? values.focus.split(",").map((s) => s.trim().toLowerCase())
  : ["abs"];

// Run local biomechanical evaluation
const constraint = evaluateBiomechanicsAndFatigue(reportedIssues);

const FOCUS_ALIASES = {
  abdomen: ["rectus_abdominis", "obliques", "core"],
  abs: ["rectus_abdominis", "obliques", "core"],
  abdominales: ["rectus_abdominis", "obliques", "core"],
  core: ["rectus_abdominis", "obliques", "core"],
  piernas: ["quadriceps", "hamstrings", "gluteus", "calves", "squat", "lunge"],
  legs: ["quadriceps", "hamstrings", "gluteus", "calves", "squat", "lunge"],
  espalda: ["lats", "traps", "rhomboids", "pull"],
  back: ["lats", "traps", "rhomboids", "pull"],
};

// Filter safe exercises from catalog
const safeExercises = ALL_EXERCISES.filter((ex) => {
  const traits = EXERCISE_TRAITS[ex.id];
  if (!traits) return false;
  if (constraint.contraindicatedPatterns.includes(traits.pattern)) return false;
  if (
    constraint.excludeJoints.includes("shoulder") &&
    [
      "horizontal_push",
      "vertical_push",
      "shoulder_flexion",
      "shoulder_abduction",
    ].includes(traits.pattern)
  ) {
    return false;
  }
  if (targetFocus.length > 0) {
    const expandedTerms = targetFocus.flatMap((f) => FOCUS_ALIASES[f] || [f]);
    const matchesFocus = expandedTerms.some(
      (term) =>
        traits.pattern.toLowerCase().includes(term) ||
        ex.muscles.some((m) => m.muscle.toLowerCase().includes(term)) ||
        ex.id.toLowerCase().includes(term),
    );
    return matchesFocus;
  }
  return true;
});

// Prepare proposal if dry-run
let resultPayload = null;

if (values["dry-run"]) {
  const selectedSlots = safeExercises.slice(0, 3).map((ex) => ({
    exerciseId: ex.id,
    name: ex.name.es || ex.name.en,
    sets: 3,
    repsMin: 12,
    repsMax: 15,
    restSec: 60,
    note: "Ejecución controlada con cero estrés articular",
  }));

  resultPayload = {
    mode: "dry-run",
    clinicalDiagnosis: constraint.clinicalReason,
    contraindicatedPatterns: constraint.contraindicatedPatterns,
    recommendedPatterns: constraint.recommendedPatterns,
    safeExercisesCount: safeExercises.length,
    proposedSession: {
      summary:
        "Sesión adaptada por dolor en inserción pectoral/hombro. Enfoque exclusivo en core y abdomen.",
      slots: selectedSlots,
    },
  };
} else {
  // Call llama.cpp server
  const messages = [
    { role: "system", content: buildSystemPrompt() },
    {
      role: "user",
      content:
        values.chat ||
        `Tengo dolor en ${reportedIssues.join(", ")}. Por favor adapta mi entrenamiento para enfocarme en ${targetFocus.join(", ")} sin estresar las articulaciones afectadas.`,
    },
  ];

  try {
    const chatRes = await chatWithTools({
      settings: {
        enabled: true,
        baseUrl: values.url,
        model: values.model,
        apiKey: "",
        timeoutSec: 15,
      },
      messages,
      tools: TOOL_SPECS,
      execute: (name, args) => {
        if (name === "report_fatigue_and_query_safe") {
          return {
            clinicalDiagnosis: constraint.clinicalReason,
            contraindicatedPatterns: constraint.contraindicatedPatterns,
            safeExercises: safeExercises.slice(0, 10).map((e) => ({
              id: e.id,
              name: e.name.es,
              pattern: EXERCISE_TRAITS[e.id]?.pattern,
            })),
          };
        }
        if (name === "propose_session") {
          return { accepted: true, slots: args.slots?.length ?? 0 };
        }
        return {};
      },
    });

    resultPayload = {
      mode: "llm-connected",
      ok: chatRes.ok,
      content: chatRes.content,
      toolCalls: chatRes.toolCalls,
      clinicalDiagnosis: constraint.clinicalReason,
      safeExercisesCount: safeExercises.length,
    };
  } catch (err) {
    resultPayload = {
      mode: "fallback-offline",
      ok: false,
      error: String(err.message || err),
      clinicalDiagnosis: constraint.clinicalReason,
      safeExercisesCount: safeExercises.length,
      fallbackAdvice:
        "El servidor llama.cpp no respondió en " +
        values.url +
        ". Se aplica diagnóstico determinista seguro.",
    };
  }
}

// Format Output
if (values.json) {
  console.log(JSON.stringify(resultPayload, null, 2));
} else {
  console.log(`\n\x1b[1m\x1b[38;2;255;115;0m=== DIAGNÓSTICO CLÍNICO BIOMECÁNICO ===\x1b[0m`);
  console.log(`\x1b[33m${constraint.clinicalReason}\x1b[0m\n`);

  console.log(`\x1b[1mPatrones contraindicados:\x1b[0m \x1b[31m${constraint.contraindicatedPatterns.join(", ") || "Ninguno"}\x1b[0m`);
  console.log(`\x1b[1mArticulaciones protegidas:\x1b[0m \x1b[31m${constraint.excludeJoints.join(", ") || "Ninguna"}\x1b[0m`);
  console.log(`\x1b[1mPatrones seguros recomendados:\x1b[0m \x1b[32m${constraint.recommendedPatterns.join(", ")}\x1b[0m`);
  console.log(`\x1b[1mEjercicios compatibles encontrados:\x1b[0m \x1b[36m${safeExercises.length} ejercicios\x1b[0m\n`);

  if (resultPayload.proposedSession) {
    console.log(`\x1b[1m\x1b[32m=== SESIÓN ADAPTADA PROPUESTA ===\x1b[0m`);
    console.log(`\x1b[37m${resultPayload.proposedSession.summary}\x1b[0m\n`);
    resultPayload.proposedSession.slots.forEach((s, idx) => {
      console.log(
        `  ${idx + 1}. \x1b[1m${s.name || s.exerciseId}\x1b[0m — ${s.sets} series × ${s.repsMin}-${s.repsMax} reps (Descanso: ${s.restSec}s)`,
      );
      if (s.note) console.log(`     \x1b[90m↳ ${s.note}\x1b[0m`);
    });
  } else if (resultPayload.content) {
    console.log(`\x1b[1m\x1b[32m=== RESPUESTA DEL COACH IA ===\x1b[0m`);
    console.log(resultPayload.content);
  } else if (resultPayload.error) {
    console.log(`\x1b[33mAviso: ${resultPayload.fallbackAdvice}\x1b[0m`);
  }
  console.log();
}
