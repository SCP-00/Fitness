/**
 * The dictionary guard — every key the app uses must exist.
 *
 * Why this test exists: `t()` returns the key itself when it is missing, so a
 * dropped entry is invisible to TypeScript and to lint and reaches the screen as
 * `week.stress.title`. On 2026-10-09 the working tree had **83** such keys
 * missing at once (the whole `log.*`, `ex.history.*` and `progress.*` blocks
 * among them) and no check noticed. This walks the real source, so the next one
 * fails here instead of in front of the owner.
 *
 * It scans two things, because both are real call sites:
 *   1. `t("key")` / `tInterp("key", …)` — the literal call sites;
 *   2. every dotted-lowercase literal, which is how the maps pass keys around
 *      (`BAND_KEY[…].high`, `dest.labelKey`, `group.labelKey`).
 *
 * Keys a *local* copy map owns (e.g. `lib/format.ts` defines `reason.*` next to
 * the code that renders them) count as defined: this test is about the app never
 * showing a key, not about where the text lives.
 *
 * @module tests/training/test_traininglab_i18n_coverage
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { translationKeys } from "../../traininglab/apps/desktop/src/lib/i18n";

const SRC = fileURLToPath(
  new URL("../../traininglab/apps/desktop/src", import.meta.url),
);

/** Literals that look like keys but are names (localStorage id, a product). */
const NOT_KEYS = new Set(["llama.cpp", "traininglab.rail"]);

const KEY_LITERAL = /"([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)"/g;
const KEY_DEFINITION = /"([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)":\s*\{/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("TrainingLab dictionary coverage", () => {
  it("defines every key the app can render, wherever the key reaches the screen", () => {
    const files = walk(SRC);
    const defined = new Set(translationKeys());
    // Local copy maps define their own keys next to their components.
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(KEY_DEFINITION)) defined.add(m[1]);
    }

    const missing = new Set<string>();
    const scanned = new Set<string>();
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(KEY_LITERAL)) {
        const key = m[1];
        if (NOT_KEYS.has(key)) continue;
        scanned.add(key);
        if (!defined.has(key)) missing.add(`${key} (${path.relative(SRC, file)})`);
      }
    }

    // Self-check: if the walk or the pattern ever stops matching, the assertion
    // below would pass for the wrong reason. The app uses 400+ keys today.
    expect(scanned.size).toBeGreaterThan(300);
    expect([...missing].sort()).toEqual([]);
  });

  it("has no empty or half-translated entry", () => {
    const dict = fs.readFileSync(path.join(SRC, "lib/i18n.ts"), "utf8");
    const blocks = dict.split(/\n\s*"([a-z][a-zA-Z0-9.]*)":\s*\{/).slice(1);
    const problems: string[] = [];
    for (let i = 0; i < blocks.length; i += 2) {
      const key = blocks[i]!;
      const body = blocks[i + 1] ?? "";
      if (!/\ben:\s*"/.test(body) || !/\bes:\s*"/.test(body)) {
        problems.push(key);
      }
    }
    expect(problems).toEqual([]);
  });
});
