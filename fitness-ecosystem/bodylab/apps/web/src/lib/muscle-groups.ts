/**
 * Muscle-group layer model for the 3D anatomy atlas.
 *
 * Pure logic (no three.js, no DOM) so it is unit-testable: it answers two
 * questions the 3D viewer needs answered:
 *
 *   1. Which layer/group does an atlas mesh belong to? The Z-Anatomy GLB ships
 *      ~683 per-muscle objects with English anatomical names
 *      (e.g. `(Abdominal part of pectoralis major muscle).l.001`) — this maps
 *      every one of them onto one of nine UI groups.
 *   2. Which groups deserve the user's attention *right now*, given what the
 *      app already knows: their measurement history (`state.measurements`) and
 *      their logged training (`state.exerciseSets` → shared exercise catalog).
 *
 * The atlas itself is Z-Anatomy (CC BY-SA 4.0, verified 2026-10-08 — see
 * `fitness-ecosystem/resources/anatomy/README.md`); only the grouping and the
 * relevance scoring are ours.
 *
 * @module lib/muscle-groups
 */

import type { ExerciseSet, Measurement } from './types';
import { ALL_EXERCISES, getMusclesForExercise } from './exercises';

/** The nine layers the viewer can isolate. Stable ids — persisted nowhere. */
export type MuscleGroupId =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'glutes'
  | 'legs'
  | 'neck'
  | 'other';

export interface MuscleGroupDef {
  id: MuscleGroupId;
  label: { en: string; es: string };
}

/** UI order: torso top-down, then limbs, then "everything else". */
export const MUSCLE_GROUPS: readonly MuscleGroupDef[] = [
  { id: 'chest', label: { en: 'Chest', es: 'Pecho' } },
  { id: 'back', label: { en: 'Back', es: 'Espalda' } },
  { id: 'shoulders', label: { en: 'Shoulders', es: 'Hombros' } },
  { id: 'arms', label: { en: 'Arms', es: 'Brazos' } },
  { id: 'core', label: { en: 'Core', es: 'Core' } },
  { id: 'glutes', label: { en: 'Glutes', es: 'Glúteos' } },
  { id: 'legs', label: { en: 'Legs', es: 'Piernas' } },
  { id: 'neck', label: { en: 'Neck & head', es: 'Cuello y cabeza' } },
  { id: 'other', label: { en: 'Connective', es: 'Tejidos conectivos' } },
];

export const MUSCLE_GROUP_LABEL: Record<MuscleGroupId, { en: string; es: string }> =
  Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.id, g.label])) as Record<
    MuscleGroupId,
    { en: string; es: string }
  >;

// ---------------------------------------------------------------------------
// 1. Atlas mesh name → group
// ---------------------------------------------------------------------------

/**
 * Keyword rules, **ordered**: Z-Anatomy names are anatomically precise but
 * ambiguous in isolation (`Flexor digitorum` exists in forearm and leg), so
 * distal anchors ("of foot", "of hand") and the leg compartment are checked
 * before the arm rules. First match wins.
 */
/** Tissue that legitimately belongs to the "connective" layer (also used by tests). */
export const CONNECTIVE_TISSUE_RE =
  /fascia|bursa|septum|retinaculum|aponeurosis|ligament|tendon|tendinous|cartilage|synovial|sheath|linea alba|\barch\b|tarsus/i;

