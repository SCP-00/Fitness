#!/usr/bin/env node
/**
 * Brand icon pipeline — masters → PNG icons for both apps.
 *
 * Masters live in `resources/brand/` and are the single source of truth:
 *   bodylab-icon.jpg / bodylab-icon.png / bodylab-icon.svg
 *   traininglab-icon.jpg / traininglab-icon.png / traininglab-icon.svg
 *
 * The current brand artwork is raster (a JPG/PNG square painted by an image
 * model), so the pipeline resizes through a canvas instead of asking for a
 * vector re-draw. SVG masters still work if you replace them later.
 *
 * Rasterising goes through the Playwright chromium that the e2e suite already
 * installs, so no extra dependency (no sharp, no ImageMagick) is needed.
 *
 * Usage (from the repo root):  node scripts/render-brand-icons.mjs
 *
 * Then, for the Tauri shell, regenerate the platform icon set from the 1024
 * master with the CLI that ships in the desktop app:
 *   cd bodylab/apps/desktop && npx tauri icon ../../../resources/brand/bodylab-icon-1024.png
 *
 * @module scripts/render-brand-icons
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/**
 * Resolve a browser driver from the app that has it installed. The web app
 * depends on `@playwright/test` (which re-exports `chromium`), not on
 * `playwright` directly, and pnpm does not hoist either to the repo root.
 */
async function loadChromium() {
  // Resolve from the web app's own dependency graph (pnpm keeps deps private).
  const webRequire = createRequire(
    path.join(ROOT, "bodylab/apps/web/package.json"),
  );
  for (const pkg of ["@playwright/test", "playwright"]) {
    try {
      const resolved = webRequire.resolve(pkg);
      const mod = await import(pathToFileURL(resolved).href);
      // CJS interop: `import()` of a CJS build exposes the exports under
      // `default` (and sometimes as named ones) depending on the loader.
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    "no playwright chromium available — run `pnpm install` in bodylab/apps/web",
  );
}

/** First existing master for an app slug (jpg → png → svg), as a repo path. */
async function findMaster(slug) {
  for (const ext of ["jpg", "jpeg", "png", "svg"]) {
    const rel = `resources/brand/${slug}-icon.${ext}`;
    try {
      await fs.access(path.join(ROOT, rel));
      return rel;
    } catch {
      // keep looking
    }
  }
  throw new Error(`no master found for "${slug}" in resources/brand/`);
}

const MIME = {
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

const chromium = await loadChromium();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

/**
 * Rasterise one master at one size and return the PNG bytes.
 *
 * SVG masters are laid out as real SVG and screenshotted; raster masters are
 * drawn into a canvas (which also normalises JPEG → PNG).
 */
async function renderPng(masterRel, size) {
  const masterPath = path.join(ROOT, masterRel);
  const ext = path.extname(masterRel).toLowerCase();

  if (ext === ".svg") {
    const svg = await fs.readFile(masterPath, "utf8");
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><html><head><style>
         html,body{margin:0;padding:0;background:transparent}
         svg{display:block;width:${size}px;height:${size}px}
       </style></head><body>${svg}</body></html>`,
      { waitUntil: "load" },
    );
    return page.locator("svg").screenshot({ omitBackground: true });
  }

  const bytes = await fs.readFile(masterPath);
  const dataUrl = `data:${MIME[ext]};base64,${bytes.toString("base64")}`;

  const pngDataUrl = await page.evaluate(
    async ({ src, px }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, px, px);
      return canvas.toDataURL("image/png");
    },
    { src: dataUrl, px: size },
  );
  return Buffer.from(pngDataUrl.split(",")[1], "base64");
}

async function writePng(masterRel, outRel, size) {
  const outPath = path.join(ROOT, outRel);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, await renderPng(masterRel, size));
  console.log(`✓ ${outRel} (${size}px)`);
}

/**
 * A crisp `<link rel="icon" type="image/svg+xml">` that wraps the raster mark.
 *
 * The artwork is raster, so there is no vector to ship; embedding the PNG in an
 * SVG document still gives browsers a single scalable, theme-agnostic icon file
 * (and keeps `favicon.svg` referenced from `index.html` truthful instead of
 * stale). The payload is small — 128 px is plenty for a favicon and for the
 * 36 px in-app header.
 */
async function writeSvgWrapper(masterRel, outRel, px = 128) {
  const bytes = await renderPng(masterRel, px);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" ` +
    `width="${px}" height="${px}">` +
    `<image href="data:image/png;base64,${bytes.toString("base64")}" ` +
    `width="${px}" height="${px}"/></svg>\n`;
  const outPath = path.join(ROOT, outRel);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, svg);
  console.log(`✓ ${outRel} (${px}px, embedded PNG)`);
}

/**
 * The sizes baked into `resources/brand/<slug>-icon.ico` — the Windows shell
 * picks the closest one per surface (Alt+Tab, taskbar, small icons, large
 * tiles), so shipping the whole ladder matters.
 */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

/**
 * Encode PNG buffers as a multi-size ICO file.
 *
 * Vista and later accept PNG-compressed entries directly inside the container,
 * so there is no need to hand-roll BMP/DIB data (or to shell out to
 * ImageMagick). Entry width/height fields are single bytes with 0 meaning 256.
 */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;
  entries.forEach(({ size, png }, i) => {
    const at = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, at); // width
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1); // height
    directory.writeUInt8(0, at + 2); // palette colours (0 = truecolour)
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((e) => e.png)]);
}

/** Rasterise every size and write `<slug>-icon.ico` next to the masters. */
async function writeIco(masterRel, outRel) {
  const entries = [];
  for (const size of ICO_SIZES) {
    entries.push({ size, png: await renderPng(masterRel, size) });
  }
  const outPath = path.join(ROOT, outRel);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, encodeIco(entries));
  console.log(`✓ ${outRel} (${ICO_SIZES.join("/")}px)`);
}

const bodylab = await findMaster("bodylab");
const traininglab = await findMaster("traininglab");
console.log(`masters: ${bodylab} · ${traininglab}\n`);

for (const [slug, master, web] of [
  ["bodylab", bodylab, "bodylab/apps/web/public"],
  ["traininglab", traininglab, "traininglab/apps/desktop/public"],
]) {
  // 1024 reference master (what `npx tauri icon` consumes)
  await writePng(master, `resources/brand/${slug}-icon-1024.png`, 1024);
  // Web shell: browser tab, iOS home screen, PWA-ish large icon, header mark
  await writePng(master, `${web}/favicon.png`, 64);
  await writeSvgWrapper(master, `${web}/favicon.svg`, 128);
  await writePng(master, `${web}/apple-touch-icon.png`, 180);
  await writePng(master, `${web}/icon-512.png`, 512);
  // Windows shell: desktop shortcuts and file-explorer thumbnails
  await writeIco(master, `resources/brand/${slug}-icon.ico`);
}

await browser.close();

console.log("\nDone. For the desktop shell:");
console.log(
  "  cd bodylab/apps/desktop && npx tauri icon ../../resources/brand/bodylab-icon-1024.png",
);
