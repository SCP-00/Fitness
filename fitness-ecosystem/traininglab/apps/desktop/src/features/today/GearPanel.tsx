/**
 * Gear panel — the user declares what they own, ONE ITEM AT A TIME.
 *
 * This is the gate that makes the planner honest: a mountain bike or a pair of
 * adjustable dumbbells are inventory rows, and every prescription is filtered
 * through the capabilities they grant.
 *
 * @module features/today/GearPanel
 */

import { useState } from "react";
import { Plus, Trash2, Wrench, Bike, Gauge } from "lucide-react";
import {
  EQUIPMENT_PRESETS,
  ownedFromPreset,
  type OwnedEquipment,
} from "@fitness/bodylab-exercises";
import { t, tInterp, getLanguage } from "../../lib/i18n";
import { SectionCard, Badge } from "./ui";

export function GearPanel({
  inventory,
  onChange,
  available,
  total,
}: {
  inventory: OwnedEquipment[];
  onChange: (next: OwnedEquipment[]) => void;
  available: number;
  total: number;
}) {
  const [presetId, setPresetId] = useState("dumbbells-adjustable");
  const lang = getLanguage();
  const preset = EQUIPMENT_PRESETS.find((p) => p.id === presetId);

  const add = () => {
    const item = ownedFromPreset(presetId, crypto.randomUUID());
    if (!item) return;
    // Friendly default label in the current UI language.
    const label =
      EQUIPMENT_PRESETS.find((p) => p.id === presetId)?.name[lang] ??
      item.label;
    onChange([...inventory, { ...item, label }]);
  };

  const patch = (id: string, next: Partial<OwnedEquipment>) =>
    onChange(
      inventory.map((item) => (item.id === id ? { ...item, ...next } : item)),
    );

  const remove = (id: string) =>
    onChange(inventory.filter((item) => item.id !== id));

  return (
    <SectionCard
      title={t("gear.title")}
      hint={t("gear.hint")}
      icon={<Wrench className="w-4 h-4" />}
      actions={
        <Badge tone={available > 60 ? "success" : "accent"}>
          {tInterp("gear.available", { n: available, total })}
        </Badge>
      }
    >
      {/* Add row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          className="tl-input px-3 py-2 text-sm flex-1 min-w-[220px]"
        >
          {EQUIPMENT_PRESETS.filter((p) => p.id !== "bodyweight").map((p) => (
            <option key={p.id} value={p.id}>
              {p.name[lang]}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl tl-btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          {t("gear.add")}
        </button>
      </div>
      {preset?.hint && (
        <p className="text-xs text-[var(--tl-text-muted)] mb-4 -mt-2">
          {preset.hint[lang]}
        </p>
      )}

      {inventory.length === 0 ? (
        <p className="text-sm text-[var(--tl-text-muted)]">{t("gear.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {inventory.map((item) => {
            const isBike = item.capabilities.includes("bike");
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 bg-[var(--tl-surface-2)] rounded-xl px-3 py-2"
              >
                <span className="text-[var(--tl-accent)]">
                  {isBike ? (
                    <Bike className="w-4 h-4" />
                  ) : (
                    <Gauge className="w-4 h-4" />
                  )}
                </span>
                <input
                  value={item.label}
                  onChange={(e) => patch(item.id, { label: e.target.value })}
                  className="bg-transparent text-sm font-medium flex-1 min-w-[140px] focus:outline-none"
                  aria-label={t("gear.title")}
                />
                {item.setupMin > 0 && (
                  <span className="text-[11px] text-[var(--tl-text-muted)]">
                    {tInterp("gear.setup", { n: item.setupMin })}
                  </span>
                )}
                {item.maxLoadKg !== null && (
                  <label className="flex items-center gap-1 text-[11px] text-[var(--tl-text-muted)]">
                    {t("gear.maxLoad")}
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={item.maxLoadKg}
                      onChange={(e) =>
                        patch(item.id, { maxLoadKg: Number(e.target.value) })
                      }
                      className="tl-input w-16 px-2 py-1 text-xs tabular-nums"
                    />
                  </label>
                )}
                {item.incrementKg !== null && (
                  <label className="flex items-center gap-1 text-[11px] text-[var(--tl-text-muted)]">
                    {t("gear.increment")}
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={item.incrementKg}
                      onChange={(e) =>
                        patch(item.id, { incrementKg: Number(e.target.value) })
                      }
                      className="tl-input w-16 px-2 py-1 text-xs tabular-nums"
                    />
                  </label>
                )}
                <button
                  onClick={() => remove(item.id)}
                  className="p-1.5 rounded-lg text-[var(--tl-border-strong)] hover:text-red-400 tl-focusable"
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
