import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, ChevronDown, ChevronUp, Dumbbell, Ruler, Clock, Trash2 } from 'lucide-react';
import { useApp } from '../../lib/store';
import { t } from '../../i18n';
import { MUSCLE_GROUPS, SCORE_COLORS, getScoreStatus, MEASUREMENT_TYPES, computeProxyMetrics } from '../../lib/constants';
import { parseNumberInput } from '../../lib/parse-num';
import { getLatestMeasurement } from '../../lib/queries';
import { getMuscleInfo } from '../../lib/muscle-info';
import ExerciseLog from './ExerciseLog';
import type { AllMeasurementType } from '../../lib/types';
import type { MuscleGroup as ExerciseMuscleGroup } from '../../lib/exercises';

// Map assessment muscle group ID → primary exercise muscle group
const ASSESSMENT_TO_PRIMARY_EXERCISE: Record<string, ExerciseMuscleGroup> = {
  'chest': 'chest_upper',
  'deltoids': 'lateral_deltoid',
  'biceps': 'biceps_long',
  'triceps': 'triceps_long',
  'forearms': 'brachioradialis',
  'abs': 'rectus_abdominis',
  'obliques': 'obliques',
  'lower_back': 'erector_spinae',
  'traps': 'traps_upper',
  'lats': 'lats_upper',
  'glutes': 'gluteus_maximus',
  'quadriceps': 'quadriceps',
  'hamstrings': 'hamstrings',
  'calves': 'calves',
};

function getExerciseMuscleId(assessmentId: string): ExerciseMuscleGroup {
  return ASSESSMENT_TO_PRIMARY_EXERCISE[assessmentId] ?? 'chest_upper';
}

interface MuscleDetailPanelProps {
  muscleId: string;
  onClose: () => void;
}

