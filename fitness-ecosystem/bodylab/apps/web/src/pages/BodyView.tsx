import { useState, useEffect, type ComponentType } from 'react';
import { useApp } from '../lib/store';
import { t } from '../i18n';
import { SCORE_COLORS } from '../lib/constants';
import BodyMap from '../components/BodyMap';
import { BodyToolbar, MuscleDetailPanel, MuscleList, SymmetryPanel } from '../features/body';

// Lazy-load 3D viewer
let Lazy3DComponent: ComponentType<{ width?: number; height?: number }> | null = null;
function BodyViewer3D(props: { width?: number; height?: number }) {
  const [Component, setComponent] = useState<ComponentType<{ width?: number; height?: number }> | null>(Lazy3DComponent);
  useEffect(() => {
    if (!Lazy3DComponent) {
      import('../components/BodyViewer3D').then(m => { Lazy3DComponent = m.default; setComponent(() => m.default); });
    }
  }, []);
  if (!Component) return (
    <div className="flex items-center justify-center h-full bg-[var(--color-surface-sunken)] rounded-2xl">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">Loading 3D engine...</p>
      </div>
    </div>
  );
  return <Component {...props} />;
}

/**
 * BodyView — Thin orchestrator using feature components.
 *
 * Responsibility: layout + state management only.
 * All panels, details, lists are in features/body/.
 */
export default function BodyView() {
  const { state, dispatch } = useApp();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showSymmetryPanel, setShowSymmetryPanel] = useState(false);
  const lang = state.language;
  const { profile, measurements } = state;

  useEffect(() => {
    if (!profile || measurements.length === 0) return;
    dispatch({ type: 'CALCULATE_ASSESSMENT' });
  }, [measurements, profile, state.selectedReference, dispatch]);

  // Page shortcuts (§104): F/B → front/back, 1/2 → 2D/3D, Esc → close panel.
  // Never fire while typing (the exercise log has inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      switch (e.key.toLowerCase()) {
        case 'f': setView('front'); break;
        case 'b': setView('back'); break;
        case '1': setViewMode('2d'); break;
        case '2': setViewMode('3d'); break;
        case 'escape':
          if (selectedMuscle) setSelectedMuscle(null);
          else if (showSymmetryPanel) setShowSymmetryPanel(false);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedMuscle, showSymmetryPanel]);

  // Color legend for body map
  const scoreLegend = Object.entries(SCORE_COLORS);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold tracking-tight text-slate-900 dark:text-[var(--color-text)]">{t('body.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-0.5">{t('body.subtitle')}</p>
        </div>
        <BodyToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          view={view}
          onViewChange={setView}
          showSymmetry={showSymmetryPanel}
          onToggleSymmetry={() => setShowSymmetryPanel(!showSymmetryPanel)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Body Visualization */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent ">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)]">
              {viewMode === '2d'
                ? (view === 'front' ? t('body.frontView') : t('body.backView'))
                : (lang === 'es' ? 'Modelo 3D Paramétrico' : 'Parametric 3D Model')}
            </h2>
            {viewMode === '3d' && profile && (
              <span className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] bg-[var(--color-input-bg)] px-2 py-1 rounded-lg">
                {profile.height}m · {profile.weight}kg · {profile.biologicalSex === 'male' ? '♂' : '♀'}
              </span>
            )}
          </div>
          {viewMode === '2d' ? (
            <div className="flex justify-center">
              <div className="w-full max-w-md" style={{ height: '600px' }}>
                <BodyMap view={view} selectedMuscle={selectedMuscle} onMuscleSelect={setSelectedMuscle} />
              </div>
            </div>
          ) : (
            <div className="flex justify-center" style={{ height: '600px' }}>
              <BodyViewer3D width={Math.min(600, 800)} height={600} />
            </div>
          )}
          <p className="text-center text-sm text-slate-400 dark:text-[var(--color-text-muted)] mt-4">{t('body.clickToInspect')}</p>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedMuscle ? (
            <MuscleDetailPanel muscleId={selectedMuscle} onClose={() => setSelectedMuscle(null)} />
          ) : (
            <MuscleList onSelectMuscle={setSelectedMuscle} />
          )}

          {/* Color Legend */}
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent ">
            <h2 className="text-sm font-semibold mb-3 text-slate-900 dark:text-[var(--color-text)]">{t('body.colorLegend')}</h2>
            <div className="space-y-1.5">
              {scoreLegend.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: value.bg }} />
                  <span className="text-xs text-slate-700 dark:text-[var(--color-text-secondary)]">{value.label[lang]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bilateral Symmetry Panel */}
      {showSymmetryPanel && <SymmetryPanel />}
    </div>
  );
}
