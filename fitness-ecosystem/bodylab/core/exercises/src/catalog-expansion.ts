/**
 * Exercise catalog — expansion set (94 → 144).
 *
 * Why a second file instead of growing `catalog.ts` and `catalog-additions.ts`
 * further: those two hold the *classic* gym catalog. This one exists to close the
 * gaps that actually block a plan, and every group here answers a question the
 * planner was losing sleep over:
 *
 *   - **Home pushing and pulling.** The reference inventory (pull-up bar, dip
 *     bars, adjustable dumbbells, bands, bike) had exactly one horizontal press
 *     and no way to load a pull vertically without a bar. A home user now has a
 *     graded press ladder (floor press → deficit → decline → archer) and a band
 *     pulldown.
 *   - **An assisted pull-up.** The single most requested progression: a band plus
 *     the bar turns "I can't do one" into a trainable movement.
 *   - **Unilateral legs.** Split squats, reverse and walking lunges, pistol and
 *     single-leg bridge — the patterns that expose and fix asymmetries, which is
 *     the whole point of measuring left and right in BodyLab.
 *   - **Genuine free conditioning.** Shadow boxing and bodyweight Tabata need no
 *     equipment at all, and steady jump-rope / stair work balances the interval
 *     entries that already existed.
 *   - **Two honesty fixes on movements that were missing**: the glute bridge (hip
 *     extension without a bench or barbell) and the sissy squat (the only real
 *     quad-isolation movement that needs nothing).
 *
 * Written in the same shape as the rest of the catalog: bilingual copy, muscle
 * intensities (1 synergist · 2 secondary · 3 primary), and a hand-written traits
 * entry in `./traits-expansion` (the test suite refuses fallbacks).
 *
 * @module catalog-expansion
 */

import type { Exercise } from "./catalog";

// ============================================================================
// PUSH — home chest ladders and shoulders
// ============================================================================

