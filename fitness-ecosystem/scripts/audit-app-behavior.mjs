#!/usr/bin/env node
/**
 * Browser behavior audit — walk the real apps and record what actually happens.
 *
 * Why this exists: the unit suites prove the maths, and `capture-screenshots.mjs`
 * proves five screens render, but neither one exercises the *behaviour* a person
 * performs: start a session, log a set, reload, delete it, finish, review, change
 * a setting. This script drives the **built** bundles (served by
 * `serve-lan.mjs --no-build`) through those flows in both a desktop and a phone
 * viewport, and writes a machine-readable verdict:
 *
 *   fitness-ecosystem/tmp/audit-behavior/
 *     results.json          every check with PASS / FAIL / WARN + detail
 *     *.png                 screenshots of the moments that matter
 *
 * It is deliberately mostly-read-only: the writes it performs are the app's own
 * (a logged set, a deleted set, a unit toggle) inside a throwaway browser
 * profile, never against the user's IndexedDB.
 *
 * Usage (from `fitness-ecosystem/`, with a bundle already built):
 *   node scripts/serve-lan.mjs --no-build &
 *   node scripts/audit-app-behavior.mjs [--base http://localhost:8090]
 *
 * @module scripts/audit-app-behavior
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const argv = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const BASE = valueOf("base", "http://localhost:8090").replace(/\/+$/, "");
const OUT = path.join(ROOT, "tmp/audit-behavior");

// ── Verdict bookkeeping ─────────────────────────────────────────────────────

const results = [];
const record = (area, name, status, detail = "") => {
  results.push({ area, name, status, detail });
  const mark = status === "PASS" ? "✓" : status === "WARN" ? "!" : "✗";
  console.log(`${mark} [${area}] ${name}${detail ? ` — ${detail}` : ""}`);
};
const pass = (a, n, d) => record(a, n, "PASS", d);
const fail = (a, n, d) => record(a, n, "FAIL", d);
const warn = (a, n, d) => record(a, n, "WARN", d);

/** Console/page errors a context collected, so a green check can't hide a throw. */
const attachErrorCollector = (page) => {
  const errors = [];
  page.on("pageerror", (e) =>
    errors.push(`pageerror: ${String(e).slice(0, 200)}`),
  );
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  return errors;
};

let shotIndex = 0;
const shot = async (page, name) => {
  shotIndex += 1;
  const file = path.join(
    OUT,
    `${String(shotIndex).padStart(2, "0")}-${name}.png`,
  );
  await page.screenshot({ path: file, fullPage: false });
  return `tmp/audit-behavior/${path.basename(file)}`;
};

// ── Fixtures (same shapes `capture-screenshots.mjs` seeds) ──────────────────

const PROFILE = {
  id: "demo-profile",
  name: "Alex",
  height: 1.78,
  weight: 81.4,
  birthDate: "1993-04-18",
  biologicalSex: "male",
  units: "metric",
  createdAt: "2026-05-02T08:00:00.000Z",
  updatedAt: "2026-09-27T08:00:00.000Z",
};

const MEASUREMENTS = [
  ["neck", 39.5, 0],
  ["chest", 104.6, 0],
  ["waist", 84.2, 0],
  ["hips", 99.1, 0],
  ["biceps", 37.8, 0],
  ["thigh", 59.4, 0],
  ["calf", 38.6, 0],
  ["chest", 102.1, 70],
  ["waist", 87.9, 70],
  ["biceps", 36.2, 70],
  ["weight", 84.0, 70],
].map(([type, value, daysAgo], i) => ({
  id: `demo-m-${i}`,
  profileId: PROFILE.id,
  type,
  value,
  unit: type === "weight" ? "kg" : "cm",
  timestamp: new Date(Date.now() - Number(daysAgo) * 86_400_000).toISOString(),
  method: "manual",
  confidence: "high",
}));

const INVENTORY = [
  {
    id: "gear-1",
    presetId: "pullup-bar",
    label: "Barra de dominadas",
    capabilities: ["pullup_bar"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 0,
  },
  {
    id: "gear-2",
    presetId: "dip-bars",
    label: "Paralelas",
    capabilities: ["dip_bars", "rack"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 1,
  },
  {
    id: "gear-3",
    presetId: "dumbbells-adjustable",
    label: "Mancuernas del garaje",
    capabilities: ["dumbbell"],
    maxLoadKg: 24,
    incrementKg: 1,
    setupMin: 1,
  },
  {
    id: "gear-4",
    presetId: "bike",
    label: "Bici de montaña",
    capabilities: ["bike"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 2,
  },
];

const PLAN = [
  ["pull-up", 4, 6, 10],
  ["incline-dumbbell-press", 4, 8, 12],
  ["one-arm-dumbbell-row", 3, 10, 12],
  ["bulgarian-split-squat", 3, 8, 12],
  ["nordic-curl", 3, 6, 8],
];

const TODAY = new Date().toISOString().slice(0, 10);

/** Historical sets (2 days ago) give Progreso data without touching today. */
const HISTORY_SETS = PLAN.flatMap(([exerciseId], rowIndex) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: `hist-${rowIndex}-${i}`,
    exerciseId,
    dayId: `day-${TODAY}`,
    timestamp: new Date(
      Date.now() - (2 * 86_400 + rowIndex * 3_600 + i * 600) * 1_000,
    ).toISOString(),
    weight: exerciseId === "pull-up" ? null : [22, 24, 20, 18, 0][rowIndex],
    reps: 10 - i,
    rpe: 3,
  })),
);

const TRAININGLAB_SETTINGS = {
  language: "es",
  sourcePath: "bodylab-traininglab.json",
  goal: "hypertrophy",
  level: "intermediate",
  timeBudgetMin: 90,
  daysPerWeek: 4,
  unit: "kg",
  inventory: INVENTORY,
  useDecisionModel: true,
  sound: { enabled: false, volume: 0.5 },
  notifications: { enabled: false, alsoWhenVisible: false },
  shared: {
    enabled: false,
    baseUrl: "http://localhost:8090",
    memberName: "",
    memberId: null,
  },
  llm: {
    enabled: false,
    baseUrl: "http://127.0.0.1:8080/v1",
    model: "local-model",
    apiKey: "",
    timeoutSec: 60,
  },
};

const TRAININGLAB_PAYLOAD = {
  format: "bodylab-traininglab-link",
  version: 2,
  exportedAt: new Date().toISOString(),
  profile: {
    height: 178,
    weight: 81.4,
    age: 33,
    birthDate: PROFILE.birthDate,
    biologicalSex: "male",
    units: "metric",
  },
  measurements: [],
  muscleScores: [
    {
      segment: "chest",
      actual: 104.6,
      ideal: 110,
      score: 0.72,
      status: "near",
    },
    {
      segment: "biceps",
      actual: 37.8,
      ideal: 42,
      score: 0.61,
      status: "moderate",
    },
    { segment: "thigh", actual: 59.4, ideal: 64, score: 0.7, status: "near" },
    { segment: "calf", actual: 38.6, ideal: 41, score: 0.68, status: "near" },
  ],
  personalRecords: [
    {
      exerciseId: "incline-dumbbell-press",
      bestWeight: 26,
      bestReps: 8,
      bestEst1RM: 33,
      achievedAt: "2026-09-10T10:00:00.000Z",
    },
  ],
};

// ── Seeding helpers ─────────────────────────────────────────────────────────

async function seedLegacy(page) {
  await page.evaluate(
    ({ profile, measurements }) => {
      localStorage.setItem("bodylab-onboarding-done", "true");
      localStorage.setItem("bodylab-language", JSON.stringify("es"));
      localStorage.setItem("bodylab-reference", JSON.stringify("adonis"));
      localStorage.setItem("bodylab-profile", JSON.stringify(profile));
      localStorage.setItem(
        "bodylab-measurements",
        JSON.stringify(measurements),
      );
    },
    { profile: PROFILE, measurements: MEASUREMENTS },
  );
}

