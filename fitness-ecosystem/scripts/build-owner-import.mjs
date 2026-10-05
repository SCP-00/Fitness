#!/usr/bin/env node
/**
 * Owner data → BodyLab import file.
 *
 * Turns the measurements the owner typed in chat into the **legacy `.json`
 * export shape** that BodyLab's own *Data Vault → Import* screen accepts
 * (`{ format: "bodylab", data: { profile, measurements, snapshots } }`). The
 * point is that the file travels through the interface the owner will actually
 * use: he double-clicks nothing, he picks this file in the app.
 *
 * Two rules this script enforces:
 *   1. every emitted `type` must exist in `MEASUREMENT_TYPES` (web
 *      `src/lib/constants.ts`) and inside its documented `min`..`max` window —
 *      a value the app cannot place is reported, never silently stored;
 *   2. nothing is invented. Left/right pairs are left empty when the owner only
 *      gave one side, and `birthDate` stays `null` when he never gave his age,
 *      because BodyLab derives age from the birth date (`lib/age.ts`) and a
 *      frozen number would rot.
 *
 * Usage: `node scripts/build-owner-import.mjs [--out .cache/bodylab-owner.json]`
 *
 * The output lives under `.cache/`, which `.gitignore` excludes: this is real
 * personal body data and the repository is public.
 *
 * @module scripts/build-owner-import
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Owner-declared facts (2026-10-04, from his own message). */
const OWNER = {
  name: 'Andy',
  weightKg: 76.0,
  heightCm: 176,
  biologicalSex: 'male',
  // Owner-stated 2026-10-05 ("Nací el 28/09/2005"). BodyLab derives the age
  // from this (`lib/age.ts`), so it is the only age input the app accepts.
  birthDate: '2005-09-28',
  /** What he typed, keyed by his own label, before any mapping decision. */
  raw: [
    { label: 'Peso', value: 76.0, unit: 'kg' },
    { label: 'Altura', value: 176, unit: 'cm' },
    { label: 'Muñeca', value: 16.5, unit: 'cm' },
    // Owner clarification 2026-10-05: «manzana» is the **neck** in his
    // vocabulary, so 37.5 cm is a neck measurement, not a rib-cage one.
    { label: 'Manzana (cuello)', value: 37.5, unit: 'cm' },
    { label: 'Diámetro Hombros', value: 116, unit: 'cm' },
    { label: 'Pecho', value: 95, unit: 'cm' },
    { label: 'Abdomen templado', value: 78, unit: 'cm' },
    { label: 'Abdomen libre', value: 83, unit: 'cm' },
    // Owner clarification 2026-10-05: «boxer» is the height where the
    // underwear sits — where the hip bones start, i.e. ABOVE the widest point
    // of the hips the app measures.
    { label: 'Boxer (cadera alta)', value: 86, unit: 'cm' },
    { label: 'Cadera/Glúteos', value: 97, unit: 'cm' },
    { label: 'Bíceps', value: 32, unit: 'cm' },
    { label: 'Tríceps', value: 32, unit: 'cm' },
    { label: 'Antebrazo', value: null, unit: 'cm' },
    { label: 'Muslo derecho', value: 55, unit: 'cm' },
    { label: 'Muslo izquierdo', value: 55, unit: 'cm' },
    { label: 'Calves', value: 39, unit: 'cm' },
    { label: 'Shoes size', value: 26, unit: 'cm' },
  ],
};

/**
 * Mirror of the web app's `MEASUREMENT_TYPES`. Kept in sync by hand on purpose:
 * this script must stay dependency-free and runnable before `pnpm install`.
 */
