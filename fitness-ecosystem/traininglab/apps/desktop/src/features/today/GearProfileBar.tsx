/**
 * The gear shelf — «casa» / «gimnasio» as chips above the inventory.
 *
 * Rendering only: every write goes through `lib/gear-profiles.ts` in the screen
 * that owns the settings, which is also where the refusal rules live. What this
 * component owns is the one thing the model cannot decide for itself: **switching
 * asks first**. The plan for today is re-derived from the gear, so a switch
 * changes the prescription on the screen — «propone y tú aceptas» is the point,
 * not a nicety, and it is one tap.
 *
 * Deleting is offered only for a parked profile, never the one in use, and the
 * confirmation spells out that the items are what disappear.
 *
 * **Renaming (2026-10-22).** A name is the only thing a profile is, so a typo
 * used to be permanent: the live setup could be named but never re-named, and a
 * parked room could not be relabelled at all. Both now go through
 * `withGearProfileRename` — same id, same items, same position on the shelf —
 * and the label is editable from the chip in use and from the parked chip's own
 * panel, which is where the name is read.
 *
 * @module features/today/GearProfileBar
 */

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Chip } from "../../ui/primitives";
import { t, tInterp } from "../../lib/i18n";
import type { GearProfile, GearProfileRule } from "../../lib/gear-profiles";

type Mode =
  | { kind: "name" }
  | { kind: "new" }
  | { kind: "rename"; id: string }
  | { kind: "switch"; id: string }
  | { kind: "delete"; id: string }
  | null;

const RULE_KEY: Record<GearProfileRule, string> = {
  name_empty: "gear.profiles.nameEmpty",
  name_taken: "gear.profiles.nameTaken",
  name_current_first: "gear.profiles.nameCurrentFirst",
  unknown_profile: "gear.profiles.unknown",
  active_profile: "gear.profiles.deleteActive",
};

