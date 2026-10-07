/**
 * Ajustes — everything that is not the session.
 *
 * The mockup's sections, in its order: perfil · objetivo · equipo ·
 * entrenamiento · datos · acerca de. The panels themselves already existed
 * (`GearPanel`, `SettingsPanel`, `CoachPanel`, `SharedPanel`, `MobileCard`); what
 * was missing was a place to put them that was not "the bottom of the logging
 * screen", and that is what this file is.
 *
 * Nothing here is a stub: every control writes through the store to IndexedDB.
 *
 * @module screens/SettingsScreen
 */

import { useState } from "react";
import {
  Activity,
  Bot,
  Cloud,
  Download,
  Dumbbell,
  FileJson,
  Info,
  RotateCcw,
  Ruler,
  Settings2,
  Smartphone,
  Target,
  Upload,
  UserRound,
} from "lucide-react";
import { navigate } from "../app/router";
import { useStore } from "../app/store";
import { buildSetsCsv } from "../lib/export-csv";
import { plannerCatalog } from "../lib/plan";
import { t, tInterp } from "../lib/i18n";
import { resolveBodyMapFigure } from "../lib/settings";
import { Badge, Button, Chip, SectionCard, Switch } from "../ui/primitives";
import { GearPanel } from "../features/today/GearPanel";
import { GoalsPanel } from "../features/today/GoalsPanel";
import { SettingsPanel } from "../features/today/SettingsPanel";
import { CoachPanel, CoachResultView } from "../features/today/CoachPanel";
import { SharedPanel } from "../features/today/SharedPanel";
import { MobileCard } from "../features/today/MobileCard";

/**
 * Shown in "Acerca de". Injected at build time by `define` in `vite.config.ts`
 * from `traininglab/apps/desktop/package.json` — the very file Tauri requires to
 * match `src-tauri/tauri.conf.json`, so there is nothing left to sync by hand.
 * Declared in `src/vite-env.d.ts`.
 *
 * It used to be a hand-written constant here, and it drifted from the build.
 */
const APP_VERSION = __TRAININGLAB_VERSION__;

