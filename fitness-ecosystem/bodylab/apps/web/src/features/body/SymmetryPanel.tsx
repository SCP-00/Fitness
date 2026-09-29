import { useApp } from '../../lib/store';
import { getLatestMeasurement } from '../../lib/queries';

const BILATERAL_PAIRS = [
  { leftType: 'biceps_left' as const, rightType: 'biceps_right' as const, label: { en: 'Biceps', es: 'Bíceps' } },
  { leftType: 'forearm_left' as const, rightType: 'forearm_right' as const, label: { en: 'Forearm', es: 'Antebrazo' } },
  { leftType: 'thigh_left' as const, rightType: 'thigh_right' as const, label: { en: 'Thigh', es: 'Muslo' } },
  { leftType: 'calf_left' as const, rightType: 'calf_right' as const, label: { en: 'Calf', es: 'Pantorrilla' } },
  { leftType: 'shoulders_left' as const, rightType: 'shoulders_right' as const, label: { en: 'Shoulder', es: 'Hombro' } },
];

const STATUS_STYLES: Record<string, string> = {
  optimal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  near: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
  deviation: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  unknown: 'bg-slate-100 text-slate-400 dark:bg-[var(--color-chip-bg)] dark:text-[var(--color-text-disabled)]',
};

export default function SymmetryPanel() {
  const { state } = useApp();
  const lang = state.language;
  const { measurements } = state;

  const scores = BILATERAL_PAIRS.map(pair => {
    const left = getLatestMeasurement(measurements, pair.leftType);
    const right = getLatestMeasurement(measurements, pair.rightType);
    const ratio = left && right
      ? Math.min(left.value, right.value) / Math.max(left.value, right.value)
      : null;
    const status = ratio !== null
      ? ratio >= 0.97 ? 'optimal' : ratio >= 0.93 ? 'near' : 'deviation'
      : 'unknown';
    return { label: pair.label, left, right, ratio, status };
  });

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
      <h2 className="text-lg font-semibold mb-4">
        {lang === 'es' ? 'Simetría Bilateral' : 'Bilateral Symmetry'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scores.map((s, idx) => (
          <div key={idx} className="bg-[var(--color-input-bg)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{s.label[lang]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s.status]}`}>
                {s.ratio !== null ? `${(s.ratio * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[var(--color-text-muted)]">
              <span>{s.left ? `${s.left.value} cm` : '—'}</span>
              <span className="text-slate-300 dark:text-[var(--color-text-disabled)]">vs</span>
              <span>{s.right ? `${s.right.value} cm` : '—'}</span>
            </div>
            {s.ratio !== null && (
              <div className="mt-2 w-full bg-slate-200 dark:bg-[var(--color-surface-sunken)] rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${s.ratio * 100}%`,
                    backgroundColor: s.status === 'optimal' ? '#10b981' : s.status === 'near' ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
