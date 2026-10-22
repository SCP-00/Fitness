/**
 * Every measurement the form offers has a protocol you can actually follow.
 *
 * The failure this prevents is silent and it happened before the protocols
 * existed (2026-10-20): a type was added to `MEASUREMENT_TYPES`, the field showed
 * up in the form, and the learner had a number box with no answer to *«¿dónde
 * pongo la cinta?»*. Reference ranges and a label are not a protocol.
 *
 * It also guards the drawing data, which no type check can: a band placed outside
 * the figure renders as an empty panel, and a breadth without two points renders
 * as nothing at all — both look like "the feature is broken" to the owner.
 */

import { describe, expect, it } from "vitest";
import {
  BREADTH_TYPES,
  CIRCUMFERENCE_TYPES,
  LENGTH_TYPES,
} from "../lib/constants";
import {
  FIGURE,
  MEASUREMENT_PROTOCOLS,
  STANDARD_CONDITIONS,
  baseMeasurementId,
  protocolFor,
  sideOf,
} from "../lib/measurement-protocols";

const inside = (x: number, y: number) =>
  x >= 0 && x <= FIGURE.width && y >= 0 && y <= FIGURE.height;

describe("measurement protocols: coverage", () => {
  it("covers every circumference, breadth and length the form offers", () => {
    const missing: string[] = [];
    for (const type of [
      ...CIRCUMFERENCE_TYPES,
      ...BREADTH_TYPES,
      ...LENGTH_TYPES,
    ]) {
      if (!protocolFor(type.id)) missing.push(type.id);
    }
    expect(missing).toEqual([]);
  });

  it("resolves a bilateral id to its base protocol and knows the side", () => {
    expect(baseMeasurementId("biceps_left")).toBe("biceps");
    expect(protocolFor("biceps_left")?.id).toBe(protocolFor("biceps")?.id);
    expect(sideOf("thigh_right")).toBe("right");
    expect(sideOf("thigh")).toBeNull();
  });

  it("has one entry per id, no duplicates", () => {
    const ids = MEASUREMENT_PROTOCOLS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("measurement protocols: the drawing can be drawn", () => {
  it("places every band and every segment inside the figure", () => {
    for (const protocol of MEASUREMENT_PROTOCOLS) {
      const d = protocol.diagram;
      if (d.kind === "girth") {
        expect(d.center, protocol.id).toBeTruthy();
        expect(inside(d.center!.x, d.center!.y), protocol.id).toBe(true);
        expect(d.rx ?? 0, protocol.id).toBeGreaterThan(0);
        expect(d.ry ?? 0, protocol.id).toBeGreaterThan(0);
      } else {
        expect(d.from, protocol.id).toBeTruthy();
        expect(d.to, protocol.id).toBeTruthy();
        expect(inside(d.from!.x, d.from!.y), protocol.id).toBe(true);
        expect(inside(d.to!.x, d.to!.y), protocol.id).toBe(true);
        // A zero-length segment is not a measurement.
        expect(
          Math.hypot(d.to!.x - d.from!.x, d.to!.y - d.from!.y),
          protocol.id,
        ).toBeGreaterThan(1);
      }
    }
  });

  it("draws shoulder width as a breadth, not as a tape around the body", () => {
    // The protocol document is explicit about this and it is the mistake the
    // app used to invite by filing `shoulders` under "circumference".
    expect(protocolFor("shoulders")?.diagram.kind).toBe("breadth");
  });
});

describe("measurement protocols: the text is usable", () => {
  it("is bilingual, specific and cites a source", () => {
    for (const protocol of MEASUREMENT_PROTOCOLS) {
      for (const lang of ["en", "es"] as const) {
        expect(
          protocol.label[lang].length,
          `${protocol.id}.label.${lang}`,
        ).toBeGreaterThan(2);
        expect(
          protocol.landmark[lang].length,
          `${protocol.id}.landmark.${lang}`,
        ).toBeGreaterThan(20);
        expect(
          protocol.orientation[lang].length,
          `${protocol.id}.orientation.${lang}`,
        ).toBeGreaterThan(15);
        expect(
          protocol.posture[lang].length,
          `${protocol.id}.posture.${lang}`,
        ).toBeGreaterThan(8);
        expect(protocol.errors.length, `${protocol.id}.errors`).toBeGreaterThan(
          0,
        );
        for (const error of protocol.errors) {
          expect(
            error[lang].length,
            `${protocol.id}.error.${lang}`,
          ).toBeGreaterThan(10);
        }
      }
      expect(protocol.source).toMatch(/F\d/);
    }
  });

  it("states the standard conditions once, in both languages", () => {
    expect(STANDARD_CONDITIONS.length).toBeGreaterThanOrEqual(4);
    for (const rule of STANDARD_CONDITIONS) {
      expect(rule.es.length).toBeGreaterThan(20);
      expect(rule.en.length).toBeGreaterThan(20);
    }
  });
});
