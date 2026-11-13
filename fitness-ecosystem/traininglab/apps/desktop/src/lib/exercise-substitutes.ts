/**
 * Exercise substitutes & biomechanical alternative finder.
 *
 * Grounded in hypertrophy and sports biomechanics literature:
 *   1. **Stretch-mediated hypertrophy** (Maeo et al. 2021, MSSE 53(4):825-837 —
 *      seated > prone leg curl; Maeo et al. 2023, EJSS — overhead > neutral
 *      triceps extension):
 *      Exercises that place high mechanical tension on muscle fibers in their
 *      lengthened position (e.g. seated leg curls over lying, overhead triceps
 *      over pushdowns, incline DB curls, deficit push-ups/lunges).
 *   2. **Stimulus-to-Fatigue Ratio (SFR)**:
 *      Maximizing target muscle stimulation while minimizing non-productive
 *      systemic fatigue and axial/joint wear (e.g. chest-supported rows over
 *      bent-over barbell rows, dumbbell/machine presses over flat barbell).
 *   3. **Individual Anthropometry & Leverages**:
 *      - Lifters with long femurs / short torsos suffer excessive trunk lean
 *        and lumbar shear on Back Squats; Front Squat, Hack Squat, Leg Press,
 *        or Goblet Squats keep the torso upright and isolate quadriceps.
 *      - Lifters with shoulder sensitivity benefit from neutral-grip dumbbells
 *        or convergent machines instead of fixed straight-bar benches.
 *   4. **Equipment & Environment Adaptability**:
 *      - Gym machine occupied -> dumbbell or cable equivalent.
 *      - Training at home or park -> bodyweight, dip bar, or band equivalent.
 *
 * Pure, deterministic, explainable.
 *
 * @module lib/exercise-substitutes
 */

import {
  ALL_EXERCISES,
  EXERCISE_TRAITS,
  getTraits,
  satisfies,
  type Capability,
  type Exercise,
  type ExerciseTraits,
  type OwnedEquipment,
} from "@fitness/bodylab-exercises";
import { ownedCapabilities } from "@fitness/bodylab-exercises";

/** Biomechanical notes and annotations grounded in scientific evidence. */
interface ScienceAnnotation {
  stretchAdvantage?: boolean;
  spineFriendly?: boolean;
  jointFriendly?: boolean;
  anatomicalNote?: { es: string; en: string };
  scientificReason?: { es: string; en: string };
}

