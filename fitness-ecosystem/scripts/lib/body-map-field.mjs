/**
 * Pure raster/geometry primitives for the TrainingLab body-map region fields.
 *
 * The colour layer of the anatomical map is not a set of polygons: it is a
 * *field*. Each muscle family owns a region, the region's edge is a level set of
 * a signed distance function, and the visible boundary is the zero level of that
 * function after a scale-space (Gaussian) relaxation. That is what makes the
 * contour smooth instead of a staircase of mask pixels, and it is why this
 * module works on fields rather than on contours.
 *
 * Everything here is plain arithmetic over typed arrays: no DOM, no canvas, no
 * PNG, so it runs in the asset builder (Node) and in the root test suite.
 *
 * Definitions used throughout:
 *   - a *field* is a `Float32Array(width * height)` indexed row-major;
 *   - a *raster* is a `Uint8Array(width * height)` of booleans-as-0/1;
 *   - distances are in pixels, Euclidean-approximated by the 3–4 chamfer metric
 *     (1 for orthogonal steps, √2 for diagonal), which stays within ~2 % of the
 *     true Euclidean distance for the radii this map uses (< 40 px).
 *
 * @module scripts/lib/body-map-field
 */

/** Luminance 0–255 from sRGB bytes (Rec. 601, the same weights CSS uses). */
export function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Otsu's threshold: the value that maximises between-class variance of a
 * 0–255 histogram. Used to separate ink from paper without magic constants,
 * so the same code works on light-on-dark and dark-on-light drawings.
 */
export function otsuThreshold(values, length = values.length) {
  const histogram = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < length; i += 1) {
    const bin = Math.min(255, Math.max(0, Math.round(values[i])));
    histogram[bin] += 1;
    total += 1;
  }
  let sum = 0;
  for (let bin = 0; bin < 256; bin += 1) sum += bin * histogram[bin];
  let weightBackground = 0;
  let sumBackground = 0;
  let best = 0;
  let bestVariance = -1;
  for (let threshold = 0; threshold < 256; threshold += 1) {
    weightBackground += histogram[threshold];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += threshold * histogram[threshold];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const delta = meanBackground - meanForeground;
    const variance = weightBackground * weightForeground * delta * delta;
    if (variance > bestVariance) {
      bestVariance = variance;
      best = threshold;
    }
  }
  return best;
}

/**
 * 3–4 chamfer distance transform: distance from every pixel to the nearest
 * pixel of `seed` (value 1). Two raster scans (forward, backward), repeated
 * once so that diagonal "staircase" paths are relaxed as well.
 *
 * Returns a `Float32Array` in pixels; `Infinity` where nothing is reachable.
 */
export function chamferDistance(seed, width, height) {
  const INF = 1e9;
  const distance = new Float32Array(width * height);
  for (let p = 0; p < distance.length; p += 1) distance[p] = seed[p] ? 0 : INF;
  chamferRelax(distance, width, height);
  return distance;
}

/** In-place chamfer relaxation (used directly by the label propagation). */
function chamferRelax(distance, width, height) {
  const A = 1;
  const B = Math.SQRT2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      let value = distance[i];
      if (y > 0) {
        const up = i - width;
        if (distance[up] + A < value) value = distance[up] + A;
        if (x > 0 && distance[up - 1] + B < value) value = distance[up - 1] + B;
        if (x + 1 < width && distance[up + 1] + B < value) {
          value = distance[up + 1] + B;
        }
      }
      if (x > 0 && distance[i - 1] + A < value) value = distance[i - 1] + A;
      distance[i] = value;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const i = y * width + x;
      let value = distance[i];
      if (y + 1 < height) {
        const down = i + width;
        if (distance[down] + A < value) value = distance[down] + A;
        if (x + 1 < width && distance[down + 1] + B < value) {
          value = distance[down + 1] + B;
        }
        if (x > 0 && distance[down - 1] + B < value) {
          value = distance[down - 1] + B;
        }
      }
      if (x + 1 < width && distance[i + 1] + A < value)
        value = distance[i + 1] + A;
      distance[i] = value;
    }
  }
  return distance;
}

