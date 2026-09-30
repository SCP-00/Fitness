/**
 * Entrenamiento — the session, rendered by ZEN.
 *
 * ZEN used to be an overlay boolean inside the monolith, which meant the session
 * had no address: you could not link to it, reload into it or hand it to a
 * screenshot script. It is a route now (`#/sesion`), and this file is the only
 * place that knows how to build its inputs from the store.
 *
 * What stays an overlay, deliberately, is the **rest timer** (in `app/store`):
 * a rest that stops when you tap another destination would be a bug, not a
 * feature.
 *
 * @module screens/SessionScreen
 */

import { navigate } from "../app/router";
import { useStore } from "../app/store";
import { suggestLoadFor } from "../lib/plan";
import { repRangeFor } from "../lib/settings";
import { t } from "../lib/i18n";
import { Button, EmptyState } from "../ui/primitives";
import { IconMoon } from "../ui/icons";
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
    addSet,
    finishSession,
    setRepRange,
  } = useStore();

  if (loading || !settings) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <EmptyState
          icon={<IconMoon size={28} />}
          title={t("session.none")}
          body={t("session.noneHint")}
          action={
            <Button variant="primary" onClick={() => navigate("today")}>
              {t("phase.goToday")}
            </Button>
          }
        />
      </div>
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
        const today = new Date().toISOString().slice(0, 10);
        return sets
          .filter(
            (set) =>
              set.exerciseId === exerciseId &&
              set.timestamp.slice(0, 10) !== today &&
              !set.warmup,
          )
          .slice(-10);
      }}
      suggestionFor={(exerciseId) => {
        const row = rows.find((r) => r.exerciseId === exerciseId);
        if (!row || row.cardioMin !== undefined) return null;
        const history = sets.filter(
          (s) => s.exerciseId === exerciseId && !s.warmup,
        );
        return suggestLoadFor({
          loadType: row.loadType,
          repsMin: row.repsMin,
          repsMax: row.repsMax,
          history: history.map((s) => ({ weight: s.weight, reps: s.reps })),
          pr: prFor(exerciseId),
          inventory: settings.inventory,
          readiness,
        }).weight;
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
    />
  );
}
