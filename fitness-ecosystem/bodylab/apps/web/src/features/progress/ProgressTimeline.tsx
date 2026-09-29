import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Camera } from 'lucide-react';
import { useApp } from '../../lib/store';
import { t } from '../../i18n';
import { getLatestMeasurement } from '../../lib/queries';
import type { AllMeasurementType } from '../../lib/types';
import { METRIC_CONFIG } from './timeline-config';

interface ProgressTimelineProps {
  selectedMetrics: string[];
  onToggleMetric: (metric: string) => void;
}

export default function ProgressTimeline({ selectedMetrics, onToggleMetric }: ProgressTimelineProps) {
  const { state } = useApp();
  const { measurements, snapshots } = state;
  const lang = state.language;

  const timelineData = useMemo(() => {
    const points: Record<string, unknown>[] = [];

    snapshots.forEach((snap) => {
      const date = new Date(snap.timestamp);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const point: Record<string, unknown> = { date: dateStr, fullDate: date.toLocaleDateString(), type: 'snapshot', snapshotId: snap.id };
      selectedMetrics.forEach(metricId => {
        const meas = snap.measurements.find(sm => sm.type === metricId);
        point[metricId] = meas?.value ?? null;
      });
      points.push(point);
    });

    if (measurements.length > 0) {
      const point: Record<string, unknown> = { date: lang === 'es' ? 'Ahora' : 'Now', fullDate: new Date().toLocaleDateString(), type: 'current' };
      selectedMetrics.forEach(metricId => {
        const meas = getLatestMeasurement(measurements, metricId as AllMeasurementType);
        point[metricId] = meas?.value ?? null;
      });
      points.push(point);
    }

    return points;
  }, [snapshots, measurements, selectedMetrics, lang]);

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('progress.timeline')}</h2>
        {timelineData.length > 0 && (
          <span className="text-xs text-slate-400 dark:text-[var(--color-text-muted)]">
            {timelineData.length} {lang === 'es' ? 'puntos' : 'points'}
          </span>
        )}
      </div>

      {/* Metric Selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(METRIC_CONFIG).map(([id, config]) => (
          <button
            key={id}
            onClick={() => onToggleMetric(id)}
            title={config.estimate
              ? (lang === 'es'
                ? 'Incluye estimaciones de cinta (Navy, ±3,5% de error publicado) guardadas como baja confianza'
                : 'Includes tape estimates (Navy, ±3.5% published error) saved as low confidence')
              : undefined}
            className={`whitespace-nowrap select-none px-3 py-1.5 rounded-lg font-medium text-xs leading-none transition-all ${
              selectedMetrics.includes(id) ? 'text-white shadow' : 'bg-slate-100 dark:bg-[var(--color-chip-bg)] text-slate-500 dark:text-[var(--color-chip-text)] hover:bg-slate-200 dark:hover:bg-[var(--color-surface-elevated)]'
            }`}
            style={selectedMetrics.includes(id) ? { backgroundColor: config.color } : {}}
          >
            {config.label[lang]}
            {config.estimate && <span className="ml-1 opacity-90" aria-hidden>≈</span>}
          </button>
        ))}
      </div>

      {timelineData.length >= 2 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={12} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: 'var(--color-text)' }}
                formatter={(value, name) => {
                  const config = METRIC_CONFIG[String(name)];
                  return [`${value} ${config?.unit ?? ''}`, config?.label[lang] ?? String(name)];
                }}
                labelFormatter={(label) => {
                  const point = timelineData.find(p => p.date === String(label));
                  return String(point?.fullDate ?? label);
                }}
              />
              <Legend />
              {selectedMetrics.map(metricId => {
                const config = METRIC_CONFIG[metricId];
                if (!config) return null;
                return (
                  <Line key={metricId} type="monotone" dataKey={metricId} stroke={config.color} strokeWidth={2.5}
                    name={config.label[lang]}
                    dot={config.estimate
                      ? { r: 4, fill: 'var(--color-surface)', stroke: config.color, strokeWidth: 2, strokeDasharray: '2 2' }
                      : { r: 4, fill: config.color }}
                    activeDot={{ r: 6, strokeWidth: 2 }} connectNulls />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 flex flex-col items-center justify-center text-slate-400 dark:text-[var(--color-text-muted)]">
          <Camera className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">
            {lang === 'es' ? 'Necesitas al menos 2 puntos para ver la gráfica' : 'You need at least 2 points to see the chart'}
          </p>
          <p className="text-sm mt-1">
            {lang === 'es' ? 'Guarda un snapshot y luego cambia tus medidas para ver la evolución' : 'Save a snapshot, then change your measurements to see progress'}
          </p>
        </div>
      )}
    </div>
  );
}
