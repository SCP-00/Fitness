import { useRef, useEffect, useCallback, useState } from 'react';
import { BodyChart, ViewSide } from 'body-muscles';
import type { MuscleId } from 'body-muscles';
import { useApp } from '../lib/store';
import { MUSCLE_GROUPS, SCORE_COLORS, getScoreStatus } from '../lib/constants';
import { getExercisesForMuscle, type MuscleGroup as ExerciseMuscleGroup } from '../lib/exercises';

interface BodyMapProps {
  view: 'front' | 'back';
  onMuscleSelect?: (muscleId: string | null) => void;
  selectedMuscle?: string | null;
}

// Map our muscle IDs to body-muscles library IDs
const MUSCLE_ID_MAP: Record<string, string[]> = {
  'chest': ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right'],
  'abs': ['abs-upper-left', 'abs-upper-right', 'abs-lower-left', 'abs-lower-right', 'serratus-anterior-left', 'serratus-anterior-right'],
  'obliques': ['obliques-left', 'obliques-right'],
  'biceps': ['biceps-left', 'biceps-right'],
  'triceps': ['triceps-long-left', 'triceps-lateral-left', 'triceps-long-right', 'triceps-lateral-right'],
  'deltoids': ['shoulder-front-left', 'shoulder-front-right', 'shoulder-side-left', 'shoulder-side-right', 'deltoid-rear-left', 'deltoid-rear-right'],
  'quadriceps': ['quads-left', 'quads-right', 'adductors-left', 'adductors-right', 'hip-flexor-left', 'hip-flexor-right'],
  'hamstrings': ['hamstrings-medial-left', 'hamstrings-lateral-left', 'hamstrings-medial-right', 'hamstrings-lateral-right'],
  'calves': ['calves-gastroc-medial-left', 'calves-gastroc-lateral-left', 'calves-soleus-left', 'calves-gastroc-medial-right', 'calves-gastroc-lateral-right', 'calves-soleus-right', 'tibialis-anterior-left', 'tibialis-anterior-right'],
  'glutes': ['gluteus-medius-left', 'gluteus-maximus-left', 'gluteus-medius-right', 'gluteus-maximus-right'],
  'forearms': ['forearm-left', 'forearm-right', 'forearm-flexors-left', 'forearm-extensors-left', 'forearm-flexors-right', 'forearm-extensors-right'],
  'traps': ['traps-upper-left', 'traps-mid-left', 'traps-lower-left', 'traps-upper-right', 'traps-mid-right', 'traps-lower-right'],
  'lats': ['lats-upper-left', 'lats-mid-left', 'lats-lower-left', 'lats-upper-right', 'lats-mid-right', 'lats-lower-right'],
  'lower_back': ['lower-back-erectors-left', 'lower-back-ql-left', 'lower-back-erectors-right', 'lower-back-ql-right', 'spine'],
};

// Reverse map: body-muscles ID -> our muscle group
const REVERSE_MAP: Record<string, string> = {};
Object.entries(MUSCLE_ID_MAP).forEach(([ourId, bodyMuscleIds]) => {
  bodyMuscleIds.forEach(bmId => { REVERSE_MAP[bmId] = ourId; });
});

/**
 * Map our score (0-1) to body-muscles intensity (0-10).
 *
 * Spec color scale:
 *   0.90–1.00 → Green  (intensity 0-1)
 *   0.70–0.89 → Yellow (intensity 2-4)
 *   0.40–0.69 → Orange (intensity 5-7)
 *   0.00–0.39 → Red    (intensity 8-10)
 *
 * The body-muscles library uses:
 *   0 = gray, 1-2 = yellow, 3-5 = orange, 6-10 = red
 *
 * We override with our own colors via the library's color system.
 */
function scoreToIntensity(score: number): number {
  if (score >= 0.90) return 0;  // Green zone — we'll override color
  if (score >= 0.70) return 2;  // Yellow zone
  if (score >= 0.40) return 5;  // Orange zone
  return 9;                      // Red zone
}

// Map assessment muscle group IDs → exercise muscle group IDs
const ASSESSMENT_TO_EXERCISE: Record<string, ExerciseMuscleGroup[]> = {
  'chest': ['chest_upper', 'chest_lower'],
  'deltoids': ['anterior_deltoid', 'lateral_deltoid', 'posterior_deltoid'],
  'biceps': ['biceps_long', 'biceps_short'],
  'triceps': ['triceps_long', 'triceps_lateral', 'triceps_medial'],
  'forearms': ['brachioradialis', 'forearm_flexors', 'forearm_extensors'],
  'abs': ['rectus_abdominis'],
  'obliques': ['obliques'],
  'lower_back': ['erector_spinae'],
  'traps': ['traps_upper', 'traps_mid', 'traps_lower'],
  'lats': ['lats_upper', 'lats_mid', 'lats_lower'],
  'glutes': ['gluteus_maximus', 'gluteus_medius'],
  'quadriceps': ['quadriceps', 'adductors'],
  'hamstrings': ['hamstrings'],
  'calves': ['calves', 'tibialis_anterior'],
};

/** Map exercise training volume to a blended intensity */
function getTrainingVolume(exerciseSets: { exerciseId: string }[], assessmentMuscleId: string): number {
  const exerciseMuscles = ASSESSMENT_TO_EXERCISE[assessmentMuscleId] ?? [];
  if (exerciseMuscles.length === 0) return 0;

  const exercises = exerciseMuscles.flatMap(m => getExercisesForMuscle(m));
  const exerciseIds = new Set(exercises.map(e => e.id));
  const count = exerciseSets.filter(s => exerciseIds.has(s.exerciseId)).length;
  if (count === 0) return 0;
  if (count >= 20) return 3;  // High volume
  if (count >= 10) return 2;  // Moderate
  return 1;                    // Low
}



