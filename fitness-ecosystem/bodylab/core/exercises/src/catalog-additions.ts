/**
 * Catalog additions — the home-gym and conditioning half of the database.
 *
 * The original 64 exercises assumed a full gym (barbells, racks, cables,
 * selector machines). This block adds what a real home setup needs — a
 * pull-up bar, dip bars/parallel bars, adjustable dumbbells, bands, a bench or
 * box, an ab wheel, stairs — plus honest CARDIO entries (a mountain bike is
 * equipment too), which the database had none of despite the app tracking
 * conditioning.
 *
 * Split out of `catalog.ts` to keep that file focused on the original data.
 * Types are imported type-only so there is no runtime import cycle.
 *
 * @module catalog-additions
 */

import type { Exercise } from "./catalog";

// ============================================================================
// HOME PULL / PUSH — bar, dumbbells, bands
// ============================================================================

export const HOME_PUSH_PULL_EXERCISES: Exercise[] = [
  {
    id: "inverted-row",
    name: {
      en: "Inverted Row (Australian Pull-up)",
      es: "Remo Invertido (Dominada Australiana)",
    },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "rhomboids", intensity: 3 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "posterior_deltoid", intensity: 2 },
      { muscle: "biceps_long", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: {
      en: "Low bar / Dip Bars / Table edge",
      es: "Barra baja / Paralelas / Borde de mesa",
    },
    description: {
      en: "Hang under a low bar with straight legs, pull your chest to the bar, lower under control",
      es: "Cuélgate bajo una barra baja con piernas rectas, lleva el pecho a la barra, baja controlado",
    },
    hypertrophyNote: {
      en: "The best horizontal pull you can do at home — progress by lowering the bar or elevating your feet",
      es: "El mejor jalón horizontal que puedes hacer en casa — progresas bajando la barra o subiendo los pies",
    },
  },
  {
    id: "pike-push-up",
    name: { en: "Pike Push-up", es: "Flexión Pike (Vertical)" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "anterior_deltoid", intensity: 3 },
      { muscle: "lateral_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "traps_upper", intensity: 2 },
      { muscle: "chest_upper", intensity: 2 },
    ],
    equipment: {
      en: "Bodyweight (wall optional)",
      es: "Peso corporal (pared opcional)",
    },
    description: {
      en: "Hips high in a downward-dog position, lower the crown of your head between your hands, press back up",
      es: "Cadera alta en posición de perro boca abajo, baja la coronilla entre las manos, empuja de vuelta",
    },
    hypertrophyNote: {
      en: "The vertical press you can do without a barbell — the whole front delt and triceps",
      es: "El press vertical que puedes hacer sin barra — todo el deltoides frontal y tríceps",
    },
  },
  {
    id: "diamond-push-up",
    name: { en: "Diamond Push-up", es: "Flexión Diamante" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 2 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "chest_upper", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Hands together under the chest forming a diamond, elbows close to the body, press up",
      es: "Manos juntas bajo el pecho formando un rombo, codos pegados al cuerpo, empuja arriba",
    },
    hypertrophyNote: {
      en: "Bodyweight triceps overload with almost no elbow-friendly load ceiling",
      es: "Sobrecarga de tríceps con peso corporal y un techo de carga amable con el codo",
    },
  },
  {
    id: "bench-dip",
    name: { en: "Bench Dip", es: "Fondos en Banco" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "anterior_deltoid", intensity: 2 },
      { muscle: "chest_lower", intensity: 2 },
    ],
    equipment: { en: "Bench / Box / Chair", es: "Banco / Cajón / Silla" },
    description: {
      en: "Hands on the edge behind you, lower the hips until the elbows reach 90°, press back up",
      es: "Manos en el borde por detrás, baja la cadera hasta 90° de codo, empuja de vuelta",
    },
    hypertrophyNote: {
      en: "Unilateral-free triceps work with zero equipment beyond a bench; add a plate on the lap",
      es: "Tríceps sin material más allá de un banco; añade un disco sobre el regazo",
    },
  },
  {
    id: "band-chest-press",
    name: { en: "Band Chest Press", es: "Press de Pecho con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "chest_upper", intensity: 3 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
      { muscle: "triceps_long", intensity: 2 },
    ],
    equipment: {
      en: "Resistance Band (door anchor)",
      es: "Banda de Resistencia (anclaje a puerta)",
    },
    description: {
      en: "Anchor the band behind you, press both handles forward and squeeze the chest, return slowly",
      es: "Ancla la banda por detrás, empuja ambos mangos al frente y aprieta el pecho, regresa lento",
    },
    hypertrophyNote: {
      en: "Tensión is highest where the fibres are shortest — great finisher when dumbbells are too heavy",
      es: "La tensión es máxima al final del recorrido — gran finalizador cuando las mancuernas son mucho",
    },
  },
  {
    id: "band-row",
    name: { en: "Band Row", es: "Remo con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "lats_mid", intensity: 3 },
      { muscle: "rhomboids", intensity: 3 },
      { muscle: "posterior_deltoid", intensity: 2 },
      { muscle: "traps_mid", intensity: 2 },
      { muscle: "biceps_long", intensity: 2 },
    ],
    equipment: { en: "Resistance Band", es: "Banda de Resistencia" },
    description: {
      en: "Step on or anchor the band, pull the handles to your ribs, pause, return under control",
      es: "Pisa o ancla la banda, jala los mangos a las costillas, pausa, regresa controlado",
    },
    hypertrophyNote: {
      en: "Home cable-row substitute: scalable by band thickness and step distance",
      es: "Sustituto casero del remo en polea: escalas por grosor de banda y distancia del pie",
    },
  },
  {
    id: "band-face-pull",
    name: { en: "Band Face Pull", es: "Jalón a la Cara con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "posterior_deltoid", intensity: 3 },
      { muscle: "traps_mid", intensity: 3 },
      { muscle: "traps_lower", intensity: 2 },
      { muscle: "rhomboids", intensity: 2 },
    ],
    equipment: { en: "Resistance Band", es: "Banda de Resistencia" },
    description: {
      en: "Anchor at face height, pull towards your forehead while rotating the hands outward",
      es: "Ancla a la altura de la cara, jala hacia la frente rotando las manos hacia fuera",
    },
    hypertrophyNote: {
      en: "The shoulder-health staple: rear delt + lower traps without any machine",
      es: "El básico de salud de hombro: deltoides posterior y trapecio inferior sin máquinas",
    },
  },
  {
    id: "band-triceps-pushdown",
    name: { en: "Band Triceps Pushdown", es: "Extensión de Tríceps con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "triceps_long", intensity: 3 },
      { muscle: "triceps_lateral", intensity: 2 },
      { muscle: "triceps_medial", intensity: 2 },
    ],
    equipment: { en: "Resistance Band", es: "Banda de Resistencia" },
    description: {
      en: "Anchor the band high, elbows pinned to your sides, extend the arms fully and squeeze",
      es: "Ancla la banda arriba, codos pegados al torso, extiende los brazos del todo y aprieta",
    },
    hypertrophyNote: {
      en: "Cable pushdown substitute with peak tension at full extension",
      es: "Sustituto casero del pushdown, con tensión máxima en extensión completa",
    },
  },
  {
    id: "band-curl",
    name: { en: "Band Curl", es: "Curl con Banda" },
    category: "isolation",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "biceps_long", intensity: 3 },
      { muscle: "biceps_short", intensity: 3 },
      { muscle: "forearm_flexors", intensity: 2 },
    ],
    equipment: { en: "Resistance Band", es: "Banda de Resistencia" },
    description: {
      en: "Stand on the band, curl the handles to the shoulders, lower slowly against the tension",
      es: "Pisa la banda, sube los mangos a los hombros, baja lento contra la tensión",
    },
    hypertrophyNote: {
      en: "Light, joint-friendly biceps volume — perfect as a filler between heavy sets",
      es: "Volumen de bíceps ligero y amable con el codo — perfecto entre series pesadas",
    },
  },
  {
    id: "scapular-pull-up",
    name: { en: "Scapular Pull-up", es: "Dominada Escapular" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 2,
    muscles: [
      { muscle: "lats_upper", intensity: 3 },
      { muscle: "traps_lower", intensity: 3 },
      { muscle: "rhomboids", intensity: 2 },
      { muscle: "forearm_flexors", intensity: 2 },
    ],
    equipment: { en: "Pull-up Bar", es: "Barra de Dominadas" },
    description: {
      en: "Hang straight-armed, then pull the shoulder blades down without bending the elbows, hold 1s",
      es: "Cuélgate con brazos rectos, baja las escápulas sin flexionar codos, aguanta 1s",
    },
    hypertrophyNote: {
      en: "Teaches the scapular control that every pull-up and press depends on",
      es: "Enseña el control escapular del que dependen todas las dominadas y presses",
    },
  },
  {
    id: "prone-y-raise",
    name: { en: "Prone Y-Raise", es: "Elevación en Y Boca Abajo" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "traps_lower", intensity: 3 },
      { muscle: "posterior_deltoid", intensity: 2 },
      { muscle: "rhomboids", intensity: 2 },
      { muscle: "serratus_anterior", intensity: 1 },
    ],
    equipment: {
      en: "Bodyweight (mat optional)",
      es: "Peso corporal (colchoneta opcional)",
    },
    description: {
      en: "Face down, arms overhead as a Y, lift them off the floor squeezing the shoulder blades, hold 2s",
      es: "Boca abajo, brazos por encima formando una Y, levántalos del suelo juntando escápulas, aguanta 2s",
    },
    hypertrophyNote: {
      en: "Posture insurance: trains the lower traps that desk work switches off",
      es: "Seguro postural: entrena el trapecio inferior que el trabajo de oficina apaga",
    },
  },
  {
    id: "suitcase-carry",
    name: { en: "Suitcase Carry", es: "Paseo del Maletín" },
    category: "compound",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "obliques", intensity: 3 },
      { muscle: "forearm_flexors", intensity: 3 },
      { muscle: "traps_upper", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "gluteus_medius", intensity: 1 },
    ],
    equipment: { en: "Dumbbell / Kettlebell", es: "Mancuerna / Pesa Rusa" },
    description: {
      en: "Hold one heavy weight at your side and walk tall without leaning or letting the shoulder drop",
      es: "Lleva un peso pesado al lado y camina erguido sin inclinarte ni dejar caer el hombro",
    },
    hypertrophyNote: {
      en: "Grip and anti-lateral core in one movement — the loaded carry that needs one dumbbell",
      es: "Agarre y core anti-lateral en un solo movimiento — con una sola mancuerna",
    },
  },
];

