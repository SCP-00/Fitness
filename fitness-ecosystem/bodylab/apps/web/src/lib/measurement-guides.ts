/**
 * Measurement guides — the "how to take it" educational layer.
 *
 * BodyLab's mission includes TEACHING users to measure themselves correctly
 * with whatever they have. This registry pairs every conditioning metric with
 * a bilingual tutorial, the minimum equipment required (tape-only alternatives
 * included), and an honest certainty assessment — because not all methods are
 * equally trustworthy for all bodies:
 *
 *  - Skinfolds read ONE place; people store fat in DIFFERENT places. That is
 *    why the Jackson-Pollock protocol uses 3 SITES and why the sites differ
 *    BY SEX (male: chest/abdomen/thigh; female: triceps/suprailiac/thigh) —
 *    a single abdominal reading systematically misreads anyone whose fat is
 *    stored elsewhere (hips, glutes, legs).
 *  - Tape circumferences (Navy) capture overall fatness independent of
 *    storage pattern, at the cost of a wider published error band.
 *
 * UI copy is bilingual {en, es} per repo convention.
 *
 * @module lib/measurement-guides
 */

// ============================================================================
// Types
// ============================================================================

export type Equipment =
  | 'none' // fingers + any clock
  | 'tape_only' // measuring tape (or string + ruler)
  | 'tape_or_gps' // Cooper: marked track or any GPS app
  | 'caliper'; // skinfold caliper

export type CertaintyLevel = 'high' | 'moderate' | 'approximate';

export interface Bilingual {
  en: string;
  es: string;
}

/** Skinfold site ids used by the illustrated JP3 guide. */
export type GuideSiteId = 'chest' | 'abdomen' | 'thigh' | 'triceps' | 'suprailiac';

/** Sex key for the per-sex site illustrations. */
export type GuideSex = 'male' | 'female';

export interface SiteIllustration {
  siteId: GuideSiteId;
  label: Bilingual;
  /** Position as a FRACTION of the illustration viewBox (x, y; y grows down), or null for text-only sites. */
  landmark: { x: number; y: number } | null;
}

export interface SexSiteIllustrations {
  sites: SiteIllustration[];
  /** WHY these sites — the fat-storage-distribution argument, per sex. */
  distributionNote: Bilingual;
}

export interface CertaintyInfo {
  level: CertaintyLevel;
  /** Published standard error of estimate in %BF, when applicable. */
  seePct?: number;
  /** The honest caveat, including the fat-storage-distribution argument. */
  caveat: Bilingual;
}

export interface MeasurementGuide {
  /** Stable id — also used by the UI to link a measurement type to its guide. */
  id: string;
  /** Which conditioning measurement type this guide serves. */
  target: 'body_fat' | 'cooper' | 'resting_hr' | 'skinfold';
  title: Bilingual;
  equipment: Equipment;
  /** True when the correct sites/procedure differ by sex. */
  sexSpecific: boolean;
  certainty: CertaintyInfo;
  steps: Bilingual[];
  tips: Bilingual[];
  /** No tape? No caliper? What to do instead. */
  fallbacks: Bilingual[];
  /** Primary literature or official source behind the method. */
  provenance: string;
  /** Per-sex illustrated skinfold sites (JP3 only): drawing landmarks + the distribution warning. */
  siteIllustrations?: Record<GuideSex, SexSiteIllustrations>;
}

// ============================================================================
// Guides
// ============================================================================

