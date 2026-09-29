/**
 * This week — the horizontalised plan, one row per day.
 *
 * Design contract: read-mostly (the week changes when life changes, not when
 * a set is logged), so the card is collapsed by default on a phone; every row
 * is a ≥44 pt tap target; today's row is unmistakable (accent border) because
 * "what about today?" is the question this card answers next to the session.
 *
 * @module features/today/WeekCard
 */

import { CalendarDays, RefreshCw } from "lucide-react";
import { t, tInterp } from "../../lib/i18n";
import type { WeekPlan } from "../../lib/plan";
import { SectionCard, Badge } from "./ui";

const familyKey = (f: string): string => f; // families render as-is (EN slugs)

export function WeekCard({
  weekPlan,
  onRegenerate,
}: {
  weekPlan: WeekPlan;
  onRegenerate: () => void;
}) {
  const trainingDays = weekPlan.rows.filter((r) => !r.isRest).length;
  return (
    <SectionCard
      title={t("week.title")}
      hint={tInterp("week.hint", { n: trainingDays })}
      icon={<CalendarDays className="w-4 h-4" />}
      defaultOpen={false}
      actions={
        <Badge tone="neutral">
          {tInterp("week.summary", {
            sets: weekPlan.totalSets,
            min: weekPlan.totalMinutes,
          })}
        </Badge>
      }
    >
      <div className="flex flex-col gap-2">
        {weekPlan.rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center gap-3 rounded-xl border px-3 min-h-[2.75rem] py-2 ${
              row.isToday
                ? "border-[var(--tl-accent)] bg-[var(--tl-accent-wash)]"
                : "border-[var(--tl-border)] bg-[var(--tl-surface-2)]"
            }`}
          >
            <span
              className={`w-12 shrink-0 text-sm font-bold tabular-nums ${
                row.isToday ? "text-[var(--tl-accent)]" : "text-[var(--tl-text-secondary)]"
              }`}
            >
              {row.label}
            </span>
            {row.isRest ? (
              <span className="text-sm text-[var(--tl-text-muted)]">
                {t("week.rest")}
              </span>
            ) : (
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap gap-1">
                  {row.assigned.map((fam) => (
                    <span
                      key={familyKey(fam)}
                      className="tl-chip text-[11px]"
                    >
                      {familyKey(fam)}
                    </span>
                  ))}
                </span>
                <span className="block text-[11px] text-[var(--tl-text-muted)] truncate">
                  {row.preview.join(" · ")}
                </span>
              </span>
            )}
            <span className="shrink-0 text-right">
              {row.isToday && (
                <span className="block text-[11px] font-semibold text-[var(--tl-accent)]">
                  {t("week.today")}
                </span>
              )}
              {!row.isRest && (
                <span className="block text-[11px] text-[var(--tl-text-muted)] tabular-nums">
                  {tInterp("week.sets", { n: row.sets })} · {row.minutes}′
                </span>
              )}
            </span>
          </div>
        ))}

        {weekPlan.uncovered.length > 0 && (
          <p className="text-[11px] text-[var(--tl-text-muted)] px-1">
            {tInterp("week.uncovered", {
              fams: weekPlan.uncovered.map((u) => u.family).join(", "),
            })}
          </p>
        )}

        <button
          onClick={onRegenerate}
          className="self-start inline-flex items-center gap-2 px-4 rounded-xl tl-btn-ghost text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {t("week.regenerate")}
        </button>
      </div>
    </SectionCard>
  );
}
