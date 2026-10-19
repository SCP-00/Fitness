import { describe, expect, it } from "vitest";
import {
  DEMO_PREFIX,
  buildDemoBackup,
  isDemoId,
} from "../../traininglab/apps/desktop/src/lib/demo";

/**
 * The sample history is the surface the redesigned screens are reviewed on, so
 * the properties that make it *usable* are the ones worth pinning down:
 *
 *   * it must be reproducible — the ids are the merge key, so a demo that
 *     generated different ids on every load would pile up duplicates instead of
 *     being idempotent;
 *   * it must never contain the future — a set stamped after `now` makes the
 *     elapsed pill read `00:00` and every "hours since" come out negative (this
 *     is not hypothetical: the first version floored the clock hour and put the
 *     whole of today 3.7 h ahead at 01:22);
 *   * it must be removable — every id carries the demo prefix, and nothing else
 *     in the app produces it.
 */
const NOW = new Date(2026, 9, 11, 1, 22, 0); // 01:22 local, the hour that broke it

describe("demo history", () => {
  it("is deterministic for the same clock", () => {
    const a = buildDemoBackup({ now: NOW });
    const b = buildDemoBackup({ now: NOW });
    expect(a.sets.map((s) => s.id)).toEqual(b.sets.map((s) => s.id));
    expect(a.sets.map((s) => s.timestamp)).toEqual(
      b.sets.map((s) => s.timestamp),
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("never logs a set after now, whatever the hour", () => {
    for (const hour of [0, 1, 5, 12, 18, 23]) {
      const now = new Date(2026, 9, 11, hour, 30, 0);
      const backup = buildDemoBackup({ now });
      const future = backup.sets.filter(
        (set) => new Date(set.timestamp).getTime() > now.getTime(),
      );
      expect(future, `hour ${hour}`).toHaveLength(0);
    }
  });

  it("mints every id with the removable demo prefix", () => {
    const backup = buildDemoBackup({ now: NOW });
    for (const row of backup.sets) {
      expect(isDemoId(row.id)).toBe(true);
      expect(row.id.startsWith(DEMO_PREFIX)).toBe(true);
    }
    for (const row of backup.sessions) expect(isDemoId(row.id)).toBe(true);
    for (const row of backup.health) expect(isDemoId(row.id)).toBe(true);
    expect(isDemoId("set-abc-123")).toBe(false);
  });

  it("leaves today's session open and every earlier one closed", () => {
    const backup = buildDemoBackup({ now: NOW });
    const sorted = [...backup.sessions].sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    );
    const last = sorted.at(-1)!;
    expect(last.completedAt).toBeNull();
    expect(
      sorted.slice(0, -1).every((session) => session.completedAt !== null),
    ).toBe(true);
  });

  it("gives six weeks of history with a training day for today", () => {
    const backup = buildDemoBackup({ now: NOW });
    const days = new Set(backup.sets.map((s) => s.timestamp.slice(0, 10)));
    expect(days.size).toBeGreaterThan(15);
    const today = backup.sets.filter(
      (s) => new Date(s.timestamp).getDate() === NOW.getDate(),
    );
    // Today is a session in progress, not a rest day: the screen that shows it
    // is the one being reviewed, so a rest day every seventh date would hide it.
    expect(today.length).toBeGreaterThan(0);
  });

  it("keeps every logged weight on a half-kilo step", () => {
    const backup = buildDemoBackup({ now: NOW });
    const loaded = backup.sets.filter(
      (set) => set.weight !== null && set.weight > 0,
    );
    expect(loaded.length).toBeGreaterThan(50);
    for (const set of loaded) {
      expect((set.weight! * 2) % 1, `${set.id} ${set.weight}`).toBe(0);
    }
  });

  it("logs timed holds as seconds rather than kilos", () => {
    const backup = buildDemoBackup({ now: NOW });
    const holds = backup.sets.filter((set) => set.durationSec !== undefined);
    expect(holds.length).toBeGreaterThan(0);
    for (const hold of holds) expect(hold.weight).toBeNull();
  });

  it("carries the settings the session needs (gear, budget, days)", () => {
    const backup = buildDemoBackup({ now: NOW });
    expect(backup.settings?.inventory.length).toBeGreaterThan(4);
    expect(backup.settings?.timeBudgetMin).toBeGreaterThan(0);
    expect(backup.settings?.daysPerWeek).toBeGreaterThan(0);
  });

  it("only ever names exercises that exist in the shared catalogue", async () => {
    const catalog = await import("@fitness/bodylab-exercises");
    const ids = new Set(catalog.ALL_EXERCISES.map((e) => e.id));
    const backup = buildDemoBackup({ now: NOW });
    const unknown = [...new Set(backup.sets.map((s) => s.exerciseId))].filter(
      (id) => !ids.has(id),
    );
    expect(unknown).toEqual([]);
  });

  it("trains each primary family on one day a week, inside its ceiling", async () => {
    /*
     * The property that makes the demo usable, and the one the first version
     * got wrong: a family trained on several days of the week lands in the
     * recovery window *and* over the weekly ceiling, and the planner then
     * answers with nothing — which reads as a broken app on the very screens
     * the sample data exists to review.
     *
     * The accounting is the app's own: primary family is `families[0]` of the
     * shared catalogue entry, exactly as `plannerCatalog()` computes it. Counting
     * every muscle a movement touches (the first attempt here) inflates biceps to
     * 49 sets a week and measures nothing the planner cares about.
     */
    const { plannerCatalog } = await import(
      "../../traininglab/apps/desktop/src/lib/plan"
    );
    const primaryOf = new Map(
      plannerCatalog().map((entry) => [entry.exercise.id, entry.families[0]]),
    );
    const backup = buildDemoBackup({ now: NOW });
    const perFamily = new Map<string, number>();
    const since = NOW.getTime() - 7 * 24 * 60 * 60 * 1000;
    for (const set of backup.sets) {
      if (set.warmup) continue;
      if (new Date(set.timestamp).getTime() < since) continue;
      const family = primaryOf.get(set.exerciseId);
      if (!family) continue;
      perFamily.set(family, (perFamily.get(family) ?? 0) + 1);
    }

    const over = [...perFamily.entries()].filter(([, sets]) => sets > 18);
    expect(
      over,
      `primary families above the intermediate weekly ceiling: ${JSON.stringify(over)}`,
    ).toEqual([]);
    // And it is not a trivial pass: the week really does train something.
    expect(perFamily.size).toBeGreaterThan(6);
  });
});
