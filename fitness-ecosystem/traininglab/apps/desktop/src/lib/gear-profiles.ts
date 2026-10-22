/**
 * Gear profiles — «casa» and «gimnasio» are different rooms with different gear.
 *
 * The owner asked for this on 2026-10-20 and the reason is not tidiness: with one
 * inventory the planner either prescribes a barbell he does not have at home or
 * limits him to dumbbells while he stands in a gym. The prescription follows the
 * room, so the room has to be a thing the app knows.
 *
 * **The shape, and why there is no duplication in it.** `settings.inventory` stays
 * *the* live inventory — every consumer (the day plan, the week plan, the
 * progression advice, the MCP context, `set_inventory`) already reads it and none
 * of them had to change. A profile is only *the name that live inventory belongs
 * to*, plus the **other** setups parked on a shelf:
 *
 *   * `settings.activeGearProfile` = `{ id, name }` for the live items, or `null`
 *     while the user has not bothered to name his setup;
 *   * `settings.gearProfiles` = the *parked* setups, each with its own items. The
 *     live one is never stored here — that is the invariant `gearShelf()`
 *     enforces on every read, so a hand-edited backup that duplicates it cannot
 *     make the app show the same gear twice.
 *
 * **What switching does, and what it refuses to do.** Switching parks the live
 * items under their current name and loads the target's items into `inventory`.
 * It touches nothing else: the day's sequence (`rowOrder`), what was set aside
 * (`sessionAside`), his authored week and everything logged are *not* keys this
 * module writes. The plan is then re-derived from the new gear — which is the
 * point of switching — while his own decisions survive it, and the screen asks
 * before it happens (`GearProfileBar`) so nothing moves under his hands.
 *
 * No setup is ever destroyed by a switch or by creating another one: creating a
 * profile parks the current items, and deleting only ever deletes a *parked*
 * one. Deleting the live setup is not offered — emptying your gear is what the
 * gear panel is for, and it says so item by item.
 *
 * @module lib/gear-profiles
 */

import type { OwnedEquipment } from "@fitness/bodylab-exercises";
import type { TLSettingsData } from "./types";

/** One named setup on the shelf. */
export interface GearProfile {
  id: string;
  name: string;
  inventory: OwnedEquipment[];
}

/** What the settings say, sanitised: the live setup's name + the parked ones. */
export interface GearShelf {
  /** The name the live `inventory` belongs to; `null` = the unnamed setup. */
  active: { id: string; name: string } | null;
  /** Setups not in use, in the order they were parked. */
  parked: GearProfile[];
}

/** Why a profile write was refused. The UI and the MCP receipt both map it. */
export type GearProfileRule =
  | "name_empty"
  | "name_taken"
  | "name_current_first"
  | "unknown_profile"
  | "active_profile";

export type GearProfileResult =
  { ok: true; settings: TLSettingsData } | { ok: false; rule: GearProfileRule };

/** A profile name is a label on a chip, not a paragraph. */
const NAME_MAX = 32;

/** Trim, collapse the runs of spaces, cap the length. Never throws. */
export function cleanGearName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

/** The subset of `OwnedEquipment` this app can actually use, from unknown JSON. */
function isOwnedEquipment(value: unknown): value is OwnedEquipment {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OwnedEquipment>;
  return (
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    typeof item.label === "string" &&
    Array.isArray(item.capabilities)
  );
}

/**
 * Sanitise the parked setups out of a stored document or a restored backup.
 *
 * Drops rather than throws, the same contract `normalizeRoutines` keeps: a
 * malformed entry must not blank the shelf, and an id that appears twice is one
 * profile (the first wins) instead of two chips that switch to the same items.
 */
export function normalizeGearProfiles(value: unknown): GearProfile[] {
  if (!Array.isArray(value)) return [];
  const out: GearProfile[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Partial<GearProfile>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = cleanGearName(raw.name);
    if (id.length === 0 || name.length === 0 || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name,
      inventory: Array.isArray(raw.inventory)
        ? raw.inventory.filter(isOwnedEquipment)
        : [],
    });
  }
  return out;
}

/** The live setup's name, or `null` — sanitised, so a string is not a profile. */
export function normalizeActiveGearProfile(
  value: unknown,
): { id: string; name: string } | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { id?: unknown; name?: unknown };
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = cleanGearName(raw.name);
  if (id.length === 0 || name.length === 0) return null;
  return { id, name };
}

/**
 * The shelf, with the duplication invariant applied: an entry whose id is the
 * live profile's id is the live items wearing a second name, so it is not shown
 * and cannot be switched to (that would be a no-op that looked like a switch).
 */
export function gearShelf(
  settings: TLSettingsData | null | undefined,
): GearShelf {
  const active = normalizeActiveGearProfile(settings?.activeGearProfile);
  const parked = normalizeGearProfiles(settings?.gearProfiles).filter(
    (profile) => active === null || profile.id !== active.id,
  );
  return { active, parked };
}

/** The live setup's name as one word for a status line or a receipt. */
export function activeGearName(
  settings: TLSettingsData | null | undefined,
): string | null {
  return gearShelf(settings).active?.name ?? null;
}

/** Whether two names are the same chip, ignoring case and spacing. */
function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Name the live setup (or rename it): «Guarda este equipo como “Casa”».
 *
 * `id` comes from the caller (`crypto.randomUUID()` in the UI), because this
 * module stays pure and a test needs a stable id. Renaming keeps the id, so a
 * parked entry is not orphaned by a typo fixed twice.
 */
