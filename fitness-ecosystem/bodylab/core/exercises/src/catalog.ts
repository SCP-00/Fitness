/**
 * Exercise Database v2
 *
 * Muscle groups restructured into 20+ specific groups.
 * Each exercise now has:
 *   - difficulty: Technical difficulty (1-5)
 *   - hypertrophy: Hypertrophy effectiveness (1-5)
 *   - muscles: Per-muscle intensity (1=synergist, 2=secondary, 3=primary)
 *
 * Lives in the shared core package `@fitness/bodylab-exercises` so BOTH apps
 * (BodyLab web/desktop and TrainingLab) plan against one catalog. The
 * machine-checkable half — equipment requirements, movement pattern, load
 * type, progression axes — is in `./traits`; home/conditioning entries are in
 * `./catalog-additions`.
 *
 * @module catalog
 */

import {
  CARDIO_EXERCISES,
  HOME_CORE_EXERCISES,
  HOME_LEG_EXERCISES,
  HOME_PUSH_PULL_EXERCISES,
} from "./catalog-additions";

export type MuscleGroup =
  // Upper body - Push
  | "chest_upper"
  | "chest_lower"
  | "pectoralis_minor"
  | "serratus_anterior"
  | "anterior_deltoid"
  | "lateral_deltoid"
  | "posterior_deltoid"
  | "triceps_long"
  | "triceps_lateral"
  | "triceps_medial"
  // Upper body - Pull
  | "biceps_long"
  | "biceps_short"
  | "brachioradialis"
  | "forearm_flexors"
  | "forearm_extensors"
  | "lats_upper"
  | "lats_mid"
  | "lats_lower"
  | "traps_upper"
  | "traps_mid"
  | "traps_lower"
  | "rhomboids"
  // Core
  | "rectus_abdominis"
  | "obliques"
  | "erector_spinae"
  | "iliopsoas"
  // Lower body
  | "gluteus_maximus"
  | "gluteus_medius"
  | "quadriceps"
  | "adductors"
  | "hamstrings"
  | "calves"
  | "soleus"
  | "tibialis_anterior";

export type ExerciseCategory =
  "compound" | "isolation" | "bodyweight" | "cable" | "machine" | "cardio";

export interface MuscleInvolvement {
  muscle: MuscleGroup;
  intensity: 1 | 2 | 3; // 1=synergist, 2=secondary, 3=primary
}

export interface Exercise {
  id: string;
  name: { en: string; es: string };
  category: ExerciseCategory;
  difficulty: 1 | 2 | 3 | 4 | 5; // Technical difficulty
  hypertrophy: 1 | 2 | 3 | 4 | 5; // Hypertrophy effectiveness
  muscles: MuscleInvolvement[];
  equipment: { en: string; es: string };
  description: { en: string; es: string };
  /** Why this exercise is good for hypertrophy */
  hypertrophyNote?: { en: string; es: string };
}

// ============================================================================
// CHEST EXERCISES
// ============================================================================

