/**
 * The design system's two halves have to agree (2026-10-13).
 *
 * Why this exists: the quick-log bar of TrainingLab was once found rendering
 * with the browser's default styles, because the mockup-CSS port had deleted the
 * sixteen `.tl-entry*` rules while `SetEntryBar.tsx` kept asking for them — and
 * every gate stayed green. TypeScript cannot see a stylesheet, the linter does
 * not read class strings and no test mounts that component. This suite is what
 * makes the comparison load-bearing: it drives the **real app** (through
 * `scripts/css-class-audit.mjs`, the same command a human runs) and pins the
 * scanner rules that took a second pass to get right — a class named only inside
 * `:has(…)` is an expectation rather than a rule, a lone `"tl-rest"` is a
 * notification tag rather than a class, and a `/[";]/` literal must not swallow
 * the rest of the file.
 *
 * @module tests/training/css_class_audit
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  auditCssClasses,
  cssClassNames,
  cssPseudoReferences,
  scanSource,
  staleAllowlistEntries,
  UNUSED_ALLOWLIST,
} from "../../scripts/css-class-audit-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const CLI = path.resolve(REPO, "scripts/css-class-audit.mjs");

/** One `className` in a component, the shape every source scan meets. */
const classAttr = (...names: string[]) =>
  `<div className="${names.join(" ")}" />`;

describe("CSS ↔ classes: las reglas del escáner", () => {
  it("ve una clase usada y no definida, y sólo juzga el espacio `tl-`", () => {
    const report = auditCssClasses({
      css: ".tl-known { color: red; }",
      sources: [
        { path: "a.tsx", text: classAttr("tl-known", "tl-gone") },
        // Tailwind utilities are generated from these same sources at build
        // time: a missing one is a build error, never a silent no-op.
        { path: "b.tsx", text: classAttr("grid", "grid-cols-2", "mt-4") },
      ],
    });
    expect(report.missing.map((finding) => finding.name)).toEqual(["tl-gone"]);
    expect(report.missing[0]!.files).toEqual(["a.tsx"]);
  });

  it("una clase definida sin usuario se reporta, salvo si la lista blanca la aparca", () => {
    const report = auditCssClasses({
      css: ".tl-hero { color: red } .tl-dead { color: blue }",
      sources: [],
    });
    // `tl-hero` is a declared pending port; `tl-dead` is rot.
    expect(UNUSED_ALLOWLIST.has("tl-hero")).toBe(true);
    expect(report.unused).toEqual(["tl-dead"]);
    expect(report.counts.defined).toBe(2);
  });

  it("una clase nombrada sólo dentro de `:has(…)` es una expectativa, no una definición", () => {
    // The real defect this direction was written for: `.tl-zen-input` had been
    // renamed to `.tl-zen-step-input` everywhere, but a `:has()` branch kept
    // naming the old one — a branch that could never match again, invisible in
    // both other directions because the mention made the name look "defined".
    const css = `
      .tl-stage:has(.tl-ghost:focus) .tl-actions { position: sticky; }
      .tl-stage:has(.tl-live:focus) .tl-actions { position: sticky; }
      .tl-live { color: red; }
    `;
    expect(cssClassNames(css).has("tl-ghost")).toBe(false);
    expect(cssPseudoReferences(css).has("tl-ghost")).toBe(true);
    expect(cssPseudoReferences(css).has("tl-live")).toBe(true);
    expect(auditCssClasses({ css, sources: [] }).selectorOnly).toEqual([
      "tl-ghost",
    ]);
  });

  it("una cadena suelta no es una clase: `tl-rest` es un tag y `tl-active` un id", () => {
    const scan = scanSource(`
      notify("tl-rest");
      const plan = "tl-active";
      const el = ${classAttr("tl-a", "tl-b")};
    `);
    expect([...scan.tokens].sort()).toEqual(["tl-a", "tl-b"]);
    // Deliberately looser set: it exists only to spare a rule from deletion.
    expect(scan.loose.has("tl-rest")).toBe(true);
  });

  it("un literal de regex con comillas no se traga el resto del fichero", () => {
    const scan = scanSource(`
      const SEP = /[";]/;
      const el = ${classAttr("tl-after", "tl-deux")};
    `);
    expect([...scan.tokens].sort()).toEqual(["tl-after", "tl-deux"]);
  });

  it("una clase montada en runtime se declara como patrón, no como uso", () => {
    const source = { path: "x.tsx", text: "const c = `fam-${family}`;" };
    expect([...scanSource(source.text).patterns]).toEqual(["fam-\u0000"]);
    const report = auditCssClasses({
      css: ".fam-quadriceps { color: red }",
      sources: [source],
    });
    // The pattern explains the rule (no rot reported) and is disclosed…
    expect(report.unused).toEqual([]);
    expect(report.dynamic).toEqual([{ path: "x.tsx", pattern: "fam-\u0000" }]);
    // A `tl-` pattern is disclosed rather than silently trusted: it is listed so
    // a reader can see that the audit can no longer verify those names.
    const other = auditCssClasses({
      css: "",
      sources: [{ path: "y.tsx", text: "const c = `tl-${state}`;" }],
    });
    expect(other.dynamic).toEqual([{ path: "y.tsx", pattern: "tl-\u0000" }]);
  });

  it("una entrada de la lista blanca que recupera usuario es obsoleta", () => {
    const stale = staleAllowlistEntries({
      css: ".tl-hero { color: red }",
      sources: [{ path: "a.tsx", text: classAttr("tl-hero") }],
    });
    expect(stale).toContain("tl-hero");
    // A name the stylesheet no longer defines is stale too: the entry is a lie.
    expect(
      staleAllowlistEntries({ css: "", sources: [] }).length,
    ).toBeGreaterThan(0);
  });

  it("cada entrada de la lista blanca dice de dónde viene", () => {
    for (const [name, reason] of UNUSED_ALLOWLIST) {
      expect(reason.length, name).toBeGreaterThan(20);
    }
  });
});

describe("CSS ↔ classes: la app real", () => {
  it("TrainingLab no tiene clases huérfanas en ningún sentido", () => {
    const run = spawnSync(process.execPath, [CLI, "--json"], {
      cwd: REPO,
      encoding: "utf8",
    });
    // TypeScript cannot see this, the linter cannot see this, and no test mounts
    // these screens: the exit status of the audit *is* the assertion here.
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);

    const report = JSON.parse(run.stdout) as {
      missing: unknown[];
      unused: unknown[];
      selectorOnly: unknown[];
      staleAllowlist: unknown[];
      counts: { defined: number; usedTl: number; sources: number };
    };
    expect(report.missing).toEqual([]);
    expect(report.unused).toEqual([]);
    expect(report.selectorOnly).toEqual([]);
    expect(report.staleAllowlist).toEqual([]);
    // A report that scanned nothing would pass every assertion above. The two
    // source/definition floors are the load-bearing ones; the `tl-*` count is a
    // *shrinking* surface on purpose — the screens ported from the approved
    // mockup (2026-10-14 migration) use the mockup's unprefixed namespace, which
    // this audit does not judge — so its floor only has to be high enough to
    // fail if the scan comes back empty or half-read.
    expect(report.counts.sources).toBeGreaterThan(50);
    // 152 after the session port deleted the last `tl-entry*` block (2026-10-14):
    // the floor is a canary, not a target — raise it when the surface grows, lower
    // it only when a deletion justifies it.
    expect(report.counts.defined).toBeGreaterThan(120);
    expect(report.counts.usedTl).toBeGreaterThan(80);
  });
});
