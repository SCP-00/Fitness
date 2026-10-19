/**
 * Rebuild `asset-manifest.json` from the files that are actually on disk.
 *
 * Why this exists: the manifest shipped in TrainingLab pointed every one of its
 * 36 GIFs at `videos/<source-id>.gif` — a folder that does not exist — while the
 * GIFs themselves live at `gifs/<catalog-id>.gif`. The consumer treats a missing
 * entry as "no media" and draws its fallback figure, so the failure was silent:
 * **no technique GIF had ever rendered in the app**, which is the one thing the
 * owner opens this app to look at. It was written by hand; hand-written paths
 * drift from the files the moment either one moves.
 *
 * The contract it produces is the one `features/today/ExerciseDemo.tsx` reads:
 *
 *   { "<catalog-exercise-id>": { id?, gif?, image?, imageAlt?, instructions? } }
 *
 *   * `gif`      → `gifs/<id>.gif`
 *   * `image`    → `images/<id>/0.jpg`, else the loose `images/<id>.jpg`
 *   * `imageAlt` → `images/<id>/1.jpg` (the dataset ships a start and an end
 *                  frame; the second one is what makes a still usable for
 *                  checking a position)
 *
 * `id` and `instructions` are carried over from the previous manifest when it had
 * them, because they are source metadata that cannot be recovered from filenames.
 * An id with no media at all is left out: an empty entry would tell the component
 * "this exercise has media" and then render nothing.
 *
 * Deterministic by construction (sorted keys, no timestamps), so re-running it on
 * an unchanged folder produces a byte-identical file and shows up as no diff.
 *
 * Usage: `node scripts/build-exercise-media-manifest.mjs [--check]`
 * `--check` verifies the committed manifest matches the folder and exits 1 if not.
 */
import fs from "node:fs";
import path from "node:path";

const FOLDER = "traininglab/apps/desktop/public/exercises";
const MANIFEST = "asset-manifest.json";
const checkOnly = process.argv.includes("--check");

const root = path.resolve(FOLDER);
const manifestPath = path.join(root, MANIFEST);

if (!fs.existsSync(root)) {
  console.error(`no media folder at ${FOLDER}`);
  process.exit(1);
}

/** Media on disk, by catalog exercise id. */
const gifs = new Set();
const frames = new Map(); // id → sorted list of frame filenames
const stills = new Set(); // loose single-file stills

const gifDir = path.join(root, "gifs");
if (fs.existsSync(gifDir)) {
  for (const file of fs.readdirSync(gifDir)) {
    if (file.toLowerCase().endsWith(".gif")) gifs.add(file.replace(/\.gif$/i, ""));
  }
}

const imgDir = path.join(root, "images");
if (fs.existsSync(imgDir)) {
  for (const entry of fs.readdirSync(imgDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const files = fs
        .readdirSync(path.join(imgDir, entry.name))
        .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
        .sort();
      if (files.length > 0) frames.set(entry.name, files);
    } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
      stills.add(entry.name.replace(/\.[^.]+$/, ""));
    }
  }
}

// Previous manifest: only for metadata that cannot be derived from filenames.
let previous = {};
if (fs.existsSync(manifestPath)) {
  try {
    previous = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    previous = {};
  }
}

const ids = [
  ...new Set([...gifs, ...frames.keys(), ...stills, ...Object.keys(previous)]),
].sort();

const manifest = {};
let withGif = 0;
const dropped = [];
for (const id of ids) {
  const entry = {};
  const meta = previous[id];
  if (meta?.id) entry.id = meta.id;

  if (gifs.has(id)) {
    entry.gif = `gifs/${id}.gif`;
    withGif += 1;
  }

  const frameList = frames.get(id);
  if (frameList && frameList.length > 0) {
    entry.image = `images/${id}/${frameList[0]}`;
    if (frameList.length > 1) entry.imageAlt = `images/${id}/${frameList[1]}`;
  } else if (stills.has(id)) {
    const file = fs
      .readdirSync(imgDir)
      .find((f) => f.replace(/\.[^.]+$/, "") === id);
    if (file) entry.image = `images/${file}`;
  }

  if (!entry.gif && !entry.image) {
    // Keep the instructions-only entries out of the manifest: the component reads
    // presence as "there is media to show".
    dropped.push(id);
    continue;
  }
  if (meta?.instructions) entry.instructions = meta.instructions;
  manifest[id] = entry;
}

const text = `${JSON.stringify(manifest, null, 2)}\n`;
const entries = Object.keys(manifest).length;

if (checkOnly) {
  const current = fs.existsSync(manifestPath)
    ? fs.readFileSync(manifestPath, "utf8")
    : "";
  const same = current.replace(/\r\n/g, "\n") === text;
  console.log(
    same
      ? `manifest is up to date: ${entries} entries`
      : `manifest is STALE: ${entries} entries would be written`,
  );
  process.exit(same ? 0 : 1);
}

fs.writeFileSync(manifestPath, text);
console.log(
  [
    `manifest written: ${entries} entries`,
    `  with a GIF: ${withGif}`,
    `  with two frames: ${[...frames.values()].filter((f) => f.length > 1).length}`,
    `  single still: ${entries - withGif - [...frames.values()].filter((f) => f.length > 1).length}`,
    dropped.length > 0 ? `  metadata-only ids left out: ${dropped.length}` : null,
  ]
    .filter(Boolean)
    .join("\n"),
);
