#!/usr/bin/env node
/**
 * One-button LAN server — test both apps on a phone without a Mac, a cable or
 * an app store.
 *
 * What it does
 *   1. (optional) builds both web apps with `vite build --base=./` so the
 *      bundles are relocatable under a subpath;
 *   2. starts a single dependency-free HTTP server on 0.0.0.0 that serves
 *        /              → a hub page with both links + the LAN URL
 *        /bodylab/      → bodylab/apps/web/dist
 *        /traininglab/  → traininglab/apps/desktop/dist
 *   3. prints every URL the phone can use.
 *
 * Why a static server and not the Vite dev server: both apps are 100 % local
 * (no backend, state in IndexedDB), so the production bundle IS the full app —
 * faster to load on a phone and no HMR websocket to tunnel. Use `pnpm dev` when
 * you are editing code.
 *
 * Both apps are built with a relative base (`--base=./`), which is what lets
 * two independent SPAs live under two paths of one origin. BodyLab's asset
 * loaders already read `import.meta.env.BASE_URL`, so the 3D engine and the
 * anatomy atlas keep working from `/bodylab/`.
 *
 * Usage
 *   node scripts/serve-lan.mjs                 # build if needed, then serve
 *   node scripts/serve-lan.mjs --port 8090
 *   node scripts/serve-lan.mjs --build         # force a rebuild first
 *   node scripts/serve-lan.mjs --no-build      # fail instead of building
 *   node scripts/serve-lan.mjs --open          # also open the hub in a browser
 *   node scripts/serve-lan.mjs --open traininglab   # …or jump straight to one app
 *   node scripts/serve-lan.mjs --shared        # also run the shared SQLite store
 *   node scripts/serve-lan.mjs --shared --data C:\path\to\store
 *
 * `--shared` is the only mode with a database, and it needs the built-in
 * `node:sqlite` (Node 22.5+). Without it the server is exactly what it has always
 * been: a static file server that stores nothing.
 *
 * Privacy note printed on the hub: everything served is public on that Wi-Fi
 * and every device keeps its own data (IndexedDB is per-browser, per-origin).
 *
 * @module scripts/serve-lan
 */

import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createLanStore } from "./lan-store.mjs";
import { createApiHandler } from "./lan-api.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Arguments ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const valueOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const PORT = Number.parseInt(valueOf("port", "8090"), 10);
const FORCE_BUILD = flag("build");
const NO_BUILD = flag("no-build");

/**
 * `--open [app]` — open a browser once the server is listening. The optional
 * app id (bodylab / traininglab) skips the hub so a desktop shortcut can land
 * directly in the app it is named after. Anything else opens the hub.
 */
const OPEN_INDEX = argv.indexOf("--open");
const OPEN_APP = OPEN_INDEX >= 0 ? argv[OPEN_INDEX + 1] : undefined;

/**
 * `--shared` turns on the household database, and `--data` moves it.
 *
 * Off by default: a server that suddenly starts accepting writes (and printing a
 * database file) would be a surprising change for someone who just wanted to open
 * the app on their phone.
 */
const SHARED = flag("shared");
const DATA_DIR = valueOf("data", path.join(ROOT, ".lan-data"));

const APPS = [
  {
    id: "bodylab",
    mount: "/bodylab/",
    label: "BodyLab",
    tagline: "Antropometría, composición corporal y modelo 3D",
    accent: "#6366f1",
    dir: "bodylab/apps/web",
  },
  {
    id: "traininglab",
    mount: "/traininglab/",
    label: "TrainingLab",
    tagline: "La sesión de hoy, con registro y coach local opcional",
    accent: "#f97316",
    dir: "traininglab/apps/desktop",
  },
];

// ── Build ─────────────────────────────────────────────────────────────────
/**
 * Build one app with a relative base. `pnpm exec` keeps us inside that
 * package's dependency graph, which is where vite is installed.
 */
function build(app, reason) {
  console.log(`\n▶ ${app.label}: ${reason} — building…`);
  // `pnpm` is a .cmd shim on Windows and Node refuses to spawn those without a
  // shell, so hand the whole command over as one string (which also sidesteps
  // the DEP0190 warning about unescaped args alongside `shell: true`).
  const res = spawnSync("pnpm exec vite build --base=./", {
    cwd: path.join(ROOT, app.dir),
    stdio: "inherit",
    shell: true,
  });
  if (res.status !== 0) {
    console.error(`\n✖ ${app.label} build failed (exit ${res.status}).`);
    console.error("  Run it by hand to see the error:");
    console.error(`    cd ${app.dir} && pnpm exec vite build --base=./`);
    process.exit(1);
  }
}

for (const app of APPS) {
  const distIndex = path.join(ROOT, app.dir, "dist", "index.html");
  if (FORCE_BUILD) {
    build(app, "forced with --build");
  } else if (!fs.existsSync(distIndex)) {
    if (NO_BUILD) {
      console.error(
        `✖ ${app.dir}/dist/index.html is missing and --no-build was given.`,
      );
      process.exit(1);
    }
    build(app, "no bundle yet");
  }
}

