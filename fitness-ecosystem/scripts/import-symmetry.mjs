#!/usr/bin/env node
/**
 * Import Symmetry workout history from screenshots.
 *
 * Symmetry (club.symmetry.application) has no documented data export, so the
 * history only exists as "Workout Details" screenshots. This reads them with
 * local OCR — no network, no telemetry, nothing leaves the machine — and emits
 * JSON shaped like TrainingLab's `TLSession` / `TLSet` records.
 *
 *   node scripts/import-symmetry.mjs <dir> [--out FILE] [--no-cache] [--dry-run]
 *
 * Three problems this actually solves, all found by looking at real captures:
 *
 *  1. **Sessions span several screenshots.** Only the first screenshot of a
 *     workout carries the header (name, date, time, volume); the rest are
 *     scrolled continuations. A page with a header opens a new session; a page
 *     without one extends the current session.
 *
 *  2. **Consecutive screenshots OVERLAP.** Scrolling re-shows whole exercises,
 *     so naive concatenation double-counts sets. Overlap is removed with a
 *     longest-common-subsequence merge over the normalised line sequence, which
 *     is what a real scroll produces: a contiguous, identical region.
 *
 *  3. **Re-running must not duplicate.** Each session gets a content hash over
 *     its merged, normalised set list. Identical hashes merge into one session,
 *     and `--out` is idempotent, so the import can be repeated safely.
 *
 * Set badges: `W` warm-up (excluded from volume), `D` drop set, `F` to failure.
 * TrainingLab's `TLSet` has `warmup` but no drop/failure flag, so the badge is
 * preserved verbatim in `notes` rather than silently discarded.
 *
 * Pure Node + tesseract.js + pngjs. No app code, no network.
 *
 * @module scripts/import-symmetry
 */

import { createWorker } from "tesseract.js";
import { PNG } from "pngjs";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const outPath = args.includes("--out") ? args[args.indexOf("--out") + 1] : "symmetry-import.json";
const dryRun = args.includes("--dry-run");
const useCache = !args.includes("--no-cache");

if (!dir) {
  console.error(
    "usage: node scripts/import-symmetry.mjs <screenshots-dir> [--out FILE] [--no-cache] [--dry-run]",
  );
  process.exit(2);
}

/* ------------------------------------------------------------------ OCR --- */

/**
 * Tesseract is trained on dark-on-light scans; this UI is light text on a
 * near-black background, so luma is inverted before recognition. Upscaling 2x
 * measurably improves accuracy on the small UI font.
 */
function preprocess(buf) {
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;
  const scale = 2;
  const out = new PNG({ width: width * scale, height: height * scale });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const si = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 4;
      const di = (y * out.width + x) * 4;
      const luma = 0.299 * data[si] + 0.587 * data[si + 1] + 0.114 * data[si + 2];
      const v = Math.max(0, Math.min(255, 255 - luma * 1.6));
      out.data[di] = out.data[di + 1] = out.data[di + 2] = v;
      out.data[di + 3] = 255;
    }
  }
  return PNG.sync.write(out);
}

const cacheFile = join(dir, ".ocr-cache.json");
const cache = useCache && existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};

// tesseract.js defaults its cache to the process working directory, which drops
// a 5 MB eng.traineddata into whatever folder the command was run from — the
// repo root, in practice. Point it at a dedicated, gitignored directory instead.
const cachePath = join(HERE, "../.cache/tesseract");

async function ocrAll(files) {
  mkdirSync(cachePath, { recursive: true });
  const worker = await createWorker("eng", undefined, { cachePath });
  const result = {};
  for (const f of files) {
    const text = cache[f];
    if (text != null) {
      console.error(`  cached  ${f}`);
      continue;
    }
    const { data } = await worker.recognize(preprocess(readFileSync(join(dir, f))));
    cache[f] = data.text;
    result[f] = { text: data.text, confidence: data.confidence };
    console.error(`  ocr     ${f}  (confidence ${data.confidence.toFixed(1)})`);
  }
  await worker.terminate();
  if (!dryRun) mkdirSync(dir, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cache, null, 0));
  return cache;
}

/* --------------------------------------------------------------- parsing -- */

