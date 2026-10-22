/**
 * Measurement protocols — **where** the tape or the anthropometer goes.
 *
 * The owner asked for this on 2026-10-20, and the reason is specific: the app
 * already had a sentence per measurement ("cintura: a la altura del ombligo"),
 * but a sentence does not answer *«¿a qué altura exacta y en qué ángulo pongo la
 * cinta?»* — the problem is not knowing the landmark, it is seeing where the band
 * sits and how it lies. So every entry here carries:
 *
 *   1. a **diagram spec** (`diagram`), which `MeasurementProtocol.tsx` turns into
 *      an actual drawing of the body with the band or the segment in place;
 *   2. the **landmark** in words, the **orientation** of the instrument, the
 *      **posture** and whether the reading is taken on exhalation;
 *   3. the **errors** that move the number most (they are the difference between
 *      a measurement and a number);
 *   4. a **source**, so the protocol is checked, not remembered.
 *
 * **Provenance.** The protocol text comes from this repository's own reviewed
 * document, `docs/ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md` (§4.2 perimeters, §4.4
 * breadths, §4.5 lengths), which in turn cites ISAK's accreditation scheme for the
 * landmark structure (F1), Whyte & Gallagher 2022 for the caliper/tape technique
 * and its limits (F2), Hodgdon & Beckett 1984 for neck/waist/hip (F3) and Drillis
 * et al. for segment proportions (F5). Nothing here is invented: where the
 * document marks something as unverified, this module does not turn it into a
 * rule.
 *
 * Drawings are ours (SVG geometry) on purpose: no image licences to respect, no
 * assets to ship, and the band can be positioned from data.
 *
 * @module lib/measurement-protocols
 */

export interface Bilingual {
  en: string;
  es: string;
}

/** A point in the 100 × 240 figure viewBox (y grows down). */
export interface Point {
  x: number;
  y: number;
}

/**
 * Where to draw the instrument.
 *
 *   * `girth` — an ellipse around the body part (the tape closing on itself);
 *   * `breadth` — a segment between two bony points, with arrows (the caliper);
 *   * `length` — a segment along a limb or the trunk (the tape/ruler).
 */
export type DiagramKind = "girth" | "breadth" | "length";

export interface ProtocolDiagram {
  kind: DiagramKind;
  view: "front" | "side";
  /** `girth` only: centre and radii of the band, in viewBox units. */
  center?: Point;
  rx?: number;
  ry?: number;
  /** `breadth` / `length`: the segment the instrument spans. */
  from?: Point;
  to?: Point;
}

export interface MeasurementProtocol {
  /** Base id: `biceps_left` resolves through `biceps`. */
  id: string;
  label: Bilingual;
  diagram: ProtocolDiagram;
  /** The bony or soft point the instrument is placed against. */
  landmark: Bilingual;
  /** Which way the tape/caliper lies, and how tight. */
  orientation: Bilingual;
  posture: Bilingual;
  /** Only where the reading depends on breathing. */
  breathing?: Bilingual;
  /** The mistakes that actually move the number. */
  errors: Bilingual[];
  /** Short citation, as printed under the diagram. */
  source: string;
}

/** Standard conditions — the same for every measurement, stated once. */
export const STANDARD_CONDITIONS: Bilingual[] = [
  {
    en: "Morning, fasted, before training, same time as the last session. Circumferences drift during the day.",
    es: "Por la mañana, en ayunas, antes de entrenar y a la misma hora que la última vez. Los perímetros cambian a lo largo del día.",
  },
  {
    en: "Non-stretch tape (fibreglass/polyester). A cloth tape stretches and loses precision exactly at the waist.",
    es: "Cinta no extensible (fibra de vidrio/poliéster). Una cinta de tela se estira y pierde precisión justo en la cintura.",
  },
  {
    en: "Barefoot, minimal clothing, arms hanging relaxed, looking straight ahead.",
    es: "Descalzo, ropa mínima, brazos colgando relajados y mirada al frente.",
  },
  {
    en: "Two readings per site; if they differ by more than 1 cm, take a third and average.",
    es: "Dos lecturas por sitio; si difieren más de 1 cm, toma una tercera y promedia.",
  },
  {
    en: "Symmetric measurements go on the RIGHT unless there is a known injury — the app stores left and right separately.",
    es: "Las medidas simétricas se toman a la DERECHA salvo lesión conocida — la app guarda izquierda y derecha por separado.",
  },
];

/**
 * The grid the drawings use: a 100 × 240 front figure with the arms at the sides
 * and the legs together. Every coordinate below is in that space, so a band can
 * be placed on the torso, an arm or a calf without guessing.
 */
