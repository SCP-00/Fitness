#!/usr/bin/env node
/**
 * Mockup tools · fetch a reference image for EVERY exercise in the catalog.
 *
 * Why: the owner's #1 complaint is that the app cannot show him a movement, and
 * he checks the technique against the animation every single set. The mockups
 * therefore need a real reference on all 151 catalog entries, not a drawn
 * placeholder.
 *
 * Two sources, both already used by the shipped app:
 *
 *   1. GIFs — the 36 cleared files already committed under
 *      `bodylab/apps/web/public/exercises/gifs/`. They are copied, never
 *      re-downloaded, so the licence trail does not fork.
 *   2. Stills — `yuhonas/free-exercise-db`, public domain (Unlicense), two
 *      photographs per exercise (start/end). The mockup crossfades the pair, so
 *      a missing GIF still reads as a movement instead of a frozen photo.
 *   3. Stills already cleared in this repo — the `images/<id>/0.jpg` pairs the
 *      web app ships — used when the public-domain index has no match, so we
 *      never re-host something we already hold legitimately.
 *
 * Coverage is honest, and the rule is: **a wrong demo is worse than no demo.**
 * Name matching is only trusted above `MIN_SCORE`; everything below it is either
 * pinned by hand in `OVERRIDES` (checked against the source list) or refused.
 * `manifest.json` records source, match and score per exercise, and the mockup
 * renders a visible "sin referencia" state for the rest — the same state the
 * app needs.
 *
 * Run from `fitness-ecosystem/`:
 *   node mockup/tools/fetch-media.mjs [--force]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../.."); // fitness-ecosystem/
const outDir = path.resolve(root, "mockup/assets/media");
const imgDir = path.join(outDir, "images");
const gifDir = path.join(outDir, "gifs");
const force = process.argv.includes("--force");

const FEDB_JSON =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const FEDB_IMAGE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const APP_GIFS = path.resolve(root, "bodylab/apps/web/public/exercises/gifs");
const APP_IMAGES = path.resolve(root, "bodylab/apps/web/public/exercises/images");

const catalog = JSON.parse(readFileSync(path.resolve(root, "mockup/data/catalog.json"), "utf8"));

// ── name matching ───────────────────────────────────────────────────────────
/**
 * Only the IMPLEMENT is noise — it says what you hold, not what you do.
 *
 * Everything positional (`incline`, `decline`, `seated`, `lying`, `rear`, `wide`,
 * `single`, `leg`…) is kept, because those words are exactly what distinguishes
 * an incline press from a flat one. An earlier, greedier list stripped them and
 * happily matched "Barbell Bench Press" to "Alternating Floor Press" at a score
 * of 1.0 — a wrong demo is worse than no demo, so the matching is now strict and
 * every result is printed for review.
 */
const NOISE = new Set([
  "barbell", "dumbbell", "dumbbells", "dumbblell", "dumbbel", "cable", "machine",
  "smith", "band", "bands", "banded", "bodyweight", "resistance", "ez", "kettlebell",
  "the", "with", "and", "to", "on", "of", "a", "an", "v2", "v1", "weighted",
  "assisted", "other", "body", "only", "rep", "reps",
]);

const SYNONYM = {
  pushups: "pushup", "push-up": "pushup", pressup: "pushup", "press-up": "pushup",
  pullups: "pullup", "pull-up": "pullup", chinup: "pullup", "chin-up": "pullup",
  dips: "dip", dips_: "dip", rows: "row", curls: "curl", raises: "raise", raise: "raise",
  squats: "squat", lunges: "lunge", crunches: "crunch", flyes: "fly", fly: "fly",
  extensions: "extension", pressdown: "pushdown", pulldown: "pulldown",
  "hip-thrust": "hipthrust", thrust: "hipthrust", rdl: "romanian deadlift",
  deadlifts: "deadlift", shrugs: "shrug", "good-morning": "goodmorning",
  calves: "calf", "calf-raise": "calf", "heel-raise": "calf", plank: "plank",
  hip: "hip", glute: "glute", hamstring: "hamstring", quad: "quadriceps",
  abs: "crunch", abdominal: "crunch", ab: "crunch", ohp: "overhead press",
  military: "overhead press", "lat-pulldown": "pulldown", lats: "lat",
};

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => SYNONYM[w] ?? w)
    .filter((w) => w && !NOISE.has(w))
    .join("-");

/**
 * Symmetric Jaccard over the meaningful words, with a floor on how many words
 * must actually agree. A one-word overlap out of two is not evidence; two words
 * is, and identical single-word names ("Face Pull") still match.
 */
function score(aTokens, bTokens) {
  if (!aTokens.size || !bTokens.size) return { score: 0, shared: 0 };
  let shared = 0;
  for (const t of aTokens) if (bTokens.has(t)) shared += 1;
  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = shared / union;
  const enough = shared >= 2 || (shared === 1 && aTokens.size <= 2 && bTokens.size <= 2);
  return { score: enough ? jaccard : 0, shared };
}