export const BIOMECHANICAL_ANNOTATIONS: Record<string, ScienceAnnotation> = {
  // ── Chest / Push ─────────────────────────────────────────────────────────
  "dumbbell-bench-press": {
    jointFriendly: true,
    stretchAdvantage: true,
    anatomicalNote: {
      es: "Excelente para brazos largos: permite rotación natural de muñeca y mayor estiramiento en la caja torácica.",
      en: "Ideal for long arms: allows natural wrist rotation and deeper chest stretch at the bottom.",
    },
    scientificReason: {
      es: "Mayor libertad articular en hombros y mayor rango en estiramiento comparado con barra recta.",
      en: "Reduced shoulder impingement torque with greater stretch under tension than a barbell.",
    },
  },
  "incline-dumbbell-press": {
    jointFriendly: true,
    stretchAdvantage: true,
    anatomicalNote: {
      es: "Ángulo de 30° enfoca el haz clavicular sin sobrecargar el manguito rotador.",
      en: "30-degree incline aligns with upper clavicular fibers with minimal anterior shoulder stress.",
    },
    scientificReason: {
      es: "Mayor activación del pectoral superior con menor estrés en acromion.",
      en: "Peak clavicular chest recruitment with lower subacromial shear.",
    },
  },
  "machine-bench-press": {
    jointFriendly: true,
    spineFriendly: true,
    scientificReason: {
      es: "Trayectoria guiada y convergente: máximo estímulo muscular con mínimo estrés de estabilización.",
      en: "Guided convergent path: high target muscle tension with near-zero stabilizer fatigue.",
    },
  },
  "deficit-push-up": {
    stretchAdvantage: true,
    scientificReason: {
      es: "Mayor rango de movimiento: somete al pectoral a hipertrofia mediada por estiramiento.",
      en: "Deeper ROM exposes pectoralis major to stretch-mediated hypertrophy.",
    },
  },

  // ── Back / Pull ──────────────────────────────────────────────────────────
  "chest-supported-dumbbell-row": {
    spineFriendly: true,
    scientificReason: {
      es: "El banco elimina la carga en la zona lumbar (erectores), permitiendo llevar la espalda al fallo real.",
      en: "Chest pad removes spinal erector fatigue, isolating lats and rhomboids safely to failure.",
    },
    anatomicalNote: {
      es: "La mejor opción si tienes fatiga en la espalda baja o hernias lumbares.",
      en: "Best choice if you suffer from lower back tightness or spinal compression.",
    },
  },
  "dumbbell-row": {
    spineFriendly: true,
    jointFriendly: true,
    scientificReason: {
      es: "Apoyo en banco unilateral: divide la carga espinal y permite mayor recorrido escapular.",
      en: "Unilateral bench support halves lumbar load and maximizes scapular excursion.",
    },
  },
  "lat-pulldown": {
    spineFriendly: true,
    scientificReason: {
      es: "Tracción vertical guiada sin requerir estabilización del core; ajuste milimétrico de sobrecarga.",
      en: "Pure vertical pull without core fatigue; precise micro-loading.",
    },
  },

  // ── Quads / Squat (Long femur solutions) ──────────────────────────────────
  "front-squat": {
    spineFriendly: true,
    anatomicalNote: {
      es: "Ideal para personas con fémur largo: la barra anterior mantiene el torso erguido y aísla los cuádriceps.",
      en: "Superior for long femurs: anterior load enforces an upright torso, shifting load to quadriceps.",
    },
    scientificReason: {
      es: "Menor momento de flexión lumbar comparado con la sentadilla trasera tradicional.",
      en: "Significantly lower lumbar shear moment compared to low-bar back squats.",
    },
  },
  "goblet-squat": {
    spineFriendly: true,
    jointFriendly: true,
    anatomicalNote: {
      es: "El peso al frente actúa de contrapeso facilitando la sentadilla profunda sin redondear la espalda.",
      en: "Anterior counterweight facilitates deep squat depth without lumbar flexion.",
    },
  },
  "hack-squat": {
    spineFriendly: true,
    stretchAdvantage: true,
    anatomicalNote: {
      es: "Espalda apoyada: permite flexión profunda de rodilla sin sobrecargar la zona lumbar (ideal para fémur largo).",
      en: "Full back support: enables extreme knee flexion without lumbar torque, ideal for long femurs.",
    },
    scientificReason: {
      es: "Máxima tensión en cuádriceps en su longitud más elongada sin fatiga axial.",
      en: "Peak quadriceps tension at long muscle lengths with zero spinal axial fatigue.",
    },
  },
  "leg-press": {
    spineFriendly: true,
    anatomicalNote: {
      es: "Resuelve el problema de palancas de fémur largo al eliminar el equilibrio y la carga sobre la columna.",
      en: "Eliminates balance and spinal compression, accommodating long-femur lifters seamlessly.",
    },
  },

  // ── Hamstrings / Hinge ───────────────────────────────────────────────────
  "seated-leg-curl": {
    stretchAdvantage: true,
    spineFriendly: true,
    scientificReason: {
      es: "Estudio Maeo 2021: la cadera a 90° estira los isquiotibiales generando mayor hipertrofia que el curl tumbado.",
      en: "Maeo 2021: 90-degree hip flexion lengthens biarticular hamstrings, producing greater hypertrophy than lying curls.",
    },
  },
  "romanian-deadlift": {
    stretchAdvantage: true,
    scientificReason: {
      es: "Sobrecarga extrema en la fase excéntrica y de máximo estiramiento de isquiotibiales y glúteos.",
      en: "Supreme eccentric tension at peak hamstring and glute elongation.",
    },
  },

  // ── Triceps & Biceps ─────────────────────────────────────────────────────
  "overhead-triceps-extension": {
    stretchAdvantage: true,
    scientificReason: {
      es: "Estudio Maeo 2022: el brazo elevado estira la cabeza larga del tríceps, logrando ~40% más crecimiento.",
      en: "Maeo 2022: overhead shoulder position lengthens the triceps long head, yielding ~40% superior hypertrophy.",
    },
  },
  "incline-dumbbell-curl": {
    stretchAdvantage: true,
    scientificReason: {
      es: "La hiperextensión del hombro elonga la cabeza larga del bíceps antes de la contracción.",
      en: "Shoulder hyperextension pre-stretches the biceps long head for superior mechanical tension.",
    },
  },
};

export interface SubstituteOption {
  exercise: Exercise;
  traits: ExerciseTraits;
  /** Stimulus-to-Fatigue Ratio score: higher is more hypertrophy per unit of joint/spine wear */
  sfrScore: number;
  stretchAdvantage: boolean;
  spineFriendly: boolean;
  jointFriendly: boolean;
  anatomicalNote: string | null;
  scientificReason: string | null;
  isGearLegal: boolean;
  /** Same load type as original (e.g. barbell -> barbell), or alternative equipment */
  isSameLoadType: boolean;
}

/**
 * Heuristic stimulus-to-fatigue score, for **ordering alternatives only**.
 *
 * Formula: (hypertrophy * 2.5) / max(2, jointStress + spineLoad). The weights
 * are ours: SFR in the literature is a qualitative idea (stimulus relative to
 * fatigue), not a published index, so this number is never shown as a fact and
 * never sets a load — it only sorts one substitute above another.
 * Returns a value typically between 1.25 and 6.25.
 */
export function calculateSfrScore(
  hypertrophy: number,
  jointStress: number,
  spineLoad: number,
): number {
  const cost = Math.max(2, jointStress + spineLoad);
  return Math.round(((hypertrophy * 2.5) / cost) * 10) / 10;
}

