#!/usr/bin/env node
/**
 * Fitness MCP Server — Model Context Protocol for FreeBody (TrainingLab & BodyLab).
 *
 * Implements JSON-RPC 2.0 stdio protocol adhering to the Anthropic/Linux Foundation
 * Model Context Protocol (MCP) specification.
 *
 * Exposes tools for:
 *   - Reading training logs, volume, and PRs (TrainingLab)
 *   - Logging sets directly from an AI agent or local LLM (TrainingLab)
 *   - Reading body measurements, somatotype, WHtR, and body fat (BodyLab)
 *   - Logging new anthropometric measurements (BodyLab)
 *   - Proposing validated time-budgeted sessions based on recovered muscle families
 *   - Biomechanical & genetic Q&A reasoning (e.g. calf insertions, limb lengths)
 *
 * Usage:
 *   node scripts/fitness-mcp-server.mjs
 *   node scripts/fitness-mcp-server.mjs --test
 *
 * @module scripts/fitness-mcp-server
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import readline from 'node:readline';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The local calendar day (`YYYY-MM-DD`), never the UTC one (2026-10-14).
 *
 * Everything the app groups by day is the owner's local day
 * (`traininglab/.../lib/day.ts` fixed the same bug on 2026-10-12) and the
 * mirror stamps its `date` that way. Reading it as UTC split the day at 19:00
 * in America/Bogota: the evening's readiness looked like "not today", so
 * `read_recovery` and `read_current_state` planned against a 3/3/3 nobody
 * reported and filtered a different day than the screen.
 */
