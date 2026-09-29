import { useState, useRef, useMemo } from 'react';
import { Upload, FileJson, FileText, CheckCircle, AlertCircle, Package, Clock, RotateCcw, Shield, HardDrive, Database, Dumbbell } from 'lucide-react';
import JSZip from 'jszip';
import { useApp } from '../lib/store';
import * as db from '../lib/db';
import { downloadTraininglabExport } from '../lib/traininglab-export';
import type { Profile, Measurement, BodySnapshot } from '../lib/types';

/**
 * Data Vault — Your data stays on this device.
 *
 * .bodylab format: ZIP archive containing structured JSON files:
 *   manifest.json     — format metadata + schema version
 *   profile.json      — user profile
 *   measurements.json — all measurements
 *   snapshots.json    — body snapshots
 *   metadata.json     — export metadata
 *
 * Import supports: .bodylab (ZIP), .json (legacy), .csv
 */

/**
 * Reject structurally invalid backup payloads before they reach the store.
 *
 * Adversarial finding (2026-09-11): a `.bodylab` with a valid manifest but
 * non-array/corrupt payloads previously crashed the app with unhandled
 * "items is not iterable" errors and IndexedDB key-path failures. Import is a
 * trust boundary — validate the shape, then fail closed with a controlled error.
 */
