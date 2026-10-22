/**
 * The gear shelf — «casa» / «gimnasio» (2026-10-20).
 *
 * The owner's two rules are the reason this file exists, and both are about
 * *not losing things*:
 *
 *   1. **A new profile never deletes the previous inventory.** Somebody who
 *      names their home gear and then creates «Gimnasio» must still find the
 *      home items on the shelf, intact, when they switch back.
 *   2. **Switching does not rewrite his decisions.** Today's sequence, what was
 *      set aside, the week he authored and his routines survive a switch, because
 *      a switch is a fact about the room and not a plan edit.
 *
 * The rest pins the refusals, because a refusal that turns into a silent no-op is
 * the failure mode that looks like it worked.
 *
 * @module tests/training/test_gear_profiles
 */

import { describe, expect, it } from "vitest";
import { ownedFromPreset } from "@fitness/bodylab-exercises";
import {
  DEFAULT_SETTINGS,
  type TLSettingsData,
} from "../../traininglab/apps/desktop/src/lib/types";
import {
  activeGearName,
  freeGearName,
  gearShelf,
  normalizeGearProfiles,
  withGearProfileDelete,
  withGearProfileName,
  withGearProfileRename,
  withGearProfileSwitch,
  withNewGearProfile,
  type GearProfile,
} from "../../traininglab/apps/desktop/src/lib/gear-profiles";

function gear(...presets: string[]) {
  return presets
    .map((presetId, i) => ownedFromPreset(presetId, `item-${i}-${presetId}`))
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/** Settings with a named live setup and one parked «Gimnasio». */
function withShelf(over: Partial<TLSettingsData> = {}): TLSettingsData {
  const home = gear("dumbbells-adjustable", "bench");
  const gym: GearProfile = {
    id: "gym",
    name: "Gimnasio",
    inventory: gear("barbell-plates", "rack", "pullup-bar"),
  };
  return {
    ...DEFAULT_SETTINGS,
    inventory: home,
    activeGearProfile: { id: "home", name: "Casa" },
    gearProfiles: [gym],
    ...over,
  };
}

describe("gear profiles: reading the shelf honestly", () => {
  it("treats a record written before the field existed as one unnamed setup", () => {
    const shelf = gearShelf({ ...DEFAULT_SETTINGS, inventory: gear("bench") });
    expect(shelf.active).toBeNull();
    expect(shelf.parked).toEqual([]);
    expect(activeGearName(DEFAULT_SETTINGS)).toBeNull();
  });

  it("never lists the live setup as a parked one, even if a backup duplicates it", () => {
    // A hand-edited backup or an older exporter could put the active profile in
    // both places. Showing it twice would offer a switch that does nothing.
    const settings = withShelf({
      gearProfiles: [
        { id: "home", name: "Casa", inventory: gear("bench") },
        { id: "gym", name: "Gimnasio", inventory: [] },
      ],
    });
    const shelf = gearShelf(settings);
    expect(shelf.parked.map((p) => p.id)).toEqual(["gym"]);
  });

  it("drops malformed parked entries instead of blanking the shelf", () => {
    const raw = [
      { id: "gym", name: "Gimnasio", inventory: [] },
      { id: "", name: "Sin id" },
      { id: "x", name: "   " },
      { id: "gym", name: "Duplicado", inventory: [] },
      "no soy un perfil",
      null,
    ];
    expect(normalizeGearProfiles(raw).map((p) => p.id)).toEqual(["gym"]);
  });

  it("does not accept a bare string as an active profile", () => {
    expect(
      gearShelf({ ...DEFAULT_SETTINGS, activeGearProfile: "Casa" as never })
        .active,
    ).toBeNull();
  });
});

describe("gear profiles: naming the live setup", () => {
  it("names it without touching a single item", () => {
    const before = { ...DEFAULT_SETTINGS, inventory: gear("bench") };
    const out = withGearProfileName(before, "  Casa  ", "home");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settings.activeGearProfile).toEqual({
      id: "home",
      name: "Casa",
    });
    expect(out.settings.inventory).toEqual(before.inventory);
  });

  it("refuses a name with nothing in it", () => {
    const out = withGearProfileName(DEFAULT_SETTINGS, "   ", "home");
    expect(out).toEqual({ ok: false, rule: "name_empty" });
  });

  it("refuses a name another profile already has", () => {
    const settings = withShelf();
    const out = withNewGearProfile(settings, "gimnasio", "otro");
    expect(out).toEqual({ ok: false, rule: "name_taken" });
  });

  it("is a no-op when the name is already the one it has", () => {
    const settings = withShelf();
    const out = withGearProfileName(settings, "Casa", "nuevo-id");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settings).toBe(settings);
  });
});

