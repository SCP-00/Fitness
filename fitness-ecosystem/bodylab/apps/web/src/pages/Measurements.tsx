import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, Ruler, Activity, Repeat, X, ChevronRight, Info, Minus, Zap, Gauge } from 'lucide-react';
import { useApp } from '../lib/store';
import { t } from '../i18n';
import { parseNumberInput } from '../lib/parse-num';
import { MEASUREMENT_TYPES, CIRCUMFERENCE_TYPES, COMPOSITION_TYPES, CONDITIONING_TYPES, LENGTH_TYPES, BREADTH_TYPES, SYMMETRY_PAIRS, SYMMETRY_GROUP_NAMES } from '../lib/constants';
import { MEASUREMENT_GUIDES as METHOD_GUIDES } from '../lib/measurement-guides';
import { estimateBodyFatNavy, NAVY_SEE_PCT } from '@fitness/bodylab-composition';
import { getLatestMeasurement } from '../lib/queries';
import { displayUnitFor, UNIT_LABELS, toDisplay, toCanonical, heightToDisplay, profileUnitFor } from '../lib/units';
import type { AllMeasurementType } from '../lib/types';

type MeasurementTab = 'overview' | 'circumference' | 'length' | 'composition' | 'symmetry' | 'conditioning';

// Body regions for visual selection
const BODY_REGIONS = [
  { id: 'torso', label: { en: 'Torso', es: 'Torso' }, icon: '🫁', types: ['chest', 'waist', 'hips', 'neck'] },
  { id: 'arms', label: { en: 'Arms', es: 'Brazos' }, icon: '💪', types: ['biceps', 'forearm', 'shoulders', 'wrist'] },
  { id: 'legs', label: { en: 'Legs', es: 'Piernas' }, icon: '🦵', types: ['thigh', 'calf'] },
];

