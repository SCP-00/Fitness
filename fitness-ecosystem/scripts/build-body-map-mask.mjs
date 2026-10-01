/**
 * Derive a body-map region mask for a second figure from an existing one.
 *
 * Why this exists: TrainingLab's anatomical map colours the owner's line art
 * through a pixel-ID mask (`traininglab-body-map-regions.png`, the red channel
 * of each pixel = muscle family, 1–13). When the owner added
 * `Modelo2D_Woman.png` for the female profile, that figure needed its own mask —
 * and tracing 13 muscle regions by hand would be both slow and arbitrary.
 *
 * The two drawings are the **same anatomical rig** (same muscle segmentation,
 * same pose, same proportions of the torso), so the mask transfers: the script
 * measures each drawing's own silhouette, matches their body landmarks, and
 * maps every source region pixel onto the target figure.
 *
 * The mapping is deliberately not a bbox stretch:
 *
 *   * **vertical** is piecewise-linear across four landmarks measured from the
 *     silhouette itself — the top of the drawing, the shoulder line (first row
 *     at 60 % of max width), the crotch (first row with a background gap inside
 *     the central 20 % of the silhouette: that gap exists only between the legs)
 *     and the feet. A single proportional mapping puts every region too high,
 *     because the female drawing's head (with the hair bun) takes a larger share
 *     of the figure than the male's;
 *   * **horizontal** is normalised per row against that row's own silhouette
 *     span, so the male's wider shoulders and the female's wider hips are each
 *     handled locally.
 *
 * Usage (from `fitness-ecosystem/`):
 *
 *   node scripts/build-body-map-mask.mjs \
 *     --source-mask  traininglab/apps/desktop/public/traininglab-body-map-regions.png \
 *     --source-image traininglab/apps/desktop/public/traininglab-body-map.png \
 *     --target-image traininglab/apps/desktop/public/traininglab-body-map-woman.png \
 *     --out          traininglab/apps/desktop/public/traininglab-body-map-woman-regions.png \
 *     [--preview tmp/body-map-woman-preview.png] \
 *     [--front-chest-bottom 335 --front-abs-bottom 478 --front-hip 575 \
 *      --front-knee 700 --back-hip 526 --back-knee 700]
 *
 * The four landmark flags are the target drawing's own hip and knee lines, in
 * target-image y. Omit them and the script places them by the source figure's
 * proportions; supply them (measured once, by eye, on the target drawing) when
 * that drift matters — which it does for a figure whose head-to-body ratio
 * differs from the source's.
 *
 * Injecting the mask the script prints a per-family census, so a region that
 * silently came out empty is visible in the log.
 *
 * Both source images must be the two-figures-per-image layout the map uses
 * (front view on the left, back view on the right). The script reports the
 * per-family pixel counts it wrote, so a silent failure (an empty region) is
 * visible in the output rather than in the app.
 *
 * @module scripts/build-body-map-mask
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const argv = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const SOURCE_MASK = valueOf(
  "source-mask",
  "traininglab/apps/desktop/public/traininglab-body-map-regions.png",
);
const SOURCE_IMAGE = valueOf(
  "source-image",
  "traininglab/apps/desktop/public/traininglab-body-map.png",
);
const TARGET_IMAGE = valueOf(
  "target-image",
  "traininglab/apps/desktop/public/traininglab-body-map-woman.png",
);
const OUT = valueOf(
  "out",
  "traininglab/apps/desktop/public/traininglab-body-map-woman-regions.png",
);
/** Optional target-drawing landmarks (y in the target image), if measured. */
const numeric = (name) => {
  const raw = valueOf(name, null);
  const n = raw === null ? null : Number(raw);
  return Number.isFinite(n) ? n : null;
};
const PREVIEW = valueOf("preview", null);
const FIGURE_PROFILE = valueOf(
  "figure",
  TARGET_IMAGE.toLowerCase().includes("woman") ? "female" : "male",
);