const MEASUREMENT_TYPES = [
  ['wrist', 'cm', 10, 30], ['neck', 'cm', 25, 55], ['shoulders', 'cm', 80, 180],
  ['chest', 'cm', 60, 160], ['waist', 'cm', 50, 160], ['hips', 'cm', 60, 160],
  ['biceps', 'cm', 20, 65], ['forearm', 'cm', 18, 50], ['thigh', 'cm', 35, 90],
  ['calf', 'cm', 25, 60],
  ['biceps_left', 'cm', 20, 65], ['biceps_right', 'cm', 20, 65],
  ['forearm_left', 'cm', 18, 50], ['forearm_right', 'cm', 18, 50],
  ['thigh_left', 'cm', 35, 90], ['thigh_right', 'cm', 35, 90],
  ['calf_left', 'cm', 25, 60], ['calf_right', 'cm', 25, 60],
  ['shoulders_left', 'cm', 40, 90], ['shoulders_right', 'cm', 40, 90],
  // Added 2026-10-05 with the tape/household expansion
  ['hip_upper', 'cm', 60, 140], ['triceps', 'cm', 15, 60],
  ['biceps_flexed', 'cm', 20, 75], ['forearm_flexed', 'cm', 18, 55],
  ['mid_axillary', 'cm', 30, 120], ['ankle', 'cm', 15, 45],
  ['stature_sitting', 'cm', 40, 120], ['arm_span', 'cm', 100, 240],
  ['subischial_leg_length', 'cm', 50, 120], ['upper_arm_length', 'cm', 20, 60],
  ['forearm_length', 'cm', 15, 55], ['hand_length', 'cm', 10, 35],
  ['thigh_length', 'cm', 25, 75], ['lower_leg_length', 'cm', 15, 65],
  ['foot_length', 'cm', 15, 40],
  ['biacromial', 'cm', 25, 70], ['bi_iliac', 'cm', 15, 45],
  ['wrist_breadth', 'cm', 3, 12], ['elbow_breadth', 'cm', 3, 14],
  ['knee_breadth', 'cm', 5, 20], ['malleolar_breadth', 'cm', 3, 14],
  ['hand_width', 'cm', 4, 16],
  ['weight', 'kg', 30, 250],
  ['body_fat_percentage', '%', 3, 60], ['lean_mass', 'kg', 20, 120],
  ['bone_mass', 'kg', 1, 6], ['water_percentage', '%', 30, 75],
  ['cooper_12m_distance', 'm', 300, 4000], ['resting_heart_rate', 'bpm', 30, 220],
  ['body_fat_measured', '%', 2, 70],
  ['abdominal_skinfold', 'mm', 3, 80], ['chest_skinfold', 'mm', 3, 80],
  ['thigh_skinfold', 'mm', 3, 80], ['triceps_skinfold', 'mm', 3, 80],
  ['suprailiac_skinfold', 'mm', 3, 80],
];
const TYPES = new Map(MEASUREMENT_TYPES.map(([id, unit, min, max]) => [id, { id, unit, min, max }]));

/**
 * The mapping itself. Each entry says which owner label goes to which BodyLab
 * type, and — for values BodyLab has no home for — why.
 */