const CHEST_EXERCISES: Exercise[] = [
  {
    id: "barbell-bench-press",
    name: { en: "Barbell Bench Press", es: "Press con Barra" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "triceps_lateral", intensity: 2 },
    ],
    equipment: { en: "Barbell + Flat Bench", es: "Barra + Banca Plana" },
    description: {
      en: "Lie flat, lower bar to mid-chest, press up",
      es: "Acuéstate plano, baja la barra al pecho medio, presiona arriba",
    },
    hypertrophyNote: {
      en: "Heavy loading potential + full ROM = maximum hypertrophy stimulus",
      es: "Alto potencial de carga + ROM completo = estímulo máximo de hipertrofia",
    },
  },
  {
    id: "incline-bench-press",
    name: { en: "Incline Bench Press", es: "Press Inclinado" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "triceps_lateral", intensity: 2 },
    ],
    equipment: { en: "Barbell + Incline Bench", es: "Barra + Banca Inclinada" },
    description: {
      en: "Press at 30-45° angle targeting upper chest",
      es: "Press en ángulo 30-45° enfocado en pecho superior",
    },
    hypertrophyNote: {
      en: "Targets clavicular head — key for upper chest development",
      es: "Enfocado en cabeza clavicular — clave para desarrollo de pecho superior",
    },
  },
  {
    id: "dumbbell-bench-press",
    name: { en: "Dumbbell Bench Press", es: "Press con Mancuernas" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 5,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
    ],
    equipment: { en: "Dumbbells + Flat Bench", es: "Mancuernas + Banca Plana" },
    description: {
      en: "Press dumbbells from chest level to full extension",
      es: "Presiona mancuernas desde el pecho hasta extensión completa",
    },
    hypertrophyNote: {
      en: "Greater ROM than barbell, better stretch at bottom",
      es: "Mayor ROM que barra, mejor estiramiento en la parte baja",
    },
  },
  {
    id: "dumbbell-fly",
    name: { en: "Dumbbell Fly", es: "Aperturas con Mancuernas" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 1 },
    ],
    equipment: { en: "Dumbbells + Bench", es: "Mancuernas + Banca" },
    description: {
      en: "Arms wide, squeeze chest to bring dumbbells together",
      es: "Brazos abiertos, aprieta el pecho para unir las mancuernas",
    },
    hypertrophyNote: {
      en: "Peak contraction at top, deep stretch at bottom",
      es: "Contracción pico arriba, estiramiento profundo abajo",
    },
  },
  {
    id: "cable-crossover",
    name: { en: "Cable Crossover", es: "Cruces en Polea" },
    category: "cable",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "chest_upper", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 1 },
    ],
    equipment: { en: "Cable Machine", es: "Máquina de Poleas" },
    description: {
      en: "Arms wide, bring hands together in front of chest",
      es: "Brazos abiertos, junta las manos al frente del pecho",
    },
    hypertrophyNote: {
      en: "Constant tension throughout ROM — great for mind-muscle connection",
      es: "Tensión constante durante todo el ROM — excelente para conexión mente-músculo",
    },
  },
  {
    id: "push-ups",
    name: { en: "Push-ups", es: "Flexiones" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Hands shoulder-width, lower chest to floor, push up",
      es: "Manos al ancho de hombros, baja el pecho al suelo, empuja arriba",
    },
    hypertrophyNote: {
      en: "Limited by bodyweight — add variations for progressive overload",
      es: "Limitado por peso corporal — agrega variaciones para sobrecarga progresiva",
    },
  },
  {
    id: "machine-bench-press",
    name: { en: "Machine Chest Press", es: "Press de Pecho en Máquina" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
    ],
    equipment: { en: "Chest Press Machine", es: "Máquina de Press de Pecho" },
    description: {
      en: "Seated, push handles forward until arms extend, control the return",
      es: "Sentado, empuja las manillas hacia adelante hasta extender los brazos, controla el regreso",
    },
    hypertrophyNote: {
      en: "Machine variant of the bench press — safer loading for high-volume work",
      es: "Variante en máquina del press de banca — carga segura para trabajo de alto volumen",
    },
  },
  {
    id: "incline-dumbbell-press",
    name: {
      en: "Incline Dumbbell Press",
      es: "Press Inclinado con Mancuernas",
    },
    category: "compound",
    difficulty: 2,
    hypertrophy: 5,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "triceps_long", intensity: 2 },
    ],
    equipment: {
      en: "Dumbbells + Incline Bench",
      es: "Mancuernas + Banca Inclinada",
    },
    description: {
      en: "Press dumbbells from upper-chest level on a 30-45° incline",
      es: "Presiona las mancuernas desde el pecho superior en una banca inclinada 30-45°",
    },
    hypertrophyNote: {
      en: "Dumbbell variant of the incline press — freer path, deeper stretch",
      es: "Variante con mancuernas del press inclinado — trayectoria libre, mayor estiramiento",
    },
  },
  {
    id: "machine-chest-fly",
    name: {
      en: "Machine Chest Fly (Pec Deck)",
      es: "Aperturas en Máquina (Pec Deck)",
    },
    category: "machine",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 1 },
    ],
    equipment: {
      en: "Pec Deck / Butterfly Machine",
      es: "Máquina de Aperturas (Butterfly)",
    },
    description: {
      en: "Seated, bring the pads together in front of you, squeeze the chest, return slowly",
      es: "Sentado, une los apoyos al frente, aprieta el pecho, regresa lentamente",
    },
    hypertrophyNote: {
      en: "Machine variant of the fly — constant tension, easy to isolate the pecs",
      es: "Variante en máquina de las aperturas — tensión constante, fácil aislar el pecho",
    },
  },
  {
    id: "push-up-plus",
    name: {
      en: "Push-Up Plus (Serratus Push-Up)",
      es: "Flexión Plus (Flexión de Serrato)",
    },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "serratus_anterior", intensity: 3 },
      { muscle: "chest_upper", intensity: 2 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Push-up with an extra protraction at the top — round the upper back to push the floor away",
      es: "Flexión con una protracción extra arriba — arquea la espalda alta para alejar el suelo",
    },
    hypertrophyNote: {
      en: 'The protraction phase targets the serratus anterior — key for shoulder health and the "winged" look',
      es: 'La fase de protracción enfoca el serrato anterior — clave para salud del hombro y el aspecto "alado"',
    },
  },
  {
    id: "dumbbell-pullover",
    name: { en: "Dumbbell Pullover", es: "Pullover con Mancuerna" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "pectoralis_minor", intensity: 3 },
      { muscle: "lats_mid", intensity: 2 },
      { muscle: "lats_upper", intensity: 1 },
      { muscle: "triceps_long", intensity: 1 },
    ],
    equipment: { en: "Dumbbell + Bench", es: "Mancuerna + Banca" },
    description: {
      en: "Lie across the bench, lower the dumbbell in an arc behind your head, pull it back over your chest",
      es: "Acuéstate a lo ancho de la banca, baja la mancuerna en arco detrás de la cabeza, regrésala sobre el pecho",
    },
    hypertrophyNote: {
      en: "Stretched-position movement — hits the pectoralis minor and lats through a long arc",
      es: "Movimiento en posición estirada — trabaja pectoral menor y dorsales en un arco largo",
    },
  },
];

// ============================================================================
// SHOULDER EXERCISES
// ============================================================================

const SHOULDER_EXERCISES: Exercise[] = [
  {
    id: "overhead-press",
    name: { en: "Overhead Press", es: "Press Militar" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "lateral_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "triceps_lateral", intensity: 2 },
      { muscle: "traps_upper", intensity: 1 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Press bar from shoulders to overhead lockout",
      es: "Presiona la barra de los hombros hasta bloqueo arriba",
    },
    hypertrophyNote: {
      en: "Compound overload for all three deltoid heads",
      es: "Sobrecarga compuesta para las tres cabezas del deltoides",
    },
  },
  {
    id: "lateral-raise",
    name: { en: "Lateral Raise", es: "Elevaciones Laterales" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 5,
    muscles: [
      { muscle: "lateral_deltoid", intensity: 3 },
      { muscle: "traps_upper", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Raise arms to sides until parallel to floor",
      es: "Eleva los brazos a los lados hasta paralelo al suelo",
    },
    hypertrophyNote: {
      en: "Isolation for lateral head — creates shoulder width",
      es: "Aislamiento para cabeza lateral — crea anchura de hombros",
    },
  },
  {
    id: "face-pulls",
    name: { en: "Face Pulls", es: "Jalones a la Cara" },
    category: "cable",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "posterior_deltoid", intensity: 3 },
      { muscle: "traps_mid", intensity: 3 },
      { muscle: "traps_upper", intensity: 2 },
      { muscle: "biceps_long", intensity: 1 },
    ],
    equipment: { en: "Cable Machine + Rope", es: "Máquina de Poleas + Cuerda" },
    description: {
      en: "Pull rope to face, external rotate, squeeze rear delts",
      es: "Jala la cuerda a la cara, rota externamente, aprieta deltoides posteriores",
    },
    hypertrophyNote: {
      en: "Critical for rear delt and rotator cuff health",
      es: "Crítico para salud de deltoides posteriores y manguito rotador",
    },
  },
  {
    id: "arnold-press",
    name: { en: "Arnold Press", es: "Press Arnold" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "lateral_deltoid", intensity: 3 },
      { muscle: "posterior_deltoid", intensity: 1 },
      { muscle: "triceps_long", intensity: 2 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Rotating dumbbell press hitting all deltoid heads",
      es: "Press rotatorio con mancuernas que trabaja todas las cabezas del deltoides",
    },
    hypertrophyNote: {
      en: "Rotation increases time under tension across full ROM",
      es: "La rotación aumenta tiempo bajo tensión en todo el ROM",
    },
  },
  {
    id: "reverse-fly",
    name: { en: "Reverse Fly", es: "Aperturas Inversas" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "posterior_deltoid", intensity: 3 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "traps_upper", intensity: 1 },
    ],
    equipment: {
      en: "Dumbbells + Incline Bench",
      es: "Mancuernas + Banca Inclinada",
    },
    description: {
      en: "Face down, raise dumbbells out to sides",
      es: "Boca abajo, eleva las mancuernas hacia los lados",
    },
    hypertrophyNote: {
      en: "Isolation for neglected posterior deltoid",
      es: "Aislamiento para el deltoides posterior negligido",
    },
  },
  {
    id: "machine-shoulder-press",
    name: { en: "Machine Shoulder Press", es: "Press de Hombros en Máquina" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "lateral_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
      { muscle: "traps_upper", intensity: 1 },
    ],
    equipment: {
      en: "Shoulder Press Machine",
      es: "Máquina de Press de Hombros",
    },
    description: {
      en: "Seated, press the handles overhead until arms extend, lower with control",
      es: "Sentado, presiona las manillas por encima de la cabeza hasta extender, baja con control",
    },
    hypertrophyNote: {
      en: "Machine variant of the overhead press — stable path, easy progressive overload",
      es: "Variante en máquina del press militar — trayectoria estable, sobrecarga progresiva fácil",
    },
  },
  {
    id: "band-lateral-raise",
    name: { en: "Band Lateral Raise", es: "Elevaciones Laterales con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "lateral_deltoid", intensity: 3 },
      { muscle: "traps_upper", intensity: 1 },
    ],
    equipment: { en: "Resistance Band", es: "Banda de Resistencia" },
    description: {
      en: "Step on the band, raise your arms to the sides until parallel to the floor",
      es: "Pisa la banda, eleva los brazos a los lados hasta paralelo al suelo",
    },
    hypertrophyNote: {
      en: "Band variant of the lateral raise — tension peaks at the top where the deltoid is strongest",
      es: "Variante con banda de las elevaciones — la tensión pica arriba, donde el deltoides es más fuerte",
    },
  },
];

