#!/usr/bin/env node
/**
 * Exercise coverage audit — our catalog vs. a third-party tracker's exported sheet.
 *
 * Why this exists: the owner keeps a spreadsheet of every exercise a commercial
 * app offers (with their own logged weights) and fills it in over time. This
 * script answers three questions in one run, with numbers instead of vibes:
 *
 *   1. Is OUR catalog internally healthy? (primary muscle on every entry,
 *      bilingual copy, real traits, no orphan media manifest entries)
 *   2. Which of those exercises do we already have, and under which names?
 *   3. Where are the blind spots — a muscle our vocabulary knows about but that
 *      no exercise trains would leave the weekly planner unable to prioritise it.
 *
 * No dependencies: the .xlsx is a zip, and we inflate it with `node:zlib`; the
 * catalog is loaded through the web app's own Vite so the `@fitness/*` aliases
 * resolve exactly like they do in the app (never a stale hand-copied list).
 *
 * Usage:
 *   node scripts/audit-exercise-coverage.mjs [path/to/sheet.xlsx]
 *   node scripts/audit-exercise-coverage.mjs --json   # machine-readable dump
 *
 * The sheet itself is third-party material: it lives in the gitignored
 * `docs/reference/` folder and is never committed. This script is ours.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, ".."); // fitness-ecosystem/

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const sheetPath = path.resolve(
  root,
  args.find((a) => !a.startsWith("--")) ??
    "docs/reference/symmetry/Symmetry Septiembre.xlsx"
);

// ── 1. minimal xlsx reader ──────────────────────────────────────────────────
/** Read the entries we need out of a zip container by walking its central directory. */
function readZip(file) {
  const buf = readFileSync(file);
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${file}: not a zip container`);

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central directory");
    const method = buf.readUInt16LE(p + 10);
    const compressed = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localAt = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);

    const lNameLen = buf.readUInt16LE(localAt + 26);
    const lExtraLen = buf.readUInt16LE(localAt + 28);
    const dataAt = localAt + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(dataAt, dataAt + compressed);
    entries.set(name, method === 8 ? inflateRawSync(data) : Buffer.from(data));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");

const SHEET_COLUMNS = { first: 1, group: 2, muscle: 3, firstData: 5 };

/** The sheet's layout: 3 columns per muscle (name · logged kg×reps · tier), grouped under 7 headings. */
function readSheet(file) {
  const zip = readZip(file);
  const shared = [
    ...zip.get("xl/sharedStrings.xml").toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g),
  ].map((m) =>
    unescapeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""))
  );

  const colToNum = (letters) => {
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n;
  };

  const grid = [];
  const sheet = zip.get("xl/worksheets/sheet1.xml").toString("utf8");
  for (const rowM of sheet.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const r = Number(rowM[1]);
    grid[r] ??= {};
    for (const cM of rowM[2].matchAll(/<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cM[1];
      const ref = /r="([A-Z]+)\d+"/.exec(attrs);
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(cM[2] ?? "")?.[1];
      const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cM[2] ?? "")?.[1];
      const value =
        type === "s" && v !== undefined
          ? shared[Number(v)] ?? ""
          : type === "inlineStr"
            ? unescapeXml(inline ?? "")
            : (v ?? "");
      if (value !== "") grid[r][colToNum(ref[1])] = value;
    }
  }
  const cell = (r, c) => grid[r]?.[c] ?? "";

  const groups = [];
  for (let c = 1; c <= 120; c++) if (cell(SHEET_COLUMNS.group, c)) groups.push({ name: cell(SHEET_COLUMNS.group, c).trim(), col: c });
  const muscles = [];
  for (let c = 1; c <= 120; c++) {
    const name = cell(SHEET_COLUMNS.muscle, c);
    if (!name) continue;
    muscles.push({
      muscle: name.trim(),
      group: [...groups].reverse().find((g) => g.col <= c)?.name ?? "?",
      col: c,
    });
  }
  const lastRow = Math.max(...Object.keys(grid).map(Number));
  const out = [];
  for (const mu of muscles) {
    const rows = [];
    for (let r = SHEET_COLUMNS.firstData; r <= lastRow; r++) {
      const name = cell(r, mu.col).trim();
      if (!name) continue;
      rows.push({ name, log: cell(r, mu.col + 1).trim(), rank: cell(r, mu.col + 2).trim() });
    }
    out.push({ ...mu, rows });
  }
  return out;
}

// ── 2. our real catalog, through the app's own Vite ─────────────────────────
async function loadCatalog() {
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
      },
    },
  });
  try {
    const mod = await server.ssrLoadModule("@fitness/bodylab-exercises");
    return {
      exercises: mod.ALL_EXERCISES.map((e) => ({
        id: e.id,
        en: e.name?.en ?? "",
        es: e.name?.es ?? "",
        category: e.category,
        difficulty: e.difficulty,
        muscles: e.muscles ?? [],
        equipment: e.equipment ?? [],
        hasDescription: Boolean(e.description?.en && e.description?.es),
        traits: mod.getTraits(e.id),
      })),
      vocabulary: Object.values(mod.MUSCLE_LABELS ?? {}).length
        ? Object.keys(mod.MUSCLE_LABELS)
        : undefined,
      fallbackTraits: mod.FALLBACK,
    };
  } finally {
    await server.close();
  }
}

// ── 3. name matching ────────────────────────────────────────────────────────
const STOP = new Set([
  "machine", "barbell", "dumbbell", "dumbbells", "dumbblell", "dumbbel", "cable",
  "smith", "band", "bands", "bodyweight", "bodywight", "bar", "ez", "kettlebell",
  "resistance", "the", "with", "and", "to", "on", "of", "a", "up", "down", "v2",
  "v1", "straight", "weighted", "assisted", "seated", "standing", "lying", "prone",
]);
const SYNONYMS = {
  "press-up": "push-up", pressups: "push-up", pushups: "push-up",
  "pull-ips": "pull-up", pullups: "pull-up", chinups: "chin-up", "chin-ups": "chin-up",
  "hip trust": "hip thrust", shrugs: "shrug", "calf raises": "calf", "calf raise": "calf",
  "heel raise": "calf", "good mornings": "good morning", "nordic curls": "nordic curl",
  "back extensions": "back extension", "lateral raises": "lateral raise",
  lunges: "lunge", crunches: "crunch", raises: "raise", curls: "curl",
  squats: "squat", rows: "row", dips: "dip", flyes: "fly", lunges_: "lunge",
};

const normalise = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[()]/g, " ").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ").trim();

const tokenise = (s) =>
  new Set(
    normalise(s)
      .split(/[-\s]+/)
      .map((t) => SYNONYMS[t] ?? t)
      .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t))
      .filter((t) => t && !STOP.has(t) && !/^\d/.test(t))
  );

const jaccard = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / (a.size + b.size - inter || 1);
};

// ── run ─────────────────────────────────────────────────────────────────────
const sheet = readSheet(sheetPath);
const { exercises, fallbackTraits } = await loadCatalog();

const quality = {
  total: exercises.length,
  withoutPrimary: exercises.filter((e) => !e.muscles.some((m) => m.intensity === 3)).map((e) => e.id),
  withoutDescription: exercises.filter((e) => !e.hasDescription).map((e) => e.id),
  withoutSpanishName: exercises.filter((e) => !e.es).map((e) => e.id),
  fallbackTraits: exercises.filter(
    (e) => !e.traits || (fallbackTraits && e.traits === fallbackTraits)
  ).map((e) => e.id),
};

/** A muscle nobody trains would be invisible to the weekly planner. */
const trained = new Map();
for (const e of exercises)
  for (const m of e.muscles) {
    const t = trained.get(m.muscle) ?? { primary: 0, secondary: 0 };
    m.intensity === 3 ? t.primary++ : t.secondary++;
    trained.set(m.muscle, t);
  }
const orphanMuscles = [...trained.entries()].filter(([, t]) => t.primary === 0).map(([m]) => m);

const unique = new Map();
for (const mu of sheet)
  for (const r of mu.rows) {
    const key = normalise(r.name);
    unique.set(key, {
      name: r.name,
      muscles: [...new Set([...(unique.get(key)?.muscles ?? []), mu.muscle])],
      logged: (unique.get(key)?.logged ?? false) || !/^0x0$/.test(r.log),
      log: r.log,
      rank: r.rank,
    });
  }

const index = exercises.map((e) => ({
  id: e.id, en: e.en, toks: tokenise(e.en), toksEs: tokenise(e.es),
}));
const bestMatch = (name) => {
  const t = tokenise(name);
  let best = { score: -1, id: "", en: "" };
  for (const c of index) {
    const score = Math.max(jaccard(t, c.toks), jaccard(t, c.toksEs));
    if (score > best.score) best = { score, id: c.id, en: c.en };
  }
  return best;
};

const scored = [...unique.values()].map((s) => ({ ...s, match: bestMatch(s.name) }));
const covered = scored.filter((s) => s.match.score >= 0.6);
const gaps = scored.filter((s) => s.match.score < 0.6);

const byMuscle = {};
for (const s of scored)
  for (const m of s.muscles) {
    byMuscle[m] ??= { total: 0, covered: 0 };
    byMuscle[m].total++;
    if (s.match.score >= 0.6) byMuscle[m].covered++;
  }

const report = {
  sheet: path.relative(root, sheetPath),
  catalog: quality,
  orphanMuscles,
  coverage: {
    referenced: scored.length,
    covered: covered.length,
    missing: gaps.length,
    ourExercisesTouched: new Set(covered.map((c) => c.match.id)).size,
    ourLoggedCount: scored.filter((s) => s.logged).length,
    missingLogged: gaps.filter((g) => g.logged).map((g) => g.name),
  },
  perMuscle: byMuscle,
  gaps: gaps.map((g) => ({ name: g.name, muscles: g.muscles, logged: g.logged, near: g.match })),
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const pct = (c, t) => `${Math.round((c / (t || 1)) * 100)}%`;
console.log(`\nSheet: ${report.sheet}`);
console.log(`\n── our catalog ───────────────────────────────────────────────`);
console.log(`  ${quality.total} exercises`);
console.log(`  without a primary muscle : ${quality.withoutPrimary.length}${quality.withoutPrimary.length ? " → " + quality.withoutPrimary.join(", ") : ""}`);
console.log(`  without bilingual copy   : ${quality.withoutDescription.length}`);
console.log(`  missing Spanish name     : ${quality.withoutSpanishName.length}`);
console.log(`  falling back on traits   : ${quality.fallbackTraits.length}`);
console.log(`  muscles with no primary  : ${orphanMuscles.length}${orphanMuscles.length ? " → " + orphanMuscles.join(", ") : " (none)"}`);

console.log(`\n── coverage of the sheet ─────────────────────────────────────`);
console.log(`  ${report.coverage.referenced} distinct exercises listed`);
console.log(`  ${report.coverage.covered} we already have`);
console.log(`  ${report.coverage.missing} we don't`);
console.log(`     └ of those, ${report.coverage.missingLogged.length} are exercises you have actually logged`);
console.log(`  our catalog touched: ${report.coverage.ourExercisesTouched}/${quality.total}`);

console.log(`\n── per muscle (covered / listed) ─────────────────────────────`);
for (const [m, c] of Object.entries(byMuscle).sort((a, b) => a[1].covered / a[1].total - b[1].covered / b[1].total))
  console.log(`  ${m.padEnd(13)} ${String(c.covered).padStart(3)} / ${String(c.total).padStart(3)}  ${pct(c.covered, c.total)}`);

if (report.coverage.missingLogged.length) {
  console.log(`\n── gaps among the exercises YOU logged ───────────────────────`);
  for (const name of report.coverage.missingLogged) {
    const g = gaps.find((x) => x.name === name);
    console.log(`  ${name}  [${g.muscles.join("/")}]  ${g.log}  ~ ${g.match.en} (${g.match.score.toFixed(2)})`);
  }
}
console.log();
