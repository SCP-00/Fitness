#!/usr/bin/env node
/**
 * Accessibility audit for TrainingLab: WCAG contrast **measured on the real
 * rendered DOM**, plus a check that the primary action is reachable in the
 * first viewport on the narrowest phones.
 *
 * Why a separate script from `audit-app-behavior.mjs`. That audit answers
 * "does the app work"; this one answers "is the text readable and is the
 * decision reachable". They fail for different reasons and a regression in
 * neither should mask the other.
 *
 * Why it does not trust the stylesheet. `index.css` states ratios in its
 * comments (`--tl-text-muted` is `#8b96a1` "because worst case in the app is
 * muted on surface-3 at 4.57:1"). A comment is a claim about a pair of hex
 * values; it is not a measurement of what the browser actually paints, where
 * the background can be a gradient, a translucent overlay or a blend. The plan
 * (`docs/plan_evaluacion_qa_ui_ux.md`) says to re-measure on every real
 * surface rather than infer approval from an isolated value, so this walks the
 * live DOM instead.
 *
 * Gradients are measured at their **worst stop**, which is the conservative
 * reading: if any point of the gradient fails, the text fails somewhere.
 *
 * Usage: node scripts/audit-contrast.mjs [--base http://localhost:8090]
 * Exit code: 0 when every AA check passes, 1 when something fails.
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const argv = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const BASE = valueOf("base", "http://localhost:8090").replace(/\/+$/, "");
const OUT = path.join(ROOT, "tmp/audit-contrast");

/** TrainingLab's six destinations, as `app/router.ts` defines them. */
const ROUTES = [
  ["hoy", "Inicio"],
  ["ejercicios", "Ejercicios"],
  ["semana", "Semana"],
  ["sesion", "Entrenamiento"],
  ["progreso", "Progreso"],
  ["ajustes", "Ajustes"],
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "movil", width: 390, height: 844 },
];

/** Narrow phones and short viewports, where the first viewport is smallest. */
const CTA_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 414, height: 736 },
  { width: 1440, height: 900 },
];

const PROFILE = {
  birthDate: "1992-04-11",
  height: 1.78,
  weight: 81.4,
  sex: "male",
  activityLevel: "moderate",
  goal: "muscle",
};

/**
 * Owned gear, in the real `OwnedEquipment` shape (`lib/types.ts`): every entry
 * carries `capabilities`, and the planner reads that array directly. An entry
 * without it does not degrade — it takes the whole app down with
 * `n.capabilities is not iterable`, which is why this fixture copies the shape
 * from `audit-app-behavior.mjs` instead of inventing a tidier one.
 */
