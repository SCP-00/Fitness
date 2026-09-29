/**
 * Exercise traits + equipment inventory — the contract TrainingLab plans on.
 *
 * This suite exists because planning depends on two promises:
 *   1. every catalog exercise has HAND-WRITTEN traits (never the fallback),
 *   2. the gear inventory actually gates what the user can be prescribed.
 * If either breaks, the planner silently prescribes impossible sessions.
 *
 * @module tests/exercises/test_exercise_traits
 */

import { describe, it, expect } from "vitest";
import {
  ALL_EXERCISES,
  EXERCISE_TRAITS,
  getTraits,
  EQUIPMENT_PRESETS,
  ownedFromPreset,
  ownedCapabilities,
  satisfies,
  maxLoadFor,
  incrementFor,
  type Capability,
  type OwnedEquipment,
} from "@fitness/bodylab-exercises";

const VALID_CAPABILITIES = new Set<Capability>(
  EQUIPMENT_PRESETS.flatMap((p) => p.capabilities),
);

/** The owner's real home setup (the reference inventory for these tests). */
function homeInventory(): OwnedEquipment[] {
  return [
    "pullup-bar",
    "dip-bars",
    "dumbbells-adjustable",
    "bands",
    "bike",
    "bench",
  ].map((presetId, i) => ownedFromPreset(presetId, `inv-${i}`)!);
}

describe("Exercise traits: coverage and honesty", () => {
  it("every catalog exercise has hand-written traits (no fallback in use)", () => {
    const missing = ALL_EXERCISES.filter(
      (ex) => EXERCISE_TRAITS[ex.id] === undefined,
    ).map((ex) => ex.id);
    expect(missing).toEqual([]);
  });

  it("every requirement uses a real capability granted by some preset", () => {
    for (const ex of ALL_EXERCISES) {
      for (const group of getTraits(ex.id).requires) {
        expect(group.length).toBeGreaterThan(0); // an AND-group can never be empty
        for (const cap of group) expect(VALID_CAPABILITIES.has(cap)).toBe(true);
      }
    }
  });

  it("traits ids and catalog ids stay in sync (no orphan traits)", () => {
    const catalogIds = new Set(ALL_EXERCISES.map((e) => e.id));
    const orphans = Object.keys(EXERCISE_TRAITS).filter(
      (id) => !catalogIds.has(id),
    );
    expect(orphans).toEqual([]);
  });

  it("every category-cardio entry is a real time-based conditioning block", () => {
    // One-directional on purpose: a lift MAY also be usable as a conditioning
    // interval (mountain climbers live in the core section and still carry
    // `cardio: 'interval'`), but a `cardio` category entry must always be
    // time-loaded and declare steady/interval conditioning.
    for (const ex of ALL_EXERCISES) {
      if (ex.category !== "cardio") continue;
      const trait = getTraits(ex.id);
      expect(trait.cardio, `${ex.id} is category cardio`).toBeDefined();
      expect(trait.loadType).toBe("time");
    }
    // …and the database really does contain conditioning (it never used to).
    const cardioIds = ALL_EXERCISES.filter((e) => e.category === "cardio").map(
      (e) => e.id,
    );
    expect(cardioIds.length).toBeGreaterThanOrEqual(6);
  });

  it("bodyweight exercises declare no equipment at all", () => {
    for (const ex of ALL_EXERCISES) {
      if (ex.equipment.en.toLowerCase().startsWith("bodyweight")) {
        expect(getTraits(ex.id).requires, ex.id).toEqual([]);
      }
    }
  });
});

describe("Equipment inventory: the gear gate is real", () => {
  it("presets are uniquely identified and each grants at least one capability", () => {
    const ids = EQUIPMENT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of EQUIPMENT_PRESETS)
      expect(p.capabilities.length).toBeGreaterThan(0);
  });

  it("bodyweight is always owned, and pull-up bar / dip bars / dumbbells unlock their family", () => {
    const owned = ownedCapabilities(homeInventory());
    expect(owned.has("bodyweight")).toBe(true);
    expect(satisfies(getTraits("pull-ups").requires, owned)).toBe(true);
    expect(satisfies(getTraits("dips").requires, owned)).toBe(true);
    expect(satisfies(getTraits("inverted-row").requires, owned)).toBe(true);
    expect(satisfies(getTraits("goblet-squat").requires, owned)).toBe(true);
    expect(satisfies(getTraits("mtb-hill-intervals").requires, owned)).toBe(
      true,
    );
  });

  it("a home inventory is honestly blocked from barbell/rack/cable work", () => {
    const owned = ownedCapabilities(homeInventory());
    for (const id of [
      "barbell-bench-press",
      "barbell-squat",
      "lat-pulldown",
      "leg-press",
      "ab-wheel-rollout",
    ]) {
      expect(satisfies(getTraits(id).requires, owned), id).toBe(false);
    }
  });

  it("the home inventory still leaves a real training menu (>= 25 exercises)", () => {
    const owned = ownedCapabilities(homeInventory());
    const usable = ALL_EXERCISES.filter((ex) =>
      satisfies(getTraits(ex.id).requires, owned),
    );
    expect(usable.length).toBeGreaterThanOrEqual(25);
    // …and every movement pattern a full-body plan needs is reachable in it.
    const patterns = new Set(usable.map((ex) => getTraits(ex.id).pattern));
    for (const needed of [
      "horizontal_push",
      "vertical_push",
      "horizontal_pull",
      "vertical_pull",
      "squat",
      "hinge",
      "lunge",
      "core_anti_extension",
      "cardio_interval",
    ]) {
      expect(patterns.has(needed as never), `home menu lacks ${needed}`).toBe(
        true,
      );
    }
  });

  it("load ceilings and increments come from the owned item, not from the catalog", () => {
    const inventory = homeInventory();
    expect(maxLoadFor("dumbbell", inventory)).toBe(24);
    expect(incrementFor("dumbbell", inventory)).toBe(1);
    expect(maxLoadFor("barbell", inventory)).toBeNull();
    expect(incrementFor("barbell", inventory)).toBeNull();
  });

  it("an edited item overrides the preset (the user knows their own gear)", () => {
    const inventory = homeInventory();
    const dumbbells = inventory.find(
      (i) => i.presetId === "dumbbells-adjustable",
    )!;
    const edited: OwnedEquipment = {
      ...dumbbells,
      maxLoadKg: 32,
      incrementKg: 2,
    };
    const next = inventory.map((i) => (i.id === edited.id ? edited : i));
    expect(maxLoadFor("dumbbell", next)).toBe(32);
    expect(incrementFor("dumbbell", next)).toBe(2);
    void edited;
  });
});