// ============================================================================
// BICEPS EXERCISES
// ============================================================================

const BICEPS_EXERCISES: Exercise[] = [
  {
    id: "barbell-curl",
    name: { en: "Barbell Curl", es: "Curl con Barra" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 5,
    muscles: [
      { muscle: "biceps_long", intensity: 3 },
      { muscle: "biceps_short", intensity: 3 },
      { muscle: "brachioradialis", intensity: 2 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Curl bar from thighs to shoulders, elbows pinned",
      es: "Curla la barra de los muslos a los hombros, codos fijos",
    },
    hypertrophyNote: {
      en: "Heaviest load possible for biceps — progressive overload king",
      es: "Mayor carga posible para bíceps — rey de la sobrecarga progresiva",
    },
  },
  {
    id: "incline-dumbbell-curl",
    name: { en: "Incline Dumbbell Curl", es: "Curl Inclinado con Mancuernas" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 5,
    muscles: [
      { muscle: "biceps_long", intensity: 3 },
      { muscle: "biceps_short", intensity: 2 },
      { muscle: "brachioradialis", intensity: 1 },
    ],
    equipment: {
      en: "Dumbbells + Incline Bench",
      es: "Mancuernas + Banca Inclinada",
    },
    description: {
      en: "Seated incline, curl with arms behind body",
      es: "Sentado inclinado, curla con brazos detrás del cuerpo",
    },
    hypertrophyNote: {
      en: "Stretched position maximizes long head activation",
      es: "Posición estirada maximiza activación de cabeza larga",
    },
  },
  {
    id: "hammer-curl",
    name: { en: "Hammer Curl", es: "Curl Martillo" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [
      { muscle: "biceps_long", intensity: 3 },
      { muscle: "brachioradialis", intensity: 3 },
      { muscle: "biceps_short", intensity: 2 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Neutral grip curl, targets brachialis and forearms",
      es: "Curl con agarre neutro, enfocado en braquial y antebrazos",
    },
    hypertrophyNote: {
      en: "Builds arm thickness from the side — hits brachialis",
      es: "Construye grosor del brazo desde el lado — trabaja braquial",
    },
  },
  {
    id: "preacher-curl",
    name: { en: "Preacher Curl", es: "Curl en Predicador" },
    category: "isolation",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "biceps_short", intensity: 3 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "brachioradialis", intensity: 1 },
    ],
    equipment: {
      en: "Preacher Bench + EZ Bar",
      es: "Banco de Predicador + Barra EZ",
    },
    description: {
      en: "Arms supported, curl with strict form — no cheating",
      es: "Brazos apoyados, curl con forma estricta — sin trampa",
    },
    hypertrophyNote: {
      en: "Eliminates momentum — pure biceps isolation",
      es: "Elimina impulso — aislamiento puro de bíceps",
    },
  },
  {
    id: "chin-ups",
    name: { en: "Chin-ups", es: "Dominadas Supinas" },
    category: "bodyweight",
    difficulty: 4,
    hypertrophy: 5,
    muscles: [
      { muscle: "biceps_long", intensity: 3 },
      { muscle: "biceps_short", intensity: 3 },
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "brachioradialis", intensity: 2 },
    ],
    equipment: { en: "Pull-up Bar", es: "Barra de Dominadas" },
    description: {
      en: "Underhand grip pull-up, heavy bicep engagement",
      es: "Dominada con agarre supino, alto involucramiento de bíceps",
    },
    hypertrophyNote: {
      en: "Heavy compound movement — biceps AND lats together",
      es: "Movimiento compuesto pesado — bíceps Y dorsales juntos",
    },
  },
];

// ============================================================================
// TRICEPS EXERCISES
// ============================================================================

const TRICEPS_EXERCISES: Exercise[] = [
  {
    id: "close-grip-bench",
    name: { en: "Close-Grip Bench Press", es: "Press agarre cerrado" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 3 },
      { muscle: "triceps_medial", intensity: 3 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
    ],
    equipment: { en: "Barbell + Flat Bench", es: "Barra + Banca Plana" },
    description: {
      en: "Narrow grip, lower to chest, press with triceps emphasis",
      es: "Agarre estrecho, baja al pecho, presiona con énfasis en tríceps",
    },
    hypertrophyNote: {
      en: "Heaviest compound for triceps — loads all three heads",
      es: "Compuesto más pesado para tríceps — carga las tres cabezas",
    },
  },
  {
    id: "overhead-tricep-extension",
    name: {
      en: "Overhead Cable Extension",
      es: "Extensión de Tríceps en Polea",
    },
    category: "cable",
    difficulty: 2,
    hypertrophy: 5,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 2 },
      { muscle: "triceps_medial", intensity: 2 },
    ],
    equipment: { en: "Cable Machine + Rope", es: "Máquina de Poleas + Cuerda" },
    description: {
      en: "Arms overhead, extend elbows against cable resistance",
      es: "Brazos arriba, extiende los codos contra resistencia del cable",
    },
    hypertrophyNote: {
      en: "Stretched position targets long head — biggest triceps head",
      es: "Posición estirada enfoca cabeza larga — la cabeza más grande del tríceps",
    },
  },
  {
    id: "skull-crushers",
    name: { en: "Skull Crushers", es: "Francesas" },
    category: "isolation",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 3 },
      { muscle: "triceps_medial", intensity: 2 },
    ],
    equipment: { en: "EZ Bar + Flat Bench", es: "Barra EZ + Banca Plana" },
    description: {
      en: "Lower bar to forehead, extend elbows",
      es: "Baja la barra a la frente, extiende los codos",
    },
    hypertrophyNote: {
      en: "Great stretch under load — but watch elbow health",
      es: "Gran estiramiento con carga — pero cuida la salud del codo",
    },
  },
  {
    id: "tricep-pushdown",
    name: { en: "Tricep Pushdown", es: "Extensiones de Tríceps" },
    category: "cable",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "triceps_lateral", intensity: 3 },
      { muscle: "triceps_medial", intensity: 3 },
      { muscle: "triceps_long", intensity: 2 },
    ],
    equipment: {
      en: "Cable Machine + Bar/Rope",
      es: "Máquina de Poleas + Barra/Cuerda",
    },
    description: {
      en: "Push cable down, extending elbows to lockout",
      es: "Empuja el cable hacia abajo, extendiendo los codos al bloqueo",
    },
    hypertrophyNote: {
      en: "Easy to adjust — good volume builder, not best for heavy loading",
      es: "Fácil de ajustar — buen constructor de volumen, no ideal para carga pesada",
    },
  },
  {
    id: "dips",
    name: { en: "Dips", es: "Fondos" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 3 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
    ],
    equipment: { en: "Dip Bars", es: "Barras de Fondos" },
    description: {
      en: "Lower body by bending elbows, push back up",
      es: "Baja el cuerpo flexionando los codos, empuja hacia arriba",
    },
    hypertrophyNote: {
      en: "Bodyweight compound — add weight for progressive overload",
      es: "Compuesto con peso corporal — agrega peso para sobrecarga progresiva",
    },
  },
];