export function withGearProfileName(
  settings: TLSettingsData,
  name: unknown,
  id: string,
): GearProfileResult {
  const clean = cleanGearName(name);
  if (clean.length === 0) return { ok: false, rule: "name_empty" };
  const shelf = gearShelf(settings);
  if (shelf.active?.name && sameName(shelf.active.name, clean)) {
    // Already this name: a write that changes nothing is not a change.
    return { ok: true, settings };
  }
  const clash = shelf.parked.some((profile) => sameName(profile.name, clean));
  if (clash) return { ok: false, rule: "name_taken" };
  const active = {
    id: shelf.active?.id ?? id,
    name: clean,
  };
  return {
    ok: true,
    settings: {
      ...settings,
      activeGearProfile: active,
      gearProfiles: shelf.parked,
    },
  };
}

/**
 * A brand-new setup, starting empty: the current one is **parked**, never
 * deleted, and the new one is where the next items get added.
 *
 * Refused when the current items have no name yet (`name_current_first`): there
 * would be no label to park them under, and inventing one would be the app
 * naming a room it has never seen.
 */
export function withNewGearProfile(
  settings: TLSettingsData,
  name: unknown,
  id: string,
): GearProfileResult {
  const clean = cleanGearName(name);
  if (clean.length === 0) return { ok: false, rule: "name_empty" };
  const shelf = gearShelf(settings);
  const taken =
    (shelf.active !== null && sameName(shelf.active.name, clean)) ||
    shelf.parked.some((profile) => sameName(profile.name, clean));
  if (taken) return { ok: false, rule: "name_taken" };
  if (shelf.active === null && settings.inventory.length > 0) {
    return { ok: false, rule: "name_current_first" };
  }
  const parked = shelf.active
    ? [...shelf.parked, { ...shelf.active, inventory: settings.inventory }]
    : [...shelf.parked];
  return {
    ok: true,
    settings: {
      ...settings,
      inventory: [],
      activeGearProfile: { id, name: clean },
      gearProfiles: parked,
    },
  };
}

/**
 * Rename **any** setup — the live one or a parked one — keeping its id.
 *
 * Naming and renaming are the same write for the live setup (`withGearProfileName`
 * already keeps the id), so that case delegates instead of growing a second
 * path that could drift. A parked room gets its label changed in place: its
 * items, its position on the shelf and which one is live all stay exactly where
 * they were, because a typo fixed is not a switch.
 *
 * Refusals mirror the naming rules: empty and already-taken are refused, and
 * the same name it already has is a successful no-op (identical object), so the
 * caller cannot mistake «saved» for «changed».
 */
export function withGearProfileRename(
  settings: TLSettingsData,
  targetId: string,
  name: unknown,
): GearProfileResult {
  const clean = cleanGearName(name);
  if (clean.length === 0) return { ok: false, rule: "name_empty" };
  const shelf = gearShelf(settings);
  if (shelf.active !== null && shelf.active.id === targetId) {
    return withGearProfileName(settings, clean, targetId);
  }
  const target = shelf.parked.find((profile) => profile.id === targetId);
  if (!target) return { ok: false, rule: "unknown_profile" };
  if (sameName(target.name, clean)) return { ok: true, settings };
  const clash =
    (shelf.active !== null && sameName(shelf.active.name, clean)) ||
    shelf.parked.some(
      (profile) => profile.id !== targetId && sameName(profile.name, clean),
    );
  if (clash) return { ok: false, rule: "name_taken" };
  return {
    ok: true,
    settings: {
      ...settings,
      gearProfiles: shelf.parked.map((profile) =>
        profile.id === targetId ? { ...profile, name: clean } : profile,
      ),
    },
  };
}

/**
 * Switch to a parked setup: the live items are parked under their name and the
 * target's items become the live inventory. Nothing logged, sequenced or
 * authored is touched — see the module header.
 */
export function withGearProfileSwitch(
  settings: TLSettingsData,
  targetId: string,
): GearProfileResult {
  const shelf = gearShelf(settings);
  const target = shelf.parked.find((profile) => profile.id === targetId);
  if (!target) return { ok: false, rule: "unknown_profile" };
  const parked = shelf.parked.filter((profile) => profile.id !== target.id);
  if (shelf.active) {
    parked.push({ ...shelf.active, inventory: settings.inventory });
  }
  return {
    ok: true,
    settings: {
      ...settings,
      inventory: target.inventory,
      activeGearProfile: { id: target.id, name: target.name },
      gearProfiles: parked,
    },
  };
}

/**
 * Delete a **parked** setup. The live one is refused on purpose: the profile the
 * user is using is not a thing to remove, and doing so would leave his gear
 * attached to a name that no longer exists.
 */
export function withGearProfileDelete(
  settings: TLSettingsData,
  targetId: string,
): GearProfileResult {
  const shelf = gearShelf(settings);
  if (shelf.active?.id === targetId) {
    return { ok: false, rule: "active_profile" };
  }
  const parked = shelf.parked.filter((profile) => profile.id !== targetId);
  if (parked.length === shelf.parked.length) {
    return { ok: false, rule: "unknown_profile" };
  }
  return { ok: true, settings: { ...settings, gearProfiles: parked } };
}

/**
 * The first free name based on `base`: «Casa», «Casa 2», «Casa 3»…
 *
 * Used by the UI's default suggestion so the common case is one tap instead of
 * typing a name, and by nothing else — a name the user typed is his.
 */
export function freeGearName(base: string, shelf: GearShelf): string {
  const clean = cleanGearName(base) || "Perfil";
  const names = [
    ...(shelf.active ? [shelf.active.name] : []),
    ...shelf.parked.map((profile) => profile.name),
  ].map((name) => name.toLowerCase());
  if (!names.includes(clean.toLowerCase())) return clean;
  for (let n = 2; n < 100; n += 1) {
    const candidate = `${clean} ${n}`;
    if (!names.includes(candidate.toLowerCase())) return candidate;
  }
  return clean;
}
