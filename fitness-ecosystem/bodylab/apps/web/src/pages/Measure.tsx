import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Minus, Clock, Sun, Moon, Dumbbell } from 'lucide-react';
import { useApp } from '../lib/store';
import { MEASUREMENT_TYPES } from '../lib/constants';
import { getLatestValue } from '../lib/queries';
import { parseNumberInput } from '../lib/parse-num';
import { displayUnitFor, UNIT_LABELS, toDisplay, toCanonical } from '../lib/units';
import { t } from '../i18n';
import type { AllMeasurementType, UnitSystem } from '../lib/types';

/** LocalStorage key for the in-progress session draft (§101.2 autosave). */
const DRAFT_KEY = 'bodylab-draft-session';

/**
 * Measure — Session-based measurement page
 *
 * Flow:
 * 1. Setup session (date, time, condition, notes)
 * 2. Guided measurement (one at a time with context)
 * 3. Review session summary
 * 4. Save to history
 */

// Primary measurements for guided flow
const GUIDED_MEASUREMENTS: { type: AllMeasurementType; label: { en: string; es: string }; guide: { en: string; es: string }; tip: { en: string; es: string } }[] = [
  { type: 'weight', label: { en: 'Weight', es: 'Peso' }, guide: { en: 'Stand on scale, distribute weight evenly', es: 'Párate en la báscula, distribuye el peso uniformemente' }, tip: { en: 'Measure in the morning for consistency', es: 'Mide en la mañana para consistencia' } },
  { type: 'chest', label: { en: 'Chest', es: 'Pecho' }, guide: { en: 'Wrap tape around the fullest part of chest', es: 'Envuelve la cinta alrededor de la parte más amplia del pecho' }, tip: { en: 'Keep tape horizontal, under armpits', es: 'Mantén la cinta horizontal, bajo las axilas' } },
  { type: 'waist', label: { en: 'Waist', es: 'Cintura' }, guide: { en: 'Measure at the narrowest point, above navel', es: 'Mide en el punto más estrecho, sobre el ombligo' }, tip: { en: "Don't suck in — breathe normally", es: 'No te vacíes — respira normalmente' } },
  { type: 'hips', label: { en: 'Hips', es: 'Cadera' }, guide: { en: 'Wrap tape around the widest part of hips', es: 'Envuelve la cinta alrededor de la parte más amplia de las caderas' }, tip: { en: 'Feet together, tape horizontal', es: 'Pies juntos, cinta horizontal' } },
  { type: 'biceps', label: { en: 'Biceps', es: 'Bíceps' }, guide: { en: 'Fullest part of upper arm, relaxed', es: 'Parte más amplia del brazo, relajado' }, tip: { en: 'Arm extended, palm facing up', es: 'Brazo extendido, palma hacia arriba' } },
  { type: 'shoulders', label: { en: 'Shoulders', es: 'Hombros' }, guide: { en: 'Around the widest point of shoulders', es: 'Alrededor del punto más ancho de los hombros' }, tip: { en: 'Arms at sides, measure over deltoids', es: 'Brazos a los lados, mide sobre los deltoides' } },
  { type: 'thigh', label: { en: 'Thigh', es: 'Muslo' }, guide: { en: 'Upper thigh, just below crotch', es: 'Muslo superior, justo debajo de la entrepierna' }, tip: { en: 'Stand with weight evenly distributed', es: 'Parado con peso distribuido uniformemente' } },
  { type: 'calf', label: { en: 'Calf', es: 'Pantorrilla' }, guide: { en: 'Widest part of the calf', es: 'Parte más amplia de la pantorrilla' }, tip: { en: 'Stand with weight on one leg', es: 'Parado con peso en una pierna' } },
  { type: 'neck', label: { en: 'Neck', es: 'Cuello' }, guide: { en: 'Around the base of the neck', es: 'Alrededor de la base del cuello' }, tip: { en: 'Just above the collarbones', es: 'Justo encima de las clavículas' } },
  { type: 'wrist', label: { en: 'Wrist', es: 'Muñeca' }, guide: { en: 'Just above the wrist bone', es: 'Justo encima del hueso de la muñeca' }, tip: { en: 'Used as skeletal frame indicator', es: 'Se usa como indicador del marco esquelético' } },
];

