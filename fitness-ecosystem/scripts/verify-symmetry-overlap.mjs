#!/usr/bin/env node
/**
 * End-to-end verification of a Symmetry screenshot import by PIXEL OVERLAP.
 *
 * The premise (owner's, and correct): every screenshot scrolls the same
 * workout, so the bottom of capture N is the top of capture N+1. That gives an
 * independent, OCR-free proof of the chain — it cannot repeat an OCR mistake
 * because it never reads text.
 *
 * WHY BINARY, NOT MEAN ABSOLUTE DIFFERENCE: this UI is dark mode. Almost every
 * pixel is near-black, so the mean absolute difference between *any* two rows
 * — including totally unrelated ones — is close to zero. The first version of
 * this script therefore reported a confident "100% overlap, MAD 0.00" for all
 * 44 pairs, which is meaningless. Thresholding to a text mask and scoring the
 * XOR of that mask is what actually discriminates: background-vs-background is
 * free, text-vs-background costs one mismatch.
 *
 * GEOMETRY: the status bar and the "Workout Details" toolbar do not scroll, so
 * they are excluded from matching — otherwise every pair would align at
 * delta 0. Below the toolbar, capture A at scroll offset sA and capture B at
 * sB satisfy:
 *
 *     A.rows[Y0 + delta + k)  ==  B.rows[Y0 + k)      delta = sB - sA
 *
 * A pair with no acceptable delta is a genuine break: either a missing
 * screenshot or the start of a new workout (which carries its own header).
 *
 *   node scripts/verify-symmetry-overlap.mjs <screenshots-dir>
 *
 * @module scripts/verify-symmetry-overlap
 */

import { PNG } from "pngjs";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/verify-symmetry-overlap.mjs <screenshots-dir>");
  process.exit(2);
}

const THRESHOLD = 60; // dark-mode background sits well below this
const STRIP = 120; // rows compared per candidate delta
const COL_STEP = 4; // 900px -> 225 samples
const GOOD = 0.02; // <=2% of mask pixels disagree => same region
const FAIL = 0.06; // >=6% certainly a different region

/** Text mask: 1 where the pixel is bright enough to be UI text. */
function mask(path) {
  const png = PNG.sync.read(readFileSync(path));
  const { width, height, data } = png;
  const rows = new Array(height);
  for (let y = 0; y < height; y++) {
    const r = new Uint8Array(900 / COL_STEP);
    let i = 0;
    for (let x = 0; x < width; x += COL_STEP) {
      const o = (y * width + x) * 4;
      const l = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      r[i++] = l > THRESHOLD ? 1 : 0;
    }
    rows[y] = r;
  }
  return { height, rows };
}

/**
 * XOR of two text masks, normalised by how much text is actually there.
 *
 * Both rows empty means agreement and must score 0. The first version returned
 * 1 for `tx === 0`, which inverted the whole comparison: on a dark-mode UI most
 * rows are empty, so nearly every pair scored 1.000 and the chain reported
 * 44/44 broken. Background-vs-background is a match, not a mismatch.
 */
function xorFrac(a, ya, b, yb) {
  const ra = a.rows[ya], rb = b.rows[yb];
  let bad = 0, text = 0;
  for (let i = 0; i < ra.length; i++) {
    if (ra[i] || rb[i]) text++;
    if (ra[i] !== rb[i]) bad++;
  }
  return text === 0 ? 0 : bad / text;
}

/**
 * Rows that are identical in EVERY capture are the non-scrolling chrome
 * (status bar + toolbar). Measured, not assumed.
 */
function findChrome(images) {
  const ref = images[0];
  let chrome = 0;
  // The status bar carries a different clock on every capture, so a single
  // strict mismatch would end the search at row 0. Tolerate a small fraction.
  const TOL = 0.2;
  for (let y = 0; y < ref.height; y++) {
    let sum = 0;
    for (const img of images) sum += xorFrac(ref, y, img, y);
    if (sum / images.length > TOL) break;
    chrome = y + 1;
  }
  return chrome;
}

