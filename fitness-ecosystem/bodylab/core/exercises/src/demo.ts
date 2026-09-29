/**
 * Drawn movement demos — the animation data, with no images and no licences.
 *
 * Why we draw instead of shipping GIFs: the exercise-GIF market (Gym Visual,
 * ExerciseDB, WorkoutX…) is either royalty-free-with-caveats or outright
 * non-redistributable, and a repo that redistributes that media inherits the
 * problem forever. A figure we draw ourselves has no licence, no file size and —
 * the real prize — it can show the *mechanics* rather than a person's silhouette:
 * which joint moves, in which direction, through which range. The reference
 * market (Keep in China) treats the animated demo as table stakes, so this is not
 * a nice-to-have.
 *
 * The data here is deliberately tiny: five angles per frame and a rig the app
 * solves with forward kinematics. Angles are in degrees, measured **from straight
 * down, positive = forwards** (the direction the figure faces):
 *
 *   `0` → the bone points down · `90` → points forward · `180` → points up
 *
 * So a standing pose is `{ torso: 0, thigh: 0, shin: 0, arm: 5, forearm: 5 }` and
 * the bottom of a squat is `{ torso: 35, thigh: 75, shin: 25, … }`. `torso` is the
 * one exception halfway: it is the hip→shoulder lean measured from straight *up*,
 * so `0` is upright and `40` leans forward 40°.
 *
 * `anchor` says what stays put while the rest moves: `"ankle"` for anything done
 * standing (the feet do not slide, the pelvis travels), `"hip"` for anything done
 * lying, hanging or planked (the pelvis is pinned to the bench/bar and the limbs
 * travel). The renderer solves the chain from that anchor and auto-fits the
 * drawing to its box, so no pattern needs hand-tuned pixel coordinates.
 *
 * @module demo
 */

import type { MovementPattern } from "./traits";

/** Which joints the viewer should watch — drawn highlighted by the renderer. */
export type DemoJoint =
  | "ankle"
  | "knee"
  | "hip"
  | "spine"
  | "shoulder"
  | "elbow"
  | "wrist";

/**
 * One keyframe. Every angle is absolute (not relative to its parent), which is
 * what keeps authoring honest: two poses that should look mirrored genuinely are.
 */
export interface DemoPose {
  /** Hip→shoulder direction: 0 = upright, positive = leaning forward. */
  torso: number;
  /** Hip→knee direction: 0 = straight down, positive = forward. */
  thigh: number;
  /** Knee→ankle direction: 0 = straight down, positive = forward. */
  shin: number;
  /** Shoulder→elbow direction: 0 = down, 90 = forward, 180 = up. */
  arm: number;
  /** Elbow→wrist direction, same convention as `arm`. */
  forearm: number;
  /** Wrist→fingers direction, same convention. Defaults to the forearm's. */
  hand?: number;
  /** Ankle→toe direction, same convention (90 = foot flat, heel down). */
  foot?: number;
  /**
   * Front view only: how far the arms leave the body sideways, 0–90°
   * (0 = at the sides, 90 = a horizontal T).
   */
  spread?: number;
  /**
   * Front view only: how far the legs open sideways, 0–90° (0 = feet together).
   * Symmetric — the patterns that use it (abduction, clamshells, lateral band
   * walks) read as "the legs open" from the front, which is the point.
   */
  legSpread?: number;
}

export interface PatternDemo {
  view: "side" | "front";
  /** What stays put: the feet, or the pelvis. */
  anchor: "ankle" | "hip";
  /** Draw a floor line under the figure. */
  ground: boolean;
  /**
   * Keyframes played forwards then backwards, so the demo never has to author
   * the return trip (and can never be asymmetrical by mistake).
   */
  frames: DemoPose[];
  watch: DemoJoint[];
  /** Milliseconds for one direction of the cycle. */
  cycleMs: number;
}

const p = (pose: DemoPose): DemoPose => pose;

/** A neutral standing base other poses are written from. */
const STANDING = p({ torso: 0, thigh: 0, shin: 0, arm: 6, forearm: 6 });