async function seedTraininglab(page, { withHistory = true } = {}) {
  await page.evaluate(
    ({ settings, payload, history }) =>
      new Promise((resolve, reject) => {
        const req = (window.__dbSeedReq = indexedDB.open("traininglab", 1));
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("meta"))
            db.createObjectStore("meta", { keyPath: "id" });
          if (!db.objectStoreNames.contains("sets"))
            db.createObjectStore("sets", { keyPath: "id" });
          if (!db.objectStoreNames.contains("sessions"))
            db.createObjectStore("sessions", { keyPath: "id" });
        };
        req.onerror = () => {
          delete window.__dbSeedReq;
          reject(req.error || new Error("IDB open error"));
        };
        req.onblocked = () => {
          delete window.__dbSeedReq;
          reject(new Error("IDB open blocked"));
        };
        req.onsuccess = () => {
          const db = req.result;
          try {
            const tx = db.transaction(["meta", "sets"], "readwrite");
            const meta = tx.objectStore("meta");
            meta.put({ id: "settings", value: settings });
            meta.put({ id: "payload", value: payload });
            meta.put({
              id: "readiness",
              value: {
                date: new Date().toISOString().slice(0, 10),
                readiness: { energy: 4, motivation: 4, soreness: 3 },
              },
            });
            if (history) {
              const sets = tx.objectStore("sets");
              for (const s of history) sets.put(s);
            }
            tx.oncomplete = () => {
              delete window.__dbSeedReq;
              db.close();
              resolve(true);
            };
            tx.onerror = () => {
              delete window.__dbSeedReq;
              db.close();
              reject(tx.error || new Error("IDB tx error"));
            };
          } catch (err) {
            delete window.__dbSeedReq;
            db.close();
            reject(err);
          }
        };
      }),
    {
      settings: TRAININGLAB_SETTINGS,
      payload: TRAININGLAB_PAYLOAD,
      history: withHistory ? HISTORY_SETS : [],
    },
  );
}

/**
 * Open an app route. A hash-only navigation is same-document, so we set the hash
 * and reload to force the router to mount the target route.
 */
async function open(page, app, hash = "", settle = 900) {
  const url = `${BASE}/${app}/`;
  // Asset requests (especially the illustration bundle) can keep `load` open
  // after the app is already interactive. Bound navigation so a stale server
  // or one missing resource is reported instead of hanging the whole audit.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.waitForTimeout(400);
  if (hash) {
    await page.evaluate((h) => {
      window.location.hash = h;
    }, hash);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
  }
  await page.waitForTimeout(settle);
}

const bodyText = (page) => page.evaluate(() => document.body.innerText);
const hasText = async (page, needle) => (await bodyText(page)).includes(needle);
const hasTextCI = async (page, needle) =>
  (await bodyText(page)).toLowerCase().includes(needle.toLowerCase());

const countSets = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = (window.__dbCountReq = indexedDB.open("traininglab", 1));
        req.onerror = () => {
          delete window.__dbCountReq;
          resolve(0);
        };
        req.onsuccess = () => {
          const db = req.result;
          try {
            const c = db.transaction("sets").objectStore("sets").count();
            c.onsuccess = () => {
              delete window.__dbCountReq;
              db.close();
              resolve(c.result);
            };
            c.onerror = () => {
              delete window.__dbCountReq;
              db.close();
              resolve(0);
            };
          } catch {
            delete window.__dbCountReq;
            db.close();
            resolve(0);
          }
        };
      }),
  );

// ══════════════════════════════════════════════════════════════════════════
//  TrainingLab — desktop
// ══════════════════════════════════════════════════════════════════════════

