/**
 * AnalyticsDashboard — Wave 5 Science & Analytics
 *
 * Displays:
 *   - Body Composition (circumference-based)
 *   - Health Risk Indicators
 *   - Body Age Score
 *   - Progress Predictions
 *   - Correlation Engine
 */

import { useMemo } from "react";
import {
  Shield,
  TrendingUp,
  Activity,
  Brain,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useApp } from "../lib/store";
import {
  assessBodyComposition,
  assessHealthRisks,
  calculateBodyAge,
  predictProgress,
  findCorrelations,
} from "@fitness/bodylab-analytics";
import { getLatestValue } from "../lib/queries";
import { profileAge } from "../lib/age";

export default function AnalyticsDashboard() {
  const { state } = useApp();
  const { measurements, profile, assessment } = state;
  const lang = state.language;

  // Calculate all analytics
  const composition = useMemo(() => {
    if (!profile) return null;
    const waist = getLatestValue(measurements, "waist");
    const neck = getLatestValue(measurements, "neck");
    if (!waist || !neck) return null;
    return assessBodyComposition(
      measurements as any,
      profile.weight,
      profile.height * 100,
      profileAge(profile),
      profile.biologicalSex,
    );
  }, [measurements, profile]);

  const healthRisk = useMemo(() => {
    if (!profile) return null;
    const waist = getLatestValue(measurements, "waist");
    if (!waist) return null;
    return assessHealthRisks(
      waist,
      profile.height * 100,
      profile.weight,
      profileAge(profile),
      profile.biologicalSex,
    );
  }, [measurements, profile]);

  const bodyAge = useMemo(() => {
    if (!profile || !healthRisk) return null;
    const avgScore =
      assessment.length > 0
        ? assessment.reduce((sum, a) => sum + a.score, 0) / assessment.length
        : null;
    return calculateBodyAge(
      profileAge(profile),
      healthRisk.whtr,
      healthRisk.bmi,
      measurements as any,
      avgScore,
    );
  }, [profile, healthRisk, measurements, assessment]);

  const predictions = useMemo(() => {
    const types = ["chest", "waist", "biceps", "thigh", "shoulders"];
    return types
      .map((type) => ({
        type,
        prediction: predictProgress(measurements as any, type, 30),
      }))
      .filter((p) => p.prediction !== null);
  }, [measurements]);

  const correlations = useMemo(() => {
    const types = [
      "chest",
      "waist",
      "hips",
      "biceps",
      "thigh",
      "shoulders",
      "calf",
    ];
    return findCorrelations(measurements as any, types);
  }, [measurements]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)]">
          {lang === "es" ? "Análisis Corporal" : "Body Analytics"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
          {lang === "es"
            ? "Métricas derivadas de tus mediciones"
            : "Metrics derived from your measurements"}
        </p>
      </div>

      {/* Body Age Score — Hero */}
      {bodyAge && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500/80 dark:to-indigo-600/80 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium">
                {lang === "es" ? "Tu Edad Corporal" : "Your Body Age"}
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold">{bodyAge.bodyAge}</span>
                <span className="text-indigo-200">
                  {lang === "es" ? "años" : "years"}
                </span>
              </div>
              <p className="text-indigo-200 text-sm mt-1">
                {lang === "es" ? "Edad cronológica:" : "Chronological age:"}{" "}
                {bodyAge.chronologicalAge}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-xl text-sm font-bold ${
                bodyAge.difference < 0
                  ? "bg-emerald-500"
                  : bodyAge.difference > 0
                    ? "bg-amber-500"
                    : "bg-white/20"
              }`}
            >
              {bodyAge.difference < 0
                ? `${bodyAge.difference} años`
                : bodyAge.difference > 0
                  ? `+${bodyAge.difference} años`
                  : "="}
            </div>
          </div>

          {/* Components breakdown */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {bodyAge.components.map((comp) => (
              <div key={comp.name} className="bg-white/10 rounded-lg p-2.5">
                <p className="text-xs font-medium text-indigo-100">
                  {comp.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-white/20 rounded-full">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${comp.score}%`,
                        backgroundColor:
                          comp.status === "positive"
                            ? "#34d399"
                            : comp.status === "negative"
                              ? "#fbbf24"
                              : "#94a3b8",
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">{comp.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Body Composition + Health Risk — Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Body Composition */}
        {composition && (
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent ">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">
                {lang === "es" ? "Composición Corporal" : "Body Composition"}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--color-input-bg)] rounded-xl">
                <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">
                  {lang === "es" ? "Grasa Corporal" : "Body Fat"}
                </span>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900 dark:text-[var(--color-text)]">
                    {composition.bodyFatEstimate ?? "—"}%
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-[var(--color-text-muted)]">
                    {composition.method}
                  </p>
                </div>
              </div>

              {composition.leanMass && (
                <div className="flex items-center justify-between p-3 bg-[var(--color-input-bg)] rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">
                    {lang === "es" ? "Masa Muscular" : "Lean Mass"}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-[var(--color-text)]">
                    {composition.leanMass} kg
                  </span>
                </div>
              )}

              {composition.fatMass && (
                <div className="flex items-center justify-between p-3 bg-[var(--color-input-bg)] rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">
                    {lang === "es" ? "Masa Grasa" : "Fat Mass"}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-[var(--color-text)]">
                    {composition.fatMass} kg
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    composition.confidence === "high"
                      ? "bg-emerald-500"
                      : composition.confidence === "medium"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                />
                <span className="text-[11px] text-slate-500 dark:text-[var(--color-text-muted)]">
                  {lang === "es" ? "Confianza:" : "Confidence:"}{" "}
                  {composition.confidence}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Health Risk */}
        {healthRisk && (
          <div className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent ">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">
                {lang === "es" ? "Riesgo de Salud" : "Health Risk"}
              </h3>
            </div>

            <div className="space-y-3">
              {/* WHtR */}
              <div className="p-3 bg-[var(--color-input-bg)] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">
                    WHtR
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      healthRisk.whtrStatus === "healthy"
                        ? "text-emerald-600"
                        : healthRisk.whtrStatus === "elevated"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {healthRisk.whtr}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, healthRisk.whtr * 200)}%`,
                      backgroundColor:
                        healthRisk.whtrStatus === "healthy"
                          ? "#10b981"
                          : healthRisk.whtrStatus === "elevated"
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[11px] tabular-nums text-slate-500 dark:text-[var(--color-text-muted)]">
                    0.3
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500 dark:text-[var(--color-text-muted)]">
                    0.5
                  </span>
                  <span className="text-[11px] tabular-nums text-slate-500 dark:text-[var(--color-text-muted)]">
                    0.6
                  </span>
                </div>
              </div>

              {/* BMI */}
              <div className="flex items-center justify-between p-3 bg-[var(--color-input-bg)] rounded-xl">
                <span className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)]">
                  BMI
                </span>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-900 dark:text-[var(--color-text)]">
                    {healthRisk.bmi}
                  </span>
                  <p
                    className={`text-[11px] font-medium ${
                      healthRisk.bmiCategory === "normal"
                        ? "text-emerald-600"
                        : healthRisk.bmiCategory === "overweight"
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {healthRisk.bmiCategory}
                  </p>
                </div>
              </div>

              {/* Risk factors */}
              {healthRisk.factors.length > 0 && (
                <div className="space-y-1.5">
                  {healthRisk.factors.slice(0, 2).map((factor, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-amber-700">{factor}</p>
                    </div>
                  ))}
                </div>
              )}

              {healthRisk.factors.length === 0 && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[11px] text-emerald-700">
                    {lang === "es"
                      ? "Sin factores de riesgo detectados"
                      : "No risk factors detected"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Predictions */}
      {predictions.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">
              {lang === "es"
                ? "Predicción de Progreso (30 días)"
                : "Progress Prediction (30 days)"}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border)] ">
                  <th className="text-left p-2 text-slate-500 font-medium">
                    {lang === "es" ? "Medida" : "Measurement"}
                  </th>
                  <th className="text-right p-2 text-slate-500 font-medium">
                    Actual
                  </th>
                  <th className="text-right p-2 text-slate-500 font-medium">
                    {lang === "es" ? "Predicción" : "Predicted"}
                  </th>
                  <th className="text-right p-2 text-slate-500 font-medium">
                    {lang === "es" ? "Tendencia" : "Trend"}
                  </th>
                  <th className="text-right p-2 text-slate-500 font-medium">
                    R²
                  </th>
                </tr>
              </thead>
              <tbody>
                {predictions.map(({ type, prediction }) => {
                  if (!prediction) return null;
                  const delta = prediction.predicted - prediction.current;
                  return (
                    <tr
                      key={type}
                      className="border-b border-[var(--color-border-subtle)] dark:border-[var(--color-border)] hover:bg-[var(--color-input-bg)]"
                    >
                      <td className="p-2 font-medium capitalize">{type}</td>
                      <td className="p-2 text-right tabular-nums">
                        {prediction.current} cm
                      </td>
                      <td className="p-2 text-right tabular-nums font-medium">
                        {prediction.predicted} cm
                      </td>
                      <td className="p-2 text-right">
                        <span
                          className={`font-medium ${delta > 0 ? "text-amber-600" : delta < 0 ? "text-emerald-600" : "text-slate-400"}`}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)} cm
                        </span>
                      </td>
                      <td className="p-2 text-right text-slate-500 dark:text-[var(--color-text-muted)]">
                        {prediction.confidence.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correlations */}
      {correlations.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-transparent ">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="font-semibold text-slate-900 dark:text-[var(--color-text)]">
              {lang === "es"
                ? "Correlaciones Detectadas"
                : "Detected Correlations"}
            </h3>
          </div>

          <div className="space-y-2">
            {correlations.slice(0, 5).map((corr, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-[var(--color-input-bg)] rounded-xl"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    corr.coefficient > 0.5
                      ? "bg-emerald-500"
                      : corr.coefficient > 0.3
                        ? "bg-emerald-300"
                        : corr.coefficient < -0.5
                          ? "bg-red-500"
                          : corr.coefficient < -0.3
                            ? "bg-red-300"
                            : "bg-slate-300"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-[var(--color-text)]">
                    <span className="capitalize">{corr.paramA}</span>
                    {" ↔ "}
                    <span className="capitalize">{corr.paramB}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[var(--color-text-muted)]">
                    {corr.sampleSize} {lang === "es" ? "muestras" : "samples"}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    corr.coefficient > 0.5
                      ? "text-emerald-600"
                      : corr.coefficient < -0.5
                        ? "text-red-600"
                        : "text-slate-600"
                  }`}
                >
                  {corr.coefficient > 0 ? "+" : ""}
                  {corr.coefficient.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
