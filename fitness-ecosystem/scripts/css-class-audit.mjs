#!/usr/bin/env node
/**
 * `pnpm audit:css` — do the classes the components use exist, and does every rule
 * in the design system still have a user?
 *
 * Reports four directions (see `scripts/css-class-audit-lib.mjs` for the why and
 * the declared limits), plus any class name assembled at runtime that no string
 * scan can verify. Exit code 1 when any direction has findings, so it can be
 * used as a gate; the root suite asserts the same invariants with
 * `tests/training/test_css_class_audit.test.ts`.
 *
 * Usage:
 *   node scripts/css-class-audit.mjs            # TrainingLab (the app it guards)
 *   node scripts/css-class-audit.mjs --json     # machine-readable dump
 *   node scripts/css-class-audit.mjs --root <app-dir> --css <stylesheet>
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditCssClasses,
  staleAllowlistEntries,
  UNUSED_ALLOWLIST,
} from "./css-class-audit-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, ".."); // fitness-ecosystem/

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const opt = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : path.resolve(args[at + 1] ?? "");
};

const appDir = opt("root", path.join(repo, "traininglab/apps/desktop/src"));
const cssPath = opt("css", path.join(appDir, "index.css"));

/** Extensions worth scanning; `.css` is the stylesheet itself, not a consumer. */
const EXTENSIONS = [".ts", ".tsx", ".html"];

export function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      files.push(...walk(full));
      continue;
    }
    if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) files.push(full);
  }
  return files;
}

const sources = walk(appDir).map((file) => ({
  path: path.relative(repo, file).replace(/\\/g, "/"),
  text: readFileSync(file, "utf8"),
}));
// The app's own index.html is a consumer too (root classes, theme attributes).
try {
  const html = path.join(appDir, "..", "index.html");
  statSync(html);
  sources.push({
    path: path.relative(repo, html).replace(/\\/g, "/"),
    text: readFileSync(html, "utf8"),
  });
} catch {
  // No index.html to read: nothing to add.
}

const css = readFileSync(cssPath, "utf8");
const report = auditCssClasses({ css, sources });
// Fourth direction: an allowlist entry whose class came back to life (or left
// the stylesheet) is a lie about pending work, and lies rot the list.
const stale = staleAllowlistEntries({ css, sources });

if (asJson) {
  console.log(
    JSON.stringify(
      { css: path.relative(repo, cssPath), ...report, staleAllowlist: stale },
      null,
      2,
    ),
  );
  process.exit(hasFindings(report, stale) ? 1 : 0);
}

/** Any finding in any of the four directions fails the gate. */
function hasFindings(report, stale) {
  return (
    report.missing.length > 0 ||
    report.unused.length > 0 ||
    report.selectorOnly.length > 0 ||
    stale.length > 0
  );
}

const line = (n) => String(n).padStart(3);
console.log(
  `CSS ↔ classes — ${path.relative(repo, appDir)} → ${path.relative(repo, cssPath)}`,
);
console.log(
  `${report.counts.sources} ficheros · ${report.counts.defined} clases definidas · ` +
    `${report.counts.usedTl} clases tl-* usadas`,
);
console.log("");

if (report.missing.length === 0) {
  console.log("✓ Ninguna clase usada sin definir.");
} else {
  console.log(`✗ Usadas y NO definidas (${report.missing.length}):`);
  for (const item of report.missing) {
    console.log(`  ${line(item.files.length)} uso(s)  ${item.name}`);
    for (const file of item.files) console.log(`           · ${file}`);
  }
}
console.log("");

if (report.unused.length === 0) {
  console.log("✓ Ninguna clase definida sin usar.");
} else {
  console.log(`! Definidas y NO usadas (${report.unused.length}):`);
  for (const name of report.unused) console.log(`         ${name}`);
}
console.log("");

if (report.selectorOnly.length === 0) {
  console.log("✓ Ningún selector nombra una clase que no existe.");
} else {
  console.log(
    `✗ Nombradas en un selector (\`:has(…)\` / \`:not(…)\`) y en ningún otro sitio ` +
      `(${report.selectorOnly.length}):`,
  );
  for (const name of report.selectorOnly) console.log(`         ${name}`);
}
console.log("");

if (stale.length === 0) {
  console.log(
    `✓ Lista blanca al día (${UNUSED_ALLOWLIST.size} clases aparcadas, todas sin uso).`,
  );
} else {
  console.log(
    `✗ Entradas obsoletas de la lista blanca (${stale.length}) — esa clase ya se usa (o ya no existe), bórrala de UNUSED_ALLOWLIST:`,
  );
  for (const name of stale) console.log(`         ${name}`);
}
console.log("");

if (report.dynamic.length > 0) {
  console.log(
    `? Nombres montados en runtime, no verificables (${report.dynamic.length}):`,
  );
  for (const item of report.dynamic.slice(0, 20)) {
    console.log(
      `         ${item.pattern.replace(/\u0000/g, "${…}")}  (${item.path})`,
    );
  }
  console.log("");
}

process.exit(hasFindings(report, stale) ? 1 : 0);