export const FIGURE = { width: 100, height: 240 } as const;

const SOURCE_ISAK = "ISAK — Accreditation scheme (landmark structure), F1";
const SOURCE_NAVY = "Hodgdon & Beckett 1984 (US Navy method), F3";
const SOURCE_DRILLIS =
  "Drillis, Contini & Bluestein 1966 (segment proportions), F5";

/**
 * Every circumference, breadth and length, in the order the form shows them.
 *
 * The `_left` / `_right` variants are not duplicated: `protocolFor()` resolves
 * them to their base entry and the screen adds the side to the label, so a new
 * bilateral pair cannot ship without a protocol.
 */
export const MEASUREMENT_PROTOCOLS: MeasurementProtocol[] = [
  // ── Perimeters: arm ───────────────────────────────────────────────────────
  {
    id: "wrist",
    label: { en: "Wrist", es: "Muñeca" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 20, y: 118 },
      rx: 5,
      ry: 4.5,
    },
    landmark: {
      en: "Just proximal to the styloid processes (the two little bumps on either side of the wrist), not on the hand.",
      es: "Justo por encima de las apófisis estiloides (los dos huesitos a cada lado de la muñeca), no sobre la mano.",
    },
    orientation: {
      en: "Band perpendicular to the forearm, touching the skin without compressing it.",
      es: "Cinta perpendicular al antebrazo, tocando la piel sin comprimirla.",
    },
    posture: {
      en: "Arm relaxed, palm facing forward.",
      es: "Brazo relajado, palma hacia delante.",
    },
    errors: [
      {
        en: "Pulling it tight: the wrist is bone and fat, so tension reads 0.5–1 cm less than it is.",
        es: "Apretarla: la muñeca es hueso y grasa, así que la tensión da 0,5–1 cm menos de lo que es.",
      },
      {
        en: "Measuring over the knuckles or the base of the thumb — a different landmark.",
        es: "Medir sobre los nudillos o la base del pulgar — otro punto distinto.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "biceps",
    label: { en: "Biceps", es: "Bíceps" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 21, y: 88 },
      rx: 6.5,
      ry: 8,
    },
    landmark: {
      en: "Midpoint between the acromion (top of the shoulder) and the elbow crease, marked with the arm hanging.",
      es: "Punto medio entre el acromion (arriba del hombro) y el pliegue del codo, marcado con el brazo colgando.",
    },
    orientation: {
      en: "Band horizontal, perpendicular to the arm, on the mark you made.",
      es: "Cinta horizontal, perpendicular al brazo, sobre la marca que hiciste.",
    },
    posture: {
      en: "Arm relaxed at the side.",
      es: "Brazo relajado al costado.",
    },
    errors: [
      {
        en: "Measuring the flexed arm here: that is `biceps_flexed`, a different number.",
        es: "Medir el brazo contraído aquí: eso es `biceps_flexed`, otro número.",
      },
      {
        en: "Letting the band slip down toward the elbow — re-mark the midpoint every session.",
        es: "Dejar que la cinta baje hacia el codo — vuelve a marcar el punto medio en cada sesión.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "biceps_flexed",
    label: { en: "Biceps flexed", es: "Bíceps contraído" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 22, y: 86 },
      rx: 7.5,
      ry: 9,
    },
    landmark: {
      en: "The peak of the contracted biceps.",
      es: "El pico del bíceps contraído.",
    },
    orientation: {
      en: "Band horizontal at the peak, whole band in contact with the skin.",
      es: "Cinta horizontal en el pico, toda la cinta en contacto con la piel.",
    },
    posture: {
      en: "Elbow at 90°, forearm supinated, maximal voluntary contraction held.",
      es: "Codo a 90°, antebrazo supinado y contracción máxima mantenida.",
    },
    errors: [
      {
        en: "Flexing the shoulder or twisting the torso to raise the number.",
        es: "Flexionar el hombro o girar el tronco para subir el número.",
      },
      {
        en: "A different contraction each time — use the same effort and the same elbow angle.",
        es: "Una contracción distinta cada vez — usa el mismo esfuerzo y el mismo ángulo de codo.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "forearm",
    label: { en: "Forearm", es: "Antebrazo" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 20, y: 104 },
      rx: 5.5,
      ry: 6,
    },
    landmark: {
      en: "Maximum girth of the forearm, usually a hand-width below the elbow.",
      es: "Perímetro máximo del antebrazo, normalmente un palmo por debajo del codo.",
    },
    orientation: {
      en: "Band perpendicular to the forearm axis, not tilted.",
      es: "Cinta perpendicular al eje del antebrazo, sin inclinarse.",
    },
    posture: {
      en: "Arm relaxed, forearm supinated.",
      es: "Brazo relajado, antebrazo supinado.",
    },
    errors: [
      {
        en: "Measuring the flexed forearm: that is `forearm_flexed`.",
        es: "Medir el antebrazo contraído: eso es `forearm_flexed`.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "forearm_flexed",
    label: { en: "Forearm flexed", es: "Antebrazo contraído" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 20, y: 102 },
      rx: 6,
      ry: 6.5,
    },
    landmark: {
      en: "Maximum girth with the fist clenched.",
      es: "Perímetro máximo con el puño cerrado.",
    },
    orientation: {
      en: "Band perpendicular to the axis, at the widest point.",
      es: "Cinta perpendicular al eje, en el punto más ancho.",
    },
    posture: {
      en: "Elbow at 90°, fist closed, forearm supinated.",
      es: "Codo a 90°, puño cerrado, antebrazo supinado.",
    },
    errors: [
      {
        en: "Measuring mid-forearm instead of at the widest point, where the muscles are.",
        es: "Medir a media altura en vez de en el punto más ancho, donde están los músculos.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "triceps",
    label: { en: "Triceps", es: "Tríceps" },
    diagram: {
      kind: "girth",
      view: "side",
      center: { x: 58, y: 88 },
      rx: 5.5,
      ry: 7,
    },
    landmark: {
      en: "Same midpoint as the biceps, on the back of the arm.",
      es: "El mismo punto medio que el bíceps, en la parte de atrás del brazo.",
    },
    orientation: {
      en: "Band horizontal, perpendicular to the arm.",
      es: "Cinta horizontal, perpendicular al brazo.",
    },
    posture: {
      en: "Arm relaxed, elbow straight.",
      es: "Brazo relajado, codo estirado.",
    },
    errors: [
      {
        en: "Bending the elbow to make the muscle stand out: the tape then crosses the joint.",
        es: "Flexionar el codo para marcar el músculo: la cinta acaba cruzando la articulación.",
      },
    ],
    source: SOURCE_ISAK,
  },

  // ── Perimeters: trunk ─────────────────────────────────────────────────────
  {
    id: "neck",
    label: { en: "Neck", es: "Cuello" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 50, y: 42 },
      rx: 8,
      ry: 5,
    },
    landmark: {
      en: "Just below the larynx (the notch at the front of the throat).",
      es: "Justo por debajo de la laringe (la muesca delantera de la garganta).",
    },
    orientation: {
      en: "Band slightly lower at the front than at the back, parallel to the floor. No tightening.",
      es: "Cinta un poco más baja delante que detrás, paralela al suelo. Sin apretar.",
    },
    posture: {
      en: "Standing, head level, shoulders down.",
      es: "De pie, cabeza nivelada, hombros bajos.",
    },
    errors: [
      {
        en: "Measuring over the larynx itself.",
        es: "Medir sobre la propia laringe.",
      },
      {
        en: "Sinking the chin to the chest.",
        es: "Bajar la barbilla hacia el pecho.",
      },
    ],
    source: SOURCE_NAVY,
  },
  {
    id: "chest",
    label: { en: "Chest", es: "Pecho" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 50, y: 68 },
      rx: 22,
      ry: 9,
    },
    landmark: {
      en: "At the level of the nipples, band passing under the arms and over the shoulder blades.",
      es: "A la altura de los pezones, con la cinta bajo las axilas y sobre los omóplatos.",
    },
    orientation: {
      en: "Horizontal all round; check the back in a mirror.",
      es: "Horizontal por delante y por detrás; compruébalo en un espejo.",
    },
    posture: {
      en: "Arms relaxed at the sides, chest at normal end-expiration.",
      es: "Brazos relajados al costado, pecho al final de una exhalación normal.",
    },
    breathing: {
      en: "End of a normal exhale.",
      es: "Al final de una exhalación normal.",
    },
    errors: [
      {
        en: "Puffing the chest out or holding the breath.",
        es: "Sacar pecho o aguantar el aire.",
      },
      {
        en: "Letting the band ride up on the back.",
        es: "Dejar que la cinta suba por la espalda.",
      },
    ],
    source: SOURCE_NAVY,
  },
  {
    id: "mid_axillary",
    label: { en: "Mid-axillary", es: "Torso en axilas" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 50, y: 74 },
      rx: 19,
      ry: 7,
    },
    landmark: {
      en: "At the level of the armpits, on a midpoint between the nipple line and the bottom of the ribs.",
      es: "A la altura de las axilas, entre la línea del pezón y la parte baja de las costillas.",
    },
    orientation: {
      en: "Horizontal, band in contact with the skin all the way round.",
      es: "Horizontal y en contacto con la piel en todo el contorno.",
    },
    posture: { en: "Arms down, relaxed.", es: "Brazos abajo, relajados." },
    errors: [
      {
        en: "Measuring at the very top of the armpit — it is one hand-width lower.",
        es: "Medir en lo más alto de la axila — va un palmo más abajo.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "waist",
    label: { en: "Waist", es: "Cintura" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 50, y: 96 },
      rx: 17,
      ry: 7,
    },
    landmark: {
      en: "Men: at the navel. Women: at the narrowest point of the torso.",
      es: "Hombres: a la altura del ombligo. Mujeres: en el punto más estrecho del torso.",
    },
    orientation: {
      en: "Horizontal, band on the skin, snug but not compressing.",
      es: "Horizontal, sobre la piel, ajustada sin comprimir.",
    },
    posture: {
      en: "Standing, abdomen relaxed, arms slightly out, at normal end-expiration.",
      es: "De pie, abdomen relajado, brazos un poco separados, al final de una exhalación normal.",
    },
    breathing: {
      en: "End of a normal exhale; never pull it in.",
      es: "Al final de una exhalación normal; nunca metas la barriga.",
    },
    errors: [
      {
        en: "Sucking the belly in — this is the number that feeds WHtR.",
        es: "Meter la barriga — este es el número que alimenta el WHtR.",
      },
      {
        en: "Measuring over the trousers or a belt.",
        es: "Medir sobre el pantalón o el cinturón.",
      },
      {
        en: "Changing between navel and narrowest point from one session to the next.",
        es: "Alternar entre ombligo y punto más estrecho de una sesión a otra.",
      },
    ],
    source: SOURCE_NAVY,
  },
  {
    id: "hips",
    label: { en: "Hips", es: "Cadera" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 50, y: 128 },
      rx: 19,
      ry: 8,
    },
    landmark: {
      en: "The widest point of the hips/glutes, feet together.",
      es: "El punto más ancho de caderas/glúteos, con los pies juntos.",
    },
    orientation: {
      en: "Horizontal all round; check the sides in a mirror.",
      es: "Horizontal en todo el contorno; mira los laterales en un espejo.",
    },
    posture: {
      en: "Standing, feet together, weight even.",
      es: "De pie, pies juntos, peso repartido.",
    },
    errors: [
      {
        en: "Measuring over the buttock crease (that is a hip, not the maximum).",
        es: "Medir sobre el pliegue del glúteo (eso es cadera baja, no el máximo).",
      },
      {
        en: "Tilting the band down at the back.",
        es: "Inclinar la cinta hacia abajo por detrás.",
      },
    ],
    source: SOURCE_NAVY,
  },
  {
    id: "hip_upper",
    label: { en: "High hip", es: "Cadera alta" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 50, y: 116 },
      rx: 17,
      ry: 6,
    },
    landmark: {
      en: "Where the hip bone starts: just above the greater trochanter, at the line where underwear usually sits.",
      es: "Donde empieza el hueso de la cadera: justo por encima del trocánter, donde suele caer la ropa interior.",
    },
    orientation: {
      en: "Horizontal, above the widest part.",
      es: "Horizontal, por encima de la parte más ancha.",
    },
    posture: { en: "Standing, relaxed.", es: "De pie, relajado." },
    errors: [
      {
        en: "Confusing it with `hips` — this one is higher and narrower.",
        es: "Confundirla con `hips` — esta es más alta y más estrecha.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "shoulders",
    label: { en: "Shoulders", es: "Hombros" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 26, y: 58 },
      to: { x: 74, y: 58 },
    },
    landmark: {
      en: "The bony tips of the shoulders (acromia), one on each side.",
      es: "Las puntas óseas de los hombros (acromios), una a cada lado.",
    },
    orientation: {
      en: "This is a BREADTH, not a circumference: the tape runs straight from tip to tip in front of the chest.",
      es: "Esto es una ANCHURA, no un perímetro: la cinta va en línea recta de punta a punta, por delante del pecho.",
    },
    posture: {
      en: "Standing, arms down, shoulders relaxed.",
      es: "De pie, brazos abajo, hombros relajados.",
    },
    errors: [
      {
        en: "Measuring around the body and calling it shoulder width.",
        es: "Rodear el cuerpo y llamarlo anchura de hombros.",
      },
      {
        en: "Letting the arms hang forward and rolling the shoulders in.",
        es: "Dejar los brazos caer hacia delante y cerrar los hombros.",
      },
    ],
    source: SOURCE_ISAK,
  },

  // ── Perimeters: leg ───────────────────────────────────────────────────────
  {
    id: "thigh",
    label: { en: "Thigh", es: "Muslo" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 41, y: 150 },
      rx: 11,
      ry: 9,
    },
    landmark: {
      en: "Midpoint between the trochanter and the kneecap — not between hip and knee.",
      es: "Punto medio entre el trocánter y la rótula — no entre cadera y rodilla.",
    },
    orientation: {
      en: "Band perpendicular to the thigh, weight on the other leg.",
      es: "Cinta perpendicular al muslo, con el peso en la otra pierna.",
    },
    posture: {
      en: "Standing, measured leg relaxed.",
      es: "De pie, con la pierna medida relajada.",
    },
    errors: [
      {
        en: "Measuring both thighs with different marks: use the same midpoint every time.",
        es: "Medir cada muslo con una marca distinta: usa siempre el mismo punto medio.",
      },
      {
        en: "Measuring with the muscle flexed.",
        es: "Medir con el músculo contraído.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "calf",
    label: { en: "Calf", es: "Pantorrilla" },
    diagram: {
      kind: "girth",
      view: "side",
      center: { x: 44, y: 200 },
      rx: 7,
      ry: 9,
    },
    landmark: {
      en: "The maximum girth of the calf.",
      es: "El perímetro máximo de la pantorrilla.",
    },
    orientation: {
      en: "Band perpendicular to the shin, at the widest point.",
      es: "Cinta perpendicular a la tibia, en el punto más ancho.",
    },
    posture: {
      en: "Standing on tiptoe (or seated with the foot plantarflexed).",
      es: "De pie de puntillas (o sentado con el pie en flexión plantar).",
    },
    errors: [
      {
        en: "Measuring flat-footed in one session and on tiptoe in another.",
        es: "Medir con el pie plano una vez y de puntillas otra.",
      },
      {
        en: "Letting the band slide toward the ankle.",
        es: "Dejar que la cinta resbale hacia el tobillo.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "ankle",
    label: { en: "Ankle", es: "Tobillo" },
    diagram: {
      kind: "girth",
      view: "front",
      center: { x: 41, y: 222 },
      rx: 4.5,
      ry: 4,
    },
    landmark: {
      en: "Narrowest point above the malleoli.",
      es: "El punto más estrecho por encima de los maléolos.",
    },
    orientation: {
      en: "Band perpendicular to the shin, no compression.",
      es: "Cinta perpendicular a la tibia, sin comprimir.",
    },
    posture: { en: "Standing, foot flat.", es: "De pie, pie plano." },
    errors: [
      {
        en: "Measuring over the malleoli themselves.",
        es: "Medir sobre los propios maléolos.",
      },
    ],
    source: SOURCE_ISAK,
  },

  // ── Bone breadths ─────────────────────────────────────────────────────────
  {
    id: "biacromial",
    label: { en: "Shoulder breadth", es: "Anchura de hombros" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 26, y: 58 },
      to: { x: 74, y: 58 },
    },
    landmark: {
      en: "The acromia: the bony tip at the top and outside of each shoulder.",
      es: "Los acromios: la punta ósea en lo alto y por fuera de cada hombro.",
    },
    orientation: {
      en: "Anthropometer (or two books and a ruler) applied to both tips at once, straight across the back.",
      es: "Antropómetro (o dos libros y una regla) apoyado en ambas puntas a la vez, en línea recta por detrás.",
    },
    posture: {
      en: "Standing, arms down, shoulders relaxed.",
      es: "De pie, brazos abajo, hombros relajados.",
    },
    errors: [
      {
        en: "Measuring the deltoids instead of the bone — the value then grows with muscle.",
        es: "Medir los deltoides en vez del hueso — el valor crece entonces con el músculo.",
      },
      {
        en: "Pressing the arms outward.",
        es: "Presionar los brazos hacia fuera.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "bi_iliac",
    label: { en: "Hip breadth (iliac crest)", es: "Anchura de cadera" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 34, y: 118 },
      to: { x: 66, y: 118 },
    },
    landmark: {
      en: "The outermost points of the two iliac crests (the top edge of the hip bones, felt with the flat of the hand).",
      es: "Los puntos más externos de las dos crestas ilíacas (el borde superior del hueso, palpado con el canto de la mano).",
    },
    orientation: {
      en: "Anthropometer straight across, at the level of the crests.",
      es: "Antropómetro en línea recta, a la altura de las crestas.",
    },
    posture: { en: "Standing, weight even.", es: "De pie, peso repartido." },
    errors: [
      {
        en: "Measuring at the widest point of the buttocks — that is soft tissue, a different number.",
        es: "Medir en el punto más ancho de los glúteos — eso es tejido blando, otro número.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "wrist_breadth",
    label: { en: "Wrist breadth", es: "Anchura de muñeca" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 15, y: 118 },
      to: { x: 25, y: 118 },
    },
    landmark: {
      en: "Across the styloid processes, side to side (not front to back).",
      es: "Entre las apófisis estiloides, de lado a lado (no de delante a atrás).",
    },
    orientation: {
      en: "Caliper or anthropometer on both bumps, forearm horizontal.",
      es: "Calibre o antropómetro sobre los dos huesitos, antebrazo horizontal.",
    },
    posture: {
      en: "Forearm horizontal, hand relaxed.",
      es: "Antebrazo horizontal, mano relajada.",
    },
    errors: [
      {
        en: "Measuring the anteroposterior depth instead of the width.",
        es: "Medir la profundidad anteroposterior en vez de la anchura.",
      },
      {
        en: "Squeezing the caliper: it must only touch the skin.",
        es: "Apretar el calibre: solo debe tocar la piel.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "elbow_breadth",
    label: { en: "Elbow breadth", es: "Anchura de codo" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 14, y: 98 },
      to: { x: 26, y: 98 },
    },
    landmark: {
      en: "Between the two epicondyles of the humerus, with the elbow bent 90°.",
      es: "Entre los dos epicóndilos del húmero, con el codo a 90°.",
    },
    orientation: {
      en: "Caliper on both epicondyles, pressing slightly (bone, not fat).",
      es: "Calibre sobre ambos epicóndilos, presionando ligeramente (hueso, no grasa).",
    },
    posture: {
      en: "Elbow at 90°, forearm forward.",
      es: "Codo a 90°, antebrazo hacia delante.",
    },
    errors: [
      {
        en: "Measuring with the arm straight, where the landmarks move.",
        es: "Medir con el brazo estirado, donde los puntos se mueven.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "knee_breadth",
    label: { en: "Knee breadth", es: "Anchura de rodilla" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 34, y: 172 },
      to: { x: 46, y: 172 },
    },
    landmark: {
      en: "Between the medial and lateral femoral condyles, knee bent 90°.",
      es: "Entre los cóndilos medial y lateral del fémur, con la rodilla a 90°.",
    },
    orientation: {
      en: "Caliper on both sides of the knee, straight across.",
      es: "Calibre a ambos lados de la rodilla, en línea recta.",
    },
    posture: {
      en: "Seated, knee at 90°, foot flat.",
      es: "Sentado, rodilla a 90°, pie apoyado.",
    },
    errors: [
      {
        en: "Measuring the kneecap from front to back.",
        es: "Medir la rótula de delante a atrás.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "malleolar_breadth",
    label: { en: "Ankle breadth", es: "Anchura de tobillo" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 36, y: 224 },
      to: { x: 46, y: 224 },
    },
    landmark: {
      en: "Between the inner and outer malleoli.",
      es: "Entre el maléolo interno y el externo.",
    },
    orientation: {
      en: "Caliper across both, foot at 90°.",
      es: "Calibre sobre ambos, pie a 90°.",
    },
    posture: {
      en: "Seated or standing with the foot flat.",
      es: "Sentado o de pie con el pie plano.",
    },
    errors: [
      {
        en: "Measuring with the foot pointed.",
        es: "Medir con el pie en punta.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "hand_width",
    label: { en: "Hand width", es: "Anchura de la mano" },
    diagram: {
      kind: "breadth",
      view: "front",
      from: { x: 36, y: 132 },
      to: { x: 48, y: 132 },
    },
    landmark: {
      en: "Across the knuckles (metacarpophalangeal joints), fingers straight and together.",
      es: "Sobre los nudillos (articulaciones metacarpofalángicas), dedos estirados y juntos.",
    },
    orientation: {
      en: "Ruler or caliper across the knuckles, hand flat.",
      es: "Regla o calibre sobre los nudillos, mano plana.",
    },
    posture: {
      en: "Palm down on a table.",
      es: "Palma hacia abajo sobre la mesa.",
    },
    errors: [
      {
        en: "Measuring the widest part of the thumb.",
        es: "Medir la parte más ancha del pulgar.",
      },
    ],
    source: SOURCE_DRILLIS,
  },

  // ── Segment lengths (the model without a scanner) ──────────────────────────
  {
    id: "arm_span",
    label: { en: "Arm span", es: "Envergadura" },
    diagram: {
      kind: "length",
      view: "front",
      from: { x: 6, y: 62 },
      to: { x: 94, y: 62 },
    },
    landmark: {
      en: "Fingertip to fingertip, arms out horizontally against a wall.",
      es: "De punta de dedo a punta de dedo, con los brazos en cruz contra una pared.",
    },
    orientation: {
      en: "Measure the distance between the two fingertips at the same height.",
      es: "Mide la distancia entre las dos puntas de los dedos a la misma altura.",
    },
    posture: {
      en: "Standing, arms horizontal, palms forward, back against the wall.",
      es: "De pie, brazos horizontales, palmas al frente y espalda contra la pared.",
    },
    errors: [
      {
        en: "One arm higher than the other — the span then under-reads.",
        es: "Un brazo más alto que el otro — la envergadura sale corta.",
      },
      {
        en: "Not touching the wall with the shoulder blades.",
        es: "No apoyar los omóplatos en la pared.",
      },
    ],
    source: SOURCE_DRILLIS,
  },
  {
    id: "stature_sitting",
    label: { en: "Sitting height", es: "Estatura sentado" },
    diagram: {
      kind: "length",
      view: "side",
      from: { x: 48, y: 150 },
      to: { x: 48, y: 30 },
    },
    landmark: {
      en: "From the sitting surface to the top of the head, back straight against a wall.",
      es: "Desde el asiento hasta lo alto de la cabeza, con la espalda recta contra la pared.",
    },
    orientation: {
      en: "A book on the head and the tape to the seat.",
      es: "Un libro sobre la cabeza y la cinta hasta el asiento.",
    },
    posture: {
      en: "Seated on a fixed-height bench, hips and knees at 90°.",
      es: "Sentado en un banco de altura fija, caderas y rodillas a 90°.",
    },
    errors: [
      {
        en: "Slouching — the value drops 2–4 cm.",
        es: "Encorvarse — el valor baja 2–4 cm.",
      },
      {
        en: "A different chair than last time.",
        es: "Una silla distinta que la última vez.",
      },
    ],
    source: SOURCE_ISAK,
  },
  {
    id: "subischial_leg_length",
    label: { en: "Leg length (sacrotrochanteric)", es: "Longitud de pierna" },
    diagram: {
      kind: "length",
      view: "side",
      from: { x: 50, y: 128 },
      to: { x: 50, y: 234 },
    },
    landmark: {
      en: "From the ischial tuberosity (sitting bone) to the floor.",
      es: "Desde la tuberosidad isquiática (el hueso al que te sientas) hasta el suelo.",
    },
    orientation: {
      en: "Seated, measure the vertical distance to the floor.",
      es: "Sentado, mide la distancia vertical al suelo.",
    },
    posture: {
      en: "Seated, back straight, thighs horizontal.",
      es: "Sentado, espalda recta, muslos horizontales.",
    },
    errors: [
      {
        en: "Measuring from the iliac crest, which is not the same point.",
        es: "Medir desde la cresta ilíaca, que no es el mismo punto.",
      },
    ],
    source: SOURCE_DRILLIS,
  },
  {
    id: "upper_arm_length",
    label: { en: "Upper arm length", es: "Longitud del brazo" },
    diagram: {
      kind: "length",
      view: "front",
      from: { x: 26, y: 60 },
      to: { x: 25, y: 98 },
    },
    landmark: {
      en: "From the acromion to the head of the radius (the elbow).",
      es: "Desde el acromion hasta la cabeza del radio (el codo).",
    },
    orientation: {
      en: "Tape along the arm; mark both points first.",
      es: "Cinta a lo largo del brazo; marca antes los dos puntos.",
    },
    posture: { en: "Arm hanging relaxed.", es: "Brazo colgando relajado." },
    errors: [
      {
        en: "Following the curve of the arm instead of the straight line.",
        es: "Seguir la curva del brazo en vez de la línea recta.",
      },
    ],
    source: SOURCE_DRILLIS,
  },
  {
    id: "forearm_length",
    label: { en: "Forearm length", es: "Longitud del antebrazo" },
    diagram: {
      kind: "length",
      view: "front",
      from: { x: 25, y: 100 },
      to: { x: 22, y: 128 },
    },
    landmark: {
      en: "From the radial head to the styloid process of the radius.",
      es: "Desde la cabeza del radio hasta la apófisis estiloides del radio.",
    },
    orientation: {
      en: "Straight line along the forearm.",
      es: "Línea recta a lo largo del antebrazo.",
    },
    posture: {
      en: "Forearm supinated, elbow at 90°.",
      es: "Antebrazo supinado, codo a 90°.",
    },
    errors: [
      {
        en: "Measuring to the fingertips instead of the wrist.",
        es: "Medir hasta los dedos en vez de hasta la muñeca.",
      },
    ],
    source: SOURCE_DRILLIS,
  },
  {
    id: "hand_length",
    label: { en: "Hand length", es: "Longitud de la mano" },
    diagram: {
      kind: "length",
      view: "front",
      from: { x: 22, y: 130 },
      to: { x: 22, y: 152 },
    },
    landmark: {
      en: "From the wrist crease to the tip of the middle finger.",
      es: "Desde el pliegue de la muñeca hasta la punta del dedo corazón.",
    },
    orientation: {
      en: "Straight line, palm down.",
      es: "Línea recta, palma hacia abajo.",
    },
    posture: {
      en: "Hand flat on the table, fingers together.",
      es: "Mano plana sobre la mesa, dedos juntos.",
    },
    errors: [
      {
        en: "Starting at the knuckles rather than the wrist crease.",
        es: "Empezar en los nudillos en vez de en el pliegue de la muñeca.",
      },
    ],
    source: SOURCE_DRILLIS,
  },
  {
    id: "thigh_length",
    label: { en: "Thigh length", es: "Longitud del muslo" },
    diagram: {
      kind: "length",
      view: "front",
      from: { x: 41, y: 126 },
      to: { x: 41, y: 174 },
    },
    landmark: {
      en: "From the greater trochanter to the lateral knee joint line.",
      es: "Desde el trocánter mayor hasta la línea articular lateral de la rodilla.",
    },
    orientation: {
      en: "Tape along the outside of the thigh.",
      es: "Cinta por el lateral del muslo.",
    },
    posture: {
      en: "Standing, weight on the other leg.",
      es: "De pie, con el peso en la otra pierna.",
    },
    errors: [
      {
        en: "Measuring to the kneecap instead of the joint line.",
        es: "Medir hasta la rótula en vez de hasta la línea articular.",
      },
    ],
    source: SOURCE_DRILLIS,
  },
  {
    id: "lower_leg_length",
    label: { en: "Lower leg length", es: "Longitud de la pierna baja" },
    diagram: {
      kind: "length",
      view: "front",
      from: { x: 41, y: 176 },
      to: { x: 41, y: 232 },
    },
    landmark: {
      en: "From the knee joint line to the lateral malleolus.",
      es: "Desde la línea articular de la rodilla hasta el maléolo externo.",
    },
    orientation: {
      en: "Tape along the outside of the shin.",
      es: "Cinta por el lateral de la tibia.",
    },
    posture: {
      en: "Standing, weight on the other leg.",
      es: "De pie, con el peso en la otra pierna.",
    },
    errors: [{ en: "Measuring to the floor.", es: "Medir hasta el suelo." }],
    source: SOURCE_DRILLIS,
  },
  {
    id: "foot_length",
    label: { en: "Foot length", es: "Longitud del pie" },
    diagram: {
      kind: "length",
      view: "side",
      from: { x: 42, y: 236 },
      to: { x: 58, y: 236 },
    },
    landmark: {
      en: "From the back of the heel to the tip of the longest toe.",
      es: "Desde el talón hasta la punta del dedo más largo.",
    },
    orientation: {
      en: "Against a wall: heel touching, tape to the toe.",
      es: "Contra una pared: talón apoyado y cinta hasta el dedo.",
    },
    posture: {
      en: "Standing, weight on that foot.",
      es: "De pie, con el peso en ese pie.",
    },
    errors: [
      {
        en: "Measuring a shoe, or not loading the foot.",
        es: "Medir un zapato, o sin cargar el pie.",
      },
    ],
    source: SOURCE_DRILLIS,
  },
];

/** `biceps_left` → `biceps`. A bilateral pair is one protocol, two sides. */
export function baseMeasurementId(id: string): string {
  return id.replace(/_(left|right)$/, "");
}

/** The protocol for a measurement id, or `null` when this app has none yet. */
export function protocolFor(id: string): MeasurementProtocol | null {
  const base = baseMeasurementId(id);
  return MEASUREMENT_PROTOCOLS.find((entry) => entry.id === base) ?? null;
}

/** Whether a given id is bilateral (so the screen can print the side). */
export function sideOf(id: string): "left" | "right" | null {
  if (id.endsWith("_left")) return "left";
  if (id.endsWith("_right")) return "right";
  return null;
}
