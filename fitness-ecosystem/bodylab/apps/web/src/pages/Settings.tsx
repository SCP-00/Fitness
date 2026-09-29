import { useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Save,
  Check,
  Globe,
  Ruler,
  RefreshCw,
  ArrowDownToLine,
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
import { useApp } from "../lib/store";
import { t } from "../i18n";
import { parseNumberInput } from "../lib/parse-num";
import {
  heightToDisplay,
  heightToCanonical,
  weightToDisplay,
  weightToCanonical,
  profileUnitFor,
} from "../lib/units";
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  type UpdateState,
} from "../lib/updater";
import { ageFromBirthDate, daysUntilBirthday } from "../lib/age";
import MobileTestingCard from "../components/MobileTestingCard";

export default function Settings() {
  const { state, dispatch } = useApp();
  const [saved, setSaved] = useState(false);

  // ── Software updates (desktop only, opt-in, never automatic) ──────────────
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: "idle",
  });

  /** Today in `YYYY-MM-DD`, the format `<input type="date">` compares against. */
  const todayIso = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const handleCheckUpdates = async () => {
    await checkForUpdate(setUpdateState);
    setTimeout(() => setUpdateState({ status: "idle" }), 4000);
  };

  const handleInstallUpdate = async () => {
    await downloadAndInstallUpdate(setUpdateState);
    setTimeout(() => setUpdateState({ status: "idle" }), 4000);
  };

  // Rendered from state.profile every mount; the birth date is the stored
  // value and the age below it is purely derived (see lib/age.ts).
  const [formData, setFormData] = useState({
    name: state.profile?.name ?? "",
    birthDate: state.profile?.birthDate ?? "",
    // Height/weight hold DISPLAY values; conversion back to canonical
    // metric happens in handleSave (BL-MEAS-005).
    height: state.profile
      ? String(heightToDisplay(state.profile.height, state.profile.units))
      : "",
    weight: state.profile
      ? String(weightToDisplay(state.profile.weight, state.profile.units))
      : "",
    biologicalSex: state.profile?.biologicalSex ?? "male",
    units: state.profile?.units ?? "metric",
  });

  /** Units is a live setting: it applies AND persists immediately (BL-MEAS-005). */
  const setUnits = (units: "metric" | "imperial") => {
    setFormData((prev) => ({ ...prev, units }));
    dispatch({ type: "SET_UNITS", payload: units });
  };

  /** Normalise the picker's value: empty string means "not recorded". */
  const birthDate = formData.birthDate.trim() || null;
  const derivedAge = ageFromBirthDate(birthDate);
  const daysToBirthday = daysUntilBirthday(birthDate);

  /**
   * One line under the picker: what the derived age means, or a countdown when
   * a birthday is close (a small nudge that the field is actually alive).
   */
  const ageHint =
    derivedAge === null
      ? t("settings.birthDateHint")
      : daysToBirthday === 0
        ? t("settings.birthdayToday")
        : daysToBirthday !== null && daysToBirthday <= 30
          ? state.language === "es"
            ? `Cumpleaños en ${daysToBirthday} días`
            : `Birthday in ${daysToBirthday} days`
          : t("settings.ageDerivedHint");

  const handleSave = () => {
    if (state.profile) {
      dispatch({
        type: "UPDATE_PROFILE",
        payload: {
          name: formData.name,
          birthDate,
          height: heightToCanonical(
            parseNumberInput(formData.height) ?? 0,
            formData.units,
          ),
          weight: weightToCanonical(
            parseNumberInput(formData.weight) ?? 0,
            formData.units,
          ),
          biologicalSex: formData.biologicalSex,
          units: formData.units,
        },
      });
    } else {
      dispatch({
        type: "CREATE_PROFILE",
        payload: {
          id: crypto.randomUUID(),
          name: formData.name,
          birthDate,
          // Defaults (1.75 m / 70 kg) are canonical metric — pre-convert them to
          // display units so the canonical round-trip lands on the same value.
          height: heightToCanonical(
            parseNumberInput(formData.height) ??
              heightToDisplay(1.75, formData.units),
            formData.units,
          ),
          weight: weightToCanonical(
            parseNumberInput(formData.weight) ??
              weightToDisplay(70, formData.units),
            formData.units,
          ),
          biologicalSex: formData.biologicalSex,
          units: formData.units,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl leading-8 sm:text-[28px] sm:leading-9 font-bold text-slate-900 dark:text-[var(--color-text)]">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold">{t("settings.profile")}</h2>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("settings.name")}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={state.language === "es" ? "Tu nombre" : "Your name"}
              className="w-full px-4 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Birth date — the stored fact. Age is shown next to it, derived. */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("settings.birthDate")}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={formData.birthDate}
                max={todayIso()}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
                className="flex-1 min-w-0 px-4 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <div className="shrink-0 text-right">
                <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-[var(--color-text)]">
                  {derivedAge ?? "—"}
                </div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-[var(--color-text-muted)]">
                  {t("settings.years")}
                </div>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-[var(--color-text-muted)]">
              {ageHint}
            </p>
          </div>

          {/* Biological Sex */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("settings.sex")}
            </label>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setFormData({ ...formData, biologicalSex: "male" })
                }
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  formData.biologicalSex === "male"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary-hover)]"
                    : "border-[var(--color-border)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
                }`}
              >
                {t("settings.male")}
              </button>
              <button
                onClick={() =>
                  setFormData({ ...formData, biologicalSex: "female" })
                }
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  formData.biologicalSex === "female"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary-hover)]"
                    : "border-[var(--color-border)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
                }`}
              >
                {t("settings.female")}
              </button>
            </div>
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("settings.height")} (
                {profileUnitFor("height", formData.units)})
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
                placeholder="1.75"
                step="0.01"
                min="1"
                max="2.5"
                className="w-full px-4 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("settings.weight")} (
                {profileUnitFor("weight", formData.units)})
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
                placeholder="70"
                step="0.1"
                min="30"
                max="250"
                className="w-full px-4 py-2.5 border border-[var(--color-input-border)] bg-[var(--color-input-bg)] text-[var(--color-input-text)] rounded-xl text-sm placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Save profile — secondary tier: Settings is configuration, no dominant action (§99.1) */}
        <button
          onClick={handleSave}
          className={`mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
            saved
              ? "bg-[var(--color-success)] text-white"
              : "border border-[var(--color-border)] text-slate-700 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
          }`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" />
              {t("settings.saved")}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t("settings.saveProfile")}
            </>
          )}
        </button>
      </div>

      {/* Language — neutral active state */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold">{t("settings.language")}</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch({ type: "SET_LANGUAGE", payload: "en" })}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
              state.language === "en"
                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary-hover)]"
                : "border-[var(--color-border)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
            }`}
          >
            🇺🇸 English
          </button>
          <button
            onClick={() => dispatch({ type: "SET_LANGUAGE", payload: "es" })}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
              state.language === "es"
                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary-hover)]"
                : "border-[var(--color-border)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
            }`}
          >
            🇪🇸 Español
          </button>
        </div>
      </div>

      {/* Units — neutral active state */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
        <div className="flex items-center gap-3 mb-4">
          <Ruler className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold">{t("settings.units")}</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mb-4">
          {t("settings.unitsHint")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setUnits("metric")}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
              formData.units === "metric"
                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary-hover)]"
                : "border-[var(--color-border)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
            }`}
          >
            📏 {t("settings.metric")}
          </button>
          <button
            onClick={() => setUnits("imperial")}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
              formData.units === "imperial"
                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary-hover)]"
                : "border-[var(--color-border)] text-slate-600 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]"
            }`}
          >
            📐 {t("settings.imperial")}
          </button>
        </div>
      </div>

      {/* Software updates — desktop only, opt-in, never automatic (§privacy) */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border-card)] dark:border-transparent">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold">{t("settings.updates")}</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)] mb-4">
          {t("settings.updatesHint")}
        </p>
        {updateState.status === "available" ||
        updateState.status === "downloading" ||
        updateState.status === "installing" ? (
          <button
            onClick={handleInstallUpdate}
            disabled={updateState.status !== "available"}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              updateState.status === "available"
                ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                : "bg-[var(--color-surface-sunken)] text-slate-500 dark:text-[var(--color-text-muted)] cursor-wait"
            }`}
          >
            {updateState.status === "available" && (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                {t("settings.updatesInstall")} {updateState.version}
              </>
            )}
            {updateState.status === "downloading" && (
              <>
                <ArrowDownToLine className="w-4 h-4 animate-bounce" />
                {t("settings.updatesDownloading")}
                {typeof updateState.progress === "number" &&
                  ` ${Math.round(updateState.progress * 100)}%`}
              </>
            )}
            {updateState.status === "installing" &&
              t("settings.updatesInstalling")}
          </button>
        ) : (
          <button
            onClick={handleCheckUpdates}
            disabled={updateState.status === "checking"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-[var(--color-border)] text-slate-700 dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] transition-all disabled:opacity-60"
          >
            <RefreshCw
              className={`w-4 h-4 ${updateState.status === "checking" ? "animate-spin" : ""}`}
            />
            {updateState.status === "checking"
              ? t("settings.updatesChecking")
              : updateState.status === "up-to-date"
                ? t("settings.updatesUpToDate")
                : updateState.status === "error"
                  ? t("settings.updatesRetry")
                  : t("settings.updatesCheck")}
          </button>
        )}
        {updateState.status === "error" && updateState.error && (
          <p className="mt-3 text-xs text-[var(--color-danger)] dark:text-[var(--color-danger)] flex items-start gap-1.5">
            <CircleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {updateState.error}
          </p>
        )}
      </div>

      {/* Open the app on a phone over the local network */}
      <MobileTestingCard />

      {/* Reference redirect */}
      <div className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-transparent">
        <p className="text-sm text-slate-500 dark:text-[var(--color-text-muted)]">
          {state.language === "es"
            ? "Gestiona tus perfiles de referencia en"
            : "Manage reference profiles in"}{" "}
          {/* A router <Link>, not <a href>: the app is hash-routed (and can be
              served from a subpath), so an absolute href would leave the SPA. */}
          <Link
            to="/references"
            className="text-[var(--color-primary)] dark:text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium"
          >
            {state.language === "es" ? "Referencia" : "Reference"}
          </Link>
        </p>
      </div>
    </div>
  );
}