// ── Static file serving ───────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".mp4": "video/mp4",
  ".gif": "image/gif",
};

function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

/**
 * Serve `file` under `root`, falling back to `root/index.html` for extensionless
 * paths (a deep link into a SPA) and 404 for everything else.
 */
async function serveFile(res, root, relPath) {
  // Normalise, then refuse anything that escapes the root ("../").
  const target = path.resolve(root, "." + path.posix.normalize(`/${relPath}`));
  if (target !== root && !target.startsWith(root + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let file = target;
  try {
    const stat = await fsp.stat(file);
    if (stat.isDirectory()) file = path.join(file, "index.html");
  } catch {
    // Not a file: treat an extensionless path as a client-side route.
    if (path.extname(relPath) === "") {
      file = path.join(root, "index.html");
    } else {
      res.writeHead(404).end("Not found");
      return;
    }
  }

  try {
    const body = await fsp.readFile(file);
    res.writeHead(200, {
      "Content-Type": contentType(file),
      "Content-Length": body.length,
      // The bundles are content-hashed; index.html must never be cached or the
      // phone keeps an old build after a rebuild.
      "Cache-Control":
        path.basename(file) === "index.html"
          ? "no-store"
          : "public, max-age=3600",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

// ── Hub page ──────────────────────────────────────────────────────────────
function localAddresses() {
  const out = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) out.push(entry.address);
    }
  }
  // Home routers hand out 192.168.x.x / 10.x.x.x; show those first.
  return out.sort((a, b) => {
    const rank = (ip) =>
      ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : 2;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
}

function hubHtml(primaryUrl, ips, shared = false) {
  const cards = APPS.map(
    (app) => `
      <a class="app" href="${app.mount}" style="--accent:${app.accent}">
        <img src="${app.mount}favicon.png" alt="" width="52" height="52" />
        <span class="meta">
          <b>${app.label}</b>
          <span>${app.tagline}</span>
        </span>
        <span class="go">Abrir →</span>
      </a>`,
  ).join("");

  const others = ips
    .slice(1)
    .map((ip) => `<li><code>http://${ip}:${PORT}/</code></li>`)
    .join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0a" />
    <title>BodyLab + TrainingLab — servidor local</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0; padding: 28px 18px calc(28px + env(safe-area-inset-bottom, 0px));
        background: #0a0a0a; color: #fafafa;
        font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      main { max-width: 560px; margin: 0 auto; }
      h1 { font-size: 20px; margin: 0 0 4px; }
      p.lead { color: #a3a3a3; margin: 0 0 22px; font-size: 13px; }
      .app {
        display: flex; align-items: center; gap: 14px;
        padding: 16px; margin-bottom: 12px;
        background: #141414; border: 1px solid #2a2a2a; border-radius: 16px;
        color: inherit; text-decoration: none;
      }
      .app:active { border-color: var(--accent); }
      .app img { border-radius: 12px; background: #0a0a0a; flex: none; }
      .meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
      .meta b { font-size: 16px; }
      .meta span { color: #a3a3a3; font-size: 12.5px; }
      .go { color: var(--accent); font-weight: 600; font-size: 13px; white-space: nowrap; }
      .url {
        display: flex; align-items: center; gap: 10px; margin: 22px 0 6px;
        padding: 12px 14px; background: #141414; border: 1px solid #2a2a2a; border-radius: 12px;
      }
      .url code { font-size: 15px; font-weight: 600; letter-spacing: 0.01em; overflow-wrap: anywhere; }
      button {
        margin-left: auto; flex: none; cursor: pointer;
        background: #f97316; color: #0a0a0a; border: 0; border-radius: 10px;
        padding: 10px 14px; font: inherit; font-weight: 600;
      }
      button:active { background: #ea580c; }
      h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.07em; color: #737373; margin: 26px 0 8px; }
      ul { margin: 0; padding-left: 18px; color: #a3a3a3; font-size: 13px; }
      ul code { color: #fafafa; }
      .note { color: #a3a3a3; font-size: 13px; }
      .note b { color: #fafafa; }
    </style>
  </head>
  <body>
    <main>
      <h1>BodyLab + TrainingLab</h1>
      <p class="lead">Servidor local de esta laptop. Todo se ejecuta aquí; el teléfono solo dibuja.</p>

      ${cards}

      <div class="url">
        <code id="u">${primaryUrl}</code>
        <button id="c">Copiar</button>
      </div>
      <p class="note">Ábrelo en el iPhone (misma red Wi-Fi) y añádelo a inicio.</p>

      <h2>Antes de empezar</h2>
      <ul>
        <li>El teléfono y la laptop tienen que estar en la <b>misma Wi-Fi</b>.</li>
        <li>Cualquiera en esa red puede abrir estas URLs mientras el servidor esté encendido. Pulsa <code>Ctrl+C</code> en la terminal para apagarlo.</li>
        ${
          shared
            ? `<li><b>Historial compartido activo.</b> Los registros que subas se guardan en la base de datos de esta laptop y los ve todo el grupo. Elige tu nombre en TrainingLab → <b>Ajustes → Historial compartido</b>. Cualquiera en esta Wi-Fi puede leer y escribir: úsalo en casa, no en una red pública.</li>`
            : `<li>Los datos viven en el navegador de cada dispositivo (IndexedDB). Lo que registres en el iPhone <b>no</b> aparece en la laptop: exporta el JSON de BodyLab y súbelo en TrainingLab del otro dispositivo, o al revés.</li>`
        }
        <li>El <b>coach local</b> de TrainingLab apunta a <code>127.0.0.1</code> por defecto; desde el iPhone cámbialo a la IP de la laptop y arranca llama.cpp con <code>--host 0.0.0.0 --port 8080</code>.</li>
      </ul>

      ${others ? `<h2>Otras IPs de esta laptop</h2><ul>${others}</ul>` : ""}
    </main>
    <script>
      const button = document.getElementById("c");
      button?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(document.getElementById("u").textContent);
          button.textContent = "¡Copiado!";
          setTimeout(() => (button.textContent = "Copiar"), 1500);
        } catch {
          button.textContent = "Selecciónalo";
        }
      });
    </script>
  </body>
</html>`;
}

// ── Server ────────────────────────────────────────────────────────────────
const roots = new Map(
  APPS.map((app) => [app.id, path.join(ROOT, app.dir, "dist")]),
);

// ── Optional shared store ─────────────────────────────────────────────────
// Opened before the server so a missing node:sqlite fails loudly at startup
// instead of turning every /api call into a 500 later.
let store = null;
let handleApi = null;
if (SHARED) {
  try {
    store = createLanStore({ dir: DATA_DIR });
    handleApi = createApiHandler({ store });
  } catch (error) {
    console.error(`\n✖ ${error.message}\n`);
    process.exit(1);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  // The API lives under /api/ and gets first refusal; everything else falls
  // through to the static server below.
  if (handleApi && (await handleApi(req, res, url))) return;

  if (pathname === "/" || pathname === "/index.html") {
    const ips = localAddresses();
    const host = ips[0] ?? "localhost";
    const html = hubHtml(`http://${host}:${PORT}/`, ips, Boolean(store));
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(html);
    return;
  }

  const app = APPS.find(
    (a) => pathname === a.mount.slice(0, -1) || pathname.startsWith(a.mount),
  );
  if (!app) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const rel = pathname.slice(app.mount.length - 1);
  await serveFile(res, roots.get(app.id), rel);
});

server.listen(PORT, "0.0.0.0", () => {
  const ips = localAddresses();
  const host = ips[0] ?? "localhost";
  const line = "─".repeat(58);

  console.log(`\n${line}`);
  console.log(`  Servidor local listo. Abre esto en el iPhone:`);
  console.log(`\n      http://${host}:${PORT}/`);
  console.log("");
  for (const app of APPS) {
    console.log(
      `      ${app.label.padEnd(12)} http://${host}:${PORT}${app.mount}`,
    );
  }
  if (ips.length > 1) {
    console.log(
      `\n  Otras IPs: ${ips
        .slice(1)
        .map((ip) => `http://${ip}:${PORT}/`)
        .join("  ")}`,
    );
  }
  if (ips.length === 0) {
    console.log(
      "\n  ⚠ No hay IP de red local — ¿Wi-Fi desconectada? Solo localhost funciona.",
    );
  }
  console.log(`\n  En esta laptop:  http://localhost:${PORT}/`);
  console.log(`  Parar:           Ctrl+C`);

  if (store) {
    console.log(`\n  Base de datos compartida (SQLite): ${store.file}`);
    console.log(`  Miembros dados de alta: ${store.members().length}`);
    console.log("  ⚠ Este modo NO es privado: cualquiera en esta Wi-Fi puede leer y");
    console.log("    escribir los registros de todos. Perfecto en casa, no lo dejes");
    console.log("    abierto en una red pública.");
  } else {
    console.log(`\n  Sin base de datos (modo normal). Para compartir historial entre`);
    console.log(`  dispositivos:  node scripts/serve-lan.mjs --shared`);
  }
  console.log(`${line}\n`);

  if (OPEN_INDEX >= 0) {
    const app = APPS.find((a) => a.id === OPEN_APP);
    openInBrowser(`http://localhost:${PORT}${app ? app.mount : "/"}`);
  }
});

/**
 * Hand a URL to the OS default browser without adding a dependency: `start`
 * on Windows (via cmd, because `start` is a shell builtin), `open` on macOS,
 * `xdg-open` elsewhere. Failures are non-fatal — the URL is printed anyway.
 */
function openInBrowser(url) {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
    console.log(`  Abriendo en el navegador: ${url}\n`);
  } catch {
    console.log(`  (No se pudo abrir el navegador; abre ${url} a mano)\n`);
  }
}

const shutdown = () => {
  console.log("\nServidor detenido.");
  server.close(() => process.exit(0));
  // A second Ctrl+C should not be ignored while sockets drain.
  setTimeout(() => process.exit(0), 500).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
