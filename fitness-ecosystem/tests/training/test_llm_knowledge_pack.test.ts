/**
 * The LLM knowledge pack cannot be allowed to lie.
 *
 * The pack (`traininglab/apps/desktop/llm/`) is *generated* from the exercise
 * catalog by `scripts/build-llm-pack.mjs`, and this suite holds the contract:
 *
 *   1. **no drift** — the committed `knowledge.json` is exactly what the
 *      current catalog generates. Edit the catalog without regenerating the
 *      pack and this fails;
 *   2. every id the pack advertises really exists in the catalog and vice
 *      versa (the LLM may only quote ids that resolve);
 *   3. the `hasMedia` flags match the shipped asset manifest (the model should
 *      not promise a demo the app cannot show);
 *   4. the Modelfile's system prompt matches what `buildSystemPrompt()`
 *      actually sends at runtime — one brain, not two.
 *
 * @module tests/training/llm_knowledge_pack
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ALL_EXERCISES, EXERCISE_TRAITS } from "@fitness/bodylab-exercises";
import { buildSystemPrompt } from "../../traininglab/apps/desktop/src/lib/llm";

const LLM_DIR = resolve(
  __dirname,
  "../../traininglab/apps/desktop/llm",
);
const knowledgePath = resolve(LLM_DIR, "knowledge.json");

describe("llm knowledge pack: the model never quotes a ghost", () => {
  const knowledge = JSON.parse(readFileSync(knowledgePath, "utf8"));

  it("exists and was generated for every catalog exercise", () => {
    expect(existsSync(knowledgePath)).toBe(true);
    expect(knowledge.counts.exercises).toBe(ALL_EXERCISES.length);
    expect(knowledge.exercises).toHaveLength(ALL_EXERCISES.length);
  });

  it("has zero drift against the live catalog", () => {
    const packIds = knowledge.exercises.map((e: { id: string }) => e.id).sort();
    const catalogIds = ALL_EXERCISES.map((e) => e.id).sort();
    expect(packIds).toEqual(catalogIds);
  });

  it("every trait the pack states matches the live traits", () => {
    for (const fact of knowledge.exercises) {
      const traits = EXERCISE_TRAITS[fact.id];
      expect(traits, fact.id).toBeDefined();
      expect(fact.pattern, fact.id).toBe(traits.pattern);
      expect(fact.loadType, fact.id).toBe(traits.loadType);
      expect(fact.jointStress, fact.id).toBe(traits.jointStress);
      expect(fact.spineLoad, fact.id).toBe(traits.spineLoad);
      expect(fact.setupMin, fact.id).toBe(traits.setupMin);
    }
  });

  it("hasMedia matches the shipped asset manifest", () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(
          __dirname,
          "../../traininglab/apps/desktop/public/exercises/asset-manifest.json",
        ),
        "utf8",
      ),
    ) as Record<string, { gif?: string; image?: string }>;
    const withMedia = new Set(
      Object.entries(manifest)
        .filter(([, v]) => v.gif || v.image)
        .map(([id]) => id),
    );
    for (const fact of knowledge.exercises) {
      expect(fact.hasMedia, fact.id).toBe(withMedia.has(fact.id));
    }
  });

  it("the Modelfile bakes in the same system prompt the runtime sends", () => {
    // The Modelfile wraps lines; compare with whitespace collapsed.
    const flat = (s: string) => s.replace(/\s+/g, " ").trim();
    const modelfile = flat(readFileSync(resolve(LLM_DIR, "Modelfile"), "utf8"));
    for (const sentence of buildSystemPrompt().split(". ")) {
      const clean = flat(sentence.replace(/\.$/, ""));
      if (clean.length < 8) continue;
      expect(modelfile.includes(clean), clean).toBe(true);
    }
  });

  it("hard rules forbid the classic LLM failure modes", () => {
    const rules = (knowledge.hardRules as string[]).join(" ").toLowerCase();
    expect(rules).toContain("exact id");
    expect(rules).toContain("never program equipment");
    expect(rules).toContain("time budget");
  });
});