export function GearProfileBar({
  active,
  parked,
  hasItems,
  defaultName,
  onName,
  onNew,
  onRename,
  onSwitch,
  onDelete,
}: {
  /** Name of the live inventory, or `null` while it has none. */
  active: { id: string; name: string } | null;
  parked: GearProfile[];
  /** Whether the live inventory has any items (the UI's own hint to name it). */
  hasItems: boolean;
  /** A free, localised suggestion for a new profile's name. */
  defaultName: string;
  /** Name the live setup. Returns the rule that refused it, or `null`. */
  onName: (name: string) => GearProfileRule | null;
  /** Start a new, empty setup, parking the current one. */
  onNew: (name: string) => GearProfileRule | null;
  /** Relabel a setup (live or parked) keeping its id and its items. */
  onRename: (id: string, name: string) => GearProfileRule | null;
  /** Load a parked setup into the live inventory. */
  onSwitch: (id: string) => GearProfileRule | null;
  /** Remove a parked setup. */
  onDelete: (id: string) => GearProfileRule | null;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<GearProfileRule | null>(null);

  const open = (next: Mode, initial = "") => {
    setError(null);
    setDraft(initial);
    setMode(next);
  };
  const close = () => {
    setError(null);
    setMode(null);
  };
  const commit = (fn: (value: string) => GearProfileRule | null) => {
    const rule = fn(draft);
    if (rule) {
      setError(rule);
      return;
    }
    close();
  };

  const target = (id: string): GearProfile | null =>
    parked.find((profile) => profile.id === id) ?? null;

  /** The submit of the labelling form: one field, three destinations. */
  const submit = () => {
    if (!mode) return;
    if (mode.kind === "rename") commit((value) => onRename(mode.id, value));
    else if (mode.kind === "name") commit(onName);
    else if (mode.kind === "new") commit(onNew);
  };

  return (
    <div className="flex flex-col gap-2.5 mb-4">
      <p className="text-xs text-[var(--tl-text-muted)]">
        {t("gear.profiles.hint")}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {active ? (
          <span className="inline-flex items-center">
            <Chip active>
              {tInterp("gear.profiles.active", { name: active.name })}
            </Chip>
            <button
              type="button"
              onClick={() =>
                open({ kind: "rename", id: active.id }, active.name)
              }
              aria-label={t("gear.profiles.renameActive")}
              title={t("gear.profiles.renameActive")}
              className="grid place-items-center w-11 h-11 -ml-1 rounded-lg text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </span>
        ) : (
          <span className="text-xs text-[var(--tl-text-muted)]">
            {t("gear.profiles.none")}
          </span>
        )}

        {parked.map((profile) => (
          <Chip
            key={profile.id}
            title={tInterp("gear.profiles.switchTitle", { name: profile.name })}
            onClick={() => open({ kind: "switch", id: profile.id })}
          >
            {profile.name}
          </Chip>
        ))}

        {active === null ? (
          <button
            type="button"
            onClick={() => open({ kind: "name" }, defaultName)}
            disabled={!hasItems}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border border-[var(--tl-border)] bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] hover:border-[var(--tl-border-strong)] tl-focusable disabled:opacity-40"
          >
            <Plus className="w-3 h-3" />
            {t("gear.profiles.save")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => open({ kind: "new" }, defaultName)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border border-[var(--tl-border)] bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] hover:border-[var(--tl-border-strong)] tl-focusable"
          >
            <Plus className="w-3 h-3" />
            {t("gear.profiles.new")}
          </button>
        )}
      </div>

      {mode?.kind === "name" ||
      mode?.kind === "new" ||
      mode?.kind === "rename" ? (
        <div className="rounded-xl border border-[var(--tl-border)] bg-[var(--tl-surface-2)] px-3 py-2.5 flex flex-wrap items-center gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") close();
            }}
            placeholder={t("gear.profiles.namePlaceholder")}
            aria-label={t("gear.profiles.namePlaceholder")}
            className="tl-input flex-1 min-w-[160px] px-3 py-1.5 text-sm"
            autoFocus
          />
          <button
            type="button"
            onClick={submit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg tl-btn-primary text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            {t("common.save")}
          </button>
          <button
            type="button"
            onClick={close}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable"
          >
            <X className="w-3.5 h-3.5" />
            {t("gear.profiles.cancel")}
          </button>
        </div>
      ) : null}

      {mode?.kind === "switch" ? (
        <div className="rounded-xl border border-[var(--tl-border)] bg-[var(--tl-surface-2)] px-3 py-2.5 flex flex-wrap items-center gap-2">
          <p className="text-xs text-[var(--tl-text-secondary)] flex-1 min-w-[200px]">
            {tInterp("gear.profiles.switchTitle", {
              name: target(mode.id)?.name ?? "",
            })}
          </p>
          <button
            type="button"
            onClick={() => {
              const rule = onSwitch(mode.id);
              if (rule) setError(rule);
              else close();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg tl-btn-primary text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            {t("gear.profiles.switch")}
          </button>
          <button
            type="button"
            onClick={() =>
              open(
                { kind: "rename", id: mode.id },
                target(mode.id)?.name ?? "",
              )
            }
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("gear.profiles.rename")}
          </button>
          <button
            type="button"
            onClick={() => open({ kind: "delete", id: mode.id })}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-[var(--tl-text-muted)] hover:text-red-400 tl-focusable"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("gear.profiles.delete")}
          </button>
          <button
            type="button"
            onClick={close}
            className="px-2 py-1.5 rounded-lg text-xs text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable"
          >
            {t("gear.profiles.cancel")}
          </button>
        </div>
      ) : null}

      {mode?.kind === "delete" ? (
        <div className="rounded-xl border border-[var(--tl-border)] bg-[var(--tl-surface-2)] px-3 py-2.5 flex flex-wrap items-center gap-2">
          <p className="text-xs text-[var(--tl-text-secondary)] flex-1 min-w-[200px]">
            {tInterp("gear.profiles.deleteTitle", {
              name: target(mode.id)?.name ?? "",
              n: target(mode.id)?.inventory.length ?? 0,
            })}
          </p>
          <button
            type="button"
            onClick={() => {
              const rule = onDelete(mode.id);
              if (rule) setError(rule);
              else close();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-[var(--tl-border)] tl-focusable"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("gear.profiles.delete")}
          </button>
          <button
            type="button"
            onClick={close}
            className="px-2 py-1.5 rounded-lg text-xs text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable"
          >
            {t("gear.profiles.cancel")}
          </button>
        </div>
      ) : null}

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {t(RULE_KEY[error])}
        </p>
      )}
    </div>
  );
}
