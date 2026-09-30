/**
 * Objetivos corporales — the user's own circumference targets.
 *
 * This is the input half of the body map's goal lens (2026-09-29 e): a waist
 * that anchors the golden-ratio preset, and optional per-family targets in cm.
 * Every field is optional by design — a family without a target simply has no
 * goal to be close to, and the map says so instead of inventing one.
 *
 * The values live in settings (one JSON record), never in the plan engine:
 * a target is a *wish*, and the planner must stay grounded in the log.
 *
 * @module features/today/GoalsPanel
 */

import { useState } from "react";
import { familyLabel } from "../../lib/format";
import { parseNumberInput } from "../../lib/parse-num";
import { t } from "../../lib/i18n";
import { Card } from "../../ui/primitives";

/** The families the map can carry a target for, in display order. */
const FAMILIES = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "lats",
  "traps",
  "rhomboids",
  "core",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
] as const;

type Targets = Partial<Record<(typeof FAMILIES)[number], number>>;

export function GoalsPanel({
  waistCm,
  targets,
  onWaist,
  onTargets,
}: {
  waistCm: number | null;
  targets: Targets;
  onWaist: (cm: number | null) => void;
  onTargets: (targets: Targets) => void;
}) {
  const [waistDraft, setWaistDraft] = useState(
    waistCm !== null ? String(waistCm) : "",
  );

  const commitWaist = () => {
    const value = parseNumberInput(waistDraft);
    // A cleared field withdraws the declared waist; a number is sanity-checked
    // against plausible human ranges rather than trusted blindly.
    if (waistDraft.trim() === "") return onWaist(null);
    if (value !== null && value >= 40 && value <= 200) onWaist(value);
  };

  const setTarget = (family: (typeof FAMILIES)[number], raw: string) => {
    const next = { ...targets };
    if (raw.trim() === "") {
      delete next[family];
    } else {
      const value = parseNumberInput(raw);
      // Out-of-range entries are ignored, not clamped: a silently "fixed"
      // target would be our number wearing the user's name.
      if (value === null || value < 10 || value > 250) return;
      next[family] = value;
    }
    onTargets(next);
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-semibold">{t("settings.goals.title")}</h2>
      </div>
      <p className="text-xs text-[var(--tl-text-muted)] mb-4 leading-relaxed">
        {t("settings.goals.hint")}
      </p>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
            {t("settings.goals.waist")}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={waistDraft}
            onChange={(e) => setWaistDraft(e.target.value)}
            onBlur={commitWaist}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitWaist();
              }
            }}
            placeholder={t("settings.goals.waistPlaceholder")}
            className="tl-input w-28 px-3 py-2 text-sm tabular-nums"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FAMILIES.map((family) => (
            <label
              key={family}
              className="flex items-center justify-between gap-3 bg-[var(--tl-surface-2)] rounded-xl px-3 py-2"
            >
              <span className="text-sm truncate">{familyLabel(family)}</span>
              <input
                type="text"
                inputMode="decimal"
                defaultValue={
                  targets[family] !== undefined ? String(targets[family]) : ""
                }
                onBlur={(e) => setTarget(family, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setTarget(family, (e.target as HTMLInputElement).value);
                  }
                }}
                placeholder="—"
                aria-label={`${familyLabel(family)} (cm)`}
                className="tl-input w-20 px-2 py-1.5 text-sm tabular-nums text-right"
              />
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}