/**
 * Signed distance of a family region: positive inside, negative outside, and
 * ±1 on the two pixels that straddle the border (the zero crossing sits on the
 * pixel edge between them). This is the field whose level set becomes the
 * visible contour.
 */
export function signedDistance(region, width, height) {
  const size = width * height;
  const outside = new Uint8Array(size);
  const inside = new Uint8Array(size);
  for (let p = 0; p < size; p += 1) {
    if (region[p]) inside[p] = 1;
    else outside[p] = 1;
  }
  const toInside = chamferDistance(inside, width, height);
  const toOutside = chamferDistance(outside, width, height);
  const field = new Float32Array(size);
  for (let p = 0; p < size; p += 1) {
    field[p] = region[p] ? toOutside[p] : -toInside[p];
  }
  return field;
}

/** 1-D Gaussian kernel, normalised; radius covers 3σ. */
export function gaussianKernel(sigma) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = value;
    sum += value;
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum;
  return { kernel, radius };
}

/**
 * Separable Gaussian blur with clamped edges — the scale-space operator.
 *
 * Applied to a signed distance field, blurring at scale σ and re-thresholding
 * at zero approximates mean-curvature flow: the contour keeps its position
 * where it is straight and relaxes where it is jagged, so a 1-pixel staircase
 * becomes a smooth curve. Applied to the raw label raster it would also move
 * the boundary by σ everywhere; the SDF form does not.
 */
export function gaussianBlur(field, width, height, sigma) {
  if (sigma <= 0) return field.slice();
  const { kernel, radius } = gaussianKernel(sigma);
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sx = Math.min(width - 1, Math.max(0, x + k));
        sum += field[row + sx] * kernel[k + radius];
      }
      tmp[row + x] = sum;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        sum += tmp[sy * width + x] * kernel[k + radius];
      }
      out[y * width + x] = sum;
    }
  }
  return out;
}

/** Hermite smoothstep, clamped. */
export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Connected components of the *free* pixels (4-connected), treating `barrier`
 * as walls. Returns the component id per pixel (-1 for barriers) and a list of
 * component summaries (area, bounding box, centroid).
 */
export function labelComponents(barrier, width, height) {
  const size = width * height;
  const ids = new Int32Array(size).fill(-1);
  const queue = new Int32Array(size);
  const components = [];
  for (let start = 0; start < size; start += 1) {
    if (barrier[start] || ids[start] !== -1) continue;
    const id = components.length;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    ids[start] = id;
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = (pixel / width) | 0;
      area += 1;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && !barrier[pixel - 1] && ids[pixel - 1] === -1) {
        ids[pixel - 1] = id;
        queue[tail++] = pixel - 1;
      }
      if (x + 1 < width && !barrier[pixel + 1] && ids[pixel + 1] === -1) {
        ids[pixel + 1] = id;
        queue[tail++] = pixel + 1;
      }
      if (y > 0 && !barrier[pixel - width] && ids[pixel - width] === -1) {
        ids[pixel - width] = id;
        queue[tail++] = pixel - width;
      }
      if (
        y + 1 < height &&
        !barrier[pixel + width] &&
        ids[pixel + width] === -1
      ) {
        ids[pixel + width] = id;
        queue[tail++] = pixel + width;
      }
    }
    components.push({
      id,
      area,
      centroid: { x: sumX / area, y: sumY / area },
      bbox: { minX, maxX, minY, maxY },
    });
  }
  return { ids, components };
}

/**
 * Mirrored-pair check: the drawings are symmetric, so two mirrored
 * compartments must carry the same family. Returns the mismatches found by
 * matching each row with the nearest mirrored row, plus the mirror axis that
 * minimises the total disagreement (the drawings are not perfectly centred).
 *
 * @param {{x:number, y:number, family:number}[]} rows painted compartments
 * @param {number} halfWidth column where the front view ends and the back begins
 */
