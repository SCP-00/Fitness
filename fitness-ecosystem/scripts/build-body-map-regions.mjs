/**
 * Build the TrainingLab anatomical-map region field from a line drawing.
 *
 * The map's colour layer is generated, not hand-traced. For each figure this
 * script:
 *
 *   1. **Separates ink from paper** with an Otsu threshold on luminance, with
 *      the polarity read from the corners of the drawing (the male art is
 *      dark-on-white, the woman's light-on-dark).
 *   2. **Partitions the drawing into its closed compartments.** The line work
 *      is a real partition: every drawn muscle head is enclosed by ink. A
 *      connected-component labelling of the non-ink pixels therefore recovers
 *      the artist's own segmentation — a shape, not a guess.
 *   3. **Names each compartment.** The existing hand-made mask provides the
 *      votes (a compartment is painted by the family that owns most of its
 *      seed pixels). A compartment the mask never named — the middle head of a
 *      hamstring, the serratus slips — inherits the family of the compartment
 *      it shares the longest ink boundary with, transitively, which is the same
 *      anatomical group by construction. Anything that cannot be named from
 *      evidence stays **unpainted**: no invented muscle.
 *   4. **Extends the paint under the drawn line** (2 px, through ink) so the
 *      colour reaches the contour instead of stopping a pixel short and leaving
 *      a dark gutter.
 *   5. **Smooths the boundary with a scale-space model.** Each family becomes a
 *      signed distance field; the field is blurred with a Gaussian of σ pixels
 *      and re-thresholded with a Hermite smoothstep. Blurring an SDF and taking
 *      the zero level is mean-curvature flow: the contour keeps its place where
 *      it is straight and relaxes where it is jagged, turning a one-pixel
 *      staircase into a curve. The memberships are then renormalised into a
 *      partition of unity, which is what makes the anti-aliased edge independent
 *      of how many families meet there.
 *   6. **Bakes the two extra channels the map needs**: a *coverage* byte (the
 *      anti-aliased membership, so the app can fade the edge instead of
 *      stepping it) and a *rim* byte (distance to the nearest ink, so the app
 *      can shade each muscle's edge and the muscle reads as a volume). The red
 *      channel keeps the family id 1–13 the app has always read.
 *
 * Usage (from `fitness-ecosystem/`):
 *
 *   node scripts/build-body-map-regions.mjs [--figure male|female]
 *        [--sigma 1.2] [--preview <dir>] [--diagnostics <file>] [--dry-run]
 *
 * Both figures are rebuilt by default. The script prints a per-family census
 * and every naming decision, so a silent failure (an empty family, a
 * compartment named by a two-pixel accident) is visible in the log.
 *
 * Evidence lives in `scripts/body-map-seeds/` (the hand-traced male regions and
 * the landmark-warped female ones); the app reads only the generated files in
 * `traininglab/apps/desktop/public/`. Never point `--mask` style inputs at the
 * output — a build that seeds from its own previous output drifts.
 *
 * @module scripts/build-body-map-regions
 */

import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chamferDistance,
  gaussianBlur,
  labelComponents,
  luminance,
  mirrorMismatches,
  otsuThreshold,
  signedDistance,
  smoothstep,
  spreadLabels,
} from "./lib/body-map-field.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const valueOf = (name, fallback) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

/** Family ids: the contract shared with `features/stats/BodyMap.tsx`. */
const FAMILY = {
  chest: 1,
  shoulders: 2,
  triceps: 3,
  biceps: 4,
  forearms: 5,
  lats: 6,
  traps: 7,
  rhomboids: 8,
  core: 9,
  glutes: 10,
  quadriceps: 11,
  hamstrings: 12,
  calves: 13,
};

/**
 * Anatomy the mask never reached, as points inside the compartment they belong
 * to. Each entry is a *vote for the compartment that contains the point*, never
 * a freehand shape: the ink still bounds the result. `note` says what the
 * structure is, so the table can be audited against the drawing.
 */