const INVENTORY = [
  {
    id: "gear-1",
    presetId: "barbell",
    label: "Barra olímpica",
    capabilities: ["barbell"],
    maxLoadKg: 140,
    incrementKg: 2.5,
    setupMin: 2,
  },
  {
    id: "gear-2",
    presetId: "bench",
    label: "Banco plano",
    capabilities: ["bench", "box"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 1,
  },
  {
    id: "gear-3",
    presetId: "rack",
    label: "Jaula",
    capabilities: ["rack"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 1,
  },
  {
    id: "gear-4",
    presetId: "dumbbells-adjustable",
    label: "Mancuernas del garaje",
    capabilities: ["dumbbell"],
    maxLoadKg: 24,
    incrementKg: 1,
    setupMin: 1,
  },
  {
    id: "gear-5",
    presetId: "pullup-bar",
    label: "Barra de dominadas",
    capabilities: ["pullup_bar"],
    maxLoadKg: null,
    incrementKg: null,
    setupMin: 0,
  },
];

const SETTINGS = {
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
  shared: { enabled: false, baseUrl: "", memberName: "", memberId: null },
  llm: {
    enabled: false,
    baseUrl: "http://127.0.0.1:8080/v1",
    model: "local-model",
    apiKey: "",
    timeoutSec: 60,
  },
};

const PAYLOAD = {
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
    { segment: "chest", actual: 104.6, ideal: 110, score: 0.72, status: "near" },
    { segment: "biceps", actual: 37.8, ideal: 42, score: 0.61, status: "moderate" },
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

/** A few logged sets, so Progreso and Semana paint populated surfaces too. */
const HISTORY = Array.from({ length: 12 }, (_, index) => {
  const day = new Date(Date.now() - index * 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return {
    id: `seed-${index}`,
    dayId: day,
    exerciseId: index % 2 === 0 ? "incline-dumbbell-press" : "back-squat",
    setIndex: 1,
    warmup: false,
    weight: 20 + index,
    reps: 8 + (index % 4),
    rpe: 7 + (index % 3) * 0.5,
    timestamp: `${day}T18:0${index % 6}:00.000Z`,
    notes: "",
  };
});

// ── Reporting ───────────────────────────────────────────────────────────────

const checks = [];
const record = (area, name, status, detail = "") =>
  checks.push({ area, name, status, detail });

/**
 * Playwright is a dependency of the WEB app, not of this workspace root, so a
 * bare `import("@playwright/test")` from `scripts/` resolves to nothing (Node
 * resolves a bare specifier from the importing file's directory upwards, and
 * the root's `node_modules` does not have it). `createRequire(...).resolve`
 * with explicit paths is what makes the script work from the repository root,
 * which is where the documented command runs.
 */
const loadChromium = async () => {
  const require = createRequire(import.meta.url);
  const paths = [
    ROOT,
    path.join(ROOT, "bodylab/apps/web"),
    path.join(ROOT, "bodylab/apps/desktop"),
    path.join(ROOT, "traininglab/apps/desktop"),
  ];
  for (const specifier of ["@playwright/test", "playwright"]) {
    try {
      const resolved = require.resolve(specifier, { paths });
      const mod = await import(pathToFileURL(resolved).href);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      /* try the next specifier */
    }
  }
  throw new Error(
    "no playwright chromium available — run `pnpm install` in fitness-ecosystem",
  );
};

// ── Seeding ─────────────────────────────────────────────────────────────────

async function seed(page) {
  await page.evaluate(
    ({ settings, payload, history }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open("traininglab", 1);
        req.onupgradeneeded = (event) => {
          const db = event.target.result;
          for (const store of ["meta", "sets", "sessions"]) {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: "id" });
            }
          }
        };
        req.onerror = () => reject(req.error || new Error("IDB open error"));
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
            const sets = tx.objectStore("sets");
            for (const entry of history) sets.put(entry);
            tx.oncomplete = () => {
              db.close();
              resolve(true);
            };
            tx.onerror = () => {
              db.close();
              reject(tx.error || new Error("IDB tx error"));
            };
          } catch (error) {
            db.close();
            reject(error);
          }
        };
      }),
    { settings: SETTINGS, payload: PAYLOAD, history: HISTORY },
  );
}

/** A hash-only `goto` is a same-document navigation; set it, then reload. */
async function open(page, hash, settle = 1100) {
  await page.goto(`${BASE}/traininglab/`, {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });
  await page.waitForTimeout(400);
  await page.evaluate((value) => {
    window.location.hash = value;
  }, `#/${hash}`);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForTimeout(settle);
}

// ── The measurement, which runs inside the page ─────────────────────────────

/**
 * This whole function is stringified and executed in the browser, so it must
 * stay self-contained: no imports, no closure over Node values.
 */
