import { RefreshCw } from 'lucide-react';
import { useApp } from '../../lib/store';
import { t } from '../../i18n';

type View = 'front' | 'back';

interface BodyToolbarProps {
  view: View;
  onViewChange: (view: View) => void;
  showSymmetry: boolean;
  onToggleSymmetry: () => void;
}

/** Segmented control group — theme-aware track + elevated thumb (no white boxes in dark). */
function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)]">
      {children}
    </div>
  );
}

function SegButton({
  active, onClick, title, children,
}: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-[13px] transition-all duration-150 ${
        active
          ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
      }`}
    >
      {children}
    </button>
  );
}

export default function BodyToolbar({
  view, onViewChange,
  showSymmetry, onToggleSymmetry,
}: BodyToolbarProps) {
  const { state } = useApp();
  const lang = state.language;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onToggleSymmetry}
        title={lang === 'es' ? 'Panel de simetría' : 'Symmetry panel'}
        aria-pressed={showSymmetry}
        className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium transition-all border ${
          showSymmetry
            ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
            : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]'
        }`}
      >
        <RefreshCw className="w-4 h-4" />
        {lang === 'es' ? 'Simetría' : 'Symmetry'}
      </button>

      <Segmented>
        <SegButton
          active={view === 'front'}
          onClick={() => onViewChange('front')}
          title={lang === 'es' ? 'Vista frontal (F)' : 'Front view (F)'}
        >
          {t('body.front')}
        </SegButton>
        <SegButton
          active={view === 'back'}
          onClick={() => onViewChange('back')}
          title={lang === 'es' ? 'Vista posterior (B)' : 'Back view (B)'}
        >
          {t('body.back')}
        </SegButton>
      </Segmented>
    </div>
  );
}
