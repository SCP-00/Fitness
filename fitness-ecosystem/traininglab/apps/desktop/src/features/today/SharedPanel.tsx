/**
 * Shared household history — the settings block for the optional LAN store.
 *
 * Three jobs, in the order the user meets them:
 *   1. **Connect** — point at the server and claim a name (the "soft login").
 *   2. **Family** — who trained in the last seven days, so the store justifies
 *      its existence at a glance instead of being an abstract switch.
 *   3. **Health records** — the handful of measurements a household actually
 *      writes down (resting heart rate, weight, sleep, blood pressure, mood).
 *
 * Two honesty requirements shape the copy here:
 *   * the panel must say, in plain words, that this is **not private** — anyone
 *     on the Wi-Fi can read and write the shared rows; and
 *   * the app must be fully usable with the switch off, so nothing is presented
 *     as a prerequisite. It is an extra, and it reads like one.
 *
 * @module features/today/SharedPanel
 */

import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  CloudOff,
  HeartPulse,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { t, tInterp, getLanguage } from "../../lib/i18n";
import { parseNumberInput } from "../../lib/parse-num";
import {
  HEALTH_KINDS,
  SharedError,
  claimMember,
  defaultSharedBaseUrl,
  fetchFamily,
  normalizeBaseUrl,
  pingShared,
  sharedStatus,
  type FamilyRow,
  type HealthRecord,
  type SharedSettings,
} from "../../lib/shared";
import { SectionCard, Badge } from "./ui";

/** Kinds are shown in the user's language; ids stay stable for the database. */
const KIND_LABELS: Record<string, { en: string; es: string }> = {
  resting_heart_rate: { en: "Resting HR", es: "FC en reposo" },
  body_weight: { en: "Weight", es: "Peso" },
  sleep_hours: { en: "Sleep", es: "Sueño" },
  systolic: { en: "Systolic BP", es: "Presión sistólica" },
  diastolic: { en: "Diastolic BP", es: "Presión diastólica" },
  mood: { en: "Mood", es: "Ánimo" },
};

const STATUS_TONE = {
  off: "neutral",
  unconfigured: "warning",
  "never-synced": "warning",
  ok: "success",
  stale: "warning",
  error: "danger",
} as const;