describe("gear profiles: creating another room loses nothing", () => {
  it("parks the current items and starts the new setup empty", () => {
    const settings = withShelf();
    const out = withNewGearProfile(settings, "Viaje", "trip");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const shelf = gearShelf(out.settings);
    expect(out.settings.inventory).toEqual([]);
    expect(out.settings.activeGearProfile).toEqual({
      id: "trip",
      name: "Viaje",
    });
    // The home items are on the shelf, byte for byte.
    const parkedHome = shelf.parked.find((p) => p.id === "home");
    expect(parkedHome?.inventory).toEqual(settings.inventory);
    // And so is the room that was already parked.
    expect(shelf.parked.map((p) => p.name).sort()).toEqual([
      "Casa",
      "Gimnasio",
    ]);
  });

  it("refuses to start a second room when the live items have no name yet", () => {
    // There is no label to park them under, and inventing one would be the app
    // naming a room it has never seen.
    const settings = { ...DEFAULT_SETTINGS, inventory: gear("bench") };
    const out = withNewGearProfile(settings, "Gimnasio", "gym");
    expect(out).toEqual({ ok: false, rule: "name_current_first" });
  });

  it("allows a new empty room when there is nothing to park", () => {
    const out = withNewGearProfile(DEFAULT_SETTINGS, "Gimnasio", "gym");
    expect(out.ok).toBe(true);
  });
});

describe("gear profiles: switching", () => {
  it("loads the target's items and parks the ones in use", () => {
    const settings = withShelf();
    const out = withGearProfileSwitch(settings, "gym");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settings.activeGearProfile).toEqual({
      id: "gym",
      name: "Gimnasio",
    });
    expect(out.settings.inventory.map((i) => i.id)).toEqual(
      settings.gearProfiles![0]!.inventory.map((i) => i.id),
    );
    expect(gearShelf(out.settings).parked.map((p) => p.id)).toEqual(["home"]);
  });

  it("comes back to the first room with its items intact (round trip)", () => {
    const settings = withShelf();
    const there = withGearProfileSwitch(settings, "gym");
    expect(there.ok).toBe(true);
    if (!there.ok) return;
    const back = withGearProfileSwitch(there.settings, "home");
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.settings.inventory).toEqual(settings.inventory);
    expect(back.settings.activeGearProfile).toEqual({
      id: "home",
      name: "Casa",
    });
  });

  it("does not rewrite today's sequence, the marks, the week or the routines", () => {
    const settings = withShelf({
      rowOrder: {
        date: "2026-10-20",
        ids: ["goblet-squat", "barbell-bench-press"],
      },
      sessionAside: {
        date: "2026-10-20",
        skipped: ["goblet-squat"],
        postponed: [],
      },
      weekOverrides: { 0: { kind: "rest" } },
      routines: [],
      repOverrides: { "goblet-squat": { min: 6, max: 8 } },
    });
    const out = withGearProfileSwitch(settings, "gym");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settings.rowOrder).toEqual(settings.rowOrder);
    expect(out.settings.sessionAside).toEqual(settings.sessionAside);
    expect(out.settings.weekOverrides).toEqual(settings.weekOverrides);
    expect(out.settings.repOverrides).toEqual(settings.repOverrides);
    expect(out.settings.routines).toEqual(settings.routines);
  });

  it("refuses an unknown profile and leaves the settings by identity", () => {
    const settings = withShelf();
    const out = withGearProfileSwitch(settings, "no-existe");
    expect(out).toEqual({ ok: false, rule: "unknown_profile" });
  });
});