const MEASURE = () => {
  /**
   * Resolve ANY CSS colour to rgba by making the browser paint it.
   *
   * A regex over `rgb(...)` is not enough: Chromium serialises a gradient stop
   * or a `color-mix()` in whatever space the stylesheet asked for
   * (`oklab(...)`, `color(srgb ...)`), and a parser that only understands
   * `rgb()` silently drops those layers — which shows up as text measured
   * against the page background instead of the accent it really sits on, i.e.
   * a false 1:1 failure. A 1×1 canvas accepts every syntax the engine
   * supports and returns one normalised value.
   */
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();

  const parseColor = (value) => {
    if (!value || value === "none" || value === "transparent") return null;
    if (cache.has(value)) return cache.get(value);
    let resolved = null;
    try {
      // An impossible-to-request sentinel: a value the engine cannot parse
      // leaves `fillStyle` unchanged, and reading that back as a colour would
      // invent a layer that is not on screen. (Using black as the sentinel
      // would misfire on genuinely black text.)
      ctx.fillStyle = "rgb(1, 2, 3)";
      ctx.fillStyle = value;
      if (ctx.fillStyle !== "rgb(1, 2, 3)") {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        resolved = { r, g, b, a: a / 255 };
      }
    } catch {
      resolved = null;
    }
    cache.set(value, resolved);
    return resolved;
  };

  /** Composite `top` over `bottom` (both opaque or not). */
  const over = (top, bottom) => {
    const alpha = top.a + bottom.a * (1 - top.a);
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (channel) =>
      (top[channel] * top.a + bottom[channel] * bottom.a * (1 - top.a)) / alpha;
    return { r: mix("r"), g: mix("g"), b: mix("b"), a: alpha };
  };

  /**
   * Every colour a gradient could paint, so contrast can be read worst-case.
   * Scans balanced parentheses so a nested `color-mix(in oklab, ...)` is taken
   * whole instead of being cut at its first inner `)`.
   */
  const stopsOf = (backgroundImage) => {
    if (!backgroundImage || backgroundImage === "none") return [];
    const out = [];
    const opener = /(rgba?|oklab|oklch|hsl|hsla|lab|lch|color|color-mix)\s*\(/gi;
    let match;
    while ((match = opener.exec(backgroundImage)) !== null) {
      let depth = 1;
      let index = opener.lastIndex;
      while (index < backgroundImage.length && depth > 0) {
        if (backgroundImage[index] === "(") depth += 1;
        else if (backgroundImage[index] === ")") depth -= 1;
        index += 1;
      }
      const token = backgroundImage.slice(match.index, index);
      const colour = parseColor(token);
      if (colour) out.push(colour);
    }
    return out;
  };

  const relativeLuminance = ({ r, g, b }) => {
    const channel = (value) => {
      const scaled = value / 255;
      return scaled <= 0.03928
        ? scaled / 12.92
        : Math.pow((scaled + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const contrast = (foreground, background) => {
    const a = relativeLuminance(foreground);
    const b = relativeLuminance(background);
    const lighter = Math.max(a, b);
    const darker = Math.min(a, b);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const label = (element) => {
    const id = element.id ? `#${element.id}` : "";
    const classes = Array.from(element.classList).slice(0, 2).join(".");
    return `${element.tagName.toLowerCase()}${id}${classes ? `.${classes}` : ""}`;
  };

  /**
   * Backdrop candidates behind `element`, worst case included.
   * Walks ancestors until an opaque layer is found, compositing translucent
   * ones (and every gradient stop) into the running result.
   */
  const backdrops = (element) => {
    const layers = [];
    let node = element;
    let opaqueFound = false;
    while (node && node !== document.documentElement.parentNode) {
      const style = getComputedStyle(node);
      const base = parseColor(style.backgroundColor);
      const stops = stopsOf(style.backgroundImage);
      if (stops.length > 0) {
        for (const stop of stops) layers.push(stop);
        if (stops.every((stop) => stop.a >= 0.999)) opaqueFound = true;
      } else if (base && base.a > 0) {
        layers.push(base);
        if (base.a >= 0.999) opaqueFound = true;
      }
      if (opaqueFound) break;
      node = node.parentElement;
    }
    // Nothing opaque anywhere: the page root, which the stylesheet fills with
    // `--tl-bg`. Using it as the floor is honest, not a guess.
    layers.push({ r: 8, g: 11, b: 14, a: 1 });

    const results = [];
    for (let index = 0; index < layers.length; index += 1) {
      let composited = layers[index];
      for (let below = index + 1; below < layers.length; below += 1) {
        composited = over(composited, layers[below]);
      }
      results.push(composited);
    }
    return results;
  };

  const samples = [];
  for (const element of document.querySelectorAll("body *")) {
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (Number(style.opacity) === 0) continue;
    if (element.closest("[aria-hidden='true']")) continue;

    // Only elements that actually paint text themselves: an ancestor's colour
    // is inherited, so measuring it again would just duplicate the child.
    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent.trim())
      .join(" ")
      .trim();
    if (!ownText) continue;

    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;

    const foreground = parseColor(style.color);
    if (!foreground) continue;

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
    const requiredAA = isLarge ? 3 : 4.5;

    let worst = Infinity;
    let worstBackground = null;
    for (const backdrop of backdrops(element)) {
      const value = contrast(over(foreground, backdrop), backdrop);
      if (value < worst) {
        worst = value;
        worstBackground = backdrop;
      }
    }

    samples.push({
      selector: label(element),
      text: ownText.slice(0, 42),
      color: `${foreground.r},${foreground.g},${foreground.b}`,
      background: worstBackground
        ? `${Math.round(worstBackground.r)},${Math.round(worstBackground.g)},${Math.round(worstBackground.b)}`
        : null,
      fontSize: Math.round(size * 10) / 10,
      fontWeight: weight,
      isLarge,
      ratio: Math.round(worst * 100) / 100,
      requiredAA,
      passesAA: worst >= requiredAA,
      passesAAA: worst >= (isLarge ? 4.5 : 7),
    });
  }
  return samples;
};

// ── Checks ──────────────────────────────────────────────────────────────────

const worstBy = (samples) =>
  [...samples].sort((a, b) => a.ratio - b.ratio).slice(0, 15);

const dedupe = (samples) => {
  const groups = new Map();
  for (const sample of samples) {
    const key = `${sample.color}|${sample.background}|${sample.fontSize}|${sample.fontWeight}|${sample.requiredAA}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (sample.ratio < existing.ratio) Object.assign(existing, sample);
    } else {
      groups.set(key, { ...sample, count: 1 });
    }
  }
  return [...groups.values()].sort((a, b) => a.ratio - b.ratio);
};

async function auditContrast(browser) {
  const all = [];
  const failures = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    await open(page, "hoy", 400);
    await seed(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(1200);

    for (const [hash, name] of ROUTES) {
      await open(page, hash);
      const samples = await page.evaluate(MEASURE);
      const withContext = samples.map((sample) => ({
        ...sample,
        route: name,
        viewport: viewport.name,
      }));
      all.push(...withContext);
      const bad = withContext.filter((sample) => !sample.passesAA);
      failures.push(...bad);
      record(
        `contraste · ${name} · ${viewport.name}`,
        `${samples.length} nodos de texto medidos`,
        bad.length === 0 ? "PASS" : "FAIL",
        bad.length === 0
          ? `peor ratio ${worstBy(withContext)[0]?.ratio ?? "n/a"}:1`
          : `${bad.length} por debajo de AA; peor ${worstBy(bad)[0].ratio}:1 en ${worstBy(bad)[0].selector}`,
      );
    }

    record(
      `consola · ${viewport.name}`,
      "sin errores de página",
      consoleErrors.length === 0 ? "PASS" : "FAIL",
      consoleErrors.slice(0, 2).join(" | "),
    );
    await context.close();
  }

  fs.writeFileSync(
    path.join(OUT, "contrast.json"),
    JSON.stringify({ base: BASE, total: all.length, groups: dedupe(all), failures }, null, 2),
  );
  return { all, failures };
}

/**
 * The primary action must be inside the first viewport: on a phone in a gym,
 * an action that needs a scroll before you know it exists is not a primary
 * action. `.tl-btn-primary` is the app's accent-filled button.
 */
async function auditFirstViewportCta(browser) {
  for (const viewport of CTA_VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await open(page, "hoy", 400);
    await seed(page);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(1400);

    const result = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll(".tl-btn-primary"),
      ).filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      if (buttons.length === 0) return { found: 0 };
      const sorted = buttons
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: (element.textContent || "").trim().slice(0, 40),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            visible: rect.bottom <= window.innerHeight && rect.top >= 0,
          };
        })
        .sort((a, b) => a.top - b.top);
      return {
        found: buttons.length,
        viewportHeight: window.innerHeight,
        first: sorted[0],
        anyVisible: sorted.some((entry) => entry.visible),
      };
    });

    const name = `${viewport.width}×${viewport.height}`;
    if (result.found === 0) {
      record(
        `CTA · ${name}`,
        "acción primaria visible sin desplazar",
        "FAIL",
        "no hay ningún .tl-btn-primary en Inicio",
      );
    } else {
      record(
        `CTA · ${name}`,
        "acción primaria visible sin desplazar",
        result.anyVisible ? "PASS" : "FAIL",
        result.anyVisible
          ? `«${result.first.text}» a ${result.first.top}px (viewport ${result.viewportHeight}px)`
          : `la primera está a ${result.first.top}px en un viewport de ${result.viewportHeight}px — fuera del primer scroll`,
      );
    }
    await context.close();
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

fs.mkdirSync(OUT, { recursive: true });
const chromium = await loadChromium();
const browser = await chromium.launch();

try {
  await auditFirstViewportCta(browser);
  const { all, failures } = await auditContrast(browser);
  const groups = dedupe(all);
  const failingGroups = groups.filter((group) => !group.passesAA);

  console.log(
    `\n${all.length} nodos de texto medidos en ${ROUTES.length} rutas × ${VIEWPORTS.length} viewports.\n`,
  );
  console.log(`Pares únicos (color × fondo × tamaño × peso): ${groups.length}`);
  console.log(
    `  · por encima de AA: ${groups.length - failingGroups.length}`,
  );
  console.log(`  · por debajo de AA: ${failingGroups.length}\n`);

  if (failingGroups.length > 0) {
    console.log("PEOR CONTRASTE (agrupado, peor ratio primero):");
    for (const group of failingGroups.slice(0, 12)) {
      console.log(
        `  ${String(group.ratio).padStart(5)}:1 (necesita ${group.requiredAA}:1) ` +
          `${group.fontSize}px/${group.fontWeight} — ${group.count}× en ` +
          `${group.route}/${group.viewport} — rgb(${group.color}) sobre rgb(${group.background})`,
      );
      console.log(`         «${group.text}» · ${group.selector}`);
    }
    console.log("");
  } else {
    console.log("Sin violaciones de AA en ningún nodo medido.\n");
  }

  // The pairs the stylesheet's own comment claims, measured for real.
  const muted = groups.filter((group) => group.color === "139,150,161");
  if (muted.length > 0) {
    const worst = muted[0];
    const best = muted[muted.length - 1];
    console.log(
      `--tl-text-muted (rgb 139,150,161) medido de verdad: peor ${worst.ratio}:1 ` +
        `sobre rgb(${worst.background}) en ${worst.route}/${worst.viewport}, ` +
        `mejor ${best.ratio}:1 sobre rgb(${best.background}).\n`,
    );
  }

  const counts = { PASS: 0, FAIL: 0, WARN: 0 };
  for (const check of checks) counts[check.status] += 1;
  for (const check of checks) {
    console.log(`[${check.status}] ${check.area} — ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
  }
  console.log(`\n${counts.PASS} PASS / ${counts.FAIL} FAIL / ${counts.WARN} WARN`);
  console.log(`Informe: tmp/audit-contrast/contrast.json\n`);

  fs.writeFileSync(
    path.join(OUT, "checks.json"),
    JSON.stringify({ base: BASE, counts, checks }, null, 2),
  );

  process.exitCode = failures.length > 0 || counts.FAIL > 0 ? 1 : 0;
} finally {
  await browser.close();
}
