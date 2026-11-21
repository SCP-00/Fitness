/**
 * The measurement protocols are one catalogue, not two.
 *
 * Why this test exists at the root suite: the protocol text used to live only in
 * `bodylab/apps/web/src/lib/measurement-protocols.ts`, so TrainingLab — which has
 * to take the same measurements (plan T02/T05) — either duplicated it or showed a
 * number box with no answer to «¿dónde pongo la cinta?». The catalogue moved into
 * core on 2026-11-21 and the web module re-exports it; this test guards the
 * move, the drawing data and the coverage gap that has to stay visible.
 *
 * It does not repeat the web suite's job (that one checks the form's own type
 * lists). Here the subject is the *shared* module: structure, bilingual text,
 * citations, geometry inside the figure, and which canonical measurement types
 * have no girth/breadth/length protocol yet.
 */

import { describe, expect, it } from "vitest";
import {
  FIGURE,
  MEASUREMENT_PROTOCOLS,
  STANDARD_CONDITIONS,
  baseMeasurementId,
  protocolFor,
  sideOf,
  type MeasurementProtocol,
} from "../../bodylab/core/measurements/src/protocols";
import { MEASUREMENT_RANGES } from "../../bodylab/core/measurements/src/model";
import { MEASUREMENT_FACTS, NOT_A_SCAN } from "../../bodylab/core/measurements/src/facts";
import {
  MEASUREMENT_FACTS as FACTS_VIA_INDEX,
  MEASUREMENT_PROTOCOLS as VIA_ALIAS,
} from "../../bodylab/core/measurements/src/index";

/**
 * Canonical types core can store that are **not** a tape measurement: the
 * stature, the scale, and the two figures BodyLab derives from a formula. They
 * are declared here on purpose — a new one cannot appear silently.
 */
const NO_PROTOCOL_BY_DESIGN = ["height", "weight"];

const text = (value: { en: string; es: string } | undefined) =>
  Boolean(value && value.en.trim().length > 0 && value.es.trim().length > 0);

const inside = (point: { x: number; y: number }) =>
  point.x >= 0 && point.x <= FIGURE.width && point.y >= 0 && point.y <= FIGURE.height;