const ANATOMY_SEEDS = {
  male: [
    {
      x: 176,
      y: 337,
      family: FAMILY.chest,
      note: "serratus anterior slip, front view",
    },
    {
      x: 314,
      y: 337,
      family: FAMILY.chest,
      note: "serratus anterior slip, front view",
    },
    {
      x: 180,
      y: 426,
      family: FAMILY.core,
      note: "external oblique, front view",
    },
    {
      x: 309,
      y: 426,
      family: FAMILY.core,
      note: "external oblique, front view",
    },
    {
      x: 162,
      y: 465,
      family: FAMILY.core,
      note: "external oblique, lower slip",
    },
    {
      x: 327,
      y: 465,
      family: FAMILY.core,
      note: "external oblique, lower slip",
    },
    { x: 244, y: 444, family: FAMILY.core, note: "lower rectus abdominis" },
    {
      x: 200,
      y: 631,
      family: FAMILY.quadriceps,
      note: "quadriceps, distal head",
    },
    {
      x: 288,
      y: 631,
      family: FAMILY.quadriceps,
      note: "quadriceps, distal head",
    },
  ],
  female: [
    {
      x: 419,
      y: 317,
      family: FAMILY.chest,
      note: "serratus anterior slip, front view",
    },
    {
      x: 520,
      y: 317,
      family: FAMILY.chest,
      note: "serratus anterior slip, front view",
    },
    {
      x: 419,
      y: 344,
      family: FAMILY.core,
      note: "external oblique, front view",
    },
    {
      x: 520,
      y: 344,
      family: FAMILY.core,
      note: "external oblique, front view",
    },
    {
      x: 550,
      y: 589,
      family: FAMILY.quadriceps,
      note: "quadriceps, distal head",
    },
  ],
};

/**
 * Decisions taken by looking at the drawing, after the automatic pass.
 *
 * `family: 0` means "this compartment is not a muscle of the five-family
 * vocabulary and must stay unpainted". Every entry names what the structure
 * actually is, so the table can be audited against the drawing: the head and
 * face, the nape of the neck, the hair, the hands, the feet, the patella, the
 * popliteal fossa, the pubic region and the adductor group (the map has no
 * family for it, and calling it quadriceps would overstate the quads).
 *
 * Entries are matched to the nearest compartment centroid within 10 px, so they
 * survive small rebuilds of the same drawing; an entry that matches nothing
 * prints a warning instead of failing silently.
 */