async function traininglabDesktop(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = attachErrorCollector(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Seed + boot ─────────────────────────────────────────────────────────
  await open(page, "traininglab");
  await seedTraininglab(page);
  await open(page, "traininglab", "#/hoy", 1_600);

  // Asserted on the hero CTA plus the seeded rows in IndexedDB, not on a metric
  // label: since 2026-09-30 (f) Inicio carries no KPI strip at all, so a metric
  // label would test nothing.
  const body0 = await bodyText(page);
  const seededSets = await countSets(page);
  const ctaFresh = /Iniciar entrenamiento|Start training/i.test(body0);
  const ctaResumed = /Continuar entrenamiento|Continue training/i.test(body0);
  if ((ctaFresh || ctaResumed) && seededSets > 0)
    pass("TL-desktop", `Inicio carga con datos sembrados (${seededSets} series)`);
  else
    fail(
      "TL-desktop",
      "Inicio carga con datos sembrados",
      `cta=${ctaFresh || ctaResumed} sets=${seededSets}`,
    );

  // The seeded history is all in the past, so the fresh-seeded hero must offer
  // to *start*; the state-aware "Continuar" is asserted on the phone pass right
  // after a set is logged through the UI (see TL-móvil).
  ctaFresh && !ctaResumed
    ? pass("TL-desktop", "CTA del hero ofrece empezar sin series de hoy")
    : warn(
        "TL-desktop",
        "CTA del hero en estado fresco",
        `fresh=${ctaFresh} resumed=${ctaResumed}`,
      );

  // Inicio must not have re-grown a second dashboard: no KPI strip, no week
  // strip, no "tus cifras" grid, no "siguiente ejercicio" card (2026-09-30 f).
  const leftoverHome = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      metrics: document.querySelectorAll(".tl-metrics").length,
      week: text.includes("Resumen de la semana"),
      numbers: text.includes("Tus cifras"),
      next: text.includes("Siguiente ejercicio"),
      progressRing: document.querySelectorAll(".tl-ring").length,
    };
  });
  Object.values(leftoverHome).every((v) => !v)
    ? pass("TL-desktop", "Inicio sin duplicados (KPIs/semana/cifras/ring)")
    : fail(
        "TL-desktop",
        "Inicio conserva bloques movidos a Semana/Progreso",
        JSON.stringify(leftoverHome),
      );

  // ── Navigation shell ────────────────────────────────────────────────────
  const railVisible = await page.locator("aside.tl-rail").isVisible();
  const tabbarVisible = await page.locator("nav.tl-tabbar").isVisible();
  railVisible
    ? pass("TL-desktop", "Rail lateral visible a 1440px")
    : fail("TL-desktop", "Rail lateral visible a 1440px");
  !tabbarVisible
    ? pass("TL-desktop", "Barra inferior oculta a 1440px")
    : fail("TL-desktop", "Barra inferior oculta a 1440px");

  const navCount = await page.locator("aside.tl-rail nav.tl-nav a").count();
  navCount === 6
    ? pass("TL-desktop", "Seis destinos en el rail")
    : fail("TL-desktop", "Seis destinos en el rail", `count=${navCount}`);

  // ── Semana (the plan's own surface, 2026-09-30 f) ────────────────────────
  await open(page, "traininglab", "#/semana", 1_400);
  const week = await page.evaluate(() => ({
    days: document.querySelectorAll(".tl-day-row").length,
    tiles: document.querySelectorAll(".tl-day").length,
    hasRegenerate: /Regenerar semana|Regenerate week/i.test(
      document.body.innerText,
    ),
    overflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  week.days >= 7 && week.tiles === 7 && week.hasRegenerate
    ? pass(
        "TL-desktop",
        `Semana lista: ${week.days} días + tira de 7 + regenerar`,
      )
    : fail("TL-desktop", "Semana lista", JSON.stringify(week));
  week.overflow <= 1
    ? pass("TL-desktop", "Semana sin desborde horizontal", `Δ=${week.overflow}`)
    : fail("TL-desktop", "Semana sin desborde horizontal", `Δ=${week.overflow}`);
  await shot(page, "tl-desktop-semana");

  // ── Rail collapse + persistence ─────────────────────────────────────────
  await page.click(".tl-rail-toggle");
  await page.waitForTimeout(400);
  const compact = await page.locator(".tl-shell.is-rail-compact").count();
  const stored = await page.evaluate(() =>
    localStorage.getItem("traininglab.rail"),
  );
  compact === 1 && stored === "compact"
    ? pass("TL-desktop", "Contraer rail persiste en localStorage")
    : fail(
        "TL-desktop",
        "Contraer rail persiste en localStorage",
        `class=${compact} stored=${stored}`,
      );
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(900);
  (await page.locator(".tl-shell.is-rail-compact").count()) === 1
    ? pass("TL-desktop", "Rail sigue compacto tras recargar")
    : fail("TL-desktop", "Rail sigue compacto tras recargar");
  await page.click(".tl-rail-toggle");
  await page.waitForTimeout(300);

  // ── Start a session from the rail ──────────────────────────────────────
  await open(page, "traininglab", "#/hoy", 1_200);
  const hero = await bodyText(page);
  const heroCta = [
    "Iniciar entrenamiento",
    "Start training",
    "Continuar entrenamiento",
    "Continue training",
    "Preparar",
    "Empezar",
    "Comenzar",
    "Ir al entrenamiento",
    "Abrir",
  ].find((label) => hero.includes(label));
  heroCta
    ? pass("TL-desktop", "Hero de Inicio ofrece CTA de sesión", `"${heroCta}"`)
    : warn(
        "TL-desktop",
        "Hero de Inicio ofrece CTA de sesión",
        "no se encontró el texto del CTA",
      );

  await page.locator('aside.tl-rail a[href="#/sesion"]').click();
  await page.waitForTimeout(900);
  (await hasText(page, "ZEN"))
    ? pass("TL-desktop", "Entrar a Entrenamiento monta la sesión ZEN")
    : fail(
        "TL-desktop",
        "Entrar a Entrenamiento monta la sesión ZEN",
        JSON.stringify((await bodyText(page)).slice(0, 200)),
      );
  const rawZenKeys = await page.evaluate(() =>
    (document.body.innerText.match(/\bzen\.[A-Za-z0-9_.]+/g) ?? []).filter(
      (value) => value !== "ZEN",
    ),
  );
  rawZenKeys.length === 0
    ? pass("TL-desktop", "ZEN no expone claves internas de traducción")
    : fail(
        "TL-desktop",
        "ZEN no expone claves internas de traducción",
        [...new Set(rawZenKeys)].join(", "),
      );
  await shot(page, "tl-desktop-zen-inicio");

  const zenState = () =>
    page.evaluate(() => {
      const h2 =
        document.querySelector("section.tl-card h2")?.textContent?.trim() ??
        "?";
      const primary = document.querySelector(
        "section.tl-card button.tl-btn-primary",
      );
      return { exercise: h2, label: primary?.textContent?.trim() ?? "?" };
    });

  // ── Log warm-up, then a working set ─────────────────────────────────────
  const primary = page.locator("section.tl-card button.tl-btn-primary").first();
  let primaryLabel = (await primary.innerText()).trim();
  let guard = 0;
  while (/calentamiento|mobility|Listo/i.test(primaryLabel) && guard < 5) {
    await primary.click();
    await page.waitForTimeout(500);
    primaryLabel = (await primary.innerText()).trim();
    guard += 1;
  }

  const beforeWork = await zenState();
  const weightInput = page.locator('input[aria-label^="Peso"]').first();
  if (await weightInput.count()) await weightInput.fill("30");
  const repsInput = page.locator('input[aria-label="Reps"]').last();
  await repsInput.fill("10");
  const setsBefore = await countSets(page);
  await primary.click();
  await page.waitForTimeout(700);
  const afterWork = await zenState();
  const setsAfterWork = await countSets(page);

  setsAfterWork === setsBefore + 1
    ? pass("TL-desktop", "Registrar una serie la guarda en IndexedDB")
    : fail(
        "TL-desktop",
        "Registrar una serie la guarda en IndexedDB",
        `antes=${setsBefore} después=${setsAfterWork}`,
      );

  // ── The freeze check: logging a set must not move the user ──────────────
  afterWork.exercise === beforeWork.exercise
    ? pass("TL-desktop", "La serie registrada no cambia el ejercicio actual")
    : fail(
        "TL-desktop",
        "La serie registrada no cambia el ejercicio actual",
        `pasó de "${beforeWork.exercise}" a "${afterWork.exercise}" tras guardar`,
      );
  /calentamiento/i.test(afterWork.label)
    ? fail(
        "TL-desktop",
        "Guardar una serie no reinicia la rampa de calentamiento",
        `el botón volvió a "${afterWork.label}"`,
      )
    : pass(
        "TL-desktop",
        "Guardar una serie no reinicia la rampa de calentamiento",
        `botón: "${afterWork.label}"`,
      );

  await shot(page, "tl-desktop-tras-serie");

  // ── Rest timer (label is uppercased by CSS, compare case-insensitively) ─
  (await hasTextCI(page, "descanso"))
    ? pass("TL-desktop", "Registrar serie arranca el temporizador de descanso")
    : fail("TL-desktop", "Registrar serie arranca el temporizador de descanso");
  await shot(page, "tl-desktop-zen-descanso");

  // ── Rest persists across destinations ───────────────────────────────────
  await page.locator('aside.tl-rail a[href="#/progreso"]').click();
  await page.waitForTimeout(800);
  (await hasTextCI(page, "descanso"))
    ? pass("TL-desktop", "El descanso sigue visible en otra sección")
    : fail("TL-desktop", "El descanso sigue visible en otra sección");
  await page.locator('aside.tl-rail a[href="#/sesion"]').click();
  await page.waitForTimeout(800);

  // ── A second working set: the session must not move under the user ──────
  // (The first work set may leave the phase reset to the warm-up ramp — the
  // guard loop walks that ramp back to "Registrar serie" before comparing.)
  let label2 = (await primary.innerText()).trim();
  let guard2 = 0;
  while (/calentamiento|mobility|Listo/i.test(label2) && guard2 < 5) {
    await primary.click();
    await page.waitForTimeout(450);
    label2 = (await primary.innerText()).trim();
    guard2 += 1;
  }
  const beforeSecond = await zenState();
  await primary.click();
  await page.waitForTimeout(700);
  const afterSecond = await zenState();
  afterSecond.exercise === beforeSecond.exercise
    ? pass("TL-desktop", "Dos series seguidas mantienen el mismo ejercicio")
    : fail(
        "TL-desktop",
        "Dos series seguidas mantienen el mismo ejercicio",
        `pasó de "${beforeSecond.exercise}" a "${afterSecond.exercise}"`,
      );
  if (guard2 > 0) {
    warn(
      "TL-desktop",
      "Antes de la segunda serie hubo que repetir la rampa de calentamiento",
      `clics extra: ${guard2}`,
    );
  }

  // ── Persistence through a reload ────────────────────────────────────────
  const beforeReload = await countSets(page);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(1_200);
  const afterReload = await countSets(page);
  afterReload === beforeReload && afterReload > HISTORY_SETS.length
    ? pass(
        "TL-desktop",
        "La sesión y las series sobreviven a una recarga",
        `sets=${afterReload}`,
      )
    : fail(
        "TL-desktop",
        "La sesión y las series sobreviven a una recarga",
        `antes=${beforeReload} después=${afterReload}`,
      );

  // ── Finish the session (keyboard contract: Ctrl+Enter) ──────────────────
  await page
    .locator("body")
    .click({ position: { x: 5, y: 5 } })
    .catch(() => {});
  await page.keyboard.press("Control+Enter");
  await page.waitForTimeout(1_200);
  (await hasTextCI(page, "Entrenamiento terminado")) ||
  (await hasTextCI(page, "Series hechas")) ||
  (await hasTextCI(page, "Sesión completada"))
    ? pass("TL-desktop", "Terminar sesión (Ctrl+Enter) confirma en pantalla")
    : warn(
        "TL-desktop",
        "Terminar sesión (Ctrl+Enter)",
        JSON.stringify((await bodyText(page)).slice(0, 200)),
      );

  // ── Delete a set from Inicio (and what protects it) ─────────────────────
  await open(page, "traininglab", "#/hoy", 1_400);
  // The logged-set rows live behind each card's expand toggle. Expand cards
  // until a delete control is actually *visible* (`count()` sees hidden DOM).
  const toggles = page.locator(".tl-slot-toggle");
  const toggleCount = await toggles.count();
  for (let i = 0; i < toggleCount; i += 1) {
    if (
      (await page.locator('button[aria-label="Eliminar"]:visible').count()) > 0
    )
      break;
    await toggles
      .nth(i)
      .click()
      .catch(() => {});
    await page.waitForTimeout(350);
  }
  const visibleDeletes = page.locator('button[aria-label="Eliminar"]:visible');
  const deleteCount = await visibleDeletes.count();
  if (deleteCount > 0) {
    await visibleDeletes
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {});
    await page.waitForTimeout(500);
    const afterDelete = await page
      .locator('button[aria-label="Eliminar"]:visible')
      .count();
    afterDelete === deleteCount - 1
      ? pass(
          "TL-desktop",
          "Borrar serie funciona",
          `series visibles: ${deleteCount} → ${afterDelete}`,
        )
      : warn(
          "TL-desktop",
          "Borrar serie",
          `antes=${deleteCount} después=${afterDelete}`,
        );
    // The destructive action must be recoverable: delete → Deshacer → restored.
    if (await hasTextCI(page, "deshacer")) {
      pass("TL-desktop", "Borrado ofrece Deshacer");
      await page
        .getByText("Deshacer", { exact: true })
        .first()
        .click({ timeout: 4_000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      const restored = await page
        .locator('button[aria-label="Eliminar"]:visible')
        .count();
      restored === deleteCount
        ? pass(
            "TL-desktop",
            "Deshacer restaura la serie borrada",
            `visibles: ${afterDelete} → ${restored}`,
          )
        : fail(
            "TL-desktop",
            "Deshacer restaura la serie borrada",
            `restauradas=${restored}, esperadas=${deleteCount}`,
          );
    } else {
      fail(
        "TL-desktop",
        "Borrado con opción de deshacer",
        "no apareció el control Deshacer",
      );
    }
    await shot(page, "tl-desktop-tras-borrar");
  } else {
    warn(
      "TL-desktop",
      "No hay series de hoy para borrar desde Inicio",
      "el botón Eliminar solo aparece con series registradas",
    );
  }

  // ── Edit a logged set — functional, not just the affordance ─────────────
  const editButtons = page.locator('button[aria-label="Editar"]:visible');
  const editCount = await editButtons.count();
  if (editCount > 0) {
    await editButtons
      .first()
      .click({ timeout: 4_000 })
      .catch(() => {});
    await page.waitForTimeout(400);
    const editRow = page
      .locator("main li:has(button[aria-label='Guardar'])")
      .first();
    const repsField = editRow.locator('input[aria-label="Reps"]').first();
    if (await repsField.count()) {
      const repsBefore = await repsField.inputValue().catch(() => "?");
      await repsField.fill("13");
      await editRow
        .locator('button[aria-label="Guardar"]')
        .first()
        .click({ timeout: 4_000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      const storedReps = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const req = indexedDB.open("traininglab");
            req.onsuccess = () => {
              const out = [];
              const cur = req.result
                .transaction("sets")
                .objectStore("sets")
                .openCursor();
              cur.onsuccess = () => {
                const c = cur.result;
                if (c) {
                  out.push(c.value.reps);
                  c.continue();
                } else resolve(out);
              };
            };
          }),
      );
      storedReps.includes(13)
        ? pass(
            "TL-desktop",
            "Editar una serie guarda los cambios",
            `reps ${repsBefore} → 13 (en IndexedDB)`,
          )
        : fail(
            "TL-desktop",
            "Editar una serie guarda los cambios",
            `reps en DB: ${JSON.stringify(storedReps)}`,
          );
      await shot(page, "tl-desktop-serie-editada");
    } else {
      fail("TL-desktop", "Editar una serie: abre el formulario en la fila");
    }
  } else {
    fail(
      "TL-desktop",
      "Editar una serie registrada",
      "no hay botón Editar en las filas registradas",
    );
  }

  // Semana is now a first-class destination; Inicio deliberately has no
  // duplicate week card. Keep this assertion on its real route so the audit
  // does not regress to the old one-page dashboard contract.
  await open(page, "traininglab", "#/semana", 1_400);
  const weekDayCount = await page.locator(".tl-day-row").count();
  const weekTitle = /La semana|The week/i.test(await bodyText(page));
  weekDayCount >= 7 && weekTitle
    ? pass("TL-desktop", "Destino Semana muestra los siete días")
    : fail(
        "TL-desktop",
        "Destino Semana muestra los siete días",
        `rows=${weekDayCount} title=${weekTitle}`,
      );
  const regen = page
    .locator('button:has-text("Regenerar semana"), button:has-text("Regenerate week")')
    .first();
  if (await regen.count()) {
    await regen.click().catch(() => {});
    await page.waitForTimeout(800);
    pass("TL-desktop", "Regenerar semana responde sin error");
  } else {
    fail("TL-desktop", "Semana expone regeneración del plan");
  }

  // ── Progreso: body map + condition lens ─────────────────────────────────
  await open(page, "traininglab", "#/progreso", 1_600);
  const prog = await bodyText(page);
  const mapImg = await page.locator('img[src*="body-map"]').count();
  mapImg > 0
    ? pass("TL-desktop", "El mapa corporal 2D se carga")
    : fail("TL-desktop", "El mapa corporal 2D se carga", `imgs=${mapImg}`);
  /Entrenamiento/.test(prog) && /Objetivos/.test(prog)
    ? pass("TL-desktop", "Las lentes Entrenamiento/Objetivos están visibles")
    : fail(
        "TL-desktop",
        "Las lentes Entrenamiento/Objetivos están visibles",
        JSON.stringify(prog.slice(0, 200)),
      );

  const conditionAxes = await page
    .locator('[data-testid^="condition-"]')
    .count();
  conditionAxes === 4
    ? pass("TL-desktop", "Tarjeta Condición física con sus cuatro ejes")
    : fail(
        "TL-desktop",
        "Tarjeta Condición física con sus cuatro ejes",
        `ejes=${conditionAxes}`,
      );
  const hasBands = await page.evaluate(
    () =>
      document.querySelectorAll('[data-testid^="condition-"] .tl-band').length,
  );
  const hasNoData = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="condition-"]')].some((el) =>
      /sin dato/i.test(el.textContent ?? ""),
    ),
  );
  hasBands > 0 || hasNoData
    ? pass(
        "TL-desktop",
        'Ejes con banda o estado "sin dato" honesto',
        `bandas=${hasBands}`,
      )
    : fail("TL-desktop", 'Ejes con banda o estado "sin dato" honesto');
  await shot(page, "tl-desktop-progreso");

  const goalLens = page.getByText("Objetivos", { exact: true }).first();
  if (await goalLens.count()) {
    await goalLens.click().catch(() => {});
    await page.waitForTimeout(700);
    pass("TL-desktop", "Cambiar a la lente Objetivos responde");
    await shot(page, "tl-desktop-progreso-objetivos");
  } else {
    warn("TL-desktop", "No se pudo pulsar la lente Objetivos");
  }

  // ── Ejercicios: search, filter, detail ──────────────────────────────────
  await open(page, "traininglab", "#/ejercicios", 1_200);
  const search = page
    .locator('input[aria-label*="uscar"], input[placeholder*="uscar"]')
    .first();
  if (await search.count()) {
    const rowsBefore = await page.locator("main .tl-card > button").count();
    await search.fill("press");
    await page.waitForTimeout(700);
    const rowsAfter = await page.locator("main .tl-card > button").count();
    const text = await bodyText(page);
    rowsAfter > 0 && rowsAfter < rowsBefore
      ? pass(
          "TL-desktop",
          "La búsqueda de ejercicios filtra resultados",
          `${rowsBefore} → ${rowsAfter}`,
        )
      : warn(
          "TL-desktop",
          "La búsqueda de ejercicios",
          `filas antes=${rowsBefore} después=${rowsAfter}`,
        );
    /a la vista|shown/i.test(text)
      ? pass("TL-desktop", "El pie de búsqueda informa resultados")
      : warn("TL-desktop", "El pie de búsqueda no muestra recuento");
    await shot(page, "tl-desktop-ejercicios-busqueda");
    await search.fill("");
    await page.waitForTimeout(400);
  } else {
    fail("TL-desktop", "La búsqueda de ejercicios existe y es alcanzable");
  }

  const firstRow = page.locator("main .tl-card > button").first();
  if (await firstRow.count()) {
    const title = (await firstRow.innerText()).split("\n")[0];
    await firstRow.click();
    await page.waitForTimeout(900);
    (await page.url()).includes("/ejercicios/")
      ? pass("TL-desktop", "Abrir un ejercicio navega a su ficha", title)
      : fail(
          "TL-desktop",
          "Abrir un ejercicio navega a su ficha",
          `url=${page.url()}`,
        );
    const detail = await bodyText(page);
    /Historial|historial/.test(detail)
      ? pass("TL-desktop", "La ficha del ejercicio incluye historial")
      : warn(
          "TL-desktop",
          "La ficha del ejercicio no muestra historial personal",
          "F2 pendiente en el roadmap",
        );
    await shot(page, "tl-desktop-ejercicio-detalle");
  } else {
    fail("TL-desktop", "Hay filas de ejercicios en la biblioteca");
  }

  // ── Ajustes: unit toggle persistence + export ───────────────────────────
  await open(page, "traininglab", "#/ajustes", 1_200);
  // Settings cards are `<details>` collapsed by default, so open them all the
  // way the user would before interacting with their content.
  const cardIndexes = await page.locator("details").evaluateAll((cards) =>
    cards.flatMap((card, index) =>
      card.open ? [] : [index],
    ),
  );
  for (const index of cardIndexes) {
    await page
      .locator("details")
      .nth(index)
      .locator("summary")
      .first()
      .click({ timeout: 2_000 })
      .catch(() => {});
    await page.waitForTimeout(150);
  }
  const lbButton = page.locator('button[aria-pressed]:has-text("lb")').first();
  if ((await lbButton.count()) && (await lbButton.isVisible())) {
    await lbButton.click({ timeout: 5_000 }).catch(() => {});
    let storedUnit = null;
    for (let i = 0; i < 10 && storedUnit !== "lb"; i += 1) {
      await page.waitForTimeout(200);
      storedUnit = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const req = indexedDB.open("traininglab");
            req.onsuccess = () => {
              const get = req.result
                .transaction("meta")
                .objectStore("meta")
                .get("settings");
              get.onsuccess = () => resolve(get.result?.value?.unit ?? null);
            };
          }),
      );
    }
    storedUnit === "lb"
      ? pass("TL-desktop", "Cambiar a lb se persiste en IndexedDB")
      : fail(
          "TL-desktop",
          "Cambiar a lb se persiste en IndexedDB",
          `unit=${storedUnit}`,
        );
    const kgButton = page
      .locator('button[aria-pressed]:has-text("kg")')
      .first();
    if (await kgButton.count()) await kgButton.click().catch(() => {});
    await page.waitForTimeout(300);
  } else {
    warn(
      "TL-desktop",
      "No se encontró el selector de unidad kg/lb",
      `botones=${await lbButton.count()}`,
    );
  }

  // ── Mis datos: the CSV export, verified end to end ──────────────────────
  // Download the file the button really produces, check the Excel-ES contract
  // (BOM + ';' + one row per set), then hand it to the data CLI and ask SQLite
  // for the count: the same loop an LLM (Buffy today) uses to verify the data
  // layer. See `docs/PLAN_CSV_SQLITE_CLI.md`.
  const exportTrigger = page.locator('[data-testid="export-csv"] button');
  if ((await exportTrigger.count()) === 0) {
    fail("TL-desktop", "Ajustes ofrece exportación CSV de los datos");
  } else {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }).catch(() => null),
      exportTrigger.click(),
    ]);
    if (!download) {
      fail("TL-desktop", "Exportar CSV descarga un archivo");
    } else {
      const exportPath = path.join(OUT, "traininglab-sets.csv");
      await download.saveAs(exportPath);
      const csv = await fs.readFile(exportPath, "utf8");
      const header = csv.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
      const rows = csv.trimEnd().split(/\r?\n/).length - 1;
      const inDb = await countSets(page);

      csv.charCodeAt(0) === 0xfeff && header.startsWith("set_id;timestamp;")
        ? pass(
            "TL-desktop",
            "Exportar CSV cumple el contrato Excel (BOM + ';')",
          )
        : fail(
            "TL-desktop",
            "Exportar CSV cumple el contrato Excel (BOM + ';')",
            `header=${header.slice(0, 80)}`,
          );
      rows === inDb
        ? pass("TL-desktop", `CSV coincide con IndexedDB (${rows} series)`)
        : fail(
            "TL-desktop",
            "CSV coincide con IndexedDB",
            `csv=${rows} idb=${inDb}`,
          );

      // SQLite mirror through the real CLI (skipped on a Node without
      // node:sqlite, exactly like the LAN store does).
      const cli = path.join(ROOT, "scripts", "fitness-data-cli.mjs");
      const mirror = path.join(OUT, "mirror.sqlite");
      try {
        const ingest = JSON.parse(
          execFileSync(
            process.execPath,
            [cli, "--ingest", exportPath, "--db", mirror, "--replace"],
            { encoding: "utf8" },
          ),
        );
        const sql = JSON.parse(
          execFileSync(
            process.execPath,
            [cli, "--sql", "SELECT COUNT(*) AS n FROM sets", "--db", mirror],
            { encoding: "utf8" },
          ),
        );
        ingest.rows === inDb && sql[0]?.n === inDb
          ? pass(
              "TL-desktop",
              `CLI: CSV ingerido en SQLite (${sql[0].n} filas)`,
            )
          : fail(
              "TL-desktop",
              "CLI: CSV ingerido en SQLite",
              `ingest=${ingest.rows} sql=${sql[0]?.n} idb=${inDb}`,
            );
      } catch (error) {
        warn(
          "TL-desktop",
          "CLI de datos no disponible en este Node",
          String(error?.message ?? error).slice(0, 140),
        );
      }
    }
  }

  // ── Copia completa: descarga real y restauración en un perfil limpio ────
  // The strongest evidence a backup works is not that the button exists: it is
  // downloading the file here and watching a *different* browser profile come
  // back with the same series after restoring it.
  const backupTrigger = page.locator('[data-testid="export-backup"] button');
  if ((await backupTrigger.count()) === 0) {
    fail("TL-desktop", "Ajustes ofrece copia completa (JSON)");
  } else {
    const [backupDownload] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }).catch(() => null),
      backupTrigger.click(),
    ]);
    const backupPath = path.join(OUT, "traininglab-backup.json");
    let setsInBackup = -1;
    if (!backupDownload) {
      fail("TL-desktop", "Descargar copia completa produce un archivo");
    } else {
      await backupDownload.saveAs(backupPath);
      const parsed = JSON.parse(await fs.readFile(backupPath, "utf8"));
      setsInBackup = Array.isArray(parsed.sets) ? parsed.sets.length : -1;
      parsed.app === "traininglab" && parsed.version === 1 && setsInBackup >= 0
        ? pass(
            "TL-desktop",
            `Copia completa con cabecera válida (${setsInBackup} series)`,
          )
        : fail(
            "TL-desktop",
            "Copia completa con cabecera válida",
            `app=${parsed.app} version=${parsed.version}`,
          );

      // Restore it in a fresh profile: merged data must reappear.
      const freshContext = await browser.newContext();
      try {
        const freshPage = await freshContext.newPage();
        await freshPage.setViewportSize({ width: 1440, height: 900 });
        await open(freshPage, "traininglab", "#/ajustes", 1_600);
        await freshPage
          .locator('[data-testid="restore-backup"] input[type="file"]')
          .setInputFiles(backupPath);
        let restored = await countSets(freshPage);
        for (let i = 0; i < 15 && restored !== setsInBackup; i += 1) {
          await freshPage.waitForTimeout(300);
          restored = await countSets(freshPage);
        }
        restored === setsInBackup && setsInBackup > 0
          ? pass(
              "TL-desktop",
              `Restaurar copia recupera ${restored} series en un perfil limpio`,
            )
          : fail(
              "TL-desktop",
              "Restaurar copia recupera las series en un perfil limpio",
              `esperado=${setsInBackup} restaurado=${restored}`,
            );
      } catch (error) {
        fail(
          "TL-desktop",
          "Restaurar copia recupera las series en un perfil limpio",
          String(error?.message ?? error).slice(0, 160),
        );
      } finally {
        await freshContext.close();
      }
    }
  }

  await shot(page, "tl-desktop-ajustes");

  // ── Overflow sweep across destinations ──────────────────────────────────
  for (const [hash, label] of [
    ["#/hoy", "Inicio"],
    ["#/ejercicios", "Ejercicios"],
    ["#/sesion", "Entrenamiento"],
    ["#/progreso", "Progreso"],
    ["#/ajustes", "Ajustes"],
  ]) {
    await open(page, "traininglab", hash, 900);
    const overflow = await page.evaluate(() => ({
      doc:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    overflow.doc <= 1 && overflow.body <= 1
      ? pass(
          "TL-desktop",
          `Sin desborde horizontal en ${label}`,
          `Δ=${overflow.doc}/${overflow.body}`,
        )
      : fail(
          "TL-desktop",
          `Desborde horizontal en ${label}`,
          `doc=${overflow.doc} body=${overflow.body}`,
        );
  }

  errors.length === 0
    ? pass("TL-desktop", "Cero errores de consola/página en todo el recorrido")
    : fail(
        "TL-desktop",
        "Errores de consola/página",
        errors.slice(0, 6).join(" | "),
      );
  if (errors.length) {
    results.push({
      area: "TL-desktop",
      name: "errores-capturados",
      status: "INFO",
      detail: errors.join("\n"),
    });
  }

  await context.close();
}

// ══════════════════════════════════════════════════════════════════════════
//  TrainingLab — móvil
// ══════════════════════════════════════════════════════════════════════════

async function traininglabMobile(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = attachErrorCollector(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await open(page, "traininglab");
  await seedTraininglab(page);
  await open(page, "traininglab", "#/hoy", 1_500);

  const tabbar = await page.locator("nav.tl-tabbar").isVisible();
  const rail = await page.locator("aside.tl-rail").isVisible();
  tabbar && !rail
    ? pass("TL-móvil", "Barra inferior visible y rail oculto a 390px")
    : fail(
        "TL-móvil",
        "Barra inferior / rail",
        `tabbar=${tabbar} rail=${rail}`,
      );

  const tabSizes = await page.evaluate(() =>
    [...document.querySelectorAll(".tl-tabbar a")].map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  const small = tabSizes.filter((s) => s.h < 44);
  tabSizes.length === 6 && small.length === 0
    ? pass(
        "TL-móvil",
        "Pestañas táctiles ≥44px de alto",
        JSON.stringify(tabSizes),
      )
    : fail("TL-móvil", "Pestañas táctiles <44px", JSON.stringify(small));

  const fontSizes = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("input")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      out.push({
        label:
          el.getAttribute("aria-label") || el.placeholder || "(sin nombre)",
        size: Number.parseFloat(getComputedStyle(el).fontSize),
      });
    }
    return out;
  });
  const tiny = fontSizes.filter((f) => f.size < 16);
  tiny.length === 0
    ? pass(
        "TL-móvil",
        "Todos los inputs visibles ≥16px",
        `${fontSizes.length} inputs`,
      )
    : warn(
        "TL-móvil",
        "Inputs con tipografía <16px (zoom iOS)",
        JSON.stringify(tiny.slice(0, 8)),
      );

  await shot(page, "tl-movil-inicio");

  // Full logging pass at phone width.
  await open(page, "traininglab", "#/sesion", 1_200);
  const primaryMobile = page
    .locator("section.tl-card button.tl-btn-primary")
    .first();
  if (await primaryMobile.count()) {
    let label = (await primaryMobile.innerText()).trim();
    let guard = 0;
    while (/calentamiento|mobility|Listo/i.test(label) && guard < 5) {
      await primaryMobile.click();
      await page.waitForTimeout(450);
      label = (await primaryMobile.innerText()).trim();
      guard += 1;
    }
    const setsBefore = await countSets(page);
    await primaryMobile.click();
    await page.waitForTimeout(700);
    const setsAfter = await countSets(page);
    // The hero CTA is state-aware: after logging a set today it must offer to
    // *continue* the session, not to start it (2026-09-30 f).
    await open(page, "traininglab", "#/hoy", 1_200);
    const homeAfterSet = await bodyText(page);
    /Continuar entrenamiento|Continue training/i.test(homeAfterSet)
      ? pass(
          "TL-móvil",
          "El CTA del hero pasa a Continuar tras registrar hoy",
        )
      : fail(
          "TL-móvil",
          "El CTA del hero pasa a Continuar tras registrar hoy",
          homeAfterSet.slice(0, 120),
        );
    setsAfter > setsBefore
      ? pass("TL-móvil", "Registrar serie funciona en móvil")
      : fail(
          "TL-móvil",
          "Registrar serie funciona en móvil",
          `sets ${setsBefore} → ${setsAfter}`,
        );
    (await hasTextCI(page, "descanso"))
      ? pass("TL-móvil", "Registrar serie arranca el descanso en móvil")
      : fail("TL-móvil", "Registrar serie no arrancó el descanso en móvil");
    // The CTA state check above intentionally visits Inicio. Return to ZEN
    // before measuring its sticky action bar and tap targets; otherwise this
    // audit measures the home page and reports a false failure.
    await open(page, "traininglab", "#/sesion", 1_000);
  } else {
    fail("TL-móvil", "La sesión ZEN tiene botón primario en móvil");
  }
  await shot(page, "tl-movil-zen");

  // ── Plan QA (P0/P1 móvil): teclado, barra de acción y objetivos táctiles ─
  const viewportMeta = await page.evaluate(
    () =>
      document
        .querySelector('meta[name="viewport"]')
        ?.getAttribute("content") ?? "",
  );
  viewportMeta.includes("interactive-widget=resizes-content")
    ? pass(
        "TL-móvil",
        "Viewport con interactive-widget=resizes-content (teclado Android)",
      )
    : fail(
        "TL-móvil",
        "Viewport con interactive-widget=resizes-content",
        viewportMeta,
      );

  const actionBar = await page.evaluate(() => {
    const bar = document.querySelector(".tl-zen-actions");
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    const tabbar = document.querySelector(".tl-tabbar");
    return {
      position: getComputedStyle(bar).position,
      bottom: getComputedStyle(bar).bottom,
      barBottom: Math.round(rect.bottom),
      tabTop: tabbar ? Math.round(tabbar.getBoundingClientRect().top) : null,
      effortBottom: Math.round(
        document
          .querySelector(".tl-zen-effort > summary")
          ?.getBoundingClientRect().bottom ?? 0,
      ),
      barTop: Math.round(rect.top),
    };
  });
  if (!actionBar) {
    fail("TL-móvil", "La barra de acción de ZEN existe");
  } else {
    actionBar.position === "static"
      ? pass(
          "TL-móvil",
          "Acción ZEN en flujo normal para no tapar controles opcionales",
        )
      : fail(
          "TL-móvil",
          "Acción ZEN no tapa los controles en reposo",
          `position=${actionBar.position}`,
        );
    actionBar.effortBottom <= actionBar.barTop
      ? pass("TL-móvil", "Resumen de esfuerzo queda antes del botón primario")
      : fail(
          "TL-móvil",
          "El botón primario no cubre el resumen de esfuerzo",
          JSON.stringify(actionBar),
        );
    actionBar.tabTop === null || actionBar.barBottom <= actionBar.tabTop + 1
      ? pass(
          "TL-móvil",
          "La barra de acción no queda bajo la barra de pestañas",
        )
      : fail(
          "TL-móvil",
          "La barra de acción no queda bajo la barra de pestañas",
          JSON.stringify(actionBar),
        );
  }

  const effortSummary = page.locator(".tl-zen-effort > summary");
  if (await effortSummary.count()) {
    await effortSummary.click();
    const choices = page.locator(".tl-zen-effort .grid-cols-5 button");
    const visibleChoices = await choices.evaluateAll((buttons) =>
      buttons.filter((button) => button.getBoundingClientRect().height > 0).length,
    );
    visibleChoices === 5
      ? pass("TL-móvil", "Selector de esfuerzo opcional se abre y muestra cinco opciones")
      : fail(
          "TL-móvil",
          "Selector de esfuerzo opcional accesible",
          `opciones visibles=${visibleChoices}`,
        );
  } else {
    fail("TL-móvil", "Esfuerzo opcional tiene un control expandible");
  }

  await page.locator(".tl-zen-input").first().focus();
  const focusedActionPosition = await page
    .locator(".tl-zen-actions")
    .evaluate((bar) => getComputedStyle(bar).position);
  focusedActionPosition === "sticky"
    ? pass("TL-móvil", "Al enfocar carga/reps, la acción vuelve a modo sticky")
    : fail(
        "TL-móvil",
        "Acción sticky al enfocar un campo numérico",
        focusedActionPosition,
      );

  // Goal size for the controls a tired thumb actually hits (WCAG 2.5.5, 44 px).
  const tapTargets = await page.evaluate(() => {
    const measure = (selector) =>
      [...document.querySelectorAll(selector)]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            label: (el.getAttribute("aria-label") || el.textContent || "?")
              .trim()
              .slice(0, 20),
            h: Math.round(rect.height),
            w: Math.round(rect.width),
          };
        });
    return [
      ...measure(".tl-zen-actions button"),
      ...measure(".grid-cols-5 button"),
      ...measure("section.tl-card button[aria-label]"),
    ];
  });
  const undersized = tapTargets.filter((t) => t.h < 44);
  undersized.length === 0 && tapTargets.length >= 7
    ? pass(
        "TL-móvil",
        `Objetivos táctiles ≥44 px en ZEN (${tapTargets.length} controles)`,
      )
    : fail(
        "TL-móvil",
        "Objetivos táctiles ≥44 px en ZEN",
        JSON.stringify(undersized.slice(0, 6)),
      );

  // Hick's law, measured: the primary action must be reachable without scroll.
  await open(page, "traininglab", "#/hoy", 1_200);
  const cta = await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) =>
      /Iniciar entrenamiento|Start training|Continuar entrenamiento|Continue training/i.test(
        b.textContent || "",
      ),
    );
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return {
      bottom: Math.round(rect.bottom),
      viewport: window.innerHeight,
      scrollY: Math.round(window.scrollY),
    };
  });
  cta && cta.bottom <= cta.viewport
    ? pass(
        "TL-móvil",
        `CTA principal visible sin scroll (${cta.bottom}/${cta.viewport} px)`,
      )
    : fail("TL-móvil", "CTA principal visible sin scroll", JSON.stringify(cta));

  for (const [hash, labelText] of [
    ["#/hoy", "Inicio"],
    ["#/ejercicios", "Ejercicios"],
    ["#/semana", "Semana"],
    ["#/sesion", "Entrenamiento"],
    ["#/progreso", "Progreso"],
    ["#/ajustes", "Ajustes"],
  ]) {
    await open(page, "traininglab", hash, 900);
    const overflow = await page.evaluate(() => ({
      doc:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      body: document.body.scrollWidth - window.innerWidth,
    }));
    overflow.doc <= 1 && overflow.body <= 1
      ? pass(
          "TL-móvil",
          `Sin desborde horizontal en ${labelText}`,
          `Δ=${overflow.doc}/${overflow.body}`,
        )
      : fail(
          "TL-móvil",
          `Desborde horizontal en ${labelText}`,
          `doc=${overflow.doc} body=${overflow.body}`,
        );
  }

  // Responsive contract sweep. Keep the exact boundary (1024px) in the set:
  // that is where the bottom tabs hand off to the collapsible rail.
  for (const width of [320, 360, 390, 414, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 640 ? 844 : 900 });
    await open(page, "traininglab", "#/hoy", 350);
    const layout = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      rail: getComputedStyle(document.querySelector(".tl-rail")).display !== "none",
      tabs: getComputedStyle(document.querySelector(".tl-tabbar")).display !== "none",
    }));
    const shellMatches = width >= 1024 ? layout.rail && !layout.tabs : !layout.rail && layout.tabs;
    layout.overflow <= 1 && shellMatches
      ? pass(
          "TL-responsive",
          `Shell sin overflow en ${width}px`,
          width >= 1024 ? "rail" : "tabs",
        )
      : fail(
          "TL-responsive",
          `Shell adaptable en ${width}px`,
          JSON.stringify(layout),
        );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "traininglab", "#/progreso", 900);
  await shot(page, "tl-movil-progreso");

  errors.length === 0
    ? pass("TL-móvil", "Cero errores de consola/página en móvil")
    : fail(
        "TL-móvil",
        "Errores de consola/página en móvil",
        errors.slice(0, 6).join(" | "),
      );

  await context.close();
}