const NAME_RULES: ReadonlyArray<readonly [MuscleGroupId, RegExp]> = [
  // Distal anchors — settle hand/foot ambiguity up front.
  ['legs', /of foot|plantar|plantae|hallucis|fibular|peroneus/],
  ['arms', /of hand|thenar|hypothenar|opponens|palmar|interossei/],
  // Legs before arms again for the shared "flexor/extensor digitorum" names.
  [
    'legs',
    /gastrocnemius|soleus|tibialis|plantaris|popliteus|quadriceps|vastus|rectus femoris|biceps femoris|semitendinosus|semimembranosus|adductor|gracilis|sartorius|iliotibial|tensor fasciae latae|pectineus|hamstring|flexor digitorum longus|extensor digitorum longus|extensor hallucis|flexor hallucis|lumbrical muscles|interossei muscles/,
  ],
  // Torso front.
  ['chest', /pectoralis|subclavius/],
  [
    'core',
    /rectus abdominis|abdominal oblique|external oblique|internal oblique|transversus abdominis|transversus thoracis|intercostal|serratus anterior|psoas major|psoas minor|iliacus|quadratus lumborum|pyramidalis|pelvic diaphragm|levator ani|coccygeus|anal sphincter|pubo analis|\bdiaphragm\b/,
  ],
  // Shoulders before back: the rotator cuff lives with the deltoid.
  ['shoulders', /deltoid|supraspinatus|infraspinatus|teres minor|subscapularis/],
  [
    'back',
    /trapezius|latissimus|rhomboid|teres major|levator scapulae|splenius|erector spinae|longissimus|iliocostalis|semispinalis|multifidus|rotatores|spinalis thoracis|interspinales lumborum|interspinales thoracis|intertransversarii lumborum|levatores breves costarum|levatores longi costarum|thoracolumbar fascia|serratus posterior|dorsal/,
  ],
  [
    'glutes',
    /gluteus|piriformis|obturator internus|obturator externus|gemellus|quadratus femoris/,
  ],
  [
    'arms',
    /biceps brachii|triceps brachii|biceps muscle|triceps muscle|brachialis|brachioradialis|pronator|supinator|flexor carpi|extensor carpi|flexor digitorum|extensor digitorum|palmaris|anconeus|flexor pollicis|extensor pollicis|extensor indicis|abductor pollicis|flexor digiti|extensor digiti|lumbrical|interossei/,
  ],
  // Neck & head: cervical skeleton, face, mastication, pharynx, larynx, eyes.
  [
    'neck',
    /sternocleidomastoid|scalene|scalenus|platysma|hyoid|masseter|temporalis|digastric|mylohyoid|geniohyoid|stylohyoid|styloglossus|stylopharyngeus|orbicularis|levator labii|levator palpebrae|levator anguli|zygomaticus|risorius|mentalis|occipitalis|frontalis|nasalis|nasolabialis|buccinator|bucinator|procerus|temporoparietalis|supercilii|depressor|auricular|longus colli|longus capitis|infrahyoid|suprahyoid|sternothyroid|thyrohyoid|cricothyroid|arytenoid|crico arytenoid|thyro arytenoid|pharyngeal constrictor|pterygoid|glossopharyngeus|genioglossus|hyoglossus|uvula|tensor veli|levator veli|palatoglossus|palatopharyngeus|uvularis|anterior belly|posterior belly|inferior rectus|superior rectus|lateral rectus|medial rectus|superior oblique|inferior oblique|trochlea|\bcolli\b|capitis/,
  ],
  // Explicit non-muscle tissue last, so a name that matches nothing real
  // falls through to `other` instead of a guess.
  ['other', CONNECTIVE_TISSUE_RE],
];

const DEFAULT_GROUP: MuscleGroupId = 'other';

/**
 * Classify one atlas node/mesh name into a UI group.
 * Accepts raw GLB node names (side + suffix decorations included).
 */
export function classifyMuscleName(raw: string): MuscleGroupId {
  const n = raw
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
  if (!n) return DEFAULT_GROUP;
  for (const [group, re] of NAME_RULES) {
    if (re.test(n)) return group;
  }
  return DEFAULT_GROUP;
}

// ---------------------------------------------------------------------------
// 2. Relevance: the user's own measurements + logged training
// ---------------------------------------------------------------------------

/** Measurement types that say something about a muscle group (tape/circumference only). */
export const MEASUREMENT_GROUP: Readonly<Record<string, MuscleGroupId>> = {
  chest: 'chest',
  waist: 'core',
  neck: 'neck',
  hips: 'glutes',
  hip_upper: 'glutes',
  shoulders: 'shoulders',
  shoulders_left: 'shoulders',
  shoulders_right: 'shoulders',
  biceps: 'arms',
  biceps_left: 'arms',
  biceps_right: 'arms',
  biceps_flexed: 'arms',
  triceps: 'arms',
  forearm: 'arms',
  forearm_left: 'arms',
  forearm_right: 'arms',
  forearm_flexed: 'arms',
  thigh: 'legs',
  thigh_left: 'legs',
  thigh_right: 'legs',
  calf: 'legs',
  calf_left: 'legs',
  calf_right: 'legs',
};