/**
 * Align capture A's BOTTOM strip against every position of capture B.
 *
 * This is the owner's own formulation — "the end of one screenshot is the
 * start of the next" — and it sidesteps chrome detection entirely: A's bottom
 * rows are always scrollable content, so the non-scrolling toolbar can never
 * contaminate the sample. We only have to READ where in B that content sits.
 * A first version scanned B's rows starting at `chrome`, which put the strip
 * inside the fixed "Workout Details" bar; since the bar never scrolls, no
 * delta could ever match and all 44 pairs reported the loop's floor of 1px.
 */
function findDelta(a, b) {
  const top = a.height - STRIP;
  let bestP = -1, best = Infinity;
  for (let p = 0; p <= b.height - STRIP; p++) {
    let sum = 0, n = 0;
    for (let k = 0; k < STRIP; k += 3) { sum += xorFrac(b, p + k, a, top + k); n++; }
    const v = sum / n;
    if (v < best) { best = v; bestP = p; }
  }
  // Rows of A's bottom that B already shows, expressed as B's viewport.
  return { position: bestP, score: best };
}

function captureTime(f) {
  const m = /(\d{4})\.(\d{2})\.(\d{2})_(\d{2})\.(\d{2})\.(\d{2})/.exec(f);
  return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`) : null;
}

const files = readdirSync(dir).filter((f) => /^Screenshot.*\.png$/i.test(f)).sort();
if (files.length < 2) { console.error("need at least 2 screenshots"); process.exit(1); }

console.error(`loading ${files.length} screenshots ...`);
const imgs = files.map((f) => mask(join(dir, f)));
const chrome = findChrome(imgs);
console.error(`non-scrolling chrome measured: rows 0..${chrome - 1}`);

const links = [];
for (let i = 0; i < files.length - 1; i++) {
  const { position, score } = findDelta(imgs[i], imgs[i + 1]);
  const t0 = captureTime(files[i]), t1 = captureTime(files[i + 1]);
  const gapSec = t0 && t1 ? Math.round((t1 - t0) / 1000) : null;
  links.push({
    from: i + 1, to: i + 2, position, score: +score.toFixed(4),
    overlapPct: Math.round((100 * (1600 - position)) / 1600),
    gapSec, linked: score <= GOOD, ambiguous: score > FAIL,
  });
}

console.log("\n=== CADENA DE SOLAPE POR PÍXELES (máscara de texto, XOR) ===");
for (const l of links) {
  const mark = l.linked ? "  OK " : l.ambiguous ? "  *** " : "  ~~~ ";
  console.log(
    `${mark}#${String(l.from).padStart(2)}->#${String(l.to).padStart(2)}` +
    `  solape ${String(l.overlapPct).padStart(3)}%` +
    `  B@${String(l.position).padStart(4)}px` +
    `  XOR ${l.score.toFixed(4)}` +
    `  hueco ${String(l.gapSec).padStart(3)}s` +
    (l.linked ? "" : "   <-- CADENA ROTA"),
  );
}

const ok = links.filter((l) => l.linked);
const broken = links.filter((l) => !l.linked);
console.log(`\n=== RESUMEN ===`);
console.log(`pares comparados:               ${links.length}`);
console.log(`solape confirmado:              ${ok.length}`);
console.log(`solape roto:                    ${broken.length}`);
console.log(`bloques separados:              ${broken.length + 1}`);
// Calibration control: the most distant pair must score FAR worse than the
// adjacent ones, otherwise the threshold proves nothing.
const control = findDelta(imgs[0], imgs[imgs.length - 1]);
console.log(`control (#1 vs #${files.length}, sin solape esperado): XOR ${control.score.toFixed(4)}`);
console.log(`mejor XOR de los pares:        ${Math.min(...links.map((l) => l.score)).toFixed(4)}`);
console.log(`peor XOR de los pares:        ${Math.max(...links.map((l) => l.score)).toFixed(4)}`);
const gaps = links.map((l) => l.gapSec);
console.log(`hueco máximo entre capturas:    ${Math.max(...gaps)}s`);
console.log(`hueco total de captura:         ${gaps.reduce((a, b) => a + b, 0)}s`);
if (broken.length) {
  console.log(`\nrangos de imágenes separados:`);
  for (const b of broken) console.log(`   tras #${b.from} -> #${b.to} (hueco ${b.gapSec}s, XOR ${b.score})`);
}
