/**
 * Somatotype — Heath-Carter style classification (BodyLab proxy variant).
 *
 * The canonical Heath-Carter anthropometric protocol (Heath & Carter 1967;
 * Carter & Heath 1990) scores three components on a 0.5–7+ scale:
 *   - endomorphy  (relative fatness)             — canonical input: Σ3 skinfolds
 *   - mesomorphy  (musculo-skeletal robustness)  — canonical input: bone breadths + girths
 *   - ectomorphy  (relative linearity)           — canonical input: height / ∛weight (HWR)
 *
 * BodyLab does not measure bone breadths or the canonical skinfold trio
 * (triceps, subscapular, supraspinale) per protocol, so this module implements
 * an explicitly documented BodyLab proxy:
 *
 *   endomorphy ← measured body-fat % (caliper/DEXA/BIA) via a piecewise-linear
 *                map anchored on published ACE band cut-offs (same cut-offs as
 *                @fitness/bodylab-conditioning, so both classifiers can never
 *                disagree about where a body sits)
 *   ectomorphy ← HWR = height_cm / ∛weight_kg via the Heath-Carter linear
 *                equation 0.4643·HWR − 17.63 (floor 0.1, ceiling 12)
 *   mesomorphy ← frame proxy: the height/wrist ratio (calculateFrameSize)
 *                mapped small→2, medium→4, large→6, plus a lean bonus when the
 *                measured %BF supports a defensible lean-mass reading
 *
 * All components are rounded to the canonical 0.5 somatotype units. The full
 * continuous-ish triple is returned so TrainingLab's planner can use exact
 * numbers; the visual model selector only needs `category`.
 *
 * Conventions of this package's newest modules: invalid input returns `null`
 * (never throws, never NaN) — same style as @fitness/bodylab-conditioning.
 *
 * Pure TypeScript — no React, no DOM, no I/O, no dependencies.
 *
 * @module composition/somatotype
 */

import { calculateFrameSize } from './frame-size';

// ============================================================================
// Types
// ============================================================================

export type BiologicalSex = 'male' | 'female';

/**
 * Full Carter-style category taxonomy, deterministically assigned.
 *
 * Grammar: the NOUN is the dominant component, the ADJECTIVE the second.
 *   'mesomorphic_endomorph' → endomorphy dominant, mesomorphy second.
 * Tie-compounds ('mesomorph_endomorph' …) name a two-way tie at the top
 * (both components within 1 of each other and >1 over the third); the name
 * order is fixed per pair (meso first when involved), and exact ties resolve
 * by the fixed priority mesomorphy > ectomorphy > endomorphy.
 */
export type SomatotypeCategory =
  | 'central'
  | 'balanced_mesomorph'
  | 'balanced_endomorph'
  | 'balanced_ectomorph'
  | 'mesomorphic_endomorph'
  | 'ectomorphic_endomorph'
  | 'endomorphic_mesomorph'
  | 'ectomorphic_mesomorph'
  | 'endomorphic_ectomorph'
  | 'mesomorphic_ectomorph'
  | 'mesomorph_endomorph'
  | 'mesomorph_ectomorph'
  | 'endomorph_ectomorph';

export interface SomatotypeInputs {
  /** Height in cm. */
  heightCm: number;
  /** Weight in kg. */
  weightKg: number;
  /** Measured body-fat % (essential-fat floor applies, per sex). */
  bodyFatPct: number;
  /** Biological sex — required for the essential-fat floor and lean bonus. */
  sex: BiologicalSex;
  /** Wrist circumference in cm — frame-proxy input. Omit → medium-frame base. */
  wristCm?: number | null;
}