/** Shared exercise-catalog muscle id (`MuscleGroup`) → viewer group. */
export const TRAINING_MUSCLE_GROUP: Readonly<Record<string, MuscleGroupId>> = {
  chest_upper: 'chest',
  chest_lower: 'chest',
  pectoralis_minor: 'chest',
  serratus_anterior: 'core',
  anterior_deltoid: 'shoulders',
  lateral_deltoid: 'shoulders',
  posterior_deltoid: 'shoulders',
  triceps_long: 'arms',
  triceps_lateral: 'arms',
  triceps_medial: 'arms',
  biceps_long: 'arms',
  biceps_short: 'arms',
  brachioradialis: 'arms',
  forearm_flexors: 'arms',
  forearm_extensors: 'arms',
  lats_upper: 'back',
  lats_mid: 'back',
  lats_lower: 'back',
  traps_upper: 'back',
  traps_mid: 'back',
  traps_lower: 'back',
  rhomboids: 'back',
  rectus_abdominis: 'core',
  obliques: 'core',
  erector_spinae: 'back',
  iliopsoas: 'core',
  gluteus_maximus: 'glutes',
  gluteus_medius: 'glutes',
  quadriceps: 'legs',
  hamstrings: 'legs',
  adductors: 'legs',
  calves: 'legs',
  soleus: 'legs',
  tibialis_anterior: 'legs',
};

/** Human labels for the measurement types that feed relevance. */
const MEASUREMENT_LABEL: Readonly<Record<string, { en: string; es: string }>> = {
  chest: { en: 'Chest', es: 'Pecho' },
  waist: { en: 'Waist', es: 'Cintura' },
  neck: { en: 'Neck', es: 'Cuello' },
  hips: { en: 'Hips', es: 'Cadera' },
  hip_upper: { en: 'Upper hip', es: 'Cadera alta' },
  shoulders: { en: 'Shoulders', es: 'Hombros' },
  shoulders_left: { en: 'Shoulder L', es: 'Hombro I' },
  shoulders_right: { en: 'Shoulder R', es: 'Hombro D' },
  biceps: { en: 'Biceps', es: 'Bíceps' },
  biceps_left: { en: 'Biceps L', es: 'Bíceps I' },
  biceps_right: { en: 'Biceps R', es: 'Bíceps D' },
  biceps_flexed: { en: 'Biceps flexed', es: 'Bíceps contraído' },
  triceps: { en: 'Triceps', es: 'Tríceps' },
  forearm: { en: 'Forearm', es: 'Antebrazo' },
  forearm_left: { en: 'Forearm L', es: 'Antebrazo I' },
  forearm_right: { en: 'Forearm R', es: 'Antebrazo D' },
  forearm_flexed: { en: 'Forearm flexed', es: 'Antebrazo contraído' },
  thigh: { en: 'Thigh', es: 'Muslo' },
  thigh_left: { en: 'Thigh L', es: 'Muslo I' },
  thigh_right: { en: 'Thigh R', es: 'Muslo D' },
  calf: { en: 'Calf', es: 'Pantorrilla' },
  calf_left: { en: 'Calf L', es: 'Pantorrilla I' },
  calf_right: { en: 'Calf R', es: 'Pantorrilla D' },
};

export interface RelevanceSource {
  kind: 'measurement' | 'training';
  group: MuscleGroupId;
  /** 0..3 — drives the tint strength and the panel ordering. */
  score: number;
  at: string;
  /** Already-localized one-liner for the panel ("Waist 80.0 cm (+1.0)"). */
  label: { en: string; es: string };
}

export interface GroupRelevance {
  group: MuscleGroupId;
  /** Best measurement score + best training score (0..6). */
  score: number;
  sources: RelevanceSource[];
}

const DAY = 86_400_000;

function daysAgo(iso: string, now: number): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (now - t) / DAY;
}

/** Recency tiers — a reading stays "hot" for a week, warm for a month. */
function recencyScore(days: number, horizons: readonly [number, number, number]): number | null {
  if (days < 0) return null; // clock skew: ignore future timestamps
  if (days <= horizons[0]) return 3;
  if (days <= horizons[1]) return 2;
  if (days <= horizons[2]) return 1;
  return null;
}

const MEASUREMENT_HORIZONS = [7, 30, 90] as const;
const TRAINING_HORIZONS = [7, 14, 30] as const;

function fmtDelta(delta: number, lang: 'en' | 'es'): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  const abs = Math.abs(delta).toFixed(1).replace('.', lang === 'es' ? ',' : '.');
  return `${sign}${abs}`;
}

/**
 * Score every group from the user's own data.
 *
 * - **measurements:** the newest reading per type (cm only — lengths/breadths
 *   don't track muscle size), scored by recency; the label carries the value
 *   and the change vs the previous reading.
 * - **training:** sets from `state.exerciseSets`, resolved through the shared
 *   catalog; primary muscles (intensity 3) score higher than synergists (2).
 *
 * Returns only the groups with at least one live source.
 */