// ============================================================================
// BACK EXERCISES
// ============================================================================

const BACK_EXERCISES: Exercise[] = [
  {
    id: "deadlift",
    name: { en: "Deadlift", es: "Peso Muerto" },
    category: "compound",
    difficulty: 5,
    hypertrophy: 5,
    muscles: [
      { muscle: "erector_spinae", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "lats_upper", intensity: 2 },
      { muscle: "lats_mid", intensity: 2 },
      { muscle: "traps_upper", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 2 },
      { muscle: "quadriceps", intensity: 1 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Hinge at hips, grip bar, drive through heels",
      es: "Flexión de caderas, agarra la barra, impulsa con los talones",
    },
    hypertrophyNote: {
      en: "Full-body compound — builds mass everywhere simultaneously",
      es: "Compuesto de cuerpo completo — construye masa en todas partes simultáneamente",
    },
  },
  {
    id: "barbell-row",
    name: { en: "Barbell Row", es: "Remo con Barra" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "biceps_short", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 2 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Bent over, pull bar to lower chest",
      es: "Inclinado, jala la barra al pecho bajo",
    },
    hypertrophyNote: {
      en: "Heavy loading for back thickness — key mass builder",
      es: "Carga pesada para espalda ancha — constructor de masa clave",
    },
  },
  {
    id: "pull-ups",
    name: { en: "Pull-ups", es: "Dominadas Pronadas" },
    category: "bodyweight",
    difficulty: 4,
    hypertrophy: 5,
    muscles: [
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "lats_lower", intensity: 2 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "biceps_short", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 2 },
    ],
    equipment: { en: "Pull-up Bar", es: "Barra de Dominadas" },
    description: {
      en: "Overhand grip, pull chin above bar",
      es: "Agarre prono, sube el mentón sobre la barra",
    },
    hypertrophyNote: {
      en: "Ultimate lat builder — add weight for overload",
      es: "Constructor definitivo de dorsales — agrega peso para sobrecarga",
    },
  },
  {
    id: "seated-cable-row",
    name: { en: "Seated Cable Row", es: "Remo en Polea Sentado" },
    category: "cable",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "lats_upper", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "biceps_short", intensity: 2 },
    ],
    equipment: { en: "Cable Machine", es: "Máquina de Poleas" },
    description: {
      en: "Pull handle to abdomen, squeeze shoulder blades",
      es: "Jala la manilla al abdomen, aprieta los omóplatos",
    },
    hypertrophyNote: {
      en: "Constant tension, easy to adjust angle for different back regions",
      es: "Tensión constante, fácil de ajustar ángulo para diferentes zonas de espalda",
    },
  },
  {
    id: "dumbbell-row",
    name: {
      en: "Single-Arm Dumbbell Row",
      es: "Remo con Mancuerna a Un Brazo",
    },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "biceps_short", intensity: 2 },
      { muscle: "traps_mid", intensity: 1 },
    ],
    equipment: { en: "Dumbbell + Bench", es: "Mancuerna + Banca" },
    description: {
      en: "One arm on bench, row dumbbell to hip",
      es: "Un brazo en la banca, rema la mancuerna a la cadera",
    },
    hypertrophyNote: {
      en: "Unilateral — fixes imbalances, deep stretch at bottom",
      es: "Unilateral — corrige desequilibrios, estiramiento profundo abajo",
    },
  },
  {
    id: "lat-pulldown",
    name: { en: "Lat Pulldown", es: "Jalón al Pecho" },
    category: "machine",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "biceps_short", intensity: 2 },
      { muscle: "traps_lower", intensity: 1 },
    ],
    equipment: { en: "Cable Machine", es: "Máquina de Poleas" },
    description: {
      en: "Pull bar down to upper chest",
      es: "Jala la barra hacia el pecho superior",
    },
    hypertrophyNote: {
      en: "Regression of pull-ups — good for volume and beginners",
      es: "Regresión de dominadas — bueno para volumen y principiantes",
    },
  },
  {
    id: "t-bar-row",
    name: { en: "T-Bar Row", es: "Remo T-Bar" },
    category: "machine",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "lats_upper", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "rhomboids", intensity: 1 },
    ],
    equipment: { en: "T-Bar Row Machine", es: "Máquina de Remo T-Bar" },
    description: {
      en: "Straddle the bar, row it toward your chest keeping your back flat, squeeze at the top",
      es: "Monta la barra, rema hacia el pecho manteniendo la espalda recta, aprieta arriba",
    },
    hypertrophyNote: {
      en: "Machine variant of the barbell row — stable torso allows maximal mid-back loading",
      es: "Variante en máquina del remo con barra — torso estable permite máxima carga de espalda media",
    },
  },
  {
    id: "band-pull-apart",
    name: { en: "Band Pull-Apart", es: "Aperturas con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "rhomboids", intensity: 3 },
      { muscle: "posterior_deltoid", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "traps_upper", intensity: 2 },
      { muscle: "biceps_long", intensity: 1 },
    ],
    equipment: { en: "Resistance Band", es: "Banda de Resistencia" },
    description: {
      en: "Hold the band at chest height, pull it apart, squeeze your shoulder blades together",
      es: "Sostén la banda a la altura del pecho, estírala, aprieta los omóplatos",
    },
    hypertrophyNote: {
      en: "Direct rhomboid and rear-delt isolation — excellent prehab and posture work",
      es: "Aislamiento directo de romboides y deltoides posterior — excelente prehab y postura",
    },
  },
];