// A handful of large, line-enclosed compartments in the supplied drawings do
// not receive any pixels from the transferred source mask. These reviewed
// centroids fill only those specific gaps; the line-art flood-fill still
// constrains every assignment to its closed compartment (never a freehand
// rectangle). IDs retain the original 1..13 family contract.
const ANATOMY_SEEDS = {
  male: [
    { x: 176, y: 337, family: 1, note: "serratus anterior, front" },
    { x: 313, y: 337, family: 1, note: "serratus anterior, front" },
    { x: 180, y: 426, family: 9, note: "external oblique, front" },
    { x: 309, y: 426, family: 9, note: "external oblique, front" },
    { x: 162, y: 465, family: 9, note: "external oblique, front" },
    { x: 327, y: 465, family: 9, note: "external oblique, front" },
    { x: 244, y: 444, family: 9, note: "lower rectus abdominis, front" },
    { x: 200, y: 631, family: 11, note: "quadriceps, front" },
    { x: 288, y: 631, family: 11, note: "quadriceps, front" },
  ],
  female: [
    { x: 419, y: 317, family: 1, note: "serratus anterior, front" },
    { x: 520, y: 317, family: 1, note: "serratus anterior, front" },
    { x: 419, y: 344, family: 9, note: "external oblique, front" },
    { x: 520, y: 344, family: 9, note: "external oblique, front" },
    { x: 550, y: 589, family: 11, note: "quadriceps, front" },
  ],
};
if (!Object.hasOwn(ANATOMY_SEEDS, FIGURE_PROFILE)) {
  throw new Error(`unknown --figure profile: ${FIGURE_PROFILE}`);
}