const NAMING_OVERRIDES = {
  male: [
    { x: 247, y: 72, family: 0, note: "head and face, front view" },
    { x: 796, y: 63, family: 0, note: "head, back view" },
    { x: 225, y: 158, family: 0, note: "neck, sternocleidomastoid strip" },
    { x: 268, y: 157, family: 0, note: "neck, sternocleidomastoid strip" },
    { x: 246, y: 160, family: 0, note: "neck, midline column" },
    { x: 198, y: 174, family: 0, note: "clavicle, upper trapezius edge" },
    { x: 282, y: 175, family: 0, note: "sternal notch" },
    { x: 305, y: 172, family: 0, note: "clavicle, upper trapezius edge" },
    { x: 768, y: 122, family: 0, note: "nape of the neck" },
    { x: 824, y: 123, family: 0, note: "nape of the neck" },
    { x: 726, y: 174, family: 0, note: "upper trapezius edge, back view" },
    { x: 865, y: 174, family: 0, note: "upper trapezius edge, back view" },
    { x: 244, y: 496, family: 0, note: "pubic region, no muscle family" },
    { x: 213, y: 523, family: 0, note: "adductor group, no family in the map" },
    { x: 276, y: 521, family: 0, note: "adductor group, no family in the map" },
    { x: 232, y: 574, family: 0, note: "adductor group, no family in the map" },
    { x: 257, y: 573, family: 0, note: "adductor group, no family in the map" },
    { x: 45, y: 537, family: 0, note: "hand, front view" },
    { x: 445, y: 537, family: 0, note: "hand, front view" },
    { x: 993, y: 505, family: 0, note: "wrist, back view" },
    { x: 1007, y: 538, family: 0, note: "hand, back view" },
    { x: 981, y: 541, family: 0, note: "hand, back view" },
    { x: 997, y: 544, family: 0, note: "hand, back view" },
    { x: 594, y: 584, family: 0, note: "fingers, back view" },
    { x: 998, y: 584, family: 0, note: "fingers, back view" },
    { x: 171, y: 708, family: 0, note: "patella, front view" },
    { x: 316, y: 708, family: 0, note: "patella, front view" },
    { x: 204, y: 709, family: 0, note: "patellar tendon, front view" },
    { x: 283, y: 709, family: 0, note: "patellar tendon, front view" },
    {
      x: 726,
      y: 242,
      family: 0,
      note: "scapular fossa (infraspinatus), back view",
    },
    {
      x: 865,
      y: 242,
      family: 0,
      note: "scapular fossa (infraspinatus), back view",
    },
    // The hand mask labels the same oblique slip chest on one side and core on
    // the other. Both are the external oblique: symmetric bodies cannot carry
    // two different families at mirrored positions.
    {
      x: 181,
      y: 377,
      family: 9,
      note: "external oblique slip (mirror correction)",
    },
    {
      x: 309,
      y: 377,
      family: 9,
      note: "external oblique slip (mirror correction)",
    },
    { x: 156, y: 913, family: 0, note: "ankle, front view" },
    { x: 183, y: 917, family: 0, note: "ankle, front view" },
    { x: 307, y: 943, family: 0, note: "foot, front view" },
    { x: 330, y: 913, family: 0, note: "ankle, front view" },
    { x: 330, y: 943, family: 0, note: "foot, front view" },
    { x: 170, y: 949, family: 0, note: "foot, front view" },
    { x: 152, y: 980, family: 0, note: "foot, front view" },
    { x: 333, y: 981, family: 0, note: "foot, front view" },
    { x: 746, y: 937, family: 0, note: "heel, back view" },
    { x: 732, y: 981, family: 0, note: "foot, back view" },
    { x: 858, y: 982, family: 0, note: "foot, back view" },
    { x: 703, y: 977, family: 0, note: "foot, back view" },
    { x: 887, y: 977, family: 0, note: "foot, back view" },
  ],
  female: [
    { x: 472, y: 99, family: 0, note: "face" },
    { x: 1063, y: 105, family: 0, note: "hair, back view" },
    { x: 1027, y: 53, family: 0, note: "hair, crown" },
    { x: 1021, y: 74, family: 0, note: "hair, crown" },
    { x: 1095, y: 110, family: 0, note: "hair strand" },
    { x: 1029, y: 116, family: 0, note: "ear and hair strand" },
    { x: 471, y: 189, family: 0, note: "neck" },
    { x: 455, y: 201, family: 0, note: "neck and clavicle" },
    { x: 487, y: 201, family: 0, note: "neck and clavicle" },
    { x: 437, y: 203, family: 0, note: "neck and clavicle" },
    { x: 507, y: 205, family: 0, note: "neck and clavicle" },
    { x: 469, y: 490, family: 0, note: "pubic region, no muscle family" },
    { x: 294, y: 544, family: 0, note: "hand" },
    { x: 635, y: 544, family: 0, note: "hand" },
    { x: 418, y: 715, family: 0, note: "patella" },
    { x: 518, y: 715, family: 0, note: "patella" },
    { x: 999, y: 715, family: 0, note: "popliteal fossa" },
    { x: 1116, y: 715, family: 0, note: "popliteal fossa" },
    { x: 434, y: 794, family: 13, note: "tibialis anterior, front view" },
    { x: 502, y: 794, family: 13, note: "tibialis anterior, front view" },
    {
      x: 414,
      y: 317,
      family: 9,
      note: "external oblique slip (mirror correction)",
    },
    {
      x: 525,
      y: 317,
      family: 9,
      note: "external oblique slip (mirror correction)",
    },
    { x: 413, y: 966, family: 0, note: "foot, front view" },
    { x: 521, y: 966, family: 0, note: "foot, front view" },
    { x: 1005, y: 970, family: 0, note: "foot, back view" },
    { x: 1105, y: 970, family: 0, note: "foot, back view" },
    { x: 1131, y: 971, family: 0, note: "foot, back view" },
    { x: 980, y: 971, family: 0, note: "foot, back view" },
  ],
};

/** Nothing smaller than this is a muscle head; it is a gap between two lines. */
const MIN_AREA = 180;
/** How far a known family reaches across ink to name a sealed neighbour. */
const INK_REACH = 5;

/**
 * The seed map is a *separate, immutable* input, never the file this script
 * writes: reading the previous output as evidence would let one build feed the
 * next, and every review veto would drift the whole figure (the first version
 * did exactly that). `scripts/body-map-seeds/` keeps the hand-traced male
 * regions and the landmark-warped female ones as the anatomical evidence.
 */
const FIGURES = {
  male: {
    image: "traininglab/apps/desktop/public/traininglab-body-map.png",
    mask: "scripts/body-map-seeds/male-regions.png",
    out: "traininglab/apps/desktop/public/traininglab-body-map-regions.png",
  },
  female: {
    image: "traininglab/apps/desktop/public/traininglab-body-map-woman.png",
    mask: "scripts/body-map-seeds/female-regions.png",
    out: "traininglab/apps/desktop/public/traininglab-body-map-woman-regions.png",
  },
};