// ============================================================================
// LEG EXERCISES
// ============================================================================

const LEG_EXERCISES: Exercise[] = [
  {
    id: "barbell-squat",
    name: { en: "Barbell Back Squat", es: "Sentadilla con Barra" },
    category: "compound",
    difficulty: 4,
    hypertrophy: 5,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "adductors", intensity: 2 },
      { muscle: "erector_spinae", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: { en: "Barbell + Squat Rack", es: "Barra + Rack de Sentadilla" },
    description: {
      en: "Bar on upper back, squat to parallel, drive up",
      es: "Barra en la espalda alta, sentadilla a paralelo, impulsa arriba",
    },
    hypertrophyNote: {
      en: "The king of leg exercises — systemic growth stimulus",
      es: "El rey de los ejercicios de piernas — estímulo de crecimiento sistémico",
    },
  },
  {
    id: "front-squat",
    name: { en: "Front Squat", es: "Sentadilla Frontal" },
    category: "compound",
    difficulty: 5,
    hypertrophy: 5,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "adductors", intensity: 2 },
      { muscle: "erector_spinae", intensity: 1 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: { en: "Barbell + Squat Rack", es: "Barra + Rack de Sentadilla" },
    description: {
      en: "Bar on front delts, squat deep, keep torso upright",
      es: "Barra en deltoides anteriores, sentadilla profunda, torso erguido",
    },
    hypertrophyNote: {
      en: "Quadriceps dominant — deeper ROM than back squat",
      es: "Dominante de cuádriceps — ROM más profundo que sentadilla trasera",
    },
  },
  {
    id: "romanian-deadlift",
    name: { en: "Romanian Deadlift", es: "Peso Muerto Rumano" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "erector_spinae", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 1 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Hinge at hips, slight knee bend, feel hamstring stretch",
      es: "Flexión de caderas, ligera flexión de rodilla, siente el estiramiento de isquios",
    },
    hypertrophyNote: {
      en: "Best hamstring stretch under load — eccentric focus",
      es: "Mejor estiramiento de isquios con carga — enfoque excéntrico",
    },
  },
  {
    id: "leg-press",
    name: { en: "Leg Press", es: "Prensa de Piernas" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "adductors", intensity: 1 },
    ],
    equipment: { en: "Leg Press Machine", es: "Máquina de Prensa" },
    description: {
      en: "Push platform away with legs",
      es: "Empuja la plataforma con las piernas",
    },
    hypertrophyNote: {
      en: "Safe heavy loading without spinal compression",
      es: "Carga pesada segura sin compresión espinal",
    },
  },
  {
    id: "lunges",
    name: { en: "Walking Lunges", es: "Zancadas Caminando" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "adductors", intensity: 1 },
    ],
    equipment: { en: "Dumbbells", es: "Mancuernas" },
    description: {
      en: "Step forward, lower back knee toward floor",
      es: "Da un paso al frente, baja la rodilla trasera hacia el suelo",
    },
    hypertrophyNote: {
      en: "Unilateral — fixes imbalances + deep stretch under load",
      es: "Unilateral — corrige desequilibrios + estiramiento profundo con carga",
    },
  },
  {
    id: "leg-curl",
    name: { en: "Lying Leg Curl", es: "Curl de Piernas Acostado" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: { en: "Leg Curl Machine", es: "Máquina de Curl de Piernas" },
    description: {
      en: "Lying face down, curl legs up against resistance",
      es: "Acostado boca abajo, curla las piernas contra resistencia",
    },
    hypertrophyNote: {
      en: "Isolation for hamstrings — targets knee flexion function",
      es: "Aislamiento para isquios — enfocado en función de flexión de rodilla",
    },
  },
  {
    id: "leg-extension",
    name: { en: "Leg Extension", es: "Extensión de Piernas" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [{ muscle: "quadriceps", intensity: 3 }],
    equipment: { en: "Leg Extension Machine", es: "Máquina de Extensión" },
    description: {
      en: "Extend legs against resistance from seated position",
      es: "Extiende las piernas contra resistencia desde posición sentado",
    },
    hypertrophyNote: {
      en: "Isolation for rectus femoris — peak contraction at top",
      es: "Aislamiento para recto femoral — contracción pico arriba",
    },
  },
  {
    id: "hip-thrust",
    name: { en: "Barbell Hip Thrust", es: "Empuje de Cadera con Barra" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "adductors", intensity: 1 },
    ],
    equipment: { en: "Barbell + Bench", es: "Barra + Banca" },
    description: {
      en: "Back on bench, drive hips up with barbell",
      es: "Espalda en la banca, impulsa las caderas arriba con la barra",
    },
    hypertrophyNote: {
      en: "Peak glute contraction — the best glute exercise",
      es: "Contracción pico de glúteos — el mejor ejercicio para glúteos",
    },
  },
  {
    id: "lying-hip-abduction",
    name: {
      en: "Side-Lying Hip Abduction",
      es: "Abducción de Cadera Acostado",
    },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "gluteus_medius", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 1 },
    ],
    equipment: {
      en: "Mat (ankle weight optional)",
      es: "Colchoneta (tobillera opcional)",
    },
    description: {
      en: "Lie on your side, lift the top leg keeping hips stacked, lower slowly",
      es: "Acuéstate de lado, eleva la pierna superior manteniendo las caderas alineadas, baja lentamente",
    },
    hypertrophyNote: {
      en: "Direct gluteus medius isolation — key for hip stability and a fuller glute shelf",
      es: "Aislamiento directo del glúteo medio — clave para la estabilidad de cadera y un glúteo más completo",
    },
  },
  {
    id: "calf-raises",
    name: { en: "Standing Calf Raises", es: "Elevación de Talones de Pie" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "calves", intensity: 3 },
      { muscle: "tibialis_anterior", intensity: 1 },
    ],
    equipment: {
      en: "Calf Raise Machine",
      es: "Máquina de Elevación de Talones",
    },
    description: {
      en: "Rise onto toes, full stretch at bottom, squeeze at top",
      es: "Eleva sobre las puntas, estiramiento completo abajo, aprieta arriba",
    },
    hypertrophyNote: {
      en: "Calves need high reps + full ROM — be patient",
      es: "Pantorrillas necesitan altas repeticiones + ROM completo — sé paciente",
    },
  },
  {
    id: "seated-calf-raise",
    name: { en: "Seated Calf Raise", es: "Elevación de Talones Sentado" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "soleus", intensity: 3 },
      { muscle: "calves", intensity: 2 },
    ],
    equipment: {
      en: "Seated Calf Raise Machine",
      es: "Máquina de Elevación Sentado",
    },
    description: {
      en: "Seated with weight on knees, rise onto toes, stretch fully at the bottom",
      es: "Sentado con peso sobre las rodillas, eleva las puntas, estira completamente abajo",
    },
    hypertrophyNote: {
      en: "Bent knee shifts the load to the soleus — the muscle that adds calf width",
      es: "La rodilla flexionada traslada la carga al sóleo — el músculo que da anchura a la pantorrilla",
    },
  },
  {
    id: "tibialis-raise",
    name: { en: "Tibialis Raise", es: "Elevación de Tibial Anterior" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "tibialis_anterior", intensity: 3 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: {
      en: "Resistance Band / Plate",
      es: "Banda de Resistencia / Disco",
    },
    description: {
      en: "Sit with a weight on your toes, dorsiflex the ankle upward against resistance",
      es: "Sentado con un peso sobre los dedos, flexiona el tobillo hacia arriba contra resistencia",
    },
    hypertrophyNote: {
      en: "Direct tibialis isolation — balances the calf and protects the shins",
      es: "Aislamiento directo del tibial — equilibra la pantorrilla y protege las espinillas",
    },
  },
  {
    id: "goblet-squat",
    name: { en: "Goblet Squat", es: "Sentadilla Copa" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "adductors", intensity: 2 },
      { muscle: "erector_spinae", intensity: 1 },
    ],
    equipment: { en: "Dumbbell / Kettlebell", es: "Mancuerna / Pesa Rusa" },
    description: {
      en: "Hold the weight against your chest, squat to depth keeping your torso upright",
      es: "Sostén el peso contra el pecho, baja a profundidad manteniendo el torso erguido",
    },
    hypertrophyNote: {
      en: "Dumbbell variant of the squat — the front load teaches posture and hits the quads hard",
      es: "Variante con mancuerna de la sentadilla — la carga frontal enseña postura y trabaja los cuádriceps fuerte",
    },
  },
  {
    id: "hack-squat",
    name: { en: "Hack Squat", es: "Sentadilla en Máquina (Hack)" },
    category: "machine",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "adductors", intensity: 2 },
    ],
    equipment: { en: "Hack Squat Machine", es: "Máquina Hack de Sentadilla" },
    description: {
      en: "Back against the sled, lower until thighs are parallel, drive up through the heels",
      es: "Espalda contra el trineo, baja hasta paralelo, impulsa arriba con los talones",
    },
    hypertrophyNote: {
      en: "Machine squat variant — fixed path lets you take the quads to failure safely",
      es: "Variante en máquina de sentadilla — trayectoria fija permite llevar los cuádriceps al fallo con seguridad",
    },
  },
  {
    id: "seated-leg-curl",
    name: { en: "Seated Leg Curl", es: "Curl de Piernas Sentado" },
    category: "machine",
    difficulty: 1,
    hypertrophy: 4,
    muscles: [
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: { en: "Seated Leg Curl Machine", es: "Máquina de Curl Sentado" },
    description: {
      en: "Seated, curl the pads down against resistance, return with control",
      es: "Sentado, flexiona los apoyos hacia abajo contra resistencia, regresa con control",
    },
    hypertrophyNote: {
      en: "Seated variant of the leg curl — the hip-flexed position biases the hamstrings differently",
      es: "Variante sentado del curl — la cadera flexionada cambia el énfasis en los isquios",
    },
  },
  {
    id: "sumo-squat",
    name: { en: "Sumo Squat", es: "Sentadilla Sumo" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 5,
    muscles: [
      { muscle: "adductors", intensity: 3 },
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "hamstrings", intensity: 1 },
    ],
    equipment: { en: "Barbell / Dumbbell", es: "Barra / Mancuerna" },
    description: {
      en: "Wide stance with toes turned out, squat to depth, drive up through the whole foot",
      es: "Postura amplia con puntas hacia afuera, baja a profundidad, impulsa arriba con todo el pie",
    },
    hypertrophyNote: {
      en: "The wide stance recruits the adductors hard — the most underdeveloped leg muscle",
      es: "La postura amplia recluta fuerte los aductores — el músculo de pierna más descuidado",
    },
  },
  {
    id: "banded-hip-abduction",
    name: {
      en: "Standing Band Hip Abduction",
      es: "Abducción de Cadera con Banda",
    },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "gluteus_medius", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 1 },
    ],
    equipment: {
      en: "Resistance Band (ankle)",
      es: "Banda de Resistencia (tobillo)",
    },
    description: {
      en: "Band around the ankles, lift one leg out to the side, lower with control",
      es: "Banda en los tobillos, eleva una pierna hacia el lado, baja con control",
    },
    hypertrophyNote: {
      en: "Gluteus medius isolation — builds the upper-glute shelf and hip stability",
      es: "Aislamiento del glúteo medio — construye la zona alta del glúteo y estabilidad de cadera",
    },
  },
  {
    id: "clamshells",
    name: { en: "Clamshells", es: "Almejas" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "gluteus_medius", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 1 },
    ],
    equipment: { en: "Mat (band optional)", es: "Colchoneta (banda opcional)" },
    description: {
      en: "Lie on your side with knees bent, open the top knee like a clamshell, close slowly",
      es: "Acuéstate de lado con rodillas flexionadas, abre la rodilla superior como una almeja, cierra lento",
    },
    hypertrophyNote: {
      en: "Beginner-friendly gluteus medius isolation — perfect for activation work",
      es: "Aislamiento del glúteo medio para principiantes — perfecto para activación",
    },
  },
  {
    id: "fire-hydrants",
    name: { en: "Fire Hydrants", es: "Bomberos" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "gluteus_medius", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
    ],
    equipment: { en: "Mat (band optional)", es: "Colchoneta (banda opcional)" },
    description: {
      en: "On all fours, lift one bent knee out to the side to hip height, lower with control",
      es: "En cuatro patas, eleva una rodilla flexionada hacia el lado a la altura de la cadera, baja con control",
    },
    hypertrophyNote: {
      en: "Combines abduction and extension — hits the medius and the upper glute",
      es: "Combina abducción y extensión — trabaja el medio y la parte alta del glúteo",
    },
  },
  {
    id: "standing-cable-adduction",
    name: { en: "Standing Cable Adduction", es: "Aducción de Cadera en Polea" },
    category: "cable",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "adductors", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 1 },
    ],
    equipment: {
      en: "Cable Machine + Ankle Strap",
      es: "Máquina de Poleas + Tobillera",
    },
    description: {
      en: "Ankle strap on the cable, sweep the leg across your body, return with control",
      es: "Tobillera en la polea, barre la pierna a través del cuerpo, regresa con control",
    },
    hypertrophyNote: {
      en: "Cable adduction — constant tension through the full inner-thigh range",
      es: "Aducción en polea — tensión constante en todo el recorrido del muslo interno",
    },
  },
  {
    id: "lying-leg-raise",
    name: { en: "Lying Leg Raise", es: "Elevación de Piernas Acostado" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "iliopsoas", intensity: 3 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "quadriceps", intensity: 1 },
    ],
    equipment: { en: "Mat", es: "Colchoneta" },
    description: {
      en: "Lie flat, raise your legs to vertical with control, lower them slowly without arching the back",
      es: "Acostado plano, eleva las piernas a vertical con control, bájalas lento sin arquear la espalda",
    },
    hypertrophyNote: {
      en: "Hip-flexion dominant — trains the iliopsoas and lower abs through a long range",
      es: "Dominante en flexión de cadera — entrena el iliopsoas y el abdomen bajo en un rango largo",
    },
  },
];