export const NAVY_TAPE_GUIDE: MeasurementGuide = {
  id: 'body-fat-navy-tape',
  target: 'body_fat',
  title: {
    en: 'Body fat with a measuring tape (US Navy method)',
    es: 'Grasa corporal con cinta métrica (método de la Marina de EE. UU.)',
  },
  equipment: 'tape_only',
  sexSpecific: true,
  certainty: {
    level: 'approximate',
    seePct: 3.5,
    caveat: {
      en: 'Published error is ±3.5% body fat. It reads OVERALL fatness, so it does not depend on where YOUR body stores fat — but it is an estimate, not a measurement. Use it for trends, not for single absolute numbers.',
      es: 'El error publicado es ±3,5% de grasa corporal. Lee la gordura GENERAL, así que no depende de dónde almacene grasa TU cuerpo — pero es una estimación, no una medición. Úsala para tendencias, no para cifras absolutas únicas.',
    },
  },
  steps: [
    {
      en: 'Neck: measure just below the larynx (Adam\'s apple), keeping the tape slightly down at the front, parallel to the floor. Do not press.',
      es: 'Cuello: mide justo debajo de la nuez, manteniendo la cinta un poco hacia abajo al frente y paralela al suelo. No aprietes.',
    },
    {
      en: 'Waist (men): at the height of the navel, tape parallel to the floor, relaxed stomach, exhale normally.',
      es: 'Cintura (hombres): a la altura del ombligo, cinta paralela al suelo, abdomen relajado, exhala normal.',
    },
    {
      en: 'Waist (women): at the NARROWEST point of the torso, usually just above the navel.',
      es: 'Cintura (mujeres): en el punto MÁS ESTRECHO del torso, normalmente justo encima del ombligo.',
    },
    {
      en: 'Hip (women only): at the WIDEST point of the hips/glutes, feet together.',
      es: 'Cadera (solo mujeres): en el punto MÁS ANCHO de caderas/glúteos, con los pies juntos.',
    },
    {
      en: 'Height: back against a wall without baseboard, heels together, look straight ahead; mark with a book held level, measure the mark.',
      es: 'Estatura: espalda contra una pared sin zócalo, talones juntos, mirada al frente; marca con un libro a nivel y mide la marca.',
    },
  ],
  tips: [
    {
      en: 'Measure in the morning, before eating or training — circumferences change through the day.',
      es: 'Mide por la mañana, antes de comer o entrenar — las circunferencias cambian durante el día.',
    },
    {
      en: 'The tape should be snug against the skin but never compress it.',
      es: 'La cinta debe estar apoyada en la piel pero nunca comprimirla.',
    },
    {
      en: 'Use a mirror or ask someone to check that the tape is level all the way around.',
      es: 'Usa un espejo o pide a alguien que verifique que la cinta quede horizontal todo el recorrido.',
    },
  ],
  fallbacks: [
    {
      en: 'No tape? Use a non-stretch string or shoelace, mark it at each circumference, and measure the marks against any ruler.',
      es: '¿Sin cinta? Usa un hilo o cordón que no se estire, márcalo en cada circunferencia y mide las marcas con cualquier regla.',
    },
    {
      en: 'A printable paper tape measure also works — print at 100% scale and check the calibration box with a ruler.',
      es: 'Una cinta métrica de papel imprimible también sirve — imprímela al 100% y verifica la caja de calibración con una regla.',
    },
  ],
  provenance: 'Hodgdon & Beckett (1984), U.S. Navy circumference method; SEE ±3.5% vs hydrostatic weighing',
};

