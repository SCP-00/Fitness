#!/usr/bin/env node
/**
 * Mockup tools · dump the REAL catalog.
 *
 * The mockups must show the app's own exercises, not a hand-copied list that
 * drifts. This loads the catalog exactly like the app does — through the web
 * app's Vite, so the `@fitness/*` aliases resolve — and writes
 * `mockup/data/catalog.json`.
 *
 * Run from `fitness-ecosystem/`:
 *   node mockup/tools/dump-catalog.mjs
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../.."); // fitness-ecosystem/
const outDir = path.resolve(root, "mockup/data");

const require = createRequire(path.join(root, "bodylab/apps/web/package.json"));
const { createServer } = require("vite");

const server = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  server: { middlewareMode: true },
  resolve: {
    alias: {
      "@fitness/bodylab-exercises": path.join(root, "bodylab/core/exercises/src"),
      "@fitness/bodylab-training": path.join(root, "bodylab/core/training/src"),
    },
  },
});

try {
  const mod = await server.ssrLoadModule("@fitness/bodylab-exercises");
  const rows = mod.ALL_EXERCISES.map((e) => {
    const traits = mod.getTraits?.(e.id) ?? null;
    const primaries = (e.muscles ?? [])
      .filter((m) => m.intensity === 3)
      .map((m) => m.muscle);
    return {
      id: e.id,
      en: e.name?.en ?? "",
      es: e.name?.es ?? "",
      category: e.category,
      difficulty: e.difficulty,
      hypertrophy: e.hypertrophy,
      equipment: e.equipment ?? { en: "", es: "" },
      primaryMuscles: primaries,
      muscles: e.muscles ?? [],
      pattern: traits?.pattern ?? null,
      loadType: traits?.loadType ?? null,
      equipmentReq: traits?.equipment ?? null,
      media: mod.EXERCISE_MEDIA?.[e.id] ?? null,
      // The real coaching text, so the mockup's exercise sheet teaches the same
      // thing the app will: why, how, what goes wrong, and what to watch out for.
      technique: (() => {
        const t = mod.getExerciseTechnique?.(e.id);
        if (!t) return null;
        return {
          level: t.techniqueLevel,
          jointStress: t.jointStress,
          tempo: t.tempo,
          rir: t.effort?.rir ?? null,
          effortNote: t.effort?.note ?? null,
          why: t.techniqueWhy ?? null,
          execution: t.execution ?? [],
          mistakes: t.mistakes ?? [],
          safety: t.safety ?? [],
          breathing: t.breathing ?? null,
        };
      })(),
    };
  });

  // Muscle labels, so the mockups print the user's words, not the model's ids.
  const labels = mod.MUSCLE_LABELS ?? null;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "catalog.json"),
    JSON.stringify(
      {
        generatedBy: "mockup/tools/dump-catalog.mjs",
        count: rows.length,
        muscleLabels: labels,
        exercises: rows,
      },
      null,
      2,
    ),
  );

  const withMedia = rows.filter((r) => r.media).length;
  console.log(`catalog.json written · ${rows.length} exercises · ${withMedia} with inline media metadata`);
} finally {
  await server.close();
}
