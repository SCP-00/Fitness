/**
 * ExerciseLog v2 — Log and track exercises with difficulty + hypertrophy ratings.
 *
 * Features:
 *   - Exercise selection from database
 *   - Set/rep/weight/RPE logging
 *   - Max effort tracking (Epley 1RM)
 *   - Training volume summary per muscle
 *   - Technical difficulty bar
 *   - Hypertrophy effectiveness bar
 */

import { useState, useMemo } from 'react';
import { Plus, X, Check, Trophy, Dumbbell, Flame, Zap } from 'lucide-react';
import ExerciseGif from '../../components/ExerciseGif';
import { useApp } from '../../lib/store';
import { parseNumberInput } from '../../lib/parse-num';
import {
  getExercisesForMuscle,
  getIntensityLabel,
  getDifficultyColor,
  getHypertrophyColor,
  getMuscleIntensity,
  getMusclesForExercise,
  type MuscleGroup,
  type Exercise,
} from '../../lib/exercises';
import type { ExerciseSet } from '../../lib/types';

interface ExerciseLogProps {
  muscleId: MuscleGroup;
}

/** Small rating bar (1-5 dots or filled segments) */
function RatingBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-600 dark:text-[var(--color-text-secondary)] w-16 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: i < value ? color : '#e2e8f0',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ExerciseLog({ muscleId }: ExerciseLogProps) {
  const { state, dispatch } = useApp();
  const lang = state.language;
  const { exerciseSets, maxEfforts } = state;

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('1');
  const [rpe, setRpe] = useState('');
  const [notes, setNotes] = useState('');

  const exercises = useMemo(() => getExercisesForMuscle(muscleId), [muscleId]);

  // Get logs for this muscle's exercises
  const muscleLogs = useMemo(() => {
    const exerciseIds = new Set(exercises.map(e => e.id));
    return exerciseSets.filter(s => exerciseIds.has(s.exerciseId));
  }, [exerciseSets, exercises]);

  // Get max efforts for this muscle's exercises
  const muscleMaxEfforts = useMemo(() => {
    const exerciseIds = new Set(exercises.map(e => e.id));
    return maxEfforts.filter(m => exerciseIds.has(m.exerciseId));
  }, [maxEfforts, exercises]);

  // Total sets this week
  const weeklySets = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return muscleLogs.filter(l => new Date(l.timestamp) > oneWeekAgo).length;
  }, [muscleLogs]);

  const handleLogExercise = () => {
    if (!selectedExercise || !weight || !reps) return;

    const setCount = parseInt(sets) || 1;
    const weightVal = parseNumberInput(weight) ?? NaN;
    const repsVal = parseInt(reps);
    const rpeVal = rpe ? parseInt(rpe) : undefined;

    if (isNaN(weightVal) || isNaN(repsVal)) return;

    for (let i = 0; i < setCount; i++) {
      const set: ExerciseSet = {
        id: crypto.randomUUID(),
        exerciseId: selectedExercise.id,
        timestamp: new Date().toISOString(),
        weight: weightVal,
        reps: repsVal,
        rpe: rpeVal && !isNaN(rpeVal) ? rpeVal : undefined,
        notes: notes || undefined,
      };
      dispatch({ type: 'ADD_EXERCISE_SET', payload: set });
    }

    // Reset form
    setWeight('');
    setReps('');
    setSets('1');
    setRpe('');
    setNotes('');
    setShowLogForm(false);
  };

  const getEst1RM = (w: number, r: number) => {
    return Math.round(w * (1 + r / 30) * 10) / 10;
  };

  if (exercises.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-slate-400 dark:text-[var(--color-text-muted)]">
        {lang === 'es' ? 'No hay ejercicios para este músculo' : 'No exercises for this muscle'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Training Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-center">
          <Dumbbell className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{muscleLogs.length}</p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            {lang === 'es' ? 'Registros totales' : 'Total logs'}
          </p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-center">
          <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{weeklySets}</p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            {lang === 'es' ? 'Esta semana' : 'This week'}
          </p>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-center">
          <Trophy className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{muscleMaxEfforts.length}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {lang === 'es' ? 'Máximos' : 'Max records'}
          </p>
        </div>
      </div>

      {/* Exercise List */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-500 px-1">
          {lang === 'es' ? 'Ejercicios disponibles' : 'Available exercises'}
        </p>
        {exercises.map(ex => {
          const maxEffort = muscleMaxEfforts.find(m => m.exerciseId === ex.id);
          const isActive = selectedExercise?.id === ex.id;

          return (
            <div key={ex.id}>
              <button
                onClick={() => {
                  setSelectedExercise(isActive ? null : ex);
                  setShowLogForm(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30'
                    : 'bg-[var(--color-input-bg)] hover:bg-slate-100 dark:hover:bg-[var(--color-surface-elevated)] border border-transparent'
                }`}
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-[var(--color-text)]">
                      {ex.name[lang]}
                    </span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                      ex.category === 'compound'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : ex.category === 'bodyweight'
                          ? 'bg-slate-200 text-slate-600 dark:bg-[var(--color-chip-bg)] dark:text-[var(--color-chip-text)]'
                          : ex.category === 'cable'
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'
                            : ex.category === 'machine'
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
                    }`}>
                      {ex.category === 'compound' ? 'C' :
                       ex.category === 'bodyweight' ? 'BW' :
                       ex.category === 'cable' ? 'CBL' :
                       ex.category === 'machine' ? 'MCH' : 'I'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ex.equipment[lang]}
                  </p>

                  {/* Rating bars */}
                  <div className="flex gap-4 mt-1.5">
                    <RatingBar value={ex.difficulty} max={5} color={getDifficultyColor(ex.difficulty)} label={lang === 'es' ? 'Técnica' : 'Technical'} />
                    <RatingBar value={Math.round(ex.hypertrophy * (getMuscleIntensity(ex, muscleId) / 3) * 10) / 10} max={5} color={getHypertrophyColor(ex.hypertrophy)} label={lang === 'es' ? 'Hipertrofia' : 'Hypertrophy'} />
                  </div>
                </div>

                {/* Max effort badge */}
                {maxEffort && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600">
                      {maxEffort.bestEst1RM ? `${maxEffort.bestEst1RM} kg` : `${maxEffort.bestWeight} kg`}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-[var(--color-text-muted)]">1RM est.</p>
                  </div>
                )}

                {/* Muscle involvement dots */}
                <div className="flex gap-0.5">
                  {getMusclesForExercise(ex).slice(0, 3).map(m => (
                    <div
                      key={m.muscle}
                      className={`w-2 h-2 rounded-full ${
                        m.intensity === 3 ? 'bg-indigo-500' :
                        m.intensity === 2 ? 'bg-indigo-300' :
                        'bg-indigo-200'
                      }`}
                      title={`${m.muscle}: ${getIntensityLabel(m.intensity, lang)}`}
                    />
                  ))}
                </div>
              </button>

              {/* Expanded: Exercise details + Log form */}
              {isActive && (
                <div className="ml-4 mt-2 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-card)] dark:border-transparent space-y-3">
                  {/* Exercise GIF */}
                  <div className="flex justify-center">
                    <ExerciseGif exerciseId={ex.id} alt={ex.name[lang]} size="md" lang={lang} />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-[var(--color-text-secondary)]">{ex.description[lang]}</p>

                  {/* Hypertrophy note */}
                  {ex.hypertrophyNote && (
                    <div className="flex items-start gap-2 p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                        {ex.hypertrophyNote[lang]}
                      </p>
                    </div>
                  )}

                  {/* Muscle involvement */}
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1">
                      {lang === 'es' ? 'Músculos involucrados' : 'Muscles involved'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getMusclesForExercise(ex).map(m => (
                        <span
                          key={m.muscle}
                          className={`whitespace-nowrap text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            m.intensity === 3
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                              : m.intensity === 2
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-[var(--color-chip-bg)] dark:text-[var(--color-chip-text)]'
                          }`}
                        >
                          {m.muscle.replace(/_/g, ' ')} · {getIntensityLabel(m.intensity, lang)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Log Button */}
                  {!showLogForm ? (
                    <button
                      onClick={() => setShowLogForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {lang === 'es' ? 'Registrar serie' : 'Log set'}
                    </button>
                  ) : (
                    <div className="space-y-3 p-3 bg-[var(--color-input-bg)] rounded-xl">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1 block">
                            {lang === 'es' ? 'Peso (kg)' : 'Weight (kg)'}
                          </label>
                          <input
                            type="number"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            placeholder="0"
                            step="0.5"
                            className="w-full px-2 py-2 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1 block">
                            {lang === 'es' ? 'Reps' : 'Reps'}
                          </label>
                          <input
                            type="number"
                            value={reps}
                            onChange={e => setReps(e.target.value)}
                            placeholder="0"
                            min="1"
                            className="w-full px-2 py-2 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1 block">
                            {lang === 'es' ? 'Series' : 'Sets'}
                          </label>
                          <input
                            type="number"
                            value={sets}
                            onChange={e => setSets(e.target.value)}
                            min="1"
                            className="w-full px-2 py-2 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1 block">
                            RPE (1-10)
                          </label>
                          <input
                            type="number"
                            value={rpe}
                            onChange={e => setRpe(e.target.value)}
                            min="1"
                            max="10"
                            placeholder="—"
                            className="w-full px-2 py-2 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1 block">
                            {lang === 'es' ? 'Nota' : 'Note'}
                          </label>
                          <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="—"
                            className="w-full px-2 py-2 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                      </div>

                      {/* Estimated 1RM preview */}
                      {weight && reps && (
                        <div className="text-center py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                          <p className="text-xs text-indigo-600 dark:text-indigo-300">
                            {lang === 'es' ? '1RM estimado' : 'Est. 1RM'}:{' '}
                            <span className="font-bold">{getEst1RM(parseFloat(weight), parseInt(reps))} kg</span>
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={handleLogExercise}
                          disabled={!weight || !reps}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          {lang === 'es' ? 'Guardar' : 'Save'}
                        </button>
                        <button
                          onClick={() => setShowLogForm(false)}
                          className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recent logs for this exercise */}
                  {exerciseSets.filter(s => s.exerciseId === ex.id).length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1">
                        {lang === 'es' ? 'Registros recientes' : 'Recent logs'}
                      </p>
                      <div className="space-y-1">
                        {exerciseSets
                          .filter(s => s.exerciseId === ex.id)
                          .slice(-5)
                          .reverse()
                          .map(s => (
                            <div key={s.id} className="flex items-center justify-between p-2 bg-[var(--color-surface)] rounded-lg text-xs">
                              <span className="text-slate-500 dark:text-[var(--color-text-muted)]">
                                {new Date(s.timestamp).toLocaleDateString()}
                              </span>
                              <span className="font-mono text-slate-800 dark:text-[var(--color-text)] tabular-nums">
                                {s.weight}kg × {s.reps}
                                {s.rpe ? ` @RPE ${s.rpe}` : ''}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