export function mirrorMismatches(rows, halfWidth) {
  const views = [
    { name: "front", from: 0, to: halfWidth },
    { name: "back", from: halfWidth, to: Number.POSITIVE_INFINITY },
  ];
  const out = [];
  for (const view of views) {
    const painted = rows.filter(
      (row) => row.family > 0 && row.x >= view.from && row.x < view.to,
    );
    if (!painted.length) continue;
    let best = null;
    const minX = Math.min(...painted.map((row) => row.x));
    const maxX = Math.max(...painted.map((row) => row.x));
    for (let centre = minX; centre <= maxX; centre += 1) {
      let cost = 0;
      for (const row of painted) {
        let nearest = Infinity;
        let family = -1;
        for (const other of painted) {
          if (other === row) continue;
          const distance = Math.hypot(
            other.x - (2 * centre - row.x),
            other.y - row.y,
          );
          if (distance < nearest) {
            nearest = distance;
            family = other.family;
          }
        }
        if (nearest > 10) cost += 6;
        else if (family !== row.family) cost += 3;
      }
      if (!best || cost < best.cost) best = { centre, cost };
    }
    const mismatches = [];
    for (const row of painted) {
      let nearest = Infinity;
      let family = -1;
      let index = -1;
      for (const other of painted) {
        if (other === row) continue;
        const distance = Math.hypot(
          other.x - (2 * best.centre - row.x),
          other.y - row.y,
        );
        if (distance < nearest) {
          nearest = distance;
          family = other.family;
          index = other.index ?? -1;
        }
      }
      if (nearest <= 10 && family !== row.family) {
        mismatches.push({
          index: row.index ?? -1,
          x: row.x,
          y: row.y,
          family: row.family,
          mirrorIndex: index,
          mirrorFamily: family,
        });
      }
    }
    out.push({ view: view.name, centre: best.centre, mismatches });
  }
  return out;
}

/**
 * Spread each label into its unlabelled surroundings, nearest-first, through
 * pixels where `passable` is set (default: everywhere), and no further than
 * `maxDistance` pixels.
 *
 * This is how a colour region is extended *under* the drawn line: the ink is
 * passable here, so the fill reaches the line instead of stopping a pixel short
 * and leaving a dark gutter; the cap keeps it from bleeding out the far side of
 * the line onto the background.
 *
 * @returns {{labels: Uint8Array, distance: Float32Array}}
 */
export function spreadLabels(labels, width, height, maxDistance = Infinity) {
  const size = width * height;
  const INF = 1e9;
  const out = new Uint8Array(labels);
  const distance = new Float32Array(size);
  for (let p = 0; p < size; p += 1) distance[p] = labels[p] ? 0 : INF;
  const A = 1;
  const B = Math.SQRT2;
  const relax = (index, from, step) => {
    if (!out[from]) return;
    const candidate = distance[from] + step;
    if (candidate < distance[index]) {
      distance[index] = candidate;
      out[index] = out[from];
    }
  };
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x;
        if (y > 0) {
          relax(i, i - width, A);
          if (x > 0) relax(i, i - width - 1, B);
          if (x + 1 < width) relax(i, i - width + 1, B);
        }
        if (x > 0) relax(i, i - 1, A);
      }
    }
    for (let y = height - 1; y >= 0; y -= 1) {
      for (let x = width - 1; x >= 0; x -= 1) {
        const i = y * width + x;
        if (y + 1 < height) {
          relax(i, i + width, A);
          if (x + 1 < width) relax(i, i + width + 1, B);
          if (x > 0) relax(i, i + width - 1, B);
        }
        if (x + 1 < width) relax(i, i + 1, A);
      }
    }
  }
  for (let p = 0; p < size; p += 1) {
    if (distance[p] > maxDistance) {
      out[p] = 0;
      distance[p] = Infinity;
    }
  }
  return { labels: out, distance };
}