/** Playwright lives in the web app's dependency graph, not at the root. */
async function loadChromium() {
  const webRequire = createRequire(
    path.join(ROOT, "bodylab/apps/web/package.json"),
  );
  for (const pkg of ["@playwright/test", "playwright"]) {
    try {
      const resolved = webRequire.resolve(pkg);
      const mod = await import(pathToFileURL(resolved).href);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    "no playwright chromium available — run `pnpm install` in bodylab/apps/web",
  );
}

const dataUrl = async (rel) => {
  const buf = await fs.readFile(path.join(ROOT, rel));
  return `data:image/png;base64,${buf.toString("base64")}`;
};

const chromium = await loadChromium();
const browser = await chromium.launch();
const page = await browser.newPage();
const result = await page.evaluate(
  async ({
    sourceMask,
    sourceImage,
    targetImage,
    wantPreview,
    overrides,
    anatomySeeds,
  }) => {
    const load = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image failed to load"));
        img.src = src;
      });
    const pixelsOf = (img) => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return {
        data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        height: canvas.height,
      };
    };

    const [maskImg, sourceImg, targetImg] = await Promise.all([
      load(sourceMask),
      load(sourceImage),
      load(targetImage),
    ]);
    const mask = pixelsOf(maskImg);
    const source = pixelsOf(sourceImg);
    const target = pixelsOf(targetImg);

    /**
     * Ink test: the drawings come on opposite backgrounds (the male map is dark
     * line work on white, the woman is light line work on black), so the
     * polarity is read off the top-left corner instead of being assumed.
     */
    const inkOf = (px) => {
      const corner = px.data[0] + px.data[1] + px.data[2];
      const lightOnDark = corner < 90;
      return (x, y) => {
        const i = (y * px.width + x) * 4;
        const sum = px.data[i] + px.data[i + 1] + px.data[i + 2];
        return lightOnDark ? sum > 90 : sum < 690;
      };
    };

    /** Row spans of one figure inside an x window. */
    const profile = (px, xa, xb) => {
      const isInk = inkOf(px);
      const rows = new Array(px.height);
      const bbox = { minX: 1e9, maxX: -1, minY: 1e9, maxY: -1 };
      for (let y = 0; y < px.height; y += 1) {
        let lo = -1;
        let hi = -1;
        for (let x = xa; x < xb; x += 1) {
          if (!isInk(x, y)) continue;
          if (lo < 0) lo = x;
          hi = x;
        }
        rows[y] = { lo, hi };
        if (lo >= 0) {
          if (y < bbox.minY) bbox.minY = y;
          if (y > bbox.maxY) bbox.maxY = y;
          if (lo < bbox.minX) bbox.minX = lo;
          if (hi > bbox.maxX) bbox.maxX = hi;
        }
      }
      return { rows, bbox, isInk };
    };

    /**
     * Three landmarks the silhouette can answer on **any** drawing: the top of
     * the drawing, the shoulder line (first row at 60 % of the maximum width)
     * and the feet. The hip/crotch line is *not* measurable from a silhouette —
     * neither drawing fills its body, so there is no background inside the
     * figure to detect — and it is supplied per view by `hipFraction` below.
     */
    const anchors = (p) => {
      const { bbox, rows } = p;
      const top = bbox.minY;
      const bottom = bbox.maxY;
      const height = bottom - top;
      const widthAt = (y) => (rows[y].lo < 0 ? 0 : rows[y].hi - rows[y].lo + 1);
      let maxW = 0;
      for (let y = top; y <= bottom; y += 1) maxW = Math.max(maxW, widthAt(y));

      let shoulder = top + Math.round(height * 0.2);
      for (let y = top; y < top + height * 0.6; y += 1) {
        if (widthAt(y) >= maxW * 0.6) {
          shoulder = y;
          break;
        }
      }
      return { top, shoulder, bottom };
    };

    /**
     * Where a muscle group starts in the source figure, read from the source
     * mask. A *run* of matching pixels, not a single one: the mask is
     * anti-aliased along its borders, so a lone `11` between a `10` and a `12`
     * is a blend, not a quadriceps.
     */
    const sourceRegionSpan = (xa, xb, ids, minRun = 24) => {
      let top = null;
      let bottom = null;
      for (let y = 0; y < mask.height; y += 1) {
        let run = 0;
        let hit = false;
        for (let x = xa; x < xb; x += 1) {
          const value = mask.data[(y * mask.width + x) * 4];
          run = ids.includes(value) ? run + 1 : 0;
          if (run >= minRun) hit = true;
        }
        if (hit) {
          if (top === null) top = y;
          bottom = y;
        }
      }
      return { top, bottom };
    };

    /**
     * Complete the two interior landmarks (hip, knee) for both figures.
     *
     * The source's are measured from its mask (hip = top of quadriceps/glutes,
     * knee = top of the calves). The target's are — when the caller supplies
     * them — read off the target drawing itself (`--front-hip 560` and friends);
     * otherwise they are placed by the source's own proportions, which is the
     * fallback and the reason the flags exist: the female drawing's head takes a
     * larger share of the figure, so a purely proportional placement drifts.
     */
    const withInterior = (srcA, dstA, interior) => {
      const src = { ...srcA };
      const dst = { ...dstA };
      for (const [key, srcY, dstY] of interior) {
        const frac =
          (srcY - srcA.shoulder) / Math.max(1, srcA.bottom - srcA.shoulder);
        src[key] = srcY;
        dst[key] =
          dstY ??
          Math.round(dstA.shoulder + frac * (dstA.bottom - dstA.shoulder));
      }
      return { src, dst };
    };

    /**
     * Landmarks in body order. A pair is used only when *both* figures know it
     * (`absTop`/`absBottom` are front-view only), and unknown ones are simply
     * skipped, so the two figures still meet wherever the mapping is anchored.
     */
    const KEYS = [
      "top",
      "shoulder",
      "chestBottom",
      "absBottom",
      "crotch",
      "knee",
      "bottom",
    ];
    const mapY = (y, src, dst) => {
      const known = KEYS.filter(
        (k) => typeof src[k] === "number" && typeof dst[k] === "number",
      );
      for (let i = 0; i < known.length - 1; i += 1) {
        const a = known[i];
        const b = known[i + 1];
        if (y >= dst[a] && y <= dst[b]) {
          const t = (y - dst[a]) / Math.max(1, dst[b] - dst[a]);
          return src[a] + t * (src[b] - src[a]);
        }
      }
      return y < dst.top
        ? y + (src.top - dst.top)
        : y + (src.bottom - dst.bottom);
    };

    /** Paint one figure: destination-driven so no target pixel is left to holes. */
    const warp = (srcP, srcA, dstP, dstA, xa, xb, out, outWidth) => {
      let painted = 0;
      for (let y = dstA.top; y <= dstA.bottom; y += 1) {
        const row = dstP.rows[y];
        if (row.lo < 0) continue;
        const sy = Math.max(
          srcA.top,
          Math.min(srcA.bottom, Math.round(mapY(y, srcA, dstA))),
        );
        const srow = srcP.rows[sy];
        if (srow.lo < 0 || srow.hi <= srow.lo) continue;
        for (let x = Math.max(xa, row.lo); x <= Math.min(xb, row.hi); x += 1) {
          const u = (x - row.lo) / Math.max(1, row.hi - row.lo);
          const sx = Math.round(srow.lo + u * (srow.hi - srow.lo));
          const value = mask.data[(sy * mask.width + sx) * 4];
          if (value < 1 || value > 13) continue;
          const o = (y * outWidth + x) * 4;
          out[o] = value;
          out[o + 1] = value;
          out[o + 2] = value;
          out[o + 3] = 255;
          painted += 1;
        }
      }
      return painted;
    };

    if (
      source.width !== mask.width ||
      source.height !== mask.height ||
      target.width !== targetImg.naturalWidth ||
      target.height !== targetImg.naturalHeight
    ) {
      throw new Error("source image/mask dimensions do not match");
    }
    const targetWidth = target.width;
    const targetHeight = target.height;
    const targetHalf = Math.floor(targetWidth / 2);
    const out = new Uint8ClampedArray(targetWidth * targetHeight * 4);
    const half = Math.round(source.width / 2);
    const sFront = profile(source, 0, half);
    const sBack = profile(source, half, source.width);
    const tFront = profile(target, 0, targetHalf);
    const tBack = profile(target, targetHalf, targetWidth);
    // Front: the hip is where the quadriceps begins and the knee where it ends.
    // Back: the hip is where the gluteus ends (the gluteal fold) and the knee
    // where the hamstrings end. Both are read off the source mask itself.
    const srcFrontThigh = sourceRegionSpan(0, half, [11]);
    const srcFrontCore = sourceRegionSpan(0, half, [9]);
    const srcFrontChest = sourceRegionSpan(0, half, [1]);
    const srcBackGlute = sourceRegionSpan(half, source.width, [10]);
    const srcBackHam = sourceRegionSpan(half, source.width, [12]);
    const frontAnchors = withInterior(anchors(sFront), anchors(tFront), [
      ["chestBottom", srcFrontChest.bottom, overrides.frontChestBottom],
      ["absBottom", srcFrontCore.bottom, overrides.frontAbsBottom],
      ["crotch", srcFrontThigh.top, overrides.frontHip],
      ["knee", srcFrontThigh.bottom, overrides.frontKnee],
    ]);
    const backAnchors = withInterior(anchors(sBack), anchors(tBack), [
      ["crotch", srcBackGlute.bottom, overrides.backHip],
      ["knee", srcBackHam.bottom, overrides.backKnee],
    ]);
    const paintedFront = warp(
      sFront,
      frontAnchors.src,
      tFront,
      frontAnchors.dst,
      0,
      targetHalf - 1,
      out,
      targetWidth,
    );
    const paintedBack = warp(
      sBack,
      backAnchors.src,
      tBack,
      backAnchors.dst,
      targetHalf,
      targetWidth - 1,
      out,
      targetWidth,
    );

    /**
     * Keep the transferred IDs inside the target drawing's closed muscle
     * compartments. The silhouette warp is only a first-pass label guess; it
     * can stretch labels across an internal contour when two drawings differ.
     * Treat the line art as a one-pixel-dilated barrier, flood-fill the outside,
     * then assign each enclosed compartment the majority family from that first
     * pass. Ambiguous compartments stay neutral rather than showing the wrong
     * muscle. This also removes the horizontal slivers produced by row warping.
     */
    const refineByCompartments = () => {
      const size = targetWidth * targetHeight;
      const barrier = new Uint8Array(size);
      const backgroundIsLight =
        target.data[0] + target.data[1] + target.data[2] > 384;
      for (let pixel = 0; pixel < size; pixel += 1) {
        const i = pixel * 4;
        const sum = target.data[i] + target.data[i + 1] + target.data[i + 2];
        const ink = backgroundIsLight ? sum < 384 : sum > 384;
        if (ink) barrier[pixel] = 1;
      }

      // Close one-pixel antialias gaps without painting over the source image.
      const closed = barrier.slice();
      for (let y = 0; y < targetHeight; y += 1) {
        for (let x = 0; x < targetWidth; x += 1) {
          const pixel = y * targetWidth + x;
          if (!barrier[pixel]) continue;
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < targetWidth && ny >= 0 && ny < targetHeight) {
                closed[ny * targetWidth + nx] = 1;
              }
            }
          }
        }
      }

      const visited = new Uint8Array(size);
      const queue = new Uint32Array(size);
      let head = 0;
      let tail = 0;
      const enqueueExterior = (pixel) => {
        if (!closed[pixel] && !visited[pixel]) {
          visited[pixel] = 1;
          queue[tail++] = pixel;
        }
      };
      for (let x = 0; x < targetWidth; x += 1) {
        enqueueExterior(x);
        enqueueExterior((targetHeight - 1) * targetWidth + x);
      }
      for (let y = 0; y < targetHeight; y += 1) {
        enqueueExterior(y * targetWidth);
        enqueueExterior(y * targetWidth + targetWidth - 1);
      }
      while (head < tail) {
        const pixel = queue[head++];
        const x = pixel % targetWidth;
        if (x > 0) enqueueExterior(pixel - 1);
        if (x + 1 < targetWidth) enqueueExterior(pixel + 1);
        if (pixel >= targetWidth) enqueueExterior(pixel - targetWidth);
        if (pixel + targetWidth < size) enqueueExterior(pixel + targetWidth);
      }

      let components = 0;
      let ambiguous = 0;
      let refinedPixels = 0;
      let curatedComponents = 0;
      let curatedPixels = 0;
      const uncertainComponents = [];
      const visitComponent = (start) => {
        head = 0;
        tail = 0;
        visited[start] = 1;
        queue[tail++] = start;
        const counts = new Uint32Array(14);
        let sumX = 0;
        let sumY = 0;
        while (head < tail) {
          const pixel = queue[head++];
          sumX += pixel % targetWidth;
          sumY += Math.floor(pixel / targetWidth);
          const family = out[pixel * 4];
          if (family >= 1 && family <= 13) counts[family] += 1;
          const x = pixel % targetWidth;
          const add = (next) => {
            if (!closed[next] && !visited[next]) {
              visited[next] = 1;
              queue[tail++] = next;
            }
          };
          if (x > 0) add(pixel - 1);
          if (x + 1 < targetWidth) add(pixel + 1);
          if (pixel >= targetWidth) add(pixel - targetWidth);
          if (pixel + targetWidth < size) add(pixel + targetWidth);
        }

        let dominant = 0;
        for (let id = 1; id <= 13; id += 1) {
          if (counts[id] > counts[dominant]) dominant = id;
        }
        const labelled = counts.reduce((sum, count) => sum + count, 0);
        components += 1;
        const confidence = labelled ? counts[dominant] / labelled : 0;
        // A compartment may be crossed by a neighboring rough-warp label even
        // when most samples still point to its actual family. Keep the family
        // only when that majority is decisive; the former 65% cutoff left
        // broad, recognizable muscle compartments blank.
        if (tail < 45 || confidence < 0.35) {
          const cx = sumX / tail;
          const cy = sumY / tail;
          const seed = anatomySeeds.find(
            (candidate) => Math.hypot(cx - candidate.x, cy - candidate.y) <= 12,
          );
          if (tail >= 45 && seed) {
            curatedComponents += 1;
            curatedPixels += tail;
            for (let i = 0; i < tail; i += 1) {
              const offset = queue[i] * 4;
              out[offset] = seed.family;
              out[offset + 1] = seed.family;
              out[offset + 2] = seed.family;
              out[offset + 3] = 255;
            }
            return;
          }
          if (tail >= 45) {
            ambiguous += 1;
            uncertainComponents.push({
              x: Math.round(sumX / tail),
              y: Math.round(sumY / tail),
              pixels: tail,
              family: dominant,
              confidence: Math.round(confidence * 100),
            });
          }
          // Uncertain transfer is explicitly no-data, never an arbitrary band.
          for (let i = 0; i < tail; i += 1) {
            const offset = queue[i] * 4;
            out[offset] = 0;
            out[offset + 1] = 0;
            out[offset + 2] = 0;
            out[offset + 3] = 0;
          }
          return;
        }
        for (let i = 0; i < tail; i += 1) {
          const pixel = queue[i];
          const offset = pixel * 4;
          out[offset] = dominant;
          out[offset + 1] = dominant;
          out[offset + 2] = dominant;
          out[offset + 3] = 255;
          refinedPixels += 1;
        }
      };

      // Lines and outside are never paintable. Each remaining closed area is
      // considered once; unlabelled skin/background compartments stay neutral.
      for (let pixel = 0; pixel < size; pixel += 1) {
        if (closed[pixel]) {
          const offset = pixel * 4;
          out[offset] = 0;
          out[offset + 1] = 0;
          out[offset + 2] = 0;
          out[offset + 3] = 0;
        } else if (!visited[pixel]) {
          visitComponent(pixel);
        }
      }
      uncertainComponents.sort((a, b) => b.pixels - a.pixels);
      return {
        components,
        ambiguous,
        refinedPixels,
        curatedComponents,
        curatedPixels,
        uncertainComponents,
      };
    };
    const refinement = refineByCompartments();

    // The source male has no hair and its upper trapezius label begins above
    // the target's shoulder. On a long-haired target that interpolation can
    // otherwise label enclosed hair strands as muscle. The posterior shoulder
    // landmark is image-specific, so keep trap pixels below that landmark.
    const posteriorShoulder = backAnchors.dst.shoulder;
    for (let y = 0; y < posteriorShoulder; y += 1) {
      for (let x = targetHalf; x < targetWidth; x += 1) {
        const offset = (y * targetWidth + x) * 4;
        if (out[offset] === 7) {
          out[offset] = 0;
          out[offset + 1] = 0;
          out[offset + 2] = 0;
          out[offset + 3] = 0;
        }
      }
    }

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = targetWidth;
    maskCanvas.height = targetHeight;
    maskCanvas
      .getContext("2d")
      .putImageData(new ImageData(out, targetWidth, targetHeight), 0, 0);

    // Per-family census: an empty region must be visible in the output.
    const census = {};
    for (let i = 0; i < out.length; i += 4) {
      const id = out[i];
      if (id) census[id] = (census[id] ?? 0) + 1;
    }

    // Optional review image: the target drawing plus the warped regions.
    let preview = null;
    if (wantPreview) {
      const colors = {
        1: [57, 217, 138],
        2: [70, 168, 255],
        3: [255, 79, 79],
        4: [255, 200, 87],
        5: [197, 140, 255],
        6: [0, 209, 193],
        7: [255, 148, 71],
        8: [140, 233, 154],
        9: [255, 122, 182],
        10: [176, 242, 75],
        11: [124, 196, 255],
        12: [255, 209, 102],
        13: [224, 224, 224],
      };
      const view = document.createElement("canvas");
      view.width = targetWidth;
      view.height = targetHeight;
      const vc = view.getContext("2d");
      vc.drawImage(targetImg, 0, 0);
      const paint = vc.createImageData(targetWidth, targetHeight);
      for (let i = 0; i < out.length; i += 4) {
        const id = out[i];
        if (!id) continue;
        const c = colors[id] ?? [255, 255, 255];
        paint.data[i] = c[0];
        paint.data[i + 1] = c[1];
        paint.data[i + 2] = c[2];
        paint.data[i + 3] = 255;
      }
      const layer = document.createElement("canvas");
      layer.width = targetWidth;
      layer.height = targetHeight;
      layer.getContext("2d").putImageData(paint, 0, 0);
      vc.globalAlpha = 0.5;
      vc.drawImage(layer, 0, 0);
      vc.globalAlpha = 1;
      preview = view.toDataURL("image/png");
    }

    return {
      maskPng: maskCanvas.toDataURL("image/png"),
      preview,
      paintedFront,
      paintedBack,
      refinement,
      targetWidth,
      targetHeight,
      census,
      anchors: {
        srcFront: frontAnchors.src,
        dstFront: frontAnchors.dst,
        srcBack: backAnchors.src,
        dstBack: backAnchors.dst,
      },
    };
  },
  {
    sourceMask: await dataUrl(SOURCE_MASK),
    sourceImage: await dataUrl(SOURCE_IMAGE),
    targetImage: await dataUrl(TARGET_IMAGE),
    wantPreview: Boolean(PREVIEW),
    anatomySeeds: ANATOMY_SEEDS[FIGURE_PROFILE],
    overrides: {
      frontHip: numeric("front-hip"),
      frontKnee: numeric("front-knee"),
      frontChestBottom: numeric("front-chest-bottom"),
      frontAbsBottom: numeric("front-abs-bottom"),
      backHip: numeric("back-hip"),
      backKnee: numeric("back-knee"),
    },
  },
);
await browser.close();

