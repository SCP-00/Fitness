/**
 * *Saltar* y *Posponer* — the pure half (2026-10-15).
 *
 * The session's top bar draws two escape hatches and the owner's constraint on
 * both was one sentence: **que no cambien el plan de hoy en silencio**. So the
 * rules live here, away from React, and every one of them is a promise about what
 * the two gestures must NOT touch:
 *
 *   1. they are **marks**, keyed by day like the sequence (`settings.sessionAside`),
 *      so they ride settings through IndexedDB, the backup and `normalizeSettings`,
 *      and yesterday's decision is not an instruction for today;
 *   2. the rows they act on keep their prescription, their position in the week and
 *      their sets — *Posponer* moves a row to the end of **today's session**, and it
 *      is a permutation, never a filter: an exercise that vanished from the list
 *      would be a plan edited behind his back;
 *   3. undoing is deleting one id, so both buttons are safe to tap, and an exercise
 *      cannot be "later" and "not today" at the same time.
 */

import { describe, expect, it } from "vitest";
import {
  applyPostponements,
  sessionAsideFor,
  withRowPostpone,
  withRowSkip,
} from "../../traininglab/apps/desktop/src/lib/settings";
import { normalizeSettings } from "../../traininglab/apps/desktop/src/lib/db";
import {
  DEFAULT_SETTINGS,
  type TLSettingsData,
} from "../../traininglab/apps/desktop/src/lib/types";
import type { PlannedRow } from "../../traininglab/apps/desktop/src/lib/plan";

const DAY = "2026-10-15";
const OTHER_DAY = "2026-10-16";

/** A row that only needs to be recognisable — marks are the subject here. */
function row(exerciseId: string): PlannedRow {
  return {
    exerciseId,
    name: { en: exerciseId, es: exerciseId },
    pattern: "horizontal_push",
    families: ["chest"],
    progression: ["load"],
    loadType: "barbell",
    unilateral: false,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    rir: 2,
    restSec: 90,
    minutes: 9,
    reasons: [],
    jointStress: 1,
    spineLoad: 1,
  };
}

const ids = (rows: PlannedRow[]) => rows.map((r) => r.exerciseId);

const plan = () => [row("bench"), row("row"), row("squat"), row("curl")];

const base = (): TLSettingsData => ({ ...DEFAULT_SETTINGS });