export const EXPANSION_PUSH_EXERCISES: Exercise[] = [
  {
    id: "dumbbell-floor-press",
    name: { en: "Dumbbell Floor Press", es: "Press en Suelo con Mancuernas" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Lying on the floor, lower the dumbbells until the upper arms touch down, then press up",
      es: "Tumbado en el suelo, baja las mancuernas hasta que los brazos toquen el suelo y empuja",
    },
    hypertrophyNote: {
      en: "The floor is the depth stop: it keeps the raise to the elbow and spares the shoulder",
      es: "El suelo es el tope: limita el recorrido al codo y cuida el hombro",
    },
  },
  {
    id: "deficit-push-up",
    name: { en: "Deficit Push-Up", es: "Flexión con Déficit" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
    ],
    equipment: { en: "Bodyweight + books/blocks", es: "Peso corporal + libros/bloques" },
    description: {
      en: "Hands on raised books or blocks so the chest sinks below the hands at the bottom",
      es: "Manos sobre libros o bloques para que el pecho baje por debajo de las manos",
    },
    hypertrophyNote: {
      en: "Buys the full range a floor push-up cannot give, which is where the chest grows",
      es: "Recupera el rango completo que la flexión normal no da, que es donde crece el pecho",
    },
  },
  {
    id: "decline-push-up",
    name: { en: "Decline Push-Up", es: "Flexión Declinada" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "serratus_anterior", intensity: 1 },
    ],
    equipment: { en: "Bodyweight (feet elevated)", es: "Peso corporal (pies elevados)" },
    description: {
      en: "Feet on a chair or box, hands on the floor — the higher the feet, the more shoulder",
      es: "Pies en una silla o cajón, manos en el suelo — cuanto más altos, más hombro",
    },
    hypertrophyNote: {
      en: "The upper-chest answer when there is no incline bench",
      es: "La respuesta para pecho superior cuando no hay banco inclinado",
    },
  },
  {
    id: "pseudo-planche-push-up",
    name: { en: "Pseudo Planche Push-Up", es: "Flexión Pseudo Plancha" },
    category: "bodyweight",
    difficulty: 5,
    hypertrophy: 4,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "serratus_anterior", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Hands at hip level, lean forward until the shoulders pass the wrists, then press",
      es: "Manos a la altura de la cadera, inclínate hasta que los hombros pasen las muñecas",
    },
    hypertrophyNote: {
      en: "Turns a push-up into a front-delt movement by shifting the lever, not the load",
      es: "Convierte la flexión en trabajo de deltoides anterior moviendo la palanca, no el peso",
    },
  },
  {
    id: "archer-push-up",
    name: { en: "Archer Push-Up", es: "Flexión Arquero" },
    category: "bodyweight",
    difficulty: 4,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "triceps_medial", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 2 },
      { muscle: "obliques", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "One arm bends under the chest while the other stays straight out to the side",
      es: "Un brazo se flexiona bajo el pecho mientras el otro queda estirado al lado",
    },
    hypertrophyNote: {
      en: "The unilateral push-up: it does for pressing what the split squat does for legs",
      es: "La flexión unilateral: para el empuje lo que la sentadilla búlgara para las piernas",
    },
  },
  {
    id: "dumbbell-squeeze-press",
    name: { en: "Dumbbell Squeeze Press", es: "Press de Apretón con Mancuernas" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "chest_upper", intensity: 2 },
      { muscle: "triceps_medial", intensity: 2 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Press the dumbbells together hard for the whole set — the inward squeeze is the point",
      es: "Aprieta las mancuernas una contra otra durante toda la serie — el apretón es el ejercicio",
    },
    hypertrophyNote: {
      en: "Adds an adduction stimulus the bench cannot give, with the same dumbbells",
      es: "Añade el estímulo de aducción que el press banca no da, con las mismas mancuernas",
    },
  },
  {
    id: "seated-dumbbell-press",
    name: { en: "Seated Dumbbell Press", es: "Press de Hombro Sentado" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "lateral_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "traps_upper", intensity: 1 },
    ],
    equipment: { en: "Dumbbells + Bench", es: "Mancuernas + Banco" },
    description: {
      en: "Seated with the back supported at a slight incline, press up without arching",
      es: "Sentado con la espalda apoyada en ligera inclinación, empuja sin arquear",
    },
    hypertrophyNote: {
      en: "The backrest removes the standing balance work so the delts take the set",
      es: "El respaldo quita el trabajo de equilibrio y deja la serie en los deltoides",
    },
  },
  {
    id: "dumbbell-front-raise",
    name: { en: "Dumbbell Front Raise", es: "Elevación Frontal con Mancuernas" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "pectoralis_minor", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Raise to shoulder height with a slight elbow bend, no swing, lower over two seconds",
      es: "Sube a la altura del hombro con el codo algo flexionado, sin balanceo, baja en dos segundos",
    },
    hypertrophyNote: {
      en: "Small movement, easy to overdo: if the front delt volume is already high, it is optional",
      es: "Movimiento pequeño y fácil de sobrecargar: si ya hay mucho volumen anterior, es opcional",
    },
  },
  {
    id: "dumbbell-upright-row",
    name: { en: "Dumbbell Upright Row", es: "Remo al Mentón con Mancuernas" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "lateral_deltoid", intensity: 3 },
      { muscle: "traps_upper", intensity: 3 },
      { muscle: "biceps_short", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Pull to chest height with the elbows leading; stop the moment the shoulder complains",
      es: "Tira a la altura del pecho guiando con los codos; detente en cuanto el hombro proteste",
    },
    hypertrophyNote: {
      en: "Effective for side delts and traps, and the most impingement-prone row there is",
      es: "Eficaz para deltoides lateral y trapecio, y el remo con más riesgo de pinzamiento",
    },
  },
  {
    id: "band-overhead-press",
    name: { en: "Band Overhead Press", es: "Press sobre la Cabeza con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "lateral_deltoid", intensity: 1 },
    ],
    equipment: { en: "Resistance Bands", es: "Bandas elásticas" },
    description: {
      en: "Stand on the band and press overhead; tension rises through the range, which is the point",
      es: "Pisa la banda y empuja arriba; la tensión crece con el recorrido, y esa es la gracia",
    },
    hypertrophyNote: {
      en: "The band's ascending resistance matches the shoulder's strength curve",
      es: "La resistencia creciente de la banda encaja con la curva de fuerza del hombro",
    },
  },
  {
    id: "kettlebell-push-press",
    name: { en: "Kettlebell Push Press", es: "Push Press con Pesa Rusa" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "quadriceps", intensity: 2 },
      { muscle: "erector_spinae", intensity: 1 },
    ],
    equipment: { en: "Kettlebell", es: "Pesa rusa" },
    description: {
      en: "A short dip of the legs launches the bell; the arms finish what the legs started",
      es: "Un breve descenso de piernas lanza la pesa; los brazos terminan lo que empezaron las piernas",
    },
    hypertrophyNote: {
      en: "Lets you overload the shoulder past what a strict press could take",
      es: "Permite sobrecargar el hombro por encima de lo que aguanta un press estricto",
    },
  },
  {
    id: "wall-handstand-push-up",
    name: { en: "Wall Handstand Push-Up", es: "Flexión en Pino con Pared" },
    category: "bodyweight",
    difficulty: 5,
    hypertrophy: 4,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "lateral_deltoid", intensity: 3 },
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "traps_upper", intensity: 2 },
    ],
    equipment: { en: "Bodyweight + wall", es: "Peso corporal + pared" },
    description: {
      en: "Headstand against a wall, lower the head to a pad and press back up with straight hips",
      es: "Pino apoyado en la pared, baja la cabeza a una almohadilla y empuja con la cadera recta",
    },
    hypertrophyNote: {
      en: "The heaviest shoulder press available without a barbell — and it costs nothing",
      es: "El press de hombro más pesado sin barra — y no cuesta nada",
    },
  },
];