export interface SomatotypeResult {
  /** Relative fatness, 0.5–16 scale, rounded to 0.5. */
  endomorphy: number;
  /** Musculo-skeletal robustness proxy, 2–6.5 range, rounded to 0.5. */
  mesomorphy: number;
  /** Relative linearity, 0.1–12, rounded to 0.5 (Heath-Carter equation). */
  ectomorphy: number;
  /** Canonical ordering endo-meso-ecto, e.g. "2.5-4.0-2.5". */
  display: string;
  category: SomatotypeCategory;
  /** Explicit provenance — nothing here pretends to be the canonical protocol. */
  provenance: {
    endomorphy: 'bodylab_proxy_ace_anchors';
    mesomorphy: 'bodylab_frame_proxy' | 'bodylab_frame_proxy_plus_lean_bonus';
    ectomorphy: 'heath_carter_hwr';
  };
  /** False when no wrist was provided and mesomorphy used the medium-frame base. */
  frameMeasured: boolean;
}

// ============================================================================
// Constants (documented provenance for every number)
// ============================================================================

/** Essential-fat floors and absolute ceiling — same values as conditioning. */
const BF_MIN: Record<BiologicalSex, number> = { male: 2, female: 8 };
const BF_MAX = 70;

/** Ectomorphy: Heath-Carter linear equation on the height/∛weight ratio. */
const ECTO_SLOPE = 0.4643;
const ECTO_INTERCEPT = -17.63;
const ECTO_FLOOR = 0.1;
const ECTO_CEILING = 12;

/** Plausibility domains for the raw anthropometric inputs. */
const HEIGHT_MIN_CM = 50;
/** 250 cm — also the hard guard of calculateFrameSize (2.5 m), which we delegate to. */
const HEIGHT_MAX_CM = 250;
const WEIGHT_MIN_KG = 20;
const WEIGHT_MAX_KG = 500;
/** Same domain calculateFrameSize enforces (its own guard is >0..30). */
const WRIST_MIN_CM = 10;
const WRIST_MAX_CM = 30;

/**
 * Endomorphy anchors: (measured %BF → endomorphy) at published ACE band
 * cut-offs, per sex. Monotone by construction; outside the table the last
 * segment is extrapolated linearly and capped at 16 (canonical max).
 */
const ENDO_ANCHORS: Record<BiologicalSex, ReadonlyArray<readonly [number, number]>> = {
  male: [
    [2, 0.5],
    [6, 1],
    [14, 3],
    [25, 5.5],
    [32, 7],
    [45, 10],
    [60, 12],
  ],
  female: [
    [8, 0.5],
    [14, 2],
    [18, 3],
    [25, 4.5],
    [32, 5.5],
    [40, 7.5],
    [55, 10],
  ],
};

const ENDO_CEILING = 16;

/** Mesomorphy base by frame size (height/wrist classification). */
const MESO_BY_FRAME = { small: 2, medium: 4, large: 6 } as const;
/** Lean bonus: measured BF at or under these values adds +0.5 mesomorphy. */
const LEAN_BONUS_BF: Record<BiologicalSex, number> = { male: 14, female: 22 };
const LEAN_BONUS = 0.5;

// ============================================================================
// Helpers
// ============================================================================

function roundToHalf(x: number): number {
  return Math.round(x * 2) / 2;
}

function piecewiseLinear(x: number, anchors: ReadonlyArray<readonly [number, number]>): number {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return NaN;
  if (x <= first[0]) {
    if (x === first[0]) return first[1];
    // Extrapolate from the first segment, capped by the first anchor value.
    const [x1, y1] = anchors[0]!;
    const [x2, y2] = anchors[1] ?? first;
    const slope = (y2 - y1) / (x2 - x1);
    return Math.min(y1, y1 + slope * (x - x1));
  }
  if (x >= last[0]) {
    // Linear extrapolation from the last segment, capped at ENDO_CEILING.
    const [x1, y1] = anchors[anchors.length - 2]!;
    const [x2, y2] = last;
    const slope = (y2 - y1) / (x2 - x1);
    return Math.min(ENDO_CEILING, y2 + slope * (x - x2));
  }
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i - 1]!;
    const [x2, y2] = anchors[i]!;
    if (x <= x2) return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
  }
  return last[1];
}