const writePng = async (rel, dataUrlValue) => {
  const abs = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, Buffer.from(dataUrlValue.split(",")[1], "base64"));
  const { size } = await fs.stat(abs);
  return `${rel} (${(size / 1024).toFixed(0)} KB)`;
};

console.log(`mask    → ${await writePng(OUT, result.maskPng)}`);
if (PREVIEW && result.preview) {
  console.log(`preview → ${await writePng(PREVIEW, result.preview)}`);
}
console.log(
  `painted ${result.paintedFront} px (front) + ${result.paintedBack} px (back)`,
);
console.log(
  `refined ${result.refinement.refinedPixels} px in ${result.refinement.components} compartments; ` +
    `${result.refinement.ambiguous} ambiguous compartments left neutral`,
);
console.log(
  `curated ${result.refinement.curatedPixels} px in ${result.refinement.curatedComponents} reviewed compartments (${FIGURE_PROFILE})`,
);
if (process.argv.includes("--diagnostics")) {
  console.log(
    `uncertain components: ${JSON.stringify(result.refinement.uncertainComponents.slice(0, 80))}`,
  );
}
console.log(
  "anchors  " +
    Object.entries(result.anchors)
      .map(
        ([name, a]) =>
          `${name}: top${a.top} shoulder${a.shoulder} hip${a.crotch} knee${a.knee} feet${a.bottom}`,
      )
      .join(" · "),
);
console.log(
  "census   " +
    Object.entries(result.census)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([id, n]) => `${id}:${n}`)
      .join(" "),
);
