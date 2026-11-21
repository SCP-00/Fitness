#!/usr/bin/env node
/**
 * Coach benchmark — the same two-phase run the app performs, measured.
 *
 * This harness exists because the coach has one property that unit tests cannot
 * show: how long it takes and whether it actually ends in a proposal. It calls
 * the REAL `runCoach` and the REAL `validateProposal`; only the model transport
 * is replaceable.
 *
 *   node scripts/benchmark-coach.mjs                  # simulated, no server
 *   node scripts/benchmark-coach.mjs --json           # same, JSON on stdout
 *   node scripts/benchmark-coach.mjs --real --url http://127.0.0.1:8080/v1 --model qwen3.5-4b
 *
 * Simulated mode scripts OpenAI-compatible responses and injects them through
 * `runCoach`'s `fetchImpl`; it never opens a socket (the `requests` field counts
 * the calls the fake served). Real mode requires an explicit loopback endpoint,
 * probes `GET /models` first, and reports `endpoint-offline` with the reason
 * instead of pretending a run happened.
 *
 * Nothing here writes to the history: the executor only calls `validateProposal`
 * and returns its verdict, exactly like the store's `applyCoachProposal` decides
 * — minus the write. A benchmark must never be able to change today's session.
 *
 * Cases: empty history, limited gear and time, an over-budget proposal, a
 * movement veto that forces a retry, a Spanish request, and a model that answers
 * in prose instead of calling the terminal tool.
 */

import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "..");

/*
 * Vite is a dependency of the desktop app, not of the repo root, so it is
 * resolved from there instead of assuming a flat node_modules. The remaining
 * script needs it only to load the app's TypeScript with the app's aliases.
 */
const requireFromApp = createRequire(
  path.join(ROOT, "traininglab/apps/desktop/package.json"),
);
const viteEntry = requireFromApp
  .resolve("vite")
  .replace(/index\.cjs$/, "index.js");
const viteModule = await import(pathToFileURL(viteEntry).href);
const createServer = viteModule.createServer ?? viteModule.default.createServer;