const MAPPING = [
  { label: 'Peso', type: 'weight', value: 76.0 },
  { label: 'Muñeca', type: 'wrist', value: 16.5 },
  {
    label: 'Manzana (cuello)',
    type: 'neck',
    value: 37.5,
    notes: 'El dueño aclaró que «manzana» es el cuello (2026-10-05).',
  },
  {
    label: 'Bíceps',
    type: 'biceps',
    value: 32,
    notes: 'Bíceps 32 cm en ambos lados; el tríceps también 32 cm (BodyLab no tiene tipo de tríceps).',
  },
  { label: 'Bíceps (izq.)', type: 'biceps_left', value: 32 },
  { label: 'Bíceps (der.)', type: 'biceps_right', value: 32 },
  { label: 'Diámetro Hombros', type: 'shoulders', value: 116, notes: 'Perímetro de hombros (sobre los deltoides): 116 cm no es una anchura acromial (típico 40–45 cm), que es un tipo nuevo todavía sin medir.' },
  { label: 'Pecho', type: 'chest', value: 95 },
  {
    label: 'Abdomen libre',
    type: 'waist',
    value: 83,
    notes: 'Abdomen relajado a la altura del ombligo (protocolo BodyLab para hombres). Abdomen templado 78 cm no tiene tipo propio.',
  },
  { label: 'Cadera/Glúteos', type: 'hips', value: 97, notes: 'Punto más ancho de caderas/glúteos.' },
  {
    label: 'Boxer (cadera alta)',
    type: 'hip_upper',
    value: 86,
    notes: 'Donde empieza el hueso de la cadera (aclaración del propietario, 2026-10-05). Tipo nuevo `hip_upper`.',
  },
  {
    label: 'Tríceps',
    type: 'triceps',
    value: 32,
    notes: 'El propietario indica que bíceps y tríceps miden 32 cm. Tipo nuevo `triceps`.',
  },
  {
    label: 'Shoes size → longitud del pie',
    type: 'foot_length',
    value: 26,
    notes: 'Reportado como «shoes size 26 cm»; 26 no es una talla europea (39/40/41), así que es la longitud del pie. Verificar al medirlo.',
  },
  { label: 'Muslo izquierdo', type: 'thigh_left', value: 55 },
  { label: 'Muslo derecho', type: 'thigh_right', value: 55 },
  {
    label: 'Muslo (agregado)',
    type: 'thigh',
    value: 55,
    derivedFrom: ['thigh_left', 'thigh_right'],
    notes: 'Media de ambos lados (izq 55 / der 55). El Resumen y el modelo 3D leen el tipo genérico; la simetría usa los lados.',
  },
  {
    label: 'Calves',
    type: 'calf',
    value: 39,
    notes: 'Dato único sin lado; para el panel de simetría harían falta pantorrilla izquierda y derecha.',
  },
];

/** Owner values BodyLab's schema cannot store — reported, never faked. */const UNMAPPED = [
  { label: 'Altura', value: 176, unit: 'cm', reason: 'Es campo del perfil (height, en metros), no una medición: 1.76 m.' },
  { label: 'Abdomen templado', value: 78, unit: 'cm', reason: 'Solo hay un tipo de cintura; se guardó el abdomen libre (83 cm), que es el protocolo de la app.' },
  { label: 'Antebrazo', value: null, unit: 'cm', reason: 'El tipo existe (forearm / forearm_left / forearm_right) pero el dueño aún no lo ha medido.' },
  { label: 'Fecha de nacimiento', value: '2005-09-28', unit: '', reason: 'No es una medición: va al perfil como birthDate y BodyLab deriva la edad (21 años).' },
];

/** Medidas nuevas que YA existen en el esquema pero que él todavía no tomó. */
const AVAILABLE_UNMEASURED = [
  'stature_sitting', 'arm_span', 'subischial_leg_length', 'upper_arm_length',
  'forearm_length', 'hand_length', 'thigh_length', 'lower_leg_length',
  'biacromial', 'bi_iliac', 'wrist_breadth', 'elbow_breadth', 'knee_breadth',
  'malleolar_breadth', 'hand_width', 'mid_axillary', 'biceps_flexed',
  'forearm_flexed', 'ankle', 'forearm', 'forearm_left', 'forearm_right',
  'calf_left', 'calf_right', 'body_fat_percentage', 'resting_heart_rate',
];

/** Types the owner never gave but that the app uses for full scoring. */
const MISSING_TYPES = [
  { type: 'forearm_left', label: 'Antebrazo izquierdo' },
  { type: 'forearm_right', label: 'Antebrazo derecho' },
  { type: 'calf_left', label: 'Pantorrilla izquierda' },
  { type: 'calf_right', label: 'Pantorrilla derecha' },
  { type: 'body_fat_percentage', label: '% grasa corporal' },
  { type: 'resting_heart_rate', label: 'Frecuencia cardiaca en reposo' },
];

function uuidFrom(seed) {
  // Deterministic v4-shaped id: the file must be stable so a re-import does
  // not create duplicate rows.
  let h = 0x811c9dc5;
  for (const ch of seed) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hex = (n, len = 8) => (n >>> 0).toString(16).padStart(len, '0');
  let a = h, b = 0x9e3779b9;
  const next = () => {
    a = Math.imul(a ^ (a >>> 15), 0x2545f491) >>> 0;
    b = (Math.imul(b ^ (b >>> 13), 0x85ebca6b) ^ a) >>> 0;
    return hex(b);
  };
  return `${next()}-${next()}-4${next().slice(1)}-8${next().slice(1, 4)}-${next()}${next().slice(0, 4)}`;
}

