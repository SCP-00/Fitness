import { useState } from 'react';
import { Target, Check, Info, ChevronRight, BookOpen, Heart } from 'lucide-react';
import { useApp } from '../lib/store';
import { t } from '../i18n';
import { BUILT_IN_REFERENCES } from '../lib/constants';
import type { ReferenceProfile } from '../lib/types';

const REFERENCE_CATEGORIES = {
  anthropometric: {
    label: 'Anthropometric',
    description: 'Body proportion standards based on measurement ratios',
    icon: Target,
    refs: ['mccallum_recreational', 'venus_recreational'],
  },
  health: {
    label: 'Health',
    description: 'Health risk indicators based on population studies',
    icon: Heart,
    refs: ['health_whtr'],
  },
} as const;

export default function References() {
  const { state, dispatch } = useApp();
  const [showInfo, setShowInfo] = useState(false);
  const activeRef = state.selectedReference;

  const handleSelectReference = (ref: ReferenceProfile) => {
    dispatch({ type: 'SET_REFERENCE', payload: ref });
  };

  const getRefDetail = (id: string): { name: string; desc: string; source: string } => {
    const map: Record<string, { name: string; desc: string; source: string }> = {
      mccallum_recreational: {
        name: 'McCallum Recreational',
        desc: 'Classical male anthropometric proportions based on wrist measurement. Developed by John McCallum for athletic body standards.',
        source: 'John McCallum, "Keys to Progress" (1965)',
      },
      venus_recreational: {
        name: 'Venus Recreational',
        desc: 'Female anthropometric proportions optimized for balanced feminine physique. Based on height and wrist circumference.',
        source: 'Venus Index methodology',
      },
      health_whtr: {
        name: 'WHtR Health',
        desc: 'Waist-to-Height Ratio health reference. Based on epidemiological studies linking central obesity to health risks.',
        source: 'Ashwell & Hsieh (2005), WHO consultation',
      },
    };
    return map[id] ?? { name: id, desc: '', source: '' };
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold tracking-tight text-slate-900 dark:text-[var(--color-text)]">{t('reference.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-0.5">Define how your measurements are interpreted</p>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--color-surface-sunken)] transition-colors"
          title="About references"
          aria-label="About references"
        >
          <Info className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Info banner */}
      {showInfo && (
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-indigo-900 dark:text-indigo-200 mb-1">About Reference Profiles</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
                A reference profile defines the "target" measurements your body is compared against.
                Changing your active reference <strong>does not recalculate</strong> historical snapshots — 
                it only affects how new measurements are interpreted going forward.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Reference */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)]">Current Reference</h2>
            <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">Active for new measurements</p>
          </div>
        </div>

        <div className="bg-[var(--color-input-bg)] rounded-xl p-5 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-[var(--color-text)]">
                {activeRef.name[state.language]}
              </p>
              <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-1">
                {getRefDetail(activeRef.id).source}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
              <Check className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)] mt-3 leading-relaxed">
            {getRefDetail(activeRef.id).desc}
          </p>
        </div>

        <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] mt-3">
          Historical snapshots are never recalculated when you change the active reference.
        </p>
      </div>

      {/* Available References */}
      {(Object.keys(REFERENCE_CATEGORIES) as Array<keyof typeof REFERENCE_CATEGORIES>).map((catKey) => {
        const cat = REFERENCE_CATEGORIES[catKey];
        const Icon = cat.icon;
        return (
          <div key={catKey} className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 dark:bg-[var(--color-chip-bg)] rounded-xl">
                <Icon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)]">{cat.label}</h2>
                <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">{cat.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {cat.refs.map((refId) => {
                const ref = BUILT_IN_REFERENCES.find(r => r.id === refId);
                if (!ref) return null;
                const isActive = activeRef.id === refId;
                const detail = getRefDetail(refId);

                return (
                  <button
                    key={refId}
                    onClick={() => handleSelectReference(ref)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-[var(--color-primary)] bg-indigo-50 dark:bg-indigo-500/10 shadow-sm'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-sunken)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-[var(--color-text)]">{ref.name[state.language]}</p>
                          {isActive && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-1">{detail.source}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Custom Reference placeholder */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent border-dashed">
        <div className="text-center">
          <Target className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="font-medium text-slate-700 dark:text-[var(--color-text-secondary)]">Custom Reference</h3>
          <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-1">
            Create your own reference profile from your measurements (coming in V1.1)
          </p>
        </div>
      </div>
    </div>
  );
}
