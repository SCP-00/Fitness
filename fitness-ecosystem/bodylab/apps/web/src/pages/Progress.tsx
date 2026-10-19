import { useState, useMemo } from 'react';
import { Camera, GitCompare, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../lib/store';
import { t } from '../i18n';
import { ProgressTimeline, CurrentValues, SnapshotComparison, ConditioningPanel, GoalPanel, METRIC_CONFIG } from '../features/progress';
import { estimateSomatotype, componentBand, type SomatotypeNote } from '../lib/somatotype';

/** Somatotype adaptation notes → on-screen honesty copy (owner, 2026-10-08). */
const SOMATO_NOTES: Record<SomatotypeNote, { en: string; es: string }> = {
  'endo-from-bf': { en: 'endomorphy mapped from body fat %', es: 'endomorfia mapeada desde % de grasa' },
  'no-bf': { en: 'no body fat % → neutral endomorphy', es: 'sin % de grasa → endomorfia neutra' },
  'humerus-from-wrist': { en: 'humerus approximated from wrist breadth', es: 'húmero aproximado desde anchura de muñeca' },
  'no-breadth': { en: 'no elbow/wrist breadth → reference value', es: 'sin anchura de codo/muñeca → valor de referencia' },
  'femur-from-knee': { en: 'femur from measured knee breadth', es: 'fémur desde anchura de rodilla medida' },
  'femur-reference': { en: 'knee breadth absent or outside 7–12 cm → reference value', es: 'anchura de rodilla ausente o fuera de 7–12 cm → valor de referencia' },
  'skinfolds-estimated': { en: 'skinfolds estimated from body fat %', es: 'pliegues estimados desde % de grasa' },
  'girth-reference': { en: 'missing girth → reference value', es: 'circunferencia ausente → valor de referencia' },
};

/**
 * Progress — Thin orchestrator using feature components.
 *
 * Tabs: Chart | Current Values | Compare | History
 */
export default function Progress() {
  const { state, createSnapshot } = useApp();
  const { measurements, snapshots, profile } = state;
  const lang = state.language;

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['chest', 'waist', 'hips']);
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'current' | 'compare' | 'history'>('timeline');

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]);
  };

  const activeMeasurements = useMemo(() => {
    return measurements.filter(m => METRIC_CONFIG[m.type]);
  }, [measurements]);

  const bmi = profile ? (profile.weight / (profile.height * profile.height)) : null;
  const bmiStatus = bmi ? (
    bmi < 18.5 ? { label: lang === 'es' ? 'Bajo peso' : 'Underweight', color: '#f59e0b' } :
    bmi < 25 ? { label: lang === 'es' ? 'Normal' : 'Normal', color: '#10b981' } :
    bmi < 30 ? { label: lang === 'es' ? 'Sobrepeso' : 'Overweight', color: '#f97316' } :
    { label: lang === 'es' ? 'Obesidad' : 'Obese', color: '#ef4444' }
  ) : null;

  const handleCreateSnapshot = () => {
    createSnapshot(snapshotNotes || undefined);
    setSnapshotNotes('');
    setShowSnapshotForm(false);
  };

  // Latest finite value for a measurement type (null when never recorded).
  const latestOf = (type: string): number | null => {
    let best: { value: number; timestamp: string } | null = null;
    for (const m of measurements) {
      if (m.type !== type || !Number.isFinite(m.value)) continue;
      if (!best || m.timestamp > best.timestamp) best = m;
    }
    return best ? best.value : null;
  };

  // Somatotype from the owner's own metrics (lib/somatotype.ts documents the
  // adaptation and every substituted input). `profile.height` is in METRES.
  const somato = useMemo(() => {
    if (!profile || !(profile.height > 0.5)) return null;
    return estimateSomatotype({
      heightCm: Math.round(profile.height * 1000) / 10,
      weightKg: profile.weight,
      bodyFatPct: latestOf('body_fat_measured') ?? latestOf('body_fat_percentage'),
      sex: profile.biologicalSex === 'female' ? 'female' : 'male',
      elbowBreadthCm: latestOf('elbow_breadth'),
      wristBreadthCm: latestOf('wrist_breadth'),
      kneeBreadthCm: latestOf('knee_breadth'),
      armGirthCm: latestOf('biceps_flexed') ?? latestOf('biceps'),
      calfGirthCm: latestOf('calf'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, measurements]);

  return (
    <div className="bl-page space-y-6">
      {/* Header — stacks below `sm` so the two CTAs are never pushed off a phone */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold tracking-tight text-slate-900 dark:text-[var(--color-text)]">{t('progress.title')}</h1>
          <p className="text-slate-500 dark:text-[var(--color-text-muted)]">{t('progress.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSnapshotForm(!showSnapshotForm)}
            className="flex items-center gap-2 px-4 h-10 border border-[var(--color-border)] text-[var(--color-text-secondary)] dark:border-[var(--color-border)] rounded-lg font-medium hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            <Camera className="w-4 h-4" />
            {lang === 'es' ? 'Guardar snapshot' : 'Save snapshot'}
          </button>
          <button
            onClick={() => { setShowSnapshotForm(false); setActiveTab('compare'); }}
            disabled={snapshots.length < 2}
            title={snapshots.length < 2
              ? (lang === 'es' ? 'Guarda al menos dos snapshots para comparar' : 'Save at least two snapshots to compare')
              : undefined}
            className="flex items-center gap-2 px-4 h-10 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            {lang === 'es' ? 'Comparar snapshots' : 'Compare snapshots'}
          </button>
        </div>
      </div>

      {/* Snapshot Form */}
      {showSnapshotForm && (
        <div className="bl-card p-6" style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 28%, transparent)' }}>
          <h3 className="font-semibold text-slate-900 mb-3">
            {lang === 'es' ? 'Crear Snapshot' : 'Create Snapshot'}
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            {lang === 'es'
              ? 'Guarda un punto en el tiempo con tus medidas actuales.'
              : 'Save a point in time with your current measurements.'}
          </p>
          <div className="flex gap-3">
            <input type="text" value={snapshotNotes}
              onChange={(e) => setSnapshotNotes(e.target.value)}
              placeholder={lang === 'es' ? 'Nota opcional (ej: "Semana 4")' : 'Optional note (e.g. "Week 4")'}
              className="flex-1 px-4 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()} />
            <button onClick={handleCreateSnapshot}
              className="px-5 py-2.5 bl-btn bl-btn-primary font-medium ">
              {lang === 'es' ? 'Guardar snapshot' : 'Save snapshot'}
            </button>
            <button onClick={() => setShowSnapshotForm(false)}
              className="px-4 py-2.5 text-slate-500 hover:text-slate-700 transition-colors">
              {lang === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* ── Dónde estás — one group: goal, numbers, today's profile ───── */}
      <section aria-labelledby="progress-now" className="space-y-4">
        <div>
          <p className="bl-eyebrow">{lang === 'es' ? 'Dónde estás' : 'Where you are'}</p>
          <h2 id="progress-now" className="bl-section-title mt-1">
            {lang === 'es' ? 'Tu cuerpo hoy' : 'Your body today'}
          </h2>
        </div>

      {/* "Hacia tu ideal" — distance to the published reference ideals, first
          thing on the page: the owner reads Progreso against a goal (2026-10-05). */}
      <GoalPanel />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: lang === 'es' ? 'Medidas' : 'Measurements', value: activeMeasurements.length, icon: '📏' },
          { label: lang === 'es' ? 'Snapshots' : 'Snapshots', value: snapshots.length, icon: '📸' },
          { label: 'BMI', value: bmi ? bmi.toFixed(1) : '—', sub: bmiStatus?.label, color: bmiStatus?.color, icon: '⚖️' },
          { label: lang === 'es' ? 'Último snapshot' : 'Last snapshot',
            value: snapshots.length > 0 ? new Date(snapshots[snapshots.length - 1].timestamp).toLocaleDateString() : (lang === 'es' ? 'Ninguno' : 'None'),
            icon: '🕐' },
        ].map((stat, i) => (
          <div key={i} className="bl-card p-4 ">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-[var(--color-text)]">{stat.value}</p>
            {stat.sub && <p className="text-xs font-medium mt-0.5" style={{ color: stat.color }}>{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* Aggregated conditioning profile (score, bands, VO2max, J-P %BF) +
          somatotype: the two halves of "today's profile", side by side on a
          wide screen so the page answers in one glance instead of two scrolls. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {activeTab !== 'current' && (
          <div className={somato ? undefined : 'lg:col-span-2'}>
            <ConditioningPanel />
          </div>
        )}

        {/* Somatotype — endo/meso/ecto from BodyLab's own metrics (owner, 2026-10-08). */}
        {somato && (
          <div className="bl-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">
                  {lang === 'es' ? 'Somatotipo (estimación)' : 'Somatotype (estimate)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mt-0.5">
                  {lang === 'es'
                    ? 'Endomorfia · Mesomorfia · Ectomorfía — método Heath-Carter adaptado a tus métricas'
                    : 'Endomorphy · Mesomorphy · Ectomorphy — Heath-Carter adapted to your metrics'}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                {somato.dominant === 'balanced'
                  ? (lang === 'es' ? 'Equilibrado' : 'Balanced')
                  : somato.dominant === 'endomorphy'
                    ? (lang === 'es' ? 'Endomorfo dominante' : 'Endomorphic dominant')
                    : somato.dominant === 'mesomorphy'
                      ? (lang === 'es' ? 'Mesomorfo dominante' : 'Mesomorphic dominant')
                      : (lang === 'es' ? 'Ectomorfo dominante' : 'Ectomorphic dominant')}
              </span>
            </div>

            {/* Three readings as three tiles: value first, band second, the bar
                only as reinforcement — instead of three stacked text rows. */}
            <div className="grid grid-cols-3 gap-2.5">
              {([
                ['endo', somato.endomorphy, lang === 'es' ? 'Endomorfia' : 'Endomorphy', '#f59e0b'],
                ['meso', somato.mesomorphy, lang === 'es' ? 'Mesomorfia' : 'Mesomorphy', '#10b981'],
                ['ecto', somato.ectomorphy, lang === 'es' ? 'Ectomorfia' : 'Ectomorphy', '#6366f1'],
              ] as const).map(([key, value, label, color]) => (
                <div key={key} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-3 text-center">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)]">{label}</p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{value.toFixed(1)}</p>
                  <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)]">
                    {componentBand(value) === 'low'
                      ? (lang === 'es' ? 'Bajo' : 'Low')
                      : componentBand(value) === 'moderate'
                        ? (lang === 'es' ? 'Moderado' : 'Moderate')
                        : componentBand(value) === 'high'
                          ? (lang === 'es' ? 'Alto' : 'High')
                          : (lang === 'es' ? 'Muy alto' : 'Very high')}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-[var(--color-surface)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (value / 8) * 100)}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* The honesty copy stays — collapsed so it reads as a footnote,
                not as a wall between the reader and the numbers. */}
            <details className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)]">
              <summary className="cursor-pointer font-medium text-slate-500 dark:text-[var(--color-text-secondary)] select-none">
                {lang === 'es' ? 'Adaptaciones del método' : 'Method adaptations'}
              </summary>
              <p className="mt-1.5 leading-relaxed">
                {lang === 'es' ? 'Adaptaciones: ' : 'Adaptations: '}
                {somato.notes.map(n => SOMATO_NOTES[n][lang]).join(' · ')}.
                {lang === 'es'
                  ? ' El método oficial necesita pliegues con calibre y anchuras óseas; esto es una estimación con tus métricas, no una medición clínica.'
                  : ' The official method needs skinfold calipers and bone breadths; this is an estimate from your metrics, not a clinical measurement.'}
              </p>
            </details>
          </div>
        )}
      </div>
      </section>

      {/* ── Cómo evoluciona — the tabs and everything they show ────────── */}
      <section aria-labelledby="progress-evolve" className="space-y-4">
        <div>
          <p className="bl-eyebrow">{lang === 'es' ? 'Cómo evoluciona' : 'How it changes'}</p>
          <h2 id="progress-evolve" className="bl-section-title mt-1">
            {lang === 'es' ? 'Tu progreso en el tiempo' : 'Your progress over time'}
          </h2>
        </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] p-1 rounded-lg w-fit max-w-full overflow-x-auto">
        {[
          { id: 'timeline' as const, label: lang === 'es' ? 'Gráfica' : 'Chart' },
          { id: 'current' as const, label: lang === 'es' ? 'Valores Actuales' : 'Current Values' },
          { id: 'compare' as const, label: lang === 'es' ? 'Comparar' : 'Compare' },
          { id: 'history' as const, label: lang === 'es' ? 'Historial' : 'History' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-md font-medium text-sm transition-all ${activeTab === tab.id ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' && (
        <ProgressTimeline selectedMetrics={selectedMetrics} onToggleMetric={toggleMetric} />
      )}

      {activeTab === 'current' && <CurrentValues />}

      {activeTab === 'compare' && <SnapshotComparison />}

      {/* Snapshot History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {snapshots.length === 0 ? (
            <div className="bl-card p-12 text-center">
              <Camera className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
                {lang === 'es' ? 'No hay snapshots todavía' : 'No snapshots yet'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {lang === 'es' ? 'Guarda tu primer snapshot para comenzar a rastrear tu progreso' : 'Save your first snapshot to start tracking your progress'}
              </p>
              <button onClick={() => setShowSnapshotForm(true)}
                className="mt-4 px-4 py-2 bl-btn bl-btn-primary text-sm font-medium ">
                {lang === 'es' ? 'Crear primer snapshot' : 'Create first snapshot'}
              </button>
            </div>
          ) : (
            <>
              {/* First vs Latest comparison */}
              {snapshots.length >= 2 && (
                <div className="bl-card p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    {lang === 'es' ? 'Comparación: Primer vs Último' : 'Comparison: First vs Latest'}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 ">
                          <th className="text-left p-3 text-slate-500 font-medium">{lang === 'es' ? 'Medida' : 'Measurement'}</th>
                          <th className="text-right p-3 text-slate-500 font-medium">{new Date(snapshots[0].timestamp).toLocaleDateString()}</th>
                          <th className="text-right p-3 text-slate-500 font-medium">{new Date(snapshots[snapshots.length - 1].timestamp).toLocaleDateString()}</th>
                          <th className="text-right p-3 text-slate-500 font-medium">{lang === 'es' ? 'Cambio' : 'Change'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(METRIC_CONFIG).map(([id, config]) => {
                          const firstVal = snapshots[0].measurements.find(m => m.type === id)?.value;
                          const lastVal = snapshots[snapshots.length - 1].measurements.find(m => m.type === id)?.value;
                          if (!firstVal && !lastVal) return null;
                          const delta = (firstVal && lastVal) ? lastVal - firstVal : null;
                          return (
                            <tr key={id} className="border-b border-slate-50 hover:bg-[var(--color-input-bg)]">
                              <td className="p-3 font-medium" style={{ color: config.color }}>{config.label[lang]}</td>
                              <td className="p-3 text-right text-slate-600 dark:text-[var(--color-text-secondary)]">{firstVal ? `${firstVal} ${config.unit}` : '—'}</td>
                              <td className="p-3 text-right text-slate-600 dark:text-[var(--color-text-secondary)]">{lastVal ? `${lastVal} ${config.unit}` : '—'}</td>
                              <td className="p-3 text-right">
                                {delta !== null && delta !== 0 ? (
                                  <span className={`font-medium ${delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                  </span>
                                ) : <span className="text-slate-400 dark:text-[var(--color-text-muted)]">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* All snapshots */}
              <div className="bl-card p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {lang === 'es' ? 'Todos los Snapshots' : 'All Snapshots'}
                </h2>
                <div className="space-y-2">
                  {[...snapshots].reverse().map(snap => {
                    const isExpanded = expandedSnapshot === snap.id;
                    const snapMeasurements = snap.measurements.filter(m => METRIC_CONFIG[m.type]);
                    return (
                      <div key={snap.id} className="bg-[var(--color-input-bg)] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-[var(--color-surface-elevated)] transition-colors"
                          onClick={() => setExpandedSnapshot(isExpanded ? null : snap.id)}>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <Clock className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {new Date(snap.timestamp).toLocaleDateString()} {new Date(snap.timestamp).toLocaleTimeString()}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">
                                {snapMeasurements.length} {lang === 'es' ? 'medidas' : 'measurements'}
                                {snap.notes && ` · ${snap.notes}`}
                              </p>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-slate-200  pt-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                              {snapMeasurements.map(m => {
                                const config = METRIC_CONFIG[m.type];
                                if (!config) return null;
                                return (
                                  <div key={m.id} className="text-center">
                                    <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{config.label[lang]}</p>
                                    <p className="font-bold" style={{ color: config.color }}>
                                      {m.value}<span className="text-xs text-slate-400 ml-0.5">{config.unit}</span>
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      </section>
    </div>
  );
}
