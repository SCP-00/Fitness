/**
 * Catalog expansion — integrity, and proof the gaps are actually closed.
 *
 * The old suite guards the *contract* (traits exist, gear gates work). This one
 * guards the thing the expansion was for: a person training at home with a bar,
 * dip bars, adjustable dumbbells, bands and a bike must be able to fill every
 * movement pattern a real plan needs — and the data must stay clean while it
 * grows (unique ids, bilingual copy, no orphan traits).
 *
 * @module tests/exercises/test_catalog_expansion
 */

import { describe, it, expect } from "vitest";
import {
  ALL_EXERCISES,
  EXERCISE_TRAITS,
  EXPANSION_EXERCISES,
  getTraits,
  ownedFromPreset,
  ownedCapabilities,
  satisfies,
  type MovementPattern,
  type OwnedEquipment,
} from "@fitness/bodylab-exercises";

/** The reference home setup: no barbell, no rack, no machines, no cables. */
function homeInventory(): OwnedEquipment[] {
  return [
    "pullup-bar",
    "dip-bars",
    "dumbbells-adjustable",
    "bands",
    "bike",
    "bench",
    "jump-rope",
    "box",
  ].map((presetId, i) => ownedFromPreset(presetId, `inv-${i}`)!);
}

const usableAtHome = () => {
  const owned = ownedCapabilities(homeInventory());
  return ALL_EXERCISES.filter((ex) => satisfies(getTraits(ex.id).requires, owned));
};

describe("catalog expansion: data integrity", () => {
  it("covers at least 140 exercises", () => {
    expect(ALL_EXERCISES.length).toBeGreaterThanOrEqual(140);
  });

  it("never repeats an id (a collision would silently shadow an exercise)", () => {
    const ids = ALL_EXERCISES.map((e) => e.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
  });

  it("carries bilingual copy for every entry, old and new", () => {
    for (const ex of ALL_EXERCISES) {
      for (const [label, value] of [
        ["name.en", ex.name.en],
        ["name.es", ex.name.es],
        ["equipment.en", ex.equipment.en],
        ["equipment.es", ex.equipment.es],
        ["description.en", ex.description.en],
        ["description.es", ex.description.es],
      ] as const) {
        expect(value.trim().length, `${ex.id} ${label}`).toBeGreaterThan(1);
      }
    }
  });

  it("describes real muscles with valid intensities", () => {
    for (const ex of ALL_EXERCISES) {
      expect(ex.muscles.length, `${ex.id} has no muscles`).toBeGreaterThan(0);
      for (const involvement of ex.muscles) {
        expect([1, 2, 3]).toContain(involvement.intensity);
      }
    }
  });

  it("every expansion entry has hand-written traits in its own module", () => {
    const missing = EXPANSION_EXERCISES.filter(
      (ex) => EXERCISE_TRAITS[ex.id] === undefined,
    ).map((ex) => ex.id);
    expect(missing).toEqual([]);
    expect(EXPANSION_EXERCISES.length).toBeGreaterThanOrEqual(45);
  });

  it("every movement pattern in the vocabulary is used by at least one exercise", () => {
    const used = new Set(
      ALL_EXERCISES.map((ex) => getTraits(ex.id).pattern as MovementPattern),
    );
    const vocabulary: MovementPattern[] = [
      "horizontal_push",
      "vertical_push",
      "horizontal_pull",
      "vertical_pull",
      "squat",
      "hinge",
      "lunge",
      "hip_extension",
      "hip_abduction",
      "hip_adduction",
      "knee_flexion",
      "knee_extension",
      "plantar_flexion",
      "tibialis",
      "shoulder_abduction",
      "shoulder_flexion",
      "shoulder_extension",
      "elbow_flexion",
      "elbow_extension",
      "forearm_flexion",
      "forearm_extension",
      "core_flexion",
      "core_anti_extension",
      "core_anti_lateral",
      "core_rotation",
      "carry",
      "cardio_steady",
      "cardio_interval",
    ];
    for (const pattern of vocabulary) {
      expect(used.has(pattern), `no exercise uses ${pattern}`).toBe(true);
    }
  });
});

describe("catalog expansion: the home gaps are closed", () => {
  it("a home inventory now unlocks a real menu (>= 60 exercises)", () => {
    expect(usableAtHome().length).toBeGreaterThanOrEqual(60);
  });

  it("the specific holes that used to block a home plan are filled", () => {
    const usable = new Set(usableAtHome().map((ex) => ex.id));
    for (const id of [
      // A press ladder that does not need a rack.
      "dumbbell-floor-press",
      "deficit-push-up",
      "decline-push-up",
      "archer-push-up",
      // Vertical pulling without a machine: the band, and the assisted pull-up.
      "band-lat-pulldown",
      "assisted-pull-up",
      "inverted-row-feet-elevated",
      // Unilateral legs (the asymmetry work BodyLab measures).
      "dumbbell-split-squat",
      "reverse-lunge",
      "walking-lunge",
      "single-leg-glute-bridge",
      // Hip extension with neither barbell nor bench.
      "glute-bridge",
      // Free conditioning.
      "shadow-boxing-intervals",
      "tabata-bodyweight",
    ]) {
      expect(usable.has(id), `${id} is not usable at home`).toBe(true);
    }
  });

  it("offers real asymmetry work: >= 12 unilateral exercises at home", () => {
    const unilateral = usableAtHome().filter(
      (ex) => getTraits(ex.id).unilateral,
    );
    expect(unilateral.length).toBeGreaterThanOrEqual(12);
  });

  it("keeps heavy spinal loading honest: spineLoad 3 entries are barbell work only", () => {
    const brutal = ALL_EXERCISES.filter(
      (ex) => getTraits(ex.id).spineLoad === 3,
    ).map((ex) => ex.id);
    for (const id of brutal) {
      const trait = getTraits(id);
      expect(["barbell", "machine", "cable"], id).toContain(trait.loadType);
    }
  });
});