export const PATTERN_DEMOS: Record<MovementPattern, PatternDemo> = {
  horizontal_push: {
    // Bench press seen from the side: the arm travels, the pelvis is on the bench.
    view: "side",
    anchor: "hip",
    ground: false,
    watch: ["shoulder", "elbow"],
    cycleMs: 1400,
    frames: [
      p({ torso: 90, thigh: 10, shin: 90, arm: 150, forearm: 95 }),
      p({ torso: 90, thigh: 10, shin: 90, arm: 75, forearm: 120 }),
    ],
  },
  vertical_push: {
    // Overhead press: bar path is the lesson, so the arm goes past vertical.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["shoulder", "elbow", "spine"],
    cycleMs: 1300,
    frames: [
      p({ torso: 2, thigh: 0, shin: 0, arm: 95, forearm: 175 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 170, forearm: 178 }),
    ],
  },
  shoulder_flexion: {
    view: "front",
    anchor: "hip",
    ground: true,
    watch: ["shoulder"],
    cycleMs: 1300,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 5 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 88 }),
    ],
  },
  shoulder_abduction: {
    view: "front",
    anchor: "hip",
    ground: true,
    watch: ["shoulder"],
    cycleMs: 1300,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 10, spread: 8 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 10, spread: 85 }),
    ],
  },
  shoulder_extension: {
    // Straight-arm pulldown / pullover: a long arc from overhead to the thighs.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["shoulder", "spine"],
    cycleMs: 1500,
    frames: [
      p({ torso: 20, thigh: 2, shin: 0, arm: 170, forearm: 172 }),
      p({ torso: 20, thigh: 2, shin: 0, arm: 55, forearm: 55 }),
    ],
  },
  horizontal_pull: {
    // Row: the elbow drives back, the torso stays still.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["elbow", "spine"],
    cycleMs: 1300,
    frames: [
      p({ torso: 60, thigh: 2, shin: 0, arm: 60, forearm: 60 }),
      p({ torso: 60, thigh: 2, shin: 0, arm: 30, forearm: 150 }),
    ],
  },
  vertical_pull: {
    // Pull-up: the whole body rises; the chin clears the hands.
    view: "side",
    anchor: "hip",
    ground: false,
    watch: ["shoulder", "elbow"],
    cycleMs: 1500,
    frames: [
      p({ torso: 0, thigh: 4, shin: -6, arm: 170, forearm: 175 }),
      p({ torso: 0, thigh: 4, shin: -6, arm: 160, forearm: 45 }),
    ],
  },
  squat: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["hip", "knee", "spine"],
    cycleMs: 1700,
    frames: [
      p({ torso: 0, thigh: 4, shin: -4, arm: 8, forearm: 8 }),
      p({ torso: 38, thigh: 78, shin: 26, arm: 55, forearm: 58 }),
    ],
  },
  hinge: {
    // Deadlift: hips back, spine long, knee mostly still.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["hip", "spine"],
    cycleMs: 1700,
    frames: [
      p({ torso: 0, thigh: 2, shin: 0, arm: 6, forearm: 6 }),
      p({ torso: 72, thigh: 12, shin: -14, arm: 30, forearm: 30 }),
    ],
  },
  lunge: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["hip", "knee"],
    cycleMs: 1700,
    frames: [
      p({ torso: 4, thigh: 0, shin: 0, arm: 8, forearm: 8 }),
      p({ torso: 12, thigh: 55, shin: -8, arm: 30, forearm: 34 }),
    ],
  },
  hip_extension: {
    view: "side",
    anchor: "hip",
    ground: true,
    watch: ["hip"],
    cycleMs: 1400,
    frames: [
      p({ torso: 88, thigh: 20, shin: 95, arm: 20, forearm: 20 }),
      p({ torso: 82, thigh: 95, shin: 60, arm: 20, forearm: 20 }),
    ],
  },
  hip_abduction: {
    view: "front",
    anchor: "hip",
    ground: true,
    watch: ["hip"],
    cycleMs: 1200,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 8, legSpread: 6 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 8, legSpread: 40 }),
    ],
  },
  hip_adduction: {
    view: "front",
    anchor: "hip",
    ground: true,
    watch: ["hip"],
    cycleMs: 1200,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 8, legSpread: 32 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 8, legSpread: 4 }),
    ],
  },
  knee_flexion: {
    view: "side",
    anchor: "hip",
    ground: true,
    watch: ["knee"],
    cycleMs: 1400,
    frames: [
      p({ torso: 88, thigh: -8, shin: -8, arm: 14, forearm: 14 }),
      p({ torso: 88, thigh: -14, shin: -95, arm: 14, forearm: 14 }),
    ],
  },
  knee_extension: {
    view: "side",
    anchor: "hip",
    ground: false,
    watch: ["knee"],
    cycleMs: 1400,
    frames: [
      p({ torso: 84, thigh: -60, shin: -120, arm: 12, forearm: 12 }),
      p({ torso: 84, thigh: -60, shin: -50, arm: 12, forearm: 12 }),
    ],
  },
  plantar_flexion: {
    // Calf raise: the foot pivots on the toes and the whole body rides up with it.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["ankle"],
    cycleMs: 1100,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 6, forearm: 6, foot: 88 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 6, forearm: 6, foot: 128 }),
    ],
  },
  tibialis: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["ankle"],
    cycleMs: 1100,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 6, forearm: 6, foot: 90 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 6, forearm: 6, foot: 58 }),
    ],
  },
  elbow_flexion: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["elbow"],
    cycleMs: 1200,
    frames: [
      p({ torso: 2, thigh: 0, shin: 0, arm: 6, forearm: 6 }),
      p({ torso: 2, thigh: 0, shin: 0, arm: 8, forearm: 150 }),
    ],
  },
  elbow_extension: {
    // Overhead extension: the upper arm stays put, the forearm travels.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["elbow"],
    cycleMs: 1200,
    frames: [
      p({ torso: 2, thigh: 0, shin: 0, arm: 165, forearm: -100 }),
      p({ torso: 2, thigh: 0, shin: 0, arm: 165, forearm: 172 }),
    ],
  },
  forearm_flexion: {
    // Wrist curl: the forearm is the anchor and only the hand travels.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["wrist"],
    cycleMs: 1000,
    frames: [
      p({ torso: 2, thigh: 0, shin: 0, arm: 6, forearm: 6, hand: -30 }),
      p({ torso: 2, thigh: 0, shin: 0, arm: 6, forearm: 6, hand: 40 }),
    ],
  },
  forearm_extension: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["wrist"],
    cycleMs: 1000,
    frames: [
      p({ torso: 2, thigh: 0, shin: 0, arm: 6, forearm: 6, hand: 42 }),
      p({ torso: 2, thigh: 0, shin: 0, arm: 6, forearm: 6, hand: -28 }),
    ],
  },
  core_flexion: {
    // Hanging knee raise: the pelvis curls, the legs follow.
    view: "side",
    anchor: "hip",
    ground: false,
    watch: ["hip", "spine"],
    cycleMs: 1500,
    frames: [
      p({ torso: 0, thigh: -4, shin: -6, arm: 168, forearm: 172 }),
      p({ torso: -10, thigh: 85, shin: -10, arm: 168, forearm: 172 }),
    ],
  },
  core_anti_extension: {
    // Plank family: the lesson is that nothing moves.
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["spine", "hip"],
    cycleMs: 2000,
    frames: [
      p({ torso: 55, thigh: 4, shin: -2, arm: 80, forearm: 80 }),
      p({ torso: 58, thigh: 3, shin: -2, arm: 82, forearm: 82 }),
    ],
  },
  core_anti_lateral: {
    view: "front",
    anchor: "hip",
    ground: true,
    watch: ["spine"],
    cycleMs: 1600,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 10 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 0, spread: 85 }),
    ],
  },
  core_rotation: {
    view: "front",
    anchor: "hip",
    ground: true,
    watch: ["spine", "shoulder"],
    cycleMs: 1400,
    frames: [
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 60, spread: 20 }),
      p({ torso: 0, thigh: 0, shin: 0, arm: 0, forearm: 60, spread: 70 }),
    ],
  },
  carry: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["spine", "shoulder"],
    cycleMs: 2200,
    frames: [
      p({ torso: 2, thigh: 8, shin: -4, arm: 4, forearm: 4 }),
      p({ torso: 2, thigh: -8, shin: 4, arm: 4, forearm: 4 }),
    ],
  },
  cardio_steady: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["knee", "hip"],
    cycleMs: 900,
    frames: [
      p({ torso: 4, thigh: 18, shin: -6, arm: 30, forearm: 60 }),
      p({ torso: 4, thigh: -10, shin: 12, arm: -30, forearm: -60 }),
    ],
  },
  cardio_interval: {
    view: "side",
    anchor: "ankle",
    ground: true,
    watch: ["knee", "hip"],
    cycleMs: 700,
    frames: [
      p({ torso: 6, thigh: 40, shin: -14, arm: 55, forearm: 90 }),
      p({ torso: 10, thigh: -16, shin: 26, arm: -50, forearm: -85 }),
    ],
  },
};

/** True when the pattern has a hand-authored demo (all of them must). */
export function hasDemo(pattern: MovementPattern): boolean {
  return PATTERN_DEMOS[pattern] !== undefined;
}

export { STANDING };
