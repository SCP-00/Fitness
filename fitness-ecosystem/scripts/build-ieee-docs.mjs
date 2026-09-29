#!/usr/bin/env node
/**
 * Compile the IEEE technical reports in `docs/ieee/` to PDF.
 *
 *   node scripts/build-ieee-docs.mjs           # build every .tex (default)
 *   node scripts/build-ieee-docs.mjs --check   # is the toolchain there? are PDFs stale?
 *   node scripts/build-ieee-docs.mjs bodylab.tex
 *
 * The engine is **tectonic**: one portable executable, no installation, no
 * admin rights, and it fetches the TeX packages it needs on first run (cache
 * under the user profile). It is looked up first in the repository-local
 * `.tools/tectonic/` (gitignored) and then on `PATH`, so a machine with a full
 * TeX Live or MiKTeX works too.
 *
 * Why not the usual pdflatex: this repository must build for someone who clones
 * it and has nothing installed, and `IEEEtran` is a package, not a gift.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, ".."); // fitness-ecosystem/
const DOCS = path.join(ROOT, "docs/ieee");

const LOCAL_TECTONIC = [
  path.join(ROOT, "../.tools/tectonic/tectonic.exe"),
  path.join(ROOT, "../.tools/tectonic/tectonic"),
];

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const wanted = args.filter((a) => !a.startsWith("--"));

function findTectonic() {
  for (const p of LOCAL_TECTONIC) if (existsSync(p)) return p;
  const probe = spawnSync("tectonic", ["--version"], { encoding: "utf8" });
  if (probe.status === 0) return "tectonic";
  return null;
}

const engine = findTectonic();
const docs = existsSync(DOCS)
  ? readdirSync(DOCS).filter((f) => f.endsWith(".tex"))
  : [];

if (!docs.length) {
  console.error(`no .tex documents found in ${path.relative(ROOT, DOCS)}`);
  process.exit(1);
}

const targets = wanted.length ? docs.filter((d) => wanted.includes(d)) : docs;

if (!engine) {
  console.error(
    "\nNo LaTeX engine found.\n\n" +
      "  Easiest (portable, no admin):\n" +
      "    mkdir -p .tools/tectonic && cd .tools/tectonic\n" +
      '    curl -sL -o t.zip "https://github.com/tectonic-typesetting/tectonic/releases/latest/download/tectonic-0.17.0-x86_64-pc-windows-msvc.zip"\n' +
      "    unzip t.zip && ./tectonic.exe --version\n\n" +
      "  Or install TeX Live / MiKTeX and put `tectonic` on PATH.\n"
  );
  process.exit(2);
}

const isNewer = (a, b) => {
  try {
    return statSync(a).mtimeMs > statSync(b).mtimeMs;
  } catch {
    return true;
  }
};

if (checkOnly) {
  console.log(`\nengine: ${engine}\n`);
  let stale = 0;
  for (const d of targets) {
    const pdf = d.replace(/\.tex$/, ".pdf");
    const fresh = existsSync(path.join(DOCS, pdf)) && !isNewer(path.join(DOCS, d), path.join(DOCS, pdf));
    if (!fresh) stale++;
    console.log(`  ${fresh ? "✔" : "…"} ${d} → ${pdf}${fresh ? " (up to date)" : " (needs a build)"}`);
  }
  console.log(`\n${targets.length - stale}/${targets.length} up to date\n`);
  process.exit(stale ? 1 : 0);
}

let failed = 0;
for (const d of targets) {
  const started = Date.now();
  const res = spawnSync(engine, ["-X", "compile", d], {
    cwd: DOCS,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const pdf = path.join(DOCS, d.replace(/\.tex$/, ".pdf"));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  // TeX runs twice, so the same warning arrives twice: count distinct ones.
  const warnings = new Set(
    (res.stderr ?? "").split("\n").filter((l) => l.includes("Overfull"))
  ).size;
  if (res.status !== 0 || !existsSync(pdf)) {
    failed++;
    console.log(`  ✘ ${d}  (${seconds}s)`);
    const err = (res.stderr ?? "").split("\n").filter((l) => l.startsWith("error") || l.startsWith("! "));
    for (const e of err.slice(0, 6)) console.log(`      ${e}`);
    continue;
  }
  const kb = (statSync(pdf).size / 1024).toFixed(0);
  console.log(
    `  ✔ ${d.padEnd(18)} → ${path.basename(pdf).padEnd(18)} ${kb.padStart(5)} KB  ${seconds}s` +
      (warnings ? `  (${warnings} overfull boxes — cosmetic)` : "  (clean)")
  );
}

console.log(`\n${targets.length - failed}/${targets.length} documents built in ${path.relative(ROOT, DOCS)}\n`);
process.exit(failed ? 1 : 0);