describe("lo que hoy queda apartado", () => {
  it("no hay nada apartado mientras nadie lo aparte", () => {
    const settings = base();
    expect(sessionAsideFor(settings, DAY)).toEqual({
      skipped: [],
      postponed: [],
    });
    // Y sin marcas, la derivación devuelve las filas por identidad: el caso
    // común no asigna nada.
    const rows = plan();
    expect(applyPostponements(settings, rows, DAY)).toBe(rows);
  });

  it("*Saltar* deja la marca y nada más: ni borra la fila ni la saca del plan", () => {
    const settings = withRowSkip(base(), DAY, "row");
    expect(sessionAsideFor(settings, DAY).skipped).toEqual(["row"]);
    expect(sessionAsideFor(settings, DAY).postponed).toEqual([]);
    // La fila sigue exactamente donde estaba, con su prescripción.
    const rows = plan();
    expect(applyPostponements(settings, rows, DAY)).toBe(rows);
    // Y el plan de la semana no se toca: no hay ninguna otra colección escrita.
    expect(settings.rowOrder ?? null).toBeNull();
    expect(settings.weekOverrides).toEqual({});
  });

  it("*Posponer* manda al final, en el orden en que se pospuso", () => {
    let settings = withRowPostpone(base(), DAY, "bench");
    settings = withRowPostpone(settings, DAY, "row");
    expect(ids(applyPostponements(settings, plan(), DAY))).toEqual([
      "squat",
      "curl",
      "bench",
      "row",
    ]);
    expect(sessionAsideFor(settings, DAY).postponed).toEqual(["bench", "row"]);
  });

  it("posponer es una permutación, nunca un filtro", () => {
    const rows = plan();
    const settings = withRowPostpone(base(), DAY, "squat");
    const out = applyPostponements(settings, rows, DAY);
    expect(out).toHaveLength(rows.length);
    expect([...ids(out)].sort()).toEqual([...ids(rows)].sort());
    expect(out.at(-1)!.exerciseId).toBe("squat");
  });

  it("las marcas caducan con el día", () => {
    const settings = withRowSkip(
      withRowPostpone(base(), DAY, "row"),
      DAY,
      "curl",
    );
    expect(sessionAsideFor(settings, OTHER_DAY)).toEqual({
      skipped: [],
      postponed: [],
    });
    const rows = plan();
    expect(applyPostponements(settings, rows, OTHER_DAY)).toBe(rows);
    // Y la primera marca de hoy abre un registro nuevo, sin arrastrar las de ayer.
    const tomorrow = withRowSkip(settings, OTHER_DAY, "bench");
    expect(sessionAsideFor(tomorrow, OTHER_DAY)).toEqual({
      skipped: ["bench"],
      postponed: [],
    });
    expect(tomorrow.sessionAside!.date).toBe(OTHER_DAY);
    expect(sessionAsideFor(tomorrow, DAY)).toEqual({
      skipped: [],
      postponed: [],
    });
  });

  it("deshacer es borrar un id, y sin ids no queda registro", () => {
    const skipped = withRowSkip(base(), DAY, "row");
    const undone = withRowSkip(skipped, DAY, "row", false);
    expect(sessionAsideFor(undone, DAY)).toEqual({
      skipped: [],
      postponed: [],
    });
    // Sin registro fantasma: un estado vacío que se dibuja como estado es peor
    // que no tener estado.
    expect(undone.sessionAside).toBeNull();

    const postponed = withRowPostpone(skipped, DAY, "squat");
    expect(undone).not.toBe(skipped);
    const back = withRowPostpone(postponed, DAY, "squat", false);
    expect(sessionAsideFor(back, DAY).skipped).toEqual(["row"]);
    expect(sessionAsideFor(back, DAY).postponed).toEqual([]);
  });

  it("un ejercicio no puede estar pospuesto y apartado a la vez", () => {
    const postponed = withRowPostpone(base(), DAY, "row");
    const thenSkipped = withRowSkip(postponed, DAY, "row");
    expect(sessionAsideFor(thenSkipped, DAY)).toEqual({
      skipped: ["row"],
      postponed: [],
    });
    const thenPostponed = withRowPostpone(thenSkipped, DAY, "row");
    expect(sessionAsideFor(thenPostponed, DAY)).toEqual({
      skipped: [],
      postponed: ["row"],
    });
  });

  it("ignora basura: ids vacíos no se guardan y un id repetido no se duplica", () => {
    let settings = withRowSkip(base(), DAY, "   ");
    expect(settings.sessionAside ?? null).toBeNull();
    settings = withRowSkip(base(), DAY, " row ");
    expect(sessionAsideFor(settings, DAY).skipped).toEqual(["row"]);
    settings = withRowSkip(settings, DAY, "row");
    expect(sessionAsideFor(settings, DAY).skipped).toEqual(["row"]);
  });

  it("un id que hoy ya no existe no mueve nada", () => {
    const settings = withRowPostpone(base(), DAY, "ghost");
    const rows = plan();
    expect(applyPostponements(settings, rows, DAY)).toBe(rows);
  });

  it("un registro editado a mano que solape las dos listas se lee como apartado", () => {
    const settings: TLSettingsData = {
      ...DEFAULT_SETTINGS,
      sessionAside: {
        date: DAY,
        skipped: ["row"],
        postponed: ["row", "curl"],
      },
    };
    // «No hoy» es la promesa más ancha de las dos, y es la que se respeta.
    expect(sessionAsideFor(settings, DAY)).toEqual({
      skipped: ["row"],
      postponed: ["curl"],
    });
  });

  it("la marca sobrevive a `normalizeSettings` (IndexedDB, copia, importación)", () => {
    const settings = withRowSkip(
      withRowPostpone(base(), DAY, "curl"),
      DAY,
      "row",
    );
    const round = normalizeSettings(
      JSON.parse(JSON.stringify(settings)) as TLSettingsData,
    );
    expect(sessionAsideFor(round, DAY)).toEqual({
      skipped: ["row"],
      postponed: ["curl"],
    });
  });
});