// Measurement guides
const MEASUREMENT_GUIDES: Record<string, { en: string; es: string; tip: { en: string; es: string } }> = {
  chest: { en: 'Around the fullest part of the chest', es: 'Alrededor de la parte más amplia del pecho', tip: { en: 'Keep tape horizontal, under armpits', es: 'Mantén la cinta horizontal, bajo las axilas' } },
  waist: { en: 'At the narrowest point, above the navel', es: 'En el punto más estrecho, sobre el ombligo', tip: { en: 'Don\'t suck in — breathe normally', es: 'No te vacíes — respira normalmente' } },
  hips: { en: 'Around the widest part of the hips', es: 'Alrededor de la parte más amplia de las caderas', tip: { en: 'Feet together, tape horizontal', es: 'Pies juntos, cinta horizontal' } },
  neck: { en: 'Around the base of the neck', es: 'Alrededor de la base del cuello', tip: { en: 'Just above the collarbones', es: 'Justo encima de las clavículas' } },
  shoulders: { en: 'Around the widest point of shoulders', es: 'Alrededor del punto más ancho de los hombros', tip: { en: 'Arms at sides, measure over deltoids', es: 'Brazos a los lados, mide sobre los deltoides' } },
  biceps: { en: 'Fullest part of upper arm, relaxed', es: 'Parte más amplia del brazo, relajado', tip: { en: 'Arm extended, palm facing up', es: 'Brazo extendido, palma hacia arriba' } },
  forearm: { en: 'Widest part between elbow and wrist', es: 'Parte más amplia entre codo y muñeca', tip: { en: 'Arm extended, palm facing up', es: 'Brazo extendido, palma hacia arriba' } },
  thigh: { en: 'Upper thigh, just below crotch', es: 'Muslo superior, justo debajo de la entrepierna', tip: { en: 'Stand with weight evenly distributed', es: 'Parado con peso distribuido uniformemente' } },
  calf: { en: 'Widest part of the calf', es: 'Parte más amplia de la pantorrilla', tip: { en: 'Stand with weight on one leg', es: 'Parado con peso en una pierna' } },
  wrist: { en: 'Just above the wrist bone', es: 'Justo encima del hueso de la muñeca', tip: { en: 'Used as skeletal frame indicator', es: 'Se usa como indicador del marco esquelético' } },
  // Conditioning (tutorials live in lib/measurement-guides.ts — shown in the Conditioning tab)
  cooper_12m_distance: { en: 'Track or GPS app: cover the maximum distance in exactly 12 minutes', es: 'Pista o app GPS: recorre la máxima distancia en exactamente 12 minutos', tip: { en: 'Steady pace; walking is allowed', es: 'Ritmo constante; caminar está permitido' } },
  resting_heart_rate: { en: 'In the morning before getting up: count 60 s with index+middle fingers on the wrist', es: 'Por la mañana antes de levantarte: cuenta 60 s con índice y corazón en la muñeca', tip: { en: 'Caffeine, illness and stress raise it — judge the weekly trend', es: 'Cafeína, enfermedad y estrés la elevan — juzga la tendencia semanal' } },
  body_fat_measured: { en: 'Caliper (Jackson-Pollock 3 sites) or measuring tape (Navy method)', es: 'Plicómetro (Jackson-Pollock 3 pliegues) o cinta métrica (método Navy)', tip: { en: 'Skinfold sites differ by sex; the tape reads overall fatness', es: 'Los sitios de pliegue difieren por sexo; la cinta lee la gordura general' } },
  abdominal_skinfold: { en: 'Vertical fold 2 cm to the right of the navel (male Jackson-Pollock site)', es: 'Pliegue vertical 2 cm a la derecha del ombligo (sitio masculino de Jackson-Pollock)', tip: { en: 'Lift only skin+fat; for women the protocol uses triceps/suprailiac', es: 'Levanta solo piel+grasa; en mujeres el protocolo usa tríceps/suprailiaco' } },
  chest_skinfold: { en: 'Diagonal fold halfway between nipple and armpit (male JP3 site)', es: 'Pliegue diagonal a medio camino entre pezón y axila (sitio JP3 masculino)', tip: { en: 'Measure the RIGHT side; keep the median of 2-3 readings', es: 'Mide el lado DERECHO; quédate con la mediana de 2-3 lecturas' } },
  thigh_skinfold: { en: 'Vertical fold on the front of the thigh, halfway between hip and knee (JP3 site, both sexes)', es: 'Pliegue vertical al frente del muslo, entre cadera y rodilla (sitio JP3, ambos sexos)', tip: { en: 'Weight on the other leg so the thigh muscle stays relaxed', es: 'Apoya el peso en la otra pierna para que el muslo quede relajado' } },
  triceps_skinfold: { en: 'Vertical fold at the back of the arm, halfway between shoulder and elbow (female JP3 site)', es: 'Pliegue vertical en la parte posterior del brazo, entre hombro y codo (sitio JP3 femenino)', tip: { en: 'Let the arm hang relaxed; lift only skin+fat', es: 'Deja el brazo colgar relajado; levanta solo piel+grasa' } },
  suprailiac_skinfold: { en: 'Diagonal fold just above the hip bone, following its natural slant (female JP3 site)', es: 'Pliegue diagonal justo encima del hueso de la cadera, siguiendo su inclinación natural (sitio JP3 femenino)', tip: { en: 'Follow the hip crest angle — NOT a vertical fold', es: 'Sigue la inclinación de la cresta ilíaca — NO es un pliegue vertical' } },

  // ── New girths (tape only) ───────────────────────────────────────────────
  hip_upper: { en: 'Where the underwear sits, over the hip bones — above the widest part of the hips', es: 'Donde llega la ropa interior, sobre los huesos de la cadera — por encima del punto más ancho', tip: { en: 'Distinct from "hips": keep both, they read different fat pockets', es: 'Distinto de «cadera»: guarda los dos, leen bolsas de grasa distintas' } },
  triceps: { en: 'Back of the upper arm, halfway between shoulder and elbow', es: 'Parte posterior del brazo, entre hombro y codo', tip: { en: 'Arm hanging relaxed — a flexed arm changes the number', es: 'Brazo colgando relajado — un brazo contraído cambia el número' } },
  biceps_flexed: { en: 'Fullest part of the upper arm with the biceps squeezed', es: 'Parte más amplia del brazo con el bíceps contraído', tip: { en: 'Compare against relaxed biceps — the gap is the arm potential', es: 'Compáralo con el bíceps relajado — la diferencia es tu potencial de brazo' } },
  forearm_flexed: { en: 'Widest part of the forearm, hand closed', es: 'Parte más amplia del antebrazo, mano cerrada', tip: { en: 'Elbow at 90°, fist clenched hard', es: 'Codo a 90°, puño bien cerrado' } },
  mid_axillary: { en: 'Torso circumference at armpit level, tape horizontal', es: 'Circunferencia del torso a nivel de axilas, cinta horizontal', tip: { en: 'Arms down and relaxed; stands in for torso depth without a caliper', es: 'Brazos abajo y relajados; sustituye la profundidad del torso sin calibre' } },
  ankle: { en: 'Smallest part of the ankle, above the malleoli', es: 'Parte más estrecha del tobillo, sobre los maleolos', tip: { en: 'Feet flat and weight shared', es: 'Pies planos y el peso repartido' } },

  // ── Segment lengths ──────────────────────────────────────────────────────
  stature_sitting: { en: 'Sit on a chair with your back to the wall; measure wall to crown', es: 'Sentado con la espalda a la pared; mide del suelo a la coronilla', tip: { en: 'Height − sitting height = leg length; the ratio drives body proportions', es: 'Estatura − altura sentada = pierna; la relación define tus proporciones' } },
  arm_span: { en: 'Fingertip to fingertip with arms outstretched against a wall', es: 'Punta de dedos a punta de dedos con los brazos estirados contra la pared', tip: { en: 'Span ≈ height in adults; a big gap is worth double-checking', es: 'En adultos ≈ a la estatura; una gran diferencia conviene verificarla' } },
  subischial_leg_length: { en: 'From the crotch (sitting on a flat surface) to the floor', es: 'Desde la entrepierna (sentado sobre una superficie) hasta el suelo', tip: { en: 'The honest leg length — the one the model needs', es: 'La longitud de pierna real, la que el modelo necesita' } },
  upper_arm_length: { en: 'Shoulder point (acromion) to elbow point', es: 'Del hombro (acromion) al codo', tip: { en: 'Mark both landmarks first, then measure the marks', es: 'Marca primero los dos puntos y luego mide entre marcas' } },
  forearm_length: { en: 'Elbow point to wrist crease', es: 'Del codo a la muñeca', tip: { en: 'Palm up, forearm horizontal', es: 'Palma arriba, antebrazo horizontal' } },
  hand_length: { en: 'Wrist crease to the tip of the middle finger', es: 'De la muñeca a la punta del dedo medio', tip: { en: 'Fingers together, flat on the ruler', es: 'Dedos juntos, mano plana sobre la regla' } },
  thigh_length: { en: 'From the crotch to the front of the knee crease', es: 'De la entrepierna al pliegue frontal de la rodilla', tip: { en: 'Stand tall; the tape must not be pulled tight', es: 'De pie erguido; no tires de la cinta' } },
  lower_leg_length: { en: 'From the front of the knee to the floor', es: 'De la parte frontal de la rodilla al suelo', tip: { en: 'Weight evenly distributed, knees soft', es: 'Peso repartido, rodillas sin bloquear' } },
  foot_length: { en: 'Heel to the longest toe, standing on the tape', es: 'Del talón a la punta más larga, de pie sobre la cinta', tip: { en: 'Shoe SIZE is not foot length — measure the foot itself', es: 'La TALLA de zapato no es la longitud del pie — mide el pie' } },

  // ── Bone breadths (ruler + two books) ────────────────────────────────────
  biacromial: { en: 'Between the two shoulder points (acromion), the widest front-back-agnostic shoulder line', es: 'Entre los dos puntos del hombro (acromion), la línea de hombro más ancha', tip: { en: 'Books against each point, then measure the gap', es: 'Apoya un libro contra cada punto y mide la separación' } },
  bi_iliac: { en: 'Between the outer edges of the hip bones', es: 'Entre los bordes exteriores de los huesos de la cadera', tip: { en: 'Stand with feet together, hands on your hips', es: 'De pie con los pies juntos y las manos en las caderas' } },
  wrist_breadth: { en: 'Between the two wrist bones', es: 'Entre los dos huesecillos de la muñeca', tip: { en: 'Cup the bones from both sides with your fingers', es: 'Suena los dos huesos con los dedos por ambos lados' } },
  elbow_breadth: { en: 'Between the elbow bones with the arm straight', es: 'Entre los codos con el brazo estirado', tip: { en: 'Palm up, do not squeeze', es: 'Palma arriba, no aprietes' } },
  knee_breadth: { en: 'Between the widest points of the knee, just above the kneecap', es: 'Entre los puntos más anchos de la rodilla, justo sobre la rótula', tip: { en: 'Legs apart, thigh relaxed', es: 'Piernas separadas, muslo relajado' } },
  malleolar_breadth: { en: 'Between the two ankle bones', es: 'Entre los dos huesos del tobillo', tip: { en: 'Ankles together, weight off the feet', es: 'Tobillos juntos, sin apoyar peso' } },
  hand_width: { en: 'Across the knuckles of an open hand', es: 'A lo largo de los nudillos de la mano abierta', tip: { en: 'Fingers extended, thumb out of the way', es: 'Dedos extendidos, pulgar fuera de la línea' } },
};