/**
 * Pinned matches. A name-matching heuristic is fine for auditing, but for a
 * training app a WRONG demo is worse than no demo — the owner corrects his
 * technique against the image. Every entry here was checked against the source
 * list by hand; anything not pinned and scoring below `MIN_SCORE` is refused and
 * rendered as the honest "sin referencia" state.
 */
const OVERRIDES = {
  // Bench / chest: the flat, incline and dumbbell presses are three different
  // movements and the greedy matcher collapsed them onto one band-press photo.
  "barbell-bench-press": "Barbell Bench Press - Medium Grip",
  "incline-bench-press": "Barbell Incline Bench Press - Medium Grip",
  "dumbbell-bench-press": "Dumbbell Bench Press",
  "dumbbell-fly": "Dumbbell Flyes",
  "machine-bench-press": "Machine Bench Press",
  "band-chest-press": "Bench Press - With Bands",

  // Shoulders / arms.
  "lateral-raise": "Side Lateral Raise",
  "machine-shoulder-press": "Machine Shoulder (Military) Press",
  "seated-dumbbell-press": "Seated Dumbbell Press",
  "dumbbell-front-raise": "Front Dumbbell Raise",
  "dumbbell-upright-row": "Standing Dumbbell Upright Row",
  "dips": "Dips - Triceps Version",
  "dumbbell-curl": "Dumbbell Bicep Curl",
  "preacher-curl": "Preacher Curl",
  "dumbbell-shrugs": "Dumbbell Shrug",

  // Back.
  "barbell-row": "Bent Over Barbell Row",
  "dumbbell-row": "One-Arm Dumbbell Row",
  "lat-pulldown": "Wide-Grip Lat Pulldown",
  "kettlebell-row": "One-Arm Kettlebell Row",
  "dumbbell-renegade-row": "Alternating Renegade Row",

  // Legs / hips.
  "barbell-squat": "Barbell Squat",
  "sumo-squat": "Wide Stance Barbell Squat",
  "good-morning": "Good Morning",
  "single-leg-rdl": "Kettlebell One-Legged Deadlift",
  "reverse-lunge": "Dumbbell Rear Lunge",
  "single-leg-calf-raise": "Standing Dumbbell Calf Raise",
  "box-jump": "Box Jump (Multiple Response)",
  "hip-abduction-machine": "Thigh Abductor",
  "hip-adduction-machine": "Thigh Adductor",

  // Core / forearms.
  "cable-crunch": "Cable Crunch",
  "crunch": "Crunches",
  "bicycle-crunch": "Air Bike",
  "lying-leg-raise": "Flat Bench Lying Leg Raise",
  "wrist-curl": "Palms-Up Dumbbell Wrist Curl Over A Bench",
  "reverse-wrist-curl": "Palms-Down Dumbbell Wrist Curl Over A Bench",

  "push-ups": "Pushups",
  "push-up-plus": "Pushups",
  "diamond-push-up": "Push-Ups - Close Triceps Position",
  "overhead-press": "Standing Military Press",
  "chin-ups": "Chin-Up",
  "pull-ups": "Pullups",
  "face-pulls": "Face Pull",
  "skull-crushers": "EZ-Bar Skullcrusher",
  "tricep-pushdown": "Triceps Pushdown - Rope Attachment",
  "overhead-tricep-extension": "Standing Overhead Barbell Triceps Extension",
  "tibialis-raise": "Smith Machine Reverse Calf Raises",
  "lying-hip-abduction": "Thigh Abductor",
  "banded-hip-abduction": "Thigh Abductor",
  clamshells: "Thigh Abductor",
  "machine-chest-fly": "Butterfly",
  "standing-cable-adduction": "Cable Hip Adduction",
  "inverted-row": "Inverted Row",
  "prone-y-raise": "Lying Rear Delt Raise",
  "suitcase-carry": "Rickshaw Carry",
  "step-up": "Step-up with Knee Raise",
  "bulgarian-split-squat": "Split Squat with Dumbbells",
  "nordic-curl": "Natural Glute Ham Raise",
  "chest-supported-dumbbell-row": "Bent Over Two-Dumbbell Row",
  "jump-rope-intervals": "Rope Jumping",
  "jump-rope-steady": "Rope Jumping",
};

/** Below this, an unpinned name match is refused rather than shown. */
const MIN_SCORE = 0.7;

// ── 1. load the public-domain stills index ──────────────────────────────────
console.log("· fetching free-exercise-db index …");
const fedb = await (await fetch(FEDB_JSON)).json();
console.log(`  ${fedb.length} source exercises`);

const fedbIndex = fedb
  .filter((e) => Array.isArray(e.images) && e.images.length > 0)
  .map((e) => ({
    name: e.name,
    images: e.images,
    equipment: e.equipment ?? "",
    tokens: new Set(norm(e.name).split("-").filter(Boolean)),
    id: e.id,
  }));

