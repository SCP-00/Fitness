import { useMemo, useState } from "react";
import { coachWeeklySummary } from "../../lib/coach-weekly-summary";
import { localDayKey } from "../../lib/day";
import { getLanguage, t } from "../../lib/i18n";
import type { TLSession, TLSet } from "../../lib/types";
import { MIcons } from "../../ui/mockup-icons";

export function WeeklyHistoryCard({
  sets,
  sessions,
}: {
  sets: readonly TLSet[];
  sessions: readonly TLSession[];
}) {
  const [weeksBack, setWeeksBack] = useState(0);
  const monday = new Date();
  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7) - weeksBack * 7,
  );
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const from = localDayKey(monday);
  const to = localDayKey(sunday);
  const summary = useMemo(
    () => coachWeeklySummary({ sets, sessions, from, to }),
    [sets, sessions, from, to],
  );
  const dateLabel = new Intl.DateTimeFormat(getLanguage(), {
    dateStyle: "medium",
  });

  return (
    <section className="card" aria-labelledby="weekly-history-title">
      <div className="card-head row-wrap">
        <h2 id="weekly-history-title">{t("week.history.title")}</h2>
        <div className="row-wrap">
          <button
            type="button"
            className="btn tl-focusable min-w-11 min-h-11"
            aria-label={t("week.history.previous")}
            title={t("week.history.previous")}
            onClick={() => setWeeksBack((value) => value + 1)}
          >
            <MIcons.chevronLeft aria-hidden />
          </button>
          <button
            type="button"
            className="btn tl-focusable min-w-11 min-h-11"
            aria-label={t("week.history.next")}
            title={t("week.history.next")}
            disabled={weeksBack === 0}
            onClick={() => setWeeksBack((value) => Math.max(0, value - 1))}
          >
            <MIcons.chevronRight aria-hidden />
          </button>
        </div>
      </div>
      <div className="card-body">
        <div aria-live="polite" aria-atomic="true">
          <p className="small muted mb-2">
            {dateLabel.formatRange(monday, sunday)}
          </p>
          <dl className="row-wrap gap-6">
            <div>
              <dt className="small muted">{t("week.history.sessions")}</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {summary.closedSessions}
              </dd>
            </div>
            <div>
              <dt className="small muted">{t("week.history.sets")}</dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {summary.workingSets}
              </dd>
            </div>
          </dl>
        </div>
        <p className="small muted mt-2">{t("week.history.hint")}</p>
      </div>
    </section>
  );
}