// ============================================================================
// ARM EXERCISES (Forearms)
// ============================================================================

const FOREARM_EXERCISES: Exercise[] = [
  {
    id: "wrist-curl",
    name: { en: "Wrist Curl", es: "Curl de Muñeca" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "forearm_flexors", intensity: 3 },
      { muscle: "biceps_long", intensity: 1 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Forearms on thighs, palms up, curl wrists up",
      es: "Antebrazos en los muslos, palmas arriba, curla las muñecas",
    },
    hypertrophyNote: {
      en: "Direct forearm isolation — often neglected",
      es: "Aislamiento directo de antebrazos — a menudo negligido",
    },
  },
  {
    id: "reverse-wrist-curl",
    name: { en: "Reverse Wrist Curl", es: "Curl Inverso de Muñeca" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "forearm_extensors", intensity: 3 },
      { muscle: "brachioradialis", intensity: 1 },
    ],
    equipment: { en: "Barbell", es: "Barra" },
    description: {
      en: "Palms down, curl wrists up",
      es: "Palmas hacia abajo, curla las muñecas hacia arriba",
    },
    hypertrophyNote: {
      en: "Targets extensor balance — prevents elbow issues",
      es: "Enfocado en balance de extensores — previene problemas de codo",
    },
  },
  {
    id: "farmers-walk",
    name: { en: "Farmer's Walk", es: "Caminata del Granjero" },
    category: "compound",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "forearm_flexors", intensity: 3 },
      { muscle: "brachioradialis", intensity: 3 },
      { muscle: "traps_upper", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: {
      en: "Heavy Dumbbells/Kettlebells",
      es: "Mancuernas/Pesos Rusos Pesados",
    },
    description: {
      en: "Hold heavy weights and walk with good posture",
      es: "Sostén pesos pesados y camina con buena postura",
    },
    hypertrophyNote: {
      en: "Grip + traps + core — functional mass builder",
      es: "Agarre + trapecios + core — constructor de masa funcional",
    },
  },
];

