import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../lib/store';
import { getMeasurementChange, getLatestMeasurementMap } from '../lib/queries';
import { MEASUREMENT_TYPES } from '../lib/constants';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

/** Measurements surfaced on the overview dashboard. */
const KEY_TYPES = ['chest', 'waist', 'hips', 'biceps', 'shoulders', 'thigh'] as const;

/**
 * Overview — Main landing page
 *
 * 3-second test: "What's happening? What changed? What should I do?"
 *
 * Hierarchy:
 * 1. Context (greeting, date)
 * 2. Summary (N measurements, recent changes)
 * 3. Next action (missing measurements → Measure now)
 * 4. Body status (latest values with deltas)
 */

export default function Overview() {
  const { state } = useApp();
  const navigate = useNavigate();
  const { profile, measurements } = state;
  const lang = state.language;

  const latestMap = useMemo(() => getLatestMeasurementMap(measurements), [measurements]);

  const changes = useMemo(() => {
    const result: Record<string, { current: number; previous: number; delta: number; percent: number; direction: 'up' | 'down' | 'stable' } | null> = {};
    for (const type of KEY_TYPES) {
      result[type] = getMeasurementChange(measurements, type);
    }
    return result;
  }, [measurements]);

  const missingTypes = useMemo(() => KEY_TYPES.filter(t => !latestMap[t]), [latestMap]);
  const totalMeasurements = measurements.length;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return lang === 'es' ? 'Buenos días' : 'Good morning';
    if (hour < 18) return lang === 'es' ? 'Buenas tardes' : 'Good afternoon';
    return lang === 'es' ? 'Buenas noches' : 'Good evening';
  }, [lang]);

  const recentChanges = useMemo(() => {
    const ups: string[] = [];
    const downs: string[] = [];
    for (const type of KEY_TYPES) {
      const change = changes[type];
      if (change && change.direction !== 'stable') {
        const label = MEASUREMENT_TYPES.find(t => t.id === type)?.label[lang] ?? type;
        if (change.direction === 'up') ups.push(`${label} +${change.delta.toFixed(1)}`);
        else downs.push(`${label} ${change.delta.toFixed(1)}`);
      }
    }
    return { ups, downs };
  }, [changes, lang]);

  // Empty state
  if (measurements.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="py-20 text-center">
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Plus className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold tracking-tight text-slate-900 dark:text-[var(--color-text)] mb-2">
            {lang === 'es' ? 'Bienvenido a BodyLab' : 'Welcome to BodyLab'}
          </h1>
          <p className="text-slate-500 dark:text-[var(--color-text-muted)] max-w-sm mx-auto mb-6 text-sm">
            {lang === 'es'
              ? 'Tu primera sesión de medición toma aproximadamente 5 minutos.'
              : 'Your first measurement session takes about 5 minutes.'}
          </p>
          <button
            onClick={() => navigate('/measure')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {lang === 'es' ? 'Comenzar a medir' : 'Start measuring'}
          </button>
        </div>
      </div>
    );
  }

  return (
    // Mobile: tighter padding and a stacked header (a 28 px title next to a
    // primary action does not fit a 390 px viewport without wrapping badly).
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header — page title left, dominant action top-right (§99.1) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold tracking-tight text-slate-900 dark:text-[var(--color-text)]">
            {greeting}{profile ? `, ${profile.name}` : ''}
          </h1>
          <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-1">
            {new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/measure')}
          title={lang === 'es' ? 'Medir ahora (M)' : 'Measure now (M)'}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {lang === 'es' ? 'Medir ahora' : 'Measure now'}
        </button>
      </div>

      {/* KPI band — ≤ 4 cards, one fact each (§100.1) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Weight */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
          <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] uppercase tracking-wide">
            {lang === 'es' ? 'Peso' : 'Weight'}
          </p>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)] mt-1">
            {profile ? profile.weight : '—'}<span className="text-sm font-medium text-slate-400 ml-1">kg</span>
          </p>
          <p className="text-xs mt-1">
            {(() => {
              const w = getMeasurementChange(measurements, 'weight');
              if (w && w.direction !== 'stable') {
                return <span className={w.direction === 'up' ? 'text-amber-600' : 'text-emerald-600'}>{w.direction === 'up' ? '↑' : '↓'} {Math.abs(w.delta).toFixed(1)} kg</span>;
              }
              return <span className="text-slate-400">{lang === 'es' ? 'perfil' : 'profile'}</span>;
            })()}
          </p>
        </div>
        {/* BMI — only shown with a profile, never the lead number */}
        {profile && (
          <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
            <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] uppercase tracking-wide">
              BMI*
            </p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)] mt-1">
              {(profile.weight / (profile.height * profile.height)).toFixed(1)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{lang === 'es' ? 'solo referencia' : 'reference only'}</p>
          </div>
        )}
        {/* Coverage */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
          <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] uppercase tracking-wide">
            {lang === 'es' ? 'Cobertura' : 'Coverage'}
          </p>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)] mt-1">
            {Math.round((KEY_TYPES.filter(t => latestMap[t]).length / KEY_TYPES.length) * 100)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {KEY_TYPES.filter(t => latestMap[t]).length}/{KEY_TYPES.length} {lang === 'es' ? 'medidas clave' : 'key values'}
          </p>
        </div>
        {/* Last session */}
        <div className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
          <p className="text-[11px] font-medium text-slate-500 dark:text-[var(--color-text-muted)] uppercase tracking-wide">
            {lang === 'es' ? 'Última sesión' : 'Last session'}
          </p>
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)] mt-1">
            {new Date(Math.max(...measurements.map(m => new Date(m.timestamp).getTime()))).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-xs text-slate-400 mt-1">{totalMeasurements} {lang === 'es' ? 'valores' : 'values'}</p>
        </div>
      </div>

      {/* What changed — one-liner context under the KPIs (§100.1) */}
      {recentChanges.ups.length + recentChanges.downs.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap -mt-4">
          {recentChanges.ups.length > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">{recentChanges.ups.slice(0, 2).join(' · ')}</span>
            </div>
          )}
          {recentChanges.downs.length > 0 && (
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">{recentChanges.downs.slice(0, 2).join(' · ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Next action — informational only; the action lives in the header once (§99.2) */}
      {missingTypes.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            {lang === 'es'
              ? `Faltan ${missingTypes.length} medidas para un assessment completo.`
              : `${missingTypes.length} measurements missing for a complete assessment.`}
          </p>
        </div>
      )}

      {/* Body status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[var(--color-text-muted)]">
            {lang === 'es' ? 'Estado del cuerpo' : 'Body status'}
          </p>
          <button
            onClick={() => navigate('/body')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            {lang === 'es' ? 'Explorar →' : 'Explore →'}
          </button>
        </div>

        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-card)] dark:border-transparent divide-y divide-[var(--color-border-subtle)] dark:divide-transparent">
          {KEY_TYPES.map(type => {
            const value = latestMap[type];
            const change = changes[type];
            const typeInfo = MEASUREMENT_TYPES.find(t => t.id === type);
            if (!typeInfo) return null;

            return (
              <div
                key={type}
                className="group flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer"
                onClick={() => navigate('/body')}
              >
                <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">{typeInfo.label[lang]}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-[var(--color-text)]">
                    {value ?? '—'}
                    {value !== null && <span className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] ml-0.5">cm</span>}
                  </span>
                  {change && change.direction !== 'stable' && (
                    <span className={`text-xs font-medium ${
                      change.direction === 'up' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {change.direction === 'up' ? '↑' : '↓'} {Math.abs(change.delta).toFixed(1)}
                    </span>
                  )}
                  <span className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">▸</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Snapshot action */}
      <div className="pt-2">
        <button
          onClick={() => navigate('/progress')}
          className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] hover:text-slate-700 dark:hover:text-[var(--color-text)] transition-colors"
        >
          {lang === 'es' ? 'Guardar snapshot →' : 'Save snapshot →'}
        </button>
      </div>
    </div>
  );
}
