/**
 * Build the local-LLM knowledge pack from the exercise catalog.
 *
 * The rule that makes this safe: **the pack is generated, never hand-written**.
 * Every fact comes from `@fitness/bodylab-exercises` at build time, so a
 * re-generated pack can never drift from what the app actually plans with.
 * The drift test (tests/training/test_llm_knowledge_pack.test.ts) regenerates
 * the pack in-memory and compares it against the committed file.
 *
 * Output (traininglab/apps/desktop/llm/):
 *   knowledge.json  — machine-readable facts (system prompt grounding, tools)
 *   EXERCISES.md    — the same facts as a compact table the model can read
 *   Modelfile       — llama.cpp/Ollama Modelfile with the system prompt baked in
 *   README.md       — how to run Qwen3.5-4B with llama.cpp / LM Studio / Ollama
 *
 * Run: node scripts/build-llm-pack.mjs   (from fitness-ecosystem/)
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "traininglab/apps/desktop/llm");

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
    },
  },
});
const ex = await server.ssrLoadModule("@fitness/bodylab-exercises");
await server.close();

const { ALL_EXERCISES, EXERCISE_TRAITS, PATTERN_TECHNIQUE, PATTERN_DEMOS } = ex;

/** One compact fact block per exercise — everything the coach may need. */
function factFor(exercise) {
  const traits = EXERCISE_TRAITS[exercise.id];
  const tech = PATTERN_TECHNIQUE[traits.pattern];
  const demo = PATTERN_DEMOS[traits.pattern];
  return {
    id: exercise.id,
    name: exercise.name, // {en, es}
    category: exercise.category,
    difficulty: exercise.difficulty,
    hypertrophy: exercise.hypertrophy,
    muscles: exercise.muscles.map((m) => ({ muscle: m.muscle, intensity: m.intensity })),
    equipment: exercise.equipment,
    pattern: traits.pattern,
    loadType: traits.loadType,
    unilateral: traits.unilateral,
    requires: traits.requires,
    jointStress: traits.jointStress,
    spineLoad: traits.spineLoad,
    progression: traits.progression,
    setupMin: traits.setupMin,
    techniqueLevel: tech.techniqueLevel,
    tempo: tech.tempo,
    rir: tech.effort.rir,
    demo: {
      view: demo.view,
      anchor: demo.anchor,
      watch: demo.watch,
    },
    hasMedia: true, // media presence is checked below and patched per-id
  };
}

// Which ids actually ship media (the manifest is the truth for the UI).
let mediaIds = new Set();
const manifestPath = path.join(
  ROOT,
  "traininglab/apps/desktop/public/exercises/asset-manifest.json",
);
if (existsSync(manifestPath)) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  mediaIds = new Set(
    Object.entries(m)
      .filter(([, v]) => v.gif || v.image)
      .map(([id]) => id),
  );
}

const facts = ALL_EXERCISES.map(factFor).map((f) => ({
  ...f,
  hasMedia: mediaIds.has(f.id),
}));

const families = [...new Set(facts.flatMap((f) => f.muscles.map((m) => m.muscle)))].sort();
const patterns = [...new Set(facts.map((f) => f.pattern))].sort();
const equipment = [...new Set(facts.flatMap((f) => f.requires))].sort();

const knowledge = {
  $schema: "traininglab-llm-knowledge/1.0",
  generatedFrom: "@fitness/bodylab-exercises",
  counts: {
    exercises: facts.length,
    families: families.length,
    patterns: patterns.length,
    withMedia: facts.filter((f) => f.hasMedia).length,
  },
  families,
  patterns,
  equipment,
  hardRules: [
    "Only propose exercises that exist in this knowledge base, by exact id.",
    "Never program equipment the user does not own.",
    "Respect the time budget: sum of slot minutes (setup + sets × (work + rest)) must fit.",
    "Never repeat the same primary muscle family twice in one session.",
    "Lower readiness ⇒ higher RIR (fewer reps in reserve), never lower.",
    "Weakest muscle family first.",
    "The deterministic plan is the baseline; improve it, do not replace it wholesale.",
  ],
  exercises: facts,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(
  path.join(OUT, "knowledge.json"),
  JSON.stringify(knowledge, null, 2) + "\n",
);

// ── EXERCISES.md — the human/model-readable table ────────────────────────────
const md = [
  "# TrainingLab exercise knowledge (auto-generated)",
  "",
  `> Generated from \`@fitness/bodylab-exercises\` — **do not edit by hand**.`,
  `> ${facts.length} exercises · ${families.length} muscle families · ${patterns.length} movement patterns · ${knowledge.counts.withMedia} with photo/GIF media.`,
  "",
  "## Hard rules",
  "",
  ...knowledge.hardRules.map((r) => `- ${r}`),
  "",
  "## Movement patterns",
  "",
  "```",
  patterns.join("\n"),
  "```",
  "",
  "## Exercises",
  "",
  "| id | en | es | pattern | load | hyp | diff | tech | RIR | joints | spine | media |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...facts.map(
    (f) =>
      `| ${f.id} | ${f.name.en} | ${f.name.es} | ${f.pattern} | ${f.loadType} | ${f.hypertrophy}/5 | ${f.difficulty}/5 | ${f.techniqueLevel}/5 | ${f.rir} | ${f.jointStress}/3 | ${f.spineLoad}/3 | ${f.hasMedia ? "yes" : "-"} |`,
  ),
  "",
].join("\n");
writeFileSync(path.join(OUT, "EXERCISES.md"), md);

// ── Modelfile — the system prompt baked into the model ──────────────────────
const modelfile = `# TrainingLab coach — local decision layer
# Base model: Qwen3.5-4B (owner's GGUF: Qwen3.5-4B-Q4_K_M.gguf)
#
# llama.cpp:
#   llama-server -m Qwen3.5-4B-Q4_K_M.gguf --port 8080 --jinja \\
#     -c 8192 --temp 0.6
# Ollama:
#   ollama create traininglab-coach -f Modelfile && ollama serve
# LM Studio: import the GGUF, set the System Prompt below, enable tool calling.

FROM ./Qwen3.5-4B-Q4_K_M.gguf

PARAMETER temperature 0.6
PARAMETER num_ctx 8192
PARAMETER top_p 0.95

SYSTEM """You are the coaching layer of TrainingLab, a 100% local fitness app.
You NEVER invent exercises, equipment or numbers: everything you propose must come from the tools.
The deterministic planner has already built a session from real measurements; your job is to improve it
for TODAY (time available, energy, motivation, soreness, equipment at hand) and to explain your choices
in one short paragraph, in the language of the user (Spanish unless told otherwise).
Hard rules: respect the time budget; never program equipment the user does not own; never repeat a muscle
family twice in one session; leave more reps in reserve (higher RIR) when readiness is low; prefer the
weakest muscle family first. Finish by calling propose_session. Be concise.
The valid exercise ids are in knowledge.json / EXERCISES.md next to this file. Never use an id not listed there.
"""
`;
writeFileSync(path.join(OUT, "Modelfile"), modelfile);

console.log(
  `knowledge pack written: ${facts.length} exercises (${knowledge.counts.withMedia} with media) -> traininglab/apps/desktop/llm/`,
);
