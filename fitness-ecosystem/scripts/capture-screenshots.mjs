#!/usr/bin/env node
/**
 * Capture the screenshots the README shows.
 *
 * Why a script and not five hand-taken PNGs: a screenshot in a README is a claim
 * about what the app looks like, and it goes stale silently. This regenerates
 * them from the **built** bundle, in both a desktop and a phone viewport, so
 * refreshing the documentation is one command instead of a manual ritual.
 *
 * How the apps are made to look "lived in":
 *
 *   BodyLab      both gates it applies on a cold start are satisfied the way a
 *                returning user satisfies them — `bodylab-onboarding-done` in
 *                localStorage, plus the **legacy** localStorage payload that
 *                `db.migrateFromLocalStorageIfNeeded()` moves into IndexedDB on
 *                boot. Seeding it that way means the screenshot also exercises
 *                the migration path instead of bypassing it.
 *   TrainingLab  has no onboarding gate, so its fixtures go straight into the
 *                (`traininglab`) IndexedDB: settings + gear inventory, the
 *                BodyLab export payload, today's readiness and the logged sets.
 *
 * Each shot gets a **fresh browser context** (own storage + own IndexedDB), so
 * one capture can never inherit the previous one's state, and the previous
 * failure mode — five identical screenshots of the onboarding wizard — cannot
 * recur silently: every capture asserts an expected string is on screen and
 * throws if it is not.
 *
 * Usage (from the repo root, with a built bundle):
 *   node scripts/serve-lan.mjs --no-build &     # or just run it in another shell
 *   node scripts/capture-screenshots.mjs [--base http://localhost:8090]
 *
 * Output: docs/screenshots/*.png
 *
 * @module scripts/capture-screenshots
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const argv = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const BASE = valueOf("base", "http://localhost:8090").replace(/\/+$/, "");
const OUT = path.join(ROOT, "docs/screenshots");

/** Resolve chromium from the app that has Playwright installed (pnpm-private). */
async function loadChromium() {
  const webRequire = createRequire(path.join(ROOT, "bodylab/apps/web/package.json"));
  for (const pkg of ["@playwright/test", "playwright"]) {
    try {
      const mod = await import(pathToFileURL(webRequire.resolve(pkg)).href);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error("no playwright chromium available — run `pnpm install` in bodylab/apps/web");
}

// ── Fixtures ────────────────────────────────────────────────────────────────
// Values are chosen to look like a real person mid-programme, not like lorem
// ipsum: a 33-year-old, 81 kg, measured twice a couple of months apart.

const PROFILE = {
  id: "demo-profile",
  name: "Alex",
  // BodyLab stores the profile in **metres and kilograms** (`Profile.height`);
  // cm is only the unit the measurement rows use. Passing 178 here makes the
  // app's own validator throw during render and the screenshot comes out blank.
  height: 1.78,
  weight: 81.4,
  // Age is derived from this date (see lib/age.ts); the seed deliberately uses a
  // real birth date so the screenshots show the age feature working.
  birthDate: "1993-04-18",
  biologicalSex: "male",
  units: "metric",
  createdAt: "2026-05-02T08:00:00.000Z",
  updatedAt: "2026-09-27T08:00:00.000Z",
};

const MEASUREMENTS = [
  ["neck", 39.5, 0],
  ["shoulders", 122.4, 0],
  ["chest", 104.6, 0],
  ["waist", 84.2, 0],
  ["hips", 99.1, 0],
  ["biceps", 37.8, 0],
  ["forearm", 30.1, 0],
  ["thigh", 59.4, 0],
  ["calf", 38.6, 0],
  ["wrist", 17.4, 0],
  // An earlier pass, so the progress charts have a slope rather than a point.
  ["chest", 102.1, 70],
  ["waist", 87.9, 70],
  ["biceps", 36.2, 70],
  ["thigh", 58.0, 70],
  ["calf", 38.0, 70],
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

/** The owner's own home setup, so the planner's output is plausible. */
const INVENTORY = [
  { id: "gear-1", presetId: "pullup-bar", label: "Barra de dominadas", capabilities: ["pullup_bar"], maxLoadKg: null, incrementKg: null, setupMin: 0 },
  { id: "gear-2", presetId: "dip-bars", label: "Paralelas", capabilities: ["dip_bars", "rack"], maxLoadKg: null, incrementKg: null, setupMin: 1 },
  { id: "gear-3", presetId: "dumbbells-adjustable", label: "Mancuernas del garaje", capabilities: ["dumbbell"], maxLoadKg: 24, incrementKg: 1, setupMin: 1 },
  { id: "gear-4", presetId: "bike", label: "Bici de montaña", capabilities: ["bike"], maxLoadKg: null, incrementKg: null, setupMin: 2 },
];

/** A home-gym day: pull-heavy, matching that equipment. */
const PLAN = [
  ["pull-up", 4, 6, 10],
  ["incline-dumbbell-press", 4, 8, 12],
  ["one-arm-dumbbell-row", 3, 10, 12],
  ["bulgarian-split-squat", 3, 8, 12],
  ["nordic-curl", 3, 6, 8],
];

const SETS = PLAN.flatMap(([exerciseId, sets, , repsMax], rowIndex) =>
  Array.from({ length: Number(sets) }, (_, i) => ({
    id: `demo-set-${rowIndex}-${i}`,
    exerciseId,
    dayId: `day-${new Date().toISOString().slice(0, 10)}`,
    timestamp: new Date(Date.now() - (600 - rowIndex * 60 - i * 15) * 1000).toISOString(),
    weight: exerciseId === "pull-up" ? null : [22, 24, 20, 18, 0][rowIndex],
    reps: Number(repsMax) - i,
  })),
);

const TRAININGLAB_SETTINGS = {
  language: "es",
  sourcePath: "bodylab-traininglab.json",
  goal: "hypertrophy",
  level: "intermediate",
  timeBudgetMin: 90,
  inventory: INVENTORY,
  useDecisionModel: true,
  sound: { enabled: true, volume: 0.5 },
  notifications: { enabled: true, alsoWhenVisible: false },
  shared: { enabled: false, baseUrl: "http://localhost:8090", memberName: "", memberId: null },
  llm: { enabled: false, baseUrl: "http://127.0.0.1:8080/v1", model: "local-model", apiKey: "", timeoutSec: 60 },
};

const TRAININGLAB_PAYLOAD = {
  format: "bodylab-traininglab-link",
  version: 2,
  exportedAt: new Date().toISOString(),
  profile: { height: 178, weight: 81.4, age: 33, birthDate: PROFILE.birthDate, biologicalSex: "male", units: "metric" },
  measurements: [],
  muscleScores: [
    { segment: "chest", actual: 104.6, ideal: 110, score: 0.72, status: "near" },
    { segment: "biceps", actual: 37.8, ideal: 42, score: 0.61, status: "moderate" },
    { segment: "thigh", actual: 59.4, ideal: 64, score: 0.7, status: "near" },
    { segment: "calf", actual: 38.6, ideal: 41, score: 0.68, status: "near" },
  ],
  personalRecords: [
    { exerciseId: "incline-dumbbell-press", bestWeight: 26, bestReps: 8, bestEst1RM: 33, achievedAt: "2026-09-10T10:00:00.000Z" },
  ],
};

// ── Seeding (runs inside the page) ──────────────────────────────────────────

/** Put rows into an already-existing IndexedDB store of a BodyLab/TrainingLab DB. */
async function seedDb(page, dbName, writes) {
  await page.evaluate(
    ({ dbName, writes }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const names = [...new Set(writes.map((w) => w.store))];
          const tx = db.transaction(names, "readwrite");
          for (const w of writes) {
            for (const row of w.rows) tx.objectStore(w.store).put(row);
          }
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        };
      }),
    { dbName, writes },
  );
}

const seedBodylab = async (page) => {
  // The legacy payload the app migrates into IndexedDB on boot. `bodylab-profile`
  // and `bodylab-measurements` are the shapes `db.migrateFromLocalStorageIfNeeded`
  // parses; the language is stored JSON-encoded.
  await page.evaluate(
    ({ profile, measurements }) => {
      localStorage.setItem("bodylab-onboarding-done", "true");
      localStorage.setItem("bodylab-language", JSON.stringify("es"));
      localStorage.setItem("bodylab-reference", JSON.stringify("adonis"));
      localStorage.setItem("bodylab-profile", JSON.stringify(profile));
      localStorage.setItem("bodylab-measurements", JSON.stringify(measurements));
    },
    { profile: PROFILE, measurements: MEASUREMENTS },
  );
};

const seedTraininglab = () =>
  // TrainingLab has no localStorage layer: its fixtures are written directly.
  (page) =>
    seedDb(page, "traininglab", [
      {
        store: "meta",
        rows: [
          { id: "settings", value: TRAININGLAB_SETTINGS },
          { id: "payload", value: TRAININGLAB_PAYLOAD },
          { id: "readiness", value: { date: new Date().toISOString().slice(0, 10), readiness: { energy: 4, motivation: 4, soreness: 3 } } },
        ],
      },
      { store: "sets", rows: SETS },
    ]);

// ── Capture ─────────────────────────────────────────────────────────────────

async function capture(browser, { name, url, viewport, seed: seeder, settle = 1400, expect, reject }) {
  const [base, hash] = url.split("#");
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();
  // A page that throws while rendering still has a valid DOM to screenshot, so
  // surface the error instead of shipping a blank PNG.
  page.on("pageerror", (e) => console.log(`  ! ${name} threw: ${String(e).slice(0, 200)}`));
  try {
    await page.setViewportSize(viewport);
    await page.goto(base, { waitUntil: "load" });
    // The first load exists only to let the app create its schema.
    if (seeder) {
      await page.waitForTimeout(900);
      await seeder(page);
    }
    // Both apps route with HashRouter, and a "navigation" that only changes the
    // hash is a *same-document* one: goto() returns before the router has mounted
    // the target route, so the screenshot would show the previous page (that is
    // how bodylab-overview and bodylab-measure once came out byte-identical).
    // Setting the hash and reloading forces the router to mount the route with the
    // fixture already in place — and a reload is where BodyLab runs its migration.
    if (hash) await page.evaluate((h) => { window.location.hash = h; }, hash);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(settle);

    const text = await page.evaluate(() => document.body.innerText);
    // `reject` guards the empty state: TrainingLab renders "SERIES HOY" whether or
    // not the fixture landed, so the seeded shots also assert what must be gone.
    if (reject && text.includes(reject)) {
      throw new Error(`${name}: page still shows "${reject}" — the fixture did not reach the app.`);
    }
    if (expect && !text.includes(expect)) {
      throw new Error(
        `${name}: expected to see "${expect}" but the page shows: ${JSON.stringify(text.slice(0, 160))}`,
      );
    }
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    const heading = text.split("\n").filter(Boolean)[0] ?? "?";
    console.log(`✓ docs/screenshots/${name}.png  (${viewport.width}×${viewport.height}, "${heading}")`);
  } finally {
    await context.close();
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

const chromium = await loadChromium();
const browser = await chromium.launch();
await fs.mkdir(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

try {
  await capture(browser, {
    name: "bodylab-overview",
    url: `${BASE}/bodylab/`,
    viewport: DESKTOP,
    seed: seedBodylab,
    expect: "Resumen",
  });
  await capture(browser, {
    name: "bodylab-history",
    url: `${BASE}/bodylab/#/history`,
    viewport: DESKTOP,
    seed: seedBodylab,
    settle: 1800,
    expect: "Mediciones",
  });
  await capture(browser, {
    name: "bodylab-phone",
    url: `${BASE}/bodylab/`,
    viewport: PHONE,
    seed: seedBodylab,
    expect: "Resumen",
  });
  await capture(browser, {
    name: "traininglab-today",
    url: `${BASE}/traininglab/`,
    viewport: DESKTOP,
    seed: seedTraininglab(),
    settle: 2000,
    expect: "series registradas",
    reject: "0 series registradas",
  });
  await capture(browser, {
    name: "traininglab-phone",
    url: `${BASE}/traininglab/`,
    viewport: PHONE,
    seed: seedTraininglab(),
    settle: 2000,
    expect: "series registradas",
    reject: "0 series registradas",
  });
} finally {
  await browser.close();
}

console.log(`\nDone → ${path.relative(process.cwd(), OUT)}`);
