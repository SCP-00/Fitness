/**
 * Objetivo de volumen — is this week enough? (2026-10-05)
 *
 * The screen this replaces in the reader's head: "I did 40 sets, was that
 * right?" Progreso answered *what* was trained (kg, an abstract exposure index)
 * but never compared it with anything. This card compares the **direct hard sets
 * per family in the last 7 days** with the published hypertrophy band
 * (12–20/week, Baz-Valle 2022) and puts the biggest deficit first.
 *
 * Honesty rules baked into the UI, not just the comments:
 *
 *  * it counts **direct sets only** (primary target), so it never inflates a
 *    family with the 0.66 / 0.33 credit the body map's index uses;
 *  * "in range" is a **band**, not a grade — above the band is flagged but not
 *    scolded, because the literature reports diminishing returns rather than a
 *    penalty (Pelland 2025);
 *  * the triceps band is wider (12–24) because that review found high volume
 *    genuinely better there (p = 0.01), and the footnote says so instead of
 *    hiding a special case in the data;
 *  * it is a training-volume reference for trained adults, **not** medical
 *    advice, and it says that on screen.
 *
 * @module features/stats/VolumeTargetCard
 */

import { useMemo } from 'react';
import { useStore } from "../../app/store";
import { familyLabel } from "../../lib/format";
import { t, tInterp } from "../../lib/i18n";
import {
  summariseVolume,
  WIDER_BAND_FAMILIES,
  type VolumeStatus,
} from "../../lib/volume-target";
import { weeklyDirectSets } from "./derive";

const STATUS_TONE: Record<VolumeStatus, string> = {
  below: "var(--tl-warning)",
  "in-range": "var(--tl-success)",
  above: "var(--tl-accent)",
};

export function VolumeTargetCard() {
  const { sets } = useStore();
  const direct = useMemo(() => weeklyDirectSets(sets, 7), [sets]);
  const summary = useMemo(() => summariseVolume(direct), [direct]);

  // Fixed scale floor so the 12–20 band stays visible even for a light week:
  // a bar that rescales to the data would make 8 sets look like 8 out of 8.
  const scaleMax = Math.max(24, ...summary.rows.map((r) => r.directSets));
  const pct = (value: number) => `${Math.min(100, (value / scaleMax) * 100)}%`;
  // The pill shows the band actually in play: 12–20 normally, 12–24 when
  // triceps is in the list, because that family carries the wider band.
  const bandMin = Math.min(12, ...summary.rows.map((r) => r.min));
  const bandMax = Math.max(20, ...summary.rows.map((r) => r.max));

  return (
    <section className="tl-card" data-testid="volume-target">
      <div className="tl-card-head">
        <div className="min-w-0">
          <h2>{t("progress.volumeTarget.title")}</h2>
          <span>{t("progress.volumeTarget.hint")}</span>
        </div>
        <span className="tl-pill is-accent tabular-nums">
          {tInterp("progress.volumeTarget.band", {
            min: bandMin,
            max: bandMax,
          })}
        </span>
      </div>

      <div className="tl-card-body">
        {summary.trained === 0 ? (
          <p className="text-sm text-[var(--tl-text-muted)]">
            {t("progress.volumeTarget.empty")}
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2 flex-wrap">
              <strong className="text-xl font-semibold tabular-nums">
                {tInterp("progress.volumeTarget.headline", {
                  inRange: summary.inRange,
                  total: summary.trained,
                })}
              </strong>
              {summary.below > 0 && (
                <span className="text-[11px] text-[var(--tl-warning)] font-medium tabular-nums">
                  {tInterp("progress.volumeTarget.belowCount", {
                    n: summary.below,
                  })}
                </span>
              )}
            </div>

            <div className="tl-rows mt-3">
              {summary.rows.map((row) => (
                // Not `.tl-row`: that class is a 2-column grid (name | value)
                // and a third child silently wraps to its own line, which is
                // exactly the kind of half-rendered row the owner complained
                // about. This one declares its own three columns inline.
                <div
                  key={row.family}
                  className="grid items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--tl-border)]"
                  style={{
                    gridTemplateColumns: "minmax(0, 1fr) minmax(56px, 0.9fr) auto",
                  }}
                >
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium truncate">
                      {familyLabel(row.family)}
                    </span>
                    <span className="block text-[11px] text-[var(--tl-text-muted)]">
                      {row.status === "below"
                        ? tInterp("progress.volumeTarget.missing", {
                            n: row.missing,
                          })
                        : row.status === "above"
                          ? tInterp("progress.volumeTarget.over", {
                              n: row.directSets,
                              max: row.max,
                            })
                          : tInterp("progress.volumeTarget.ok", {
                              n: row.directSets,
                            })}
                    </span>
                  </span>

                  <span className="relative block h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    {/* The published band, drawn on the same scale as the value. */}
                    <span
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: pct(row.min),
                        width: `calc(${pct(row.max)} - ${pct(row.min)})`,
                        background: "color-mix(in oklab, var(--tl-success) 30%, transparent)",
                      }}
                    />
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: pct(row.directSets),
                        background: STATUS_TONE[row.status],
                      }}
                    />
                  </span>

                  <span
                    className="text-[13px] font-semibold tabular-nums text-right whitespace-nowrap"
                    style={{ color: STATUS_TONE[row.status] }}
                  >
                    {row.directSets}
                    <span className="text-[11px] font-normal text-[var(--tl-text-muted)]">
                      {" "}
                      /{row.min}–{row.max}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[var(--tl-text-muted)] mt-3 leading-relaxed">
              {t("progress.volumeTarget.source")}
            </p>
            {summary.rows.some((r) => WIDER_BAND_FAMILIES.includes(r.family)) && (
              <p className="text-[11px] text-[var(--tl-text-muted)] mt-1 leading-relaxed">
                {t("progress.volumeTarget.widerBand")}
              </p>
            )}
            <p className="text-[11px] text-[var(--tl-text-muted)] mt-1 leading-relaxed">
              {t("progress.volumeTarget.caveat")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}