// Composition display config
const COMPOSITION_DISPLAY: Record<string, { icon: string; color: string; gradient: string; ranges: { min: number; max: number; label: { en: string; es: string }; color: string }[] }> = {
  body_fat_percentage: {
    icon: '🔥',
    color: '#f97316',
    gradient: 'from-orange-400 to-red-500',
    ranges: [
      { min: 3, max: 10, label: { en: 'Essential', es: 'Esencial' }, color: '#3b82f6' },
      { min: 10, max: 14, label: { en: 'Athletic', es: 'Atlético' }, color: '#10b981' },
      { min: 14, max: 18, label: { en: 'Fit', es: 'En forma' }, color: '#22c55e' },
      { min: 18, max: 25, label: { en: 'Average', es: 'Promedio' }, color: '#f59e0b' },
      { min: 25, max: 60, label: { en: 'Above average', es: 'Por encima del promedio' }, color: '#ef4444' },
    ],
  },
  lean_mass: {
    icon: '💪',
    color: '#22c55e',
    gradient: 'from-green-400 to-emerald-500',
    ranges: [],
  },
  bone_mass: {
    icon: '🦴',
    color: '#78716c',
    gradient: 'from-stone-400 to-stone-600',
    ranges: [],
  },
  water_percentage: {
    icon: '💧',
    color: '#0ea5e9',
    gradient: 'from-cyan-400 to-blue-500',
    ranges: [
      { min: 30, max: 45, label: { en: 'Low', es: 'Bajo' }, color: '#f97316' },
      { min: 45, max: 60, label: { en: 'Normal', es: 'Normal' }, color: '#10b981' },
      { min: 60, max: 75, label: { en: 'High', es: 'Alto' }, color: '#0ea5e9' },
    ],
  },
};

const EQUIPMENT_LABELS: Record<string, { en: string; es: string }> = {
  none: { en: 'No equipment', es: 'Sin equipo' },
  tape_only: { en: 'Tape only', es: 'Solo cinta métrica' },
  tape_or_gps: { en: 'Tape or GPS', es: 'Cinta o GPS' },
  caliper: { en: 'Skinfold caliper', es: 'Plicómetro' },
};

/**
 * Stylized (schematic, not anatomical) front-view figure with numbered caliper
 * sites. Landmarks come from the guide registry as fractions of the viewBox.
 */
function Jp3SiteIllustration({ sex, sites, accent }: { sex: 'male' | 'female'; sites: { siteId: string; label: { en: string; es: string }; landmark: { x: number; y: number } | null }[]; accent: string }) {
  const stroke = 'rgba(100,116,139,0.9)';
  const fill = 'rgba(148,163,184,0.18)';
  const numbered = sites.filter(s => s.landmark !== null);
  return (
    <svg viewBox="0 0 100 110" className="w-full max-w-[190px]" role="img" aria-label={`Jackson-Pollock 3-site skinfold sites, ${sex} protocol`}>
      {/* head */}
      <circle cx="50" cy="10" r="7" fill={fill} stroke={stroke} strokeWidth="1.2" />
      {/* torso */}
      <path d="M38 20 Q50 17 62 20 L65 34 Q66 46 63 56 L37 56 Q34 46 35 34 Z" fill={fill} stroke={stroke} strokeWidth="1.2" />
      {/* arms (angled away so the triceps edge stays visible) */}
      <path d="M38 21 L28 40 L27 55" fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M62 21 L72 40 L73 55" fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
      {/* legs */}
      <path d="M43 56 L42 88 L42 104" fill="none" stroke={stroke} strokeWidth="4.4" strokeLinecap="round" />
      <path d="M57 56 L58 88 L58 104" fill="none" stroke={stroke} strokeWidth="4.4" strokeLinecap="round" />
      {sites.map((s, i) => {
        const lm = s.landmark;
        if (!lm) return null;
        const cx = lm.x * 100;
        const cy = lm.y * 110;
        return (
          <g key={s.siteId}>
            <circle cx={cx} cy={cy} r="4.6" fill={accent} opacity="0.25" />
            <circle cx={cx} cy={cy} r="2.4" fill={accent} />
            <text x={cx} y={cy + 1.4} textAnchor="middle" fontSize="3.2" fontWeight="700" fill="#ffffff">{i + 1}</text>
          </g>
        );
      })}
      <text x="50" y="109" textAnchor="middle" fontSize="3.4" fill="#94a3b8">
        {sex === 'female' ? '♀' : '♂'} {numbered.length}× JP3
      </text>
    </svg>
  );
}