// ============================================================================
// PULL — home vertical pulling and unilateral rows
// ============================================================================

export const EXPANSION_PULL_EXERCISES: Exercise[] = [
  {
    id: "assisted-pull-up",
    name: { en: "Band-Assisted Pull-Up", es: "Dominada Asistida con Banda" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "rhomboids", intensity: 2 },
    ],
    equipment: { en: "Pull-up Bar + Bands", es: "Barra de dominadas + Bandas" },
    description: {
      en: "Loop the band over the bar and around a knee; it takes weight off the bottom, where you are weakest",
      es: "Pasa la banda por la barra y por la rodilla; quita peso en el punto más débil",
    },
    hypertrophyNote: {
      en: "The step between \"I cannot do one\" and a real pull-up — trainable volume in the meantime",
      es: "El puente entre «no puedo hacer una» y la dominada real — volumen entrenable mientras tanto",
    },
  },
  {
    id: "band-lat-pulldown",
    name: { en: "Band Lat Pulldown", es: "Jalón Dorsal con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "biceps_long", intensity: 1 },
    ],
    equipment: { en: "Resistance Bands", es: "Bandas elásticas" },
    description: {
      en: "Anchored high (door or bar), pull the elbows down and out until the hands reach the ribs",
      es: "Anclada arriba (puerta o barra), baja los codos hasta llevar las manos a las costillas",
    },
    hypertrophyNote: {
      en: "Gives the lat a vertical pull with no machine and no bar in reach",
      es: "Da al dorsal un tirón vertical sin máquina y sin barra a mano",
    },
  },
  {
    id: "inverted-row-feet-elevated",
    name: { en: "Elevated Inverted Row", es: "Remo Invertido con Pies Elevados" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "rhomboids", intensity: 3 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "posterior_deltoid", intensity: 2 },
      { muscle: "biceps_short", intensity: 1 },
    ],
    equipment: { en: "Dip Bars (+ chair)", es: "Paralelas (+ silla)" },
    description: {
      en: "Feet on a chair, chest to the bar, body one line from heel to head",
      es: "Pies en una silla, pecho a la barra, cuerpo en línea desde el talón a la cabeza",
    },
    hypertrophyNote: {
      en: "Every centimetre the feet rise adds load to a row that needs no weights",
      es: "Cada centímetro que suben los pies añade carga a un remo sin peso libre",
    },
  },
  {
    id: "dumbbell-renegade-row",
    name: { en: "Renegade Row", es: "Remo Renegado" },
    category: "compound",
    difficulty: 4,
    hypertrophy: 3,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "rhomboids", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "obliques", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "In a plank on the dumbbells, row one side while the hips refuse to rotate",
      es: "En plancha sobre las mancuernas, rema un lado mientras la cadera se niega a girar",
    },
    hypertrophyNote: {
      en: "A row and an anti-rotation core hold in the same set — the opposite of a time-waster",
      es: "Un remo y un antirrotación en la misma serie — lo contrario de perder el tiempo",
    },
  },
  {
    id: "chest-supported-dumbbell-row",
    name: { en: "Chest-Supported Dumbbell Row", es: "Remo con Mancuernas Apoyado en Banco" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "rhomboids", intensity: 3 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "posterior_deltoid", intensity: 2 },
      { muscle: "biceps_long", intensity: 1 },
    ],
    equipment: { en: "Dumbbells + Bench", es: "Mancuernas + Banco" },
    description: {
      en: "Face down on an incline bench: the back cannot cheat, only the lats can work",
      es: "Boca abajo en un banco inclinado: la espalda no puede hacer trampa, solo trabaja el dorsal",
    },
    hypertrophyNote: {
      en: "Zero spinal load, so it fits on a day when the lower back is already spent",
      es: "Cero carga espinal, así que encaja en un día con la lumbar ya gastada",
    },
  },
  {
    id: "straight-arm-pulldown",
    name: { en: "Straight-Arm Pulldown", es: "Pull-over en Polea" },
    category: "cable",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "lats_lower", intensity: 3 },
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "serratus_anterior", intensity: 2 },
      { muscle: "triceps_long", intensity: 1 },
    ],
    equipment: { en: "Cable", es: "Polea" },
    description: {
      en: "Elbows locked, sweep the handle from overhead to the thighs and feel the lat, not the arm",
      es: "Codos fijos, lleva el maneral de arriba a los muslos y siente el dorsal, no el brazo",
    },
    hypertrophyNote: {
      en: "The one lat movement the elbow flexors cannot steal",
      es: "El único movimiento de dorsal que los flexores del codo no pueden robar",
    },
  },
  {
    id: "kettlebell-row",
    name: { en: "Kettlebell Row", es: "Remo con Pesa Rusa" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "rhomboids", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 2 },
    ],
    equipment: { en: "Kettlebell", es: "Pesa rusa" },
    description: {
      en: "Hand on a bench if you have one, otherwise free-standing with a braced torso",
      es: "Apoya la mano en un banco si tienes, si no, de pie con el torso firme",
    },
    hypertrophyNote: {
      en: "The bell's offset weight makes the grip and shoulder stabilisers work too",
      es: "El peso descentrado de la pesa hace trabajar también agarre y estabilizadores",
    },
  },
  {
    id: "dead-hang",
    name: { en: "Dead Hang", es: "Colgado Muerto en Barra" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "forearm_flexors", intensity: 3 },
      { muscle: "lats_upper", intensity: 2 },
      { muscle: "traps_upper", intensity: 2 },
    ],
    equipment: { en: "Pull-up Bar", es: "Barra de dominadas" },
    description: {
      en: "Hang with relaxed shoulders and a firm grip; start with 20 s and add time, not reps",
      es: "Cuélgate con hombros relajados y agarre firme; empieza con 20 s y suma tiempo, no repeticiones",
    },
    hypertrophyNote: {
      en: "Grip and shoulder decompression between pulling sets — not a hypertrophy set on its own",
      es: "Agarre y descompresión de hombro entre series de tirón — no es una serie de hipertrofia",
    },
  },
];

