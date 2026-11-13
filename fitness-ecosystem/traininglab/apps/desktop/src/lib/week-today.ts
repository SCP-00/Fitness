import type { PlannedRow, WeekPlan } from "./plan";

/**
 * Make the current day in Semana say the same thing as Hoy.
 *
 * The weekly generator and today's planner are two different engines (the week
 * spreads training days; today reacts to the current readiness, gear, log and
 * focus). That produced a visible contradiction: on a generated rest day Hoy
 * offered a session while Semana labelled the same day "Descanso".
 *
 * Today is the day the user is about to train, so its row is authoritative for
 * the current day. The rest of the week stays generated. This is a display
 * projection, not a second plan: Semana's today row, totals and stress read
 * from the rows the user actually sees in Hoy.
 */
export function alignWeekToToday(
  weekPlan: WeekPlan,
  rows: readonly PlannedRow[],
  lang: "en" | "es",
): WeekPlan {
  const todayIndex = weekPlan.rows.findIndex((row) => row.isToday);
  if (todayIndex < 0) return weekPlan;

  const assigned = [...new Set(rows.flatMap((row) => row.families))];
  const sets = rows.reduce((total, row) => total + row.sets, 0);
  const minutes = rows.reduce((total, row) => total + row.minutes, 0);
  const todayRow = {
    ...weekPlan.rows[todayIndex]!,
    isRest: rows.length === 0,
    assigned,
    sets,
    minutes,
    // The current day is the one day the owner compares across surfaces, so it
    // lists every exercise in the real order — not the three-item teaser the
    // other six days use. A truncated list here was a visible second answer.
    preview: rows.map((row) => row.name[lang]),
  };
  const nextRows = weekPlan.rows.map((row, index) =>
    index === todayIndex ? todayRow : row,
  );

  return {
    ...weekPlan,
    rows: nextRows,
    totalSets: nextRows.reduce((total, row) => total + row.sets, 0),
    totalMinutes: nextRows.reduce((total, row) => total + row.minutes, 0),
  };
}
