import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info } from 'lucide-react';
import { useApp } from '../../lib/store';
import { getLatestValue } from '../../lib/queries';
import {
  toDisplay, displayUnitFor, UNIT_LABELS,
  weightToDisplay, heightToDisplay, profileUnitFor,
} from '../../lib/units';
import { SCORE_COLORS, WHTR_COLORS } from '../../lib/constants';
import type { AllMeasurementType } from '../../lib/types';
import { METRIC_CONFIG } from './timeline-config';

/**
 * GoalPanel — the Progreso headline card: how far each measured segment sits
 * from the PUBLISHED reference ideal for this frame (McCallum, keyed on the
 * wrist circumference), plus the Adonis V-taper ratio, WHtR and current weight.
 *
 * Presentation only — every number comes from `state.assessment`,
 * `state.adonisResult` and `state.whtrResult`, which CALCULATE_ASSESSMENT in
 * the store computes with @fitness/bodylab-anthropometry. No target is
 * invented here: the ideal shown is the published proportion, and the footnote
 * says explicitly that it is a reference index, not a health goal or medical
 * advice.
 *
 * Unmeasured segments are listed as "sin medir" instead of being dropped, so a
 * missing reading reads as a gap in the picture rather than as "fine".
 */

/** Same order the store iterates McCallum segments in. */
const MCCALLUM_SEGMENTS = ['chest', 'waist', 'hips', 'biceps', 'thigh', 'neck', 'calf', 'forearm'] as const;

const ADONIS_LABELS: Record<string, { en: string; es: string; color: string }> = {
  optimal: { en: 'Optimal', es: 'Óptimo', color: '#10b981' },
  near: { en: 'Near', es: 'Cerca', color: '#f59e0b' },
  far: { en: 'Far', es: 'Lejos', color: '#ef4444' },
};

function scoreStatus(score: number): 'optimal' | 'near' | 'moderate' | 'significant' {
  if (score >= 0.90) return 'optimal';
  if (score >= 0.70) return 'near';
  if (score >= 0.40) return 'moderate';
  return 'significant';
}