export const JP3_CALIPER_GUIDE: MeasurementGuide = {
  id: 'body-fat-jp3-caliper',
  target: 'skinfold',
  title: {
    en: 'Body fat with a skinfold caliper (Jackson-Pollock 3-site)',
    es: 'Grasa corporal con plicómetro (Jackson-Pollock 3 pliegues)',
  },
  equipment: 'caliper',
  sexSpecific: true,
  certainty: {
    level: 'moderate',
    seePct: 3.4,
    caveat: {
      en: 'IMPORTANT: fat is not stored in the same place in every body. A single abdominal fold MISREADS anyone whose fat lives on hips, glutes or legs — that is why the protocol uses 3 sites and why the sites DIFFER BY SEX (men: chest, abdomen, thigh; women: triceps, suprailiac, thigh). Follow your sex\'s sites exactly; the abdominal-only reading is a male-biased proxy, not a universal truth.',
      es: 'IMPORTANTE: la grasa no se almacena en el mismo lugar en todos los cuerpos. Un solo pliegue abdominal LEE MAL a quien guarda grasa en caderas, glúteos o piernas — por eso el protocolo usa 3 sitios y por eso los sitios DIFIEREN POR SEXO (hombres: pecho, abdomen, muslo; mujeres: tríceps, suprailiaco, muslo). Sigue exactamente los sitios de tu sexo; la lectura solo-abdominal es un sesgo masculino, no una verdad universal.',
    },
  },
  steps: [
    {
      en: 'With thumb and index, lift ONLY skin + fat (never muscle) into a fold, about 1 cm deep.',
      es: 'Con pulgar e índice, levanta SOLO piel + grasa (nunca músculo) formando un pliegue de ~1 cm.',
    },
    {
      en: 'Apply the caliper 1 cm below the fingers holding the fold, perpendicular to it.',
      es: 'Aplica el plicómetro 1 cm por debajo de los dedos que sujetan el pliegue, perpendicular a él.',
    },
    {
      en: 'Read the dial 2 seconds after full pressure; release the fold completely between readings.',
      es: 'Lee el dial 2 segundos después de aplicar la presión completa; suelta el pliegue por completo entre lecturas.',
    },
    {
      en: 'Take 2-3 readings per site and keep the MEDIAN (middle value). Measure the RIGHT side of the body.',
      es: 'Toma 2-3 lecturas por sitio y quédate con la MEDIANA (valor central). Mide el lado DERECHO del cuerpo.',
    },
    {
      en: 'Men — chest: diagonal fold halfway between nipple and armpit. Abdomen: vertical fold 2 cm to the right of the navel. Thigh: vertical fold on the front, halfway between hip and knee.',
      es: 'Hombres — pecho: pliegue diagonal a medio camino entre pezón y axila. Abdomen: pliegue vertical 2 cm a la derecha del ombligo. Muslo: pliegue vertical al frente, entre cadera y rodilla.',
    },
    {
      en: 'Women — triceps: vertical fold at the back of the arm, halfway between shoulder and elbow. Suprailiac: diagonal fold just above the hip bone, following its natural slant. Thigh: same as men.',
      es: 'Mujeres — tríceps: pliegue vertical en la parte posterior del brazo, entre hombro y codo. Suprailiaco: pliegue diagonal justo encima del hueso de la cadera, siguiendo su inclinación. Muslo: igual que en hombres.',
    },
  ],
  tips: [
    {
      en: 'Measure in the morning, before training — exercise moves water into the skin and inflates the reading.',
      es: 'Mide por la mañana, antes de entrenar — el ejercicio lleva agua a la piel e infla la lectura.',
    },
    {
      en: 'Have the SAME person take the measurement each time; between-observer differences exceed the method error.',
      es: 'Que SIEMPRE mida la misma persona; las diferencias entre observadores superan el error del método.',
    },
    {
      en: 'Cheap plastic calipers are fine IF they close with constant pressure (spring-loaded).',
      es: 'Los plicómetros plásticos baratos sirven SI cierran con presión constante (de resorte).',
    },
  ],
  fallbacks: [
    {
      en: 'No caliper? Use the tape-only Navy method on this app — less precise in theory, far more repeatable without a caliper and without an assistant.',
      es: '¿Sin plicómetro? Usa el método de cinta de la Marina en esta app — menos preciso en teoría, mucho más repetible sin plicómetro y sin asistente.',
    },
  ],
  provenance: 'Jackson, Pollock & Ward (1980); Jackson & Pollock (1985) sex-specific 3-site protocol; Siri (1961) conversion',
  siteIllustrations: {
    male: {
      distributionNote: {
        en: 'Men store proportionally more fat on the TRUNK — that is why the male protocol reads chest and abdomen. Wherever YOUR fat lives, these three sites track your total fat through the published equation.',
        es: 'Los hombres almacenan proporcionalmente más grasa en el TRONCO — por eso el protocolo masculino lee pecho y abdomen. Viva tu grasa donde viva, estos tres pliegues siguen tu grasa total a través de la ecuación publicada.',
      },
      sites: [
        {
          siteId: 'chest',
          label: { en: 'Chest — diagonal fold halfway between nipple and armpit', es: 'Pecho — pliegue diagonal a medio camino entre pezón y axila' },
          landmark: { x: 0.58, y: 0.26 },
        },
        {
          siteId: 'abdomen',
          label: { en: 'Abdomen — vertical fold 2 cm to the right of the navel', es: 'Abdomen — pliegue vertical 2 cm a la derecha del ombligo' },
          landmark: { x: 0.56, y: 0.38 },
        },
        {
          siteId: 'thigh',
          label: { en: 'Thigh — vertical fold on the front, halfway between hip and knee', es: 'Muslo — pliegue vertical al frente, a medio camino entre cadera y rodilla' },
          landmark: { x: 0.43, y: 0.66 },
        },
      ],
    },
    female: {
      distributionNote: {
        en: 'Women store proportionally more fat on HIPS, GLUTES and THIGHS — an abdominal fold would systematically MISREAD you (this warning is the whole reason the female protocol exists). Use triceps + suprailiac + thigh, exactly this protocol.',
        es: 'Las mujeres almacenan proporcionalmente más grasa en CADERAS, GLÚTEOS Y MUSLOS — un pliegue abdominal te LEERÍA MAL de forma sistemática (esta advertencia es toda la razón de ser del protocolo femenino). Usa tríceps + suprailiaco + muslo, exactamente este protocolo.',
      },
      sites: [
        {
          siteId: 'triceps',
          label: { en: 'Triceps — vertical fold at the back of the arm, halfway between shoulder and elbow', es: 'Tríceps — pliegue vertical en la parte posterior del brazo, a medio camino entre hombro y codo' },
          landmark: { x: 0.305, y: 0.32 },
        },
        {
          siteId: 'suprailiac',
          label: { en: 'Suprailiac — diagonal fold just above the hip bone, following its natural slant', es: 'Suprailiaco — pliegue diagonal justo encima del hueso de la cadera, siguiendo su inclinación natural' },
          landmark: { x: 0.6, y: 0.47 },
        },
        {
          siteId: 'thigh',
          label: { en: 'Thigh — vertical fold on the front, halfway between hip and knee', es: 'Muslo — pliegue vertical al frente, a medio camino entre cadera y rodilla' },
          landmark: { x: 0.43, y: 0.66 },
        },
      ],
    },
  },
};

