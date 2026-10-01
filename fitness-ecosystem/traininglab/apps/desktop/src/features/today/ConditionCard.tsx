/**
 * ConditionCard — the four published-norm axes (cardio, composition,
 * proportion, muscle) as a compact strip.
 *
 * Deliberately dumb: classification lives in `features/stats/condition.ts`
 * (pure, root-suite tested); this component only renders what arrives. Bands
 * reuse the map legend's palette so the reading is consistent across the
 * screen, and every card shows its source + the bounds actually applied —
 * provenance is the design contract, not decoration.
 *
 * @module features/today/ConditionCard
 */

import { Activity, Droplet, Scale, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "../../lib/i18n";
import type { ConditionAxis } from "../stats/condition";

const ICONS: Record<ConditionAxis["id"], ReactNode> = {
  cardio: <Activity className="w-4 h-4" />,
  composition: <Droplet className="w-4 h-4" />,
  proportion: <Scale className="w-4 h-4" />,
  muscle: <Zap className="w-4 h-4" />,
};

/** Same palette the body map uses for the 0–100 index bands. */
const BAND_CLASS: Record<NonNullable<ConditionAxis["band"]>, string> = {
  excellent: "is-band-excellent",
  above_average: "is-band-above",
  average: "is-band-average",
  below_average: "is-band-below",
  poor: "is-band-poor",
};

function bandLabel(band: NonNullable<ConditionAxis["band"]>): string {
  switch (band) {
    case "excellent":
      return t("condition.band.excellent");
    case "above_average":
      return t("condition.band.above");
    case "average":
      return t("condition.band.average");
    case "below_average":
      return t("condition.band.below");
    case "poor":
      return t("condition.band.poor");
  }
}

function formatValue(axis: ConditionAxis): string | null {
  if (axis.value == null) return null;
  switch (axis.id) {
    case "cardio":
      return `${Math.round(axis.value)} m`;
    case "composition":
      return `${Math.round(axis.value)} %`;
    case "proportion":
      return axis.value.toFixed(2);
    case "muscle":
      return String(axis.value);
  }
}

export default function ConditionCard({
  axes,
  mean,
}: {
  axes: ConditionAxis[];
  mean: number | null;
}) {
  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <div className="min-w-0">
          <h2>{t("condition.title")}</h2>
          <span>{t("condition.sub")}</span>
        </div>
        {mean != null && (
          <span className={`tl-pill ${mean >= 70 ? "is-accent" : ""}`}>
            {tInterpSafe(mean)}
          </span>
        )}
      </div>
      <div className="tl-card-body tl-condition-grid">
        {axes.map((a) => (
          <div
            key={a.id}
            className="tl-condition-item"
            data-testid={`condition-${a.id}`}
          >
            <div className="tl-condition-head">
              {ICONS[a.id]}
              <span className="tl-condition-name">
                {t(`condition.axis.${a.id}`)}
              </span>
              {a.band && (
                <span className={`tl-band ${BAND_CLASS[a.band]}`}>
                  {bandLabel(a.band)}
                </span>
              )}
            </div>
            <div className="tl-condition-value">
              {formatValue(a) ?? t("condition.noData")}
            </div>
            <div className="tl-condition-meta">
              {a.bounds ?? ""}
              {a.bounds ? " · " : ""}
              {a.source}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function tInterpSafe(mean: number): string {
  return `${t("condition.mean")}: ${mean}`;
}
