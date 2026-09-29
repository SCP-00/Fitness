import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../../lib/store';
import { getLatestMeasurement } from '../../lib/queries';
import { toDisplay, displayUnitFor, UNIT_LABELS } from '../../lib/units';
import type { AllMeasurementType } from '../../lib/types';
import { METRIC_CONFIG, COMPOSITION_CONFIG } from './timeline-config';

export default function CurrentValues() {
  const { state } = useApp();
  const { measurements } = state;
  const lang = state.language;
  // Display units (BL-MEAS-005) — the profile is kept current by SET_UNITS.
  const unitSystem = state.profile?.units ?? 'metric';

  // Compute deltas from snapshots
  const { snapshots } = state;
  const deltas: Record<string, { current: number; previous: number; delta: number; percent: number }> = {};
  if (snapshots.length > 0) {
    const lastSnap = snapshots[snapshots.length - 1];
    for (const [id] of Object.entries(METRIC_CONFIG)) {
      const meas = getLatestMeasurement(measurements, id as AllMeasurementType);
      const prevMeas = lastSnap.measurements.find(sm => sm.type === id);
      if (meas && prevMeas) {
        const delta = meas.value - prevMeas.value;
        const percent = prevMeas.value > 0 ? (delta / prevMeas.value) * 100 : 0;
        deltas[id] = { current: meas.value, previous: prevMeas.value, delta: Math.round(delta * 10) / 10, percent: Math.round(percent * 10) / 10 };
      }
    }
  }

  const BILATERAL_PAIRS = [
    { label: 'Bíceps', left: 'biceps_left', right: 'biceps_right', color: '#f59e0b' },
    { label: 'Antebrazo', left: 'forearm_left', right: 'forearm_right', color: '#06b6d4' },
    { label: 'Muslo', left: 'thigh_left', right: 'thigh_right', color: '#ef4444' },
    { label: 'Pantorrilla', left: 'calf_left', right: 'calf_right', color: '#ec4899' },
    { label: 'Hombro', left: 'shoulders_left', right: 'shoulders_right', color: '#14b8a6' },
  ];

  return (
    <div className="space-y-4">
      {/* Circumferences */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <h2 className="text-lg font-semibold mb-4">
          {lang === 'es' ? '📏 Circunferencias' : '📏 Circumferences'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(METRIC_CONFIG).map(([id, config]) => {
            const meas = getLatestMeasurement(measurements, id as AllMeasurementType);
            const delta = deltas[id];
            return (
              <div key={id} className="bg-[var(--color-input-bg)] rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mb-1">{config.label[lang]}</p>
                <p className="text-xl font-bold" style={{ color: config.color }}>
                  {meas ? toDisplay(id as AllMeasurementType, meas.value, unitSystem) : '—'}
                  {meas && <span className="text-xs font-normal text-slate-500 dark:text-[var(--color-text-muted)] ml-1">{UNIT_LABELS[displayUnitFor(id as AllMeasurementType, unitSystem)][lang]}</span>}
                </p>
                {delta && (
                  <div className="flex items-center gap-1 mt-1">
                    {delta.delta > 0 ? <TrendingUp className="w-3 h-3 text-red-500" />
                      : delta.delta < 0 ? <TrendingDown className="w-3 h-3 text-emerald-500" />
                      : <Minus className="w-3 h-3 text-slate-400 dark:text-[var(--color-text-disabled)]" />}
                    <span className={`text-xs font-medium ${delta.delta > 0 ? 'text-red-500' : delta.delta < 0 ? 'text-emerald-500' : 'text-slate-400 dark:text-[var(--color-text-muted)]'}`}>
                      {delta.delta > 0 ? '+' : ''}{toDisplay(id as AllMeasurementType, delta.delta, unitSystem)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Conditioning — measured %BF (incl. Navy estimates, flagged) */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <h2 className="text-lg font-semibold mb-4">
          {lang === 'es' ? '🏃 Condición' : '🏃 Conditioning'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(METRIC_CONFIG)
            .filter(([, config]) => config.estimate)
            .map(([id, config]) => {
              const meas = getLatestMeasurement(measurements, id as AllMeasurementType);
              return (
                <div key={id} className="bg-[var(--color-input-bg)] rounded-xl p-4">
                  <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mb-1">{config.label[lang]}</p>
                  <p className="text-xl font-bold" style={{ color: config.color }}>
                    {meas ? meas.value : '—'}
                    {meas && <span className="text-xs font-normal text-slate-500 dark:text-[var(--color-text-muted)] ml-1">{config.unit}</span>}
                  </p>
                  {meas && (
                    <p className="text-[10px] mt-1" style={{ color: meas.confidence === 'low' ? '#f59e0b' : '#10b981' }}>
                      {meas.confidence === 'low'
                        ? (lang === 'es' ? '≈ estimación (Navy ±3,5%)' : '≈ estimate (Navy ±3.5%)')
                        : (lang === 'es' ? 'medido con plicómetro/DEXA' : 'caliper/DEXA measured')}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Composition */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <h2 className="text-lg font-semibold mb-4">
          {lang === 'es' ? '🔬 Composición Corporal' : '🔬 Body Composition'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(COMPOSITION_CONFIG).map(([id, config]) => {
            const meas = getLatestMeasurement(measurements, id as AllMeasurementType);
            return (
              <div key={id} className="bg-[var(--color-input-bg)] rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mb-1">{config.label[lang]}</p>
                <p className="text-xl font-bold" style={{ color: config.color }}>
                  {meas ? toDisplay(id as AllMeasurementType, meas.value, unitSystem) : '—'}
                  {meas && <span className="text-xs font-normal text-slate-500 dark:text-[var(--color-text-muted)] ml-1">{UNIT_LABELS[displayUnitFor(id as AllMeasurementType, unitSystem)][lang]}</span>}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bilateral */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <h2 className="text-lg font-semibold mb-4">
          {lang === 'es' ? '⚖️ Simetría Bilateral' : '⚖️ Bilateral Symmetry'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {BILATERAL_PAIRS.map(pair => {
            const leftM = getLatestMeasurement(measurements, pair.left as AllMeasurementType);
            const rightM = getLatestMeasurement(measurements, pair.right as AllMeasurementType);
            const leftVal = leftM?.value;
            const rightVal = rightM?.value;
            let symPercent: number | null = null;
            if (leftVal && rightVal) {
              symPercent = Math.round((Math.min(leftVal, rightVal) / Math.max(leftVal, rightVal)) * 1000) / 10;
            }
            return (
              <div key={pair.label} className="bg-[var(--color-input-bg)] rounded-xl p-4">
                <p className="text-sm font-medium text-slate-700 dark:text-[var(--color-text-secondary)] mb-2">{pair.label}</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500 dark:text-[var(--color-text-muted)]">L: <span className="font-medium text-slate-900 dark:text-[var(--color-text)]">{leftVal !== undefined ? toDisplay(pair.left as AllMeasurementType, leftVal, unitSystem) : '—'}</span></span>
                  <span className="text-slate-300 dark:text-[var(--color-text-disabled)]">|</span>
                  <span className="text-slate-500 dark:text-[var(--color-text-muted)]">R: <span className="font-medium text-slate-900 dark:text-[var(--color-text)]">{rightVal !== undefined ? toDisplay(pair.right as AllMeasurementType, rightVal, unitSystem) : '—'}</span></span>
                </div>
                {symPercent !== null && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-[var(--color-text-muted)]">{symPercent}%</span>
                      <span className={`font-medium ${symPercent >= 95 ? 'text-emerald-600' : symPercent >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                        {symPercent >= 95 ? (lang === 'es' ? 'Balanceado' : 'Balanced')
                          : symPercent >= 85 ? (lang === 'es' ? 'Leve desviación' : 'Mild deviation')
                          : (lang === 'es' ? 'Desviación' : 'Deviation')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${symPercent}%`, backgroundColor: symPercent >= 95 ? '#10b981' : symPercent >= 85 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