export const COOPER_GUIDE: MeasurementGuide = {
  id: 'cooper-12min',
  target: 'cooper',
  title: {
    en: 'Cardio fitness: the 12-minute run test (Cooper)',
    es: 'Condición cardio: el test de 12 minutos (Cooper)',
  },
  equipment: 'tape_or_gps',
  sexSpecific: false,
  certainty: {
    level: 'moderate',
    caveat: {
      en: 'Estimates VO2max with roughly ±5% error when the effort is maximal and the distance is measured accurately. It is a maximal test: warm up and stop if you feel dizzy.',
      es: 'Estima el VO2max con un error de ~±5% si el esfuerzo es máximo y la distancia se mide con precisión. Es un test MÁXIMO: calienta y detente si te mareas.',
    },
  },
  steps: [
    {
      en: 'Find a 400 m running track (or any route whose distance you know exactly, e.g. with a GPS app).',
      es: 'Busca una pista de 400 m (o una ruta cuya distancia conozcas con exactitud, p. ej. con una app GPS).',
    },
    {
      en: 'Warm up 5-10 minutes: light jog and joint mobility.',
      es: 'Calienta 5-10 minutos: trote suave y movilidad articular.',
    },
    {
      en: 'Run/walk as far as you can in EXACTLY 12 minutes. Steady pace — starting at a sprint always backfires.',
      es: 'Corre/camina la mayor distancia posible en EXACTAMENTE 12 minutos. Ritmo constante — empezar al sprint siempre sale mal.',
    },
    {
      en: 'Note the exact distance covered in meters (count laps: each track lap = 400 m).',
      es: 'Anota la distancia exacta recorrida en metros (cuenta las vueltas: cada vuelta de pista = 400 m).',
    },
    {
      en: 'Cool down walking 5 minutes, then record the distance in this app.',
      es: 'Enfría caminando 5 minutos y registra la distancia en esta app.',
    },
  ],
  tips: [
    {
      en: 'It is a run/WALK test: walking is allowed and still counts — the score just reflects your level.',
      es: 'Es un test de carrera/CAMINATA: caminar está permitido y cuenta — la puntuación simplemente refleja tu nivel.',
    },
    {
      en: 'Same track or same GPS route every time, or the comparison is polluted.',
      es: 'Misma pista o misma ruta GPS cada vez, o la comparación queda contaminada.',
    },
    {
      en: 'Retest every 6-8 weeks; more often adds noise, less often misses the trend.',
      es: 'Repítelo cada 6-8 semanas; más seguido añade ruido, menos seguido pierde la tendencia.',
    },
  ],
  fallbacks: [
    {
      en: 'No track and no GPS? A standard soccer field is ~100-110 m long: count lengths. Mark the final spot and measure it later with string + ruler.',
      es: '¿Sin pista ni GPS? Una cancha de fútbol mide ~100-110 m: cuenta los largos. Marca el punto final y mídelo después con hilo + regla.',
    },
  ],
  provenance: 'Cooper, K.H. (1968) JAMA 203:135-138; VO2max = (dist_m − 504.9) / 44.73',
};

