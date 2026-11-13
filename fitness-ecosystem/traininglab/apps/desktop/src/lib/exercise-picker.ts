/**
 * The reusable exercise picker's visible filtering.
 *
 * The catalogue projection, favourites and gear legality are resolved by the
 * caller; this module only answers "which of these rows match the active
 * filters". Keeping it pure is what lets the same picker serve Hoy,
 * Entrenamiento and Rutinas without three subtly different searches.
 *
 * @module lib/exercise-picker
 */

/** One row the picker can render. Labels are already resolved for the language. */
export interface PickerExercise {
  id: string;
  name: string;
  /** Localised family labels, used by the chips and the search. */
  families: string[];
  equipment: string;
  favorite: boolean;
  /** True when the user's current inventory can perform it. */
  gearLegal: boolean;
}

export interface PickerFilters {
  query: string;
  /** A localised family label, or `null` for every family. */
  family: string | null;
  onlyFavorites: boolean;
  onlyGear: boolean;
}

/** Strip diacritics and case, like the library's search. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Apply the picker's filters in one pass. Every term must match, so
 * "mancuerna pecho" narrows instead of widening; the order stays the caller's
 * catalogue order (the picker does not invent a ranking).
 */
export function filterExercisePicker(
  items: readonly PickerExercise[],
  filters: PickerFilters,
): PickerExercise[] {
  const words = fold(filters.query.trim()).split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (filters.onlyFavorites && !item.favorite) return false;
    if (filters.onlyGear && !item.gearLegal) return false;
    if (filters.family && !item.families.includes(filters.family)) return false;
    if (words.length === 0) return true;
    const haystack = fold(
      `${item.name} ${item.equipment} ${item.families.join(" ")}`,
    );
    return words.every((word) => haystack.includes(word));
  });
}

/** True when a filter other than the screen's default gear scope is active. */
export function pickerFiltersActive(
  filters: PickerFilters,
  defaultOnlyGear: boolean,
): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.family !== null ||
    filters.onlyFavorites ||
    filters.onlyGear !== defaultOnlyGear
  );
}