// ============================================================================
// HOME LEGS — dumbbells, bench/box, straps
// ============================================================================

export const HOME_LEG_EXERCISES: Exercise[] = [
  {
    id: "single-leg-rdl",
    name: {
      en: "Single-Leg Romanian Deadlift",
      es: "Peso Muerto Rumano a Una Pierna",
    },
    category: "compound",
    difficulty: 3,
    hypertrophy: 4,
    muscles: [
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "erector_spinae", intensity: 2 },
      { muscle: "gluteus_medius", intensity: 2 },
      { muscle: "adductors", intensity: 1 },
    ],
    equipment: { en: "Dumbbell / Kettlebell", es: "Mancuerna / Pesa Rusa" },
    description: {
      en: "Hinge forward on one leg with the other pointing behind you, keep the hips square, return by squeezing the glute",
      es: "Bisagra sobre una pierna con la otra apuntando atrás, cadera cuadrada, vuelve apretando el glúteo",
    },
    hypertrophyNote: {
      en: "Doubles the hamstring stimulus of a light dumbbell and trains balance and glute medius",
      es: "Duplica el estímulo de isquios con una mancuerna ligera y entrena equilibrio y glúteo medio",
    },
  },
  {
    id: "bulgarian-split-squat",
    name: { en: "Bulgarian Split Squat", es: "Sentadilla Búlgara" },
    category: "compound",
    difficulty: 3,
    hypertrophy: 5,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "gluteus_medius", intensity: 2 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "adductors", intensity: 1 },
    ],
    equipment: { en: "Dumbbells + Bench/Box", es: "Mancuernas + Banco/Cajón" },
    description: {
      en: "Rear foot on the bench, drop straight down until the front thigh is parallel, drive through the front foot",
      es: "Pie trasero en el banco, baja en vertical hasta que el muslo delantero quede paralelo, empuja con el pie delantero",
    },
    hypertrophyNote: {
      en: "The single best quad builder when all you own is a pair of dumbbells",
      es: "El mejor constructor de cuádriceps cuando solo tienes mancuernas",
    },
  },
  {
    id: "step-up",
    name: { en: "Step-up", es: "Subida al Cajón" },
    category: "compound",
    difficulty: 2,
    hypertrophy: 4,
    muscles: [
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_medius", intensity: 2 },
      { muscle: "calves", intensity: 1 },
    ],
    equipment: {
      en: "Box / Bench + Dumbbells",
      es: "Cajón / Banco + Mancuernas",
    },
    description: {
      en: "Step onto the box driving through the whole foot, stand tall, lower with control — no pushing off the back leg",
      es: "Sube al cajón empujando con todo el pie, extiende la cadera, baja controlado sin ayudarte con la pierna de atrás",
    },
    hypertrophyNote: {
      en: "Knee-friendly leg volume you can dose with box height when weights run out",
      es: "Volumen de pierna amable con la rodilla, dosificable subiendo el cajón",
    },
  },
  {
    id: "nordic-curl",
    name: { en: "Nordic Hamstring Curl", es: "Curl Nórdico de Isquios" },
    category: "compound",
    difficulty: 5,
    hypertrophy: 4,
    muscles: [
      { muscle: "hamstrings", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "calves", intensity: 1 },
      { muscle: "erector_spinae", intensity: 1 },
    ],
    equipment: {
      en: "Nordic strap / anchored feet",
      es: "Correa nórdica / pies anclados",
    },
    description: {
      en: "Kneel with the ankles anchored, lower the torso as slowly as possible, catch yourself with the hands",
      es: "De rodillas con los tobillos anclados, baja el torso lo más lento posible, frénalo con las manos",
    },
    hypertrophyNote: {
      en: "Elite hamstring eccentric with zero weight — and the best injury-prevention tool there is",
      es: "Excéntrico de elite para isquios sin peso — y la mejor herramienta de prevención de lesiones",
    },
  },
  {
    id: "copenhagen-plank",
    name: { en: "Copenhagen Plank", es: "Plancha Copenhague" },
    category: "bodyweight",
    difficulty: 3,
    hypertrophy: 2,
    muscles: [
      { muscle: "adductors", intensity: 3 },
      { muscle: "obliques", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "gluteus_medius", intensity: 1 },
    ],
    equipment: { en: "Bench / Box", es: "Banco / Cajón" },
    description: {
      en: "Side plank with the top leg resting on the bench, lift the hips and squeeze the inner thigh",
      es: "Plancha lateral con la pierna de arriba apoyada en el banco, sube la cadera y aprieta el aductor",
    },
    hypertrophyNote: {
      en: "The only serious adductor exercise that needs no machine — groin-injury insurance",
      es: "El único ejercicio serio de aductores que no necesita máquina — seguro anti-lesión de ingle",
    },
  },
  {
    id: "single-leg-calf-raise",
    name: {
      en: "Single-Leg Calf Raise",
      es: "Elevación de Talones a Una Pierna",
    },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "calves", intensity: 3 },
      { muscle: "soleus", intensity: 2 },
      { muscle: "tibialis_anterior", intensity: 1 },
    ],
    equipment: {
      en: "Bodyweight (step optional)",
      es: "Peso corporal (escalón opcional)",
    },
    description: {
      en: "Stand on one foot, rise to the ball of the foot, pause at the top, lower until the heel is below the step",
      es: "Sobre un pie, sube a la punta, pausa arriba, baja hasta que el talón quede bajo el escalón",
    },
    hypertrophyNote: {
      en: "Full calf stimulus without a machine — the full body weight on one leg",
      es: "Estímulo completo de pantorrilla sin máquina — todo el peso en una pierna",
    },
  },
];