export const RESTING_HR_GUIDE: MeasurementGuide = {
  id: 'resting-hr',
  target: 'resting_hr',
  title: {
    en: 'Resting heart rate: fingers and a clock',
    es: 'Frecuencia cardíaca en reposo: dedos y un reloj',
  },
  equipment: 'none',
  sexSpecific: false,
  certainty: {
    level: 'high',
    caveat: {
      en: 'A correctly taken manual pulse is very accurate — the risk is TAKING IT AT THE WRONG TIME. Caffeine, illness, stress, poor sleep and overtraining all raise it. Judge the trend across weeks, not one reading.',
      es: 'Un pulso manual bien tomado es muy preciso — el riesgo es TOMARLO EN MAL MOMENTO. Cafeína, enfermedad, estrés, mal sueño y sobreentrenamiento lo elevan. Juzga la tendencia de semanas, no una lectura suelta.',
    },
  },
  steps: [
    {
      en: 'Ideally in the morning, BEFORE getting out of bed (or sit relaxed for 5 minutes).',
      es: 'Idealmente por la mañana, ANTES de levantarte (o siéntate relajado 5 minutos).',
    },
    {
      en: 'Wrist: place index and middle fingers (never the thumb) on the thumb side of the wrist, below the base of the palm.',
      es: 'Muñeca: coloca índice y corazón (nunca el pulgar) en el lado del pulgar de la muñeca, bajo la base de la palma.',
    },
    {
      en: 'Count the beats for 60 seconds (or 15 s × 4). Write down the number.',
      es: 'Cuenta los latidos durante 60 segundos (o 15 s × 4). Anota el número.',
    },
    {
      en: 'Repeat on 2-3 different mornings and keep the MEDIAN as your resting HR.',
      es: 'Repite en 2-3 mañanas distintas y quédate con la MEDIANA como tu FC en reposo.',
    },
  ],
  tips: [
    {
      en: 'If you use the neck (carotid) pulse, press GENTLY and only ONE side — pressing both sides is dangerous.',
      es: 'Si usas el pulso del cuello (carótida), presiona SUAVE y solo UN lado — presionar ambos es peligroso.',
    },
    {
      en: 'No watch or phone clock nearby? Count for 30 s and double it — slightly less accurate but fine for tracking.',
      es: '¿Sin reloj ni teléfono cerca? Cuenta 30 s y duplícalo — un poco menos preciso pero sirve para seguimiento.',
    },
  ],
  fallbacks: [
    {
      en: 'Any device with a seconds display works: kitchen timer, wall clock, laptop clock.',
      es: 'Cualquier dispositivo con segundos sirve: temporizador de cocina, reloj de pared, reloj del portátil.',
    },
  ],
  provenance: 'Standard clinical practice; bands interpreted per AHA-style resting-HR references',
};

/** All guides, in the order the UI should present them. */
export const MEASUREMENT_GUIDES: readonly MeasurementGuide[] = [
  NAVY_TAPE_GUIDE,
  JP3_CALIPER_GUIDE,
  COOPER_GUIDE,
  RESTING_HR_GUIDE,
];

/** Guides serving a given measurement target, in presentation order. */
export function getGuidesForTarget(target: MeasurementGuide['target']): MeasurementGuide[] {
  return MEASUREMENT_GUIDES.filter((g) => g.target === target);
}

/** Locate a guide by its stable id, for deep links from measurement forms. */
export function getGuideById(id: string): MeasurementGuide | undefined {
  return MEASUREMENT_GUIDES.find((g) => g.id === id);
}