export default function GoalPanel() {
  const { state } = useApp();
  const navigate = useNavigate();
  const { measurements, profile, assessment, adonisResult, whtrResult } = state;
  const lang = state.language;
  const units = profile?.units ?? 'metric';

  const wrist = getLatestValue(measurements, 'wrist');

  const rows = MCCALLUM_SEGMENTS.map(segment => ({
    segment,
    entry: assessment.find(a => a.segment === segment) ?? null,
  }));

  const measured = rows.filter(r => r.entry !== null);
  const average = measured.length > 0
    ? measured.reduce((sum, r) => sum + (r.entry?.score ?? 0), 0) / measured.length
    : null;
  const tone = average !== null
    ? SCORE_COLORS[scoreStatus(average)]
    : null;

  const weight = getLatestValue(measurements, 'weight') ?? profile?.weight ?? null;

  // Nothing to score yet — say what is missing instead of showing an empty box.
  if (average === null || !tone) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {lang === 'es' ? '🎯 Hacia tu ideal' : '🎯 Towards your ideal'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-1">
              {wrist
                ? (lang === 'es'
                  ? 'Tu referencia activa no genera proporciones todavía.'
                  : 'Your active reference does not produce proportions yet.')
                : (lang === 'es'
                  ? 'Falta la muñeca: con ella se calcula tu ideal de proporción (McCallum).'
                  : 'Wrist measurement missing: it is what McCallum proportions are keyed on.')}
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

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent space-y-4">
      {/* Header: title + aggregate closeness score */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {lang === 'es' ? '🎯 Hacia tu ideal' : '🎯 Towards your ideal'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mt-0.5">
            {lang === 'es' ? 'McCallum · muñeca ' : 'McCallum · wrist '}
            {wrist !== null ? `${toDisplay('wrist', wrist, units).toFixed(1)} ` : '— '}
            {wrist !== null ? UNIT_LABELS[displayUnitFor('wrist', units)][lang] : ''}
            {' · '}{measured.length}/{rows.length} {lang === 'es' ? 'medidas' : 'measures'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums" style={{ color: tone.bg }}>
            {Math.round(average * 100)}
            <span className="text-sm font-normal text-slate-400 ml-1">/100</span>
          </p>
          <p className="text-xs font-medium" style={{ color: tone.bg }}>{tone.label[lang]}</p>
        </div>
      </div>

      {/* Per-segment rows: actual vs ideal with a closeness bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map(({ segment, entry }) => {
          const config = METRIC_CONFIG[segment];
          const label = config?.label[lang] ?? segment;
          if (!entry) {
            return (
              <div key={segment} className="flex items-center justify-between p-3 rounded-xl border border-dashed border-[var(--color-border)]">
                <p className="text-sm text-slate-400 dark:text-[var(--color-text-disabled)]">{label}</p>
                <button
                  onClick={() => navigate('/history')}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {lang === 'es' ? 'sin medir' : 'not measured'}
                </button>
              </div>
            );
          }
          const type = segment as AllMeasurementType;
          const actual = toDisplay(type, entry.actual, units);
          const ideal = toDisplay(type, entry.ideal, units);
          const delta = Math.round((actual - ideal) * 10) / 10;
          const unit = UNIT_LABELS[displayUnitFor(type, units)][lang];
          const pct = Math.round(entry.score * 100);
          return (
            <div key={segment} className="p-3 bg-[var(--color-input-bg)] rounded-xl">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-[var(--color-text-secondary)]">{label}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: entry.color }}>
                  {actual.toFixed(1)} / {ideal.toFixed(1)} <span className="text-[11px] font-normal text-slate-400">{unit}</span>
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: entry.color }} />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <span className="text-[11px] text-slate-500 dark:text-[var(--color-text-muted)] tabular-nums">
                  {delta > 0
                    ? (lang === 'es' ? `+${delta.toFixed(1)} ${unit} sobre la referencia` : `+${delta.toFixed(1)} ${unit} above the reference`)
                    : delta < 0
                      ? (lang === 'es' ? `${delta.toFixed(1)} ${unit} bajo la referencia` : `${delta.toFixed(1)} ${unit} below the reference`)
                      : (lang === 'es' ? 'en la referencia' : 'at the reference')}
                </span>
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: entry.color }}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary tiles: Adonis (V-taper), WHtR, weight */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {adonisResult && (() => {
          const meta = ADONIS_LABELS[adonisResult.status] ?? ADONIS_LABELS.near;
          const pct = Math.min(100, Math.round((adonisResult.ratio / 1.618) * 100));
          return (
            <div className="p-4 bg-[var(--color-input-bg)] rounded-xl">
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mb-1">
                {lang === 'es' ? 'Adonis (hombros/cintura)' : 'Adonis (shoulders/waist)'}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{adonisResult.ratio.toFixed(2)}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: meta.color }}>
                  {meta[lang]}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2 overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)] mt-1">
                {lang === 'es' ? 'meta Φ ≈ 1,62' : 'target Φ ≈ 1.62'}
              </p>
            </div>
          );
        })()}

        {whtrResult && (() => {
          const meta = WHTR_COLORS[whtrResult.status as keyof typeof WHTR_COLORS] ?? WHTR_COLORS.healthy;
          return (
            <div className="p-4 bg-[var(--color-input-bg)] rounded-xl">
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mb-1">WHtR</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{whtrResult.ratio.toFixed(2)}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: meta.bg }}>
                  {meta.label[lang]}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)] mt-2">
                {lang === 'es' ? 'cintura / estatura · meta ≤ 0,50' : 'waist / height · target ≤ 0.50'}
              </p>
            </div>
          );
        })()}

        {profile && weight !== null && (
          <div className="p-4 bg-[var(--color-input-bg)] rounded-xl">
            <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)] mb-1">
              {lang === 'es' ? 'Peso y estatura' : 'Weight and height'}
            </p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">
              {Math.round(weightToDisplay(weight, units))}
              <span className="text-sm font-normal text-slate-400 ml-1">
                {UNIT_LABELS[profileUnitFor('weight', units)][lang]}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)] mt-2">
              {units === 'imperial'
                ? `${heightToDisplay(profile.height, units).toFixed(1)} ${UNIT_LABELS.in[lang]}`
                : `${profile.height.toFixed(2)} ${UNIT_LABELS.m[lang]}`}
            </p>
          </div>
        )}
      </div>

      {/* Honesty footnote */}
      <p className="text-[11px] text-slate-400 dark:text-[var(--color-text-muted)] flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        {lang === 'es'
          ? 'Proporciones publicadas por McCallum (pecho = 6,5 × muñeca) y ratio áureo: un índice de referencia, no una meta de salud ni consejo médico. La referencia es una proporción, no un techo ni un mínimo — estar por encima no es un defecto, y la puntuación solo mide cercanía.'
          : 'Published McCallum proportions (chest = 6.5 × wrist) and golden ratio: a reference index, not a health target or medical advice. The reference is a proportion, not a ceiling or a floor — being above it is not a defect, and the score only measures closeness.'}
      </p>
    </div>
  );
}