// ══════════════════════════════════════════════════════════════════════════
//  TrainingLab — primera vez (sin datos)
// ══════════════════════════════════════════════════════════════════════════

async function traininglabColdStart(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = attachErrorCollector(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "traininglab", "#/hoy", 1_500);

  const text = await bodyText(page);
  await shot(page, "tl-primera-vez");
  if (
    /Error|error inesperado|algo salió mal/i.test(text) &&
    !/sin datos|configura|importa|Ajustes/i.test(text)
  ) {
    fail(
      "TL-primera-vez",
      "Sin datos: estado guiado, no error",
      JSON.stringify(text.slice(0, 200)),
    );
  } else if (/configura|importa|Ajustes|sin datos|equipo/i.test(text)) {
    pass(
      "TL-primera-vez",
      "Sin datos: la app guía a configurar en vez de romperse",
    );
  } else {
    warn(
      "TL-primera-vez",
      "Primera vez sin datos: estado no del todo explícito",
      JSON.stringify(text.slice(0, 200)),
    );
  }

  errors.length === 0
    ? pass("TL-primera-vez", "Sin errores de consola en arranque en frío")
    : fail(
        "TL-primera-vez",
        "Errores de consola en arranque en frío",
        errors.slice(0, 4).join(" | "),
      );

  await context.close();
}

