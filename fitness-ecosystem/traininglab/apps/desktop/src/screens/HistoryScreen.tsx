/**
 * Historial — what has already been trained, newest first.
 *
 * The third destination of the mockup's rail and the first one that never
 * existed in the old front: it opens the record the log has been building since
 * the first imported Symmetry session. What it shows is exactly what the owner's
 * own log supports — and nothing else:
 *
 *   * one card per **closed** session (see `closedSessionHistory` for the rule
 *     and why today's open session is not here);
 *   * date, name when the source gave one, provenance and place;
 *   * working sets, warm-up sets, exercises and volume (`weight × reps` over
 *     working sets — warm-ups never inflate it);
 *   * the session's effort marks (`D` near failure, `F` to failure, `W` for the
 *     ramp), because they are how the owner reads his own hard days;
 *   * a **duration only when a source supports it**. An imported date-only sheet
 *     leaves `durationMin: null` and the tile simply does not render, which is
 *     the whole point of the `MINUTES_TRUSTWORTHY` rule in `derive.ts`.
 *
 * Reading order and numbers come from the same function the MCP's `read_history`
 * mirrors, so the screen and an agent cannot disagree about what a session was.
 *
 * @module screens/HistoryScreen
 */

import { useMemo, useState } from "react";
import { Clock, Layers, Trophy } from "lucide-react";
import { t, tInterp, getLanguage } from "../lib/i18n";
import { EFFORT_MARKERS, EFFORT_MEANING } from "../lib/effort";
import { exerciseName } from "../lib/plan";
import { Badge, Chip, EmptyState, SectionCard } from "../ui/primitives";
import { useStore } from "../app/store";
import {
  closedSessionHistory,
  type SessionHistoryEntry,
} from "../features/stats/derive";

export default function HistoryScreen() {
  const { sessions, sets, loading } = useStore();
  const lang = getLanguage();

  const { entries, total } = useMemo(
    () => closedSessionHistory(sessions, sets),
    [sessions, sets],
  );

  if (loading) return <div className="tl-loading">{t("common.loading")}</div>;

  const totalSets = entries.reduce((sum, e) => sum + e.workingSets, 0);
  const totalVolume = entries.reduce((sum, e) => sum + e.volumeKg, 0);
  const shown = entries.length;

  return (
    <div className="tl-page">
      <header className="tl-topbar">
        <div className="tl-welcome">
          <h1>{t("nav.history")}</h1>
          <p>
            {total === 0
              ? t("hist.pageHintEmpty")
              : tInterp("hist.pageHint", { n: total })}
          </p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="tl-pill" title={t("hist.pillSetsHint")}>
              <Layers className="w-3.5 h-3.5" aria-hidden />
              {tInterp("hist.pillSets", { n: totalSets })}
            </span>
            <span className="tl-pill" title={t("hist.pillVolumeHint")}>
              <Trophy className="w-3.5 h-3.5" aria-hidden />
              {tInterp("hist.pillVolume", { kg: formatKg(totalVolume, lang) })}
            </span>
          </div>
        )}
      </header>

      {total === 0 ? (
        <EmptyState
          icon={<Clock size={28} />}
          title={t("hist.empty")}
          body={t("hist.emptyHint")}
        />
      ) : (
        <>
          <SectionCard
            title={t("hist.listTitle")}
            hint={
              shown < total
                ? tInterp("hist.listHintCapped", { shown, total })
                : t("hist.listHint")
            }
            icon={<Clock size={18} />}
          >
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {entries.map((entry) => (
                <SessionCard key={entry.id} entry={entry} lang={lang} />
              ))}
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  );
}

/** One closed session: the day, what it was, and what it cost. */
function SessionCard({
  entry,
  lang,
}: {
  entry: SessionHistoryEntry;
  lang: "es" | "en";
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? entry.exercises : entry.exercises.slice(0, 4);
  const hidden = entry.exercises.length - shown.length;

  return (
    <li className="tl-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{formatDay(entry.date, lang)}</span>
            {entry.title && (
              <span className="text-[var(--tl-text-secondary)] truncate">
                {entry.title}
              </span>
            )}
            {entry.location && (
              <Badge tone="neutral">{t(`hist.place.${entry.location}`)}</Badge>
            )}
            {entry.source && entry.source !== "traininglab" && (
              <Badge tone="info" title={t("hist.sourceHint")}>
                {entry.source}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--tl-text-muted)] mt-1">
            <span>
              {tInterp("hist.sets", { n: entry.workingSets })}
              {entry.warmupSets > 0 &&
                ` · ${tInterp("hist.warmup", { n: entry.warmupSets })}`}
            </span>
            <span>
              {tInterp("hist.exercises", { n: entry.exercises.length })}
            </span>
            {entry.volumeKg > 0 && (
              <span>
                {tInterp("hist.volume", { kg: formatKg(entry.volumeKg, lang) })}
              </span>
            )}
            {/* No trustworthy duration → no tile. A made-up "1 min" is worse
                than an empty spot. */}
            {entry.durationMin !== null && (
              <span>{tInterp("hist.duration", { n: entry.durationMin })}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {EFFORT_MARKERS.filter((mark) => entry.markers[mark] > 0).map(
            (mark) => (
              <Badge
                key={mark}
                tone={mark === "F" ? "danger" : "warning"}
                title={`${EFFORT_MEANING[mark].label[lang]} · ${EFFORT_MEANING[mark].detail[lang]}`}
              >
                {mark} · {entry.markers[mark]}
              </Badge>
            ),
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        {shown.map((line) => (
          <Chip key={line.exerciseId}>
            {exerciseName(line.exerciseId, lang)} ×{line.sets}
          </Chip>
        ))}
        {entry.exercises.length > 4 && (
          <button
            type="button"
            className="tl-focusable text-[11px] text-[var(--tl-text-muted)] underline decoration-dotted"
            onClick={() => setOpen((value) => !value)}
          >
            {open
              ? t("hist.showLess")
              : tInterp("hist.moreExercises", { n: hidden })}
          </button>
        )}
      </div>
    </li>
  );
}

/** `mié, 7 oct 2026` — the day as the owner reads it, never a UTC slice. */
function formatDay(date: string, lang: "es" | "en"): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    lang === "es" ? "es-ES" : "en-GB",
    { weekday: "short", day: "numeric", month: "short", year: "numeric" },
  );
}

/** Tonnage with the user's thousands separator (`149 107 kg` in Spanish). */
function formatKg(kg: number, lang: "es" | "en"): string {
  return `${Math.round(kg).toLocaleString(lang === "es" ? "es-ES" : "en-GB")} kg`;
}