/** Band palette, duplicated from `BodyMap.tsx` only to build review previews. */
const BAND = [
  [0x39, 0xd9, 0x8a],
  [0x9c, 0xe8, 0x47],
  [0xff, 0xc8, 0x57],
  [0xff, 0x79, 0x08],
  [0xff, 0x4f, 0x4f],
];
const FAMILY_SCORE = [62, 74, 88, 47, 36, 91, 58, 66, 24, 71, 82, 45, 31];

const SIGMA = Number(valueOf("sigma", "1.2"));
const ALPHA_WIDTH = Math.max(0.35, SIGMA * 0.55);
const UNDERLINE = Number(valueOf("underline", "2.2"));
const RIM_DEPTH = Number(valueOf("rim-depth", "4.6"));
const FIGURE_FILTER = valueOf("figure", null);
const PREVIEW_DIR = valueOf("preview", null);
const DIAGNOSTICS_FILE = valueOf("diagnostics", null);
const DRY_RUN = flag("dry-run");

const readPng = (relative) =>
  PNG.sync.read(fs.readFileSync(path.join(ROOT, relative)));

/** Downsample by 2 with a majority vote, keeping family ids exact. */
function halveLabels(labels, width, height) {
  const halfWidth = Math.ceil(width / 2);
  const halfHeight = Math.ceil(height / 2);
  const out = new Uint8Array(halfWidth * halfHeight);
  for (let y = 0; y < halfHeight; y += 1) {
    for (let x = 0; x < halfWidth; x += 1) {
      const counts = new Map();
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const sx = Math.min(width - 1, x * 2 + dx);
          const sy = Math.min(height - 1, y * 2 + dy);
          const id = labels[sy * width + sx];
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
      let best = 0;
      let bestCount = -1;
      for (const [id, count] of counts) {
        if (count > bestCount) {
          best = id;
          bestCount = count;
        }
      }
      out[y * halfWidth + x] = best;
    }
  }
  return { labels: out, width: halfWidth, height: halfHeight };
}