function assertImportShape(profile: unknown, measurements: unknown, snapshots: unknown): void {
  const isRecordArray = (v: unknown): boolean =>
    Array.isArray(v) &&
    v.every(r => r !== null && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string');
  const validProfile = profile === null || (typeof profile === 'object' && profile !== null);
  if (!validProfile || !isRecordArray(measurements) || !isRecordArray(snapshots)) {
    throw new Error('Invalid backup payload: expected a profile object and id-keyed arrays');
  }
}

export default function ExportImport() {
  const { state, importData } = useApp();
  const lang = state.language;
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [backupTime, setBackupTime] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => ({
    measurements: state.measurements.length,
    snapshots: state.snapshots.length,
    profiles: state.profile ? 1 : 0,
  }), [state.measurements, state.snapshots, state.profile]);

  // ── Export .bodylab as real ZIP ──────────────────────────────────────────

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const allData = await db.exportAllData();
      const zip = new JSZip();

      // manifest.json
      zip.file('manifest.json', JSON.stringify({
        format: 'bodylab',
        formatVersion: 1,
        appVersion: '1.0.0',
        schemaVersion: allData.meta?.schemaVersion ?? 1,
        createdAt: new Date().toISOString(),
        contains: ['profile', 'measurements', 'snapshots', 'metadata'],
      }, null, 2));

      // profile.json
      if (allData.profile) {
        zip.file('profile.json', JSON.stringify(allData.profile, null, 2));
      }

      // measurements.json
      zip.file('measurements.json', JSON.stringify(allData.measurements, null, 2));

      // snapshots.json
      zip.file('snapshots.json', JSON.stringify(allData.snapshots, null, 2));

      // metadata.json
      zip.file('metadata.json', JSON.stringify({
        sources: ['bodylab-v1.0'],
        totalMeasurements: allData.measurements.length,
        totalSnapshots: allData.snapshots.length,
        hasProfile: !!allData.profile,
        exportedBy: 'BodyLab Web',
      }, null, 2));

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      downloadBlob(blob, `bodylab-backup-${new Date().toISOString().split('T')[0]}.bodylab`);
      setBackupTime(new Date().toLocaleTimeString());
    } finally {
      setIsExporting(false);
    }
  };

  // ── Export JSON (legacy format) ─────────────────────────────────────────

  const handleExportJSON = () => {
    const data = {
      format: 'bodylab',
      formatVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        profile: state.profile,
        measurements: state.measurements,
        snapshots: state.snapshots,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `bodylab-${new Date().toISOString().split('T')[0]}.json`);
  };

  // ── Export CSV ──────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const headers = ['Type', 'Value', 'Unit', 'Timestamp', 'Method', 'Confidence'];
    const rows = state.measurements.map(m => [
      m.type, String(m.value), m.unit, m.timestamp, m.method, m.confidence,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `bodylab-measurements-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ── Import ──────────────────────────────────────────────────────────────

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.name.endsWith('.bodylab')) {
        // ZIP import
        const zip = await JSZip.loadAsync(file);

        const manifestStr = await zip.file('manifest.json')?.async('string');
        const profileStr = await zip.file('profile.json')?.async('string');
        const measurementsStr = await zip.file('measurements.json')?.async('string');
        const snapshotsStr = await zip.file('snapshots.json')?.async('string');

        if (!manifestStr) throw new Error('Invalid .bodylab file: missing manifest.json');

        const manifest = JSON.parse(manifestStr);
        if (manifest.format !== 'bodylab') throw new Error('Not a BodyLab backup');

        const parsedProfile = profileStr ? JSON.parse(profileStr) : null;
        const parsedMeasurements = measurementsStr ? JSON.parse(measurementsStr) : [];
        const parsedSnapshots = snapshotsStr ? JSON.parse(snapshotsStr) : [];
        assertImportShape(parsedProfile, parsedMeasurements, parsedSnapshots);

        importData({
          profile: parsedProfile,
          measurements: parsedMeasurements,
          snapshots: parsedSnapshots,
        });

        setImportStatus('success');
        setImportMessage(
          lang === 'es'
            ? `Backup importado — schema v${manifest.schemaVersion}`
            : `Backup imported — schema v${manifest.schemaVersion}`
        );
      } else {
        // JSON/CSV fallback (legacy)
        const content = await file.text();
        const data = JSON.parse(content);

        let importedProfile: Profile | null = null;
        let importedMeasurements: Measurement[] = [];
        let importedSnapshots: BodySnapshot[] = [];

        if (data.format === 'bodylab-backup' && data.manifest) {
          importedProfile = data.profile ?? null;
          importedMeasurements = data.measurements ?? [];
          importedSnapshots = data.snapshots ?? [];
        } else if (data.format === 'bodylab' && data.data) {
          importedProfile = data.data.profile ?? null;
          importedMeasurements = data.data.measurements ?? [];
          importedSnapshots = data.data.snapshots ?? [];
        } else {
          setImportStatus('error');
          setImportMessage(
            lang === 'es' ? 'Formato no válido.' : 'Invalid file format.'
          );
          return;
        }

        assertImportShape(importedProfile, importedMeasurements, importedSnapshots);
        importData({ profile: importedProfile, measurements: importedMeasurements, snapshots: importedSnapshots });
        setImportStatus('success');
        setImportMessage(
          lang === 'es' ? 'Datos importados correctamente.' : 'Data imported successfully.'
        );
      }
    } catch {
      setImportStatus('error');
      setImportMessage(
        lang === 'es' ? 'Error al leer el archivo.' : 'Failed to read file.'
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetOnboarding = () => {
    if (!confirmReset) {
      // Destructive actions always confirm first (§98.1 rule 3): explain what will happen.
      setConfirmReset(true);
      return;
    }
    localStorage.removeItem('bodylab-onboarding-done');
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold tracking-tight text-slate-900 dark:text-[var(--color-text)]">
          {lang === 'es' ? 'Datos' : 'Data'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mt-1">
          {lang === 'es' ? 'Tus datos permanecen en este dispositivo.' : 'Your data stays on this device.'}
        </p>
      </div>

      {/* Data Safety Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {lang === 'es' ? 'Tus datos son tuyos' : 'Your data is yours'}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            {lang === 'es'
              ? 'BodyLab almacena todo localmente. No hay servidores, no hay cuentas, no hay rastreo.'
              : 'BodyLab stores everything locally. No servers, no accounts, no tracking.'}
          </p>
        </div>
      </div>

      {/* Data Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-card)] p-4 text-center">
          <Database className="w-5 h-5 text-slate-400 mx-auto mb-2" />
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{stats.measurements}</p>
          <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{lang === 'es' ? 'medidas' : 'measurements'}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-card)] p-4 text-center">
          <Clock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{stats.snapshots}</p>
          <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">snapshots</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-card)] p-4 text-center">
          <HardDrive className="w-5 h-5 text-slate-400 mx-auto mb-2" />
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[var(--color-text)]">{stats.profiles}</p>
          <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{lang === 'es' ? 'perfil' : 'profile'}</p>
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)]">
              {lang === 'es' ? 'Backup' : 'Backup'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
              {backupTime
                ? `${lang === 'es' ? 'Último backup' : 'Last backup'}: ${backupTime}`
                : (lang === 'es' ? 'Sin backups aún' : 'No backups yet')}
            </p>
          </div>
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {isExporting
                ? (lang === 'es' ? 'Exportando…' : 'Exporting…')
                : (lang === 'es' ? 'Exportar backup (.bodylab)' : 'Export backup (.bodylab)')}
            </span>
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)]">
          .bodylab = ZIP archive with manifest.json, profile.json, measurements.json, snapshots.json
        </p>
      </div>

      {/* Export Section */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-card)] p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)] mb-1">
          {lang === 'es' ? 'Exportar' : 'Export'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mb-4">
          {lang === 'es' ? 'Formatos alternativos' : 'Alternative formats'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => downloadTraininglabExport({ profile: state.profile, measurements: state.measurements, assessment: state.assessment, whtrResult: state.whtrResult, adonisResult: state.adonisResult, exerciseSets: state.exerciseSets, maxEfforts: state.maxEfforts })}
            className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-sunken)] transition-colors text-left col-span-2"
          >
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
              <Dumbbell className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-[var(--color-text)]">
                {lang === 'es' ? 'TrainingLab Link (JSON)' : 'TrainingLab Link (JSON)'}
              </p>
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">
                {lang === 'es'
                  ? 'Medidas + scores musculares + volumen de entrenamiento + PRs + catálogo de 64 ejercicios — el paquete que la app de planificación (IA local) necesita para crear rutinas.'
                  : 'Measurements + muscle scores + training volume + PRs + 64-exercise catalog — the bundle the (local-AI) planning app needs to build routines.'}
              </p>
            </div>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-sunken)] transition-colors text-left"
          >
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
              <FileJson className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-[var(--color-text)]">JSON</p>
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{lang === 'es' ? 'Datos estructurados' : 'Structured data'}</p>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-sunken)] transition-colors text-left"
          >
            <div className="p-2 bg-slate-100 dark:bg-[var(--color-chip-bg)] rounded-lg">
              <FileText className="w-5 h-5 text-slate-600 dark:text-[var(--color-chip-text)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-[var(--color-text)]">CSV</p>
              <p className="text-xs text-slate-500 dark:text-[var(--color-text-muted)]">{lang === 'es' ? 'Para hojas de cálculo' : 'For spreadsheets'}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-card)] p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[var(--color-text)] mb-1">
          {lang === 'es' ? 'Importar' : 'Import'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mb-4">
          {lang === 'es' ? 'Restaura desde un backup de BodyLab' : 'Restore from a BodyLab backup'}
        </p>

        <div className="border-2 border-dashed border-[var(--color-border)] dark:border-[var(--color-border)] rounded-xl p-8 text-center hover:border-[var(--color-primary)]/50 transition-colors">
          <Upload className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600 dark:text-[var(--color-text-secondary)] mb-1">
            {lang === 'es' ? 'Arrastra un archivo o haz clic para seleccionar' : 'Drag a file or click to select'}
          </p>
          <p className="text-xs text-slate-400 dark:text-[var(--color-text-muted)] mb-3">.bodylab · .json · .csv</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[var(--color-chip-bg)] text-slate-700 dark:text-[var(--color-chip-text)] rounded-lg text-sm font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-[var(--color-surface-elevated)] transition-colors">
            <Upload className="w-4 h-4" />
            {lang === 'es' ? 'Seleccionar archivo' : 'Select file'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.bodylab"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {importStatus !== 'idle' && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
            importStatus === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 border border-emerald-200'
              : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20 border border-red-200'
          }`}>
            {importStatus === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {importMessage}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-red-200 dark:border-red-900/30 p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-1">
          {lang === 'es' ? 'Zona de peligro' : 'Danger zone'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mb-4">
          {lang === 'es' ? 'Estas acciones son irreversibles.' : 'These actions are irreversible.'}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleResetOnboarding}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
              confirmReset
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {confirmReset
              ? (lang === 'es' ? 'Confirmar reinicio' : 'Confirm reset')
              : (lang === 'es' ? 'Resetear onboarding' : 'Reset onboarding')}
          </button>
          {confirmReset && (
            <>
              <span className="text-xs text-red-600 dark:text-red-400">
                {lang === 'es'
                  ? 'Se abrirá el asistente de bienvenida. Tus medidas no se borran.'
                  : 'The welcome wizard will reopen. Your measurements are not deleted.'}
              </span>
              <button
                onClick={() => setConfirmReset(false)}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-[var(--color-text-muted)] dark:hover:text-[var(--color-text)] underline underline-offset-2"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
