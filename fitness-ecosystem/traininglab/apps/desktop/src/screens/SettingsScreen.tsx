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

import {
  Bot,
  Cloud,
  FileJson,
  Info,
  Settings2,
  Smartphone,
} from "lucide-react";
import { navigate } from "../app/router";
import { useStore } from "../app/store";
import { plannerCatalog } from "../lib/plan";
import { t } from "../lib/i18n";
import { Badge, Button, Card, Switch } from "../ui/primitives";
import { GearPanel } from "../features/today/GearPanel";
import { GoalsPanel } from "../features/today/GoalsPanel";
import { SettingsPanel } from "../features/today/SettingsPanel";
import { CoachPanel, CoachResultView } from "../features/today/CoachPanel";
import { SharedPanel } from "../features/today/SharedPanel";
import { MobileCard } from "../features/today/MobileCard";

/**
 * Shown in "Acerca de". Kept in sync by hand with `src-tauri/tauri.conf.json`:
 * it is a display string, and reading it from the shell would mean a build-time
 * dependency for one line of text.
 */
const APP_VERSION = "0.2.0";

export default function SettingsScreen() {
  const {
    settings,
    payload,
    model,
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
    plan,
  } = useStore();

  if (!settings) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

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

      {/* ── Perfil ───────────────────────────────────────────────────────── */}
      <Card>
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
      </Card>

      {/* ── Objetivo y preferencias ──────────────────────────────────────── */}
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

      {/* ── Equipo disponible ────────────────────────────────────────────── */}
      <GearPanel
        inventory={settings.inventory}
        onChange={(inventory) => patch({ inventory })}
        available={plan?.gearNote.usable ?? 0}
        total={(plan?.gearNote.usable ?? 0) + (plan?.gearNote.excluded ?? 0)}
      />

      {/* ── Objetivos corporales (the goal lens of the 2D map) ─────────── */}
      <GoalsPanel
        waistCm={settings.waistCm ?? null}
        targets={settings.goalTargets ?? {}}
        onWaist={(waistCm) => patch({ waistCm })}
        onTargets={(goalTargets) => patch({ goalTargets })}
      />

      {/* ── Asistente local ──────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Bot className="w-4 h-4 text-[var(--tl-accent)]" />
            {t("coach.title")}
          </h2>
          <Badge tone={settings.llm.enabled ? "success" : "neutral"}>
            {settings.llm.enabled ? t("settings.lanOn") : t("coach.off")}
          </Badge>
        </div>
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
      </Card>

      {/* ── Datos: BodyLab ───────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FileJson className="w-4 h-4 text-[var(--tl-accent)]" />
            {t("setup.title")}
          </h2>
          <Badge tone={payload ? "success" : "neutral"}>
            {payload ? t("setup.loaded") : t("today.noSource")}
          </Badge>
        </div>
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
      </Card>

      {/* ── Red de casa ──────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[var(--tl-accent)]" />
            {t("shared.title")}
          </h2>
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={settings.shared.enabled}
              onChange={(enabled) =>
                patch({ shared: { ...settings.shared, enabled } })
              }
              label={t("settings.lanSwitch")}
            />
          </span>
        </div>
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
      </Card>

      {/* ── Móvil ────────────────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-[var(--tl-accent)]" />
          {t("mobile.title")}
        </h2>
        <MobileCard />
      </Card>

      {/* ── Acerca de ────────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start gap-3">
          <Settings2 className="w-4 h-4 text-[var(--tl-text-muted)] mt-0.5" />
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
              <Button size="sm" onClick={() => navigate("today")}>
                {t("phase.goToday")}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <p className="text-[11px] text-[var(--tl-text-muted)] text-center flex items-center justify-center gap-1.5">
        <Info size={12} />
        {t("settings.about.offline")}
      </p>
    </div>
  );
}