export function computeMuscleRelevance(input: {
  measurements: readonly Measurement[];
  exerciseSets: readonly ExerciseSet[];
  now?: number;
}): Partial<Record<MuscleGroupId, GroupRelevance>> {
  const now = input.now ?? Date.now();
  const out: Partial<Record<MuscleGroupId, GroupRelevance>> = {};

  const push = (src: RelevanceSource) => {
    const slot = (out[src.group] ??= { group: src.group, score: 0, sources: [] });
    slot.sources.push(src);
  };

  // ── Measurements: newest reading per type, with delta vs previous ──────
  const byType = new Map<string, Measurement[]>();
  for (const m of input.measurements) {
    const group = MEASUREMENT_GROUP[m.type];
    if (!group) continue;
    const list = byType.get(m.type) ?? [];
    list.push(m);
    byType.set(m.type, list);
  }
  for (const [type, list] of byType) {
    list.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    const latest = list[0];
    const days = daysAgo(latest.timestamp, now);
    if (days === null) continue;
    const score = recencyScore(days, MEASUREMENT_HORIZONS);
    if (score === null) continue;
    const label = MEASUREMENT_LABEL[type] ?? { en: type, es: type };
    const unit = latest.unit === 'kg' ? 'kg' : 'cm';
    const prev = list[1];
    const value = latest.value.toFixed(1).replace('.', '.');
    let text = `${label.en} ${value} ${unit}`;
    let textEs = `${label.es} ${value.replace('.', ',')} ${unit}`;
    if (prev && Date.parse(prev.timestamp) !== Date.parse(latest.timestamp)) {
      const delta = latest.value - prev.value;
      if (Math.abs(delta) >= 0.05) {
        text += ` (${fmtDelta(delta, 'en')})`;
        textEs += ` (${fmtDelta(delta, 'es')})`;
      }
    }
    push({
      kind: 'measurement',
      group: MEASUREMENT_GROUP[type],
      score,
      at: latest.timestamp,
      label: { en: text, es: textEs },
    });
  }

  // ── Training: resolve logged sets through the shared catalog ────────────
  const exById = new Map(ALL_EXERCISES.map((e) => [e.id, e]));
  const bestTraining = new Map<string, { score: number; set: ExerciseSet; primary: boolean }>();
  for (const set of input.exerciseSets) {
    const ex = exById.get(set.exerciseId);
    if (!ex) continue;
    const days = daysAgo(set.timestamp, now);
    if (days === null) continue;
    const recency = recencyScore(days, TRAINING_HORIZONS);
    if (recency === null) continue;
    for (const inv of getMusclesForExercise(ex)) {
      if (inv.intensity === 1) continue; // synergists only muddle the signal
      const group = TRAINING_MUSCLE_GROUP[inv.muscle];
      if (!group) continue;
      const primary = inv.intensity === 3;
      const score = primary ? recency : Math.max(1, recency - 1);
      const key = `${group}|${ex.id}`;
      const prevBest = bestTraining.get(key);
      if (!prevBest || score > prevBest.score) {
        bestTraining.set(key, { score, set, primary });
      }
    }
  }
  const nameOf = (exId: string): { en: string; es: string } => {
    const ex = exById.get(exId);
    if (!ex) return { en: exId, es: exId };
    return ex.name as { en: string; es: string };
  };
  for (const [key, hit] of bestTraining) {
    const group = key.split('|')[0] as MuscleGroupId;
    const nm = nameOf(hit.set.exerciseId);
    const role = hit.primary ? '' : { en: ' (assists)', es: ' (ayuda)' };
    const roleText = typeof role === 'string' ? role : role.en;
    const roleTextEs = typeof role === 'string' ? role : role.es;
    push({
      kind: 'training',
      group,
      score: hit.score,
      at: hit.set.timestamp,
      label: {
        en: `${nm.en}${roleText}`,
        es: `${nm.es}${roleTextEs}`,
      },
    });
  }

  // ── Rank: best source first, then summarize ─────────────────────────────
  for (const group of Object.keys(out) as MuscleGroupId[]) {
    const rel = out[group]!;
    rel.sources.sort((a, b) => b.score - a.score || Date.parse(b.at) - Date.parse(a.at));
    const bestMeasure = rel.sources.filter((s) => s.kind === 'measurement')[0];
    const bestTrain = rel.sources.filter((s) => s.kind === 'training')[0];
    rel.score = (bestMeasure?.score ?? 0) + (bestTrain?.score ?? 0);
    if (rel.score <= 0) delete out[group];
  }
  return out;
}

/** Tint strength for a group score (0..6) → 0.25..0.75 of the accent color. */
export function tintStrengthFor(score: number): number {
  if (score <= 0) return 0;
  return Math.min(0.75, 0.3 + score * 0.075);
}
