import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Wind, HeartPulse, Flame, Ruler, ChevronRight } from 'lucide-react';
import { useApp } from '../../lib/store';
import { getConditioningProfile, NORM_BAND_LABELS, NORM_BAND_COLORS } from '../../lib/conditioning';
import type { ConditioningProfile, NormResult } from '@fitness/bodylab-conditioning';

/**
 * ConditioningPanel — the aggregated conditioning profile as a Progress card.
 *
 * Pure presentation over `getConditioningProfile` (which wraps the core
 * package): the 0-100 aggregate score, each classified axis with its
 * normative band, the Cooper VO2max estimate and the Jackson-Pollock 3-site
 * %BF pipelines. No math lives here — nulls come straight from core guards.
 */

interface Bilingual {
  en: string;
  es: string;
}

const AXIS_META: { key: keyof ConditioningProfile; label: Bilingual; icon: typeof Wind }[] = [
  { key: 'cooper', label: { en: 'Cardio (Cooper)', es: 'Cardio (Cooper)' }, icon: Wind },
  { key: 'restingHeartRate', label: { en: 'Resting HR', es: 'FC en reposo' }, icon: HeartPulse },
  { key: 'measuredBodyFat', label: { en: 'Body fat %', es: '% Grasa real' }, icon: Flame },
  { key: 'abdominalSkinfold', label: { en: 'Abdominal fold', es: 'Pliegue abdominal' }, icon: Ruler },
];

function scoreTone(score: number): { label: Bilingual; color: string } {
  if (score >= 78) return { label: { en: 'Strong', es: 'Sólido' }, color: '#10b981' };
  if (score >= 55) return { label: { en: 'Fair', es: 'Aceptable' }, color: '#f59e0b' };
  return { label: { en: 'Priority to train', es: 'Prioridad de entreno' }, color: '#ef4444' };
}

export default function ConditioningPanel() {
  const { state } = useApp();
  const { measurements, profile } = state;
  const lang = state.language;
  const navigate = useNavigate();

  const cond = useMemo(
    () => (profile ? getConditioningProfile(measurements, profile) : null),
    [measurements, profile]
  );

  // The classification needs age + sex; without a profile there is nothing to show.
  if (!profile || !cond) return null;

  const jpMale = cond.jacksonPollockBodyFatPct;
  const jpFemale = cond.jacksonPollockFemaleBodyFatPct;

  // Nothing measurable → a quiet CTA pointing at the Conditioning tab.
  if (cond.classifiedCount === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {lang === 'es' ? '🏃 Condición física' : '🏃 Physical conditioning'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-1">
              {lang === 'es'
                ? 'Sin datos de condición todavía: test de Cooper, FC en reposo, % grasa o pliegues.'
                : 'No conditioning data yet: Cooper test, resting HR, body fat or skinfolds.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="shrink-0 flex items-center gap-1 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
          >
            {lang === 'es' ? 'Medir ahora' : 'Measure now'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const tone = scoreTone(cond.conditioningScore ?? 0);

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent space-y-4">
      {/* Header: aggregate score + tone */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {lang === 'es' ? '🏃 Condición física' : '🏃 Physical conditioning'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mt-0.5">
            {cond.classifiedCount}/4 {lang === 'es' ? 'ejes clasificados' : 'axes classified'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums" style={{ color: tone.color }}>
            {cond.conditioningScore}
            <span className="text-sm font-normal text-slate-400 ml-1">/100</span>
          </p>
          <p className="text-xs font-medium" style={{ color: tone.color }}>{tone.label[lang]}</p>
        </div>
      </div>

      {/* Per-axis normative bands */}
      <div className="grid sm:grid-cols-2 gap-2">
        {AXIS_META.map(({ key, label, icon: Icon }) => {
          const result = cond[key] as NormResult | null;
          return (
            <div key={key} className="flex items-center gap-3 p-3 bg-[var(--color-input-bg)] rounded-xl">
              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700 dark:text-[var(--color-text-secondary)] truncate">
                  {label[lang]}
                </p>
                {result ? (
                  <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)]">{result.bounds}</p>
                ) : (
                  <p className="text-[11px] text-slate-300 dark:text-[var(--color-text-disabled)]">
                    {lang === 'es' ? 'sin datos' : 'no data'}
                  </p>
                )}
              </div>
              {result && (
                <span
                  className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: NORM_BAND_COLORS[result.band] }}
                >
                  {NORM_BAND_LABELS[result.band][lang]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Derived metrics: VO2max + Jackson-Pollock %BF */}
      {(cond.cooper?.vo2max != null || jpMale != null || jpFemale != null) && (
        <div className="flex flex-wrap gap-2">
          {cond.cooper?.vo2max != null && (
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
              VO2max ≈ {cond.cooper.vo2max} ml/kg/min
            </span>
          )}
          {jpMale != null && (
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              {lang === 'es' ? '%BF J-P 3 sitios' : 'J-P 3-site %BF'}: {jpMale}% ({lang === 'es' ? 'pecho · abdomen · muslo' : 'chest · abdomen · thigh'})
            </span>
          )}
          {jpFemale != null && (
            <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
              {lang === 'es' ? '%BF J-P 3 sitios' : 'J-P 3-site %BF'}: {jpFemale}% ({lang === 'es' ? 'tríceps · suprailiaco · muslo' : 'triceps · suprailiac · thigh'})
            </span>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)] flex items-center gap-1">
        <Activity className="w-3 h-3" />
        {lang === 'es'
          ? 'Bandas normativas por sexo y edad (Cooper 1968, AHA, ACE, Jackson-Pollock).'
          : 'Normative bands by sex and age (Cooper 1968, AHA, ACE, Jackson-Pollock).'}
      </p>
    </div>
  );
}