// ============================================================================
// CORE EXERCISES
// ============================================================================

const CORE_EXERCISES: Exercise[] = [
  {
    id: "cable-crunch",
    name: { en: "Cable Crunch", es: "Abdominales en Polea" },
    category: "cable",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "obliques", intensity: 1 },
    ],
    equipment: {
      en: "Cable Machine + Kneeling Pad",
      es: "Máquina de Poleas + Rodillera",
    },
    description: {
      en: "Kneel, crunch down pulling cable behind head",
      es: "Arrodíllate, crunch hacia abajo jalando el cable detrás de la cabeza",
    },
    hypertrophyNote: {
      en: "Add weight to abs! — the only ab exercise that scales",
      es: "¡Agrega peso a los abdominales! — el único ejercicio que progresa en carga",
    },
  },
  {
    id: "hanging-leg-raise",
    name: { en: "Hanging Leg Raise", es: "Elevación de Piernas Colgado" },
    category: "bodyweight",
    difficulty: 4,
    hypertrophy: 4,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "obliques", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 1 },
    ],
    equipment: { en: "Pull-up Bar", es: "Barra de Dominadas" },
    description: {
      en: "Hang from bar, raise legs to 90° or higher",
      es: "Cuélgate de la barra, eleva las piernas a 90° o más",
    },
    hypertrophyNote: {
      en: "Full range of motion under bodyweight — high difficulty, high reward",
      es: "ROM completo con peso corporal — alta dificultad, alta recompensa",
    },
  },
  {
    id: "russian-twist",
    name: { en: "Russian Twist", es: "Giros Rusos" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "obliques", intensity: 3 },
      { muscle: "rectus_abdominis", intensity: 2 },
    ],
    equipment: { en: "Bodyweight / Weight", es: "Peso corporal / Peso" },
    description: {
      en: "Lean back, rotate torso side to side",
      es: "Inclínate hacia atrás, rota el torso de lado a lado",
    },
    hypertrophyNote: {
      en: "Rotation pattern — often undertrained movement",
      es: "Patrón de rotación — movimiento a menudo subentrenado",
    },
  },
  {
    id: "plank",
    name: { en: "Plank", es: "Plancha" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "obliques", intensity: 2 },
      { muscle: "erector_spinae", intensity: 1 },
      { muscle: "anterior_deltoid", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Hold body straight on forearms and toes",
      es: "Mantén el cuerpo recto sobre los antebrazos y puntas de los pies",
    },
    hypertrophyNote: {
      en: "Isometric — good for stability, limited hypertrophy stimulus",
      es: "Isométrico — bueno para estabilidad, estímulo limitado de hipertrofia",
    },
  },
];