export default function Measurements() {
  const { state, addMeasurement, removeMeasurement } = useApp();
  const [activeTab, setActiveTab] = useState<MeasurementTab>('overview');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [quickAddType, setQuickAddType] = useState<AllMeasurementType | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState<string | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const lang = state.language;
  // Display units (BL-MEAS-005) — inputs take in/lb, storage stays cm/kg
  const unitSystem = state.profile?.units ?? 'metric';
  const tapeUnit = UNIT_LABELS[displayUnitFor('neck', unitSystem)][lang];

  // Symmetry state
  const [symGroup, setSymGroup] = useState<string>(SYMMETRY_PAIRS[0]?.group ?? 'biceps');
  const [symLeft, setSymLeft] = useState('');
  const [symRight, setSymRight] = useState('');
  // Declared *after* `symGroup`: reading a `const` from the line above its own
  // `useState` is a temporal-dead-zone ReferenceError that blanks the whole page
  // (the minified binding is why the crash read `Cannot access 'H'`).
  const symUnit = UNIT_LABELS[displayUnitFor((SYMMETRY_PAIRS.find(p => p.group === symGroup)?.leftType ?? 'biceps_left') as AllMeasurementType, unitSystem)][lang];

  // Navy tape-form state (Conditioning tab): tape circumferences → estimated %BF
  const [navyOpen, setNavyOpen] = useState(false);
  const [navyNeck, setNavyNeck] = useState('');
  const [navyWaist, setNavyWaist] = useState('');
  const [navyHip, setNavyHip] = useState('');
  const [navyError, setNavyError] = useState<string | null>(null);
  const profileSex: 'male' | 'female' = state.profile?.biologicalSex === 'female' ? 'female' : 'male';
  const navyHeightCm = state.profile ? Math.round(state.profile.height * 1000) / 10 : null;

  // Live preview of the Navy estimate (null while inputs are incomplete/invalid)
  const navyPreview = (() => {
    if (navyHeightCm == null) return null;
    const neck = parseNumberInput(navyNeck);
    const waist = parseNumberInput(navyWaist);
    if (neck === null || waist === null) return null;
    const hip = profileSex === 'female' ? parseNumberInput(navyHip) : null;
    // Tape inputs are in display units — convert to canonical cm first
    return estimateBodyFatNavy({
      heightCm: navyHeightCm,
      neckCm: toCanonical('neck', neck, unitSystem),
      waistCm: toCanonical('waist', waist, unitSystem),
      hipCm: hip !== null ? toCanonical('hips', hip, unitSystem) : null,
      sex: profileSex,
    });
  })();

  // Focus quick-add input when visible
  useEffect(() => {
    if (quickAddVisible && quickAddRef.current) {
      quickAddRef.current.focus();
    }
  }, [quickAddVisible]);

  const handleQuickAdd = useCallback((type: AllMeasurementType) => {
    setQuickAddType(type);
    setQuickAddValue('');
    setQuickAddVisible(true);
  }, []);

  const submitQuickAdd = useCallback(() => {
    if (!quickAddType || !quickAddValue) return;
    const val = parseNumberInput(quickAddValue);
    if (val === null || val <= 0) return;

    addMeasurement({
      type: quickAddType,
      value: toCanonical(quickAddType, val, unitSystem),
      unit: MEASUREMENT_TYPES.find(t => t.id === quickAddType)?.unit ?? 'cm',
    });
    setQuickAddValue('');
    setQuickAddVisible(false);
    setQuickAddType(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [quickAddType, quickAddValue, addMeasurement, unitSystem]);

  const handleSymmetryAdd = () => {
    const pair = SYMMETRY_PAIRS.find(p => p.group === symGroup);
    if (!pair) return;
    if (symLeft) {
      const leftVal = parseNumberInput(symLeft);
      if (leftVal !== null && leftVal > 0) {
        addMeasurement({ type: pair.leftType as AllMeasurementType, value: toCanonical(pair.leftType as AllMeasurementType, leftVal, unitSystem), unit: 'cm' });
      }
    }
    if (symRight) {
      const rightVal = parseNumberInput(symRight);
      if (rightVal !== null && rightVal > 0) {
        addMeasurement({ type: pair.rightType as AllMeasurementType, value: toCanonical(pair.rightType as AllMeasurementType, rightVal, unitSystem), unit: 'cm' });
      }
    }
    setSymLeft('');
    setSymRight('');
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const submitNavyEstimate = useCallback(() => {
    if (navyHeightCm == null) {
      setNavyError(lang === 'es' ? 'Crea primero tu perfil (necesito tu estatura).' : 'Create your profile first (height is needed).');
      return;
    }
    const neck = parseNumberInput(navyNeck);
    const waist = parseNumberInput(navyWaist);
    const hip = profileSex === 'female' ? parseNumberInput(navyHip) : null;
    const missingHip = profileSex === 'female' && (navyHip.trim() === '' || hip === null);
    if (neck === null || waist === null || missingHip) {
      setNavyError(lang === 'es' ? 'Completa todas las medidas de cinta.' : 'Fill in every tape measurement.');
      return;
    }
    // Display units in, canonical cm into the formula (BL-MEAS-005)
    const neckCm = toCanonical('neck', neck, unitSystem);
    const waistCm = toCanonical('waist', waist, unitSystem);
    const hipCm = hip !== null ? toCanonical('hips', hip, unitSystem) : null;
    const result = estimateBodyFatNavy({ heightCm: navyHeightCm, neckCm, waistCm, hipCm, sex: profileSex });
    if (!result) {
      setNavyError(
        lang === 'es'
          ? 'Medidas fuera de rango fisiológico (revisa cuello/cintura/cadera).'
          : 'Measurements outside the physiological range (check neck/waist/hip).'
      );
      return;
    }
    // Stored as the measured body-fat axis of the conditioning profile —
    // flagged low-confidence because it is an ESTIMATE (±3.5% published SEE).
    addMeasurement({
      type: 'body_fat_measured',
      value: result.bodyFatPct,
      unit: '%',
      confidence: 'low',
      notes: lang === 'es'
        ? `Método Navy con cinta (error publicado ±${String(NAVY_SEE_PCT).replace('.', ',')}%): cuello ${neck} · cintura ${waist}${hip != null ? ` · cadera ${hip}` : ''} ${tapeUnit}`
        : `Navy tape method (published error ±${NAVY_SEE_PCT}%): neck ${neck} · waist ${waist}${hip != null ? ` · hip ${hip}` : ''} ${tapeUnit}`,
    });
    setNavyNeck('');
    setNavyWaist('');
    setNavyHip('');
    setNavyError(null);
    setNavyOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [navyNeck, navyWaist, navyHip, navyHeightCm, profileSex, lang, addMeasurement, unitSystem, tapeUnit]);

  const getMeasurement = (type: string) => getLatestMeasurement(state.measurements, type as AllMeasurementType);
  const getRange = (type: string) => {
    const info = MEASUREMENT_TYPES.find(t => t.id === type);
    return info ? { min: info.min, max: info.max } : null;
  };

  // Overview: all measurements organized by region
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: lang === 'es' ? 'Circunferencias' : 'Circumferences', count: state.measurements.filter(m => CIRCUMFERENCE_TYPES.some(t => t.id === m.type)).length, icon: '📏', color: '#3b82f6' },
          { label: lang === 'es' ? 'Composición' : 'Composition', count: state.measurements.filter(m => COMPOSITION_TYPES.some(t => t.id === m.type)).length, icon: '🔬', color: '#8b5cf6' },
          { label: lang === 'es' ? 'Bilateral' : 'Bilateral', count: state.measurements.filter(m => m.type.includes('_left') || m.type.includes('_right')).length, icon: '⚖️', color: '#10b981' },
          { label: lang === 'es' ? 'Total' : 'Total', count: state.measurements.length, icon: '📊', color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-transparent hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Body Region Cards */}
      {BODY_REGIONS.map(region => (
        <div key={region.id} className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-slate-100 dark:border-transparent overflow-hidden">
          <button
            onClick={() => setSelectedRegion(selectedRegion === region.id ? null : region.id)}
            className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-input-bg)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{region.icon}</span>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{region.label[lang]}</h3>
                <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">
                  {region.types.filter(t => getMeasurement(t)).length}/{region.types.length} {lang === 'es' ? 'registradas' : 'recorded'}
                </p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${selectedRegion === region.id ? 'rotate-90' : ''}`} />
          </button>

          {selectedRegion === region.id && (
            <div className="border-t border-slate-100  p-4 space-y-2">
              {region.types.map(typeId => {
                const meas = getMeasurement(typeId);
                const info = MEASUREMENT_TYPES.find(t => t.id === typeId);
                const range = getRange(typeId);
                const inRange = meas && range ? meas.value >= range.min && meas.value <= range.max : null;
                const guide = MEASUREMENT_GUIDES[typeId];

                return (
                  <div key={typeId} className="flex items-center gap-3 p-3 bg-[var(--color-input-bg)] rounded-xl hover:bg-slate-100 dark:hover:bg-[var(--color-surface-elevated)] transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 dark:text-[var(--color-text)]">{info?.label[lang] ?? typeId}</span>
                        {guide && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowGuide(showGuide === typeId ? null : typeId); }}
                            className="p-0.5 text-slate-400 hover:text-indigo-500 transition-colors"
                            title={guide.tip[lang]}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {showGuide === typeId && guide && (
                        <div className="mt-1 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700">
                          <p>{guide[lang]}</p>
                          <p className="text-indigo-500 mt-0.5">💡 {guide.tip[lang]}</p>
                        </div>
                      )}
                    </div>

                    {meas ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900 dark:text-[var(--color-text)]">{toDisplay(typeId as AllMeasurementType, meas.value, unitSystem)}</span>
                          <span className="text-xs text-slate-500 ml-1">{UNIT_LABELS[displayUnitFor(typeId as AllMeasurementType, unitSystem)][lang]}</span>
                        </div>
                        {inRange !== null && (
                          <div className={`w-2 h-2 rounded-full ${inRange ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        )}
                        <button
                          onClick={() => removeMeasurement(meas.id)}
                          className="p-1.5 text-slate-400 dark:text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleQuickAdd(typeId as AllMeasurementType)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        {lang === 'es' ? 'Agregar' : 'Add'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Quick Add Floating */}
      {quickAddVisible && quickAddType && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-slate-200 p-4 flex items-center gap-3 animate-slide-up">
          <span className="text-sm font-medium text-slate-700 dark:text-[var(--color-text-secondary)]">
            {MEASUREMENT_TYPES.find(t => t.id === quickAddType)?.label[lang]}:
          </span>
          <input
            ref={quickAddRef}
            type="number"
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitQuickAdd();
              if (e.key === 'Escape') { setQuickAddVisible(false); setQuickAddType(null); }
            }}
            placeholder={(() => {
              const r = getRange(quickAddType);
              return r ? `${toDisplay(quickAddType, r.min, unitSystem)}-${toDisplay(quickAddType, r.max, unitSystem)}` : '0';
            })()}
            step="0.1"
            className="w-24 px-3 py-2 border border-slate-200  rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <span className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
            {UNIT_LABELS[displayUnitFor(quickAddType, unitSystem)][lang]}
          </span>
          <button
            onClick={submitQuickAdd}
            disabled={!quickAddValue}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setQuickAddVisible(false); setQuickAddType(null); }}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  // Composition tab with visual gauges
  const renderComposition = () => (
    <div className="space-y-4">
      {Object.entries(COMPOSITION_DISPLAY).map(([id, config]) => {
        const meas = getMeasurement(id);
        const info = COMPOSITION_TYPES.find(t => t.id === id);
        const currentRange = config.ranges.find(r => meas && meas.value >= r.min && meas.value < r.max);

        return (
          <div key={id} className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{info?.label[lang] ?? id}</h3>
                  <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{UNIT_LABELS[displayUnitFor(id as AllMeasurementType, unitSystem)][lang]}</p>
                </div>
              </div>
              {meas ? (
                <button
                  onClick={() => removeMeasurement(meas.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleQuickAdd(id as AllMeasurementType)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {lang === 'es' ? 'Agregar' : 'Add'}
                </button>
              )}
            </div>

            {meas ? (
              <div>
                {/* Big value display */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-bold" style={{ color: config.color }}>{toDisplay(id as AllMeasurementType, meas.value, unitSystem)}</span>
                  <span className="text-lg text-slate-500 dark:text-[var(--color-text-muted)]">{UNIT_LABELS[displayUnitFor(id as AllMeasurementType, unitSystem)][lang]}</span>
                  {currentRange && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: currentRange.color + '20', color: currentRange.color }}>
                      {currentRange.label[lang]}
                    </span>
                  )}
                </div>

                {/* Range bar */}
                {config.ranges.length > 0 && (
                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    {config.ranges.map((range, i) => {
                      const totalRange = config.ranges[config.ranges.length - 1].max - config.ranges[0].min;
                      const left = ((range.min - config.ranges[0].min) / totalRange) * 100;
                      const width = ((range.max - range.min) / totalRange) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute h-full opacity-30"
                          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: range.color }}
                        />
                      );
                    })}
                    {/* Current value indicator */}
                    {meas && (
                      <div
                        className="absolute top-0 h-full w-1 bg-slate-900 rounded-full transition-all duration-500"
                        style={{
                          left: `${Math.max(0, Math.min(100, ((meas.value - config.ranges[0].min) / (config.ranges[config.ranges.length - 1].max - config.ranges[0].min)) * 100))}%`,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 dark:text-[var(--color-text-muted)]">
                <p className="text-sm">{lang === 'es' ? 'Sin datos registrados' : 'No data recorded'}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Symmetry tab
  const renderSymmetry = () => (
    <div className="space-y-4">
      {/* Add form */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <h3 className="font-semibold text-slate-900 mb-3">
          {lang === 'es' ? 'Agregar Medida Bilateral' : 'Add Bilateral Measurement'}
        </h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {lang === 'es' ? 'Grupo' : 'Group'}
            </label>
            <select
              value={symGroup}
              onChange={(e) => setSymGroup(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200  rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {SYMMETRY_PAIRS.map((pair) => (
                <option key={pair.group} value={pair.group}>
                  {SYMMETRY_GROUP_NAMES[pair.group]?.[lang] ?? pair.group}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium text-slate-500 mb-1">L ({symUnit})</label>
            <input
              type="number"
              value={symLeft}
              onChange={(e) => setSymLeft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSymmetryAdd()}
              placeholder="—"
              step="0.1"
              className="w-full px-3 py-2.5 border border-slate-200  rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="text-slate-300 font-medium pb-3">/</div>
          <div className="w-24">
            <label className="block text-xs font-medium text-slate-500 mb-1">R ({symUnit})</label>
            <input
              type="number"
              value={symRight}
              onChange={(e) => setSymRight(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSymmetryAdd()}
              placeholder="—"
              step="0.1"
              className="w-full px-3 py-2.5 border border-slate-200  rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSymmetryAdd}
            disabled={!symLeft && !symRight}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Symmetry cards */}
      {SYMMETRY_PAIRS.map(pair => {
        const left = getMeasurement(pair.leftType);
        const right = getMeasurement(pair.rightType);
        const groupName = SYMMETRY_GROUP_NAMES[pair.group]?.[lang] ?? pair.group;

        if (!left && !right) return null;

        const leftVal = left?.value;
        const rightVal = right?.value;
        let symPercent: number | null = null;
        let symStatus: 'balanced' | 'mild' | 'significant' | null = null;

        if (leftVal && rightVal) {
          symPercent = Math.round((Math.min(leftVal, rightVal) / Math.max(leftVal, rightVal)) * 1000) / 10;
          if (symPercent >= 95) symStatus = 'balanced';
          else if (symPercent >= 85) symStatus = 'mild';
          else symStatus = 'significant';
        }

        const statusConfig = {
          balanced: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: '#10b981', label: { en: 'Balanced', es: 'Balanceado' } },
          mild: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: '#f59e0b', label: { en: 'Mild deviation', es: 'Leve desviación' } },
          significant: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: '#ef4444', label: { en: 'Needs attention', es: 'Requiere atención' } },
        };

        return (
          <div key={pair.group} className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{groupName}</h3>
              <div className="flex items-center gap-2">
                {symPercent !== null && symStatus && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig[symStatus].bg} ${statusConfig[symStatus].text} ${statusConfig[symStatus].border}`}>
                    {symPercent}% · {statusConfig[symStatus].label[lang]}
                  </span>
                )}
                {left && (
                  <button onClick={() => removeMeasurement(left.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {right && (
                  <button onClick={() => removeMeasurement(right.id)} className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              {/* Left */}
              <div className="text-center p-4 bg-[var(--color-input-bg)] rounded-xl">
                <p className="text-xs text-slate-500 mb-1">{lang === 'es' ? 'Izquierda' : 'Left'}</p>
                {leftVal !== undefined ? (
                  <p className="text-2xl font-bold text-slate-900 dark:text-[var(--color-text)]">{toDisplay(pair.leftType as AllMeasurementType, leftVal, unitSystem)}<span className="text-sm font-normal text-slate-500 ml-1">{symUnit}</span></p>
                ) : (
                  <p className="text-slate-400 text-sm">—</p>
                )}
              </div>

              {/* Center indicator */}
              <div className="flex flex-col items-center">
                {symPercent !== null ? (
                  <>
                    {symPercent >= 95 ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-600" />
                      </div>
                    ) : symPercent >= 85 ? (
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Minus className="w-5 h-5 text-amber-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <Repeat className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                    <span className="text-xs text-slate-500 mt-1">
                      {leftVal && rightVal ? `${toDisplay(pair.leftType as AllMeasurementType, Math.abs(leftVal - rightVal), unitSystem).toFixed(1)}${symUnit}` : ''}
                    </span>
                  </>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-400 text-xs">?</span>
                  </div>
                )}
              </div>

              {/* Right */}
              <div className="text-center p-4 bg-[var(--color-input-bg)] rounded-xl">
                <p className="text-xs text-slate-500 mb-1">{lang === 'es' ? 'Derecha' : 'Right'}</p>
                {rightVal !== undefined ? (
                  <p className="text-2xl font-bold text-slate-900 dark:text-[var(--color-text)]">{toDisplay(pair.rightType as AllMeasurementType, rightVal, unitSystem)}<span className="text-sm font-normal text-slate-500 ml-1">{symUnit}</span></p>
                ) : (
                  <p className="text-slate-400 text-sm">—</p>
                )}
              </div>
            </div>

            {/* Symmetry bar */}
            {symPercent !== null && symStatus && (
              <div className="mt-3">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${symPercent}%`, backgroundColor: statusConfig[symStatus].bar }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {SYMMETRY_PAIRS.every(pair => !getMeasurement(pair.leftType) && !getMeasurement(pair.rightType)) && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-12 shadow-sm border border-slate-100 dark:border-transparent text-center">
          <Repeat className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
            {lang === 'es' ? 'No hay medidas bilaterales' : 'No bilateral measurements'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'es'
              ? 'Registra medidas L/R para cada extremidad y compara la simetría'
              : 'Record L/R measurements for each limb to compare symmetry'}
          </p>
        </div>
      )}
    </div>
  );

  const renderConditioning = () => (
    <div className="space-y-3">
      {CONDITIONING_TYPES.map(typeInfo => {
        const meas = getMeasurement(typeInfo.id);
        const guide = MEASUREMENT_GUIDES[typeInfo.id];
        return (
          <div key={typeInfo.id} className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent">
            <div className="flex items-center justify-between">                <div className="min-w-0">
                <p className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{typeInfo.label[lang]}</p>
                {guide && <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mt-0.5">{guide[lang]}</p>}
              </div>
              {meas ? (
                <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{toDisplay(typeInfo.id, meas.value, unitSystem)}<span className="text-sm text-slate-500 ml-1">{UNIT_LABELS[displayUnitFor(typeInfo.id, unitSystem)][lang]}</span></span>
              ) : (
                <button
                  onClick={() => handleQuickAdd(typeInfo.id as AllMeasurementType)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {lang === 'es' ? 'Agregar' : 'Add'}
                </button>
              )}
            </div>
            {guide && showGuide === typeInfo.id && (
              <div className="mt-2 p-2 bg-indigo-50 rounded-lg text-xs text-indigo-700">💡 {guide.tip[lang]}</div>
            )}
          </div>
        );
      })}

      {/* Navy tape form — estimates %BF from circumferences and stores it */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-slate-100 dark:border-transparent">
        <button
          onClick={() => setNavyOpen(!navyOpen)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div>
            <p className="font-semibold text-slate-900 dark:text-[var(--color-text)]">
              {lang === 'es' ? '🩹 Estimar %BF con cinta métrica (método Navy)' : '🩹 Estimate body fat with a tape (Navy method)'}
            </p>
            <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mt-0.5">
              {lang === 'es'
                ? `Sin plicómetro: cuello + cintura${profileSex === 'female' ? ' + cadera' : ''} · error ±${String(NAVY_SEE_PCT).replace('.', ',')}%`
                : `No caliper needed: neck + waist${profileSex === 'female' ? ' + hip' : ''} · ±${NAVY_SEE_PCT}% error`}
            </p>
          </div>
          <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${navyOpen ? 'rotate-90' : ''}`} />
        </button>

        {navyOpen && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
                  {lang === 'es' ? `Cuello (${tapeUnit})` : `Neck (${tapeUnit})`}
                </span>
                <input
                  type="text" inputMode="decimal" value={navyNeck}
                  onChange={(e) => setNavyNeck(e.target.value)}
                  placeholder="30-50"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
                  {lang === 'es' ? `Cintura (${tapeUnit})` : `Waist (${tapeUnit})`}
                </span>
                <input
                  type="text" inputMode="decimal" value={navyWaist}
                  onChange={(e) => setNavyWaist(e.target.value)}
                  placeholder="60-130"
                  className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              {profileSex === 'female' && (
                <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
                  {lang === 'es' ? `Cadera (${tapeUnit})` : `Hip (${tapeUnit})`}
                </span>
                  <input
                    type="text" inputMode="decimal" value={navyHip}
                    onChange={(e) => setNavyHip(e.target.value)}
                    placeholder="80-140"
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
              )}
              <div className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
                  {lang === 'es' ? 'Estatura (perfil)' : 'Height (profile)'}
                </span>
                <p className="mt-1 px-3 py-2 text-sm text-slate-700 dark:text-[var(--color-text-secondary)] bg-[var(--color-input-bg)] rounded-xl">
                  {navyHeightCm != null
                    ? `${heightToDisplay(state.profile!.height, unitSystem)} ${profileUnitFor('height', unitSystem)}`
                    : '—'}
                </p>
              </div>
            </div>

            {navyPreview && (
              <div className="flex items-baseline gap-2 p-3 bg-indigo-50 rounded-xl">
                <span className="text-3xl font-bold text-indigo-700">{navyPreview.bodyFatPct}%</span>
                <span className="text-xs text-indigo-600">
                  {lang === 'es' ? `estimación Navy · ±${String(NAVY_SEE_PCT).replace('.', ',')}% de error publicado` : `Navy estimate · ±${NAVY_SEE_PCT}% published error`}
                </span>
              </div>
            )}

            {navyError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">⚠️ {navyError}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={submitNavyEstimate}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
              >
                {lang === 'es' ? 'Guardar %BF estimado' : 'Save estimated %BF'}
              </button>
              <p className="text-[11px] text-slate-400 max-w-sm">
                {lang === 'es'
                  ? 'Se guarda como % grasa real (medida), marcado como estimación de baja confianza.'
                  : 'Stored as measured body fat, flagged as a low-confidence estimate.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-[var(--color-text)]">
          {lang === 'es' ? 'Cómo medir cada método' : 'How to measure each method'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
          {lang === 'es'
            ? 'Con el equipo que tengas — y con su nivel de certeza real.'
            : 'With whatever equipment you have — and their real certainty level.'}
        </p>
      </div>

      {METHOD_GUIDES.map(g => (
        <div key={g.id} className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{g.title[lang]}</h3>
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                g.certainty.level === 'high'
                  ? 'bg-emerald-50 text-emerald-700'
                  : g.certainty.level === 'moderate'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-orange-50 text-orange-700'
              }`}
            >
              {g.certainty.seePct
                ? `±${g.certainty.seePct}%`
                : g.certainty.level === 'high'
                  ? (lang === 'es' ? 'Alta' : 'High')
                  : g.certainty.level === 'moderate'
                    ? (lang === 'es' ? 'Media' : 'Moderate')
                    : (lang === 'es' ? 'Aprox.' : 'Approx.')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{EQUIPMENT_LABELS[g.equipment][lang]}</span>
            {g.sexSpecific && (
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                {lang === 'es' ? 'Sitios según sexo' : 'Sex-specific sites'}
              </span>
            )}
          </div>
          <div className="p-3 bg-amber-50/60 rounded-xl text-xs text-amber-800">⚠️ {g.certainty.caveat[lang]}</div>
          {g.siteIllustrations && (
            <div className="grid md:grid-cols-2 gap-4">
              {(['female', 'male'] as const).map(sexKey => {
                const illo = g.siteIllustrations![sexKey];
                return (
                  <div key={sexKey} className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-purple-700">
                        {sexKey === 'female' ? (lang === 'es' ? '♀ Protocolo femenino' : '♀ Female protocol') : (lang === 'es' ? '♂ Protocolo masculino' : '♂ Male protocol')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {illo.sites.map(s => s.siteId).join(' · ')}
                      </span>
                    </div>
                    <div className="flex gap-3 items-start">
                      <Jp3SiteIllustration sex={sexKey} sites={illo.sites} accent={sexKey === 'female' ? '#9333ea' : '#4f46e5'} />
                      <ol className="flex-1 space-y-1.5 text-xs text-slate-700 dark:text-[var(--color-text-secondary)] list-decimal list-inside">
                        {illo.sites.map(s => <li key={s.siteId}>{s.label[lang]}</li>)}
                      </ol>
                    </div>
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                      ⚠️ {illo.distributionNote[lang]}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <ol className="space-y-1.5 text-sm text-slate-700 dark:text-[var(--color-text-secondary)] list-decimal list-inside">
            {g.steps.map((s, i) => <li key={i}>{s[lang]}</li>)}
          </ol>
          <div className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] space-y-1">
            {g.tips.map((tip, i) => <p key={`t${i}`}>💡 {tip[lang]}</p>)}
            {g.fallbacks.map((f, i) => <p key={`f${i}`}>🧵 {f[lang]}</p>)}
            <p className="text-[11px] italic text-slate-400">{g.provenance}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[var(--color-text)]">{t('measurements.title')}</h1>
          <p className="text-slate-500 dark:text-[var(--color-text-muted)]">{t('measurements.subtitle')}</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{lang === 'es' ? 'Guardado' : 'Saved'}</span>
          </div>
        )}
      </div>

      {/* Tabs — horizontally scrollable: six entries do not fit a 390 px phone,
          and a wrapped tab strip on mobile is worse than a scrollable one. */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit max-w-full overflow-x-auto">
        {[
          { id: 'overview' as const, label: lang === 'es' ? 'Vista General' : 'Overview', icon: Zap },
          { id: 'circumference' as const, label: t('measurements.circumference'), icon: Ruler },
          { id: 'length' as const, label: lang === 'es' ? 'Longitudes y anchuras' : 'Lengths & breadths', icon: Ruler },
          { id: 'composition' as const, label: t('measurements.composition'), icon: Activity },
          { id: 'symmetry' as const, label: lang === 'es' ? 'Simetría' : 'Symmetry', icon: Repeat },
          { id: 'conditioning' as const, label: lang === 'es' ? 'Condición' : 'Conditioning', icon: Gauge },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'circumference' && (
        <div className="space-y-3">
          {CIRCUMFERENCE_TYPES.map(typeInfo => {            const meas = getMeasurement(typeInfo.id);
            const guide = MEASUREMENT_GUIDES[typeInfo.id];
            return (
              <div key={typeInfo.id} className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{typeInfo.label[lang]}</p>
                    {guide && <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{guide[lang]}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {meas ? (
                    <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{toDisplay(typeInfo.id, meas.value, unitSystem)}<span className="text-sm text-slate-500 ml-1">{UNIT_LABELS[displayUnitFor(typeInfo.id, unitSystem)][lang]}</span></span>
                  ) : (
                    <button
                      onClick={() => handleQuickAdd(typeInfo.id as AllMeasurementType)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {lang === 'es' ? 'Agregar' : 'Add'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeTab === 'length' && (
        <div className="space-y-3">
          {[
            { key: 'length', heading: lang === 'es' ? 'Longitudes — cinta y pared' : 'Lengths — tape and a wall', list: LENGTH_TYPES },
            { key: 'breadth', heading: lang === 'es' ? 'Anchuras — regla y dos libros' : 'Breadths — a ruler and two books', list: BREADTH_TYPES },
          ].map(group => (
            <div key={group.key} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 pt-2">
                {group.heading}
              </p>
              {group.list.map(typeInfo => {
                const meas = getMeasurement(typeInfo.id);
                const guide = MEASUREMENT_GUIDES[typeInfo.id];
                return (
                  <div key={typeInfo.id} className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{typeInfo.label[lang]}</p>
                        {guide && <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{guide[lang]}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {meas ? (
                        <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{toDisplay(typeInfo.id, meas.value, unitSystem)}<span className="text-sm text-slate-500 ml-1">{UNIT_LABELS[displayUnitFor(typeInfo.id, unitSystem)][lang]}</span></span>
                      ) : (
                        <button
                          onClick={() => handleQuickAdd(typeInfo.id as AllMeasurementType)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {lang === 'es' ? 'Agregar' : 'Add'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {activeTab === 'composition' && renderComposition()}
      {activeTab === 'symmetry' && renderSymmetry()}
      {activeTab === 'conditioning' && renderConditioning()}
    </div>
  );
}