/** Bilinear sample of a half-resolution field at a full-resolution pixel. */
function sampleBilinear(field, width, height, x, y) {
  const hx = x / 2;
  const hy = y / 2;
  const x0 = Math.min(width - 1, Math.max(0, Math.floor(hx)));
  const y0 = Math.min(height - 1, Math.max(0, Math.floor(hy)));
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = hx - x0;
  const ty = hy - y0;
  const a = field[y0 * width + x0];
  const b = field[y0 * width + x1];
  const c = field[y1 * width + x0];
  const d = field[y1 * width + x1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

export function build(name, options = {}) {
  const sigma = options.sigma ?? SIGMA;
  const alphaWidth = options.alphaWidth ?? Math.max(0.35, sigma * 0.55);
  const underline = options.underline ?? UNDERLINE;
  const rimDepth = options.rimDepth ?? RIM_DEPTH;
  const figure = FIGURES[name];
  const image = readPng(figure.image);
  const mask = readPng(figure.mask);
  if (image.width !== mask.width || image.height !== mask.height) {
    throw new Error(
      `${name}: seed mask is ${mask.width}×${mask.height}, drawing is ${image.width}×${image.height}`,
    );
  }
  const width = image.width;
  const height = image.height;
  const size = width * height;
  const startedAt = Date.now();

  // --- 1. ink ------------------------------------------------------------
  const corner =
    image.data[0] + image.data[1] + image.data[2] + image.data[(width - 1) * 4];
  const lightOnDark = corner / 2 < 128;
  const inkness = new Float32Array(size);
  for (let p = 0, i = 0; p < size; p += 1, i += 4) {
    const lum = luminance(image.data[i], image.data[i + 1], image.data[i + 2]);
    inkness[p] = lightOnDark ? lum / 255 : (255 - lum) / 255;
  }
  const scaled = new Float32Array(size);
  for (let p = 0; p < size; p += 1) scaled[p] = inkness[p] * 255;
  const otsu = otsuThreshold(scaled) / 255;
  const ink = new Uint8Array(size);
  for (let p = 0; p < size; p += 1) ink[p] = inkness[p] > otsu ? 1 : 0;

  // --- 2. compartments ---------------------------------------------------
  const { ids, components } = labelComponents(ink, width, height);

  // Inscribed radius of each compartment: half its local thickness. Reported in
  // the diagnostics (it is how a hair strand differs from a muscle head), but
  // not used as a gate: the thinnest real heads in these drawings (the distal
  // tibialis, the serratus slips) are only 3–4 px across, so a thickness cut
  // would silently drop muscles. Only the explicit review table removes shapes.
  const inkDistance = chamferDistance(ink, width, height);
  const thickness = new Float32Array(components.length);
  for (let p = 0; p < size; p += 1) {
    const component = ids[p];
    if (component >= 0 && inkDistance[p] > thickness[component]) {
      thickness[component] = inkDistance[p];
    }
  }
  const paintable = components.map((component) => component.area >= MIN_AREA);

  // Seeds: the hand-made mask, pruned of one-pixel anti-aliasing slivers (a
  // pixel only counts when most of its 3×3 box carries the same family).
  const rawSeed = new Uint8Array(size);
  for (let p = 0; p < size; p += 1) rawSeed[p] = mask.data[p * 4];
  const seed = new Uint8Array(size);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const p = y * width + x;
      const id = rawSeed[p];
      if (!id || id > 13) continue;
      let same = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (rawSeed[p + dy * width + dx] === id) same += 1;
        }
      }
      if (same >= 6) seed[p] = id;
    }
  }
  for (const anchor of ANATOMY_SEEDS[name]) {
    const p = anchor.y * width + anchor.x;
    if (!ink[p]) seed[p] = anchor.family;
  }

  const votes = components.map(() => new Map());
  for (let p = 0; p < size; p += 1) {
    const id = seed[p];
    if (!id) continue;
    const component = ids[p];
    if (component < 0) continue;
    const bucket = votes[component];
    bucket.set(id, (bucket.get(id) ?? 0) + 1);
  }

  // --- 3. naming ---------------------------------------------------------
  const assignment = new Int32Array(components.length);
  const confidence = new Float64Array(components.length);
  const origin = new Array(components.length).fill("none");
  const overrides = new Map();
  for (const override of NAMING_OVERRIDES[name]) {
    let best = -1;
    let bestDistance = Infinity;
    components.forEach((component, index) => {
      const d = Math.hypot(
        component.centroid.x - override.x,
        component.centroid.y - override.y,
      );
      if (d < bestDistance) {
        bestDistance = d;
        best = index;
      }
    });
    if (best >= 0 && bestDistance <= 10) {
      overrides.set(best, override);
    } else {
      console.warn(
        `! ${name}: override at (${override.x},${override.y}) matched no compartment (nearest ${bestDistance.toFixed(1)} px)`,
      );
    }
  }

  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    if (!paintable[index]) continue;
    const bucket = votes[index];
    let total = 0;
    let bestId = 0;
    let bestCount = 0;
    for (const [id, count] of bucket) {
      total += count;
      if (count > bestCount) {
        bestCount = count;
        bestId = id;
      }
    }
    const share = total ? bestCount / total : 0;
    const minimum = Math.max(20, component.area * 0.004);
    if (total >= minimum && share >= 0.5) {
      assignment[index] = bestId;
      confidence[index] = share;
      origin[index] = "mask";
    }
  }

  /**
   * Name the compartments the hand mask never reached.
   *
   * A compartment becomes a vote field: the seed labels spread outwards by at
   * most `INK_REACH` pixels, enough to cross the drawn line but not the next
   * one, so a compartment sees only its *adjacent* sealed neighbours — the same
   * drawn muscle split into several heads by the artist. Each round re-spreads
   * from the whole current labelling, so the result does not depend on the
   * order the compartments happen to be visited in (the first version cascaded
   * neighbour by neighbour, and adding one reviewed veto silently repainted a
   * forearm elsewhere in the figure).
   */
  const labelRaster = new Uint8Array(size);
  for (let p = 0; p < size; p += 1) labelRaster[p] = seed[p];
  for (let round = 0; round < 3; round += 1) {
    const spreadVotes = spreadLabels(
      labelRaster,
      width,
      height,
      INK_REACH,
    ).labels;
    const tallies = components.map(() => new Map());
    for (let p = 0; p < size; p += 1) {
      const component = ids[p];
      if (component < 0 || !paintable[component] || assignment[component])
        continue;
      const family = spreadVotes[p];
      if (!family) continue;
      const bucket = tallies[component];
      bucket.set(family, (bucket.get(family) ?? 0) + 1);
    }
    let resolved = 0;
    for (let index = 0; index < components.length; index += 1) {
      if (assignment[index] || overrides.has(index)) continue;
      const bucket = tallies[index];
      let total = 0;
      let bestId = 0;
      let bestCount = 0;
      for (const [id, count] of bucket) {
        total += count;
        if (count > bestCount) {
          bestCount = count;
          bestId = id;
        }
      }
      if (total < 12 || bestCount / total < 0.6) continue;
      assignment[index] = bestId;
      confidence[index] = bestCount / total;
      origin[index] = "ink-neighbour";
      resolved += 1;
    }
    if (!resolved) break;
    for (let p = 0; p < size; p += 1) {
      const component = ids[p];
      if (component >= 0 && assignment[component])
        labelRaster[p] = assignment[component];
    }
  }

  for (const [index, override] of overrides) {
    assignment[index] = override.family;
    confidence[index] = 1;
    origin[index] = override.family ? "review" : "review-none";
  }
  for (let index = 0; index < components.length; index += 1) {
    if (!paintable[index] && assignment[index]) {
      assignment[index] = 0;
      origin[index] = "too-small";
    }
  }

  // --- 4. paint the compartments, then reach under the line ---------------
  const compartmentLabel = new Uint8Array(size);
  for (let p = 0; p < size; p += 1) {
    const component = ids[p];
    if (component < 0) continue;
    const family = assignment[component];
    if (family) compartmentLabel[p] = family;
  }
  const spread = spreadLabels(
    compartmentLabel,
    width,
    height,
    underline,
  ).labels;

  // --- 5. scale-space boundary --------------------------------------------
  const half = halveLabels(spread, width, height);
  const halfSize = half.width * half.height;
  const fields = [];
  for (let family = 1; family <= 13; family += 1) {
    const region = new Uint8Array(halfSize);
    for (let p = 0; p < halfSize; p += 1) {
      if (half.labels[p] === family) region[p] = 1;
    }
    const sdf = signedDistance(region, half.width, half.height);
    fields.push(gaussianBlur(sdf, half.width, half.height, sigma / 2));
  }

  const out = new Uint8ClampedArray(size * 4);
  const familyCensus = new Map();
  let covered = 0;
  let partial = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      let total = 0;
      let bestFamily = 0;
      let bestMembership = 0;
      for (let family = 0; family < 13; family += 1) {
        const distance = sampleBilinear(
          fields[family],
          half.width,
          half.height,
          x,
          y,
        );
        const membership = smoothstep(
          -alphaWidth / 2,
          alphaWidth / 2,
          distance,
        );
        if (membership <= 0) continue;
        total += membership;
        if (membership > bestMembership) {
          bestMembership = membership;
          bestFamily = family + 1;
        }
      }
      if (!bestFamily) continue;
      const coverage = Math.min(1, total);
      if (coverage < 0.02) continue;
      if (coverage > 0.98) covered += 1;
      else partial += 1;
      const rim = smoothstep(0.8, rimDepth, inkDistance[p]);
      const offset = p * 4;
      out[offset] = bestFamily;
      out[offset + 1] = Math.round(rim * 255);
      out[offset + 2] = Math.round(coverage * 255);
      out[offset + 3] = 255;
      familyCensus.set(bestFamily, (familyCensus.get(bestFamily) ?? 0) + 1);
    }
  }

  const png = new PNG({ width, height });
  png.data = Buffer.from(out.buffer, out.byteOffset, out.byteLength);

  const decisions = components
    .map((component, index) => ({
      index,
      area: component.area,
      x: Math.round(component.centroid.x),
      y: Math.round(component.centroid.y),
      bbox: component.bbox,
      family: assignment[index],
      origin: origin[index],
      thickness: Number(thickness[index].toFixed(1)),
      confidence: Number(confidence[index].toFixed(3)),
      votes: [...(votes[index] ?? new Map())]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => `${id}:${count}`),
    }))
    .filter((row) => row.area >= 110)
    .sort((a, b) => b.area - a.area);

  return {
    name,
    png,
    width,
    height,
    inkThreshold: otsu,
    components: components.length,
    decisions,
    symmetry: mirrorMismatches(decisions, Math.round(width / 2)),
    familyCensus,
    covered,
    partial,
    ms: Date.now() - startedAt,
    spread,
    ink,
    image,
  };
}

