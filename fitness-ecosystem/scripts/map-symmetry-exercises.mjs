#!/usr/bin/env node
/**
 * Map Symmetry exercise names onto the catalog's exercise ids.
 *
 * Symmetry names carry their own equipment suffix — "One Arm Row (Dumbbell)",
 * "Bilateral Tricep Kickback (Cable)" — which is *not* how the catalog is
 * written ("Single-Arm Dumbbell Row"). Matching therefore compares the BASE
 * name (parenthetical stripped) using a token Dice coefficient, which survives
 * word-order differences and the one-word gaps the two naming styles leave
 * ("One Arm" vs "Single-Arm").
 *
 *   node scripts/map-symmetry-exercises.mjs <import.json> [--write]
 *
 * `--write` rewrites the import in place with `exerciseId` filled in. Without
 * it, the script only reports, so a mapping decision is never applied silently.
 *
 * A name below the confidence floor is NOT guessed: it keeps `exerciseId: null`
 * and is listed for review, because a wrong id would corrupt the volume ledger
 * and PR history far more quietly than an unmapped name.
 *
 * @module scripts/map-symmetry-exercises
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CATALOG_SRC = join(HERE, "../bodylab/core/exercises/src");

const args = process.argv.slice(2);
const importPath = args.find((a) => !a.startsWith("--"));
const shouldWrite = args.includes("--write");
if (!importPath) {
  console.error("usage: node scripts/map-symmetry-exercises.mjs <import.json> [--write]");
  process.exit(2);
}

/** Read id + English name straight out of the catalog sources. */
function loadCatalog() {
  const files = ["catalog.ts", "catalog-additions.ts", "catalog-expansion.ts"];
  const seen = new Map();
  for (const f of files) {
    const src = readFileSync(join(CATALOG_SRC, f), "utf8");
    const re = /id:\s*"([a-z0-9-]+)",\s*\n\s*name:\s*\{\s*en:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(src))) if (!seen.has(m[1])) seen.set(m[1], m[2]);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

const STOP = new Set(["with", "the", "a", "an", "de", "la", "el", "of", "and"]);

/** "Alternating Bicep Curl (Dumbbell)" -> ["alternating","bicep","curl"] */
function tokens(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

/** Dice coefficient over word tokens: 1.0 = identical bag of words. */
function dice(a, b) {
  if (!a.length || !b.length) return 0;
  const A = new Set(a), B = new Set(b);
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return (2 * shared) / (A.size + B.size);
}

/**
 * OCR debris that is not an exercise at all: repeated column headers that
 * survived the filter ("Weight / Reps", "Set Reps") and unreadable fragments.
 * These must never become catalog entries.
 */
function isDebris(name) {
  const t = tokens(name);
  if (t.length < 2) return true;
  if (/\breps?\b|\bweight\b|\bvolume\b|\bsets?\b/i.test(name)) return true;
  if (!/[a-z]{3}/i.test(name)) return true;
  return false;
}

const catalog = loadCatalog().map((c) => ({ ...c, tk: tokens(c.name) }));

const data = JSON.parse(readFileSync(importPath, "utf8"));
const names = [...new Set(data.sessions.flatMap((s) => s.exercises.map((e) => e.name)))].sort();

/**
 * Two thresholds, not one. AUTO is written straight into the import; anything
 * between REVIEW and AUTO is *reported but never written*, because a wrong
 * exerciseId corrupts the volume ledger and PR history far more quietly than
 * an unmapped name. At FLOOR=0.5 the matcher happily returned
 * "Dumbbell Shrugs" -> "dumbbell-fly" and "Single-Arm Dumbbell Tricep
 * Extension" -> "dumbbell-row"; both are confidently wrong.
 */
/**
 * Curated decisions for every Symmetry name (2026-10-04, Buffy).
 *
 * A curated `id` is a human-verified equivalence; `id: null` means the catalog
 * genuinely has no comparable entry (reason in `note`) — never a guess. Names
 * marked `proposal: true` cross equipment or variant boundaries and are listed
 * for the owner's veto before the mapping is considered closed (handoff
 * 2026-10-04, T1). The fuzzy matcher below only sees names NOT listed here.
 */
const CURATED = new Map(
  Object.entries({
    // ── equivalencias directas (fuzzy + revisión manual) ──────────────────
    "Barbell Reverse Lunge": { id: "reverse-lunge" },
    "Bicycle Crunch": { id: "bicycle-crunch" },
    "Bicycle Crunches": { id: "bicycle-crunch" },
    "Cable Hammer Curl": { id: "hammer-curl" },
    "Chin-ups": { id: "chin-ups" },
    "Dead Hang": { id: "dead-hang" },
    "Hanging Knee Raise": { id: "hanging-knee-raise" },
    "Incline Bench Press (Barbell)": { id: "incline-bench-press" },
    "Leg Extension": { id: "leg-extension" },
    "Lying Leg Curl (Machine)": { id: "leg-curl" },
    "Pull-ups (Pronated Grip)": { id: "pull-ups" },
    "Rope Tricep Pushdown": { id: "tricep-pushdown" },
    "Seated Calf Raise": { id: "seated-calf-raise" },
    "Sit Up (Weighted)": { id: "sit-up" },
    "Standard Push-ups": { id: "push-ups" },
    "Tricep Pushdown": { id: "tricep-pushdown" },
    "45-Degree Leg Press (Machine)": { id: "leg-press" }, // 45° es el ángulo de la máquina
    "Behind the Neck Lat Pulldown": { id: "lat-pulldown" }, // variante de agarre
    "Close Grip Pull-ups": { id: "pull-ups" }, // agarre estrecho
    "Conventional Deadlift (Straight Bar)": { id: "deadlift" },
    "Dumbbell Flat Bench Fly": { id: "dumbbell-fly" },
    "Dumbbell One Arm Reverse Wrist Curl": { id: "reverse-wrist-curl" },
    "Dumbbell One Arm Wrist Curl": { id: "wrist-curl" },
    "Good Mornings (Smith Machine)": { id: "good-morning" }, // Smith = equipo
    "Lateral Raises (Dumbbell)": { id: "lateral-raise" },
    "Neutral Wide Grip Lat Pulldown (Machine)": { id: "lat-pulldown" },
    "One Arm Row (Dumbbell)": { id: "dumbbell-row" }, // == Single-Arm Dumbbell Row
    "Seated Shoulder Press (Dumbbell)": { id: "seated-dumbbell-press" },
    "Pec Deck (Machine)": { id: "machine-chest-fly" }, // el catálogo lo llama Machine Chest Fly (Pec Deck)
    "Plank": { id: "plank" },
    "Plank With Hip Twist": { id: "plank" }, // variante con rotación de plancha
    // ── propuestas que cruzan variante/equipo (vetables) ──────────────────
    "Incline Leg Hip Raise": { id: "lying-leg-raise", proposal: true },
    "Incline Push-up": { id: "push-ups", proposal: true }, // flexión con manos elevadas
    "Parallel Bar Knee Raise": { id: "hanging-knee-raise", proposal: true },
    "Pause Squat": { id: "barbell-squat", proposal: true }, // sentadilla con pausa
    "Single-Arm Dumbbell Tricep Extension": { id: "overhead-tricep-extension", proposal: true }, // catálogo lo llama Overhead Cable
    "Wide Grip Dips": { id: "dips", proposal: true },
    "Alternating Bicep Curl (Dumbbell)": { id: "dumbbell-curl", proposal: true },
    "Bilateral Bicep Curl with Rotation (Dumbbell)": { id: "dumbbell-curl", proposal: true },
    "Dumbell Lying Hammer Press": { id: "dumbbell-bench-press", proposal: true }, // agarre neutro
    "Hip Raise with Bent Knees": { id: "lying-leg-raise", proposal: true }, // rodillas flexionadas
    "Rowing Machine": { id: "seated-cable-row", proposal: true },
    "Stationary Bike": { id: "mtb-steady-ride", proposal: true }, // 300 s continuos en la captura
    "Wide Neutral Grip Row (Cable)": { id: "seated-cable-row", proposal: true },
    // ── equivalencias cerradas añadiendo entradas al catálogo (2026-10-04) ─
    "Abdominal Crunch (Arms Crossed)": { id: "crunch" }, // brazos cruzados = crunch estándar
    "Weighted Crunch": { id: "crunch" }, // precedente: "Sit Up (Weighted)" → sit-up; el peso va en la serie
    "Decline Crunch": { id: "decline-crunch" },
    "Dumbbell Oblique Crunch": { id: "oblique-crunch" },
    "Dumbbell Shrugs": { id: "dumbbell-shrugs" },
    "Hip Abduction (Machine)": { id: "hip-abduction-machine" },
    "Hip Adduction (Machine)": { id: "hip-adduction-machine" }, // cierre del par de máquinas (antes propuesta → cable)
    "Bilateral Tricep Kickback (Cable)": { id: "tricep-kickback" },
    "Rodillo De Mufieca (Neutro)": { id: "wrist-roller" }, // nombre propio del dueño = wrist roller
    // ── sin equivalente en el catálogo (nada se inventa) ──────────────────
    "Downward Dog to Cobra Push-up": { id: null, note: "flujos/movilidad; bloque de movilidad pendiente (UI_PLAN §16.4)" },
    "Isometric Neck Contraction (Lateral)": { id: null, note: "el vocabulario del catálogo no tiene músculos ni patrón de cuello" },
    "Lateral Neck Stretch": { id: null, note: "movilidad + sin vocabulario de cuello (UI_PLAN §16.4)" },
    "Stretching": { id: null, note: "movilidad; decisión abierta (UI_PLAN §16.4)" },
    "pa® (Maquina)": { id: null, note: "nombre personalizado ilegible para el OCR — preguntar al dueño" },
  }),
);

const AUTO = 0.8;
const REVIEW = 0.45;
const resolved = new Map();
const curatedNull = [];
const review = [];
const unresolved = [];
const debris = [];

/** Every curated id must exist in the catalog — a typo must never pass silently. */
const catalogById = new Map(catalog.map((c) => [c.id, c.name]));
for (const [name, c] of CURATED) {
  if (c.id && !catalogById.has(c.id)) {
    console.error(`FATAL: curated id "${c.id}" for "${name}" is not in the catalog`);
    process.exit(1);
  }
}

for (const name of names) {
  if (CURATED.has(name)) {
    const c = CURATED.get(name);
    if (c.id) resolved.set(name, { id: c.id, name: catalogById.get(c.id), score: 1, curated: true, proposal: !!c.proposal });
    else curatedNull.push({ name, note: c.note });
    continue;
  }
  if (isDebris(name)) { debris.push(name); continue; }
  const tk = tokens(name);
  let best = null, score = 0;
  for (const c of catalog) {
    const s = dice(tk, c.tk);
    if (s > score) { score = s; best = c; }
  }
  if (best && score >= AUTO) resolved.set(name, { id: best.id, name: best.name, score });
  else if (best && score >= REVIEW) review.push({ name, best, score });
  else unresolved.push({ name, best, score });
}

const totalSets = data.sessions.reduce((n, s) => n + s.sets.length, 0);
let mappedSets = 0;
for (const s of data.sessions) {
  const idByName = new Map();
  for (const e of s.exercises) {
    const hit = resolved.get(e.name);
    if (hit) mappedSets += e.sets.length;
    e.exerciseId = hit ? hit.id : null;
    idByName.set(e.name, e.exerciseId);
  }
  // The flattened `session.sets` rows carry the name but the importer leaves
  // exerciseId null there — fill them by name too, or every downstream
  // consumer (the app's Symmetry converter included) sees an unmapped row.
  for (const st of s.sets) {
    if (st.exerciseId == null && idByName.has(st.exerciseName)) {
      st.exerciseId = idByName.get(st.exerciseName);
    }
  }
}

const curatedCount = [...resolved.values()].filter((r) => r.curated).length;
const proposalCount = [...resolved.values()].filter((r) => r.proposal).length;
console.log(`nombres distintos:            ${names.length}`);
console.log(`  curados con id:                ${curatedCount} (de ellos ${proposalCount} propuestas vetables)`);
console.log(`  curados sin equivalente:       ${curatedNull.length}`);
console.log(`  fuzzy automático:              ${resolved.size - curatedCount}`);
console.log(`  para revisión manual:          ${review.length}`);
console.log(`  sin resolver:                  ${unresolved.length}`);
console.log(`  descartados como ruido OCR:    ${debris.length}`);
console.log(`series escritas con id:        ${mappedSets}/${totalSets} (${Math.round((100 * mappedSets) / totalSets)}%)\n`);

if (curatedNull.length) {
  console.log("--- curados SIN equivalente en catálogo (no se inventa id) ---");
  for (const u of curatedNull) console.log("   ", u.name.padEnd(44), u.note);
  console.log();
}
const proposals = [...resolved].filter(([, r]) => r.proposal);
if (proposals.length) {
  console.log("--- propuestas vetables por el dueño (cruzan variante/equipo) ---");
  for (const [from, to] of proposals) console.log("   ", from.padEnd(44), "->", to.id, `(${to.name})`);
  console.log();
}

if (debris.length) {
  console.log("--- descartado como ruido OCR ---");
  for (const d of debris) console.log("   ", d);
  console.log();
}
if (review.length) {
  console.log("--- REVISAR: sondea, no se escriben ---");
  for (const r of review) {
    console.log("   ", r.name.padEnd(44), "sugiere:", String(r.best?.name ?? "-").padEnd(30), r.score.toFixed(2));
  }
  console.log();
}
if (unresolved.length) {
  console.log("--- sin resolver (NO se adivina) ---");
  for (const u of unresolved) {
    console.log("   ", u.name.padEnd(44), "mejor:", String(u.best?.name ?? "-").padEnd(30), u.score.toFixed(2));
  }
  console.log();
}
console.log("--- resueltos ---");
for (const [from, to] of [...resolved].sort()) {
  console.log("   ", from.padEnd(44), "->", to.id, `(${to.score.toFixed(2)})`);
}

if (shouldWrite) {
  writeFileSync(importPath, JSON.stringify(data, null, 2));
  console.log(`\nescrito: ${importPath}`);
}