// ── 2. match every catalog exercise ─────────────────────────────────────────
const byName = new Map(fedbIndex.map((c) => [c.name, c]));
const results = [];
for (const ex of catalog.exercises) {
  const pinned = OVERRIDES[ex.id];
  if (pinned) {
    const hit = byName.get(pinned);
    if (!hit) throw new Error(`override for ${ex.id} names a missing source: ${pinned}`);
    results.push({ ex, match: hit, score: 1, pinned: true });
    continue;
  }
  const tokens = new Set(norm(ex.en).split("-").filter(Boolean));
  let best = null;
  let bestScore = 0;
  for (const cand of fedbIndex) {
    const { score: s } = score(tokens, cand.tokens);
    if (s > bestScore) {
      bestScore = s;
      best = cand;
    }
  }
  results.push({
    ex,
    match: bestScore >= MIN_SCORE ? best : null,
    score: Number(bestScore.toFixed(2)),
    pinned: false,
  });
}

// Full audit table: every exercise and what it would be illustrated with.
if (process.argv.includes("--audit")) {
  writeFileSync(
    path.resolve(root, "mockup/data/media-audit.txt"),
    results
      .map(
        (r) =>
          `${r.pinned ? "PIN" : r.match ? "AUTO" : "NONE"} ${String(r.score).padEnd(5)} ${r.ex.id.padEnd(34)} ${r.ex.en.padEnd(42)} ${r.match ? r.match.name : "—"}`,
      )
      .join("\n"),
  );
}

// ── 3. download ─────────────────────────────────────────────────────────────
mkdirSync(imgDir, { recursive: true });
mkdirSync(gifDir, { recursive: true });

async function download(url, dest) {
  if (!force && existsSync(dest)) return "cached";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return "ok";
}

const manifest = {};
let done = 0;
const withConcurrency = 8;

async function worker(queue) {
  while (queue.length) {
    const job = queue.shift();
    try {
      await job();
    } catch (err) {
      console.warn(`  ! ${err.message}`);
    }
    done += 1;
    if (done % 25 === 0) console.log(`  … ${done}/${results.length}`);
  }
}

const queue = results.map(({ ex, match, score: sc, pinned }) => async () => {
  const entry = {
    id: ex.id,
    name: ex.en,
    source: null,
    gif: null,
    stills: [],
    match: null,
    score: sc,
    pinned: Boolean(pinned),
  };

  // 1. GIF already cleared in the repo.
  const appGif = path.join(APP_GIFS, `${ex.id}.gif`);
  if (existsSync(appGif)) {
    copyFileSync(appGif, path.join(gifDir, `${ex.id}.gif`));
    entry.gif = `gifs/${ex.id}.gif`;
    entry.source = "gym-visual";
  }

  // 2. Public-domain stills (always attempted: a GIF plus stills is fine, and
  //    the mockup prefers the GIF when both exist).
  if (match) {
    const take = match.images.slice(0, 2);
    for (let i = 0; i < take.length; i += 1) {
      const rel = `${ex.id}-${i}.jpg`;
      const dest = path.join(imgDir, rel);
      await download(`${FEDB_IMAGE}${take[i]}`, dest);
      entry.stills.push(`images/${rel}`);
    }
    entry.match = match.name;
    if (!entry.source) entry.source = "free-exercise-db";
  }

  // 3. Stills the repo already ships (the web app's own `images/<id>/N.jpg`
  //    pairs) — only when the public-domain index had nothing to offer.
  if (entry.stills.length === 0) {
    const dir = path.join(APP_IMAGES, ex.id);
    const flat = path.join(APP_IMAGES, `${ex.id}.jpg`);
    const sources = existsSync(dir)
      ? readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort().map((f) => path.join(dir, f))
      : existsSync(flat)
        ? [flat]
        : [];
    for (let i = 0; i < sources.length && i < 2; i += 1) {
      const rel = `${ex.id}-${i}.jpg`;
      copyFileSync(sources[i], path.join(imgDir, rel));
      entry.stills.push(`images/${rel}`);
    }
    if (sources.length && !entry.source) entry.source = "repo-cleared";
    else if (sources.length) entry.secondSource = "repo-cleared";
  }

  manifest[ex.id] = entry;
});

await Promise.all(Array.from({ length: withConcurrency }, () => worker(queue)));

writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

// ── 4. honest coverage report ──────────────────────────────────────────────
const total = results.length;
const gifs = results.filter((r) => manifest[r.ex.id].gif).length;
const stills = results.filter((r) => manifest[r.ex.id].stills.length > 0).length;
const none = results.filter((r) => !manifest[r.ex.id].gif && manifest[r.ex.id].stills.length === 0);
const guessed = results.filter((r) => !r.pinned && r.match !== null);
const review = guessed.filter((r) => r.score < 0.85);

console.log(`\n✓ ${total} exercises`);
console.log(`  GIF (cleared)      : ${gifs}`);
console.log(`  Still(s)           : ${stills}`);
console.log(`  pinned by hand     : ${results.filter((r) => r.pinned).length}`);
console.log(`  auto-matched       : ${guessed.length}  (${review.length} below 0.85 — review)`);
console.log(`  audit table        : mockup/data/media-audit.txt`);
console.log(`  NO reference       : ${none.length}`);
for (const r of none) console.log(`      — ${r.ex.id}  (${r.ex.en})`);
console.log(`  review these guesses:`);
for (const r of review) console.log(`      ? ${r.ex.id} → "${r.match?.name}" (${r.score})`);
