#!/usr/bin/env node
/**
 * Verifies every mockup page the way a reviewer would: real browser, real
 * layout, real media.
 *
 * For each page it asserts:
 *   * it loads with NO console error and no failed request;
 *   * no horizontal overflow (the `1fr` + form-control trap);
 *   * every <img> actually decoded (naturalWidth > 0);
 *   * the expected anchor text of that page is on screen.
 *
 * Run from `fitness-ecosystem/` (needs the dev server up):
 *   node mockup/tools/verify.mjs [--base http://127.0.0.1:8123] [--shots]
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const ffRoot = path.resolve(toolsDir, "../.."); // fitness-ecosystem/
const root = path.resolve(toolsDir, ".."); // mockup/

/** Same resolver the repo's screenshot script uses: Playwright is pnpm-private. */
async function loadChromium() {
  const webRequire = createRequire(path.join(ffRoot, "bodylab/apps/web/package.json"));
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
const baseArg = process.argv.indexOf("--base");
const base = baseArg > -1 ? process.argv[baseArg + 1] : "http://127.0.0.1:8123";
const shots = process.argv.includes("--shots");

const PAGES = [
  ["index.html", "Mockups de referencia", ["Hoy", "Progreso", "Semana"]],
  ["01-hoy.html", "Hoy", ["Piernas + Trapecios", "Equipo necesario", "Tu coach (IA)", "Resumen rápido"]],
  ["02-entrenamiento.html", "Entrenamiento del día", ["¿Por qué estos?", "Añadir varios", "Mi orden", "Agrupado por equipamiento"]],
  ["03-sesion.html", "Sesión en vivo", ["Serie 2 de 4", "Registro de hoy", "Cues de técnica", "Descanso"]],
  ["04-semana.html", "Semana", ["Semana 41", "Realizado", "Descanso", "Ejercicios y series"]],
  ["05-ejercicios.html", "Ejercicios", ["Crear ejercicio propio", "Técnica", "Músculos", "Progresión", "Usar hoy"]],
  ["06-rutinas.html", "Rutinas", ["Rutinas recomendadas para ti", "Planes de entrenamiento", "Ver rutina"]],
  ["07-progreso.html", "Progreso", ["Tu cuerpo en general", "Grupos musculares", "Simetría y equilibrio", "Adherencia semanal"]],
  ["08-historial.html", "Historial", ["Todas las sesiones", "Repetir esta sesión", "Récords"]],
  ["09-ajustes.html", "Configuración", ["Equipo disponible", "Coach local (IA)", "Datos y copias de seguridad"]],
];

const chromium = await loadChromium();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
let failures = 0;

for (const [file, title, expect] of PAGES) {
  const page = await context.newPage();
  const errors = [];
  const failed = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

  await page.goto(`${base}/${file}`, { waitUntil: "load" });
  await page.waitForTimeout(700);

  const report = await page.evaluate((expectList) => {
    const text = document.body.innerText;
    const imgs = [...document.images];
    return {
      docTitle: document.title,
      missingText: expectList.filter((t) => !text.includes(t)),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      imgTotal: imgs.length,
      imgBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")),
      mediaRendered: document.querySelectorAll("[data-media] img, [data-media] .media-missing").length,
      mediaSlots: document.querySelectorAll("[data-media]").length,
      // An inline SVG with only a viewBox has no intrinsic size and stretches to
      // fill its parent, which is how a 24x24 chevron rendered 663 px tall
      // (found in owner review, 2026-10-11). `.chart` is the one deliberate
      // large SVG in the system.
      oversizedIcons: [...document.querySelectorAll("svg")]
        .filter((s) => !s.classList.contains("chart"))
        .map((s) => ({ el: s, r: s.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 40 || r.height > 40)
        .map(({ el, r }) => `${el.parentElement?.className || "?"}:${Math.round(r.width)}x${Math.round(r.height)}`),
      railActive: document.querySelector(".rail-item.is-active")?.textContent.trim() ?? null,
      galleryCards: document.querySelectorAll("[data-gallery] .gcard").length,
      behaviour: null,
      heading: document.querySelector("h1, .topbar-title")?.textContent.trim().slice(0, 40) ?? "",
    };
  }, expect);

  // Behaviour, not just presence: open the modal, click every tab panel.
  const behaviour = await page.evaluate(async () => {
    const out = {};
    const open = document.querySelector("[data-open-modal]");
    if (open) {
      open.click();
      const dialog = document.querySelector("[data-modal-panel]");
      out.modalOpens = !!dialog && !dialog.classList.contains("hide");
      dialog?.querySelector("[data-close]")?.click();
      out.modalCloses = !!dialog?.classList.contains("hide");
    }
    const panels = [...document.querySelectorAll("[data-panel]")];
    if (panels.length) {
      const groups = [...new Set(panels.map((p) => p.dataset.panel.split(":")[0]))];
      let ok = true;
      for (const g of groups) {
        const tabs = [...document.querySelectorAll(`[data-switch="${g}"] [data-value]`)];
        if (!tabs.length) continue;
        for (const tab of tabs) {
          tab.click();
          const mine = [...document.querySelectorAll(`[data-panel^="${g}:"]`)].filter(
            (p) => !p.classList.contains("hide"),
          );
          if (mine.length !== 1 || mine[0].dataset.panel !== `${g}:${tab.dataset.value}`) ok = false;
        }
      }
      out.tabsSwitch = ok;
      out.panelCount = panels.length;
    }
    return out;
  });

  const problems = [];
  if (behaviour.modalOpens === false) problems.push("modal does not open");
  if (behaviour.modalCloses === false) problems.push("modal does not close");
  if (behaviour.tabsSwitch === false) problems.push("tab panels do not switch exclusively");
  if (errors.length) problems.push(`console: ${errors.slice(0, 3).join(" | ")}`);
  if (failed.length) problems.push(`requests: ${failed.slice(0, 3).join(" | ")}`);
  if (report.missingText.length) problems.push(`missing text: ${report.missingText.join(", ")}`);
  if (report.overflowX > 1) problems.push(`h-overflow ${report.overflowX}px`);
  if (report.imgBroken.length) problems.push(`broken imgs: ${report.imgBroken.slice(0, 3).join(", ")}`);
  if (report.mediaSlots !== report.mediaRendered) problems.push(`media ${report.mediaRendered}/${report.mediaSlots} slots filled`);
  if (report.oversizedIcons.length) problems.push(`giant icons: ${report.oversizedIcons.slice(0, 4).join(", ")}`);

  if (problems.length) failures += 1;
  console.log(`${problems.length ? "✗" : "✓"} ${file.padEnd(22)} ${report.heading.padEnd(26)} ${report.galleryCards ? report.galleryCards + " cards · " : ""}imgs ${report.imgTotal}`);
  for (const p of problems) console.log(`    · ${p}`);

  if (shots) {
    mkdirSync(path.join(root, "shots"), { recursive: true });
    await page.screenshot({ path: path.join(root, "shots", file.replace(".html", ".png")), fullPage: true });
  }
  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? "ALL PAGES OK" : failures + " PAGE(S) WITH PROBLEMS"}`);
process.exit(failures === 0 ? 0 : 1);