// ============================================================================
// ARMS — the missing basics
// ============================================================================

export const EXPANSION_ARM_EXERCISES: Exercise[] = [
  {
    id: "dumbbell-curl",
    name: { en: "Dumbbell Curl", es: "Curl con Mancuernas" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [
      { muscle: "biceps_short", intensity: 3 },
      { muscle: "biceps_long", intensity: 3 },
      { muscle: "brachioradialis", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Elbows pinned to the ribs, supinate on the way up, lower under control",
      es: "Codos pegados a las costillas, supina al subir y baja controlando",
    },
    hypertrophyNote: {
      en: "The reference curl: every other curl is a variation of this one",
      es: "El curl de referencia: todos los demás son variaciones de este",
    },
  },
  {
    id: "concentration-curl",
    name: { en: "Concentration Curl", es: "Curl Concentrado" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "biceps_short", intensity: 3 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 1 },
    ],
    equipment: { en: "Dumbbells + Bench", es: "Mancuernas + Banco" },
    description: {
      en: "Elbow braced against the inner thigh, curl straight up and squeeze at the top",
      es: "Codo apoyado en el muslo, sube en vertical y aprieta arriba",
    },
    hypertrophyNote: {
      en: "Removes all momentum, which is why it feels heavier than the curl with the same weight",
      es: "Elimina cualquier inercia, por eso se siente más pesado que el curl con el mismo peso",
    },
  },
  {
    id: "spider-curl",
    name: { en: "Spider Curl", es: "Curl Araña" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "biceps_short", intensity: 3 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "brachioradialis", intensity: 2 },
    ],
    equipment: { en: "Dumbbells + Bench", es: "Mancuernas + Banco" },
    description: {
      en: "Face down on an incline bench, arms hanging: curl up against gravity from the start",
      es: "Boca abajo en banco inclinado con los brazos colgando: sube contra la gravedad desde el inicio",
    },
    hypertrophyNote: {
      en: "Highest tension right at the bottom, exactly where a standing curl has none",
      es: "Máxima tensión abajo, justo donde el curl de pie no tiene ninguna",
    },
  },
  {
    id: "incline-hammer-curl",
    name: { en: "Incline Hammer Curl", es: "Curl Martillo Inclinado" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "brachioradialis", intensity: 3 },
      { muscle: "biceps_long", intensity: 3 },
      { muscle: "forearm_flexors", intensity: 2 },
    ],
    equipment: { en: "Dumbbells + Bench", es: "Mancuernas + Banco" },
    description: {
      en: "Neutral grip on an incline bench; the long head is stretched the whole set",
      es: "Agarre neutro en banco inclinado; la cabeza larga queda estirada toda la serie",
    },
    hypertrophyNote: {
      en: "The most reliable way to add arm width without frying the elbow tendons",
      es: "La forma más fiable de sumar grosor de brazo sin cocer los tendones del codo",
    },
  },
  {
    id: "band-overhead-triceps-extension",
    name: { en: "Band Overhead Triceps Extension", es: "Extensión de Tríceps sobre la Cabeza con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "triceps_medial", intensity: 1 },
    ],
    equipment: { en: "Resistance Bands", es: "Bandas elásticas" },
    description: {
      en: "Anchor the band behind you, elbows by the ears, extend until the arms are straight",
      es: "Ancla la banda detrás, codos junto a las orejas, estira hasta que los brazos queden rectos",
    },
    hypertrophyNote: {
      en: "The long head only grows fully when the shoulder is overhead — this is that position",
      es: "La cabeza larga solo crece del todo con el hombro arriba — esta es esa posición",
    },
  },
  {
    id: "tate-press",
    name: { en: "Tate Press", es: "Press Tate" },
    category: "isolation",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "triceps_medial", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 3 },
      { muscle: "chest_lower", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Lying down, elbows out and the dumbbells pointing inward: extend the elbows, not the shoulders",
      es: "Tumbado, codos abiertos y mancuernas mirando hacia dentro: estira los codos, no los hombros",
    },
    hypertrophyNote: {
      en: "Puts the triceps under load in the stretched position, which most pushdowns never do",
      es: "Carga el tríceps en posición estirada, algo que casi ningún jalón hace",
    },
  },
];

