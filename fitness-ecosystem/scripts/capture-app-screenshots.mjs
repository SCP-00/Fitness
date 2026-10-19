/**
 * Screenshots of the *running TrainingLab app*, with the sample data loaded.
 *
 * Why this exists next to `capture-screenshots.mjs`: that one photographs the
 * built BodyLab bundle with its own fixtures, and BodyLab is frozen. This one
 * photographs TrainingLab's screens during the reference-image port, so a layout
 * can be judged with weeks of history in it instead of an empty profile — which
 * is the difference between a screen that works and one that merely looks tidy
 * when it is empty.
 *
 * It seeds through the app's own "Load sample data" button (`lib/demo.ts`), so it
 * exercises the same import path a restore uses, and it reports console errors
 * and horizontal overflow for every route it visits.
 *
 * Usage: start the desktop dev server first (`cd traininglab/apps/desktop && pnpm dev`,
 * which listens on 5174), then `node scripts/capture-app-screenshots.mjs`.
 * Override the origin with `BASE` and the output directory with `OUT`.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { mkdir } from "node:fs/promises";

/*
 * Playwright is installed by the web app, not by the workspace root, so it is
 * resolved through that package.json — the same trick `capture-screenshots.mjs`
 * uses. Importing it bare from the root fails.
 */
async function loadChromium() {
  const webRequire = createRequire(
    path.join(path.resolve("."), "bodylab/apps/web/package.json"),
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
  throw new Error("no playwright chromium available — run `pnpm install`");
}

const BASE = (process.env.BASE ?? "http://localhost:5174").replace(/\/+$/, "");
const OUT = process.env.OUT ?? "mockup/shots";

/** `route` is the hash the app understands; `name` is the file it is saved as. */
const ROUTES = [
  ["hoy", "app-hoy"],
  ["sesion", "app-sesion"],
  ["semana", "app-semana"],
  ["ejercicios", "app-ejercicios"],
  ["progreso", "app-progreso"],
  ["ajustes", "app-ajustes"],
];

const chromium = await loadChromium();
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();

const problems = [];
page.on("console", (msg) => {
  if (msg.type() === "error") problems.push(`console: ${msg.text()}`);
});
page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));

/*
 * Seed through the app's own button, which lives inside a collapsed section:
 * opening the `<details>` first is what a person does too, and it keeps the
 * script honest about the path a user takes.
 */
await page.goto(`${BASE}/#/ajustes`);
await page.waitForSelector('[data-testid="load-demo"]', {
  state: "attached",
  timeout: 30000,
});
await page.evaluate(() => {
  const host = document.querySelector('[data-testid="load-demo"]');
  const section = host?.closest("details");
  if (section) section.open = true;
  host?.querySelector("button")?.click();
});
await page.waitForTimeout(6000);
console.log(
  "seed:",
  ((await page.textContent('[role="status"]')) ?? "(no status)").trim(),
);

for (const [route, name] of ROUTES) {
  // A hash-only change is a same-document navigation, so the router picks it up
  // without a reload — the same thing the rail does when clicked.
  await page.evaluate((next) => {
    window.location.hash = `#/${next}`;
  }, route);
  await page.waitForTimeout(2200);

  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const report = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
    // A raw i18n key on screen means a missing dictionary entry: `t()` returns
    // the key itself, which TypeScript cannot catch.
    rawKeys: (document.body.innerText.match(/[a-z]+\.[a-z]+\.[a-z]+/g) ?? [])
      .filter((s) => !s.includes("@"))
      .slice(0, 3),
  }));
  console.log(
    `${name}: overflow=${report.overflow}${
      report.rawKeys.length > 0 ? ` rawKeys=${report.rawKeys.join(",")}` : ""
    }`,
  );
}

console.log(
  "problems:",
  problems.length === 0 ? "none" : problems.slice(0, 8).join(" | "),
);
await browser.close();
