/**
 * The exercise library, as pure functions.
 *
 * Everything the Ejercicios screen does to the catalog happens here — projection,
 * search, filtering, sorting — with no React and no DOM, so it can be unit
 * tested and so the screen module stays a rendering concern. The catalog is
 * injected from the shared core package, which is the same list both apps plan
 * against.
 *
 * Two decisions worth stating:
 *
 *   * **Search is accent-insensitive and looks at both languages.** The owner
 *     types "pectoral", "Pécktor" or "bench" and means the same exercise; a
 *     diacritic difference is not a user intention.
 *   * **A row is projected once per language** rather than stored resolved, so
 *     toggling EN/ES re-derives the visible labels instead of holding a stale
 *     copy of the dictionary in component state.
 *
 * @module features/exercises/library
 */

import {
  ALL_EXERCISES,
  getExerciseTechnique,
  getTraits,
} from "@fitness/bodylab-exercises";
import type { MuscleFamily } from "@fitness/bodylab-training";
import { categoryLabel, familyLabel, muscleLabel } from "../../lib/format";
import { getLanguage } from "../../lib/i18n";
import { exerciseFamilies, exercisePrimaryFamily } from "./lookup";

/** One row of the library list, already resolved for the current language. */
export interface ExerciseRowData {
  id: string;
  /** Localised name. */
  name: string;
  /** The English name — kept for search and as the stable identifier in lists. */
  nameEn: string;
  /** The family of the *primary* muscles: what the user would filter by. */
  family: MuscleFamily;
  familyLabel: string;
  /** Every family the exercise touches, for the detail subtitle. */
  families: MuscleFamily[];
  /** Primary muscles, localised, in catalog order. */
  primaryMuscles: string[];
  equipment: string;
  category: string;
  categoryLabel: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** True when our technique layer has coaching for this movement. */
  hasGuide: boolean;
  /**
   * True when the exercise carries *variant-specific* cues on top of its
   * movement pattern's. `hasGuide` is true for the whole catalog (the pattern
   * always teaches something), so this is the flag a row can honestly advertise.
   */
  hasVariantCues: boolean;
  isCardio: boolean;
  unilateral: boolean;
}

/** Strip diacritics and case so "Pécktor" and "pecktor" are the same query. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Distinct families in catalog order — the filter chips, stable across loads. */
export function allFamilies(): MuscleFamily[] {
  const seen: MuscleFamily[] = [];
  for (const exercise of ALL_EXERCISES) {
    for (const family of exerciseFamilies(exercise.id)) {
      if (!seen.includes(family)) seen.push(family);
    }
  }
  return seen;
}

/** Project the catalog into rows resolved for the current language. */
export function buildRows(): ExerciseRowData[] {
  const lang = getLanguage();
  return ALL_EXERCISES.map((exercise) => {
    const families = exerciseFamilies(exercise.id);
    // Filing a row under a real family matters: a mistyped or unknown id would
    // otherwise fall out of every filter. The catalog guarantees one.
    const family = exercisePrimaryFamily(exercise.id) ?? families[0] ?? "core";
    return {
      id: exercise.id,
      name: exercise.name[lang] ?? exercise.name.en,
      nameEn: exercise.name.en,
      family,
      familyLabel: familyLabel(family),
      families,
      primaryMuscles: exercise.muscles
        .filter((m) => m.intensity === 3)
        .map((m) => muscleLabel(m.muscle)),
      equipment: exercise.equipment[lang] ?? exercise.equipment.en,
      category: exercise.category,
      categoryLabel: categoryLabel(exercise.category),
      difficulty: exercise.difficulty,
      hasGuide: getExerciseTechnique(exercise.id) !== null,
      hasVariantCues:
        getExerciseTechnique(exercise.id)?.hasVariantCues ?? false,
      isCardio: getTraits(exercise.id)?.cardio !== undefined,
      unilateral: getTraits(exercise.id)?.unilateral ?? false,
    };
  });
}

export interface LibraryFilters {
  query: string;
  /** `null` = every family. */
  family: MuscleFamily | null;
  /** `null` = every category. */
  category: string | null;
}

export interface LibraryResult {
  rows: ExerciseRowData[];
  /** How many rows exist in total, before filtering — the "143 ejercicios" line. */
  total: number;
  /** Rows matching the filters. */
  matching: number;
  /** Of these, how many carry variant-specific coaching on top of the pattern. */
  withGuide: number;
  /** True when the only reason we are filtering is the search box. */
  searching: boolean;
}

/**
 * Filter + sort in one pass. Sorting is applied *after* filtering and is stable
 * for equal keys (name as the tie-breaker), so the list never reshuffles
 * between renders with identical input.
 */
export function queryLibrary(
  rows: ExerciseRowData[],
  filters: LibraryFilters,
  sort: "az" | "level" = "az",
): LibraryResult {
  const needle = fold(filters.query.trim());
  const words = needle.split(/\s+/).filter(Boolean);

  const filtered = rows.filter((row) => {
    if (filters.family && !row.families.includes(filters.family)) return false;
    if (filters.category && row.category !== filters.category) return false;
    if (words.length === 0) return true;
    const haystack = fold(
      `${row.name} ${row.nameEn} ${row.equipment} ${row.familyLabel} ${row.primaryMuscles.join(" ")}`,
    );
    return words.every((word) => haystack.includes(word));
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "level") {
      return a.difficulty - b.difficulty || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  return {
    rows: sorted,
    total: rows.length,
    matching: sorted.length,
    withGuide: sorted.filter((row) => row.hasVariantCues).length,
    searching: needle.length > 0,
  };
}

export function findRow(
  rows: ExerciseRowData[],
  id: string,
): ExerciseRowData | null {
  return rows.find((row) => row.id === id) ?? null;
}