// ============================================================================
// LEGS — unilateral work and honest glute/quad options
// ============================================================================

export const EXPANSION_LEG_EXERCISES: Exercise[] = [
  {
    id: "dumbbell-split-squat",
    name: { en: "Dumbbell Split Squat", es: "Sentadilla Dividida con Mancuernas" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "adductors", intensity: 2 },
      { muscle: "gluteus_medius", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Feet split, front knee tracks over the toe, back knee drops straight down",
      es: "Pies separados, la rodilla delantera sobre el pie, la de atrás baja en vertical",
    },
    hypertrophyNote: {
      en: "Half the load per leg means a third of the spinal cost — the single best leg builder for a home gym",
      es: "La mitad de carga por pierna son un tercio del coste espinal — el mejor constructor de pierna en casa",
    },
  },
  {
    id: "reverse-lunge",
    name: { en: "Reverse Lunge", es: "Zancada Inversa" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "gluteus_medius", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Step back, not forward: the front knee stays quiet and the glute does the work",
      es: "Da el paso hacia atrás, no adelante: la rodilla delantera sufre menos y trabaja el glúteo",
    },
    hypertrophyNote: {
      en: "The friendliest lunge for sore or noisy knees",
      es: "La zancada más amable con rodillas cansadas o ruidosas",
    },
  },
  {
    id: "walking-lunge",
    name: { en: "Walking Lunge", es: "Zancada Caminando" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "gluteus_medius", intensity: 2 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Long steps, tall torso, knee gently touching down without slamming",
      es: "Pasos largos, tronco alto, la rodilla toca el suelo sin golpear",
    },
    hypertrophyNote: {
      en: "Legs plus conditioning plus balance in one pass across the room",
      es: "Pierna, capacidad y equilibrio en un solo trayecto por la habitación",
    },
  },
  {
    id: "pistol-squat",
    name: { en: "Pistol Squat", es: "Sentadilla Pistol" },
    category: "bodyweight",
    difficulty: 5,
    hypertrophy: 4,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "gluteus_medius", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Full depth on one leg with the other straight and the heel down; hold a support until you can",
      es: "Profundidad completa a una pierna con la otra estirada y el talón abajo; apóyate hasta poder",
    },
    hypertrophyNote: {
      en: "The whole leg on one side of the body, with no equipment and no load on the spine",
      es: "Toda la pierna de un lado del cuerpo, sin equipamiento y sin carga en la columna",
    },
  },
  {
    id: "sissy-squat",
    name: { en: "Sissy Squat", es: "Sentadilla Sissy" },
    category: "bodyweight",
    difficulty: 4,
    hypertrophy: 3,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "iliopsoas", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: { en: "Bodyweight (support to hold)", es: "Peso corporal (apoyo para agarrarse)" },
    description: {
      en: "Knees travel forward over the toes while the hips stay in line with the shoulders",
      es: "Las rodillas van hacia delante sobre los pies mientras la cadera queda alineada con los hombros",
    },
    hypertrophyNote: {
      en: "Quad isolation with no machine at all — and a knee that must be warmed up first",
      es: "Aislamiento de cuádriceps sin máquina — con una rodilla que hay que calentar antes",
    },
  },
  {
    id: "glute-bridge",
    name: { en: "Glute Bridge", es: "Puente de Glúteo" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "erector_spinae", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Heels close to the hips, drive the hips up until the body is one line, squeeze, lower slowly",
      es: "Talones cerca de la cadera, sube la pelvis hasta formar una línea, aprieta y baja despacio",
    },
    hypertrophyNote: {
      en: "Hip extension with no bench, no barbell and no load on the spine",
      es: "Extensión de cadera sin banco, sin barra y sin carga en la columna",
    },
  },
  {
    id: "single-leg-glute-bridge",
    name: { en: "Single-Leg Glute Bridge", es: "Puente de Glúteo a Una Pierna" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "gluteus_medius", intensity: 3 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "obliques", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "One foot planted, the other knee hugged in; the hips must not tilt as they rise",
      es: "Un pie apoyado, la otra rodilla abrazada; la cadera no puede inclinarse al subir",
    },
    hypertrophyNote: {
      en: "Doubles the load per side and exposes a weak glute medius immediately",
      es: "Duplica la carga por lado y deja en evidencia un glúteo medio débil",
    },
  },
  {
    id: "cable-glute-kickback",
    name: { en: "Cable Glute Kickback", es: "Patada de Glúteo en Polea" },
    category: "cable",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 1 },
      { muscle: "erector_spinae", intensity: 1 },
    ],
    equipment: { en: "Cable", es: "Polea" },
    description: {
      en: "Ankle cuff on, hinge slightly forward, drive the leg back without arching the lower back",
      es: "Tobillera puesta, inclínate algo al frente, lleva la pierna atrás sin arquear la lumbar",
    },
    hypertrophyNote: {
      en: "Isolates the glute in its shortest range, where bridges stop being hard",
      es: "Aísla el glúteo en su rango más corto, donde el puente ya no cuesta",
    },
  },
  {
    id: "good-morning",
    name: { en: "Good Morning", es: "Buenos Días con Barra" },
    category: "compound",
    difficulty: 4,
    hypertrophy: 3,
    muscles: [
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "erector_spinae", intensity: 3 },
      { muscle: "traps_mid", intensity: 1 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Bar on the back, knees soft and fixed, hinge from the hips until the torso is near parallel",
      es: "Barra en la espalda, rodillas algo flexionadas y fijas, bisagra de cadera hasta casi paralelo",
    },
    hypertrophyNote: {
      en: "The best hamstring-lengthening load there is — and the least forgiving of a rounded back",
      es: "La mejor carga para alargar isquios — y la menos tolerante con una espalda redondeada",
    },
  },
  {
    id: "kettlebell-swing",
    name: { en: "Kettlebell Swing", es: "Swing con Pesa Rusa" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "erector_spinae", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 2 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: { en: "Kettlebell", es: "Pesa rusa" },
    description: {
      en: "Hinge, do not squat: the bell floats from hip drive and the arms are only ropes",
      es: "Bisagra, no sentadilla: la pesa flota por el empuje de cadera y los brazos son solo cuerdas",
    },
    hypertrophyNote: {
      en: "Posterior chain plus a real cardiovascular cost in the same minute",
      es: "Cadena posterior más un coste cardiovascular real en el mismo minuto",
    },
  },
  {
    id: "box-jump",
    name: { en: "Box Jump", es: "Salto al Cajón" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 2,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "calves", intensity: 2 },
      { muscle: "hamstrings", intensity: 1 },
    ],
    equipment: { en: "Box / step", es: "Cajón / escalón" },
    description: {
      en: "Jump up, step down — always step, never jump down; low box, perfect landing",
      es: "Sube saltando, baja bajando el peldaño a pie — nunca saltes hacia abajo; cajón bajo y aterrizaje perfecto",
    },
    hypertrophyNote: {
      en: "Power rather than size: it belongs early in a session or not at all",
      es: "Potencia más que tamaño: va al principio de la sesión o no va",
    },
  },
  {
    id: "donkey-calf-raise",
    name: { en: "Donkey Calf Raise", es: "Elevación de Gemelos Burro" },
    category: "isolation",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "calves", intensity: 3 },
      { muscle: "soleus", intensity: 2 },
      { muscle: "hamstrings", intensity: 1 },
    ],
    equipment: { en: "Bench (+ step)", es: "Banco (+ escalón)" },
    description: {
      en: "Hips bent over a bench, forefoot on a step: the stretch at the bottom is the whole point",
      es: "Cadera flexionada sobre un banco, antepié en un escalón: el estiramiento de abajo es la clave",
    },
    hypertrophyNote: {
      en: "The bent-knee-calf position reaches the soleus, which standing raises miss",
      es: "La posición de rodilla flexionada alcanza el sóleo, que las elevaciones de pie se saltan",
    },
  },
];