describe("measurement protocols: one shared catalogue", () => {
  it("is reachable from the core entry point, not only from the free path", () => {
    expect(VIA_ALIAS.length).toBe(MEASUREMENT_PROTOCOLS.length);
    expect(VIA_ALIAS[0]?.id).toBe(MEASUREMENT_PROTOCOLS[0]?.id);
  });

  it("every canonical site core can store has a protocol, and the exceptions are declared", () => {
    const withoutProtocol = Object.keys(MEASUREMENT_RANGES).filter(
      (type) => !protocolFor(type),
    );
    expect(withoutProtocol.sort()).toEqual([...NO_PROTOCOL_BY_DESIGN].sort());
  });

  it("has no duplicate ids and no side baked into an id", () => {
    const ids = MEASUREMENT_PROTOCOLS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(sideOf(id), `${id} must not carry a side in its base id`).toBeNull();
    }
  });

  it("prints label, landmark, orientation, posture, errors and a source in both languages", () => {
    const incomplete: string[] = [];
    for (const entry of MEASUREMENT_PROTOCOLS) {
      if (
        entry.label.es.trim().length === 0 ||
        entry.label.en.trim().length === 0 ||
        !text(entry.landmark) ||
        !text(entry.orientation) ||
        !text(entry.posture) ||
        entry.errors.length === 0 ||
        entry.errors.some((error) => !text(error)) ||
        entry.source.trim().length === 0
      ) {
        incomplete.push(entry.id);
      }
    }
    expect(incomplete).toEqual([]);
  });

  it("keeps every drawing inside the figure, with the points its kind needs", () => {
    const broken: string[] = [];
    for (const entry of MEASUREMENT_PROTOCOLS) {
      const diagram = entry.diagram;
      if (diagram.view !== "front" && diagram.view !== "side") {
        broken.push(`${entry.id}: view`);
        continue;
      }
      if (diagram.kind === "girth") {
        if (
          !diagram.center ||
          !inside(diagram.center) ||
          !diagram.rx ||
          !diagram.ry ||
          diagram.rx <= 0 ||
          diagram.ry <= 0
        ) {
          broken.push(`${entry.id}: girth`);
        }
      } else if (!diagram.from || !diagram.to || !inside(diagram.from) || !inside(diagram.to)) {
        broken.push(`${entry.id}: ${diagram.kind}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("resolves a bilateral pair to one protocol and says which side it was", () => {
    for (const entry of MEASUREMENT_PROTOCOLS) {
      const left = protocolFor(`${entry.id}_left`);
      const right = protocolFor(`${entry.id}_right`);
      expect(left?.id, `${entry.id}_left must resolve to its base`).toBe(entry.id);
      expect(right?.id, `${entry.id}_right must resolve to its base`).toBe(entry.id);
      expect(sideOf(`${entry.id}_left`)).toBe("left");
      expect(sideOf(`${entry.id}_right`)).toBe("right");
      expect(sideOf(entry.id)).toBeNull();
    }
    expect(baseMeasurementId("biceps_left")).toBe("biceps");
    expect(baseMeasurementId("biceps")).toBe("biceps");
  });

  it("states the standard conditions once, and they are bilingual", () => {
    expect(STANDARD_CONDITIONS.length).toBeGreaterThan(0);
    for (const condition of STANDARD_CONDITIONS) {
      expect(text(condition), "a condition missing one language is a silent gap").toBe(true);
    }
  });

  it("carries the unit and the limits of every number the app can store", () => {
    const stored = [...Object.keys(MEASUREMENT_RANGES), "body_fat_percentage", "lean_mass"];
    expect(Object.keys(FACTS_VIA_INDEX).sort()).toEqual([...stored].sort());
    expect(Object.keys(FACTS_VIA_INDEX).length).toBe(Object.keys(MEASUREMENT_FACTS).length);

    const expectedUnit: Record<string, string> = {
      height: "cm",
      weight: "kg",
      body_fat_percentage: "%",
      lean_mass: "kg",
    };
    for (const type of stored) {
      const facts = MEASUREMENT_FACTS[type];
      expect(facts, `${type} needs facts, not just a range`).toBeDefined();
      expect(facts.unit).toBe(expectedUnit[type] ?? "cm");
      expect(facts.claims.length).toBeGreaterThan(0);
      for (const claim of facts.claims) {
        expect(claim.statement.en.trim().length).toBeGreaterThan(0);
        expect(claim.statement.es.trim().length).toBeGreaterThan(0);
        expect(claim.source.trim().length).toBeGreaterThan(0);
        expect(["measured", "estimate", "not-supported"]).toContain(claim.verdict);
      }
    }
  });

  it("never labels a derived figure as measured", () => {
    for (const derived of ["body_fat_percentage", "lean_mass"]) {
      const verdicts = MEASUREMENT_FACTS[derived].claims.map((claim) => claim.verdict);
      expect(verdicts, `${derived} is computed, so it cannot be a direct reading`).not.toContain(
        "measured",
      );
    }
    for (const type of Object.keys(MEASUREMENT_RANGES)) {
      const first = MEASUREMENT_FACTS[type].claims[0];
      expect(first.verdict, `${type} is a direct reading`).toBe("measured");
    }
    expect(NOT_A_SCAN.verdict).toBe("not-supported");
  });

  it("says why it exists on every entry: the source line is never generic filler", () => {
    const seen = new Set<string>();
    for (const entry of MEASUREMENT_PROTOCOLS as MeasurementProtocol[]) {
      expect(entry.source.length, `${entry.id} needs a citable source`).toBeGreaterThan(8);
      seen.add(entry.source);
    }
    // Every source in the catalogue comes from the reviewed protocol document's
    // bibliography (F1 ISAK, F3 Hodgdon & Beckett, F5 Drillis), which is why the
    // set must stay small: a new free-text source is a new claim.
    expect(seen.size).toBeLessThanOrEqual(4);
  });
});