// ============================================================================
// Component calculators (exported for testing and direct reuse)
// ============================================================================

/**
 * Endomorphy from MEASURED body-fat % (BodyLab proxy). Returns null outside
 * the physiological domain (below essential fat is a measurement error, per
 * the same rule as the conditioning package).
 */
export function calculateEndomorphy(bodyFatPct: number, sex: BiologicalSex): number | null {
  if (!Number.isFinite(bodyFatPct)) return null;
  if (bodyFatPct < BF_MIN[sex] || bodyFatPct > BF_MAX) return null;
  return roundToHalf(piecewiseLinear(bodyFatPct, ENDO_ANCHORS[sex]));
}

/** Height / ∛weight ratio (Heath-Carter HWR). */
export function heightWeightRatio(heightCm: number, weightKg: number): number | null {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
  if (heightCm < HEIGHT_MIN_CM || heightCm > HEIGHT_MAX_CM) return null;
  if (weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG) return null;
  const cbrt = Math.cbrt(weightKg);
  if (!Number.isFinite(cbrt) || cbrt <= 0) return null;
  return heightCm / cbrt;
}

/**
 * Ectomorphy via the Heath-Carter linear equation, floored at 0.1 and capped
 * at 12 exactly as the protocol prescribes for extreme linearity. Obese
 * bodies legitimately land on the floor — that is the protocol's behaviour,
 * not a bug.
 */
export function calculateEctomorphy(heightCm: number, weightKg: number): number | null {
  const hwr = heightWeightRatio(heightCm, weightKg);
  if (hwr === null) return null;
  const ecto = ECTO_SLOPE * hwr + ECTO_INTERCEPT;
  return roundToHalf(Math.min(ECTO_CEILING, Math.max(ECTO_FLOOR, ecto)));
}

/**
 * Mesomorphy from the skeletal-frame proxy (height/wrist via
 * calculateFrameSize), optionally boosted when the measured %BF is lean
 * enough that muscle mass is plausibly supporting the frame. Without a
 * wrist measurement the medium-frame base is used and `frameMeasured`
 * reports it, so UIs can ask for the missing measurement.
 */
export function calculateMesomorphyFrame(
  heightCm: number,
  wristCm: number,
  sex: BiologicalSex,
  bodyFatPct: number
): { value: number; leanBonus: boolean } | null {
  if (!Number.isFinite(wristCm) || wristCm < WRIST_MIN_CM || wristCm > WRIST_MAX_CM) return null;
  if (!Number.isFinite(heightCm) || heightCm < HEIGHT_MIN_CM || heightCm > HEIGHT_MAX_CM) return null;
  const frame = calculateFrameSize(heightCm / 100, wristCm); // delegate takes METERS (≤2.5 guard, ×100 internal)
  const base = MESO_BY_FRAME[frame.frameSize];
  const leanBonus = Number.isFinite(bodyFatPct) && bodyFatPct <= LEAN_BONUS_BF[sex];
  return { value: roundToHalf(base + (leanBonus ? LEAN_BONUS : 0)), leanBonus };
}

// ============================================================================
// Category rules (dominance-based; documented simplification of Carter 1990)
// ============================================================================

/**
 * Rules, in order:
 *  1. All three components within 1 unit → `central`.
 *  2. Top two within 1 of each other and >1 over the third → tie-compound,
 *     named by descending value (exact ties: priority meso > ecto > endo).
 *  3. Unique dominant: the two remainders within 1 of each other →
 *     `balanced_<dominant>`; otherwise adjective-noun by dominance.
 */
