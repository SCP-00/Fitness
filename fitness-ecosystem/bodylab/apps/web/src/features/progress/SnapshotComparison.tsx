import { useState } from 'react';
import { Camera } from 'lucide-react';
import { useApp } from '../../lib/store';
import { METRIC_CONFIG } from './timeline-config';

export default function SnapshotComparison() {
  const { state } = useApp();
  const { snapshots } = state;
  const lang = state.language;
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  if (snapshots.length < 2) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl p-12 shadow-sm border border-slate-100 dark:border-transparent text-center">
        <Camera className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-[var(--color-text-disabled)]" />
        <p className="font-medium text-slate-600 dark:text-[var(--color-text-secondary)]">
          {lang === 'es' ? 'Necesitas al menos 2 snapshots' : 'You need at least 2 snapshots'}
        </p>
        <p className="text-sm text-slate-400 dark:text-[var(--color-text-muted)] mt-1">
          {lang === 'es' ? 'Guarda snapshots en diferentes momentos para comparar' : 'Save snapshots at different times to compare'}
        </p>
      </div>
    );
  }

  const snapA = snapshots.find(s => s.id === compareA);
  const snapB = snapshots.find(s => s.id === compareB);

  const comparisonData = (compareA && compareB && compareA !== compareB && snapA && snapB)
    ? Object.entries(METRIC_CONFIG).map(([id, config]) => {
        const valA = snapA.measurements.find(m => m.type === id)?.value;
        const valB = snapB.measurements.find(m => m.type === id)?.value;
        const delta = (valA !== undefined && valB !== undefined) ? valB - valA : null;
        const percent = (valA !== undefined && valB !== undefined && valA > 0) ? ((valB - valA) / valA) * 100 : null;
        return { id, config, valA, valB, delta, percent };
      }).filter(d => d.valA !== undefined || d.valB !== undefined)
    : [];

  const changes = comparisonData.filter(d => d.delta !== null && Math.abs(d.delta!) > 0.1);
  const increases = changes.filter(d => d.delta! > 0);
  const decreases = changes.filter(d => d.delta! < 0);

  return (
    <div className="space-y-6">
      {/* Snapshot selectors */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <h2 className="text-lg font-semibold mb-4">
          {lang === 'es' ? 'Seleccionar snapshots para comparar' : 'Select snapshots to compare'}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[var(--color-text-muted)] mb-2">
              {lang === 'es' ? 'Snapshot A (Inicio)' : 'Snapshot A (Start)'}
            </label>
            <select value={compareA} onChange={(e) => setCompareA(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent">
              <option value="">—</option>
              {snapshots.map(snap => (
                <option key={snap.id} value={snap.id}>
                  {new Date(snap.timestamp).toLocaleDateString()} {snap.notes ? `(${snap.notes})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[var(--color-text-muted)] mb-2">
              {lang === 'es' ? 'Snapshot B (Final)' : 'Snapshot B (End)'}
            </label>
            <select value={compareB} onChange={(e) => setCompareB(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent">
              <option value="">—</option>
              {snapshots.map(snap => (
                <option key={snap.id} value={snap.id}>
                  {new Date(snap.timestamp).toLocaleDateString()} {snap.notes ? `(${snap.notes})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {comparisonData.length > 0 && snapA && snapB && (
        <>
          {/* What Changed */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
            <h2 className="text-lg font-semibold mb-4">
              {lang === 'es' ? '¿Qué cambió?' : 'What changed?'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mb-4">
              {lang === 'es' ? 'Desde' : 'Since'} {new Date(snapA.timestamp).toLocaleDateString()} — {changes.length} {lang === 'es' ? 'medidas cambiaron' : 'measurements changed'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {increases.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">
                    ↑ {lang === 'es' ? 'Aumentos' : 'Increases'}
                  </p>
                  {increases.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">{d.config.label[lang]}</span>
                      <span className="text-sm font-medium text-amber-600">+{d.delta!.toFixed(1)} {d.config.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {decreases.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">
                    ↓ {lang === 'es' ? 'Disminuciones' : 'Decreases'}
                  </p>
                  {decreases.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">{d.config.label[lang]}</span>
                      <span className="text-sm font-medium text-emerald-600">{d.delta!.toFixed(1)} {d.config.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
            <h2 className="text-lg font-semibold mb-4">
              {lang === 'es' ? 'Comparación detallada' : 'Detailed comparison'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 ">
                    <th className="text-left p-3 text-slate-500 dark:text-[var(--color-text-muted)] font-medium">{lang === 'es' ? 'Medida' : 'Measurement'}</th>
                    <th className="text-right p-3 text-slate-500 dark:text-[var(--color-text-muted)] font-medium">{new Date(snapA.timestamp).toLocaleDateString()}</th>
                    <th className="text-right p-3 text-slate-500 dark:text-[var(--color-text-muted)] font-medium">{new Date(snapB.timestamp).toLocaleDateString()}</th>
                    <th className="text-right p-3 text-slate-500 dark:text-[var(--color-text-muted)] font-medium">{lang === 'es' ? 'Cambio' : 'Change'}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(({ id, config, valA, valB, delta, percent }) => (
                    <tr key={id} className="border-b border-slate-50 hover:bg-[var(--color-input-bg)]">
                      <td className="p-3 font-medium" style={{ color: config.color }}>{config.label[lang]}</td>
                      <td className="p-3 text-right text-slate-600 dark:text-[var(--color-text-secondary)] tabular-nums">{valA !== undefined ? `${valA} ${config.unit}` : '—'}</td>
                      <td className="p-3 text-right text-slate-600 dark:text-[var(--color-text-secondary)] tabular-nums">{valB !== undefined ? `${valB} ${config.unit}` : '—'}</td>
                      <td className="p-3 text-right">
                        {delta !== null && delta !== 0 ? (
                          <span className={`font-medium ${delta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                            {percent !== null && (
                              <span className="text-xs ml-1 opacity-70">({delta > 0 ? '+' : ''}{percent.toFixed(1)}%)</span>
                            )}
                          </span>
                        ) : <span className="text-slate-400 dark:text-[var(--color-text-muted)]">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