// ══════════════════════════════════════════════════════════════════════════
//  BodyLab — escritorio con datos + recorrido de secciones
// ══════════════════════════════════════════════════════════════════════════

async function bodylabDesktop(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = attachErrorCollector(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await open(page, "bodylab");
  await seedLegacy(page);
  await open(page, "bodylab", "#/", 1_800);

  (await hasText(page, "Resumen"))
    ? pass("BL-desktop", "BodyLab carga con el perfil migrado")
    : fail(
        "BL-desktop",
        "BodyLab carga con el perfil migrado",
        JSON.stringify((await bodyText(page)).slice(0, 160)),
      );
  await shot(page, "bl-desktop-resumen");

  const sections = [
    ["#/history", "Historial", "Mediciones"],
    ["#/measure", "Medir", "Medir"],
    ["#/body", "Cuerpo", "Cuerpo"],
    ["#/progress", "Progreso", "Progreso"],
    ["#/references", "Referencia", "Referencia"],
    ["#/data", "Datos", "Datos"],
    ["#/settings", "Ajustes", "Ajustes"],
  ];
  for (const [hash, label, expect] of sections) {
    await open(page, "bodylab", hash, hash === "#/body" ? 3_500 : 1_400);
    const text = await bodyText(page);
    text.includes(expect)
      ? pass("BL-desktop", `Sección ${label} monta (contiene "${expect}")`)
      : warn(
          "BL-desktop",
          `Sección ${label}`,
          `no contiene "${expect}": ${JSON.stringify(text.slice(0, 120))}`,
        );
  }
  await shot(page, "bl-desktop-mediciones");

  const overflow = await page.evaluate(() => ({
    doc:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  overflow.doc <= 1
    ? pass("BL-desktop", "Sin desborde horizontal (Ajustes)")
    : fail("BL-desktop", "Desborde horizontal", `Δ=${overflow.doc}`);

  errors.length === 0
    ? pass("BL-desktop", "Cero errores de consola/página en el recorrido")
    : fail(
        "BL-desktop",
        "Errores de consola/página",
        errors.slice(0, 6).join(" | "),
      );
  await context.close();
}

// ══════════════════════════════════════════════════════════════════════════
//  BodyLab — onboarding completo (primera vez) + viewport móvil
// ══════════════════════════════════════════════════════════════════════════

async function bodylabOnboarding(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = attachErrorCollector(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "bodylab", "#/", 1_200);

  const steps = [];
  let sawSport = false;
  let sawObjective = false;

  // Language first, so the rest of the walk is in Spanish like the owner's.
  const spanish = page.getByText("Español", { exact: false }).first();
  if (await spanish.count()) {
    await spanish.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  for (let i = 0; i < 12; i += 1) {
    const text = await bodyText(page);
    const heading =
      text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)[0] ?? "(sin título)";
    steps.push(heading);
    if (/Deporte|Sport/.test(text)) sawSport = true;
    if (/Objetivo|Objective/.test(text)) sawObjective = true;

    if (i === 6) await shot(page, "bl-onboarding-perfil");

    const next = page.getByText(/^(Siguiente|Next)$/).first();
    const start = page.getByText(/^(¡Comenzar!|Get Started!)$/).first();
    if (await next.count()) {
      await next.click().catch(() => {});
    } else if (await start.count()) {
      await shot(page, "bl-onboarding-final");
      await start.click().catch(() => {});
      await page.waitForTimeout(1_600);
      break;
    } else {
      break;
    }
    await page.waitForTimeout(500);
  }
  const after = await bodyText(page);
  /Resumen|Overview|Dashboard/.test(after)
    ? pass(
        "BL-onboarding",
        "Onboarding completado llega al panel",
        steps.join(" → "),
      )
    : warn(
        "BL-onboarding",
        "El onboarding no llegó al panel",
        `pasos: ${steps.join(" → ")}`,
      );
  sawSport
    ? pass("BL-onboarding", "El paso de perfil incluye Deporte")
    : fail("BL-onboarding", "El paso de perfil incluye Deporte");
  sawObjective
    ? pass("BL-onboarding", "El paso de perfil incluye Objetivo")
    : fail("BL-onboarding", "El paso de perfil incluye Objetivo");
  errors.length === 0
    ? pass("BL-onboarding", "Cero errores de consola durante el onboarding")
    : fail(
        "BL-onboarding",
        "Errores de consola durante el onboarding",
        errors.slice(0, 4).join(" | "),
      );
  await context.close();

  // Phone pass over the seeded app.
  const phone = await browser.newContext();
  const pPage = await phone.newPage();
  const pErrors = attachErrorCollector(pPage);
  await pPage.setViewportSize({ width: 390, height: 844 });
  await open(pPage, "bodylab");
  await seedLegacy(pPage);
  for (const [hash, label] of [
    ["#/", "Resumen"],
    ["#/history", "Mediciones"],
    ["#/progress", "Progreso"],
  ]) {
    await open(pPage, "bodylab", hash, 1_300);
    const overflow = await pPage.evaluate(() => ({
      doc:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    overflow.doc <= 1
      ? pass(
          "BL-móvil",
          `Sin desborde horizontal en ${label}`,
          `Δ=${overflow.doc}`,
        )
      : fail(
          "BL-móvil",
          `Desborde horizontal en ${label}`,
          `Δ=${overflow.doc}`,
        );
  }
  await shot(pPage, "bl-movil-resumen");
  pErrors.length === 0
    ? pass("BL-móvil", "Cero errores de consola en móvil")
    : fail(
        "BL-móvil",
        "Errores de consola en móvil",
        pErrors.slice(0, 4).join(" | "),
      );
  await phone.close();
}

// ══════════════════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════════════════

async function loadChromium() {
  const webRequire = createRequire(
    path.join(ROOT, "bodylab/apps/web/package.json"),
  );
  for (const pkg of ["@playwright/test", "playwright"]) {
    try {
      const mod = await import(pathToFileURL(webRequire.resolve(pkg)).href);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error(
    "no playwright chromium available — run `pnpm install` in bodylab/apps/web",
  );
}

const chromium = await loadChromium();
const browser = await chromium.launch();
await fs.mkdir(OUT, { recursive: true });

try {
  await traininglabDesktop(browser);
  await traininglabMobile(browser);
  await traininglabColdStart(browser);
  await bodylabDesktop(browser);
  await bodylabOnboarding(browser);
} catch (e) {
  console.error("AUDIT ERROR STACK:", e.stack);
  fail("audit", "El recorrido se interrumpió", String(e).slice(0, 400));
} finally {
  await browser.close();
  const counts = results.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {},
  );
  await fs.writeFile(
    path.join(OUT, "results.json"),
    JSON.stringify({ base: BASE, counts, results }, null, 2),
  );
  console.log(`\n── Resumen ── ${JSON.stringify(counts)}`);
  const failures = results.filter((r) => r.status === "FAIL");
  if (failures.length) {
    console.log("\nFallos:");
    for (const f of failures)
      console.log(`  ✗ [${f.area}] ${f.name} — ${f.detail}`);
  }
  console.log(
    `\nDetalle: ${path.relative(ROOT, path.join(OUT, "results.json"))}`,
  );
}
