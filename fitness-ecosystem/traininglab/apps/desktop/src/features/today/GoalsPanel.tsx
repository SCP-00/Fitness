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
import { t, tInterp } from "../../lib/i18n";
import { Card } from "../../ui/primitives";
import { GOLDEN_RATIO_TARGETS } from "../stats/goals";

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
type Family = (typeof FAMILIES)[number];

/**
 * Organised by the owner's request (2026-10-08): the goals read top-down as
 * the classical beauty proportions (V-taper anchored on the waist) instead of
 * an alphabet-ish flat list — taper · arms · legs.
 */
const GROUPS: ReadonlyArray<{ labelKey: string; families: readonly Family[] }> = [
  {
    labelKey: "settings.goals.groupTaper",
    families: ["chest", "shoulders", "lats", "traps", "rhomboids", "core"],
  },
  { labelKey: "settings.goals.groupArms", families: ["biceps", "triceps", "forearms"] },
  {
    labelKey: "settings.goals.groupLegs",
    families: ["glutes", "quadriceps", "hamstrings", "calves"],
  },
];

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

  const [goldenMsg, setGoldenMsg] = useState<string | null>(null);

  /* Golden-ratio preset — fills ONLY families the user left empty (never
     overwrites a number the owner typed himself). */
  const applyGolden = () => {
    if (waistCm === null || !(waistCm > 0)) return;
    const next = { ...targets };
    let filled = 0;
    for (const family of FAMILIES) {
      if (next[family] !== undefined) continue;
      const ratio = GOLDEN_RATIO_TARGETS[family];
      if (ratio === undefined) continue;
      next[family] = Math.round(waistCm * ratio * 2) / 2; // 0.5 cm steps
      filled += 1;
    }
    if (filled > 0) onTargets(next);
    setGoldenMsg(tInterp("settings.goals.applyGoldenDone", { n: filled }));
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

        {/* Golden-ratio preset — the owner's "organise my goals by the golden
            ratio" request (2026-10-08). Blanks only, published ratios. */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={applyGolden}
            disabled={waistCm === null || !(waistCm > 0)}
            title={
              waistCm === null || !(waistCm > 0)
                ? t("settings.goals.applyGoldenNeedWaist")
                : undefined
            }
            className="tl-btn-ghost self-start px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✦ {t("settings.goals.applyGolden")}
          </button>
          <p className="text-[11px] leading-relaxed text-[var(--tl-text-muted)]">
            {t("settings.goals.applyGoldenHint")}
          </p>
          {goldenMsg && (
            <p className="text-[11px] font-medium text-[var(--tl-success)]">
              {goldenMsg}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {GROUPS.map((group) => (
            <div key={group.labelKey} className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
                {t(group.labelKey)}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.families.map((family) => {
                  const ratio = GOLDEN_RATIO_TARGETS[family];
                  const ratioText =
                    ratio !== undefined
                      ? String(ratio).replace(".", ",")
                      : null;
                  return (
                    <label
                      key={family}
                      className="flex items-center justify-between gap-3 bg-[var(--tl-surface-2)] rounded-xl px-3 py-2"
                    >
                      <span className="text-sm truncate flex items-baseline gap-1.5">
                        {familyLabel(family)}
                        {ratioText && (
                          <span className="text-[10px] text-[var(--tl-text-muted)] tabular-nums">
                            {tInterp("settings.goals.ratioOf", { r: ratioText })}
                          </span>
                        )}
                      </span>
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