/** Render the app's composition, for review: colour + coverage + rim + line. */
function compose(result, withRim) {
  const { width, height, ink, image } = result;
  const png = new PNG({ width, height });
  const background = [17, 22, 27];
  const corner =
    image.data[0] + image.data[1] + image.data[2] + image.data[(width - 1) * 4];
  const lightOnDark = corner / 2 < 128;
  for (let p = 0; p < width * height; p += 1) {
    const offset = p * 4;
    const family = result.png.data[offset];
    const rim = result.png.data[offset + 1] / 255;
    const coverage = result.png.data[offset + 2] / 255;
    let r = background[0];
    let g = background[1];
    let b = background[2];
    if (family) {
      const score = FAMILY_SCORE[family - 1];
      const color =
        BAND[
          score >= 80
            ? 0
            : score >= 60
              ? 1
              : score >= 40
                ? 2
                : score >= 20
                  ? 3
                  : 4
        ];
      const shade = withRim ? 0.8 + 0.2 * rim : 1;
      const alpha = 0.855 * coverage;
      r = color[0] * shade * alpha + r * (1 - alpha);
      g = color[1] * shade * alpha + g * (1 - alpha);
      b = color[2] * shade * alpha + b * (1 - alpha);
    }
    const i = lightOnDark ? image.data[offset] : 255 - image.data[offset];
    const i2 = lightOnDark
      ? image.data[offset + 1]
      : 255 - image.data[offset + 1];
    const i3 = lightOnDark
      ? image.data[offset + 2]
      : 255 - image.data[offset + 2];
    png.data[offset] = 255 - ((255 - r) * (255 - i)) / 255;
    png.data[offset + 1] = 255 - ((255 - g) * (255 - i2)) / 255;
    png.data[offset + 2] = 255 - ((255 - b) * (255 - i3)) / 255;
    png.data[offset + 3] = 255;
  }
  return png;
}