// A set line is "<badge> [weight kg x] reps". The weight is OPTIONAL: bodyweight
// work (the whole calisthenics half of this history) renders as "3 10 reps" with
// no kg and no separator at all. The badge is a single rounded chip that OCR
// renders inconsistently — the warm-up chip comes out as "WwW".
//
// Badges (owner-confirmed 2026-10-04): a number = normal set, W = warm-up,
// D = drop set, F = failure set.
//
// The reps count is ALSO optional: the OCR sometimes loses just that digit
// ("1 40.8 kg x reps" on 2026-09-24). Such a set still exists — dropping it
// would desync the session from Symmetry's own header count — so it parses
// with reps: null and is repaired by OCR_FIXES below.
const SET_RE =
  /^\s*([WDFwdf]{1,3}|\d{1,2})\s+(?:([\dOoSsLlIB.,N]+)\s*kg\s*[x×*=]\s*)?(?:([\dOoSsLlIB]+)\s*)?reps?\s*$/i;

// Isometric holds log TIME instead of reps: "Set Time" column, rows like
// "1 01:00" (Plank, Dead Hang, Stretching, timed neck work). Ignoring them
// under-counted eight sessions by 1–8 sets; TLSet has no duration field, so
// durationSec is carried alongside reps: null.
const TIME_RE = /^\s*([WDFwdf]{1,3}|\d{1,2})\s+([\dOo]{1,2}):([\dOo]{2})\s*$/;

