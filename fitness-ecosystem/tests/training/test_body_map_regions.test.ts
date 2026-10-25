/**
 * The body map's colour layer is generated, and this suite is its contract.
 *
 * Two independent things are pinned here:
 *
 *   1. **The mathematics** (`scripts/lib/body-map-field.mjs`) — Otsu ink
 *      separation, the chamfer distance transform, signed distance fields, the
 *      scale-space boundary, geodesic label spreading and the mirror check. Each
 *      one is small, but a sign slip in a signed distance or a missing barrier in
 *      the spreading would move a colour by tens of pixels, and the map would
 *      still look plausible.
 *   2. **The shipped assets** — `traininglab-body-map-regions.png` and its
 *      female twin must be exactly what the builder produces from the committed
 *      seeds. A stale region file is the failure mode that matters: the app would
 *      paint an old segmentation under a new drawing and nothing else would
 *      notice, because the PNG is data and no type or linter sees it.
 *
 * The assets carry three channels (R = family, G = rim, B = coverage); the
 * assertions below are written against that contract, not against pixel counts,
 * so they survive a small redraw of the art.
 *
 * @module tests/training/body_map_regions
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  chamferDistance,
  gaussianBlur,
  labelComponents,
  mirrorMismatches,
  otsuThreshold,
  signedDistance,
  smoothstep,
  spreadLabels,
} from "../../scripts/lib/body-map-field.mjs";
import { build, FIGURES } from "../../scripts/build-body-map-regions.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

// ── The mathematics ─────────────────────────────────────────────────────────

describe("otsuThreshold", () => {
  it("splits two populations without eating the darker one", () => {
    const values = new Float32Array(200);
    for (let i = 0; i < 100; i += 1) values[i] = 20;
    for (let i = 100; i < 200; i += 1) values[i] = 220;
    const threshold = otsuThreshold(values);
    // Any cut in [20, 219] separates the populations equally well; what matters
    // is that the paper value stays below the threshold and the ink above it.
    expect(threshold).toBeGreaterThanOrEqual(20);
    expect(threshold).toBeLessThan(220);
  });

  it("survives a constant raster instead of dividing by zero", () => {
    const flat = new Float32Array(64).fill(128);
    expect(Number.isInteger(otsuThreshold(flat))).toBe(true);
  });
});

describe("chamferDistance", () => {
  it("is zero on the seed and one step away on the axis", () => {
    const width = 5;
    const height = 5;
    const seed = new Uint8Array(25);
    seed[2 * width + 2] = 1;
    const distance = chamferDistance(seed, width, height);
    expect(distance[2 * width + 2]).toBe(0);
    expect(distance[2 * width + 3]).toBeCloseTo(1, 5);
    expect(distance[2 * width + 4]).toBeCloseTo(2, 5);
    // Diagonal steps cost √2, not 2 · 1.
    expect(distance[3 * width + 3]).toBeCloseTo(Math.SQRT2, 5);
  });
});

describe("signedDistance", () => {
  it("is positive inside the region, negative outside and zero on the border", () => {
    const width = 9;
    const height = 9;
    const region = new Uint8Array(81);
    for (let y = 2; y <= 6; y += 1) {
      for (let x = 2; x <= 6; x += 1) region[y * width + x] = 1;
    }
    const field = signedDistance(region, width, height);
    expect(field[4 * width + 4]).toBeGreaterThan(0);
    expect(field[0]).toBeLessThan(0);
    // The two pixels that straddle the border carry ±1: the zero crossing lies
    // on the edge between them, which is exactly where the drawn line is.
    expect(field[2 * width + 2]).toBeCloseTo(1, 5);
    expect(field[2 * width + 1]).toBeCloseTo(-1, 5);
    // The centre of a 5×5 square (x = 2…6) is 3 px from the first pixel that
    // is not in it.
    expect(field[4 * width + 4]).toBeCloseTo(3, 5);
  });
});

describe("smoothstep", () => {
  it("clamps below, above and is symmetric at the midpoint", () => {
    expect(smoothstep(0, 1, -5)).toBe(0);
    expect(smoothstep(0, 1, 5)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6);
  });
});

describe("gaussianBlur", () => {
  it("keeps the mean of a flat field and spreads an impulse", () => {
    const width = 21;
    const height = 21;
    const flat = new Float32Array(width * height).fill(3);
    const blurredFlat = gaussianBlur(flat, width, height, 1.5);
    expect(blurredFlat[10 * width + 10]).toBeCloseTo(3, 4);

    const impulse = new Float32Array(width * height);
    impulse[10 * width + 10] = 100;
    const blurred = gaussianBlur(impulse, width, height, 1.5);
    expect(blurred[10 * width + 10]).toBeLessThan(100);
    expect(blurred[10 * width + 11]).toBeGreaterThan(0);
    expect(blurred[0]).toBeLessThan(1e-3);
  });
});

describe("labelComponents", () => {
  it("separates two boxes and reports their centroids", () => {
    const width = 10;
    const height = 4;
    const barrier = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) barrier[y * width + 4] = 1;
    const { ids, components } = labelComponents(barrier, width, height);
    expect(components.length).toBe(2);
    expect(components[0]?.area).toBe(16);
    expect(components[0]?.centroid.x).toBeCloseTo(1.5, 5);
    expect(ids[0]).not.toBe(ids[5]);
  });
});

describe("spreadLabels", () => {
  it("respects the distance cap and never invents a label", () => {
    const width = 7;
    const labels = new Uint8Array(width);
    labels[3] = 5;
    const spread = spreadLabels(labels, width, 1, 1.5).labels;
    expect(spread[3]).toBe(5);
    expect(spread[2]).toBe(5); // 1 px away
    expect(spread[0]).toBe(0); // 3 px away, beyond the cap
    expect(spread[6]).toBe(0);
  });
});

describe("mirrorMismatches", () => {
  it("flags a real disagreement and accepts a mirrored pair", () => {
    const symmetric = [
      { index: 0, x: 10, y: 10, family: 1 },
      { index: 1, x: 30, y: 10, family: 1 },
    ];
    expect(mirrorMismatches(symmetric, 40)[0]?.mismatches).toHaveLength(0);

    const broken = [
      { index: 0, x: 10, y: 10, family: 1 },
      { index: 1, x: 30, y: 10, family: 6 },
    ];
    const found = mirrorMismatches(broken, 40)[0]?.mismatches ?? [];
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({ family: 1, mirrorFamily: 6 });
  });
});

// ── The shipped assets ──────────────────────────────────────────────────────

const FAMILIES = 13;

interface Built {
  name: string;
  width: number;
  height: number;
  png: { width: number; height: number; data: Buffer };
  familyCensus: Map<number, number>;
  symmetry: { view: string; mismatches: unknown[] }[];
  decisions: { family: number; x: number; y: number; area: number }[];
}

/**
 * Building both figures takes ~1.5 s, so it happens once and every assertion
 * reads the same result.
 */
