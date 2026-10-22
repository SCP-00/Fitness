/**
 * Favourites (2026-10-20) — the star list in settings.
 *
 * Small module, but it is a *persisted preference* that travels in every backup,
 * so the cases worth pinning are the ones a corrupt or hand-edited file can
 * produce: a null list, duplicated ids, an id that is not a string, and a toggle
 * that must not star the same exercise twice when a phone double-taps.
 *
 * @module tests/training/test_favorites
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../../traininglab/apps/desktop/src/lib/types";
import {
  favoriteIds,
  isFavorite,
  normalizeFavorites,
  withFavorite,
} from "../../traininglab/apps/desktop/src/lib/favorites";

describe("favourites: reading a stored list", () => {
  it("starts empty on a record written before the field existed", () => {
    expect(favoriteIds(DEFAULT_SETTINGS)).toEqual([]);
    expect(isFavorite(DEFAULT_SETTINGS, "goblet-squat")).toBe(false);
  });

  it("drops what cannot be an exercise id", () => {
    expect(
      normalizeFavorites([
        "goblet-squat",
        "  ",
        42,
        null,
        "goblet-squat",
        " x ",
      ]),
    ).toEqual(["goblet-squat", "x"]);
  });

  it("is not fooled by a string where the list should be", () => {
    expect(normalizeFavorites("goblet-squat")).toEqual([]);
  });
});

describe("favourites: starring", () => {
  it("toggles on and off", () => {
    const on = withFavorite(DEFAULT_SETTINGS, "goblet-squat");
    expect(on.favorites).toEqual(["goblet-squat"]);
    const off = withFavorite(on, "goblet-squat");
    expect(off.favorites).toEqual([]);
  });

  it("keeps the order he starred them in", () => {
    const first = withFavorite(DEFAULT_SETTINGS, "goblet-squat");
    const second = withFavorite(first, "barbell-bench-press");
    expect(favoriteIds(second)).toEqual([
      "goblet-squat",
      "barbell-bench-press",
    ]);
  });

  it("is a no-op when the state is already the one asked for", () => {
    const on = withFavorite(DEFAULT_SETTINGS, "goblet-squat", true);
    expect(withFavorite(on, "goblet-squat", true)).toBe(on);
    expect(withFavorite(DEFAULT_SETTINGS, "x", false)).toBe(DEFAULT_SETTINGS);
  });

  it("refuses an empty id instead of starring nothing", () => {
    expect(withFavorite(DEFAULT_SETTINGS, "   ")).toBe(DEFAULT_SETTINGS);
  });
});
