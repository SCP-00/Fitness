/**
 * Muscle Anatomy Database
 *
 * Contains detailed information about each muscle group:
 * - Anatomy (location, function)
 * - Measurement guide (how to measure)
 * - Common exercises
 * - Related measurements
 */

export interface MuscleInfo {
  id: string;
  name: { en: string; es: string };
  anatomy: {
    location: { en: string; es: string };
    function: { en: string; es: string };
    origin?: { en: string; es: string };
    insertion?: { en: string; es: string };
  };
  measurement: {
    howTo: { en: string; es: string };
    tips: { en: string; es: string }[];
    commonMistakes: { en: string; es: string }[];
    relatedTypes: string[]; // measurement type IDs
  };
  exercises: {
    name: { en: string; es: string };
    type: 'compound' | 'isolation';
  }[];
  emoji: string;
}

export const MUSCLE_DATABASE: Record<string, MuscleInfo> = {
  chest: {
    id: 'chest',
    name: { en: 'Chest (Pectoralis Major)', es: 'Pecho (Pectoral Mayor)' },
    emoji: '🫁',
    anatomy: {
      location: { en: 'Front of the upper torso, covering the ribcage', es: 'Parte frontal del torso superior, cubriendo la caja torácica' },
      function: { en: 'Horizontal pushing, arm adduction and internal rotation', es: 'Empuje horizontal, aducción y rotación interna del brazo' },
      origin: { en: 'Clavicle, sternum, and upper 6 ribs', es: 'Clavícula, esternón y 6 costillas superiores' },
      insertion: { en: 'Lateral lip of intertubercular groove of humerus', es: 'Labio lateral del surco intertubercular del húmero' },
    },
    measurement: {
      howTo: { en: 'Measure around the fullest part of the chest, keeping the tape horizontal under the armpits.', es: 'Mide alrededor de la parte más amplia del pecho, manteniendo la cinta horizontal bajo las axilas.' },
      tips: [
        { en: 'Breathe normally — don\'t puff out your chest', es: 'Respira normalmente — no inflches el pecho' },
        { en: 'Keep arms relaxed at your sides', es: 'Mantén los brazos relajados a los lados' },
        { en: 'Measure at nipple level for consistency', es: 'Mide a la altura del pezón para consistencia' },
      ],
      commonMistakes: [
        { en: 'Measuring too high (near collarbones)', es: 'Medir demasiado alto (cerca de las clavículas)' },
        { en: 'Inflating chest during measurement', es: 'Inflar el pecho durante la medición' },
      ],
      relatedTypes: ['chest'],
    },
    exercises: [
      { name: { en: 'Bench Press', es: 'Press de Banca' }, type: 'compound' },
      { name: { en: 'Dumbbell Flyes', es: 'Aperturas con Mancuernas' }, type: 'isolation' },
      { name: { en: 'Push-ups', es: 'Flexiones' }, type: 'compound' },
      { name: { en: 'Cable Crossovers', es: 'Cruces en Polea' }, type: 'isolation' },
    ],
  },

  waist: {
    id: 'waist',
    name: { en: 'Waist (Core / Abdominals)', es: 'Cintura (Core / Abdominales)' },
    emoji: '🔄',
    anatomy: {
      location: { en: 'Midsection of the torso, between ribs and hips', es: 'Sección media del torso, entre costillas y caderas' },
      function: { en: 'Trunk flexion, rotation, stabilization, and breathing', es: 'Flexión del tronco, rotación, estabilización y respiración' },
    },
    measurement: {
      howTo: { en: 'Measure at the narrowest point of the torso, typically just above the navel.', es: 'Mide en el punto más estrecho del torso, típicamente justo encima del ombligo.' },
      tips: [
        { en: 'Don\'t suck in — breathe out normally and measure', es: 'No te vacíes — exhala normalmente y mide' },
        { en: 'Keep the tape snug but not tight', es: 'Mantén la cinta ajustada pero no apretada' },
        { en: 'Measure in the morning for consistency', es: 'Mide en la mañana para consistencia' },
      ],
      commonMistakes: [
        { en: 'Sucking in the stomach', es: 'Vaciar el estómago' },
        { en: 'Measuring at the肚脐 instead of narrowest point', es: 'Medir en el ombligo en vez del punto más estrecho' },
      ],
      relatedTypes: ['waist'],
    },
    exercises: [
      { name: { en: 'Plank', es: 'Plancha' }, type: 'isolation' },
      { name: { en: 'Dead Bug', es: 'Bicho Muerto' }, type: 'isolation' },
      { name: { en: 'Pallof Press', es: 'Press Pallof' }, type: 'isolation' },
    ],
  },

  hips: {
    id: 'hips',
    name: { en: 'Hips (Gluteal Region)', es: 'Cadera (Región Glútea)' },
    emoji: '🍑',
    anatomy: {
      location: { en: 'Lower torso, around the pelvis and gluteal muscles', es: 'Torso inferior, alrededor de la pelvis y músculos glúteos' },
      function: { en: 'Hip extension, abduction, and stabilization', es: 'Extensión de cadera, abducción y estabilización' },
    },
    measurement: {
      howTo: { en: 'Measure around the widest part of the hips and buttocks.', es: 'Mide alrededor de la parte más amplia de las caderas y glúteos.' },
      tips: [
        { en: 'Stand with feet together', es: 'Parado con pies juntos' },
        { en: 'Keep the tape horizontal', es: 'Mantén la cinta horizontal' },
        { en: 'Measure at the widest point of the buttocks', es: 'Mide en el punto más amplio de los glúteos' },
      ],
      commonMistakes: [
        { en: 'Measuring too high (at waist)', es: 'Medir demasiado alto (en la cintura)' },
        { en: 'Standing with legs apart', es: 'Parado con piernas separadas' },
      ],
      relatedTypes: ['hips'],
    },
    exercises: [
      { name: { en: 'Hip Thrust', es: 'Empuje de Cadera' }, type: 'compound' },
      { name: { en: 'Squats', es: 'Sentadillas' }, type: 'compound' },
      { name: { en: 'Glute Bridge', es: 'Puente de Glúteos' }, type: 'isolation' },
    ],
  },

  neck: {
    id: 'neck',
    name: { en: 'Neck (Trapezius / Sternocleidomastoid)', es: 'Cuello (Trapecio / Esternocleidomastoideo)' },
    emoji: '🦴',
    anatomy: {
      location: { en: 'Between the skull and shoulders', es: 'Entre el cráneo y los hombros' },
      function: { en: 'Head rotation, flexion, extension, and posture support', es: 'Rotación de cabeza, flexión, extensión y soporte postural' },
    },
    measurement: {
      howTo: { en: 'Measure around the base of the neck, just above the collarbones.', es: 'Mide alrededor de la base del cuello, justo encima de las clavículas.' },
      tips: [
        { en: 'Keep head in neutral position', es: 'Mantén la cabeza en posición neutral' },
        { en: 'Don\'t flex the neck muscles', es: 'No flexiones los músculos del cuello' },
      ],
      commonMistakes: [
        { en: 'Measuring too high (near jaw)', es: 'Medir demasiado alto (cerca de la mandíbula)' },
      ],
      relatedTypes: ['neck'],
    },
    exercises: [
      { name: { en: 'Neck Curls', es: 'Curl de Cuello' }, type: 'isolation' },
      { name: { en: 'Shrugs', es: 'Encogimientos' }, type: 'isolation' },
    ],
  },

  shoulders: {
    id: 'shoulders',
    name: { en: 'Shoulders (Deltoids)', es: 'Hombros (Deltoides)' },
    emoji: '🎯',
    anatomy: {
      location: { en: 'Cap of the shoulder, covering the humeral head', es: 'Cubierta del hombro, cubriendo la cabeza del húmero' },
      function: { en: 'Arm abduction, flexion, extension, and rotation', es: 'Abducción, flexión, extensión y rotación del brazo' },
      origin: { en: 'Clavicle (anterior), acromion (lateral), spine of scapula (posterior)', es: 'Clavícula (anterior), acromion (lateral), espina de escápula (posterior)' },
      insertion: { en: 'Deltoid tuberosity of humerus', es: 'Tuberosidad deltoides del húmero' },
    },
    measurement: {
      howTo: { en: 'Measure around the widest point of the shoulders, across the deltoids.', es: 'Mide alrededor del punto más ancho de los hombros, a través de los deltoides.' },
      tips: [
        { en: 'Arms relaxed at sides', es: 'Brazos relajados a los lados' },
        { en: 'Measure over the most prominent part of the deltoid', es: 'Mide sobre la parte más prominente del deltoides' },
      ],
      commonMistakes: [
        { en: 'Raising arms during measurement', es: 'Levantar los brazos durante la medición' },
      ],
      relatedTypes: ['shoulders'],
    },
    exercises: [
      { name: { en: 'Overhead Press', es: 'Press Militar' }, type: 'compound' },
      { name: { en: 'Lateral Raises', es: 'Elevaciones Laterales' }, type: 'isolation' },
      { name: { en: 'Face Pulls', es: 'Jalones a la Cara' }, type: 'isolation' },
    ],
  },

  biceps: {
    id: 'biceps',
    name: { en: 'Biceps (Biceps Brachii)', es: 'Bíceps (Bíceps Braquial)' },
    emoji: '💪',
    anatomy: {
      location: { en: 'Front of the upper arm, between shoulder and elbow', es: 'Parte frontal del brazo superior, entre hombro y codo' },
      function: { en: 'Elbow flexion and forearm supination', es: 'Flexión del codo y supinación del antebrazo' },
      origin: { en: 'Coracoid process and supraglenoid tubercle of scapula', es: 'Apófisis coracoides y tubérculo supraglenoideo de la escápula' },
      insertion: { en: 'Radial tuberosity and bicipital aponeurosis', es: 'Tuberosidad radial y aponeurosis bicipital' },
    },
    measurement: {
      howTo: { en: 'Measure around the fullest part of the upper arm, with the arm relaxed and extended.', es: 'Mide alrededor de la parte más amplia del brazo superior, con el brazo relajado y extendido.' },
      tips: [
        { en: 'Keep arm relaxed — don\'t flex the bicep', es: 'Mantén el brazo relajado — no flexiones el bíceps' },
        { en: 'Measure at the peak of the muscle belly', es: 'Mide en el pico del vientre muscular' },
        { en: 'For bilateral: measure both arms separately', es: 'Para bilateral: mide cada brazo por separado' },
      ],
      commonMistakes: [
        { en: 'Flexing the bicep during measurement', es: 'Flexionar el bíceps durante la medición' },
        { en: 'Measuring at different heights on each arm', es: 'Medir a diferentes alturas en cada brazo' },
      ],
      relatedTypes: ['biceps', 'biceps_left', 'biceps_right'],
    },
    exercises: [
      { name: { en: 'Barbell Curl', es: 'Curl con Barra' }, type: 'isolation' },
      { name: { en: 'Hammer Curl', es: 'Curl Martillo' }, type: 'isolation' },
      { name: { en: 'Chin-ups', es: 'Dominadas' }, type: 'compound' },
    ],
  },

  forearm: {
    id: 'forearm',
    name: { en: 'Forearm (Brachioradialis / Flexors)', es: 'Antebrazo (Brachioradial / Flexores)' },
    emoji: '🦾',
    anatomy: {
      location: { en: 'Between the elbow and wrist', es: 'Entre el codo y la muñeca' },
      function: { en: 'Wrist flexion/extension, grip strength, forearm rotation', es: 'Flexión/extensión de muñeca, fuerza de agarre, rotación del antebrazo' },
    },
    measurement: {
      howTo: { en: 'Measure around the widest part of the forearm, between elbow and wrist.', es: 'Mide alrededor de la parte más amplia del antebrazo, entre codo y muñeca.' },
      tips: [
        { en: 'Arm extended, palm facing up', es: 'Brazo extendido, palma hacia arriba' },
        { en: 'Relax the forearm muscles', es: 'Relaja los músculos del antebrazo' },
      ],
      commonMistakes: [
        { en: 'Making a fist during measurement', es: 'Hacer un puño durante la medición' },
      ],
      relatedTypes: ['forearm', 'forearm_left', 'forearm_right'],
    },
    exercises: [
      { name: { en: 'Wrist Curls', es: 'Curl de Muñeca' }, type: 'isolation' },
      { name: { en: 'Farmers Walk', es: 'Caminata del Granjero' }, type: 'compound' },
      { name: { en: 'Reverse Curls', es: 'Curl Inverso' }, type: 'isolation' },
    ],
  },

  wrist: {
    id: 'wrist',
    name: { en: 'Wrist (Skeletal Frame Indicator)', es: 'Muñeca (Indicador de Marco Esquelético)' },
    emoji: '🦴',
    anatomy: {
      location: { en: 'Joint between forearm and hand', es: 'Articulación entre antebrazo y mano' },
      function: { en: 'Used as skeletal frame reference for proportional calculations', es: 'Se usa como referencia de marco esquelético para cálculos proporcionales' },
    },
    measurement: {
      howTo: { en: 'Measure just above the wrist bone (styloid process).', es: 'Mide justo encima del hueso de la muñeca (apófisis estiloides).' },
      tips: [
        { en: 'This is the smallest circumference of the wrist', es: 'Esta es la circunferencia más pequeña de la muñeca' },
        { en: 'Used by McCallum formula as base skeletal indicator', es: 'Usada por la fórmula de McCallum como indicador esquelético base' },
        { en: 'Do NOT change with training — it\'s bone', es: 'NO cambia con el entrenamiento — es hueso' },
      ],
      commonMistakes: [
        { en: 'Measuring at the hand instead of wrist', es: 'Medir en la mano en vez de la muñeca' },
      ],
      relatedTypes: ['wrist'],
    },
    exercises: [],
  },

  thigh: {
    id: 'thigh',
    name: { en: 'Thigh (Quadriceps / Hamstrings)', es: 'Muslo (Cuádriceps / Isquiotibiales)' },
    emoji: '🦵',
    anatomy: {
      location: { en: 'Upper leg, between hip and knee', es: 'Pierna superior, entre cadera y rodilla' },
      function: { en: 'Knee extension (quads) and hip extension (hamstrings)', es: 'Extensión de rodilla (cuádriceps) y extensión de cadera (isquiotibiales)' },
    },
    measurement: {
      howTo: { en: 'Measure around the upper thigh, just below the crotch.', es: 'Mide alrededor del muslo superior, justo debajo de la entrepierna.' },
      tips: [
        { en: 'Stand with weight evenly distributed', es: 'Parado con peso distribuido uniformemente' },
        { en: 'Measure at the widest point of the thigh', es: 'Mide en el punto más amplio del muslo' },
        { en: 'For bilateral: measure both thighs at the same height', es: 'Para bilateral: mide ambos muslos a la misma altura' },
      ],
      commonMistakes: [
        { en: 'Measuring too low (near knee)', es: 'Medir demasiado bajo (cerca de la rodilla)' },
      ],
      relatedTypes: ['thigh', 'thigh_left', 'thigh_right'],
    },
    exercises: [
      { name: { en: 'Squats', es: 'Sentadillas' }, type: 'compound' },
      { name: { en: 'Leg Press', es: 'Prensa de Piernas' }, type: 'compound' },
      { name: { en: 'Leg Extensions', es: 'Extensiones de Pierna' }, type: 'isolation' },
    ],
  },

  calf: {
    id: 'calf',
    name: { en: 'Calf (Gastrocnemius / Soleus)', es: 'Pantorrilla (Sóleo / Gemelos)' },
    emoji: '🦶',
    anatomy: {
      location: { en: 'Back of the lower leg, between knee and ankle', es: 'Parte posterior de la pierna inferior, entre rodilla y tobillo' },
      function: { en: 'Plantar flexion (pointing toes down), ankle stability', es: 'Flexión plantar (apuntar dedos hacia abajo), estabilidad del tobillo' },
    },
    measurement: {
      howTo: { en: 'Measure around the widest part of the calf.', es: 'Mide alrededor de la parte más amplia de la pantorrilla.' },
      tips: [
        { en: 'Stand with weight on one leg for best measurement', es: 'Parado con peso en una pierna para mejor medición' },
        { en: 'The calf flexes when standing on tiptoes — measure relaxed', es: 'La pantorrilla se flexiona al pararse en puntas — mide relajado' },
      ],
      commonMistakes: [
        { en: 'Standing on tiptoes during measurement', es: 'Pararse en puntas durante la medición' },
      ],
      relatedTypes: ['calf', 'calf_left', 'calf_right'],
    },
    exercises: [
      { name: { en: 'Standing Calf Raises', es: 'Elevaciones de Pantorrilla de Pie' }, type: 'isolation' },
      { name: { en: 'Seated Calf Raises', es: 'Elevaciones de Pantorrilla Sentado' }, type: 'isolation' },
    ],
  },

  abs: {
    id: 'abs',
    name: { en: 'Abdominals (Rectus Abdominis)', es: 'Abdominales (Recto Abdominal)' },
    emoji: '🏋️',
    anatomy: {
      location: { en: 'Front of the abdomen, from ribs to pelvis', es: 'Frente del abdomen, desde costillas hasta pelvis' },
      function: { en: 'Trunk flexion, posterior pelvic tilt', es: 'Flexión del tronco, inclinación posterior de la pelvis' },
    },
    measurement: {
      howTo: { en: 'Measured as part of waist circumference — no separate measurement.', es: 'Se mide como parte de la circunferencia de cintura — sin medición separada.' },
      tips: [
        { en: 'Waist measurement reflects overall core development', es: 'La medición de cintura refleja el desarrollo general del core' },
      ],
      commonMistakes: [],
      relatedTypes: ['waist'],
    },
    exercises: [
      { name: { en: 'Hanging Leg Raises', es: 'Elevaciones de Piernas Colgado' }, type: 'isolation' },
      { name: { en: 'Ab Wheel Rollouts', es: 'Extensiones con Rueda Abdominal' }, type: 'isolation' },
    ],
  },

  obliques: {
    id: 'obliques',
    name: { en: 'Obliques (Internal/External)', es: 'Oblicuos (Internos/Externos)' },
    emoji: '🔄',
    anatomy: {
      location: { en: 'Sides of the abdomen', es: 'Lados del abdomen' },
      function: { en: 'Trunk rotation, lateral flexion', es: 'Rotación del tronco, flexión lateral' },
    },
    measurement: {
      howTo: { en: 'Measured as part of waist circumference.', es: 'Se mide como parte de la circunferencia de cintura.' },
      tips: [],
      commonMistakes: [],
      relatedTypes: ['waist'],
    },
    exercises: [
      { name: { en: 'Side Plank', es: 'Plancha Lateral' }, type: 'isolation' },
      { name: { en: 'Russian Twists', es: 'Giros Rusos' }, type: 'isolation' },
    ],
  },

  glutes: {
    id: 'glutes',
    name: { en: 'Glutes (Gluteus Maximus/Medius)', es: 'Glúteos (Glúteo Mayor/Medio)' },
    emoji: '🍑',
    anatomy: {
      location: { en: 'Posterior pelvis, forming the buttocks', es: 'Pelvis posterior, formando los glúteos' },
      function: { en: 'Hip extension, abduction, and external rotation', es: 'Extensión de cadera, abducción y rotación externa' },
    },
    measurement: {
      howTo: { en: 'Measured as part of hip circumference.', es: 'Se mide como parte de la circunferencia de cadera.' },
      tips: [],
      commonMistakes: [],
      relatedTypes: ['hips'],
    },
    exercises: [
      { name: { en: 'Hip Thrust', es: 'Empuje de Cadera' }, type: 'compound' },
      { name: { en: 'Bulgarian Split Squat', es: 'Sentadilla Búlgara' }, type: 'compound' },
    ],
  },

  quadriceps: {
    id: 'quadriceps',
    name: { en: 'Quadriceps (Front Thigh)', es: 'Cuádriceps (Muslo Frontal)' },
    emoji: '🦵',
    anatomy: {
      location: { en: 'Front of the thigh', es: 'Frente del muslo' },
      function: { en: 'Knee extension', es: 'Extensión de rodilla' },
    },
    measurement: {
      howTo: { en: 'Measured as part of thigh circumference.', es: 'Se mide como parte de la circunferencia del muslo.' },
      tips: [],
      commonMistakes: [],
      relatedTypes: ['thigh'],
    },
    exercises: [
      { name: { en: 'Squats', es: 'Sentadillas' }, type: 'compound' },
      { name: { en: 'Leg Extensions', es: 'Extensiones de Pierna' }, type: 'isolation' },
    ],
  },

  hamstrings: {
    id: 'hamstrings',
    name: { en: 'Hamstrings (Back Thigh)', es: 'Isquiotibiales (Muslo Posterior)' },
    emoji: '🦵',
    anatomy: {
      location: { en: 'Back of the thigh', es: 'Parte posterior del muslo' },
      function: { en: 'Knee flexion and hip extension', es: 'Flexión de rodilla y extensión de cadera' },
    },
    measurement: {
      howTo: { en: 'Measured as part of thigh circumference.', es: 'Se mide como parte de la circunferencia del muslo.' },
      tips: [],
      commonMistakes: [],
      relatedTypes: ['thigh'],
    },
    exercises: [
      { name: { en: 'Romanian Deadlift', es: 'Peso Muerto Rumano' }, type: 'compound' },
      { name: { en: 'Leg Curls', es: 'Curl de Piernas' }, type: 'isolation' },
    ],
  },

  calves: {
    id: 'calves',
    name: { en: 'Calves', es: 'Pantorrillas' },
    emoji: '🦶',
    anatomy: {
      location: { en: 'Back of lower leg', es: 'Parte posterior de la pierna inferior' },
      function: { en: 'Plantar flexion', es: 'Flexión plantar' },
    },
    measurement: {
      howTo: { en: 'Measured as part of calf circumference.', es: 'Se mide como parte de la circunferencia de pantorrilla.' },
      tips: [],
      commonMistakes: [],
      relatedTypes: ['calf'],
    },
    exercises: [
      { name: { en: 'Calf Raises', es: 'Elevaciones de Pantorrilla' }, type: 'isolation' },
    ],
  },

  forearms: {
    id: 'forearms',
    name: { en: 'Forearms', es: 'Antebrazos' },
    emoji: '🦾',
    anatomy: {
      location: { en: 'Between elbow and wrist', es: 'Entre codo y muñeca' },
      function: { en: 'Grip and wrist control', es: 'Agarre y control de muñeca' },
    },
    measurement: {
      howTo: { en: 'Measured as part of forearm circumference.', es: 'Se mide como parte de la circunferencia del antebrazo.' },
      tips: [],
      commonMistakes: [],
      relatedTypes: ['forearm'],
    },
    exercises: [
      { name: { en: 'Wrist Curls', es: 'Curl de Muñeca' }, type: 'isolation' },
    ],
  },

  traps: {
    id: 'traps',
    name: { en: 'Trapezius', es: 'Trapecios' },
    emoji: '🏔️',
    anatomy: {
      location: { en: 'Upper back and neck, diamond-shaped', es: 'Espalda alta y cuello, en forma de diamante' },
      function: { en: 'Scapular elevation, retraction, and rotation', es: 'Elevación, retracción y rotación de la escápula' },
    },
    measurement: {
      howTo: { en: 'Indirectly estimated via neck and shoulder measurements.', es: 'Estimado indirectamente mediante mediciones de cuello y hombros.' },
      tips: [
        { en: 'Well-developed traps increase neck-to-shoulder transition', es: 'Trapecios bien desarrollados aumentan la transición cuello-hombro' },
        { en: 'Neck circumference can indicate trap development', es: 'La circunferencia del cuello puede indicar desarrollo de trapecios' },
      ],
      commonMistakes: [],
      relatedTypes: ['neck', 'shoulders'],
    },
    exercises: [
      { name: { en: 'Barbell Shrugs', es: 'Encogimientos con Barra' }, type: 'isolation' },
      { name: { en: 'Face Pulls', es: 'Jalones a la Cara' }, type: 'isolation' },
      { name: { en: 'Deadlift', es: 'Peso Muerto' }, type: 'compound' },
    ],
  },

  lats: {
    id: 'lats',
    name: { en: 'Latissimus Dorsi', es: 'Dorsales (Dorsal Ancho)' },
    emoji: '🦅',
    anatomy: {
      location: { en: 'Mid to lower back, widest muscle of the body', es: 'Espalda media a baja, músculo más ancho del cuerpo' },
      function: { en: 'Arm adduction, extension, and internal rotation', es: 'Aducción, extensión y rotación interna del brazo' },
    },
    measurement: {
      howTo: { en: 'Indirectly estimated via chest measurement (V-taper indicator).', es: 'Estimado indirectamente mediante medición de pecho (indicador de V-taper).' },
      tips: [
        { en: 'Well-developed lats create the "V-taper" look', es: 'Dorsales bien desarrollados crean el aspecto de "V-taper"' },
        { en: 'Chest-to-waist ratio indicates lat development', es: 'El ratio pecho-cintura indica desarrollo de dorsales' },
      ],
      commonMistakes: [],
      relatedTypes: ['chest', 'waist'],
    },
    exercises: [
      { name: { en: 'Pull-ups', es: 'Dominadas' }, type: 'compound' },
      { name: { en: 'Barbell Rows', es: 'Remo con Barra' }, type: 'compound' },
      { name: { en: 'Lat Pulldown', es: 'Jalón al Pecho' }, type: 'compound' },
    ],
  },

  lower_back: {
    id: 'lower_back',
    name: { en: 'Lower Back (Erector Spinae)', es: 'Espalda Baja (Erectores de la Columna)' },
    emoji: '🔙',
    anatomy: {
      location: { en: 'Lower spine region, running vertically', es: 'Región de la columna baja, corriendo verticalmente' },
      function: { en: 'Spinal extension and stabilization', es: 'Extensión y estabilización de la columna' },
    },
    measurement: {
      howTo: { en: 'Indirectly assessed — no direct tape measurement.', es: 'Evaluado indirectamente — sin medición directa con cinta.' },
      tips: [
        { en: 'Waist measurement can indicate lower back development', es: 'La medición de cintura puede indicar desarrollo de la espalda baja' },
      ],
      commonMistakes: [],
      relatedTypes: ['waist'],
    },
    exercises: [
      { name: { en: 'Deadlift', es: 'Peso Muerto' }, type: 'compound' },
      { name: { en: 'Back Extension', es: 'Extensión de Espalda' }, type: 'isolation' },
    ],
  },

  triceps: {
    id: 'triceps',
    name: { en: 'Triceps (Triceps Brachii)', es: 'Tríceps (Tríceps Braquial)' },
    emoji: '💪',
    anatomy: {
      location: { en: 'Back of the upper arm', es: 'Parte posterior del brazo superior' },
      function: { en: 'Elbow extension', es: 'Extensión del codo' },
    },
    measurement: {
      howTo: { en: 'Measured as part of arm circumference (bicep measurement area).', es: 'Se mide como parte de la circunferencia del brazo (área de medición de bíceps).' },
      tips: [
        { en: 'Triceps make up ~2/3 of upper arm mass', es: 'Los tríceps componen ~2/3 de la masa del brazo superior' },
      ],
      commonMistakes: [],
      relatedTypes: ['biceps'],
    },
    exercises: [
      { name: { en: 'Tricep Dips', es: 'Fondos de Tríceps' }, type: 'compound' },
      { name: { en: 'Skull Crushers', es: 'Extensión de Tríceps en Polea' }, type: 'isolation' },
    ],
  },

  deltoids: {
    id: 'deltoids',
    name: { en: 'Deltoids (Shoulders)', es: 'Deltoides (Hombros)' },
    emoji: '🎯',
    anatomy: {
      location: { en: 'Cap of the shoulder', es: 'Cubierta del hombro' },
      function: { en: 'Arm movement in all planes', es: 'Movimiento del brazo en todos los planos' },
    },
    measurement: {
      howTo: { en: 'Measured as part of shoulder circumference.', es: 'Se mide como parte de la circunferencia de hombros.' },
      tips: [],
      commonMistakes: [],
      relatedTypes: ['shoulders'],
    },
    exercises: [
      { name: { en: 'Overhead Press', es: 'Press Militar' }, type: 'compound' },
      { name: { en: 'Lateral Raises', es: 'Elevaciones Laterales' }, type: 'isolation' },
    ],
  },

  pectoralis_minor: {
    id: 'pectoralis_minor',
    name: { en: 'Pectoralis Minor', es: 'Pectoral Menor' },
    emoji: '🫁',
    anatomy: {
      location: { en: 'Deep chest, beneath the pectoralis major, from ribs 3-5 to the coracoid process', es: 'Pecho profundo, debajo del pectoral mayor, de las costillas 3-5 a la apófisis coracoides' },
      function: { en: 'Scapular protraction, depression, and downward rotation — postural muscle of the shoulder', es: 'Protracción, depresión y rotación inferior de la escápula — músculo postural del hombro' },
    },
    measurement: {
      howTo: { en: 'No direct tape measurement — assessed via chest development and posture.', es: 'Sin medición directa con cinta — se evalúa por desarrollo del pecho y postura.' },
      tips: [
        { en: 'A tight pectoralis minor pulls the shoulders forward — stretch it for posture', es: 'Un pectoral menor acortado lleva los hombros hacia adelante — estíralo para la postura' },
      ],
      commonMistakes: [],
      relatedTypes: ['chest'],
    },
    exercises: [
      { name: { en: 'Dumbbell Pullover', es: 'Pullover con Mancuerna' }, type: 'isolation' },
      { name: { en: 'Machine Fly', es: 'Aperturas en Máquina' }, type: 'isolation' },
    ],
  },

  serratus_anterior: {
    id: 'serratus_anterior',
    name: { en: 'Serratus Anterior', es: 'Serrato Anterior' },
    emoji: '🪽',
    anatomy: {
      location: { en: 'Lateral ribcage, fanning from the first 8-9 ribs to the medial border of the scapula', es: 'Costillas laterales, en abanico de las primeras 8-9 costillas al borde medial de la escápula' },
      function: { en: 'Scapular protraction and upward rotation — keeps the shoulder blade glued to the ribcage', es: 'Protracción y rotación superior de la escápula — mantiene el omóplato pegado a la caja torácica' },
    },
    measurement: {
      howTo: { en: 'No direct tape measurement — assessed via scapular control and ribcage width.', es: 'Sin medición directa con cinta — se evalúa por control escapular y anchura torácica.' },
      tips: [
        { en: 'A weak serratus causes "winged" scapulae — protraction work fixes it', es: 'Un serrato débil causa omóplatos "alados" — el trabajo de protracción lo corrige' },
      ],
      commonMistakes: [],
      relatedTypes: ['chest'],
    },
    exercises: [
      { name: { en: 'Push-Up Plus', es: 'Flexión Plus' }, type: 'compound' },
      { name: { en: 'Serratus Punch', es: 'Golpe de Serrato' }, type: 'isolation' },
    ],
  },

  iliopsoas: {
    id: 'iliopsoas',
    name: { en: 'Iliopsoas (Hip Flexors)', es: 'Iliopsoas (Flexores de Cadera)' },
    emoji: '🦵',
    anatomy: {
      location: { en: 'Deep in the pelvis, from the lumbar spine and iliac fossa to the femur', es: 'Profundo en la pelvis, de la columna lumbar y fosa ilíaca al fémur' },
      function: { en: 'Hip flexion — the primary mover for raising the thigh toward the torso', es: 'Flexión de cadera — el motor principal para elevar el muslo hacia el torso' },
    },
    measurement: {
      howTo: { en: 'No direct tape measurement — assessed via hip mobility and thigh circumference.', es: 'Sin medición directa con cinta — se evalúa por movilidad de cadera y circunferencia del muslo.' },
      tips: [
        { en: 'Sitting all day shortens the iliopsoas — train it through full hip flexion', es: 'Sentarse todo el día acorta el iliopsoas — entrénalo en flexión completa de cadera' },
      ],
      commonMistakes: [],
      relatedTypes: ['hips', 'thigh'],
    },
    exercises: [
      { name: { en: 'Lying Leg Raise', es: 'Elevación de Piernas Acostado' }, type: 'isolation' },
      { name: { en: 'Hanging Leg Raise', es: 'Elevación de Piernas Colgado' }, type: 'compound' },
    ],
  },

  soleus: {
    id: 'soleus',
    name: { en: 'Soleus', es: 'Sóleo' },
    emoji: '🦶',
    anatomy: {
      location: { en: 'Deep calf, beneath the gastrocnemius, from the tibia and fibula to the Achilles', es: 'Pantorrilla profunda, debajo del gemelo, de la tibia y el peroné al tendón de Aquiles' },
      function: { en: 'Plantar flexion with the knee bent — the postural calf muscle', es: 'Flexión plantar con la rodilla flexionada — el músculo postural de la pantorrilla' },
    },
    measurement: {
      howTo: { en: 'Measured as part of calf circumference.', es: 'Se mide como parte de la circunferencia de pantorrilla.' },
      tips: [
        { en: 'Seated calf raises target the soleus — key for calf thickness', es: 'Las elevaciones sentado enfocan el sóleo — clave para el grosor de pantorrilla' },
      ],
      commonMistakes: [],
      relatedTypes: ['calf'],
    },
    exercises: [
      { name: { en: 'Seated Calf Raise', es: 'Elevación de Talones Sentado' }, type: 'isolation' },
      { name: { en: 'Standing Calf Raise', es: 'Elevación de Talones de Pie' }, type: 'isolation' },
    ],
  },

  rhomboids: {
    id: 'rhomboids',
    name: { en: 'Rhomboids', es: 'Romboides' },
    emoji: '🔙',
    anatomy: {
      location: { en: 'Mid back, between the spine and the medial border of each scapula', es: 'Espalda media, entre la columna y el borde medial de cada escápula' },
      function: { en: 'Scapular retraction and downward rotation — pulls the shoulder blades together', es: 'Retracción y rotación inferior de la escápula — junta los omóplatos' },
    },
    measurement: {
      howTo: { en: 'No direct tape measurement — assessed via posture and shoulder development.', es: 'Sin medición directa con cinta — se evalúa por postura y desarrollo de hombros.' },
      tips: [
        { en: 'Strong rhomboids are the antidote to rounded shoulders', es: 'Los romboides fuertes son el antídoto contra los hombros redondeados' },
      ],
      commonMistakes: [],
      relatedTypes: ['shoulders'],
    },
    exercises: [
      { name: { en: 'Band Pull-Apart', es: 'Aperturas con Banda' }, type: 'isolation' },
      { name: { en: 'T-Bar Row', es: 'Remo T-Bar' }, type: 'compound' },
    ],
  },
};

/**
 * Get muscle info by ID
 */
export function getMuscleInfo(muscleId: string): MuscleInfo | null {
  return MUSCLE_DATABASE[muscleId] ?? null;
}

/**
 * Get related measurement types for a muscle
 */
export function getRelatedMeasurements(muscleId: string): string[] {
  const info = MUSCLE_DATABASE[muscleId];
  return info?.measurement.relatedTypes ?? [];
}