export default function MuscleDetailPanel({ muscleId, onClose }: MuscleDetailPanelProps) {
  const { state, addMeasurement, removeMeasurement } = useApp();
  const lang = state.language;
  const { measurements, assessment } = state;
  const [expandedSection, setExpandedSection] = useState<string | null>('anatomy');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addType, setAddType] = useState<AllMeasurementType | null>(null);
  const [saved, setSaved] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const muscleData = MUSCLE_GROUPS.find(m => m.id === muscleId);
  const muscleInfo = getMuscleInfo(muscleId);
  const selectedAssessment = muscleData
    ? assessment.find(a => a.segment === muscleData.measurementType)
    : null;
  const selectedScore = selectedAssessment?.score ?? null;
  const selectedStatus = selectedScore !== null ? getScoreStatus(selectedScore) : null;

  useEffect(() => {
    if (showAddForm && addInputRef.current) addInputRef.current.focus();
  }, [showAddForm]);

  const muscleMeasurements = muscleInfo
    ? muscleInfo.measurement.relatedTypes
        .map(type => getLatestMeasurement(measurements, type as AllMeasurementType))
        .filter(Boolean) as typeof measurements
    : [];

  const proxyMetrics = computeProxyMetrics(measurements);

  const handleQuickAdd = (type: AllMeasurementType) => {
    setAddType(type);
    setAddValue('');
    setShowAddForm(true);
  };

  const submitAdd = () => {
    if (!addType || !addValue) return;
    const val = parseNumberInput(addValue);
    if (val === null || val <= 0) return;
    addMeasurement({ type: addType, value: val, unit: 'cm' });
    setAddValue('');
    setShowAddForm(false);
    setAddType(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!muscleData) return null;

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border-card)] dark:border-transparent overflow-hidden">
      {/* Header with score */}
      <div className="p-5 border-b border-[var(--color-border)] dark:border-[var(--color-border)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{muscleInfo?.emoji ?? '💪'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">{muscleData.name[lang]}</h3>
                {muscleData.isProxy && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 rounded font-medium">Proxy</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{muscleData.measurementType}</p>
              {muscleData.isProxy && muscleData.proxyExplanation && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{muscleData.proxyExplanation[lang]}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Score */}
        {selectedScore !== null && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">{t('body.score')}</span>
              <span className="text-sm font-bold" style={{ color: SCORE_COLORS[selectedStatus ?? 'moderate']?.bg }}>
                {(selectedScore * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${selectedScore * 100}%`, backgroundColor: SCORE_COLORS[selectedStatus ?? 'moderate']?.bg }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {SCORE_COLORS[selectedStatus ?? 'moderate']?.label[lang]}
            </p>
          </div>
        )}

        {/* Assessment data */}
        {selectedAssessment && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-[var(--color-input-bg)] rounded-lg">
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">Actual</p>
              <p className="font-bold text-slate-900 dark:text-[var(--color-text)]">{selectedAssessment.actual}<span className="text-xs text-slate-500 ml-0.5">cm</span></p>
            </div>
            <div className="text-center p-2 bg-[var(--color-input-bg)] rounded-lg">
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">Target</p>
              <p className="font-bold text-indigo-600">{selectedAssessment.ideal}<span className="text-xs text-slate-500 ml-0.5">cm</span></p>
            </div>
            <div className="text-center p-2 bg-[var(--color-input-bg)] rounded-lg">
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">Deviation</p>
              <p className={`font-bold ${selectedAssessment.deviation > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {selectedAssessment.deviation > 0 ? '+' : ''}{selectedAssessment.deviation.toFixed(1)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Computed Proxy Metrics */}
      {muscleData.isProxy && proxyMetrics.length > 0 && (
        <div className="p-4 border-b border-[var(--color-border)] dark:border-[var(--color-border)] bg-amber-50/50 dark:bg-amber-500/5">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">
            📊 {lang === 'es' ? 'Métricas calculadas para este músculo' : 'Computed metrics for this muscle'}
          </p>
          <div className="space-y-2">
            {proxyMetrics.filter(m => {
              if (muscleId === 'lats') return m.id === 'v_taper';
              if (muscleId === 'traps') return m.id === 'neck_shoulder';
              if (muscleId === 'glutes') return m.id === 'glute_waist';
              if (muscleId === 'lower_back') return m.id === 'leg_proportion';
              return false;
            }).map(metric => (
              <div key={metric.id} className="flex items-center justify-between p-2 bg-[var(--color-surface)] rounded-lg">
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-[var(--color-text-secondary)]">{metric.name[lang]}</p>
                  <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{metric.description[lang]}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: metric.status === 'good' ? '#10b981' : metric.status === 'needs_work' ? '#ef4444' : '#f59e0b' }}>
                    {metric.value}{metric.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Button */}
      <div className="p-4 border-b border-[var(--color-border)] dark:border-[var(--color-border)] bg-indigo-50/50 dark:bg-indigo-500/5">
        <p className="text-xs text-indigo-600 dark:text-indigo-300 font-medium mb-2">
          📝 {lang === 'es' ? 'Registrar medida' : 'Record measurement'}
        </p>
        <div className="flex flex-wrap gap-2">
          {(muscleInfo?.measurement.relatedTypes ?? [muscleData.measurementType]).map(typeId => {
            const info = MEASUREMENT_TYPES.find(t => t.id === typeId);
            const existing = getLatestMeasurement(measurements, typeId as AllMeasurementType);
            return (
              <button
                key={typeId}
                onClick={() => handleQuickAdd(typeId as AllMeasurementType)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap bg-white dark:bg-[var(--color-surface-elevated)] border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {info?.label[lang] ?? typeId}
                {existing && <span className="text-blue-400">({existing.value})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="divide-y divide-[var(--color-border)] dark:divide-[var(--color-border)]">
        {/* Anatomy */}
        {muscleInfo && (
          <ExpandableSection
                        icon={<Dumbbell className="w-4 h-4 text-slate-500" />}
            label={lang === 'es' ? 'Anatomía' : 'Anatomy'}
            expanded={expandedSection === 'anatomy'}
            onToggle={() => setExpandedSection(expandedSection === 'anatomy' ? null : 'anatomy')}
                     >
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1">{lang === 'es' ? 'Ubicación' : 'Location'}</p>
                <p className="text-sm text-slate-700 dark:text-[var(--color-text-secondary)]">{muscleInfo.anatomy.location[lang]}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-1">{lang === 'es' ? 'Función' : 'Function'}</p>
                <p className="text-sm text-slate-700 dark:text-[var(--color-text-secondary)]">{muscleInfo.anatomy.function[lang]}</p>
              </div>
            </div>
          </ExpandableSection>
        )}

        {/* Measurement Guide */}
        {muscleInfo && (
          <ExpandableSection
                        icon={<Ruler className="w-4 h-4 text-slate-500" />}
            label={lang === 'es' ? 'Guía de Medición' : 'Measurement Guide'}
            expanded={expandedSection === 'guide'}
            onToggle={() => setExpandedSection(expandedSection === 'guide' ? null : 'guide')}
                     >
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                <p className="text-sm text-blue-800 dark:text-indigo-200">{muscleInfo.measurement.howTo[lang]}</p>
              </div>
              {muscleInfo.measurement.tips.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-[var(--color-text-muted)] mb-2">{lang === 'es' ? 'Consejos' : 'Tips'}</p>
                  <ul className="space-y-1">
                    {muscleInfo.measurement.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-[var(--color-text-secondary)]">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        {tip[lang]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ExpandableSection>
        )}

        {/* History */}
        <ExpandableSection
                    icon={<Clock className="w-4 h-4 text-slate-500" />}
          label={lang === 'es' ? 'Historial' : 'History'}
          expanded={expandedSection === 'history'}
          onToggle={() => setExpandedSection(expandedSection === 'history' ? null : 'history')}
                   badge={muscleMeasurements.length}
        >
          {muscleMeasurements.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-[var(--color-text-muted)] text-center py-4">
              {lang === 'es' ? 'No hay medidas registradas' : 'No measurements recorded'}
            </p>
          ) : (
            <div className="space-y-2">
              {muscleMeasurements.map(m => {
                const info = MEASUREMENT_TYPES.find(t => t.id === m.type);
                return (
                  <div key={m.id} className="flex items-center justify-between p-2.5 bg-[var(--color-input-bg)] rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-[var(--color-text)]">{info?.label[lang] ?? m.type}</p>
                      <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{new Date(m.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900 dark:text-[var(--color-text)]">{m.value}<span className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] ml-0.5">{m.unit}</span></span>
                      <button onClick={() => removeMeasurement(m.id)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ExpandableSection>

        {/* Exercises + Training Log */}
        <ExpandableSection
          icon={<Dumbbell className="w-4 h-4 text-slate-500" />}
          label={lang === 'es' ? 'Entrenamiento' : 'Training'}
          expanded={expandedSection === 'exercises'}
          onToggle={() => setExpandedSection(expandedSection === 'exercises' ? null : 'exercises')}
        >
          <ExerciseLog muscleId={getExerciseMuscleId(muscleId)} />
        </ExpandableSection>
      </div>

      {/* Quick Add Form */}
      {showAddForm && addType && (
        <div className="p-4 border-t border-[var(--color-border)] dark:border-[var(--color-border)] bg-indigo-50/50 dark:bg-indigo-500/5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-[var(--color-text-secondary)]">
              {MEASUREMENT_TYPES.find(t => t.id === addType)?.label[lang]}:
            </span>
            <input
              ref={addInputRef}
              type="number"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAdd();
                if (e.key === 'Escape') { setShowAddForm(false); setAddType(null); }
              }}
              placeholder={lang === 'es' ? 'valor' : 'value'}
              step="0.1"
              className="w-20 px-2 py-1.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <span className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">cm</span>
            <button onClick={submitAdd} disabled={!addValue} className="p-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowAddForm(false); setAddType(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-sm font-medium text-center">
          ✓ {lang === 'es' ? 'Medida guardada' : 'Measurement saved'}
        </div>
      )}
    </div>
  );
}

// ── Expandable Section Component ────────────────────────────────────────

function ExpandableSection({
  icon, label, expanded, onToggle, children, badge,
}: {
  icon: React.ReactNode;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-input-bg)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-700 dark:text-[var(--color-text-secondary)]">{label}</span>
          {badge !== undefined && (
            <span className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] bg-slate-100 dark:bg-[var(--color-chip-bg)] px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
