/**
 * "Tus cifras" — the four lifetime totals, in Progreso.
 *
 * Moved here from Inicio on 2026-09-30 (f) with the same reasoning as the
 * constancy ring: totals are what you check occasionally, not what you check
 * before a session. The *shape* is unchanged from the owner's sketch (a 2 × 2
 * grid of accent circles); the content was already honest — four figures that
 * come straight from the log, no invented score, no level, no badge.
 *
 * BodyLab's merged records are counted but never claimed as ours: the line says
 * where they came from.
 *
 * @module features/stats/NumbersCard
 */

import { CalendarDays, Dumbbell, Flame, Layers } from "lucide-react";
import { useStore } from "../../app/store";
import { t, tInterp } from "../../lib/i18n";
import { trainingDays, workingSets } from "./derive";

export function NumbersCard() {
  const { sets, sessions, payload } = useStore();
  const working = workingSets(sets);
  const distinct = new Set(working.map((s) => s.exerciseId)).size;
  const records = payload?.personalRecords?.length ?? 0;

  const tiles = [
    {
      icon: <Flame className="w-5 h-5" />,
      value: String(sessions.length),
      label: t("progress.numbers.sessions"),
    },
    {
      icon: <Dumbbell className="w-5 h-5" />,
      value: String(working.length),
      label: t("progress.numbers.sets"),
    },
    {
      icon: <Layers className="w-5 h-5" />,
      value: String(distinct),
      label: t("progress.numbers.exercises"),
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      value: String(trainingDays(sets)),
      label: t("progress.numbers.days"),
    },
  ];

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("progress.numbers.title")}</h2>
      </div>
      <div className="tl-card-body">
        <div className="tl-badges">
          {tiles.map((tile) => (
            <div key={tile.label} className="tl-badge-tile">
              <div className="tl-badge-icon">{tile.icon}</div>
              <div className="tl-badge-title tabular-nums">{tile.value}</div>
              <div className="tl-badge-desc">{tile.label}</div>
            </div>
          ))}
        </div>
        {records > 0 && (
          <p className="text-[11px] text-[var(--tl-text-muted)] mt-3">
            {tInterp("progress.numbers.records", { n: records })}
          </p>
        )}
      </div>
    </section>
  );
}