export function SharedPanel({
  settings,
  health,
  onSettings,
  onAddHealth,
  onRemoveHealth,
  onSyncNow,
  syncing,
  lastError,
}: {
  settings: SharedSettings;
  health: HealthRecord[];
  onSettings: (patch: Partial<SharedSettings>) => void;
  onAddHealth: (record: HealthRecord) => void;
  onRemoveHealth: (id: string) => void;
  onSyncNow: () => void;
  syncing: boolean;
  lastError: string | null;
}) {
  const lang = getLanguage();
  const status = sharedStatus(settings);

  // Local (uncommitted) form state: nothing is written to settings until the
  // user actually connects, so a half-typed URL never becomes the live one.
  const [name, setName] = useState(settings.memberName);
  const [url, setUrl] = useState(settings.baseUrl || defaultSharedBaseUrl());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [family, setFamily] = useState<FamilyRow[] | null>(null);

  const [kind, setKind] = useState<string>(HEALTH_KINDS[0].id);
  const [value, setValue] = useState("");

  const loadFamily = useCallback(async () => {
    const base = normalizeBaseUrl(settings.baseUrl);
    if (!settings.enabled || !base) return;
    try {
      setFamily(await fetchFamily(base));
    } catch {
      setFamily(null);
    }
  }, [settings.enabled, settings.baseUrl]);

  useEffect(() => {
    void loadFamily();
  }, [loadFamily, settings.lastSyncAt]);

  /** The soft login: verify the server answers, then claim the name. */
  const connect = async () => {
    setFormError(null);
    const base = normalizeBaseUrl(url);
    if (!base) {
      setFormError(t("shared.badUrl"));
      return;
    }
    if (name.trim().length === 0) {
      setFormError(t("shared.needName"));
      return;
    }
    setBusy(true);
    try {
      await pingShared(base);
      const member = await claimMember(base, name.trim(), settings.memberId);
      onSettings({
        enabled: true,
        baseUrl: base,
        memberId: member.id,
        memberName: member.name,
      });
      setName(member.name);
    } catch (error) {
      setFormError(
        error instanceof SharedError && error.status === null
          ? t("shared.unreachable")
          : t("shared.serverError"),
      );
    } finally {
      setBusy(false);
    }
  };

  const submitHealth = () => {
    const parsed = parseNumberInput(value);
    if (parsed === null) return;
    const spec = HEALTH_KINDS.find((k) => k.id === kind);
    onAddHealth({
      id: crypto.randomUUID(),
      kind,
      value: parsed,
      unit: spec?.unit ?? null,
      timestamp: new Date().toISOString(),
    });
    setValue("");
  };

  const recent = [...health].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6);

  return (
    <SectionCard
      title={t("shared.title")}
      hint={t("shared.hint")}
      icon={<Cloud className="w-4 h-4" />}
      defaultOpen={false}
      actions={
        <Badge tone={STATUS_TONE[status]}>
          {status === "ok" ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
          {t(`shared.status.${status}`)}
        </Badge>
      }
    >
      <div className="space-y-5">
        {/* ── Connect ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-[var(--tl-text-secondary)] mb-1.5">
              {t("shared.server")}
            </label>
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.7:8090"
              className="tl-input w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--tl-text-secondary)] mb-1.5">
              {t("shared.yourName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === "es" ? "Tu nombre" : "Your name"}
              className="tl-input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void connect()}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl tl-btn-primary text-sm disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {settings.memberId ? t("shared.reconnect") : t("shared.connect")}
          </button>

          {settings.memberId && (
            <>
              <button
                onClick={onSyncNow}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl tl-btn-ghost text-xs disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {t("shared.syncNow")}
              </button>
              <button
                onClick={() => onSettings({ enabled: false })}
                className="px-3 py-2 rounded-xl tl-btn-ghost text-xs"
              >
                {t("shared.disconnect")}
              </button>
            </>
          )}
        </div>

        {(formError || lastError) && (
          <p className="text-[11px] text-red-400">{formError ?? lastError}</p>
        )}

        <p className="text-[11px] text-[var(--tl-text-muted)] flex items-start gap-1.5">
          <CloudOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {t("shared.notPrivate")}
        </p>

        {settings.lastSyncAt && (
          <p className="text-[11px] text-[var(--tl-text-muted)]">
            {tInterp("shared.lastSync", {
              when: new Date(settings.lastSyncAt).toLocaleString(
                getLanguage() === "es" ? "es-ES" : "en-GB",
              ),
            })}
          </p>
        )}

        {/* ── Family ──────────────────────────────────────────────────────── */}
        {family && family.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mb-2">
              <Users className="w-3.5 h-3.5" />
              {t("shared.family")}
            </p>
            <ul className="space-y-1">
              {family.map((row) => (
                <li
                  key={row.id}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                    row.id === settings.memberId
                      ? "bg-[var(--tl-accent)]/10"
                      : "bg-[var(--tl-surface-2)]"
                  }`}
                >
                  <span className="font-medium truncate">{row.name}</span>
                  <span className="text-[11px] text-[var(--tl-text-muted)] text-right tabular-nums shrink-0">
                    {tInterp("shared.familyWeek", {
                      sets: row.setsLast7d,
                      vol: row.volumeLast7d,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Health records ──────────────────────────────────────────────── */}
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mb-2">
            <HeartPulse className="w-3.5 h-3.5" />
            {t("shared.health")}
          </p>
          <p className="text-[11px] text-[var(--tl-text-muted)] mb-3">{t("shared.healthHint")}</p>

          <div className="flex flex-wrap items-end gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="tl-input px-3 py-2 text-sm"
              aria-label={t("shared.health")}
            >
              {HEALTH_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {(KIND_LABELS[k.id] ?? { en: k.id, es: k.id })[lang]}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitHealth();
                }
              }}
              placeholder="—"
              aria-label={t("shared.healthValue")}
              className="tl-input w-20 px-3 py-2 text-sm tabular-nums"
            />
            <span className="text-xs text-[var(--tl-text-muted)] tabular-nums">
              {HEALTH_KINDS.find((k) => k.id === kind)?.unit ?? ""}
            </span>
            <button
              onClick={submitHealth}
              className="flex items-center gap-1 px-3 py-2 rounded-xl tl-btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              {t("log.add")}
            </button>
          </div>

          {recent.length > 0 && (
            <ul className="mt-3 space-y-1">
              {recent.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-3 text-sm bg-[var(--tl-surface-2)] rounded-lg px-3 py-1.5"
                >
                  <span className="text-[var(--tl-text-secondary)] truncate">
                    {(KIND_LABELS[record.kind] ?? { en: record.kind, es: record.kind })[lang]}
                  </span>
                  <span className="font-medium tabular-nums">
                    {record.value} {record.unit ?? ""}
                  </span>
                  <span className="text-[11px] text-[var(--tl-text-muted)] tabular-nums">
                    {record.timestamp.slice(0, 10)}
                  </span>
                  <button
                    onClick={() => onRemoveHealth(record.id)}
                    className="p-1 text-[var(--tl-border-strong)] hover:text-red-400 rounded tl-focusable"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {health.length > 0 && (
            <p className="text-[11px] text-[var(--tl-text-muted)] mt-2">
              {tInterp("shared.healthLocal", { n: health.length })}
              {settings.enabled && settings.memberId
                ? ` · ${t("shared.healthSynced")}`
                : ""}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