// ============================================================================
// ALL EXERCISES
// ============================================================================

export const ALL_EXERCISES: Exercise[] = [
  ...CHEST_EXERCISES,
  ...SHOULDER_EXERCISES,
  ...BICEPS_EXERCISES,
  ...TRICEPS_EXERCISES,
  ...BACK_EXERCISES,
  ...LEG_EXERCISES,
  ...FOREARM_EXERCISES,
  ...CORE_EXERCISES,
  ...HOME_PUSH_PULL_EXERCISES,
  ...HOME_LEG_EXERCISES,
  ...HOME_CORE_EXERCISES,
  ...CARDIO_EXERCISES,
];

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/** Get all exercises that target a specific muscle */
export function getExercisesForMuscle(muscle: MuscleGroup): Exercise[] {
  return ALL_EXERCISES.filter((ex) =>
    ex.muscles.some((m) => m.muscle === muscle),
  );
}

/** Look up one exercise by id (null when unknown — forward compatible). */
export function getExerciseById(id: string): Exercise | null {
  return ALL_EXERCISES.find((ex) => ex.id === id) ?? null;
}

/** Get the intensity of a muscle in a specific exercise */
export function getMuscleIntensity(
  exercise: Exercise,
  muscle: MuscleGroup,
): 0 | 1 | 2 | 3 {
  const involvement = exercise.muscles.find((m) => m.muscle === muscle);
  return involvement?.intensity ?? 0;
}

/** Get all muscles involved in an exercise, sorted by intensity */
export function getMusclesForExercise(exercise: Exercise): MuscleInvolvement[] {
  return [...exercise.muscles].sort((a, b) => b.intensity - a.intensity);
}

/** Get exercises by category */
export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return ALL_EXERCISES.filter((ex) => ex.category === category);
}

/** Get difficulty label */
export function getDifficultyLabel(
  difficulty: 1 | 2 | 3 | 4 | 5,
  lang: "en" | "es",
): string {
  const labels = {
    en: ["", "Beginner", "Intermediate", "Advanced", "Hard", "Expert"],
    es: ["", "Principiante", "Intermedio", "Avanzado", "Difícil", "Experto"],
  };
  return labels[lang][difficulty];
}

/** Get hypertrophy label */
export function getHypertrophyLabel(
  hypertrophy: 1 | 2 | 3 | 4 | 5,
  lang: "en" | "es",
): string {
  const labels = {
    en: ["", "Low", "Moderate", "Good", "High", "Maximum"],
    es: ["", "Bajo", "Moderado", "Bueno", "Alto", "Máximo"],
  };
  return labels[lang][hypertrophy];
}

/** Get intensity color for a muscle involvement level */
export function getIntensityColor(intensity: 0 | 1 | 2 | 3): string {
  switch (intensity) {
    case 3:
      return "#4f46e5"; // Indigo — primary
    case 2:
      return "#818cf8"; // Light indigo — secondary
    case 1:
      return "#c7d2fe"; // Very light indigo — synergist
    default:
      return "transparent";
  }
}

/** Get intensity label */
export function getIntensityLabel(
  intensity: 0 | 1 | 2 | 3,
  lang: "en" | "es",
): string {
  const labels = {
    en: ["", "Synergist", "Secondary", "Primary"],
    es: ["", "Sinergista", "Secundario", "Primario"],
  };
  return labels[lang][intensity];
}

/** Get hypertrophy color for rating (1-5) */
export function getHypertrophyColor(rating: number): string {
  if (rating >= 5) return "#10b981"; // Emerald — maximum
  if (rating >= 4) return "#22c55e"; // Green — high
  if (rating >= 3) return "#f59e0b"; // Amber — moderate
  if (rating >= 2) return "#f97316"; // Orange — low
  return "#ef4444"; // Red — minimal
}

/** Get technical difficulty color (1-5) */
export function getDifficultyColor(rating: number): string {
  if (rating >= 5) return "#ef4444"; // Red — expert
  if (rating >= 4) return "#f97316"; // Orange — hard
  if (rating >= 3) return "#f59e0b"; // Amber — advanced
  if (rating >= 2) return "#22c55e"; // Green — intermediate
  return "#10b981"; // Emerald — beginner
}

/** Get the best hypertrophy exercises across all muscles */
export function getBestHypertrophyExercises(limit: number = 5): Exercise[] {
  return [...ALL_EXERCISES]
    .sort(
      (a, b) => b.hypertrophy - a.hypertrophy || b.difficulty - a.difficulty,
    )
    .slice(0, limit);
}