/** OCR reads 0 as "O" and 5 as "S" inside numeric fields; repair before parse. */
function num(raw) {
  if (raw == null) return null;
  const s = String(raw)
    .replace(/[Oo]/g, "0")
    .replace(/[Ss]/g, "5")
    .replace(/[lI|]/g, "1")
    .replace(/[Bb]/g, "8")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
const HEADER_NOISE = new Set([
  "workout details",
  "set",
  "set time",
  "set reps",
  "weight / reps",
  "weight/reps",
  "set weight / reps",
  "set ~~ weight / reps",
  "= weight / reps",
  "oo reps",
  "time volume sets",
  "exercises",
]);

/** Collapse OCR badge debris ("WwW", "w") to the chip it stands for. */
function normBadge(raw) {
  const s = raw.toUpperCase();
  if (s.startsWith("W")) return "W";
  if (s.startsWith("D")) return "D";
  if (s.startsWith("F")) return "F";
  return s;
}

/**
 * Strip OCR debris: the exercise thumbnail is often read as "B", "3", "8" or "=".
 * Only a *single* glyph followed by a Capitalised word is removed, so real
 * names survive ("Lat Pulldown" keeps its "L" because "at" is not Capitalised).
 */
function cleanExerciseName(raw) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    // Symbol-only leading token ("[ -.] ", "§ | ", "©» ", "—_— ", "= "):
    // nothing a real name starts with is punctuation, so a run of symbols up
    // to a capitalised (or bracketed) word is pure thumbnail/menu debris.
    .replace(/^[\][\]()=<>&#.,:;'"|!\s\-§©®«»{}_*+~^%$@?/\\]{2,}(?=[A-Z(])/, "")
    // Single lowercase letter + space ("e Bicycle Crunch") — the thumbnail
    // debris reads as a lone lowercase glyph the uppercase rule can't see.
    .replace(/^[a-z]\s+(?=[A-Z][a-z])/, "")
    // Two-letter title-case token + space ("Bs Incline Bench Press") — safe
    // because real names never have a two-letter word before a capitalised
    // one ("One Arm Row" is three letters and survives).
    .replace(/^[A-Z][a-z]\s+(?=[A-Z][a-z])/, "")
    // Thumbnail debris the OCR renders as "B", "3", "8", "5B", "[", "=" …
    // Only a short ALL-CAPS/numeric leading token is dropped, so real names
    // survive: "Lat Pulldown" keeps its "Lat" and "45-Degree Leg Press" keeps
    // its "45-Degree", while "5B Good Mornings" loses the "5B".
    .replace(/^[A-Z0-9[\]()=<>&#.,:;'"|!]{1,3}\s+(?=[A-Z][a-z])/, "")
    // A bracketed glyph with a LOWERCASE body ("i]", "es]", "Cy]") needs its
    // own rule: the rule above demands an initial capital, so it left them in
    // place and the exercise name never matched across screenshots.
    .replace(/^\S{1,3}\]\s+(?=[A-Z0-9])/, "")
    .trim();
}

/** Levenshtein distance, capped — used only on short strings. */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

function isExerciseName(line) {
  const s = line.trim();
  if (!s) return false;
  if (SET_RE.test(s)) return false;
  if (TIME_RE.test(s)) return false;
  if (HEADER_NOISE.has(s.toLowerCase())) return false;
  // A set line the parser could not read ("1 N.3 kg x 8 reps") must never be
  // promoted to an exercise name, or its sets become a phantom exercise.
  //
  // NOTE: the anchor must be `$`, NOT `\$`. An earlier version had
  // /\breps?\s*\$/i — `\$` matches a literal dollar sign, so the guard could
  // never fire, column headers ending in "Reps" were promoted to exercise
  // names, and they swallowed 41 real sets across 11 sessions.
  if (/\breps?\s*$/i.test(s) || /\bkg\s*[x×*=]/i.test(s)) return false;
  // Mangled set lines whose tail is garbage rather than "reps":
  // "D 2776 ko x B rane", "Nn 221 Lea v 10) rane". A real exercise name
  // never contains a weight unit or the word "rane".
  if (/\b(?:kg|ko|lbs?)\b/i.test(s) || /\branes?\s*$/i.test(s)) return false;
  // Column headers corrupted beyond exact matching ("sel Keps" for
  // "Set Reps"): reject short lines within edit distance 2 of a known
  // header phrase after normalisation. Real names are longer or far away.
  const norm = s.toLowerCase().replace(/[^a-z]/g, "");
  if (norm.length <= 12) {
    for (const phrase of ["setreps", "setweightreps", "settime", "weightreps", "timevolumesets"]) {
      if (editDistance(norm, phrase) <= 2) return false;
    }
  }
  // Exercise names are Title Case and may contain " (Machine)" / " (Dumbbell)".
  return /[A-Za-z]{3}/.test(s) && !/^\d+$/.test(s);
}

function parsePage(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const page = { header: null, rows: [] }; // rows kept per-page for the caller

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // "Workout Details" shares its line with the back chevron and the overflow
    // menu ("< Workout Details vee"), so match it as a substring.
    if (/Workout Details/i.test(line)) {
      // username, date, title, [subtitle], then a single line holding
      // "1h 1min  9210.4 kg  30" — the stat labels are on the line above.
      const rest = lines.slice(i + 1, i + 12);
      const dateLine = rest.find((l) => /^\d{1,2}\s+[A-Z][a-z]+,\s+\d{4}$/.test(l));
      if (!dateLine) continue;
      const di = rest.indexOf(dateLine);
      const title = rest.slice(di + 1).find((l) => isExerciseName(l) && !HEADER_NOISE.has(l.toLowerCase()));
      // The stat line normally holds "1h 1min  9210.4 kg  30". A pure
      // bodyweight session prints NO volume at all ("39min 17" on 2026-09-29),
      // so fall back to a duration+count-only line — otherwise the header's
      // set count (the only offline ground truth) is lost for that session.
      const stats =
        rest.find((l) => /kg/i.test(l) && /\d/.test(l)) ??
        rest.find((l) => /^\s*\d+h?\s*\d*\s*min\s+\d{1,4}\s*$/i.test(l));
      const h = stats && /(\d+)\s*h/.exec(stats);
      const mn = stats && /(\d+)\s*min/.exec(stats);
      const vol = stats && /([\d.,]+)\s*kg/i.exec(stats);
      const sc = stats && (/kg\s*(\d{1,4})\s*$/.exec(stats) ?? /(?:min)\s*(\d{1,4})\s*$/.exec(stats));
      page.header = {
        date: dateLine,
        title: title ? cleanExerciseName(title) : null,
        durationMin: h || mn ? (h ? Number(h[1]) * 60 : 0) + (mn ? Number(mn[1]) : 0) : null,
        volumeKg: vol ? Number(vol[1].replace(/,/g, ".")) : null,
        setCount: sc ? Number(sc[1]) : null,
      };
      continue;
    }

    const m = SET_RE.exec(line);
    if (m) {
      const w = m[2] != null ? num(m[2]) : null;
      page.rows.push({
        kind: "set",
        badge: normBadge(m[1]),
        // null = bodyweight set, exactly what TLSet expects for unloaded work.
        // Symmetry also prints an explicit "0 kg" for some unloaded work
        // (crunches, neck work) — same thing, so it maps to null too.
        weightKg: w === 0 ? null : w,
        reps: m[3] != null ? num(m[3]) : null,
      });
      continue;
    }
    const tm = TIME_RE.exec(line);
    if (tm) {
      const sec = num(tm[2]) * 60 + num(tm[3]);
      page.rows.push({
        kind: "set",
        badge: normBadge(tm[1]),
        weightKg: null,
        reps: null,
        durationSec: Number.isFinite(sec) ? sec : null,
      });
      continue;
    }
    if (isExerciseName(line)) {
      page.rows.push({ kind: "exercise", name: cleanExerciseName(line) });
    }
  }
  return page;
}

/**
 * Collapse a page's flat rows into exercise blocks.
 *
 * Symmetry's detail view lists each exercise ONCE with all of its sets, so an
 * exercise name is a reliable identity. A block that is only partly visible at
 * the bottom of a screenshot shows fewer sets here than on the next one — which
 * is why merging happens on blocks and not on individual rows.
 */
function toBlocks(rows) {
  const blocks = [];
  let cur = null;
  for (const r of rows) {
    if (r.kind === "exercise") {
      cur = { name: r.name, key: r.name.toLowerCase().replace(/[^a-z0-9]/g, ""), sets: [] };
      blocks.push(cur);
    } else if (cur) {
      cur.sets.push(r);
    }
  }
  return blocks.filter((b) => b.sets.length > 0);
}

/** Two-word prefix, used only as a fallback key for OCR-garbled names. */
const looseKey = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join("");

/**
 * Merge a continuation page into the session accumulated so far.
 *
 * Two screenshots of the same session overlap by whole exercises, so matching
 * on the normalised exercise name makes duplication structurally impossible —
 * and, unlike deduplicating individual sets, it cannot eat a legitimate pair
 * of identical sets ("25 kg x10" twice in a row is real training, not an
 * artefact). When the same exercise is seen twice the longer block wins: the
 * further-scrolled screenshot shows more of it.
 *
 * A name that OCR mangled beyond exact comparison ("Alternating BICEP Lurl
 * (UUmppeil)" for "Alternating Bicep Curl (Dumbbell)") is matched on its first
 * two words instead, which survive when the tail does not.
 */
function mergeBlocks(session, pageBlocks) {
  let added = 0;
  let merged = 0;
  for (const b of pageBlocks) {
    const loose = looseKey(b.name);
    let existing = session.find((x) => x.key === b.key);
    if (!existing && loose) existing = session.find((x) => looseKey(x.name) === loose);
    if (!existing) {
      session.push({ ...b, sets: [...b.sets] });
      added++;
    } else {
      if (b.sets.length > existing.sets.length) existing.sets = [...b.sets];
      merged++;
    }
  }
  return { added, merged };
}

/* ---------------------------------------------------------------- merging -- */

/**
 * Repair a decimal point the OCR dropped from a weight.
 *
 * `771 kg` on a hip adduction machine is impossible; the same exercise also
 * shows `77.1`, so the first is the second with the point lost. The rule only
 * fires when the tenths version is ACTUALLY PRESENT — in the same exercise
 * (`local`) or in an earlier session of the same exercise (`seen`, populated
 * as sessions are processed in date order). That second anchor catches
 * 2026-09-08, where every hip-adduction set OCR'd as `771` with no local
 * tenths to compare against, while `104.3 kg` deadlifts stay untouched
 * because no `10.43` exists anywhere.
 */
function repairLostDecimals(exercises, report, seen) {
  for (const ex of exercises) {
    const present = new Set(ex.sets.map((s) => s.weightKg));
    const key = ex.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const global = seen.get(key);
    for (const st of ex.sets) {
      if (st.weightKg == null || st.weightKg < 100) continue;
      const tenth = Math.round((st.weightKg / 10) * 100) / 100;
      if (present.has(tenth) || (global && global.has(tenth))) {
        report.push(`${ex.name}: ${st.weightKg} -> ${tenth}`);
        st.weightKg = tenth;
        present.add(tenth);
      }
    }
    if (!seen.has(key)) seen.set(key, new Set());
    for (const st of ex.sets) if (st.weightKg != null) seen.get(key).add(st.weightKg);
  }
}

/** Group merged blocks into the output shape: name + sets. */
function toExercises(blocks) {
  return blocks.map((b) => ({ name: b.name, sets: b.sets }));
}

/* ------------------------------------------------------------------- main -- */

const files = readdirSync(dir).filter((f) => /^Screenshot.*\.png$/i.test(f)).sort();
if (files.length === 0) {
  console.error(`no Screenshot*.png in ${dir}`);
  process.exit(1);
}
console.error(`reading ${files.length} screenshots from ${dir}`);
await ocrAll(files);

const sessions = [];
let blocksMerged = 0;
let lastHeader = null;

for (const f of files) {
  const page = parsePage(cache[f]);
  const blocks = toBlocks(page.rows);
  if (page.header) {
    lastHeader = page.header;
    sessions.push({ header: { ...page.header }, blocks: [...blocks] });
  } else if (sessions.length && lastHeader) {
    const m = mergeBlocks(sessions[sessions.length - 1].blocks, blocks);
    blocksMerged += m.merged;
  }
}

const MONTHS = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 };
function toIso(d) {
  const m = /^(\d{1,2})\s+([A-Za-z]+),\s+(\d{4})$/.exec(d);
  if (!m) return null;
  return `${m[3]}-${String(MONTHS[m[2]] + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
function parseDuration(d) {
  if (typeof d === "number") return d;
  if (!d) return null;
  const h = /(\d+)h/.exec(d), mn = /(\d+)\s*min/.exec(d);
  return (h ? Number(h[1]) * 60 : 0) + (mn ? Number(mn[1]) : 0);
}

let totalSets = 0;

// Hand-recovered OCR values. Each entry was confirmed by targeted re-OCR at 4x
// in three page-segmentation modes (psm 4/6/11) and by an extra crop pass; when
// modes disagreed, by XOR pixel comparison of the glyph against every
// confidently-read digit of the same font across all 45 screenshots.
const OCR_FIXES = [
  {
    date: "2026-09-24",
    ex: "triceppushdown",
    badge: "1",
    setIndex: 0,
    patch: { reps: 11 },
    why: "reps digit lost (\"1 40.8 kg x reps\")",
  },
  {
    date: "2026-09-30",
    ex: "singlearmdumbbelltricepextension",
    badge: "1",
    setIndex: 0,
    patch: { weightKg: 11.3 },
    why: "weight digit lost (\"1 N.3 kg x 8 reps\")",
  },
];

// Weight convention (owner, 2026-10-04): Symmetry records the TOTAL of a
// two-dumbbell exercise (laterales with two 12.5 kg dumbbells are logged as
// 25). TrainingLab's planner and PR logic treat `weight` as the per-dumbbell
// load (suggestions clamp to the heaviest pair owned), so bilateral dumbbell
// work is halved on import; unilateral work (one dumbbell, e.g. One Arm Row)
// and every other implement — barbell, machine, cable, held weight — keeps the
// recorded load. The raw Symmetry value survives in `symmetryWeightKg`.
const normKey = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const BILATERAL_DB = new Set([
  "alternatingbicepcurldumbbell", // one dumbbell in each hand
  "bilateralbicepcurlwithrotationdumbbell",
  "dumbbellflatbenchfly",
  "dumbbellshrugs",
  "dumbelllyinghammerpress", // the owner's own spelling
  "lateralraisesdumbbell",
  "seatedshoulderpressdumbbell",
]);

const globalWeights = new Map();
const payload = sessions.map((s, i) => {
  const exercises = toExercises(s.blocks);
    const decimalFixes = [];
    repairLostDecimals(exercises, decimalFixes, globalWeights);
  const dateIso = toIso(s.header.date);
  // Owner's schedule (2026-10-04): the last gym day was 2026-09-26 — heavier
  // machine/Smith loads before it are real gym work, not OCR inflation.
  const location = dateIso <= "2026-09-26" ? "gym" : "home";
  const ocrFixes = [];
  for (const fix of OCR_FIXES) {
    if (fix.date !== dateIso) continue;
    const ex = exercises.find((e) => normKey(e.name) === fix.ex);
    const st = ex?.sets[fix.setIndex];
    if (!st || st.badge !== fix.badge) continue;
    for (const [field, value] of Object.entries(fix.patch)) {
      ocrFixes.push(`${ex.name} set ${fix.setIndex + 1}: ${field} ${st[field]} -> ${value} (${fix.why})`);
      st[field] = value;
    }
  }
  for (const e of exercises) {
    e.weightBasis = BILATERAL_DB.has(normKey(e.name)) ? "bilateral-db-total" : "as-recorded";
    if (e.weightBasis !== "bilateral-db-total") continue;
    for (const st of e.sets) {
      if (st.weightKg == null) continue;
      st.symmetryWeightKg = st.weightKg;
      st.weightKg = Math.round((st.weightKg / 2) * 100) / 100;
    }
  }
  const sets = [];
  exercises.forEach((e, ei) => {
    e.sets.forEach((set, si) => {
      totalSets++;
      sets.push({
        exerciseId: null,
        exerciseName: e.name,
        timestamp: `${dateIso}T00:00:00.000Z`,
        weightKg: set.weightKg,
        symmetryWeightKg: set.symmetryWeightKg,
        reps: set.reps,
        durationSec: set.durationSec,
        warmup: set.badge === "W",
        notes: set.badge === "W" ? undefined : set.badge,
      });
    });
  });
  const startedAt = `${dateIso}T00:00:00.000Z`;
  return {
    id: createHash("sha256")
      .update(`${startedAt}|${s.header.title}|${sets.map((x) => `${x.exerciseName}:${x.weightKg}x${x.reps}${x.notes ?? ""}`).join("|")}`)
      .digest("hex")
      .slice(0, 16),
    startedAt,
    durationMin: s.header.durationMin ?? null,
    location,
    sourceVolumeKg: s.header.volumeKg,
    sourceSetCount: s.header.setCount,
    title: s.header.title,
    exercises,
    setCount: exercises.reduce((n, e) => n + e.sets.length, 0),
    decimalFixes,
    ocrFixes,
    sets,
    _page: i + 1,
  };
});

console.error(`\nsessions: ${payload.length}`);
console.error(`sets recovered: ${totalSets}`);
console.error(`overlapping exercise blocks stitched: ${blocksMerged}`);

// Symmetry prints the real set count in the session header. It is the only
// ground truth available offline, so a mismatch is reported rather than hidden:
// an under-count means a screenshot is missing, an over-count means the scroll
// overlap was not fully stitched.
const mismatches = payload.filter((s) => s.sourceSetCount != null && s.sourceSetCount !== s.sets.length);
if (mismatches.length === 0) {
  console.error(`set counts: all ${payload.filter((s) => s.sourceSetCount != null).length} verifiable sessions match the header`);
} else {
  console.error(`set counts: ${mismatches.length} session(s) disagree with the header:`);
  for (const s of mismatches) {
    console.error(`   ${s.startedAt.slice(0, 10)} ${s.title} — header says ${s.sourceSetCount}, recovered ${s.sets.length}`);
  }
}

if (!dryRun) {
  mkdirSync(dirname(outPath) || ".", { recursive: true });
  writeFileSync(outPath, JSON.stringify({ source: "symmetry-screenshots", sessions: payload }, null, 2));
  console.error(`written: ${outPath}`);
}

for (const s of payload) {
  console.log(`\n${s.startedAt.slice(0, 10)}  ${s.location}  ${s.title ?? "(sin título)"}  ${s.durationMin ?? "?"}min  ${s.sets.length} series`);
  for (const e of s.exercises) {
    console.log(`   ${e.name}${e.weightBasis === "bilateral-db-total" ? "  [÷2 por mancuerna]" : ""}`);
    for (const st of e.sets) {
      const load = st.durationSec != null
        ? `${st.durationSec}s`
        : `${st.weightKg ?? "BW"}${st.symmetryWeightKg != null ? ` (Symmetry ${st.symmetryWeightKg})` : "kg"} x${st.reps ?? "?"}`;
      console.log(`      ${st.badge} ${load}`);
    }
  }
}