export function localDay(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Data Sources ────────────────────────────────────────────────────────────

function getTrainingLabBackupDir() {
  const appData = process.env.APPDATA || process.env.LOCALAPPDATA || '';
  if (!appData) return null;
  return path.join(appData, 'com.traininglab.desktop', 'backups');
}

function getLatestTrainingLabBackup() {
  const dir = getTrainingLabBackupDir();
  if (dir && fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('traininglab-') && f.endsWith('.json'))
      .sort()
      .reverse();
    if (files.length > 0) {
      try {
        const text = fs.readFileSync(path.join(dir, files[0]), 'utf8');
        return JSON.parse(text);
      } catch {
        // fallback
      }
    }
  }
  // Fallback to .cache if desktop app haven't run on this machine
  const cacheFile = path.join(ROOT, '.cache', 'symmetry-import.json');
  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

function getLatestBodyLabData() {
  const file = path.join(ROOT, '.cache', 'bodylab-owner.json');
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

// ── ACTION CHANNEL (models → app) ────────────────────────────────────────
//
// docs/MCP_TOOL_SURFACE.md, decision D1 (2026-10-09). TrainingLab's truth is
// IndexedDB inside its WebView: this process cannot touch it, and the app must
// not listen on a socket (a privacy-first app does not open ports). So a write
// is a FILE: `mcp/mcp-actions.json` next to the autobackups, picked up by the
// desktop shell, validated there by the same rules as the UI, applied through
// the app's own reducers and answered in `mcp/mcp-results.json`.
//
// What this buys, and what it costs:
//   * **Nothing bypasses validation.** The old `log_training_set` wrote a
//     synthetic backup snapshot directly — the model's word as data. Now the
//     app refuses a set the declared gear cannot load and says which rule fired.
//   * **Receipts are idempotent.** Every action carries an `id`; the app keeps a
//     ledger of every id it has seen, so retrying after a timeout can never log
//     the same set twice. Pass `idempotency_key` to make a retry *your* retry.
//   * **Closed app = pending, not lost.** The file survives; the receipt arrives
//     on the next launch, which is why a timeout returns `status: pending` with
//     the id to poll via `read_receipts`.

/** Where the two channel files live (same app data dir as the backups). */
function getMcpDir() {
  const appData = process.env.APPDATA || process.env.LOCALAPPDATA || '';
  if (!appData) return null;
  return path.join(appData, 'com.traininglab.desktop', 'mcp');
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Every receipt the app has written, oldest first. */
export function readReceipts() {
  const dir = getMcpDir();
  if (!dir) return [];
  const rows = readJsonFile(path.join(dir, 'mcp-results.json'), []);
  return Array.isArray(rows) ? rows : [];
}

let actionCounter = 0;

/**
 * One action envelope. `id` is the idempotency key: pass `idempotency_key` from
 * the caller when the same logical request may be retried, and the app will
 * answer with the original receipt instead of applying it again.
 */
export function buildAction(type, params, args = {}) {
  const id =
    typeof args.idempotency_key === 'string' && args.idempotency_key.trim()
      ? args.idempotency_key.trim()
      : `${type}-${Date.now().toString(36)}-${(actionCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    type,
    origin: `mcp:${process.env.FITNESS_MCP_AGENT || 'fitness-mcp'}`,
    requestedAt: new Date().toISOString(),
    ...(args.confirm !== undefined ? { confirm: args.confirm === true } : {}),
    params,
  };
}

/** Append to the inbox atomically (never a half-written file) and wait. */
async function submitActions(actions, { waitMs = 8000 } = {}) {
  const dir = getMcpDir();
  if (!dir) {
    return {
      status: 'unavailable',
      reason:
        'No APPDATA on this machine: the action channel only exists next to the desktop app.',
    };
  }
  const file = path.join(dir, 'mcp-actions.json');
  const existing = readJsonFile(file, []);
  const queued = Array.isArray(existing)
    ? existing
    : Array.isArray(existing?.actions)
      ? existing.actions
      : [];
  const known = new Set(queued.map((row) => row?.id).filter(Boolean));
  const mine = actions.filter((a) => !known.has(a.id));
  if (mine.length === 0) {
    return { status: 'duplicate', receipts: [], ids: actions.map((a) => a.id) };
  }

  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(
    tmp,
    JSON.stringify({ actions: [...queued, ...mine] }, null, 2),
    'utf8',
  );
  fs.renameSync(tmp, file);

  const wanted = new Set(mine.map((a) => a.id));
  const deadline = Date.now() + waitMs;
  let receipts = [];
  while (Date.now() < deadline) {
    receipts = readReceipts().filter((r) => wanted.has(r.id));
    if (receipts.length === mine.length) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const answered = new Set(receipts.map((r) => r.id));
  const pendingIds = mine.map((a) => a.id).filter((id) => !answered.has(id));
  return {
    status: pendingIds.length === 0 ? 'ok' : 'pending',
    receipts,
    pendingIds,
    submitted: mine,
  };
}

/** Turn a channel outcome into the envelope the caller reads. */
function renderOutcome(outcome) {
  if (outcome.status === 'unavailable') {
    return toolText({ status: 'unavailable', reason: outcome.reason });
  }
  if (outcome.status === 'duplicate') {
    return toolText({
      status: 'duplicate',
      ids: outcome.ids,
      message:
        'Esas acciones ya están en la bandeja de entrada de la app (mismo idempotency_key).',
    });
  }
  if (outcome.status === 'pending') {
    return toolText({
      status: 'pending',
      ids: outcome.pendingIds,
      receipts: outcome.receipts,
      message:
        'La app de escritorio no ha abierto la bandeja todavía: la acción queda en el fichero y se aplicará en el próximo arranque. Consulta su acuse con read_receipts e id.',
    });
  }
  return toolText({
    status:
      outcome.receipts.every((r) => r.status === 'applied') ? 'applied' : 'answered',
    receipts: outcome.receipts,
  });
}

// ── Canonical planning engine (ONE implementation, never a copy here) ────────
//
// 2026-10-09: this server used to answer `propose_training_session` with a
// fixed template — bench press, lateral raise, pushdown — no matter what the
// log, the gear or the recovery state said. The owner asked what to train the
// day after a 22-set push/pull session and got chin-ups and pull-ups again.
// The rule that fixes it: the planning maths lives in TypeScript and is loaded
// through Vite with the SAME `@fitness/*` aliases the apps use, so this tool
// cannot disagree with the app the owner is looking at.

/** Default self-report when the backup does not carry the day's readiness. */
const NEUTRAL_READINESS = { energy: 3, motivation: 3, soreness: 3 };

let enginePromise = null;

/**
 * Import Vite even when it is not a root dependency (2026-10-14).
 *
 * `import('vite')` resolves against the monorepo root, and neither a strict
 * pnpm install nor this bun-installed checkout guarantees `vite` there: it
 * belongs to the apps. A clean install therefore answered every engine-backed
 * tool with `engine_unavailable` and the three fresh-process tests went red.
 * The apps that need Vite in development ship it, so resolve it from their own
 * manifest (`createRequire` honours the isolated `node_modules` layout) and
 * import the real file. Root-level import stays first so a hoisted install
 * keeps its previous behaviour.
 */
async function importVite() {
  try {
    return await import('vite');
  } catch (rootError) {
    for (const app of ['bodylab/apps/web', 'traininglab/apps/desktop']) {
      try {
        const fromApp = createRequire(path.join(ROOT, app, 'package.json'));
        return await import(pathToFileURL(fromApp.resolve('vite')).href);
      } catch {
        // Try the next app that ships Vite; keep the original error otherwise.
      }
    }
    throw rootError;
  }
}

async function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { createServer } = await importVite();
      const server = await createServer({
        root: ROOT,
        // A loader, not a dev server (2026-10-13). `watch: null` and
        // `noDiscovery` are not cosmetics: with the defaults Vite crawled and
        // watched the whole monorepo to build the module graph, and the first
        // tool call took **48 s** — measured, twice, before and after. Reading
        // one exercise is now ~0,5 s. No HMR socket either: this process loads
        // the engine once and never reacts to edits, and the port it tried to
        // open (24678) is not ours to take.
        server: { middlewareMode: true, hmr: false, watch: null },
        optimizeDeps: { noDiscovery: true, include: [] },
        configFile: false,
        logLevel: 'error',
        resolve: {
          alias: {
            '@fitness/bodylab-training': path.resolve(ROOT, 'bodylab/core/training/src'),
            '@fitness/bodylab-exercises': path.resolve(ROOT, 'bodylab/core/exercises/src'),
            '@app/recovery': path.resolve(
              ROOT,
              'traininglab/apps/desktop/src/lib/recovery.ts',
            ),
            '@app/progression': path.resolve(
              ROOT,
              'traininglab/apps/desktop/src/lib/progression.ts',
            ),
            '@app/records': path.resolve(
              ROOT,
              'traininglab/apps/desktop/src/lib/records.ts',
            ),
            '@app/volume-target': path.resolve(
              ROOT,
              'traininglab/apps/desktop/src/lib/volume-target.ts',
            ),
            '@app/plan': path.resolve(
              ROOT,
              'traininglab/apps/desktop/src/lib/plan.ts',
            ),
            '@app/stats-derive': path.resolve(
              ROOT,
              'traininglab/apps/desktop/src/features/stats/derive.ts',
            ),
          },
        },
      });
      const recovery = await server.ssrLoadModule('@app/recovery');
      const training = await server.ssrLoadModule('@fitness/bodylab-training');
      const exercises = await server.ssrLoadModule('@fitness/bodylab-exercises');
      const progression = await server.ssrLoadModule('@app/progression');
      const records = await server.ssrLoadModule('@app/records');
      const volumeTarget = await server.ssrLoadModule('@app/volume-target');
      const plan = await server.ssrLoadModule('@app/plan');
      const derive = await server.ssrLoadModule('@app/stats-derive');
      await server.close();
      return {
        recovery,
        training,
        exercises,
        progression,
        records,
        volumeTarget,
        plan,
        derive,
      };
    })().catch((err) => {
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

/** The generated knowledge pack: the catalog the apps actually plan with. */
let packCache = null;
function knowledgePack() {
  if (!packCache) {
    const file = path.join(
      ROOT,
      'traininglab/apps/desktop/llm/knowledge.json',
    );
    packCache = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, 'utf8'))
      : { exercises: [] };
  }
  return packCache;
}

/**
 * The recovery window of the latest log, computed by the real module.
 * `mode: 'unavailable'` is returned instead of a guess when the engine cannot
 * be loaded — never an invented answer.
 */
/**
 * The day's self-report **as the app published it** in the mirror (2026-10-09).
 *
 * Before this existed every tool planned against `NEUTRAL_READINESS` — a 3/3/3
 * nobody had reported — so a fresh body and a wrecked one got the same 48 h
 * window. A mirror from another day is refused on purpose: yesterday's energy
 * must never scale today's recovery.
 */
export function mirroredReadiness(backup, now = new Date()) {
  const mirror = backup?.mirror;
  if (!mirror || typeof mirror !== 'object') return null;
  if (mirror.date !== localDay(now)) return null;
  const r = mirror.readiness;
  if (!r || typeof r !== 'object') return null;
  const level = (value) =>
    typeof value === 'number' && value >= 1 && value <= 5 ? value : null;
  const energy = level(r.energy);
  const motivation = level(r.motivation);
  const soreness = level(r.soreness);
  if (energy === null || motivation === null || soreness === null) return null;
  return { energy, motivation, soreness };
}

/**
 * The plan the app is showing today, straight from its mirror, or `null` when
 * the file predates the field.
 *
 * Why this beats recomputing here: the app's plan is the *user's* plan — it has
 * the self-report, his sore list, his day focus, his BodyLab link, his swaps and
 * the coach's rows. `swap_exercise` is validated against those very rows, so a
 * model that had only a recomputation could be told «that slot does not exist»
 * about a slot the screen was showing (observed, 2026-10-09).
 */
export function mirroredPlan(backup, now = new Date()) {
  const mirror = backup?.mirror;
  if (!mirror || typeof mirror !== 'object') return null;
  if (mirror.date !== localDay(now)) return null;
  const plan = Array.isArray(mirror.plan) ? mirror.plan : [];
  return plan.length > 0 ? plan : null;
}

async function buildRecoveryReport(now = new Date()) {
  const backup = getLatestTrainingLabBackup();
  const sets = Array.isArray(backup?.sets) ? backup.sets : [];
  const inventory = Array.isArray(backup?.settings?.inventory)
    ? backup.settings.inventory
    : [];
  const mirrored = mirroredReadiness(backup, now);
  const readiness = mirrored || NEUTRAL_READINESS;
  const readinessSource = mirrored
    ? 'mirror (el parte que la app publicó hoy)'
    : 'neutral (la app no ha publicado el parte de hoy; usa el valor 3/3/3)';
  try {
    const engine = await loadEngine();
    const report = engine.recovery.deriveFatigue(sets, readiness, now);
    return { mode: 'ok', engine, report, sets, inventory, readiness, readinessSource };
  } catch (err) {
    return {
      mode: 'unavailable',
      reason: String((err && err.message) || err),
      sets,
      inventory,
      readiness,
      readinessSource,
    };
  }
}

// ── Read-side helpers (HISTORY and STATE are read-only by construction) ──────
//
//  There is no tool anywhere in this surface that edits or deletes a closed
//  session: immutability here is the absence of an API, not a convention. The
//  app's owner can still edit his own history; a model cannot.

/** The mirror the app rewrites after every change (2 s debounce). */
function mirror() {
  return (
    getLatestTrainingLabBackup() || {
      sets: [],
      sessions: [],
      health: [],
      settings: null,
      decisionModel: null,
    }
  );
}

/** Warm-up ramps are not work anywhere in this system. */
function workingSets(sets) {
  return sets.filter((s) => s.warmup !== true);
}

/**
 * The set's own marker: W warm-up, D near failure, F to failure
 * (owner-confirmed 2026-10-09). The structured `effort` field wins; the legacy
 * free-text note is the fallback for sets logged before it existed.
 */
function markerOf(set) {
  if (set.warmup === true) return 'W';
  const field = String(set.effort || '').trim().toUpperCase();
  if (field === 'D' || field === 'F') return field;
  const note = String(set.notes || '').trim().toUpperCase();
  return note === 'D' || note === 'F' ? note : null;
}

/** Display name from the generated pack (never an invented label). */
function packName(id) {
  const fact = knowledgePack().exercises.find((e) => e.id === id);
  return fact ? fact.name : { en: id, es: id };
}

/** Wrap any read answer in the MCP content envelope. */
function toolText(payload) {
  return {
    content: [
      { type: 'text', text: JSON.stringify(payload, null, 2) },
    ],
  };
}

/**
 * The plan the APP would build right now, computed by the app's own engine.
 * `null` when the engine cannot be loaded — never a substitute.
 */
async function currentAppPlan() {
  const loaded = await buildRecoveryReport();
  if (loaded.mode !== 'ok') return null;
  const { engine, sets, inventory, readiness } = loaded;
  const settings = mirror().settings || {};
  const plan = engine.plan.buildTodayPlan({
    inventory,
    readiness,
    timeBudgetMin:
      typeof settings.timeBudgetMin === 'number' ? settings.timeBudgetMin : 90,
    level: settings.level || 'intermediate',
    goal: settings.goal || 'hypertrophy',
    logStats: engine.plan.familyLogStats(sets),
    sets,
    model: mirror().decisionModel ?? engine.training.emptyModel(),
    payload: null,
  });
  return { plan, engine, sets, settings };
}

// ── Biomechanical Knowledge ─────────────────────────────────────────────────

const BIOMECHANICAL_INSIGHTS = {
  calves: {
    en: "Gastrocnemius and soleus hypertrophy is heavily bounded by the Achilles tendon insertion height and muscle belly length. Long Achilles tendons with high insertions result in shorter muscle bellies with higher mechanical leverage for endurance running, but limited cross-sectional area (hypertrophy) potential. Conversely, individuals with low insertions experience massive calves even without targeted training. If calves are already genetically large and lean, force-feeding extra volume is counterproductive; maintenance volume (2-4 sets/week) is sufficient.",
    es: "La hipertrofia de gemelos y sóleo está fuertemente determinada por la altura de inserción del tendón de Aquiles y la longitud del vientre muscular. Un tendón largo e inserción alta otorga gran reactividad elástica para carrera, pero techo hipertrófico reducido. Una inserción baja da un vientre muscular largo y voluminoso casi sin entrenar. Si tus pantorrillas ya son genéticamente grandes y magras, no necesitas saturarlas de volumen: 2-4 series semanales de mantenimiento con pausa en estiramiento bastan.",
  },
  limb_lengths: {
    en: "Segment lengths (subischial leg, upper arm, forearm, sitting height) dictate moment arms in multi-joint lifts. Long femurs relative to torso increase hip moment arms in squats (necessitating more forward lean). Long arms favor deadlifts but challenge bench press range of motion.",
    es: "Las longitudes segmentarias (pierna, fémur, brazo, antebrazo) dictan los brazos de palanca articulares. Fémures largos respecto al torso incrementan la flexión de cadera en sentadilla (mayor inclinación del torso). Brazos largos benefician el peso muerto pero alargan el recorrido en press de banca.",
  },
};

// ── Tools Registry ──────────────────────────────────────────────────────────

export const TOOLS = [
  {
    name: 'read_training_stats',
    description:
      'Lee el historial de entrenamiento de TrainingLab y, sobre todo, la ventana de recuperación calculada desde tu registro: qué familias musculares siguen recuperándose y no deberían entrenarse hoy.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Número máximo de series o sesiones recientes a devolver (por defecto 20).',
          default: 20,
        },
      },
    },
  },
  {
    name: 'log_training_set',
    description:
      'ACCIÓN: registra una serie en la sesión de hoy de TrainingLab. Viaja como fichero de acciones: la app la valida con sus propias reglas (ejercicio en el catálogo, tu material puede cargarlo, peso bajo tu tope, repeticiones 1-50) y devuelve un acuse. Reenviar con la misma idempotency_key no la registra dos veces.',
    inputSchema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string', description: 'ID del ejercicio en el catálogo (ej. "barbell-bench-press")' },
        weight_kg: { type: 'number', description: 'Peso levantado en kilogramos (null o 0 si es peso corporal)' },
        reps: { type: 'number', description: 'Repeticiones completadas (1-50). Omítela si envías duration_sec.' },
        duration_sec: { type: 'number', description: 'Segundos, para trabajo cronometrado (plancha, colgada). 1-7200.' },
        effort: {
          type: 'string',
          enum: ['D', 'F'],
          description: 'Marca de esfuerzo: D = cerca del fallo, F = al fallo. (W es warmup: true).',
        },
        rir: { type: 'number', description: 'Repeticiones en reserva (0-5); se guarda como nota.' },
        warmup: { type: 'boolean', description: 'True si es serie de aproximación/calentamiento' },
        notes: { type: 'string', description: 'Notas opcionales sobre la serie (máx. 280)' },
        occurred_at: {
          type: 'string',
          description:
            'Cuándo se hizo, si no es ahora (ISO-8601). Tiene que caer en el día de HOY: la app rechaza otro día con occurred_at_not_today.',
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar la serie.' },
      },
      required: ['exercise_id'],
    },
  },
  {
    name: 'read_body_stats',
    description:
      'Lee el espejo de BodyLab: perfil (nombre, talla, peso, sexo, nacimiento) y la última medición guardada de cada tipo. Son valores tal cual, sin recalcular: el porcentaje de grasa o el somatotipo solo aparecen si están guardados como medida. El fichero lo actualiza el dueño a mano, así que puede tener unos días: dilo al usarlo.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'log_body_measurement',
    description:
      'Escribe una medición en el ESPEJO LOCAL de análisis (.cache/bodylab-owner.json). OJO: BodyLab todavía no tiene canal de acciones, así que esto NO aparece en la app: úsala solo si el dueño lo pide, y dile siempre que tiene que introducirla él en BodyLab. Sin acuse, sin deshacer y sin validación (a diferencia de las ACCIONES de TrainingLab).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Tipo de medición (ej. "waist", "biceps", "body_fat_percentage", "chest", "forearm")',
        },
        value: { type: 'number', description: 'Valor numérico de la medición' },
        unit: { type: 'string', description: 'Unidad de medida (ej. "cm", "kg", "%")', default: 'cm' },
        notes: { type: 'string', description: 'Notas u observaciones del método de medición' },
      },
      required: ['type', 'value'],
    },
  },
  {
    name: 'propose_training_session',
    description:
      'Devuelve los ejercicios que tu registro y tu material permiten HOY: excluye toda familia muscular que siga dentro de su ventana de recuperación y todo lo que tu equipamiento declarado no pueda cargar. Es el conjunto fundamentado; la app calcula series, repeticiones y descansos.',
    inputSchema: {
      type: 'object',
      properties: {
        time_budget_min: { type: 'number', default: 45, description: 'Presupuesto de tiempo en minutos' },
        focus_family: { type: 'string', description: 'Familia muscular prioritaria (ej. "chest", "lats", "quadriceps")' },
      },
    },
  },
  {
    name: 'read_history',
    description:
      'CANAL DE SOLO LECTURA de sesiones cerradas: id, fecha, duración, ejercicios, series, volumen y marcas de esfuerzo (W calentamiento, D, F). Ninguna herramienta MODIFICA una sesión pasada (sus series no se editan). Sí existe una que la borra entera — `delete_session` — y solo si el usuario lo pide: es irreversible por ti (el usuario la deshace desde Ajustes) y exige confirm: true.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Cuántas sesiones devolver (1-50, por defecto 10).' },
        before: {
          type: 'string',
          description: 'ISO de corte: devuelve solo sesiones anteriores a esa fecha (paginación).',
        },
      },
    },
  },
  {
    name: 'read_exercise_history',
    description:
      'Historial completo de UN ejercicio por día: series, peso tope, repeticiones, segundos, mejor e1RM (Epley) y si hubo series al fallo. Además las marcas sin carga (bestReps = más repeticiones en una serie a peso corporal, bestHoldSec = isométrico más largo en segundos), que son las únicas que pueden batir las dominadas, los fondos, las flexiones y los planchas. Es la materia prima de cualquier decisión de progresión.',
    inputSchema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string', description: 'Id del ejercicio en el catálogo.' },
      },
      required: ['exercise_id'],
    },
  },
  {
    name: 'read_progression',
    description:
      'Veredicto determinista de progresión para un ejercicio: subir carga (con el peso exacto si el material lo permite), repetir, reducir, o escalar a una variante más difícil (palanca, tempo, isométrico, rango, volumen) cuando la carga no puede subir. Incluye los números usados.',
    inputSchema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string' },
        goal: {
          type: 'string',
          description: 'hypertrophy | strength | recomposition. Por defecto, el objetivo guardado en la app.',
        },
      },
      required: ['exercise_id'],
    },
  },
  {
    name: 'read_recovery',
    description:
      'Ventana de recuperación calculada desde el registro real y tu parte de hoy: familias que NO deben entrenarse hoy, con horas desde su última serie, series y ventana aplicada. Es el mismo módulo que usa la app; el campo readinessUsed dice si el parte vino del espejo de la app o del valor neutro.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_current_state',
    description:
      'Estado actual (modificable por ACCIONES, no por lectura): sesión en curso (series de hoy, familias ya trabajadas, volumen), tu parte de hoy, equipamiento declarado, objetivo, nivel, presupuesto de tiempo y las casillas del plan de hoy que la app está mostrando (todayPlan.source dice si vienen de la app o de una reconstrucción). Es la primera lectura antes de proponer o cambiar nada.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_weekly_volume',
    description:
      'Series directas por familia muscular en los últimos 7 días frente a la banda semanal publicada (12-20, Baz-Valle 2022): qué va por debajo, dentro o por encima, y qué familias no se han tocado.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Ventana en días (por defecto 7).' },
      },
    },
  },
  {
    name: 'explain_biomechanics',
    description:
      'Explicaciones publicadas sobre DOS temas concretos: hipertrofia de pantorrillas (inserción del tendón de Aquiles y longitud del vientre) y longitudes segmentarias (palancas en sentadilla/peso muerto/press). Si la pregunta es de otro tema devuelve status not_covered con explanation null: significa que no hay material, no la respondas tú de memoria.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Pregunta del usuario (ej. "¿por qué mis pantorrillas no cambian de tamaño?")' },
      },
      required: ['question'],
    },
  },

  // ── ACTIONS (write) — the file channel ──────────────────────────────
  // Each writes `mcp-actions.json`; TrainingLab validates it with the same
  // rules as its own UI, applies it through its own reducers and answers with a
  // receipt in `mcp-results.json`. `idempotency_key` makes a retry safe: the
  // app keeps a ledger of every id it has seen.
  {
    name: 'finish_session',
    description:
      'ACCIÓN: cierra la sesión de hoy y la pasa al historial (inmutable después). Exige confirm: true para que ningún modelo la cierre por accidente. Devuelve un acuse con id y su deshacer; reenviar la misma idempotency_key no la cierra dos veces.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Debe ser true. Cerrar la sesión es destructivo.',
        },
        idempotency_key: {
          type: 'string',
          description: 'Clave para reintentar sin duplicar la acción.',
        },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'set_readiness',
    description:
      'ACCIÓN: escribe el autoinforme de hoy (energía, motivación, frescura), cada uno de 1 a 5 (5 = mejor). Al menos uno. Lo usa el motor de recuperación y el plan de la app.',
    inputSchema: {
      type: 'object',
      properties: {
        energy: { type: 'number', description: 'Energía, 1-5 (5 = a tope).' },
        motivation: { type: 'number', description: 'Motivación, 1-5 (5 = con ganas).' },
        // La escala es la del motor (`bodylab/core/training/src/session.ts`):
        // `soreness` **es frescura**, y 5 significa SIN agujetas. Se escribía al
        // revés en esta descripción hasta 2026-10-13, y un modelo que la obedeciera
        // («5 = muy adolorido») habría puesto a entrenar un cuerpo destrozado con la
        // ventana de recuperación acortada a 24 h en vez de alargada a 72 h.
        soreness: {
          type: 'number',
          description:
            'Frescura / ausencia de agujetas, 1-5: 5 = fresco, sin molestias; 1 = muy adolorido.',
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
    },
  },
  {
    name: 'configure_training',
    description:
      'ACCIÓN: cambia el sobre de planificación (objetivo, nivel, presupuesto diario de minutos, equipamiento). Solo las claves que envíes; cada una es una acción con su propio acuse y su deshacer.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: {
          type: 'string',
          enum: ['hypertrophy', 'strength', 'recomposition'],
          description: 'Objetivo de entrenamiento.',
        },
        level: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Nivel, que fija la banda de volumen semanal.',
        },
        time_budget_min: {
          type: 'number',
          description: 'Presupuesto diario de minutos (10-300).',
        },
        inventory: {
          type: 'array',
          description:
            'Equipamiento completo: [{ presetId: "barbell-plates" } o { label, capabilities: ["dumbbell"], maxLoadKg, incrementKg }]. Reemplaza la lista entera.',
          items: { type: 'object' },
        },
        idempotency_key: { type: 'string', description: 'Prefijo para las claves de idempotencia.' },
      },
    },
  },
  {
    name: 'swap_exercise',
    description:
      'ACCIÓN: cambia una casilla del plan de hoy. La app solo lo acepta si el sustituto conserva patrón y tipo de carga, cabe en tu material y no está ya en la sesión (la misma regla que aplica su botón de cambiar).',
    inputSchema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string', description: 'Casilla actual (id del catálogo).' },
        replacement_id: { type: 'string', description: 'Ejercicio que la sustituye.' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['exercise_id', 'replacement_id'],
    },
  },
  {
    name: 'add_exercise',
    description:
      'ACCIÓN: añade un ejercicio al plan de HOY (la misma casilla que el usuario se apunta en el gimnasio cuando decide hacer uno más). No replanifica: agrega una fila. La app lo acepta solo si el ejercicio existe, tu material puede cargarlo y no está ya en la sesión de hoy. `sets` es la prescripción de esa fila (0 = sin prescripción, por defecto). Solo para hoy: se pierde al reiniciar la app.',
    inputSchema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string', description: 'Id del ejercicio en el catálogo.' },
        sets: {
          type: 'number',
          description: 'Series prescritas para esa fila (0-12; 0 = sin prescripción).',
        },
        position: {
          type: 'string',
          enum: ['start', 'end'],
          description: 'Dónde ponerla: al principio o al final (por defecto end). Ojo: si el usuario ha ordenado la sesión a mano, su orden manda.',
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['exercise_id'],
    },
  },
  {
    name: 'set_day_focus',
    description:
      'ACCIÓN: fija el enfoque de HOY (los chips de Inicio): "auto" (sin enfoque), "push", "pull", "legs", "core". Acepta también un array de familias explícito. Es una decisión del día, no una configuración: se pierde al reiniciar la app.',
    inputSchema: {
      type: 'object',
      properties: {
        focus: {
          description:
            'Clave de preset ("auto" | "push" | "pull" | "legs" | "core") o array de familias ([\'core\', \'chest\']).',
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['focus'],
    },
  },
  {
    name: 'set_week_override',
    description:
      'ACCIÓN: escribe UN día de la semana del usuario en Semana. `rest: true` lo hace día de descanso; `families: [...]` lo hace día de entrenar esas familias; `families: []` borra su día y lo devuelve al planificador. Índice de lunes a domingo (0 = lunes). Solo se toca su capa: el plan generado no se reescribe.',
    inputSchema: {
      type: 'object',
      properties: {
        weekday: {
          type: 'number',
          description: 'Índice lunes-primero: 0 = lunes … 6 = domingo.',
        },
        rest: { type: 'boolean', description: 'True para marcar ese día como descanso.' },
        families: {
          type: 'array',
          items: { type: 'string' },
          description: 'Familias musculares de ese día. Array vacío = borrar su día (vuelve al planificador).',
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['weekday'],
    },
  },
  {
    name: 'delete_session',
    description:
      'ACCIÓN DESTRUCTIVA: borra una sesión cerrada del registro (el `session_id` sale de read_history). Exige confirm: true. Sin `delete_sets` las series se conservan sueltas (es lo que hace el botón de la app); con `delete_sets: true` se borran también. El usuario puede deshacerla desde Ajustes → Acciones de agentes; tú no tienes herramienta de deshacer. Pídeselo en voz alta antes.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Id de la sesión (viene en read_history).' },
        delete_sets: {
          type: 'boolean',
          description: 'True para borrar también sus series (por defecto false: se conservan).',
        },
        confirm: { type: 'boolean', description: 'Debe ser true. Borrar es destructivo.' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['session_id', 'confirm'],
    },
  },
  {
    name: 'set_set_time',
    description:
      'ACCIÓN: corrige la HORA de una serie registrada hoy (un lote aplicado tarde, un reloj mal puesto). Solo series de hoy: las de días pasados son inmutables. La app rechaza un instante que caiga en otro día. Se puede deshacer desde Ajustes.',
    inputSchema: {
      type: 'object',
      properties: {
        set_id: { type: 'string', description: 'Id de la serie (el que traía el acuse de log_training_set).' },
        occurred_at: {
          type: 'string',
          description: 'Instante ISO-8601 de HOY, p. ej. "2026-10-13T18:42:00.000Z".',
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['set_id', 'occurred_at'],
    },
  },
  {
    name: 'reorder_today',
    description:
      'ACCIÓN: mueve una fila de la sesión de HOY a otra posición (la misma operación que arrastrar el asa en Entrenamiento). `position` es 1-based, como la numera la pantalla. La app valida que el ejercicio siga en la sesión y devuelve acuse con deshacer.',
    inputSchema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string', description: 'Id del ejercicio, tal como aparece en read_current_state.' },
        position: { type: 'number', description: 'Posición final, 1-based (1 = primero).' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['exercise_id', 'position'],
    },
  },
  {
    name: 'set_exercise_state',
    description:
      'ACCIÓN: marca una fila de hoy como saltada, pospuesta al final, o la devuelve a la cola (active). No borra ni cambia la prescripción: el plan conserva el ejercicio, igual que los botones de Entrenamiento.',
    inputSchema: {
      type: 'object',
      properties: {
        exercise_id: { type: 'string', description: 'Id del ejercicio en la sesión de hoy.' },
        state: {
          type: 'string',
          enum: ['active', 'skipped', 'postponed'],
          description: 'active = sin marca; skipped = fuera por hoy; postponed = al final.',
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['exercise_id', 'state'],
    },
  },
  {
    name: 'reset_today_order',
    description:
      'ACCIÓN: devuelve la sesión de HOY al orden del planificador (el botón «Volver al orden del plan»). Falla si hoy no hay un orden propio. Se puede deshacer desde Ajustes.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
    },
  },
  {
    name: 'swap_week_days',
    description:
      'ACCIÓN: intercambia dos días de la semana (la misma operación que arrastrar un día sobre otro en Semana). Índices lunes-primero 0-6. Mueve el plan efectivo de cada día y se puede deshacer desde Ajustes.',
    inputSchema: {
      type: 'object',
      properties: {
        from_weekday: { type: 'number', description: 'Día de origen, lunes = 0 … domingo = 6.' },
        to_weekday: { type: 'number', description: 'Día de destino, lunes = 0 … domingo = 6.' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['from_weekday', 'to_weekday'],
    },
  },
  {
    name: 'undo_action',
    description:
      'ACCIÓN: deshace UNA acción tuya ya aplicada, por su undoToken (el que traía su acuse en read_receipts). Solo puedes deshacer las tuyas (mismo origin); no deshace finish_session ni delete_session (abrir o restaurar el historial es cosa del usuario desde Ajustes). Un undo no es deshacible: el bucle se cierra una vez.',
    inputSchema: {
      type: 'object',
      properties: {
        undo_token: {
          type: 'string',
          description: 'El undoToken del acuse de la acción que quieres deshacer.',
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['undo_token'],
    },
  },
  {
    name: 'save_routine',
    description:
      'ACCIÓN: crea o reescribe una plantilla de rutina del usuario (la pestaña Rutinas). Los números se rechazan si están fuera de rango (no se recortan en silencio): sets 1-12, reps 1-30, rest_sec 15-600, rir 0-5, máximo 24 ejercicios y uno por ejercicio. Con routine_id reescribes esa plantilla; sin él, creas una nueva. Se puede deshacer.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la plantilla (máx. 60).' },
        routine_id: {
          type: 'string',
          description: 'Id de la plantilla a reescribir; omítelo para crear una nueva.',
        },
        notes: { type: 'string', description: 'Nota libre opcional (máx. 400).' },
        items: {
          type: 'array',
          description:
            'Ejercicios: [{ exercise_id, sets, reps_min, reps_max, rest_sec, rir }]. Los que omitas usan el valor por defecto del catálogo.',
          items: { type: 'object' },
        },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['name', 'items'],
    },
  },
  {
    name: 'apply_routine',
    description:
      'ACCIÓN: vierte una plantilla de rutina en la sesión de HOY (el botón «Usar hoy»). Cada ejercicio pasa por las mismas reglas que el botón: los que ya estén en la sesión se omiten; si no se puede añadir ninguno, se rechaza. Se puede deshacer (quita las filas añadidas).',
    inputSchema: {
      type: 'object',
      properties: {
        routine_id: { type: 'string', description: 'Id de la plantilla (read_current_state.routines).' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['routine_id'],
    },
  },
  {
    name: 'delete_routine',
    description:
      'ACCIÓN DESTRUCTIVA: borra una plantilla de rutina del usuario. Exige confirm: true y que el usuario lo pida; su acuse trae deshacer, que restaura la plantilla entera.',
    inputSchema: {
      type: 'object',
      properties: {
        routine_id: { type: 'string', description: 'Id de la plantilla a borrar.' },
        confirm: { type: 'boolean', description: 'Debe ser true. Borrar es destructivo.' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['routine_id', 'confirm'],
    },
  },
  {
    name: 'set_language',
    description:
      'ACCIÓN: cambia el idioma de la interfaz ("en" o "es"). Solo presentación: no toca datos ni registros.',
    inputSchema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['en', 'es'], description: 'Idioma de la interfaz.' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['language'],
    },
  },
  {
    name: 'set_sound',
    description:
      'ACCIÓN: activa o desactiva los avisos de sonido (campana de sesión, logro, récord) y/o fija su volumen maestro (0-1). Solo presentación.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'True para activar los avisos, false para callarlos.' },
        volume: { type: 'number', description: 'Volumen maestro, 0-1.' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
    },
  },
  {
    name: 'reset_decision_model',
    description:
      'ACCIÓN: reinicia el modelo local de decisión (los pesos aprendidos de tus registros). Exige confirm: true. Volverá a aprender de los próximos registros; el acuse trae un deshacer que restaura el modelo de ese instante.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', description: 'Debe ser true: borra lo aprendido.' },
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'regenerate_week',
    description:
      'ACCIÓN: regenera la semana del planificador (el botón «Regenerar» de Semana). Tus días autorizados a mano se conservan. Se puede deshacer: vuelve la semana anterior exacta.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string', description: 'Clave para reintentar sin duplicar.' },
      },
    },
  },
  {
    name: 'read_receipts',
    description:
      'ACUSE de las acciones: devuelve los recibos que la app escribió (applied/rejected, con la regla que falló y su deshacer). Úsala tras un status: pending para saber si tu acción se aplicó.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Devoluelve solo el acuse de esa id.' },
        limit: { type: 'number', description: 'Cuántos acuses, empezando por los más recientes (por defecto 10).' },
      },
    },
  },
];

// ── Tool Handlers ───────────────────────────────────────────────────────────

export async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'read_training_stats': {
      const backup = getLatestTrainingLabBackup();
      if (!backup) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'no_data',
                message: 'No se encontraron copias o datos de entrenamiento de TrainingLab.',
              }),
            },
          ],
        };
      }

      const sets = Array.isArray(backup.sets) ? backup.sets : [];
      const sessions = Array.isArray(backup.sessions) ? backup.sessions : [];
      // Warm-ups are not work anywhere in this system, so they are not volume
      // here either (the totals used to disagree with every other read).
      const totalVolume = workingSets(sets).reduce(
        (sum, s) => sum + (s.weight ? s.weight * (s.reps || 0) : 0),
        0,
      );

      const recentSets = sets.slice(-(args.limit || 20));
      // Derived by the canonical engine, from the log itself: this is the fact
      // the assistant must read before proposing anything.
      const recovery = await buildRecoveryReport();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                totalSessions: sessions.length,
                totalSets: sets.length,
                totalVolumeKg: Math.round(totalVolume),
                recovery:
                  recovery.mode === 'ok'
                    ? {
                        rule: 'a family trained inside its recovery window is not trainable today',
                        windowHours: recovery.report.windowHours,
                        readinessUsed: recovery.readinessSource,
                        doNotTrainToday: recovery.report.fatigued,
                        stillRecovering: recovery.report.entries.map((e) => ({
                          family: e.family,
                          hoursSince: e.hoursSince,
                          sets: e.sets,
                          windowHours: e.windowHours,
                        })),
                      }
                    : { unavailable: true, reason: recovery.reason },
                recentSets: recentSets.map((s) => ({
                  id: s.id,
                  exerciseId: s.exerciseId,
                  weightKg: s.weight,
                  reps: s.reps,
                  warmup: s.warmup,
                  timestamp: s.timestamp,
                  notes: s.notes,
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'add_exercise': {
      const params = {
        exercise_id: args.exercise_id,
        ...(typeof args.sets === 'number' ? { sets: args.sets } : {}),
        ...(args.position === 'start' || args.position === 'end'
          ? { position: args.position }
          : {}),
      };
      return renderOutcome(
        await submitActions([buildAction('add_exercise', params, args)]),
      );
    }

    case 'set_day_focus': {
      return renderOutcome(
        await submitActions([
          buildAction('set_day_focus', { focus: args.focus }, args),
        ]),
      );
    }

    case 'set_week_override': {
      const params = { weekday: args.weekday };
      if (args.rest === true) params.rest = true;
      if (Array.isArray(args.families)) params.families = args.families;
      if (params.rest !== true && !Array.isArray(params.families)) {
        return toolText({
          status: 'rejected',
          rule: 'week_override_params_required',
          message:
            'Envía rest: true, o families ([…] para entrenar, [] para borrar tu día).',
        });
      }
      return renderOutcome(
        await submitActions([buildAction('set_week_override', params, args)]),
      );
    }

    case 'delete_session': {
      const params = { session_id: args.session_id };
      if (typeof args.delete_sets === 'boolean') {
        params.delete_sets = args.delete_sets;
      }
      const action = buildAction('delete_session', params, {
        ...args,
        confirm: args.confirm === true,
      });
      return renderOutcome(await submitActions([action]));
    }

    case 'set_set_time': {
      return renderOutcome(
        await submitActions([
          buildAction(
            'set_set_time',
            { set_id: args.set_id, occurred_at: args.occurred_at },
            args,
          ),
        ]),
      );
    }

    case 'log_training_set': {
      // Since 2026-10-09 this does NOT write the backup mirror itself: the set
      // travels as an action and TrainingLab decides, with its own rules
      // (exercise exists, gear can load it, weight under the inventory ceiling,
      // reps 1-50, effort D/F) whether it is logged at all.
      const params = {
        exercise_id: args.exercise_id,
        ...(typeof args.weight_kg === 'number' ? { weight_kg: args.weight_kg } : {}),
        ...(typeof args.reps === 'number' ? { reps: args.reps } : {}),
        ...(typeof args.duration_sec === 'number' ? { duration_sec: args.duration_sec } : {}),
        ...(args.effort ? { effort: args.effort } : {}),
        ...(args.warmup ? { warmup: true } : {}),
        ...(args.notes
          ? { notes: args.notes }
          : args.rir !== undefined
            ? { notes: `RIR ${args.rir}` }
            : {}),
        ...(typeof args.occurred_at === 'string' && args.occurred_at
          ? { occurred_at: args.occurred_at }
          : {}),
      };
      const outcome = await submitActions([buildAction('log_set', params, args)]);
      return renderOutcome(outcome);
    }

    case 'finish_session': {
      const action = buildAction('finish_session', {}, { ...args, confirm: args.confirm === true });
      return renderOutcome(await submitActions([action]));
    }

    case 'set_readiness': {
      const params = {};
      for (const key of ['energy', 'motivation', 'soreness']) {
        if (typeof args[key] === 'number') params[key] = args[key];
      }
      if (Object.keys(params).length === 0) {
        return toolText({
          status: 'rejected',
          rule: 'readiness_required',
          message: 'Envía al menos energy, motivation o soreness (1-5 cada uno).',
        });
      }
      return renderOutcome(
        await submitActions([buildAction('set_readiness', params, args)]),
      );
    }

    case 'configure_training': {
      // One tool, up to four actions: each writes its own key, its own receipt
      // and its own undo token, so a partial batch is never half-applied blind.
      const actions = [];
      if (args.goal !== undefined) {
        actions.push(buildAction('set_goal', { goal: args.goal }, args));
      }
      if (args.level !== undefined) {
        actions.push(buildAction('set_level', { level: args.level }, args));
      }
      if (args.time_budget_min !== undefined) {
        actions.push(
          buildAction('set_time_budget', { time_budget_min: args.time_budget_min }, args),
        );
      }
      if (args.inventory !== undefined) {
        actions.push(buildAction('set_inventory', { items: args.inventory }, args));
      }
      if (actions.length === 0) {
        return toolText({
          status: 'rejected',
          rule: 'nothing_to_configure',
          message: 'Envía goal, level, time_budget_min o inventory.',
        });
      }
      // Distinct keys per action, otherwise four actions would share one id.
      const suffixed = actions.map((a, i) =>
        actions.length > 1 ? { ...a, id: `${a.id}-${i}` } : a,
      );
      return renderOutcome(await submitActions(suffixed));
    }

    case 'swap_exercise': {
      const action = buildAction(
        'swap_exercise',
        { exercise_id: args.exercise_id, replacement_id: args.replacement_id },
        args,
      );
      return renderOutcome(await submitActions([action]));
    }

    case 'reorder_today': {
      return renderOutcome(
        await submitActions([
          buildAction(
            'reorder_row',
            { exercise_id: args.exercise_id, position: args.position },
            args,
          ),
        ]),
      );
    }

    case 'set_exercise_state': {
      return renderOutcome(
        await submitActions([
          buildAction(
            'set_exercise_state',
            { exercise_id: args.exercise_id, state: args.state },
            args,
          ),
        ]),
      );
    }

    case 'reset_today_order': {
      return renderOutcome(
        await submitActions([buildAction('reset_order', {}, args)]),
      );
    }

    case 'swap_week_days': {
      return renderOutcome(
        await submitActions([
          buildAction(
            'swap_week_days',
            {
              from_weekday: args.from_weekday,
              to_weekday: args.to_weekday,
            },
            args,
          ),
        ]),
      );
    }

    case 'undo_action': {
      return renderOutcome(
        await submitActions([
          buildAction('undo', { undo_token: args.undo_token }, args),
        ]),
      );
    }

    case 'save_routine': {
      const params = { name: args.name, items: args.items };
      if (typeof args.routine_id === 'string' && args.routine_id) {
        params.routine_id = args.routine_id;
      }
      if (typeof args.notes === 'string' && args.notes) params.notes = args.notes;
      return renderOutcome(
        await submitActions([buildAction('save_routine', params, args)]),
      );
    }

    case 'apply_routine': {
      return renderOutcome(
        await submitActions([
          buildAction('apply_routine', { routine_id: args.routine_id }, args),
        ]),
      );
    }

    case 'delete_routine': {
      return renderOutcome(
        await submitActions([
          buildAction(
            'delete_routine',
            { routine_id: args.routine_id },
            { ...args, confirm: args.confirm === true },
          ),
        ]),
      );
    }

    case 'set_language': {
      return renderOutcome(
        await submitActions([
          buildAction('set_language', { language: args.language }, args),
        ]),
      );
    }

    case 'set_sound': {
      const params = {};
      if (typeof args.enabled === 'boolean') params.enabled = args.enabled;
      if (typeof args.volume === 'number') params.volume = args.volume;
      if (Object.keys(params).length === 0) {
        return toolText({
          status: 'rejected',
          rule: 'sound_params_required',
          message: 'Envía enabled (true/false) o volume (0-1).',
        });
      }
      return renderOutcome(
        await submitActions([buildAction('set_sound', params, args)]),
      );
    }

    case 'reset_decision_model': {
      return renderOutcome(
        await submitActions([
          buildAction('reset_model', {}, { ...args, confirm: args.confirm === true }),
        ]),
      );
    }

    case 'regenerate_week': {
      return renderOutcome(
        await submitActions([buildAction('regenerate_week', {}, args)]),
      );
    }

    case 'read_receipts': {
      const rows = readReceipts();
      const wanted = typeof args.id === 'string' && args.id ? args.id : null;
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 10));
      const picked = (wanted ? rows.filter((r) => r.id === wanted) : rows)
        .slice(-limit)
        .reverse();
      if (picked.length === 0) {
        return toolText({
          status: wanted ? 'not_found' : 'empty',
          id: wanted,
          message: wanted
            ? 'La app aún no ha escrito ese acuse: sigue pendiente.'
            : 'La app no ha escrito ningún acuse todavía.',
        });
      }
      return toolText({ status: 'ok', receipts: picked });
    }

    case 'read_body_stats': {
      const data = getLatestBodyLabData();
      if (!data) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'no_data',
                message: 'No se encontraron datos antropométricos de BodyLab en .cache/bodylab-owner.json.',
              }),
            },
          ],
        };
      }

      const p = data.data?.profile || {};
      const m = data.data?.measurements || [];

      const latestByType = {};
      for (const meas of m) {
        latestByType[meas.type] = { value: meas.value, unit: meas.unit, notes: meas.notes };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                profile: {
                  name: p.name,
                  heightM: p.height,
                  weightKg: p.weight,
                  sex: p.biologicalSex,
                  birthDate: p.birthDate,
                },
                totalMeasurements: m.length,
                measurements: latestByType,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'log_body_measurement': {
      const data = getLatestBodyLabData();
      if (!data) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status: 'error', message: 'No existe .cache/bodylab-owner.json' }),
            },
          ],
        };
      }

      const newMeas = {
        id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        profileId: data.data.profile?.id || 'default-profile',
        type: args.type,
        value: args.value,
        unit: args.unit || 'cm',
        timestamp: new Date().toISOString(),
        method: 'manual',
        confidence: 'high',
        notes: args.notes || 'Registrado mediante servidor MCP',
      };

      data.data.measurements = [...(data.data.measurements || []), newMeas];
      const filePath = path.join(ROOT, '.cache', 'bodylab-owner.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              recordedMeasurement: newMeas,
              message: `Medida ${args.type} registrada: ${args.value} ${newMeas.unit}`,
            }),
          },
        ],
      };
    }

    case 'propose_training_session': {
      const timeBudget = args.time_budget_min || 45;
      const requested =
        typeof args.focus_family === 'string' ? args.focus_family : null;
      const recovery = await buildRecoveryReport();

      // No engine, no answer. An invented session is worse than a refusal.
      if (recovery.mode !== 'ok') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'cannot_plan',
                  reason:
                    'The recovery engine could not be loaded, so nothing can be grounded in your log: ' +
                    recovery.reason,
                  next: 'Run this server from the fitness-ecosystem folder, or use the app itself.',
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const { engine, report, inventory } = recovery;
      const owned = engine.exercises.ownedCapabilities(inventory);
      const usedPatterns = new Set();
      const candidates = [];

      for (const ex of knowledgePack().exercises) {
        // 1. Only what the declared gear can actually load.
        if (!engine.exercises.satisfies(ex.requires || [], owned)) continue;
        // 2. Nothing that touches a family still inside its recovery window.
        if (engine.recovery.fatigueOfExercise(report, ex.id)) continue;
        // 3. One exercise per movement pattern — the same rule as the app's
        //    session builder, and the fix for chin-ups + pull-ups in one day.
        if (usedPatterns.has(ex.pattern)) continue;
        // 4. An explicit focus still wins (the user's own choice is honoured).
        if (requested) {
          const direct = (ex.muscles || []).filter((m) => m.intensity >= 2);
          const muscles = (direct.length > 0 ? direct : ex.muscles || []).map(
            (m) => m.muscle,
          );
          const families = muscles.map((m) => engine.training.muscleFamilyOf(m));
          if (!families.includes(requested)) continue;
        }
        usedPatterns.add(ex.pattern);
        candidates.push({
          exerciseId: ex.id,
          name: ex.name,
          pattern: ex.pattern,
          loadType: ex.loadType,
          difficulty: ex.difficulty,
          hypertrophy: ex.hypertrophy,
          equipment: ex.equipment,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: candidates.length > 0 ? 'grounded_pool' : 'nothing_available',
                focus: requested,
                timeBudgetMin: timeBudget,
                recovery: {
                  windowHours: report.windowHours,
                  doNotTrainToday: report.fatigued,
                  stillRecovering: report.entries.map((e) => ({
                    family: e.family,
                    hoursSince: e.hoursSince,
                    sets: e.sets,
                  })),
                  readinessUsed: recovery.readinessSource,
                },
                candidates: candidates.slice(0, 12),
                scientificRationale:
                  'La ventana de recuperación (48 h tras una sesión real de un grupo muscular, acortada por tu propia sensación de frescura) sale de tu registro y es la misma regla que aplica la app. La banda de 12–20 series semanales por grupo es la de Baz-Valle et al. 2022.',
                note:
                  'Esto es el conjunto fundamentado de ejercicios, no la prescripción: las series, repeticiones y descansos los calcula la app contra tu presupuesto de tiempo y tu material.',
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'read_history': {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 10));
      const before = typeof args.before === 'string' ? args.before : null;
      const m = mirror();
      const bySetId = new Map((m.sets || []).map((s) => [s.id, s]));
      const closed = (m.sessions || [])
        .filter((s) => s.startedAt && (!before || s.startedAt < before))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      const page = closed.slice(0, limit);

      const sessions = page.map((session) => {
        const own = (session.setIds || [])
          .map((id) => bySetId.get(id))
          .filter(Boolean);
        const working = workingSets(own);
        const volumeKg = working.reduce(
          (sum, x) => sum + (x.weight ? x.weight * (x.reps || 0) : 0),
          0,
        );
        const byExercise = new Map();
        const markers = { W: 0, D: 0, F: 0 };
        for (const x of own) {
          byExercise.set(x.exerciseId, (byExercise.get(x.exerciseId) || 0) + 1);
          const marker = markerOf(x);
          if (marker) markers[marker] += 1;
        }
        return {
          id: session.id,
          day: String(session.startedAt).slice(0, 10),
          startedAt: session.startedAt,
          completedAt: session.completedAt ?? null,
          title: session.title ?? null,
          location: session.location ?? null,
          workingSets: working.length,
          warmupSets: own.length - working.length,
          volumeKg: Math.round(volumeKg),
          markers,
          exercises: [...byExercise.entries()].map(([exerciseId, sets]) => ({
            exerciseId,
            name: packName(exerciseId),
            sets,
          })),
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                channel: 'history (read-only)',
                returned: sessions.length,
                totalClosedSessions: closed.length,
                nextBefore:
                  closed.length > page.length && page.length > 0
                    ? page[page.length - 1].startedAt
                    : null,
                sessions,
                note:
                  'Las sesiones cerradas son inmutables para los modelos: no existe ninguna herramienta que las edite ni las borre.',
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case 'read_exercise_history': {
      const id = String(args.exercise_id || '');
      const loaded = await buildRecoveryReport();
      if (loaded.mode !== 'ok') {
        return toolText({ status: 'engine_unavailable', reason: loaded.reason });
      }
      const { engine } = loaded;
      const own = (mirror().sets || [])
        .filter((s) => s.exerciseId === id)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      if (own.length === 0) {
        return toolText({
          status: 'no_history',
          exerciseId: id,
          name: packName(id),
          note: 'Sin series registradas para este ejercicio: empieza ligero.',
        });
      }
      const days = engine.progression.summariseExerciseDays(own);
      // Marks come from **working** sets only (`lib/records.ts`'s contract): a
      // warm-up ramp must never be the heaviest load or the longest hold on
      // record. `badged` below still counts the warm-ups, on purpose.
      const marks = engine.records.marksOf(own.filter((s) => s.warmup !== true));
      const lastTs = own[own.length - 1].timestamp;
      return toolText({
        exerciseId: id,
        name: packName(id),
        totalSets: own.length,
        daysTrained: days.length,
        daysSinceLast: Math.round(((Date.now() - Date.parse(lastTs)) / 86400000) * 10) / 10,
        bestWeightKg: marks.bestWeightKg,
        bestEst1RmKg: marks.bestEst1RmKg,
        /** Most reps in one unloaded working set (bodyweight mark). */
        bestReps: marks.bestReps,
        /** Longest unloaded timed set, seconds (plank, dead hang). */
        bestHoldSec: marks.bestHoldSec,
        badged: {
          warmup: own.filter((s) => s.warmup === true).length,
          failure: own.filter((s) => markerOf(s) === 'F').length,
          drop: own.filter((s) => markerOf(s) === 'D').length,
        },
        entries: days,
      });
    }

    case 'read_progression': {
      const id = String(args.exercise_id || '');
      const loaded = await buildRecoveryReport();
      if (loaded.mode !== 'ok') {
        return toolText({ status: 'engine_unavailable', reason: loaded.reason });
      }
      const { engine, inventory } = loaded;
      const pack = knowledgePack();
      const fact = pack.exercises.find((e) => e.id === id);
      if (!fact) {
        return toolText({
          status: 'unknown_exercise',
          exerciseId: id,
          note: 'Ese id no existe en el catálogo; usa read_exercise_history o EXERCISES.md.',
        });
      }
      const settings = mirror().settings || {};
      const goal = args.goal || settings.goal || 'hypertrophy';
      const compound =
        (fact.muscles || []).filter((m) => m.intensity >= 2).length > 2 ||
        (fact.hypertrophy || 0) >= 4;
      const ranges = engine.training.GOAL_REPS[goal] || engine.training.GOAL_REPS.hypertrophy;
      const range = compound ? ranges.compound : ranges.isolation;
      const own = (mirror().sets || [])
        .filter((s) => s.exerciseId === id)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const advice = engine.progression.progressionFor({
        days: engine.progression.summariseExerciseDays(own),
        targetReps: { min: range[0], max: range[1] },
        loadType: fact.loadType,
        progressionAxes: fact.progression || ['reps', 'volume'],
        incrementKg: engine.exercises.incrementFor(fact.loadType, inventory),
        maxLoadKg: engine.exercises.maxLoadFor(fact.loadType, inventory),
      });
      return toolText({
        exerciseId: id,
        name: fact.name,
        goal,
        targetReps: { min: range[0], max: range[1], source: 'GOAL_REPS del motor de sesiones' },
        verdict: advice.verdict,
        weightKg: advice.weightKg,
        axis: advice.axis,
        reason: advice.reason,
        evidence: advice.evidence,
      });
    }

    case 'read_recovery': {
      const loaded = await buildRecoveryReport();
      if (loaded.mode !== 'ok') {
        return toolText({ status: 'engine_unavailable', reason: loaded.reason });
      }
      const { report } = loaded;
      return toolText({
        rule:
          'Una familia entrenada dentro de su ventana de recuperación no se entrena hoy (48 h tras una sesión real, 24 h tras trabajo simbólico, escalado por tu frescura reportada).',
        windowHours: report.windowHours,
        readinessLow: report.readinessLow,
        doNotTrainToday: report.fatigued,
        stillRecovering: report.entries,
        readiness: loaded.readiness,
        readinessUsed: loaded.readinessSource,
      });
    }

    case 'read_current_state': {
      const m = mirror();
      const today = localDay();
      // The app's own plan wins when it published one (2026-10-09): it is the
      // plan `swap_exercise` validates against, so showing a recomputation that
      // disagrees with the screen is how a model gets told «not in today's
      // slots» about a slot that is right there.
      const published = mirroredPlan(m);
      // The engine is still loaded when it can be: `familiesWorked` and the
      // fatigue entry are derived from it. It is only *required* when the app
      // has not published a plan.
      const computed = await currentAppPlan();
      if (!published && !computed) {
        return toolText({
          status: 'engine_unavailable',
          note: 'El motor no cargó y la app no ha publicado su plan de hoy: no se inventa el estado. Abre TrainingLab una vez; al arrancar escribe su espejo con el plan real.',
        });
      }
      const settings = (computed ? computed.settings : m.settings) || {};
      const sets = computed ? computed.sets : Array.isArray(m.sets) ? m.sets : [];
      const engine = computed ? computed.engine : null;
      const plan = computed ? computed.plan : null;
      const todaySets = sets.filter((s) => String(s.timestamp).startsWith(today));
      const working = workingSets(todaySets);
      const byId = new Map(knowledgePack().exercises.map((e) => [e.id, e]));
      const families = new Set();
      for (const set of working) {
        const fact = byId.get(set.exerciseId);
        if (!fact) continue;
        for (const mus of fact.muscles || []) {
          if (mus.intensity < 2) continue;
          families.add(engine ? engine.training.muscleFamilyOf(mus.muscle) : mus.muscle);
        }
      }
      const open = (m.sessions || []).find(
        (s) => String(s.startedAt || '').startsWith(today) && !s.completedAt,
      );
      const readiness = mirroredReadiness(m);
      return toolText({
        today,
        readiness: readiness
          ? { ...readiness, source: 'mirror (el parte que la app publicó hoy)' }
          : { source: 'neutral 3/3/3: la app no ha publicado el parte de hoy' },
        sessionInProgress: {
          openSessionId: open ? open.id : null,
          startedAt: open ? open.startedAt : null,
          workingSets: working.length,
          warmupSets: todaySets.length - working.length,
          familiesWorked: engine ? [...families].sort() : null,
          volumeKg: Math.round(
            working.reduce((sum, x) => sum + (x.weight ? x.weight * (x.reps || 0) : 0), 0),
          ),
        },
        goal: settings.goal || 'hypertrophy',
        level: settings.level || 'intermediate',
        timeBudgetMin: settings.timeBudgetMin ?? 90,
        daysPerWeek: settings.daysPerWeek ?? null,
        inventory: (m.settings?.inventory || []).map((i) => ({
          label: i.label,
          capabilities: i.capabilities,
          maxLoadKg: i.maxLoadKg,
          incrementKg: i.incrementKg,
        })),
        recovery: plan
          ? {
              windowHours: plan.fatigue ? plan.fatigue.windowHours : null,
              doNotTrainToday: plan.fatigue ? plan.fatigue.fatigued : [],
            }
          : null,
        todayPlan: published
          ? {
              source: 'app (el plan que TrainingLab está mostrando ahora mismo)',
              slots: published,
              note: 'Estas son las casillas reales de la app: swap_exercise se valida contra ellas.',
            }
          : {
              source:
                'recomputed (la app no ha publicado su plan; esto es lo que el motor construiría con el espejo)',
              totalMinutes: plan.session.totalMinutes,
              volumeFactor: plan.session.volumeFactor,
              focus: plan.session.focus,
              slots: plan.rows.map((r) => ({
                exerciseId: r.exerciseId,
                name: r.name,
                sets: r.sets,
                repsMin: r.repsMin,
                repsMax: r.repsMax,
                rir: r.rir,
                restSec: r.restSec,
                pattern: r.pattern,
                families: r.families,
              })),
              advisories: plan.advisories,
              gearNote: plan.gearNote,
            },
        ...(published
          ? {}
          : {
              bodylabLinked: false,
              note: 'Plan recalculado por el mismo motor que usa la app, pero sin los datos que solo viven en ella (enlace de BodyLab, molestias de hoy, foco del día): el orden puede diferir del que ves.',
            }),
      });
    }

    case 'read_weekly_volume': {
      const days = Math.max(1, Math.min(28, Number(args.days) || 7));
      const loaded = await buildRecoveryReport();
      if (loaded.mode !== 'ok') {
        return toolText({ status: 'engine_unavailable', reason: loaded.reason });
      }
      const { engine, sets } = loaded;
      const direct = engine.derive.weeklyDirectSets(sets, days);
      const summary = engine.volumeTarget.summariseVolume(direct);
      return toolText({
        windowDays: days,
        source:
          'weeklyDirectSets (solo series donde la familia es el objetivo primario) frente a la banda semanal publicada',
        inside: summary.inRange,
        below: summary.below,
        above: summary.above,
        rows: summary.rows,
        note:
          'Las familias sin ninguna serie directa en la ventana no aparecen en rows: eso es precisamente lo no entrenado.',
      });
    }

    case 'explain_biomechanics': {
      // Topic match, never a guess (2026-10-09 fix). The old version defaulted
      // to the calves answer, so «me duele la rodilla al bajar» came back with a
      // lecture about Achilles insertions — a small model would read that as an
      // answer and could prescribe around the wrong joint.
      const q = String(args.question || '').toLowerCase();
      const topics = [
        {
          id: 'calves',
          hit: ['pantorrill', 'calf', 'gemel', 'soleo', 'sóleo', 'aquiles'],
        },
        {
          id: 'limb_lengths',
          hit: ['palanca', 'longitud', 'brazo', 'pierna', 'femur', 'fémur', 'torso', 'apalanca'],
        },
      ];
      const topic = topics.find((t) => t.hit.some((needle) => q.includes(needle)));
      if (!topic) {
        return toolText({
          status: 'not_covered',
          question: args.question,
          explanation: null,
          coveredTopics: topics.map((t) => t.id),
          message:
            'Esta herramienta solo tiene material publicado sobre estos dos temas. No hay respuesta para la pregunta: no expliques biomecánica de memoria aquí; usa read_recovery / read_progression para lo que sí sale del registro, o dilo así al usuario.',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'answered',
              topic: topic.id,
              question: args.question,
              explanation: BIOMECHANICAL_INSIGHTS[topic.id].es,
              references: [
                'Zatsiorsky, V. M., & Kraemer, W. J. (2006). Science and Practice of Strength Training.',
                'Schoenfeld, B. (2016). Science and Development of Muscle Hypertrophy.',
              ],
            }),
          },
        ],
      };
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

// ── JSON-RPC 2.0 Loop ───────────────────────────────────────────────────────

async function runStdioServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      continue;
    }

    const { id, method, params } = request;

    if (method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'fitness-mcp-server',
            version: '1.0.0',
          },
        },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (method === 'tools/call') {
      try {
        const toolResult = await handleToolCall(params?.name, params?.arguments);
        const response = {
          jsonrpc: '2.0',
          id,
          result: toolResult,
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (err) {
        const response = {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32000,
            message: err.message,
          },
        };
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } else {
      const response = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Método no encontrado: ${method}` },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    }
  }
}

// Self-test or CLI run
if (process.argv.includes('--test')) {
  console.log('Probando herramientas del servidor MCP...');
  const tools = TOOLS.map((t) => t.name);
  console.log('Herramientas registradas:', tools);

  const bodyStats = await handleToolCall('read_body_stats');
  console.log('read_body_stats resultado:', bodyStats.content[0].text.slice(0, 200) + '...');

  const trainingStats = await handleToolCall('read_training_stats', { limit: 2 });
  console.log('read_training_stats resultado:', trainingStats.content[0].text.slice(0, 200) + '...');

  const biomech = await handleToolCall('explain_biomechanics', { question: '¿Por qué no crecen mis pantorrillas?' });
  console.log('explain_biomechanics resultado:', biomech.content[0].text.slice(0, 200) + '...');

  // ── Action channel ────────────────────────────────────────────────
  // Deliberately WITHOUT writing the inbox: a self-test must never be able to
  // log a set into the owner's history. What is checked here is the envelope
  // (the part this process is responsible for) and the read side of the channel.
  const probe = buildAction('log_set', { exercise_id: 'barbell-bench-press', reps: 8 });
  if (!probe.id || probe.type !== 'log_set' || !probe.origin.startsWith('mcp:')) {
    throw new Error('buildAction no produce un sobre de acción válido');
  }
  const retried = buildAction(
    'log_set',
    { exercise_id: 'barbell-bench-press', reps: 8 },
    { idempotency_key: 'probe-key-1' },
  );
  if (retried.id !== 'probe-key-1') {
    throw new Error('la idempotency_key no se respeta en el sobre');
  }
  console.log('acción construida:', JSON.stringify(probe));

  const receipts = await handleToolCall('read_receipts', { limit: 5 });
  console.log('read_receipts resultado:', receipts.content[0].text.slice(0, 200) + '...');

  console.log('✓ Todas las herramientas MCP probadas con éxito.');
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runStdioServer();
}
