/**
 * Entrenamiento — the session, rendered by ZEN.
 *
 * ZEN used to be an overlay boolean inside the monolith, which meant the session
 * had no address: you could not link to it, reload into it or hand it to a
 * screenshot script. It is a route now (`#/sesion`) and this file is the only
 * place that knows how to build its inputs from the store.
 *
 * **2026-10-14 (mockup 03 port).** The screen draws its own top bar and content
 * (`mockup/03-sesion.html`), so `app/App` renders it *without* the transitional
 * `.content` wrapper the not-yet-ported screens still need. What stays an overlay,
 * deliberately, is the **rest timer** (in `app/store`): a rest that stops when you
 * tap another destination would be a bug, not a feature. Inside the session the
 * same rest is drawn in its own card, from the same deadline — the store hides the
 * floating overlay here so there is never a second countdown to compare.
 *
 * @module screens/SessionScreen
 */

import { navigate, HASH } from "../app/router";
import { useStore } from "../app/store";
import { localDayKey, todayKey } from "../lib/day";
import { suggestLoadFor } from "../lib/plan";
import { repRangeFor } from "../lib/settings";
import { t } from "../lib/i18n";
import { MIcons } from "../ui/mockup-icons";
import { ZenSession } from "../features/today/ZenSession";

/** lb → kg factor; the log is always kg, the screen shows the chosen unit. */
const LB_PER_KG = 2.2046226218488;

export default function SessionScreen() {
  const {
    settings,
    loading,
    rows,
    sets,
    todaySets,
    readiness,
    prFor,
    progressionFor,
    swapOptionsFor,
    swapRow,
    skippedToday,
    postponedToday,
    skipRow,
    unskipRow,
    postponeRow,
    unpostponeRow,
    rest,
    extendRest,
    toggleRestPause,
    skipRest,
    addSet,
    finishSession,
    setRepRange,
    moveRow,
    resetRowOrder,
    orderIsCustom,
  } = useStore();

  if (loading || !settings) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  if (rows.length === 0) {
    return (
      <>
        <header className="topbar">
          <span className="card-title">
            <MIcons.target />
            {t("zen.title")}
          </span>
          <div className="spacer" />
          <a className="btn" href={HASH.today}>
            <MIcons.chevronLeft />
            {t("nav.today")}
          </a>
        </header>
        <div className="content">
          <section
            className="card card-pad"
            style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}
          >
            <MIcons.sparkles
              style={{ margin: "0 auto 10px", width: 28, height: 28 }}
            />
            <h2 className="card-title" style={{ justifyContent: "center" }}>
              {t("session.none")}
            </h2>
            <p className="tiny muted" style={{ marginTop: 6 }}>
              {t("session.noneHint")}
            </p>
            <button
              type="button"
              onClick={() => navigate("today")}
              className="btn btn-primary btn-lg tl-focusable"
              style={{ marginTop: 14 }}
            >
              {t("phase.goToday")}
            </button>
          </section>
        </div>
      </>
    );
  }

  return (
    <ZenSession
      rows={rows}
      unit={settings.unit}
      loggedToday={(exerciseId) =>
        todaySets.filter((set) => set.exerciseId === exerciseId)
      }
      previousSetsFor={(exerciseId) => {
        const today = todayKey();
        return sets
          .filter(
            (set) =>
              set.exerciseId === exerciseId &&
              localDayKey(set.timestamp) !== today &&
              !set.warmup,
          )
          .slice(-10);
      }}
      progressionFor={progressionFor}
      suggestionFor={(exerciseId) => {
        const row = rows.find((r) => r.exerciseId === exerciseId);
        if (!row || row.cardioMin !== undefined) return null;
        const history = sets.filter(
          (s) => s.exerciseId === exerciseId && !s.warmup,
        );
        // The whole suggestion, not just the number: ZEN shows the reason in
        // *Progresión recomendada* (mockup 03) and the warm-up ramp only reads
        // `weight`.
        return suggestLoadFor({
          loadType: row.loadType,
          repsMin: row.repsMin,
          repsMax: row.repsMax,
          history: history.map((s) => ({ weight: s.weight, reps: s.reps })),
          pr: prFor(exerciseId),
          inventory: settings.inventory,
          readiness,
        });
      }}
      onLogSet={(row, weightUnit, reps, opts) => {
        // ZEN edits weights in the display unit; the log is always kg.
        const kg =
          weightUnit === null
            ? null
            : settings.unit === "lb"
              ? weightUnit / LB_PER_KG
              : weightUnit;
        addSet(row, kg, reps, opts);
      }}
      onFinish={() => {
        finishSession();
        navigate("today");
      }}
      onExit={() => navigate("today")}
      repRangeFor={(exerciseId) => {
        const row = rows.find((r) => r.exerciseId === exerciseId);
        if (!row || !settings) {
          return {
            min: row?.repsMin ?? 8,
            max: row?.repsMax ?? 12,
            custom: false,
          };
        }
        return repRangeFor(settings, row);
      }}
      onRepRange={(exerciseId, range) => setRepRange(exerciseId, range)}
      onMoveRow={moveRow}
      onResetOrder={resetRowOrder}
      orderCustom={orderIsCustom}
      swapOptionsFor={swapOptionsFor}
      onSwap={swapRow}
      skippedToday={skippedToday}
      postponedToday={postponedToday}
      onSkip={skipRow}
      onUnskip={unskipRow}
      onPostpone={postponeRow}
      onUnpostpone={unpostponeRow}
      rest={rest}
      onExtendRest={extendRest}
      onToggleRestPause={toggleRestPause}
      onSkipRest={skipRest}
    />
  );
}
