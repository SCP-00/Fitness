/**
 * Weekly templates — the three splits, their gear filtering and the promise
 * that applying one never touches what the user already saved.
 *
 * The suite runs against the real catalogue through `plannerCatalog()`, so a
 * template slot that references a family or a pattern the catalogue no longer
 * has fails here instead of shipping an empty routine.
 */
import { describe, expect, it } from "vitest";
import {
  ROUTINE_TEMPLATES,
  buildTemplateRoutines,
  templateById,
  type TemplateCandidate,
} from "../../traininglab/apps/desktop/src/lib/routine-templates";
import {
  ROUTINE_LIMITS,
  isKnownExercise,
} from "../../traininglab/apps/desktop/src/lib/routines";
import { plannerCatalog } from "../../traininglab/apps/desktop/src/lib/plan";

const NAME: Record<string, string> = {
  "ru.tpl.day.push": "Push",
  "ru.tpl.day.pull": "Pull",
  "ru.tpl.day.legs": "Legs",
  "ru.tpl.day.upper": "Upper",
  "ru.tpl.day.lower": "Lower",
  "ru.tpl.day.fullA": "Full body A",
  "ru.tpl.day.fullB": "Full body B",
};
const name = (key: string): string => NAME[key] ?? key;

const CATALOG = plannerCatalog();

describe("template catalogue", () => {
  it("offers the three splits the owner asked for", () => {
    expect(ROUTINE_TEMPLATES.map((template) => template.id).sort()).toEqual([
      "full_body",
      "ppl",
      "upper_lower",
    ]);
  });

  it("gives every split at least two days with slots", () => {
    for (const template of ROUTINE_TEMPLATES) {
      expect(template.days.length).toBeGreaterThanOrEqual(2);
      expect(template.days.length).toBe(template.daysPerWeek);
      for (const day of template.days) {
        expect(day.slots.length).toBeGreaterThan(0);
        for (const slot of day.slots) {
          expect(slot.sets).toBeGreaterThanOrEqual(ROUTINE_LIMITS.sets[0]);
          expect(slot.sets).toBeLessThanOrEqual(ROUTINE_LIMITS.sets[1]);
          expect(slot.repsMin).toBeLessThanOrEqual(slot.repsMax);
        }
      }
    }
  });

  it("uses a distinct i18n name for every day", () => {
    const keys = ROUTINE_TEMPLATES.flatMap((template) =>
      template.days.map((day) => day.nameKey),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("returns null for an unknown template id", () => {
    expect(templateById("bro-split")).toBeNull();
    expect(templateById("ppl")?.daysPerWeek).toBe(3);
  });
});

describe("buildTemplateRoutines", () => {
  it("builds every day of every split from the real catalogue", () => {
    for (const template of ROUTINE_TEMPLATES) {
      const built = buildTemplateRoutines(
        template,
        CATALOG,
        name,
        [],
        new Date("2026-10-23T10:00:00Z"),
      );
      expect(built.routines).toHaveLength(template.days.length);
      expect(built.skippedDays).toEqual([]);

      for (const routine of built.routines) {
        expect(routine.items.length).toBeGreaterThan(0);
        expect(routine.items.length).toBeLessThanOrEqual(ROUTINE_LIMITS.items);
        const ids = routine.items.map((item) => item.exerciseId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const item of routine.items) {
          expect(isKnownExercise(item.exerciseId)).toBe(true);
          expect(item.sets).toBeGreaterThanOrEqual(ROUTINE_LIMITS.sets[0]);
          expect(item.sets).toBeLessThanOrEqual(ROUTINE_LIMITS.sets[1]);
          expect(item.repsMin).toBeLessThanOrEqual(item.repsMax);
          expect(item.rir).toBeGreaterThanOrEqual(ROUTINE_LIMITS.rir[0]);
          expect(item.rir).toBeLessThanOrEqual(ROUTINE_LIMITS.rir[1]);
        }
      }
    }
  });

  it("is deterministic for the same catalogue and clock", () => {
    const template = ROUTINE_TEMPLATES[0]!;
    const now = new Date("2026-10-23T10:00:00Z");
    const first = buildTemplateRoutines(template, CATALOG, name, [], now);
    const second = buildTemplateRoutines(template, CATALOG, name, [], now);
    expect(first.routines.map((routine) => routine.name)).toEqual(
      second.routines.map((routine) => routine.name),
    );
    expect(
      first.routines.map((routine) =>
        routine.items.map((item) => item.exerciseId),
      ),
    ).toEqual(
      second.routines.map((routine) =>
        routine.items.map((item) => item.exerciseId),
      ),
    );
  });

  it("picks the slot's pattern when the catalogue has it", () => {
    const template = templateById("ppl")!;
    const built = buildTemplateRoutines(template, CATALOG, name);
    const push = built.routines[0]!;
    // The first slot is a horizontal chest press; whatever exercise wins must
    // be a press, not a fly or a push-up variation chosen by id order.
    const first = CATALOG.find(
      (entry) => entry.exercise.id === push.items[0]!.exerciseId,
    )!;
    expect(first.traits.pattern).toBe("horizontal_push");
    expect(first.families).toContain("chest");
    // An anchor slot (4 sets) prefers a loadable movement when the user owns
    // one: the template exists to progress, and a bench has more runway than a
    // push-up variation.
    expect(first.traits.loadType).not.toBe("bodyweight");
  });

  it("never overwrites an existing routine name", () => {
    const template = templateById("ppl")!;
    const existing = ["Push", "Legs"];
    const built = buildTemplateRoutines(template, CATALOG, name, existing);
    expect(built.routines.map((routine) => routine.name)).toEqual([
      "Push · 2",
      "Pull",
      "Legs · 2",
    ]);
    // The caller's array is read-only input; the module must not mutate it.
    expect(existing).toEqual(["Push", "Legs"]);
  });

  it("reports slots the user's gear cannot fill instead of inventing them", () => {
    // A bodyweight-only inventory: everything else is filtered out the way the
    // planner filters it, so the template has to cope with holes.
    const bodyweight: TemplateCandidate[] = CATALOG.filter(
      (entry) => entry.traits.requires.length === 0,
    );
    expect(bodyweight.length).toBeGreaterThan(5);

    const template = templateById("ppl")!;
    const built = buildTemplateRoutines(template, bodyweight, name);

    for (const routine of built.routines) {
      for (const item of routine.items) {
        const entry = bodyweight.find(
          (candidate) => candidate.exercise.id === item.exerciseId,
        );
        expect(entry).toBeDefined();
        expect(entry!.traits.requires).toEqual([]);
      }
    }
    // The push day has no bodyweight triceps isolation in the catalogue's
    // pattern set, so at least one honest gap is expected on limited gear.
    expect(built.gaps.length).toBeGreaterThan(0);
    for (const gap of built.gaps) {
      expect(gap.dayNameKey.startsWith("ru.tpl.day.")).toBe(true);
    }
  });

  it("produces nothing for an empty catalogue, without throwing", () => {
    const built = buildTemplateRoutines(ROUTINE_TEMPLATES[0]!, [], name);
    expect(built.routines).toEqual([]);
    expect(built.skippedDays).toHaveLength(3);
    expect(built.gaps.length).toBeGreaterThan(0);
  });
});