export default function BodyMap({ view, onMuscleSelect, selectedMuscle }: BodyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const { state } = useApp();
  const { assessment } = state;
  const lang = state.language;
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const getScoreForMuscle = useCallback((muscleId: string): number => {
    const muscleGroup = MUSCLE_GROUPS.find(mg => mg.id === muscleId);
    if (!muscleGroup) return 0.5;
    const assessmentItem = assessment.find(a => a.segment === muscleGroup.measurementType);
    return assessmentItem?.score ?? 0.5;
  }, [assessment]);

  const buildBodyState = useCallback(() => {
    const bodyState: Record<string, { intensity: number; selected: boolean }> = {};

    Object.entries(MUSCLE_ID_MAP).forEach(([ourId, bodyMuscleIds]) => {
      const score = getScoreForMuscle(ourId);
      const assessmentIntensity = scoreToIntensity(score);
      const trainingVol = getTrainingVolume(state.exerciseSets, ourId);

      // Blend: assessment drives base color, training volume adds a subtle shift
      // If trained, lower the intensity slightly (more green = more active)
      const blendedIntensity = trainingVol > 0
        ? Math.max(0, assessmentIntensity - trainingVol)
        : assessmentIntensity;

      bodyMuscleIds.forEach(bmId => {
        bodyState[bmId] = {
          intensity: Math.max(0, Math.min(10, blendedIntensity)),
          selected: selectedMuscle === ourId,
        };
      });
    });

    return bodyState;
  }, [getScoreForMuscle, selectedMuscle, state.exerciseSets]);

  // The chart is created once per view change; score/selection updates are pushed
  // incrementally by the effect below. A ref keeps the latest builder available
  // to the init effect without making it a dependency that would rebuild the
  // chart on every score change.
  const buildBodyStateRef = useRef(buildBodyState);
  useEffect(() => {
    buildBodyStateRef.current = buildBodyState;
  }, [buildBodyState]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = new BodyChart(containerRef.current, {
      view: view === 'front' ? ViewSide.FRONT : ViewSide.BACK,
      bodyState: buildBodyStateRef.current(),
      onMuscleClick: (id: MuscleId) => {
        const ourId = REVERSE_MAP[id];
        onMuscleSelect?.(ourId ?? null);
      },
      onMuscleHover: (id: MuscleId | null) => {
        const ourId = id ? REVERSE_MAP[id] ?? null : null;
        setHoveredMuscle(ourId);
      },
      enableTransitions: true,
      showViewLabel: false,

    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [view, onMuscleSelect]);

  // Update body state when scores or selection changes
  useEffect(() => {
    chartRef.current?.update({
      bodyState: buildBodyState(),
    });
  }, [buildBodyState]);

  // Get info for hovered/selected muscle
  const activeMuscle = selectedMuscle || hoveredMuscle;
  const activeMuscleInfo = activeMuscle ? MUSCLE_GROUPS.find(m => m.id === activeMuscle) : null;
  const activeScore = activeMuscle ? getScoreForMuscle(activeMuscle) : null;
  const activeStatus = activeScore !== null ? getScoreStatus(activeScore) : null;

  // Training volume for active muscle
  const activeTrainingVol = activeMuscle
    ? getTrainingVolume(state.exerciseSets, activeMuscle)
    : 0;

  return (
    <div className="relative w-full h-full">
      {/* Body chart */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
        style={{ minHeight: '500px' }}
      />

      {/* Muscle label overlay — appears on hover/selection */}
      {activeMuscleInfo && activeScore !== null && (
        <div className="absolute top-4 left-4 bg-white/95 dark:bg-[var(--color-surface-elevated)]/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-md border border-[var(--color-border)] dark:border-[var(--color-border-card)] pointer-events-none">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: SCORE_COLORS[activeStatus ?? 'moderate']?.bg }}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-[var(--color-text)]">
                {activeMuscleInfo.name[lang]}
              </p>
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">
                {(activeScore * 100).toFixed(0)}% — {SCORE_COLORS[activeStatus ?? 'moderate']?.label[lang]}
              </p>
              {activeTrainingVol > 0 && (
                <p className="text-[11px] text-indigo-500 font-medium mt-0.5">
                  🏋️ {activeTrainingVol === 3 ? (lang === 'es' ? 'Alto volumen' : 'High volume') :
                    activeTrainingVol === 2 ? (lang === 'es' ? 'Volumen medio' : 'Moderate volume') :
                    (lang === 'es' ? 'Volumen bajo' : 'Low volume')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Color legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-[var(--color-surface-elevated)]/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md border border-[var(--color-border)] dark:border-[var(--color-border-card)] ">
        <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1.5">
          {lang === 'es' ? 'Referencia' : 'Reference proximity'}
        </p>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {[
              { color: '#10b981', label: lang === 'es' ? 'Óptimo' : 'Optimal' },
              { color: '#facc15', label: lang === 'es' ? 'Cercano' : 'Near' },
              { color: '#f97316', label: lang === 'es' ? 'Moderado' : 'Moderate' },
              { color: '#ef4444', label: lang === 'es' ? 'Lejano' : 'Far' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-600 dark:text-[var(--color-text-secondary)]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View label */}
      <div className="absolute top-4 right-4">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--color-text-muted)] bg-white/80 dark:bg-[var(--color-surface-elevated)]/80 px-2 py-1 rounded-lg">
          {view === 'front' ? (lang === 'es' ? 'Frontal' : 'Front') : (lang === 'es' ? 'Posterior' : 'Back')}
        </span>
      </div>
    </div>
  );
}