describe("gear profiles: renaming keeps the room as it was (2026-10-22)", () => {
  it("renames the live setup without touching its items or its id", () => {
    const settings = withShelf();
    const out = withGearProfileRename(settings, "home", "Casa del pueblo");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settings.activeGearProfile).toEqual({
      id: "home",
      name: "Casa del pueblo",
    });
    // Same items, byte for byte: a label is not an inventory edit.
    expect(out.settings.inventory).toEqual(settings.inventory);
    expect(gearShelf(out.settings).parked.map((p) => p.name)).toEqual([
      "Gimnasio",
    ]);
  });

  it("renames a parked setup in place, leaving the live one live", () => {
    const settings = withShelf();
    const before = gearShelf(settings).parked[0]!;
    const out = withGearProfileRename(settings, "gym", "  Gimnasio\n del barrio ");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const shelf = gearShelf(out.settings);
    // Whitespace collapses, the id stays, the items stay and the position stays.
    expect(shelf.parked.map((p) => ({ id: p.id, name: p.name }))).toEqual([
      { id: "gym", name: "Gimnasio del barrio" },
    ]);
    expect(shelf.parked[0]!.inventory).toEqual(before.inventory);
    expect(shelf.active).toEqual({ id: "home", name: "Casa" });
    expect(out.settings.inventory).toEqual(settings.inventory);
  });

  it("is a no-op when the name is the one it already has", () => {
    const settings = withShelf();
    const out = withGearProfileRename(settings, "gym", "gimnasio");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.settings).toBe(settings);
  });

  it("refuses an empty name, an unknown id and a name already in the other room", () => {
    const settings = withShelf();
    expect(withGearProfileRename(settings, "gym", "   ")).toEqual({
      ok: false,
      rule: "name_empty",
    });
    expect(withGearProfileRename(settings, "no-existe", "Viaje")).toEqual({
      ok: false,
      rule: "unknown_profile",
    });
    // Two chips with the same word would switch to different gear.
    expect(withGearProfileRename(settings, "gym", "Casa")).toEqual({
      ok: false,
      rule: "name_taken",
    });
    expect(withGearProfileRename(settings, "home", "Gimnasio")).toEqual({
      ok: false,
      rule: "name_taken",
    });
  });

  it("refuses a clash between two parked setups", () => {
    const settings = withShelf({
      gearProfiles: [
        { id: "gym", name: "Gimnasio", inventory: [] },
        { id: "trip", name: "Viaje", inventory: [] },
      ],
    });
    expect(withGearProfileRename(settings, "trip", "gimnasio")).toEqual({
      ok: false,
      rule: "name_taken",
    });
    expect(withGearProfileRename(settings, "trip", "Playa").ok).toBe(true);
  });

  it("a rename survives a switch, so the label follows the room", () => {
    const renamed = withGearProfileRename(withShelf(), "gym", "Gimnasio 2");
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    const switched = withGearProfileSwitch(renamed.settings, "gym");
    expect(switched.ok).toBe(true);
    if (!switched.ok) return;
    expect(switched.settings.activeGearProfile).toEqual({
      id: "gym",
      name: "Gimnasio 2",
    });
  });
});

describe("gear profiles: deleting only ever removes a parked one", () => {
  it("removes a parked room", () => {
    const out = withGearProfileDelete(withShelf(), "gym");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(gearShelf(out.settings).parked).toEqual([]);
    // The live items are untouched: deleting a room is not emptying yours.
    expect(out.settings.inventory).toHaveLength(2);
  });

  it("refuses the one in use", () => {
    expect(withGearProfileDelete(withShelf(), "home")).toEqual({
      ok: false,
      rule: "active_profile",
    });
  });

  it("refuses an id that is not on the shelf", () => {
    expect(withGearProfileDelete(withShelf(), "fantasma")).toEqual({
      ok: false,
      rule: "unknown_profile",
    });
  });
});

describe("gear profiles: the suggested name", () => {
  it("suggests the base name while it is free", () => {
    expect(freeGearName("Casa", gearShelf(DEFAULT_SETTINGS))).toBe("Casa");
  });

  it("counts up instead of colliding", () => {
    const shelf = gearShelf(withShelf());
    expect(freeGearName("Casa", shelf)).toBe("Casa 2");
    const two = gearShelf(
      withShelf({
        gearProfiles: [
          { id: "gym", name: "Gimnasio", inventory: [] },
          { id: "casa2", name: "Casa 2", inventory: [] },
        ],
      }),
    );
    expect(freeGearName("Casa", two)).toBe("Casa 3");
  });
});