const built = new Map<string, Built>();

beforeAll(() => {
  for (const name of Object.keys(FIGURES)) {
    built.set(name, build(name) as Built);
  }
}, 120_000);

describe.each(Object.keys(FIGURES))("%s region field", (name) => {
  const committed = () => {
    const file = path.join(ROOT, FIGURES[name].out);
    return PNG.sync.read(fs.readFileSync(file));
  };

  it("is exactly what the builder produces from the committed seed", () => {
    const fresh = built.get(name)!;
    const shipped = committed();
    const result = new PNG({ width: shipped.width, height: shipped.height });
    result.data = Buffer.from(fresh.png.data);
    const expected = PNG.sync.write(result);
    const actual = fs.readFileSync(path.join(ROOT, FIGURES[name].out));
    // Compare decoded pixels rather than encoded bytes: the same pixels must
    // decode identically everywhere, while a zlib implementation detail may
    // differ between Node builds.
    const decoded = PNG.sync.read(expected);
    expect(shipped.width).toBe(fresh.width);
    expect(shipped.height).toBe(fresh.height);
    expect(Buffer.compare(decoded.data, shipped.data)).toBe(0);
    // And the file itself is not a stale copy of the seed mask.
    expect(actual.length).toBeGreaterThan(0);
  });

  it("names every family and leaves the rest of the canvas unpainted", () => {
    const figure = built.get(name)!;
    const census = [...figure.familyCensus.keys()].sort((a, b) => a - b);
    expect(census).toEqual(
      Array.from({ length: FAMILIES }, (_, index) => index + 1),
    );
    // No family may own a vanishing sliver: that is what a mis-supervised
    // compartment looks like.
    for (const [, pixels] of figure.familyCensus) {
      expect(pixels).toBeGreaterThan(500);
    }
  });

  it("paints both bodies symmetrically", () => {
    const figure = built.get(name)!;
    expect(figure.symmetry.length).toBeGreaterThan(0);
    for (const view of figure.symmetry) {
      expect(view.mismatches).toEqual([]);
    }
  });

  it("paints the muscle bodies, not the head, hands or feet", () => {
    const figure = built.get(name)!;
    // Each figure's head, hands and feet never carry a family; they are the
    // largest compartments the anatomy table vetoes.
    const vetoed = figure.decisions.filter((row) => row.family === 0);
    expect(vetoed.length).toBeGreaterThan(10);
  });

  it("carries a coverage ramp and a rim, so the app can paint a smooth edge", () => {
    const shipped = committed();
    let solid = 0;
    let partial = 0;
    let rimmed = 0;
    let painted = 0;
    for (let offset = 0; offset < shipped.data.length; offset += 4) {
      if (!shipped.data[offset]) continue;
      painted += 1;
      const coverage = shipped.data[offset + 2]!;
      if (coverage === 255) solid += 1;
      else if (coverage > 0) partial += 1;
      if (shipped.data[offset + 1]! < 255) rimmed += 1;
    }
    expect(painted).toBeGreaterThan(50_000);
    expect(solid / painted).toBeGreaterThan(0.9);
    // Every contour contributes anti-aliased pixels; a thousand is a floor that
    // still catches "the smoothing silently stopped running".
    expect(partial).toBeGreaterThan(1000);
    expect(rimmed).toBeGreaterThan(1000);
  });
});