const profileId = uuidFrom('bodylab-owner-profile');
const measuredAt = new Date().toISOString().slice(0, 10) + 'T12:00:00.000Z';

const measurements = [];
const problems = [];
for (const m of MAPPING) {
  const info = TYPES.get(m.type);
  if (!info) {
    problems.push(`Tipo desconocido en MEASUREMENT_TYPES: ${m.type}`);
    continue;
  }
  if (typeof m.value !== 'number' || !Number.isFinite(m.value)) {
    problems.push(`Valor no numérico para ${m.type}`);
    continue;
  }
  if (m.value < info.min || m.value > info.max) {
    problems.push(`Fuera de rango: ${m.type} = ${m.value} (permitido ${info.min}..${info.max})`);
    continue;
  }
  measurements.push({
    id: uuidFrom(`measurement:${m.type}`),
    profileId,
    type: m.type,
    value: m.value,
    unit: info.unit,
    timestamp: measuredAt,
    method: 'manual',
    confidence: 'high',
    ...(m.notes ? { notes: m.notes } : {}),
  });
}

const now = new Date().toISOString();
const profile = {
  id: profileId,
  name: OWNER.name,
  height: OWNER.heightCm / 100, // BodyLab stores metres
  weight: OWNER.weightKg,
  birthDate: OWNER.birthDate, // null → age is derived and the UI asks for it
  biologicalSex: OWNER.biologicalSex,
  units: 'metric',
  createdAt: now,
  updatedAt: now,
};

const payload = {
  format: 'bodylab',
  formatVersion: 1,
  appVersion: '1.0.0',
  exportedAt: now,
  data: { profile, measurements, snapshots: [] },
};

const outArg = process.argv.indexOf('--out');
const outPath = resolve(ROOT, outArg > -1 ? process.argv[outArg + 1] : '.cache/bodylab-owner.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

// A companion note that keeps the untouched source values (and the reasoning)
// next to the import file, so nothing the owner typed is ever lost.
const reportPath = outPath.replace(/\.json$/, '.mapping.json');
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: now,
      profileId,
      measuredAt,
      stored: MAPPING.map((m) => ({
        ownerLabel: m.label,
        type: m.type,
        value: m.value,
        unit: TYPES.get(m.type).unit,
        ...(m.derivedFrom ? { derivedFrom: m.derivedFrom } : {}),
      })),
      notStored: UNMAPPED,
      availableButUnmeasured: AVAILABLE_UNMEASURED,
      stillMissing: MISSING_TYPES,
      rawOwnerInput: OWNER.raw,
      validationProblems: problems,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Perfil: ${profile.name} · ${profile.height} m · ${profile.weight} kg · sexo ${profile.biologicalSex} · birthDate ${profile.birthDate ?? '(null)'}`);
console.log(`\nGuardadas ${measurements.length} mediciones:`);
for (const m of measurements) {
  console.log(`  ${m.type.padEnd(14)} ${String(m.value).padStart(6)} ${m.unit}`);
}
console.log(`\nSin equivalente en el esquema (${UNMAPPED.length}):`);
for (const u of UNMAPPED) {
  console.log(`  ${u.label.padEnd(18)} ${u.value ?? '—'} ${u.unit} — ${u.reason}`);
}
console.log(`\nTipos del modelo que el propietario no dio (${MISSING_TYPES.length}): ${MISSING_TYPES.map((t) => t.label).join(', ')}`);
console.log(`\nNuevos tipos ya disponibles, pendientes de medir (${AVAILABLE_UNMEASURED.length}).`);
if (problems.length) {
  console.log('\n⚠ Validación:');
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log(`\nImport file: ${outPath}`);
console.log(`Mapping note: ${reportPath}`);