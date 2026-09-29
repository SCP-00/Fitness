/**
 * Plan preferences — goal, level, today's time budget and the local decision
 * model controls.
 *
 * @module features/today/SettingsPanel
 */

import { useEffect, useState } from "react";
import {
  BellRing,
  BellDot,
  Gauge,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";
import { getLanguage } from "../../lib/i18n";
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  type NotifyPermission,
} from "../../lib/notifications";
import type { TlNotificationSettings } from "../../lib/types";
import type { DecisionModel } from "@fitness/bodylab-training";
import { t, tInterp } from "../../lib/i18n";
import {
  CUE_KINDS,
  CUE_LABELS,
  audioSupported,
  playCue,
  unlockAudio,
  type CueKind,
} from "../../lib/sounds";
import type { TlGoal, TlLevel, TlSoundSettings } from "../../lib/types";
import { SectionCard, Badge } from "./ui";

const GOALS: TlGoal[] = ["hypertrophy", "strength", "recomposition"];
const LEVELS: TlLevel[] = ["beginner", "intermediate", "advanced"];
const BUDGETS = [30, 45, 60, 90];

export function SettingsPanel({
  goal,
  level,
  budgetMin,
  daysPerWeek,
  unit,
  useModel,
  model,
  sound,
  notifications,
  onGoal,
  onLevel,
  onBudget,
  onDaysPerWeek,
  onUnit,
  onToggleModel,
  onResetModel,
  onSound,
  onNotifications,
}: {
  goal: TlGoal;
  level: TlLevel;
  budgetMin: number;
  daysPerWeek: number;
  unit: "kg" | "lb";
  useModel: boolean;
  model: DecisionModel;
  sound: TlSoundSettings;
  notifications: TlNotificationSettings;
  onGoal: (g: TlGoal) => void;
  onLevel: (l: TlLevel) => void;
  onBudget: (n: number) => void;
  onDaysPerWeek: (n: number) => void;
  onUnit: (u: "kg" | "lb") => void;
  onToggleModel: (v: boolean) => void;
  onResetModel: () => void;
  onSound: (patch: Partial<TlSoundSettings>) => void;
  onNotifications: (patch: Partial<TlNotificationSettings>) => void;
}) {
  /**
   * The preview button is the one place a cue is played *before* the app has
   * had a gesture to unlock audio from — so it unlocks first and reports back
   * instead of silently doing nothing.
   */
  const [blocked, setBlocked] = useState(false);
  const [busyCue, setBusyCue] = useState<CueKind | null>(null);

  const preview = async (cue: CueKind) => {
    setBusyCue(cue);
    const running = await unlockAudio();
    setBlocked(!running);
    if (running) playCue(cue);
    setBusyCue(null);
  };

  const lang = getLanguage();

  // ── Notification permission ──────────────────────────────────────────────
  // Read once on mount (permission cannot change without this component asking)
  // and refreshed after every explicit request.
  const supported = notificationsSupported();
  const [permission, setPermission] = useState<NotifyPermission>(() =>
    notificationPermission(),
  );
  useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  const askPermission = async () => {
    setPermission(await requestNotificationPermission());
  };

  return (
    <SectionCard
      title={t("setup.preferences")}
      hint={t("settings.modelHint")}
      icon={<SlidersHorizontal className="w-4 h-4" />}
      defaultOpen={false}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2">
            {t("setup.goal")}
          </p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => onGoal(g)}
                className={`px-3 py-1.5 rounded-xl text-xs border tl-focusable ${
                  goal === g
                    ? "tl-chip border-transparent"
                    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                }`}
              >
                {t(`goal.${g}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2">
            {t("setup.level")}
          </p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => onLevel(l)}
                className={`px-3 py-1.5 rounded-xl text-xs border tl-focusable ${
                  level === l
                    ? "tl-chip border-transparent"
                    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                }`}
              >
                {t(`level.${l}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2">
            {t("setup.budget")}
          </p>
          <div className="flex items-center gap-2">
            {BUDGETS.map((b) => (
              <button
                key={b}
                onClick={() => onBudget(b)}
                className={`px-3 py-1.5 rounded-xl text-xs border tabular-nums tl-focusable ${
                  budgetMin === b
                    ? "tl-chip border-transparent"
                    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                }`}
              >
                {b}′
              </button>
            ))}
            <input
              type="number"
              min={10}
              max={240}
              value={budgetMin}
              onChange={(e) => onBudget(Number(e.target.value))}
              className="tl-input w-20 px-2 py-1.5 text-xs tabular-nums"
              aria-label={t("setup.budget")}
            />
          </div>
        </div>

        {/* Training days per week → drives the weekly plan */}
        <div>
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2">
            {t("settings.daysPerWeek")}
          </p>
          <div className="flex items-center gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => onDaysPerWeek(n)}
                aria-pressed={daysPerWeek === n}
                className={`w-11 py-2 rounded-xl text-xs border tabular-nums tl-focusable ${
                  daysPerWeek === n
                    ? "tl-chip border-transparent"
                    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--tl-text-muted)] mt-1">
            {t("settings.daysPerWeekHint")}
          </p>
        </div>

        {/* Weight unit — exact conversion, storage stays kg */}
        <div>
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2">
            {t("settings.unit")}
          </p>
          <div className="flex items-center gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => onUnit(u)}
                aria-pressed={unit === u}
                className={`px-5 py-2 rounded-xl text-xs border font-semibold tl-focusable ${
                  unit === u
                    ? "tl-chip border-transparent"
                    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)]"
                }`}
              >
                {u === "kg" ? "kg" : "lb (USA)"}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--tl-text-muted)] mt-1">
            {t("settings.unitHint")}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" />
            {t("settings.model")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={useModel}
                onChange={(e) => onToggleModel(e.target.checked)}
                className="accent-[var(--tl-accent)]"
              />
              <Badge tone={useModel ? "accent" : "neutral"}>
                {tInterp("settings.modelUpdates", { n: model.updates })}
              </Badge>
            </label>
            <button
              onClick={onResetModel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg tl-btn-ghost text-[11px]"
            >
              <RefreshCw className="w-3 h-3" />
              {t("settings.modelReset")}
            </button>
          </div>
        </div>

        {/* Sound cues — off-switch, volume and a per-cue preview so the user
            knows what they are enabling before a workout plays it. */}
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2 flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5" />
            {t("settings.sounds")}
          </p>
          <p className="text-[11px] text-[var(--tl-text-muted)] mb-3">
            {t("settings.soundsHint")}
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={sound.enabled}
                onChange={(e) => onSound({ enabled: e.target.checked })}
                className="accent-[var(--tl-accent)]"
              />
              {t("settings.soundsToggle")}
            </label>

            <label className="flex items-center gap-2 text-xs">
              <Volume2 className="w-3.5 h-3.5" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sound.volume}
                onChange={(e) => onSound({ volume: Number(e.target.value) })}
                className="w-28 accent-[var(--tl-accent)]"
                aria-label={t("settings.soundsVolume")}
              />
              <span className="tabular-nums text-[var(--tl-text-muted)] w-8">
                {Math.round(sound.volume * 100)}%
              </span>
            </label>
          </div>

          {audioSupported() ? (
            <>
              <div className="flex flex-wrap gap-2 mt-3">
                {CUE_KINDS.map((cue: CueKind) => (
                  <button
                    key={cue}
                    onClick={() => void preview(cue)}
                    disabled={!sound.enabled || busyCue !== null}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg tl-btn-ghost text-[11px] disabled:opacity-40"
                  >
                    {busyCue === cue ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <BellRing className="w-3 h-3" />
                    )}
                    {CUE_LABELS[cue][lang]}
                  </button>
                ))}
              </div>
              {blocked && (
                <p className="text-[11px] text-amber-400 mt-2">
                  {t("settings.soundsBlocked")}
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-amber-400 mt-2">
              {t("settings.soundsUnsupported")}
            </p>
          )}
        </div>

        {/* Notifications — the rest timer reaching zero while the tab is in the
            background. Permission is requested from a real click, never on load. */}
        <div className="sm:col-span-2">
          <p className="text-xs font-medium text-[var(--tl-text-secondary)] mb-2 flex items-center gap-1.5">
            <BellDot className="w-3.5 h-3.5" />
            {t("settings.notifications")}
          </p>
          <p className="text-[11px] text-[var(--tl-text-muted)] mb-3">
            {t("settings.notificationsHint")}
          </p>

          {!supported ? (
            <p className="text-[11px] text-amber-400">
              {t("settings.notificationsUnsupported")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={notifications.enabled}
                  onChange={(e) =>
                    onNotifications({ enabled: e.target.checked })
                  }
                  className="accent-[var(--tl-accent)]"
                />
                {t("settings.notificationsToggle")}
              </label>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={notifications.alsoWhenVisible}
                  onChange={(e) =>
                    onNotifications({ alsoWhenVisible: e.target.checked })
                  }
                  className="accent-[var(--tl-accent)]"
                />
                {t("settings.notificationsAlways")}
              </label>

              {permission === "granted" ? (
                <Badge tone="accent">
                  {t("settings.notificationsGranted")}
                </Badge>
              ) : permission === "denied" ? (
                <span className="text-[11px] text-amber-400">
                  {t("settings.notificationsDenied")}
                </span>
              ) : (
                <button
                  onClick={() => void askPermission()}
                  className="px-2.5 py-1.5 rounded-lg tl-btn-ghost text-[11px]"
                >
                  {t("settings.notificationsAsk")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