/**
 * Effective unit system for the session (BL-MEAS-005): the live SET_UNITS
 * preference, falling back to the profile's saved units.
 */
function unitsOf(profileUnits: UnitSystem | undefined, liveUnits: UnitSystem | undefined): UnitSystem {
  return liveUnits ?? profileUnits ?? 'metric';
}

type SessionState = 'setup' | 'measuring' | 'review';

interface SessionData {
  date: string;
  time: string;
  condition: 'morning' | 'after_training' | 'evening' | 'other';
  notes: string;
  values: Partial<Record<AllMeasurementType, number>>;
  skipped: AllMeasurementType[];
}

export default function Measure() {
  const { state, addMeasurement, createSnapshot } = useApp();
  const navigate = useNavigate();
  const lang = state.language;

  const [sessionState, setSessionState] = useState<SessionState>('setup');
  const [currentStep, setCurrentStep] = useState(0);
  // Live units preference (set in Settings, applied instantly) with profile fallback
  const unitSystem = unitsOf(state.profile?.units, state.unitsLive);
  const [session, setSession] = useState<SessionData>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    condition: 'morning',
    notes: '',
    values: {},
    skipped: [],
  });
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore an in-progress draft on mount (§101.2: closing the tab never loses the session)
  const [draft, setDraft] = useState<{ session: SessionData; currentStep: number } | null>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) as { session: SessionData; currentStep: number } : null;
    } catch { return null; }
  });

  // Autosave every committed value / step change to the draft
  useEffect(() => {
    if (saved) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ session, currentStep }));
    } catch { /* storage may be unavailable */ }
  }, [session, currentStep, sessionState, saved]);

  // Focus input when measuring
  useEffect(() => {
    if (sessionState === 'measuring' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [sessionState, currentStep]);

  const currentMeasurement = GUIDED_MEASUREMENTS[currentStep];
  const previousValue = currentMeasurement ? getLatestValue(state.measurements, currentMeasurement.type) : null;
  const currentValue = currentMeasurement ? (session.values[currentMeasurement.type] ?? null) : null;
  const delta = previousValue !== null && currentValue !== null
    ? { value: currentValue - previousValue, direction: (currentValue > previousValue ? 'up' : currentValue < previousValue ? 'down' : 'stable') as 'up' | 'down' | 'stable' }
    : null;

  const handleStartMeasuring = () => {
    setSessionState('measuring');
    setCurrentStep(0);
  };

  const handleValueChange = (value: string) => {
    if (!currentMeasurement) return;
    const numVal = parseNumberInput(value);
    if (numVal === null) {
      setSession(prev => ({
        ...prev,
        values: { ...prev.values, [currentMeasurement.type]: undefined },
      }));
      return;
    }
    // BL-MEAS-005: the user types in their display unit (in/lb); the session
    // stores canonical metric (cm/kg) so saving needs no further conversion.
    setSession(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [currentMeasurement.type]: toCanonical(currentMeasurement.type, numVal, unitSystem),
      },
    }));
  };

  const handleNext = () => {
    if (currentStep < GUIDED_MEASUREMENTS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setSessionState('review');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setSessionState('setup');
    }
  };

  const handleSave = () => {
    Object.entries(session.values).forEach(([type, value]) => {
      if (value !== undefined && value !== null) {
        addMeasurement({
          type: type as AllMeasurementType,
          value,
          unit: MEASUREMENT_TYPES.find(t => t.id === type)?.unit ?? 'cm',
        });
      }
    });
    createSnapshot(session.notes || undefined);
    setSaved(true);
    localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
    setTimeout(() => navigate('/'), 1500);
  };

  // Ctrl+Enter saves the session from anywhere in it (§101.2 keyboard contract).
  // Declared after handleSave so the handler closes over the latest save logic;
  // it intentionally re-binds on every render (no dependency array).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && (sessionState === 'measuring' || sessionState === 'review')) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleSkip = () => {
    if (!currentMeasurement) return;
    setSession(prev => ({
      ...prev,
      skipped: prev.skipped.includes(currentMeasurement.type)
        ? prev.skipped
        : [...prev.skipped, currentMeasurement.type],
    }));
    handleNext();
  };

  const resumeDraft = () => {
    if (!draft) return;
    setSession(draft.session);
    setCurrentStep(draft.currentStep);
    setDraft(null);
    setSessionState('measuring');
  };

  const draftHasContent = draft !== null && (
    draft.currentStep > 0 || Object.keys(draft.session.values).some(k => draft.session.values[k as AllMeasurementType] !== undefined)
  );


  // ==================== SETUP VIEW ====================
  if (sessionState === 'setup') {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          {lang === 'es' ? 'Volver al inicio' : 'Back to overview'}
        </button>

        <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold text-slate-900 dark:text-[var(--color-text)] mb-1">
          {lang === 'es' ? 'Nueva sesión de medición' : 'New measurement session'}
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          {lang === 'es' ? 'Configura tu sesión antes de comenzar' : 'Set up your session before starting'}
        </p>

        {draftHasContent && (
          <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {lang === 'es'
                ? 'Tienes una sesión sin terminar guardada.'
                : 'You have an unfinished session saved.'}
            </p>
            <button
              onClick={resumeDraft}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              {lang === 'es' ? 'Continuar midiendo' : 'Continue measuring'}
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {lang === 'es' ? 'Fecha' : 'Date'}
              </label>
              <input
                type="date"
                value={session.date}
                onChange={(e) => setSession(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {lang === 'es' ? 'Hora' : 'Time'}
              </label>
              <input
                type="time"
                value={session.time}
                onChange={(e) => setSession(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {lang === 'es' ? 'Condición' : 'Condition'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'morning' as const, icon: Sun, label: lang === 'es' ? 'Mañana' : 'Morning' },
                { value: 'after_training' as const, icon: Dumbbell, label: lang === 'es' ? 'Post-entreno' : 'After training' },
                { value: 'evening' as const, icon: Moon, label: lang === 'es' ? 'Noche' : 'Evening' },
                { value: 'other' as const, icon: Clock, label: lang === 'es' ? 'Otro' : 'Other' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSession(prev => ({ ...prev, condition: opt.value }))}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    session.condition === opt.value
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-[var(--color-border)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {lang === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}
            </label>
            <input
              type="text"
              value={session.notes}
              onChange={(e) => setSession(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={lang === 'es' ? 'Ej: Semana 4, después de descanso' : 'e.g., Week 4, after rest day'}
              className="w-full px-3 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Start Button */}
          {unitSystem === 'imperial' && (
            <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] text-center">
              {t('measure.unitsNote')}
            </p>
          )}
          <button
            onClick={handleStartMeasuring}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            {lang === 'es' ? 'Comenzar a medir' : 'Start measuring'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ==================== MEASURING VIEW ====================
  if (sessionState === 'measuring' && currentMeasurement) {
    const recordedCount = Object.keys(session.values).filter(k => session.values[k as AllMeasurementType] !== undefined).length;

    return (
      <div className="p-6 max-w-5xl mx-auto">
        {/* Progress bar (kept above the panes as a compact session header) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-[var(--color-text-secondary)]">
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 0 ? (lang === 'es' ? 'Configuración' : 'Setup') : (lang === 'es' ? 'Anterior' : 'Previous')}
            </button>
            <span className="text-xs text-slate-400 dark:text-[var(--color-text-muted)]">
              {currentStep + 1} / {GUIDED_MEASUREMENTS.length}
            </span>
          </div>
          <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${((currentStep + 1) / GUIDED_MEASUREMENTS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Two-pane session layout on PC (§101.1): left rail = ordered checklist,
            right pane = one guided field. Below lg the rail is hidden. */}
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 lg:items-start">
          {/* Left rail — checklist with status */}
          <aside className="hidden lg:block bg-[var(--color-surface)] rounded-2xl border border-slate-100 dark:border-transparent p-4 sticky top-6" aria-label={lang === 'es' ? 'Lista de la sesión' : 'Session checklist'}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[var(--color-text-muted)] mb-3 px-1">
              {lang === 'es' ? 'Sesión' : 'Session'}
            </p>
            <ol className="space-y-0.5">
              {GUIDED_MEASUREMENTS.map((m, i) => {
                const val = session.values[m.type];
                const skipped = session.skipped.includes(m.type);
                const status = i === currentStep ? 'active' : skipped ? 'skipped' : val !== undefined && val !== null ? 'entered' : 'pending';
                return (
                  <li key={m.type}>
                    <button
                      onClick={() => setCurrentStep(i)}
                      aria-current={status === 'active' ? 'step' : undefined}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                        status === 'active'
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'hover:bg-slate-50 dark:hover:bg-[var(--color-input-bg)] text-slate-600 dark:text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {status === 'active' ? (
                        <Circle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      ) : status === 'entered' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : status === 'skipped' ? (
                        <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className="flex-1 text-left">{m.label[lang]}</span>
                      <span className={`text-xs tabular-nums ${status === 'entered' ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        {status === 'entered' && m.type
                          ? `${toDisplay(m.type, val!, unitSystem)} ${UNIT_LABELS[displayUnitFor(m.type, unitSystem)][lang]}`
                          : status === 'skipped' ? '—' : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] mt-3 px-1">
              {recordedCount} {lang === 'es' ? 'de' : 'of'} {GUIDED_MEASUREMENTS.length} {lang === 'es' ? 'registradas' : 'recorded'}
            </p>
          </aside>

          {/* Right pane — one guided field */}
          <div>
        {/* Measurement Card */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-card)] p-6 mb-6">
          {/* Header */}
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
            {currentMeasurement.label[lang]}
          </p>

          {/* Guide text */}
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {currentMeasurement.guide[lang]}
          </p>

          {/* Previous value (shown in display units) */}
          {previousValue !== null && (
            <div className="mb-4 p-3 bg-[var(--color-input-bg)] rounded-xl">
              <p className="text-xs text-slate-500 mb-0.5">
                {lang === 'es' ? 'Anterior' : 'Previous'}
              </p>
              <p className="text-lg font-semibold tabular-nums text-slate-700 dark:text-[var(--color-text-secondary)]">
                {(() => {
                  const type = currentMeasurement?.type;
                  if (!type) return null;
                  return `${toDisplay(type, previousValue, unitSystem)} ${UNIT_LABELS[displayUnitFor(type, unitSystem)][lang]}`;
                })()}
              </p>
            </div>
          )}

          {/* Current value input (unit-aware: in/lb in imperial) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {lang === 'es' ? 'Valor actual' : 'Current value'}
            </label>
            {(() => {
              const isMass = displayUnitFor(currentMeasurement.type, unitSystem) === 'lb';
              return (
                <>
                  {unitSystem === 'imperial' && (
                    <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] mb-2">
                      {t(isMass ? 'measure.weightUnitsNote' : 'measure.unitsNote')}
                    </p>
                  )}
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.1"
                      value={currentValue !== null && currentValue !== undefined ? toDisplay(currentMeasurement.type, currentValue, unitSystem) : ''}
                      onChange={(e) => handleValueChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNext();
                        if (e.key === 'Escape') handleBack();
                      }}
                      placeholder="0.0"
                      className="w-full px-4 py-3 text-2xl font-bold tabular-nums border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-400 dark:text-[var(--color-text-muted)]">
                      {UNIT_LABELS[displayUnitFor(currentMeasurement.type, unitSystem)][lang]}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Delta display */}
          {delta && (
            <div className="text-center mb-4">
              <span className={`text-sm font-medium ${
                delta.direction === 'up' ? 'text-amber-600' : delta.direction === 'down' ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '—'}
                {' '}{toDisplay(currentMeasurement.type, Math.abs(delta.value), unitSystem).toFixed(1)} {UNIT_LABELS[displayUnitFor(currentMeasurement.type, unitSystem)][lang]}
              </span>
            </div>
          )}

          {/* Tip */}
          <p className="text-xs text-slate-400 text-center">
            💡 {currentMeasurement.tip[lang]}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="px-4 py-3 text-sm text-slate-500 hover:text-slate-700 dark:text-[var(--color-text-secondary)] rounded-xl transition-colors"
            title={lang === 'es' ? 'Saltar esta medida' : 'Skip this measurement'}
          >
            {lang === 'es' ? 'Saltar' : 'Skip'}
          </button>
          <button
            onClick={handleNext}
            disabled={currentValue === undefined || currentValue === null}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {currentStep === GUIDED_MEASUREMENTS.length - 1
              ? (lang === 'es' ? 'Revisar' : 'Review')
              : (lang === 'es' ? 'Siguiente' : 'Next')
            }
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] text-center mt-3">
          Enter · {lang === 'es' ? 'Ctrl+Enter para guardar' : 'Ctrl+Enter to save'}
        </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== REVIEW VIEW ====================
  if (sessionState === 'review') {
    const recordedEntries = Object.entries(session.values)
      .filter(([, v]) => v !== undefined && v !== null) as [AllMeasurementType, number][];

    return (
      <div className="p-6 max-w-lg mx-auto">
        <button onClick={() => setSessionState('measuring')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          {lang === 'es' ? 'Volver a medir' : 'Back to measuring'}
        </button>

        {saved ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {lang === 'es' ? '¡Sesión guardada!' : 'Session saved!'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
              {recordedEntries.length} {lang === 'es' ? 'medidas registradas' : 'measurements recorded'}
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold text-slate-900 dark:text-[var(--color-text)] mb-1">
              {lang === 'es' ? 'Revisar sesión' : 'Review session'}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {session.date} · {session.time} · {session.condition}
            </p>

            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-card)] divide-y divide-[var(--color-border-subtle)] mb-6">
              {recordedEntries.map(([type, value]) => {
                const typeInfo = MEASUREMENT_TYPES.find(t => t.id === type);
                const prev = getLatestValue(state.measurements, type);
                const diff = prev !== null ? value - prev : null;

                return (
                  <div key={type} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">{typeInfo?.label[lang] ?? type}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-[var(--color-text)]">
                        {toDisplay(type, value, unitSystem)} <span className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{UNIT_LABELS[displayUnitFor(type, unitSystem)][lang]}</span>
                      </span>
                      {diff !== null && diff !== 0 && (
                        <span className={`text-xs font-medium ${diff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {session.notes && (
              <div className="bg-[var(--color-input-bg)] rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-500 mb-1">{lang === 'es' ? 'Notas' : 'Notes'}</p>
                <p className="text-sm text-slate-700 dark:text-[var(--color-text-secondary)]">{session.notes}</p>
              </div>
            )}

            <button
              onClick={handleSave}
              title="Ctrl+Enter"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              <Check className="w-5 h-5" />
              {lang === 'es' ? 'Guardar sesión' : 'Save session'}
            </button>
            <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] text-center mt-2">Ctrl+Enter</p>
          </>
        )}
      </div>
    );
  }

  return null;
}