/**
 * Find high-quality equivalent exercises for a given exercise, ranked by
 * biomechanical suitability, SFR score, equipment availability, and user needs.
 */
export function findExerciseSubstitutes(opts: {
  exerciseId: string;
  inventory?: OwnedEquipment[];
  preferLowSpineLoad?: boolean;
  preferJointFriendly?: boolean;
  preferStretchMediated?: boolean;
  hasLongFemur?: boolean;
  lang?: "es" | "en";
}): SubstituteOption[] {
  const {
    exerciseId,
    inventory,
    preferLowSpineLoad = false,
    preferJointFriendly = false,
    preferStretchMediated = false,
    hasLongFemur = false,
    lang = "es",
  } = opts;

  const currentEntry = ALL_EXERCISES.find((e) => e.id === exerciseId);
  const currentTraits = EXERCISE_TRAITS[exerciseId] ?? getTraits(exerciseId);
  if (!currentEntry || !currentTraits) return [];

  const checkGear = inventory !== undefined;
  const owned = checkGear
    ? (ownedCapabilities(inventory) as unknown as Set<Capability>)
    : null;

  // Find exercises with the same movement pattern or primary muscle group
  const primaryMuscles = new Set(
    currentEntry.muscles
      .filter((m) => m.intensity >= 2)
      .map((m) => m.muscle),
  );

  const candidates: SubstituteOption[] = [];

  for (const candidate of ALL_EXERCISES) {
    if (candidate.id === exerciseId) continue;
    const traits = EXERCISE_TRAITS[candidate.id] ?? getTraits(candidate.id);
    if (!traits) continue;

    // Pattern match or strong muscle overlap
    const samePattern = traits.pattern === currentTraits.pattern;
    const muscleOverlap = candidate.muscles.some(
      (m) => m.intensity >= 2 && primaryMuscles.has(m.muscle),
    );

    if (!samePattern && !muscleOverlap) continue;

    const sfr = calculateSfrScore(
      candidate.hypertrophy,
      traits.jointStress,
      traits.spineLoad,
    );

    const annotation = BIOMECHANICAL_ANNOTATIONS[candidate.id];
    const stretchAdvantage = annotation?.stretchAdvantage ?? false;
    const spineFriendly =
      (annotation?.spineFriendly ?? false) || traits.spineLoad === 1;
    const jointFriendly =
      (annotation?.jointFriendly ?? false) || traits.jointStress === 1;

    const anatomicalNote = annotation?.anatomicalNote
      ? annotation.anatomicalNote[lang]
      : null;
    const scientificReason = annotation?.scientificReason
      ? annotation.scientificReason[lang]
      : candidate.hypertrophyNote
        ? candidate.hypertrophyNote[lang]
        : null;

    const isGearLegal = checkGear ? satisfies(traits.requires, owned!) : true;
    const isSameLoadType = traits.loadType === currentTraits.loadType;

    candidates.push({
      exercise: candidate,
      traits,
      sfrScore: sfr,
      stretchAdvantage,
      spineFriendly,
      jointFriendly,
      anatomicalNote,
      scientificReason,
      isGearLegal,
      isSameLoadType,
    });
  }

  // Rank candidates
  return candidates.sort((a, b) => {
    // 1. Legal gear first
    if (a.isGearLegal !== b.isGearLegal) return a.isGearLegal ? -1 : 1;

    // 2. Anatomical long femur priority for squats
    if (hasLongFemur && currentTraits.pattern === "squat") {
      const aFemur = a.exercise.id === "front-squat" || a.exercise.id === "hack-squat" || a.exercise.id === "goblet-squat" || a.exercise.id === "leg-press";
      const bFemur = b.exercise.id === "front-squat" || b.exercise.id === "hack-squat" || b.exercise.id === "goblet-squat" || b.exercise.id === "leg-press";
      if (aFemur !== bFemur) return aFemur ? -1 : 1;
    }

    // 3. User preference priorities
    if (preferLowSpineLoad && a.spineFriendly !== b.spineFriendly) {
      return a.spineFriendly ? -1 : 1;
    }
    if (preferJointFriendly && a.jointFriendly !== b.jointFriendly) {
      return a.jointFriendly ? -1 : 1;
    }
    if (preferStretchMediated && a.stretchAdvantage !== b.stretchAdvantage) {
      return a.stretchAdvantage ? -1 : 1;
    }

    // 4. SFR Score
    if (Math.abs(b.sfrScore - a.sfrScore) > 0.3) {
      return b.sfrScore - a.sfrScore;
    }

    // 5. Higher hypertrophy rating
    if (b.exercise.hypertrophy !== a.exercise.hypertrophy) {
      return b.exercise.hypertrophy - a.exercise.hypertrophy;
    }

    // 6. Same load type preferred as tie breaker
    if (a.isSameLoadType !== b.isSameLoadType) {
      return a.isSameLoadType ? -1 : 1;
    }

    return 0;
  });
}