// ============================================================================
// HOME CORE
// ============================================================================

export const HOME_CORE_EXERCISES: Exercise[] = [
  {
    id: "hollow-body-hold",
    name: { en: "Hollow Body Hold", es: "Hueco (Hollow Body)" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 3,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 2 },
      { muscle: "obliques", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Lie down, press the lower back into the floor, lift shoulders and legs, hold the position breathing shallow",
      es: "Tumbado, pega la zona lumbar al suelo, levanta hombros y piernas, aguanta respirando corto",
    },
    hypertrophyNote: {
      en: "Trains the rectus the way it actually works: keeping the ribcage and pelvis together",
      es: "Entrena el recto como realmente trabaja: manteniendo caja torácica y pelvis unidas",
    },
  },
  {
    id: "bicycle-crunch",
    name: { en: "Bicycle Crunch", es: "Crunch Bicicleta" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 3,
    muscles: [
      { muscle: "obliques", intensity: 3 },
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Pedal slowly, bringing the opposite elbow and knee together with a full exhale, no pulling on the neck",
      es: "Pedalea lento, junta codo y rodilla opuestos con exhalación completa, sin tirar del cuello",
    },
    hypertrophyNote: {
      en: "High EMG activity in both the rectus and the obliques in one set",
      es: "Alta actividad EMG en recto y oblicuos en una misma serie",
    },
  },
  {
    id: "ab-wheel-rollout",
    name: { en: "Ab Wheel Rollout", es: "Rueda Abdominal" },
    category: "bodyweight",
    difficulty: 4,
    hypertrophy: 4,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 2 },
      { muscle: "lats_mid", intensity: 2 },
      { muscle: "serratus_anterior", intensity: 1 },
    ],
    equipment: { en: "Ab Wheel", es: "Rueda Abdominal" },
    description: {
      en: "Kneel with the wheel under the shoulders, roll forward as far as you can control, pull back with the abs",
      es: "De rodillas con la rueda bajo los hombros, rueda al frente todo lo que controles, vuelve con el abdomen",
    },
    hypertrophyNote: {
      en: "The most demanding anti-extension movement per euro spent — roll out to a wall to scale it",
      es: "El movimiento anti-extensión más exigente por euro — rueda hasta una pared para escalarlo",
    },
  },
  {
    id: "dead-bug",
    name: { en: "Dead Bug", es: "Bicho Muerto" },
    category: "bodyweight",
    difficulty: 1,
    hypertrophy: 2,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "obliques", intensity: 2 },
      { muscle: "iliopsoas", intensity: 2 },
    ],
    equipment: {
      en: "Bodyweight (mat optional)",
      es: "Peso corporal (colchoneta opcional)",
    },
    description: {
      en: "On your back, arms and knees up, lower the opposite arm and leg without the lower back arching",
      es: "Boca arriba, brazos y rodillas arriba, baja brazo y pierna opuestos sin arquear la lumbar",
    },
    hypertrophyNote: {
      en: "The safest core entry point: teaches bracing before you load the spine",
      es: "La entrada más segura al core: enseña a bracear antes de cargar la columna",
    },
  },
  {
    id: "side-plank",
    name: { en: "Side Plank", es: "Plancha Lateral" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 2,
    muscles: [
      { muscle: "obliques", intensity: 3 },
      { muscle: "gluteus_medius", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Support on one forearm and the side of the foot, lift the hips and hold a straight line",
      es: "Apóyate en un antebrazo y el canto del pie, sube la cadera y mantén una línea recta",
    },
    hypertrophyNote: {
      en: "Anti-lateral flexion: the missing half of most core routines",
      es: "Anti-flexión lateral: la mitad que le falta a casi todas las rutinas de core",
    },
  },
  {
    id: "mountain-climber",
    name: { en: "Mountain Climber", es: "Escalador (Mountain Climber)" },
    category: "bodyweight",
    difficulty: 2,
    hypertrophy: 2,
    muscles: [
      { muscle: "rectus_abdominis", intensity: 3 },
      { muscle: "iliopsoas", intensity: 3 },
      { muscle: "obliques", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "In a high plank, drive the knees towards the chest alternately at a pace you can keep for the whole interval",
      es: "En plancha alta, lleva las rodillas al pecho alternando a un ritmo que aguantes todo el intervalo",
    },
    hypertrophyNote: {
      en: "Core plus heart rate: the cheapest way to keep a session metabolic",
      es: "Core y pulso a la vez: la forma más barata de mantener la sesión metabólica",
    },
  },
];

// ============================================================================
// CONDITIONING — real cardio blocks (a bike is training equipment too)
// ============================================================================

export const CARDIO_EXERCISES: Exercise[] = [
  {
    id: "mtb-steady-ride",
    name: {
      en: "MTB / Bike — Steady Ride (Z2)",
      es: "Bici de Montaña — Rodada Continua (Z2)",
    },
    category: "cardio",
    difficulty: 1,
    hypertrophy: 1,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "calves", intensity: 2 },
      { muscle: "erector_spinae", intensity: 1 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: {
      en: "Bike (MTB / road / spin)",
      es: "Bicicleta (MTB / ruta / estática)",
    },
    description: {
      en: "Ride at a conversational pace you can hold for the whole block — zone 2, cadence 80-90 rpm",
      es: "Rueda a un ritmo conversacional que aguantes todo el bloque — zona 2, cadencia 80-90 rpm",
    },
    hypertrophyNote: {
      en: "Aerobic base and recovery: builds the engine that lets you tolerate more lifting volume",
      es: "Base aeróbica y recuperación: construye el motor que te deja tolerar más volumen de fuerza",
    },
  },
  {
    id: "mtb-hill-intervals",
    name: {
      en: "MTB / Bike — Hill Intervals",
      es: "Bici de Montaña — Intervalos de Subida",
    },
    category: "cardio",
    difficulty: 3,
    hypertrophy: 1,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "calves", intensity: 2 },
      { muscle: "hamstrings", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 1 },
    ],
    equipment: {
      en: "Bike + hill / resistance",
      es: "Bicicleta + cuesta / resistencia",
    },
    description: {
      en: "Repeat hard uphill efforts of 45-90s at a pace you could not hold for 10 minutes, coast downhill",
      es: "Repite esfuerzos fuertes de 45-90s en subida a un ritmo que no aguantarías 10 minutos, baja pedaleando suave",
    },
    hypertrophyNote: {
      en: "Highest VO2max return per minute on a bike — the interval format for a 12-minute Cooper test",
      es: "El mayor retorno de VO2max por minuto en bici — el formato de intervalos del test de Cooper",
    },
  },
  {
    id: "stair-intervals",
    name: {
      en: "Stair / Hill Intervals",
      es: "Intervalos de Escaleras o Cuesta",
    },
    category: "cardio",
    difficulty: 3,
    hypertrophy: 2,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "calves", intensity: 3 },
      { muscle: "soleus", intensity: 2 },
    ],
    equipment: { en: "Stairs / hill", es: "Escaleras / cuesta" },
    description: {
      en: "Walk or run up hard for 30-60s, walk down as recovery, repeat; keep the torso tall, no hands on knees",
      es: "Sube fuerte 30-60s, baja caminando como recuperación, repite; torso alto, sin manos en las rodillas",
    },
    hypertrophyNote: {
      en: "Free conditioning anywhere: legs, lungs and calves with zero equipment",
      es: "Acondicionamiento gratis en cualquier sitio: piernas, pulmones y gemelos sin material",
    },
  },
  {
    id: "jump-rope-intervals",
    name: { en: "Jump Rope Intervals", es: "Intervalos de Cuerda" },
    category: "cardio",
    difficulty: 3,
    hypertrophy: 1,
    muscles: [
      { muscle: "calves", intensity: 3 },
      { muscle: "soleus", intensity: 3 },
      { muscle: "forearm_flexors", intensity: 2 },
      { muscle: "quadriceps", intensity: 2 },
    ],
    equipment: { en: "Jump Rope", es: "Cuerda de Saltar" },
    description: {
      en: "Alternate 30-45s of fast skipping with 30s of rest; land on the balls of the feet, quiet jumps",
      es: "Alterna 30-45s de salto rápido con 30s de descanso; cae sobre la punta, saltos silenciosos",
    },
    hypertrophyNote: {
      en: "Footwork, calves and ankle stiffness with a rope that fits in a pocket",
      es: "Coordinación, gemelos y rigidez de tobillo con una cuerda que cabe en el bolsillo",
    },
  },
  {
    id: "burpee-circuit",
    name: { en: "Burpee Circuit", es: "Circuito de Burpees" },
    category: "cardio",
    difficulty: 3,
    hypertrophy: 2,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 2 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 2 },
      { muscle: "rectus_abdominis", intensity: 2 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Squat, hands down, kick back, push-up, jump the feet in, stand and jump — keep a pace you can repeat",
      es: "Sentadilla, manos al suelo, salta atrás, flexión, recoge los pies, levántate y salta — ritmo repetible",
    },
    hypertrophyNote: {
      en: "Whole-body conditioning in the smallest possible space; step-back version if the knees complain",
      es: "Acondicionamiento de cuerpo completo en el mínimo espacio; versión sin salto si molestan las rodillas",
    },
  },
  {
    id: "metcon-circuit",
    name: { en: "Metabolic Bodyweight Circuit", es: "Circuito Metabólico" },
    category: "cardio",
    difficulty: 2,
    hypertrophy: 2,
    muscles: [
      { muscle: "quadriceps", intensity: 3 },
      { muscle: "gluteus_maximus", intensity: 3 },
      { muscle: "rectus_abdominis", intensity: 2 },
      { muscle: "chest_lower", intensity: 2 },
      { muscle: "lats_mid", intensity: 2 },
      { muscle: "anterior_deltoid", intensity: 1 },
    ],
    equipment: { en: "Bodyweight", es: "Peso corporal" },
    description: {
      en: "Rotate 4-6 bodyweight moves (squat, push-up, inverted row, lunge, plank) 40s on / 20s off for 3-5 rounds",
      es: "Rota 4-6 ejercicios (sentadilla, flexión, remo invertido, zancada, plancha) 40s trabajo / 20s descanso, 3-5 rondas",
    },
    hypertrophyNote: {
      en: "High heart rate with only your bodyweight — the honest way to finish when the 90 minutes are up",
      es: "Pulso alto solo con tu peso — la forma honesta de terminar cuando se acaban los 90 minutos",
    },
  },
];
