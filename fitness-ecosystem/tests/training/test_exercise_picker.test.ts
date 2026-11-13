import { describe, expect, it } from "vitest";

import {
  filterExercisePicker,
  pickerFiltersActive,
  type PickerExercise,
} from "../../traininglab/apps/desktop/src/lib/exercise-picker";

const ITEMS: PickerExercise[] = [
  {
    id: "bench",
    name: "Press de banca",
    families: ["pecho"],
    equipment: "Barra + banco",
    favorite: true,
    gearLegal: true,
  },
  {
    id: "fly",
    name: "Aperturas con mancuernas",
    families: ["pecho"],
    equipment: "Mancuernas + banco",
    favorite: false,
    gearLegal: true,
  },
  {
    id: "row",
    name: "Remo con barra",
    families: ["dorsales"],
    equipment: "Barra",
    favorite: false,
    gearLegal: false,
  },
  {
    id: "plank",
    name: "Plancha",
    families: ["core"],
    equipment: "Peso corporal",
    favorite: true,
    gearLegal: true,
  },
];

const BASE = {
  query: "",
  family: null,
  onlyFavorites: false,
  onlyGear: false,
} as const;

describe("filterExercisePicker", () => {
  it("searches accents, equipment and family labels", () => {
    expect(
      filterExercisePicker(ITEMS, { ...BASE, query: "mancuernas pecho" }).map(
        (item) => item.id,
      ),
    ).toEqual(["fly"]);
    expect(
      filterExercisePicker(ITEMS, { ...BASE, query: "plancha" }).map(
        (item) => item.id,
      ),
    ).toEqual(["plank"]);
  });

  it("filters by family", () => {
    expect(
      filterExercisePicker(ITEMS, { ...BASE, family: "pecho" }).map(
        (item) => item.id,
      ),
    ).toEqual(["bench", "fly"]);
  });

  it("can show only favourites", () => {
    expect(
      filterExercisePicker(ITEMS, { ...BASE, onlyFavorites: true }).map(
        (item) => item.id,
      ),
    ).toEqual(["bench", "plank"]);
  });

  it("can show only exercises the current gear supports", () => {
    expect(
      filterExercisePicker(ITEMS, { ...BASE, onlyGear: true }).map(
        (item) => item.id,
      ),
    ).toEqual(["bench", "fly", "plank"]);
  });

  it("combines every active filter without widening the result", () => {
    expect(
      filterExercisePicker(ITEMS, {
        query: "barra",
        family: "pecho",
        onlyFavorites: false,
        onlyGear: true,
      }).map((item) => item.id),
    ).toEqual(["bench"]);
    expect(
      filterExercisePicker(ITEMS, {
        query: "no existe",
        family: null,
        onlyFavorites: false,
        onlyGear: false,
      }),
    ).toEqual([]);
  });
});

describe("pickerFiltersActive", () => {
  it("ignores the screen's default gear scope", () => {
    expect(pickerFiltersActive({ ...BASE, onlyGear: true }, true)).toBe(false);
    expect(pickerFiltersActive({ ...BASE, onlyGear: false }, true)).toBe(true);
    expect(pickerFiltersActive({ ...BASE, family: "pecho" }, true)).toBe(true);
  });
});