/** Bounding box of the painted pixels inside a column window. */
function paintedBox(result, xFrom, xTo) {
  let minX = xTo;
  let maxX = xFrom;
  let minY = result.height;
  let maxY = 0;
  for (let y = 0; y < result.height; y += 1) {
    for (let x = xFrom; x < xTo; x += 1) {
      if (!result.png.data[(y * result.width + x) * 4]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Box-filter downscale, for reviewing what the app shows at 520 CSS px. */
function downscale(png, factor) {
  const width = Math.round(png.width * factor);
  const height = Math.round(png.height * factor);
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      const x1 = (x + 1) / factor;
      const y1 = (y + 1) / factor;
      for (let sy = Math.floor(y / factor); sy < Math.ceil(y1); sy += 1) {
        for (let sx = Math.floor(x / factor); sx < Math.ceil(x1); sx += 1) {
          const i =
            (Math.min(png.height - 1, sy) * png.width +
              Math.min(png.width - 1, sx)) *
            4;
          r += png.data[i];
          g += png.data[i + 1];
          b += png.data[i + 2];
          count += 1;
        }
      }
      const d = (y * width + x) * 4;
      out.data[d] = Math.round(r / count);
      out.data[d + 1] = Math.round(g / count);
      out.data[d + 2] = Math.round(b / count);
      out.data[d + 3] = 255;
    }
  }
  return out;
}

function crop(png, x0, y0, w, h, zoom) {
  const out = new PNG({ width: w * zoom, height: h * zoom });
  for (let y = 0; y < h * zoom; y += 1) {
    for (let x = 0; x < w * zoom; x += 1) {
      const sx = Math.min(
        png.width - 1,
        Math.max(0, x0 + Math.floor(x / zoom)),
      );
      const sy = Math.min(
        png.height - 1,
        Math.max(0, y0 + Math.floor(y / zoom)),
      );
      const s = (sy * png.width + sx) * 4;
      const d = (y * out.width + x) * 4;
      out.data[d] = png.data[s];
      out.data[d + 1] = png.data[s + 1];
      out.data[d + 2] = png.data[s + 2];
      out.data[d + 3] = 255;
    }
  }
  return out;
}

/** CLI: builds the requested figures, writes the assets and the review sheets. */
function runCli() {
  const results = [];
  for (const name of Object.keys(FIGURES)) {
    if (FIGURE_FILTER && name !== FIGURE_FILTER) continue;
    const result = build(name);
    results.push(result);
    console.log(
      `\n=== ${name} ${result.width}×${result.height} · ink>${(result.inkThreshold * 255).toFixed(0)} · σ=${SIGMA}px ===`,
    );
    console.log(
      `${result.components} compartments · ${result.familyCensus.size} families painted · ` +
        `${result.covered} solid px + ${result.partial} anti-aliased px · ${result.ms} ms`,
    );
    const census = [...result.familyCensus.entries()].sort(
      (a, b) => a[0] - b[0],
    );
    console.log(`census  ${census.map(([id, n]) => `${id}:${n}`).join(" ")}`);

    const named = result.decisions.filter((row) => row.family);
    console.log(`named compartments ≥110px: ${named.length}`);
    console.log(
      `symmetry ${result.symmetry
        .map((view) => `${view.view} ${view.mismatches.length} mismatched`)
        .join(" · ")}`,
    );
    for (const view of result.symmetry) {
      for (const mismatch of view.mismatches) {
        console.warn(
          `! ${name} ${view.view}: compartment ${mismatch.index} at (${mismatch.x},${mismatch.y}) is family ${mismatch.family} but its mirror is ${mismatch.mirrorFamily}`,
        );
      }
    }
    for (const row of result.decisions) {
      if (row.area < 700) continue;
      console.log(
        `  ${String(row.index).padStart(3)} ${String(row.area).padStart(6)}px (${String(row.x).padStart(4)},${String(row.y).padStart(4)}) ` +
          `→ ${String(row.family).padStart(2)} ${row.origin.padEnd(14)} ${row.confidence.toFixed(2)}  ${row.votes.join(" ")}`,
      );
    }

    if (PREVIEW_DIR) {
      const dir = path.join(ROOT, PREVIEW_DIR);
      fs.mkdirSync(dir, { recursive: true });
      const composed = compose(result, true);
      fs.writeFileSync(
        path.join(dir, `${name}-flat.png`),
        PNG.sync.write(compose(result, false)),
      );
      fs.writeFileSync(
        path.join(dir, `${name}-composed.png`),
        PNG.sync.write(composed),
      );
      fs.writeFileSync(
        path.join(dir, `${name}-display.png`),
        PNG.sync.write(downscale(composed, 0.5)),
      );
      // Crops are anchored on the paint itself, not on fractions of the canvas:
      // the two drawings have very different body-to-margin ratios.
      const halfWidth = Math.round(result.width / 2);
      const front = paintedBox(result, 0, halfWidth);
      const back = paintedBox(result, halfWidth, result.width);
      const chest = {
        x: front.x + Math.round(front.w * 0.26),
        y: front.y + Math.round(front.h * 0.05),
        w: Math.round(front.w * 0.5),
        h: Math.round(front.w * 0.5),
      };
      const legs = {
        x: front.x + Math.round(front.w * 0.18),
        y: front.y + Math.round(front.h * 0.6),
        w: Math.round(front.w * 0.62),
        h: Math.round(front.h * 0.35),
      };
      const backBox = {
        x: back.x + Math.round(back.w * 0.1),
        y: back.y + Math.round(back.h * 0.1),
        w: Math.round(back.w * 0.8),
        h: Math.round(back.h * 0.45),
      };
      for (const [suffix, box] of [
        ["chest", chest],
        ["legs", legs],
        ["back", backBox],
      ]) {
        const zoom = Math.max(1, Math.floor(760 / Math.max(box.w, box.h)));
        fs.writeFileSync(
          path.join(dir, `${name}-${suffix}.png`),
          PNG.sync.write(crop(composed, box.x, box.y, box.w, box.h, zoom)),
        );
      }
      console.log(`preview → ${dir}/${name}-*.png`);
    }

    if (!DRY_RUN) {
      fs.writeFileSync(
        path.join(ROOT, FIGURES[name].out),
        PNG.sync.write(result.png),
      );
      const stat = fs.statSync(path.join(ROOT, FIGURES[name].out));
      console.log(
        `wrote   → ${FIGURES[name].out} (${(stat.size / 1024).toFixed(0)} KB, channels R=family G=rim B=coverage)`,
      );
    }
  }

  if (DIAGNOSTICS_FILE) {
    const payload = results.map((result) => ({
      figure: result.name,
      width: result.width,
      height: result.height,
      sigma: SIGMA,
      alphaWidth: ALPHA_WIDTH,
      underline: UNDERLINE,
      components: result.components,
      census: Object.fromEntries(result.familyCensus),
      symmetry: result.symmetry,
      decisions: result.decisions,
    }));
    fs.writeFileSync(
      path.join(ROOT, DIAGNOSTICS_FILE),
      JSON.stringify(payload, null, 2),
    );
    console.log(`diagnostics → ${DIAGNOSTICS_FILE}`);
  }
}

const isCli =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) runCli();

export { FIGURES, FAMILY, ANATOMY_SEEDS, NAMING_OVERRIDES, MIN_AREA };