export default function SettingsScreen() {
  /** Result of the last restore attempt (or null). Hooks run before the guard. */
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const {
    settings,
    payload,
    model,
    sets,
    coachResult,
    coachBusy,
    health,
    syncing,
    sharedError,
    loadError,
    patch,
    handleFile,
    askCoach,
    resetModel,
    addHealthRecord,
    removeHealthRecord,
    runSharedSync,
    exportBackup,
    importBackup,
    importSymmetry,
    recoverable,
    restoreAutobackup,
    plan,
  } = useStore();

  if (!settings) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  /**
   * Which drawing the Progreso map will paint, and where that answer came from
   * — the same helper the map itself calls, so the screen and the setting can
   * never disagree.
   */
  const figure = resolveBodyMapFigure(settings, payload);

  /**
   * Download every logged set as CSV. The file is built purely by
   * `buildSetsCsv` (BOM + `;` + decimal comma) and handed to the browser as a
   * Blob — no server, no library, nothing leaves the device.
   */
  const exportCsv = () => {
    const catalog = new Map(
      plannerCatalog().map((entry) => [entry.exercise.id, entry]),
    );
    const csv = buildSetsCsv(sets, {
      unit: settings.unit,
      lookup: (id) => {
        const entry = catalog.get(id);
        if (!entry) return null;
        return {
          nameEs: entry.exercise.name.es,
          nameEn: entry.exercise.name.en,
          primaryFamily: entry.primary,
          pattern: entry.traits.pattern,
          equipment: entry.exercise.equipment.es,
        };
      },
    });
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate(),
    )}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `traininglab-sets-${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /** Local timestamp for the two download names (`YYYYMMDD-HHMM`). */
  const stampForFile = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate(),
    )}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  /** Full JSON backup: series, sessions, health, settings and the local model. */
  const downloadBackup = () => {
    const url = URL.createObjectURL(
      new Blob([exportBackup()], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `traininglab-backup-${stampForFile()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = async (file: File) => {
    const result = await importBackup(file);
    setBackupNote(result.message);
  };

  /** Symmetry history (OCR JSON from `scripts/import-symmetry.mjs`). */
  const restoreSymmetry = async (file: File) => {
    const result = await importSymmetry(file);
    setBackupNote(result.message);
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold leading-tight">
          {t("nav.settings")}
        </h1>
        <p className="text-sm text-[var(--tl-text-secondary)] mt-1">
          {t("settings.pageHint")}
        </p>
      </header>

      {/*
       * Sections are `<details>` (2026-09-30 f), in the order the plan fixes
       * (`TRAININGLAB_UI_PLAN.md` §7): perfil · objetivo · equipo · entrenar ·
       * datos · acerca de. Collapsed by default because Ajustes is a reference
       * surface — you come here to change one thing, not to read everything —
       * and open by default for the two sections a new user is here to fill in.
       *
       * The profile section is *not* a local profile editor: BodyLab owns the
       * profile (weight, measures, sex) and TrainingLab reads it from the
       * import. The one local choice is which anatomical drawing the map paints.
       */}
      <SectionCard
        title={t("settings.section.profile")}
        hint={t("settings.section.profileHint")}
        icon={<UserRound className="w-4 h-4" />}
      >
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl tl-media-wash border border-[var(--tl-border)] grid place-items-center font-bold text-[var(--tl-accent)]">
            {(payload?.profile ? "B" : "TL").slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-tight">
              {payload?.profile
                ? t("settings.profile.linked")
                : t("settings.profile.local")}
            </p>
            <p className="text-xs text-[var(--tl-text-muted)] mt-0.5">
              {payload
                ? t("settings.profile.bodylab")
                : t("settings.profile.bodylabNone")}
            </p>
          </div>
          <Badge
            tone={payload ? "success" : "neutral"}
            title={settings.sourcePath ?? t("today.noSource")}
          >
            {payload ? t("setup.loaded") : t("today.noSource")}
          </Badge>
        </div>

        {/* ── Figura anatómica del mapa 2D (Progreso) ─────────────────────── */}
        <div className="flex items-center justify-between gap-3 mt-5 mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--tl-accent)]" />
            {t("settings.figure.title")}
          </h3>
          <Badge tone="neutral">
            {figure.figure === "female"
              ? t("settings.figure.female")
              : t("settings.figure.male")}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["auto", "settings.figure.auto"],
              ["male", "settings.figure.male"],
              ["female", "settings.figure.female"],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              active={(settings.bodyMapFigure ?? "auto") === value}
              onClick={() => patch({ bodyMapFigure: value })}
            >
              {t(label)}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-[var(--tl-text-muted)] mt-3 leading-relaxed">
          {figure.from === "bodylab"
            ? t("settings.figure.fromBodyLab")
            : figure.from === "default"
              ? t("settings.figure.fallback")
              : t("settings.figure.manual")}
        </p>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => navigate("progress")}
            className="text-xs text-[var(--tl-accent)] hover:underline font-medium inline-flex items-center gap-1"
          >
            {t("nav.progress")} →
          </button>
        </div>
      </SectionCard>

      {/* ── Objetivo y preferencias ──────────────────────────────────────── */}
      <SectionCard
        title={t("settings.section.goal")}
        hint={t("settings.section.goalHint")}
        icon={<Target className="w-4 h-4" />}
      >
      <SettingsPanel
        goal={settings.goal}
        level={settings.level}
        budgetMin={settings.timeBudgetMin}
        daysPerWeek={settings.daysPerWeek}
        unit={settings.unit}
        useModel={settings.useDecisionModel}
        model={model}
        sound={settings.sound}
        notifications={settings.notifications}
        onGoal={(goal) => patch({ goal })}
        onLevel={(level) => patch({ level })}
        onBudget={(timeBudgetMin) =>
          patch({
            timeBudgetMin: Math.max(10, Math.min(240, timeBudgetMin || 30)),
          })
        }
        onDaysPerWeek={(daysPerWeek) =>
          patch({ daysPerWeek: Math.max(2, Math.min(6, daysPerWeek)) })
        }
        onUnit={(unit) => patch({ unit })}
        onToggleModel={(useDecisionModel) => patch({ useDecisionModel })}
        onResetModel={resetModel}
        onSound={(p) => patch({ sound: { ...settings.sound, ...p } })}
        onNotifications={(p) =>
          patch({ notifications: { ...settings.notifications, ...p } })
        }
      />
      </SectionCard>

      {/* ── Equipo disponible ────────────────────────────────────────────── */}
      <SectionCard
        title={t("gear.title")}
        hint={t("gear.hint")}
        icon={<Dumbbell className="w-4 h-4" />}
        defaultOpen={false}
      >
        <GearPanel
          inventory={settings.inventory}
          onChange={(inventory) => patch({ inventory })}
          available={plan?.gearNote.usable ?? 0}
          total={(plan?.gearNote.usable ?? 0) + (plan?.gearNote.excluded ?? 0)}
        />
      </SectionCard>

      {/* ── Objetivos corporales (the goal lens of the 2D map) ─────────── */}
      <SectionCard
        title={t("settings.goals.title")}
        hint={t("settings.goals.hint")}
        icon={<Ruler className="w-4 h-4" />}
        defaultOpen={false}
      >
        <GoalsPanel
          waistCm={settings.waistCm ?? null}
          targets={settings.goalTargets ?? {}}
          onWaist={(waistCm) => patch({ waistCm })}
          onTargets={(goalTargets) => patch({ goalTargets })}
        />
      </SectionCard>

      {/* ── Asistente local ──────────────────────────────────────────────── */}
      <SectionCard
        title={t("coach.title")}
        hint={t("settings.section.coachHint")}
        icon={<Bot className="w-4 h-4" />}
        defaultOpen={false}
        actions={
          <Badge tone={settings.llm.enabled ? "success" : "neutral"}>
            {settings.llm.enabled ? t("settings.lanOn") : t("coach.off")}
          </Badge>
        }
      >
        <CoachPanel
          llm={settings.llm}
          onLlmChange={(llm) => patch({ llm })}
          onAsk={askCoach}
          busy={coachBusy}
        />
        {coachResult && (
          <div className="mt-4">
            <CoachResultView result={coachResult} />
          </div>
        )}
      </SectionCard>

      {/* ── Datos: BodyLab ───────────────────────────────────────────────── */}
      <SectionCard
        title={t("setup.title")}
        hint={t("settings.section.bodylabHint")}
        icon={<FileJson className="w-4 h-4" />}
        defaultOpen={false}
        actions={
          <Badge tone={payload ? "success" : "neutral"}>
            {payload ? t("setup.loaded") : t("today.noSource")}
          </Badge>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl tl-btn-ghost text-sm cursor-pointer">
            {t("setup.chooseFile")}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
          {payload?.profile && (
            <span className="text-xs text-[var(--tl-text-muted)]">
              {payload.profile.height} cm · {payload.profile.weight ?? "—"} kg ·{" "}
              {payload.profile.age ?? "—"} a
            </span>
          )}
          {payload?.conditioning?.conditioningScore != null && (
            <Badge
              tone={
                payload.conditioning.conditioningScore < 60
                  ? "warning"
                  : "success"
              }
            >
              conditioning {payload.conditioning.conditioningScore}/100
            </Badge>
          )}
          {!payload && (
            <span className="text-xs text-[var(--tl-text-muted)]">
              {plannerCatalog().length} {t("settings.catalogNote")}
            </span>
          )}
          {loadError && (
            <span className="text-xs text-[var(--tl-danger)]">{loadError}</span>
          )}
        </div>
        <p className="text-xs text-[var(--tl-text-muted)] mt-3">
          {t("settings.importHint")}
        </p>
        {/* closes the BodyLab section below */}
      </SectionCard>

      {/* ── Mis datos: CSV (Excel + LLM) y copia completa (restaurar) ─────── */}
      <SectionCard
        title={t("data.title")}
        hint={t("backup.hint")}
        icon={<Download className="w-4 h-4" />}
        defaultOpen={false}
        actions={
          <Badge tone="neutral">
            {tInterp("data.setsCount", { n: sets.length })}
          </Badge>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <span data-testid="export-csv">
            <Button size="sm" onClick={exportCsv}>
              {t("data.exportCsv")}
            </Button>
          </span>
          <span className="text-xs text-[var(--tl-text-muted)] max-w-md">
            {t("data.exportHint")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-[var(--tl-border)]">
          <span data-testid="export-backup">
            <Button size="sm" variant="ghost" onClick={downloadBackup}>
              <Download className="w-3.5 h-3.5" />
              {t("backup.export")}
            </Button>
          </span>
          <label
            data-testid="restore-backup"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl tl-btn-ghost text-xs font-semibold cursor-pointer tl-focusable"
          >
            <Upload className="w-3.5 h-3.5" />
            {t("backup.restore")}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restoreBackup(f);
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-xs text-[var(--tl-text-muted)] max-w-md">
            {t("backup.hint")}
          </span>
        </div>
        {/* Recovery: the log is empty but an automatic snapshot has data. The
            profile that holds IndexedDB was reset behind our back; this is the
            copy that was being written outside it all along. */}
        {recoverable && (
          <div
            data-testid="autobackup-recover"
            className="mt-4 p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40"
          >
            <p className="text-sm font-semibold">{t("autobackup.restore.title")}</p>
            <p className="text-xs text-[var(--tl-text-muted)] mt-1 max-w-lg">
              {tInterp("autobackup.restore.body", {
                date: new Date(recoverable.exportedAt).toLocaleString(),
                sets: recoverable.sets,
                sessions: recoverable.sessions,
              })}
            </p>
            <Button size="sm" variant="primary" className="mt-3" onClick={() => void restoreAutobackup()}>
              <Download className="w-3.5 h-3.5" />
              {t("autobackup.restore.action")}
            </Button>
          </div>
        )}
        <p className="text-xs text-[var(--tl-text-muted)] mt-3 max-w-lg">
          {t("autobackup.where")}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-[var(--tl-border)]">
          <label
            data-testid="import-symmetry"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl tl-btn-ghost text-xs font-semibold cursor-pointer tl-focusable"
          >
            <Upload className="w-3.5 h-3.5" />
            {t("symmetry.import")}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restoreSymmetry(f);
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-xs text-[var(--tl-text-muted)] max-w-md">
            {t("symmetry.hint")}
          </span>
        </div>
        {backupNote && (
          <p
            role="status"
            className="mt-3 text-xs flex items-center gap-1.5 text-[var(--tl-text-secondary)]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[var(--tl-accent)]" />
            {backupNote}
          </p>
        )}
      </SectionCard>

      {/* ── Red de casa ──────────────────────────────────────────────────── */}
      <SectionCard
        title={t("shared.title")}
        hint={t("settings.lanSwitchHint")}
        icon={<Cloud className="w-4 h-4" />}
        defaultOpen={false}
        actions={
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={settings.shared.enabled}
              onChange={(enabled) =>
                patch({ shared: { ...settings.shared, enabled } })
              }
              label={t("settings.lanSwitch")}
            />
          </span>
        }
      >
        <SharedPanel
          settings={settings.shared}
          health={health}
          syncing={syncing}
          lastError={sharedError}
          onSettings={(p) => patch({ shared: { ...settings.shared, ...p } })}
          onAddHealth={addHealthRecord}
          onRemoveHealth={removeHealthRecord}
          onSyncNow={() => void runSharedSync({ report: true })}
        />
      </SectionCard>

      {/* ── Móvil ────────────────────────────────────────────────────────── */}
      <SectionCard
        title={t("mobile.title")}
        icon={<Smartphone className="w-4 h-4" />}
        defaultOpen={false}
      >
        <MobileCard />
      </SectionCard>

      {/* ── Acerca de ────────────────────────────────────────────────────── */}
      <SectionCard
        title={t("settings.section.about")}
        icon={<Settings2 className="w-4 h-4" />}
        defaultOpen={false}
      >
        <div className="flex items-start gap-3">
          <div className="text-sm">
            <p className="font-semibold">
              TrainingLab <span className="tabular-nums">v{APP_VERSION}</span>
            </p>
            <p className="text-xs text-[var(--tl-text-muted)] mt-1">
              {t("settings.about.privacy")}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={() => navigate("exercises")}>
                {t("nav.exercises")}
              </Button>
              <Button size="sm" onClick={() => navigate("week")}>
                {t("nav.week")}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <p className="text-[11px] text-[var(--tl-text-muted)] text-center flex items-center justify-center gap-1.5">
        <Info size={12} />
        {t("settings.about.offline")}
      </p>
    </div>
  );
}