export function categorizeSomatotype(e: number, m: number, c: number): SomatotypeCategory {
  const vals = { endomorphy: e, mesomorphy: m, ectomorphy: c } as const;
  type Name = keyof typeof vals;
  const names: Name[] = ['endomorphy', 'mesomorphy', 'ectomorphy'];
  // Exact-value ties resolve by fixed priority: meso > ecto > endo.
  const priority: Record<Name, number> = { mesomorphy: 0, ectomorphy: 1, endomorphy: 2 };
  const [top, second, last] = [...names].sort(
    (a, b) => vals[b] - vals[a] || priority[a] - priority[b]
  ) as [Name, Name, Name];

  if (vals[top] - vals[last] <= 1) return 'central';

  if (vals[top] - vals[second] <= 1) {
    const pair = [top, second].sort().join('+');
    if (pair === 'endomorphy+mesomorphy') return 'mesomorph_endomorph';
    if (pair === 'ectomorphy+mesomorphy') return 'mesomorph_ectomorph';
    return 'endomorph_ectomorph';
  }

  if (vals[second] - vals[last] <= 1) {
    return top === 'mesomorphy' ? 'balanced_mesomorph' : top === 'endomorphy' ? 'balanced_endomorph' : 'balanced_ectomorph';
  }

  // Unique dominant + unique second → adjective (second) + noun (dominant).
  const key = `${second}_${top}` as const;
  const table: Record<string, SomatotypeCategory> = {
    mesomorphy_endomorphy: 'mesomorphic_endomorph',
    ectomorphy_endomorphy: 'ectomorphic_endomorph',
    endomorphy_mesomorphy: 'endomorphic_mesomorph',
    ectomorphy_mesomorphy: 'ectomorphic_mesomorph',
    endomorphy_ectomorphy: 'endomorphic_ectomorph',
    mesomorphy_ectomorphy: 'mesomorphic_ectomorph',
  };
  return table[key] ?? 'central';
}

// ============================================================================
// Main classifier
// ============================================================================

/**
 * Classify the Heath-Carter style somatotype (BodyLab proxy variant).
 *
 * Returns `null` for any input outside the physiological domains listed in
 * the constants above — no NaN, no thrown errors, no invented physiology.
 */
export function classifySomatotype(inputs: SomatotypeInputs): SomatotypeResult | null {
  const { heightCm, weightKg, bodyFatPct, sex, wristCm } = inputs;

  if (!Number.isFinite(heightCm) || heightCm < HEIGHT_MIN_CM || heightCm > HEIGHT_MAX_CM) return null;
  if (!Number.isFinite(weightKg) || weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG) return null;
  if (!Number.isFinite(bodyFatPct) || bodyFatPct < BF_MIN[sex] || bodyFatPct > BF_MAX) return null;

  const endomorphy = calculateEndomorphy(bodyFatPct, sex);
  const ectomorphy = calculateEctomorphy(heightCm, weightKg);
  if (endomorphy === null || ectomorphy === null) return null;

  let mesomorphy: number;
  let frameMeasured = false;
  let mesoProvenance: SomatotypeResult['provenance']['mesomorphy'] = 'bodylab_frame_proxy';

  if (wristCm != null) {
    const frame = calculateMesomorphyFrame(heightCm, wristCm, sex, bodyFatPct);
    if (!frame) return null; // wrist provided but outside the domain → caller error
    mesomorphy = frame.value;
    frameMeasured = true;
    if (frame.leanBonus) mesoProvenance = 'bodylab_frame_proxy_plus_lean_bonus';
  } else {
    mesomorphy = MESO_BY_FRAME.medium; // documented default, flagged via frameMeasured
  }

  const display = `${endomorphy.toFixed(1)}-${mesomorphy.toFixed(1)}-${ectomorphy.toFixed(1)}`;
  return {
    endomorphy,
    mesomorphy,
    ectomorphy,
    display,
    category: categorizeSomatotype(endomorphy, mesomorphy, ectomorphy),
    provenance: {
      endomorphy: 'bodylab_proxy_ace_anchors',
      mesomorphy: mesoProvenance,
      ectomorphy: 'heath_carter_hwr',
    },
    frameMeasured,
  };
}