const { values: args } = parseArgs({
  options: {
    real: { type: "boolean", default: false },
    simulate: { type: "boolean", default: false },
    url: { type: "string" },
    model: { type: "string", default: "traininglab-coach" },
    timeout: { type: "string", default: "180" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: false,
});

if (args.help) {
  console.log(`Uso:
  node scripts/benchmark-coach.mjs                 # modo simulado (sin servidor)
  node scripts/benchmark-coach.mjs --json          # igual, JSON puro en stdout
  node scripts/benchmark-coach.mjs --real --url http://127.0.0.1:8080/v1 --model qwen3.5-4b

Opciones:
  --real              ejecuta contra un modelo local real (requiere --url)
  --url <endpoint>    endpoint OpenAI-compatible explícito, p. ej. http://127.0.0.1:8080/v1
  --model <id>        id del modelo que espera el servidor
  --timeout <seg>     timeout por petición en modo real (default 180)
  --json              salida JSON pura (siempre es JSON; la opción se conserva por claridad)
`);
  process.exit(0);
}

if (args.real && !args.url) {
  console.log(
    JSON.stringify(
      {
        mode: "real",
        status: "missing-endpoint",
        reason:
          "real mode needs an explicit loopback endpoint: --url http://127.0.0.1:<port>/v1",
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const endpoint = args.real ? URL.parse(args.url) : null;
if (
  args.real &&
  (!endpoint ||
    !["http:", "https:"].includes(endpoint.protocol) ||
    !loopbackHosts.has(endpoint.hostname) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash)
) {
  console.log(JSON.stringify({
    mode: "real",
    status: "invalid-endpoint",
    reason: "Use an HTTP(S) loopback URL without credentials, query, or fragment.",
  }, null, 2));
  process.exit(2);
}

// An HTTP redirect must not forward the benchmark to a different host.
const fetchLocal = (url, init) => globalThis.fetch(url, { ...init, redirect: "error" });

/* ── Load the real modules through Vite, like the app resolves them ───────── */

const server = await createServer({
  root: ROOT,
  server: { middlewareMode: true, ws: false },
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

let runCoach;
let validateProposal;
let painVetoesFor;
let probeServer;
let TOOL_SPECS;
try {
  const coach = await server.ssrLoadModule(
    path.resolve(ROOT, "traininglab/apps/desktop/src/lib/coach-run.ts"),
  );
  const llm = await server.ssrLoadModule(
    path.resolve(ROOT, "traininglab/apps/desktop/src/lib/llm.ts"),
  );
  runCoach = coach.runCoach;
  validateProposal = llm.validateProposal;
  painVetoesFor = llm.painVetoesFor;
  probeServer = llm.probeServer;
  TOOL_SPECS = llm.TOOL_SPECS;
} finally {
  await server.close();
}

/* ── Synthetic fixture (90 min of nothing, six movements, two gear profiles) ─ */

const CATALOG = {
  "bodyweight-squat": { family: "quadriceps", pattern: "squat", setupMin: 0 },
  "push-ups": { family: "chest", pattern: "horizontal_push", setupMin: 0 },
  "inverted-row": { family: "back", pattern: "horizontal_pull", setupMin: 0 },
  "glute-bridge": { family: "gluteus", pattern: "hip_extension", setupMin: 0 },
  "v-up": { family: "core", pattern: "core_flexion", setupMin: 0 },
  "band-chest-press": { family: "chest", pattern: "horizontal_push", setupMin: 1 },
  "band-row": { family: "back", pattern: "horizontal_pull", setupMin: 1 },
  "band-squat": { family: "quadriceps", pattern: "squat", setupMin: 1 },
  "band-pull-apart": { family: "shoulders", pattern: "shoulder_abduction", setupMin: 1 },
  "band-curl": { family: "biceps", pattern: "elbow_flexion", setupMin: 1 },
};

const GEAR = {
  bodyweight: "none (bodyweight only)",
  bands: "resistance bands (light, medium, heavy)",
};

const BODYWEIGHT = [
  "bodyweight-squat",
  "push-ups",
  "inverted-row",
  "glute-bridge",
  "v-up",
];
const BANDS = [
  "band-chest-press",
  "band-row",
  "band-squat",
  "band-pull-apart",
  "band-curl",
  "v-up",
];

const usableOf = (ids) =>
  ids.map((id) => ({
    id,
    family: CATALOG[id].family,
    pattern: CATALOG[id].pattern,
  }));

/** The app's own CSV, with a synthetic, clearly-labelled history. */
function contextCsv({ budget, gear, recent = [], plan = [] }) {
  return [
    `time_budget_min,${budget}`,
    "readiness,energy=4,motivation=5,freshness=0",
    "goal,hypertrophy",
    "level,intermediate",
    "weak_families,core=42;back=48",
    `gear_profile,${gear === "bands" ? "casa" : "sin-equipo"}`,
    `equipment,${GEAR[gear]}`,
    "weekly_sets,chest=6;back=4;quadriceps=8",
    `deterministic_plan,${plan.join(" | ")}`,
    "recovering_families,none",
    "recent_sets(exercise,date,kg,reps)",
    ...recent,
  ].join("\n");
}

const REPEATED_RECENT = [
  "bodyweight-squat,2026-11-14,,12",
  "push-ups,2026-11-14,,10",
  "inverted-row,2026-11-11,,8",
];

const proposal = (summary, slots) => ({
  summary,
  slots: slots.map(([exerciseId, sets = 3, repsMin = 8, repsMax = 12, restSec = 60]) => ({
    exerciseId,
    sets,
    repsMin,
    repsMax,
    restSec,
  })),
});

/* ── The cases ───────────────────────────────────────────────────────────── */

const CASES = [
  {
    id: "empty-history",
    name: "historial vacío · cuerpo entero en casa",
    expected: "accepted",
    request: "Hoy quiero entrenar en casa, tengo 45 minutos y no he registrado nada.",
    budget: 45,
    gear: "bodyweight",
    recent: [],
    usable: BODYWEIGHT,
    plan: ["bodyweight-squat 3x10-12 rest60", "push-ups 3x8-12 rest60"],
    simulated: [
      proposal("Sesión base sin historial: prioriza técnica y familias débiles.", [
        ["bodyweight-squat", 3, 10, 12, 60],
        ["inverted-row", 3, 8, 12, 60],
      ]),
    ],
  },
  {
    id: "limited-gear-and-time",
    name: "equipo y tiempo limitados · bandas, 20 min",
    expected: "accepted",
    request: "Solo tengo bandas y 20 minutos. Quiero algo corto pero completo.",
    budget: 20,
    gear: "bands",
    recent: REPEATED_RECENT,
    usable: BANDS,
    plan: ["band-chest-press 2x12-15 rest45", "band-row 2x12-15 rest45"],
    simulated: [
      proposal("Dos movimientos con bandas que caben en 20 minutos.", [
        ["band-chest-press", 2, 12, 15, 45],
        ["band-row", 2, 12, 15, 45],
      ]),
    ],
  },
  {
    id: "over-budget",
    name: "presupuesto excedido · cuatro bloques en 20 min",
    expected: "rejected",
    request: "Con bandas y 20 minutos, dame cuatro ejercicios de 3 series.",
    budget: 20,
    gear: "bands",
    recent: REPEATED_RECENT,
    usable: BANDS,
    plan: ["band-chest-press 2x12-15 rest45"],
    simulated: [
      proposal("Cuatro bloques completos.", [
        ["band-chest-press", 3, 12, 15, 90],
        ["band-row", 3, 12, 15, 90],
        ["band-squat", 3, 12, 15, 90],
        ["band-curl", 3, 12, 15, 90],
      ]),
    ],
  },
  {
    id: "movement-veto",
    name: "veto de movimiento · hombro dolorido, reintento",
    expected: "accepted",
    // The veto is derived from this sentence by the app, not declared here.
    request:
      "Me duele el hombro y el pecho alto por las mancuernas. Quiero entrenar abdomen y piernas.",
    budget: 45,
    gear: "bodyweight",
    recent: REPEATED_RECENT,
    usable: BODYWEIGHT,
    plan: ["bodyweight-squat 3x10-12 rest60"],
    simulated: [
      proposal("Empuje y core.", [
        ["push-ups", 3, 8, 12, 60],
        ["v-up", 3, 10, 15, 60],
      ]),
      proposal("El hombro manda: fuera empujes, solo piernas y core.", [
        ["bodyweight-squat", 3, 10, 12, 60],
        ["v-up", 3, 10, 15, 60],
      ]),
    ],
  },
  {
    id: "spanish-query",
    name: "consulta en español · sesión de 30 min",
    expected: "accepted",
    request:
      "Tengo 30 minutos y quiero trabajar espalda y core sin material, con poco descanso.",
    budget: 30,
    gear: "bodyweight",
    recent: REPEATED_RECENT,
    usable: BODYWEIGHT,
    plan: ["inverted-row 3x8-12 rest60"],
    simulated: [
      proposal("Espalda y core, descansos cortos para caber en 30 minutos.", [
        ["inverted-row", 3, 8, 12, 45],
        ["v-up", 3, 10, 15, 45],
      ]),
    ],
  },
  {
    id: "invalid-response",
    name: "respuesta inválida · prosa en vez de propose_session",
    expected: "no-proposal",
    request: "¿Qué hago hoy?",
    budget: 45,
    gear: "bodyweight",
    recent: REPEATED_RECENT,
    usable: BODYWEIGHT,
    plan: ["bodyweight-squat 3x10-12 rest60"],
    // No tool call: `runCoach` must report a failure, never a silent success.
    simulated: ["Claro, hoy puedes entrenar piernas y espalda con calma."],
  },
];

/* ── Simulated transport: OpenAI-compatible, counted, offline ─────────────── */

function simulatedFetch(responses) {
  let requests = 0;
  let index = 0;
  const impl = async (_url, init) => {
    requests += 1;
    const body = JSON.parse(String(init?.body ?? "{}"));
    const commitPhase =
      Array.isArray(body.tools) &&
      body.tools.length === 1 &&
      body.tools[0]?.function?.name === "propose_session";
    let payload;
    if (!commitPhase) {
      payload = {
        choices: [
          {
            finish_reason: "stop",
            message: { role: "assistant", content: "Contexto recibido." },
          },
        ],
      };
    } else {
      const scripted = responses[Math.min(index, responses.length - 1)];
      index += 1;
      payload =
        typeof scripted === "string"
          ? {
              choices: [
                {
                  finish_reason: "stop",
                  message: { role: "assistant", content: scripted },
                },
              ],
            }
          : {
              choices: [
                {
                  finish_reason: "tool_calls",
                  message: {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: `call-${index}`,
                        type: "function",
                        function: {
                          name: "propose_session",
                          arguments: JSON.stringify(scripted),
                        },
                      },
                    ],
                  },
                },
              ],
            };
    }
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
    };
  };
  return {
    impl,
    requests: () => requests,
  };
}

/* ── Read-only executor: the real validator decides, nothing is written ───── */

function makeExecutor({ usable, budget, vetoedPatterns, focusFamilies }) {
  const usableIds = new Set(usable.map((u) => u.id));
  const byId = new Map(usable.map((u) => [u.id, u]));
  const familyOf = (id) => byId.get(id)?.family ?? "unknown";
  return async (name, proposalArgs) => {
    if (name !== "propose_session") {
      // Exploration tools are answered minimally; no store state is read.
      return { ok: true, note: "read-only benchmark context" };
    }
    const check = validateProposal(proposalArgs, {
      usableIds,
      timeBudgetMin: budget,
      primaryFamilyOf: familyOf,
      familiesOf: (id) => [familyOf(id)],
      setupMinOf: (id) => CATALOG[id]?.setupMin ?? 0,
      vetoedPatterns,
      patternOf: (id) => CATALOG[id]?.pattern ?? "",
      focusFamilies,
    });
    return check.ok
      ? {
          accepted: true,
          slots: check.slots.length,
          estimatedMinutes: check.estimatedMinutes,
        }
      : { accepted: false, errors: check.errors };
  };
}

/* ── One case, through the real runCoach ─────────────────────────────────── */

async function runCase(testCase, { real, settings, transport }) {
  const started = Date.now();
  const vetoedPatterns = painVetoesFor(testCase.request);
  const usable = usableOf(testCase.usable);
  const result = await runCoach({
    settings,
    request: testCase.request,
    contextCsv: contextCsv({
      budget: testCase.budget,
      gear: testCase.gear,
      recent: testCase.recent,
      plan: testCase.plan,
    }),
    tools: TOOL_SPECS,
    execute: makeExecutor({
      usable,
      budget: testCase.budget,
      vetoedPatterns,
      focusFamilies: [],
    }),
    usable,
    vetoedPatterns,
    focusFamilies: [],
    fetchImpl: transport.impl,
  });

  const verdict = result.cancelled
    ? "cancelled"
    : result.ok
      ? "accepted"
      : /without calling propose_session/.test(result.errors.join(" "))
        ? "no-proposal"
        : "rejected";

  const proposalCalls = result.toolCalls.filter(
    (call) => call.name === "propose_session",
  ).length;

  return {
    id: testCase.id,
    name: testCase.name,
    request: testCase.request,
    expected: real ? null : testCase.expected,
    verdict,
    pass: real ? null : verdict === testCase.expected,
    durationMs: Date.now() - started,
    modelMs: result.timings,
    vetoedPatterns,
    proposalAttempts: proposalCalls,
    proposal: result.applied,
    reason:
      result.errors.length > 0
        ? result.errors.join(" | ")
        : result.applied
          ? `${result.applied.slots} slots · ${result.applied.minutes} min estimados · ${result.applied.summary || "(sin resumen)"}`
          : "sin propuesta",
    content: result.content || "",
    requests: transport.requests(),
  };
}

function settingsFor(real) {
  return {
    enabled: true,
    baseUrl: real ? endpoint.href : "http://127.0.0.1:0/v1",
    model: args.model,
    apiKey: "",
    timeoutSec: real ? Number(args.timeout) || 180 : 10,
    maxTokens: 1024,
  };
}

const real = args.real;
const settings = settingsFor(real);

let probe = null;
if (real) {
  probe = await probeServer(settings, fetchLocal);
  if (!probe.ok) {
    console.log(
      JSON.stringify(
        {
          mode: "real",
          status: "endpoint-offline",
          endpoint: probe.endpoint,
          model: settings.model,
          reason: probe.error ?? "no server answered",
          probeMs: probe.ms,
          models: probe.models,
          hint: "Arranca el servidor local (llama.cpp/LM Studio) o pasa el --url correcto.",
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }
}

const cases = [];
for (const testCase of CASES) {
  const transport = real
    ? { impl: fetchLocal, requests: () => null }
    : simulatedFetch(testCase.simulated ?? []);
  cases.push(await runCase(testCase, { real, settings, transport }));
}

const passed = cases.filter((c) => c.pass === true).length;
const failed = cases.filter((c) => c.pass === false).length;

console.log(
  JSON.stringify(
    {
      mode: real ? "real" : "simulated",
      endpoint: real ? settings.baseUrl : null,
      model: real ? settings.model : null,
      probe: probe
        ? { ok: probe.ok, ms: probe.ms, models: probe.models }
        : null,
      generatedAt: new Date().toISOString(),
      cases,
      summary: {
        total: cases.length,
        passed,
        failed,
        verdicts: cases.reduce((acc, c) => {
          acc[c.verdict] = (acc[c.verdict] ?? 0) + 1;
          return acc;
        }, {}),
      },
    },
    null,
    2,
  ),
);

if (!real && failed > 0) process.exit(1);
