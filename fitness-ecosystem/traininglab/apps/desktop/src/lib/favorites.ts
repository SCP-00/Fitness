/**
 * Favourite exercises — the short list the owner actually uses.
 *
 * The library has 151 entries and a search box; search answers *«where is the
 * one I mean»* but not *«the six I keep coming back to»*, and mid-session — the
 * moment this app exists for — the second question is the one that costs time.
 *
 * **What a favourite is, and is not.** It is a star on a catalogue id: a
 * preference about the library, not a record of training. It is deliberately not
 * a mark of quality (the app has no evidence to rank exercises), it is not a
 * "recent" list computed from the log (`lib/progress` already answers what was
 * trained, with real numbers), and it survives the catalogue changing: an id that
 * no longer exists is simply ignored on read, the same way `rowOrder` treats one.
 *
 * Stored in settings like `repOverrides` and `routines`, so every backup and
 * every restore carries it without a `DB_VERSION` bump.
 *
 * @module lib/favorites
 */

import type { TLSettingsData } from "./types";

/** Trim, drop non-strings and empties, dedupe — in the order he starred them. */
export function normalizeFavorites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    if (id.length === 0 || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

/** Every starred exercise id, sanitised. */
export function favoriteIds(
  settings: TLSettingsData | null | undefined,
): string[] {
  return normalizeFavorites(settings?.favorites);
}

/** Is this exercise starred? */
export function isFavorite(
  settings: TLSettingsData | null | undefined,
  exerciseId: string,
): boolean {
  const id = typeof exerciseId === "string" ? exerciseId.trim() : "";
  return id.length > 0 && favoriteIds(settings).includes(id);
}

/**
 * Star or unstar one exercise. `on` omitted = toggle.
 *
 * Starring twice is a no-op (same array, same reference when nothing changed),
 * so a double tap on a slow phone cannot produce two entries.
 */
export function withFavorite(
  settings: TLSettingsData,
  exerciseId: string,
  on?: boolean,
): TLSettingsData {
  const id = typeof exerciseId === "string" ? exerciseId.trim() : "";
  if (id.length === 0) return settings;
  const current = favoriteIds(settings);
  const starred = current.includes(id);
  const next = on === undefined ? !starred : on;
  if (next === starred) return settings;
  return {
    ...settings,
    favorites: next
      ? [...current, id]
      : current.filter((entry) => entry !== id),
  };
}