// ============================================================================
// CORE — the missing staples
// ============================================================================

export const EXPANSION_CORE_EXERCISES: Exercise[] = [
  {
    id: "hanging-knee-raise",
    name: { en: "Hanging Knee Raise", es: "Elevación de Rodillas Colgado" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 3 },
      { muscle: "forearm_flexors", intensity: 1 },
    ],
    equipment: { en: "Pull-up Bar", es: "Barra de dominadas" },
    description: {
      en: "Hang, curl the pelvis up (not just the knees) and lower without swinging",
      es: "Cuélgate, enrolla la pelvis hacia arriba (no solo las rodillas) y baja sin balancearte",
    },
    hypertrophyNote: {
      en: "The step before the hanging leg raise, and the easiest way to load the abs continuously",
      es: "El paso previo a la elevación de piernas, y la forma más fácil de cargar el abdomen de forma continua",
    },
  },
  {
    id: "hollow-rock",
    name: { en: "Hollow Rock", es: "Roca Hueca" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 3,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 2 },
      { muscle: "quadriceps", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "From the hollow hold, rock slightly back and forth: the lower back must never touch down",
      es: "Desde la posición hueca, méce el cuerpo ligeramente: la lumbar nunca debe tocar el suelo",
    },
    hypertrophyNote: {
      en: "A dynamic progression of the hold that never lets the abs rest",
      es: "Una progresión dinámica del isométrico que no deja descansar al abdomen",
    },
  },
  {
    id: "v-up",
    name: { en: "V-Up", es: "V-Up (Navaja)" },
    category: "bodyweight",
    difficulty: 4,
    hypertrophy: 3,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 3 },
      { muscle: "obliques", intensity: 1 },
      { muscle: "quadriceps", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Lift the straight legs and torso to meet over the hips; slower is harder, not easier",
      es: "Sube piernas rectas y tronco a encontrarse sobre la cadera; más lento es más duro, no menos",
    },
    hypertrophyNote: {
      en: "Trains the abs through the whole range in one rep — a poor choice if the neck hurts",
      es: "Recorre todo el rango abdominal en una repetición — mala opción si duele el cuello",
    },
  },
  {
    id: "bird-dog",
    name: { en: "Bird Dog", es: "Bird Dog (Cuadrupedia Alterna)" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 2,
    muscles: [
      { muscle: "erector_spinae", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "obliques", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "On all fours, extend the opposite arm and leg without letting the hips tilt",
      es: "En cuadrupedia, extiende brazo y pierna contrarios sin dejar que la cadera se incline",
    },
    hypertrophyNote: {
      en: "Not a growth movement: it is the movement that keeps the back healthy enough to grow",
      es: "No es un movimiento de crecimiento: es el que mantiene la espalda sana para poder crecer",
    },
  },
  {
    id: "pallof-press",
    name: { en: "Pallof Press", es: "Pallof Press" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 2,
    muscles: [
      { muscle: "obliques", intensity: 3 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "erector_spinae", intensity: 1 },
    ],
    equipment: { en: "Resistance Bands", es: "Bandas elásticas" },
    description: {
      en: "Band anchored to the side: press straight out and let nothing rotate, then hold two seconds",
      es: "Banda anclada de lado: empuja al frente y que nada gire, y aguanta dos segundos",
    },
    hypertrophyNote: {
      en: "Anti-rotation: the core skill that carries over to squats and carries",
      es: "Antirrotación: la habilidad del core que se traslada a sentadillas y acarreos",
    },
  },
  {
    id: "sit-up",
    name: { en: "Sit-Up", es: "Abdominales (Sit-Up)" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 2 },
      { muscle: "obliques", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Knees bent, curl the spine up one vertebra at a time, hands across the chest",
      es: "Rodillas flexionadas, enrolla la columna vértebra a vértebra, manos al pecho",
    },
    hypertrophyNote: {
      en: "The exercise everyone knows: fine as a beginner entry, better replaced by the hanging raise later",
      es: "El ejercicio que todos conocen: sirve de entrada para principiantes y luego mejor sustituirlo",
    },
  },
];

// ============================================================================
// CARDIO — free conditioning (no gym, no machine)
// ============================================================================

export const EXPANSION_CARDIO_EXERCISES: Exercise[] = [
  {
    id: "shadow-boxing-intervals",
    name: { en: "Shadow Boxing Intervals", es: "Intervalos de Sombra (Boxeo)" },
    category: "cardio",
    difficulty: 2,
    hypertrophy: 1,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "obliques", intensity: 2 },
      { muscle: "quadriceps", intensity: 1 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "30 s of real punches and footwork, 30 s easy: no partner, no bag, no equipment",
      es: "30 s de golpes y desplazamientos reales, 30 s suave: sin compañero, sin saco, sin material",
    },
    hypertrophyNote: {
      en: "Conditioning that costs nothing and doubles as a shoulder warm-up",
      es: "Capacidad aeróbica que no cuesta nada y sirve de calentamiento de hombro",
    },
  },
  {
    id: "tabata-bodyweight",
    name: { en: "Bodyweight Tabata", es: "Tabata con Peso Corporal" },
    category: "cardio",
    difficulty: 3,
    hypertrophy: 1,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "20 s all-out of squats and burpees, 10 s rest, eight rounds — four minutes, no gear",
      es: "20 s a tope de sentadillas y burpees, 10 s de descanso, ocho rondas — cuatro minutos sin material",
    },
    hypertrophyNote: {
      en: "The cheapest real interval session: use it at the end, never before lifting",
      es: "La sesión de intervalos más barata: al final, nunca antes de levantar",
    },
  },
  {
    id: "jump-rope-steady",
    name: { en: "Jump Rope (Steady)", es: "Cuerda Continua" },
    category: "cardio",
    difficulty: 2,
    hypertrophy: 1,
    muscles: [
      { muscle: "calves", intensity: 3 },
      { muscle: "tibialis_anterior", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 1 },
    ],
    equipment: { en: "Jump Rope", es: "Cuerda de saltar" },
    description: {
      en: "Twelve to twenty minutes at a talking pace, small jumps, quiet landings",
      es: "Doce a veinte minutos a ritmo conversacional, saltos pequeños, aterrizajes silenciosos",
    },
    hypertrophyNote: {
      en: "Zone-2 work that also loads the calves and ankles — a real warm-up, too",
      es: "Trabajo de zona 2 que además carga gemelos y tobillos — y vale de calentamiento",
    },
  },
  {
    id: "bike-sprint-intervals",
    name: { en: "Bike Sprint Intervals", es: "Sprints en Bici" },
    category: "cardio",
    difficulty: 3,
    hypertrophy: 1,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "hamstrings", intensity: 1 },
    ],
    equipment: { en: "Bike (MTB / road / spin)", es: "Bicicleta (MTB / ruta / estática)" },
    description: {
      en: "20 s sprint, 100 s easy, six to ten reps: the plateau is where the adaptation happens",
      es: "20 s sprint, 100 s suave, seis a diez series: la meseta es donde ocurre la adaptación",
    },
    hypertrophyNote: {
      en: "Near-zero joint cost for a lot of cardiovascular training",
      es: "Coste articular casi nulo para mucha capacidad cardiovascular",
    },
  },
  {
    id: "stair-climb-steady",
    name: { en: "Stair Climb (Steady)", es: "Escaleras Continuas" },
    category: "cardio",
    difficulty: 2,
    hypertrophy: 1,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "calves", intensity: 2 },
    ],
    equipment: { en: "Stairs", es: "Escaleras" },
    description: {
      en: "Steady pace for fifteen to thirty minutes, whole foot on the step, handrail only if needed",
      es: "Ritmo constante de quince a treinta minutos, pie completo en el escalón, barandilla solo si hace falta",
    },
    hypertrophyNote: {
      en: "The free hill: quads and glutes at a walk's joint cost",
      es: "La cuesta gratis: cuádriceps y glúteo con el coste articular de caminar",
    },
  },
];

/** Everything added by this file, in catalog order. */
export const EXPANSION_EXERCISES: Exercise[] = [
  ...EXPANSION_PUSH_EXERCISES,
  ...EXPANSION_PULL_EXERCISES,
  ...EXPANSION_ARM_EXERCISES,
  ...EXPANSION_LEG_EXERCISES,
  ...EXPANSION_CORE_EXERCISES,
  ...EXPANSION_CARDIO_EXERCISES,
];
