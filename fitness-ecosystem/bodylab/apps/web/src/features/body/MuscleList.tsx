import { useApp } from '../../lib/store';
import { t } from '../../i18n';
import { MUSCLE_GROUPS, SCORE_COLORS, getScoreStatus } from '../../lib/constants';

interface MuscleListProps {
  onSelectMuscle: (muscleId: string) => void;
}

const REGIONS = [
  { key: 'upper', ids: ['deltoids', 'chest', 'biceps', 'triceps', 'forearms'] },
  { key: 'core', ids: ['abs', 'obliques', 'lower_back'] },
  { key: 'lower', ids: ['glutes', 'quadriceps', 'hamstrings', 'calves'] },
  { key: 'back', ids: ['traps', 'lats'] },
];

const REGION_LABELS: Record<string, { en: string; es: string }> = {
  upper: { en: 'Upper Body', es: 'Tren Superior' },
  core: { en: 'Core', es: 'Core' },
  lower: { en: 'Lower Body', es: 'Tren Inferior' },
  back: { en: 'Back', es: 'Espalda' },
};

export default function MuscleList({ onSelectMuscle }: MuscleListProps) {
  const { state } = useApp();
  const lang = state.language;
  const { assessment } = state;

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent ">
      <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-[var(--color-text)]">{t('body.allMuscles')}</h2>
      {REGIONS.map(({ key, ids }) => {
        const muscles = MUSCLE_GROUPS.filter(m => (ids as readonly string[]).includes(m.id));
        return (
          <div key={key} className="mb-4 last:mb-0">
            <p className="text-xs font-semibold text-slate-400 dark:text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
              {REGION_LABELS[key][lang]}
            </p>
            <div className="space-y-1">
              {muscles.map(muscle => {
                const assessmentItem = assessment.find(a => a.segment === muscle.measurementType);
                const score = assessmentItem?.score ?? null;
                const status = score !== null ? getScoreStatus(score) : 'moderate';

                return (
                  <button
                    key={muscle.id}
                    onClick={() => onSelectMuscle(muscle.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-[var(--color-surface-elevated)] transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-[var(--color-text)]">{muscle.name[lang]}</span>
                      {muscle.isProxy && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 rounded font-medium" title="Proxy">P</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
                        {score !== null ? `${(score * 100).toFixed(0)}%` : '—'}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: score !== null ? SCORE_COLORS[status]?.bg : '#cbd5e1' }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
