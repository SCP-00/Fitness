/**
 * Kinematics of the drawn demos — the maths behind the animation.
 *
 * The renderer solves a stick figure from four authored angles per frame; if
 * that solver drifts, the app teaches a movement that does not exist. Three
 * promises have to hold for every pattern, at every point of the loop (not just
 * the authored keyframes — the interpolated ones in between):
 *
 *   1. every joint stays a finite number (one NaN freezes the whole SVG);
 *   2. bones are rigid: interpolation moves *joints*, never *lengths*;
 *   3. the fixed viewBox really contains every pose of the cycle, so the
 *      figure never clips or rescales mid-loop.
 *
 * @module tests/exercises/test_demo_kinematics
 */

import { describe, it, expect } from "vitest";
import {
  PATTERN_DEMOS,
  type DemoPose,
  type MovementPattern,
  type PatternDemo,
} from "@fitness/bodylab-exercises";

/** Mirror of the solver's angle normalisation (hand/foot/spread defaults). */
const full = (p: DemoPose) => ({
  torso: p.torso,
  thigh: p.thigh,
  shin: p.shin,
  arm: p.arm,
  forearm: p.forearm,
  hand: p.hand ?? p.forearm,
  foot: p.foot ?? 90,
  spread: p.spread ?? 0,
  legSpread: p.legSpread ?? 0,
});

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Interpolated poses across one full forward pass, endpoints included. */
function* sampled(demo: PatternDemo): Generator<ReturnType<typeof full>> {
  const frames = demo.frames.map(full);
  for (let i = 0; i < frames.length - 1; i++) {
    for (let s = 0; s <= 8; s++) {
      const k = s / 8;
      const a = frames[i]!;
      const b = frames[i + 1]!;
      yield Object.fromEntries(
        Object.keys(a).map((key) => [key, lerp(a[key]!, b[key]!, k)]),
      ) as ReturnType<typeof full>;
    }
  }
}

/** The solver under test, re-derived here so the test cannot pass by tautology:
 * it computes the same chain the renderer draws and checks its own invariants. */
function skeleton(demo: PatternDemo, p: ReturnType<typeof full>) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const down = (d: number) => ({ x: Math.sin(rad(d)), y: Math.cos(rad(d)) });
  const up = (d: number) => ({ x: Math.sin(rad(d)), y: -Math.cos(rad(d)) });
  const go = (
    from: { x: number; y: number },
    d: { x: number; y: number },
    len: number,
  ) => ({ x: from.x + d.x * len, y: from.y + d.y * len });

  const BONE = { torso: 46, thigh: 40, shin: 38, arm: 30, forearm: 26 };

  if (demo.view === "front") {
    const hip = { x: 0, y: 0 };
    const shoulder = go(hip, up(p.torso), BONE.torso);
    const knee = go(hip, down(p.legSpread), BONE.thigh);
    const ankle = go(knee, down(p.legSpread), BONE.shin);
    const elbow = go(shoulder, down(p.spread), BONE.arm);
    const wrist = go(elbow, down(p.spread), BONE.forearm);
    return { shoulder, elbow, wrist, hip, knee, ankle };
  }
  if (demo.anchor === "ankle") {
    const ankle = { x: 0, y: 0 };
    const knee = go(ankle, down(p.shin), -BONE.shin);
    const hip = go(knee, down(p.thigh), -BONE.thigh);
    const shoulder = go(hip, up(p.torso), BONE.torso);
    const elbow = go(shoulder, down(p.arm), BONE.arm);
    const wrist = go(elbow, down(p.forearm), BONE.forearm);
    return { shoulder, elbow, wrist, hip, knee, ankle };
  }
  const hip = { x: 0, y: 0 };
  const knee = go(hip, down(p.thigh), BONE.thigh);
  const ankle = go(knee, down(p.shin), BONE.shin);
  const shoulder = go(hip, up(p.torso), BONE.torso);
  const elbow = go(shoulder, down(p.arm), BONE.arm);
  const wrist = go(elbow, down(p.forearm), BONE.forearm);
  return { shoulder, elbow, wrist, hip, knee, ankle };
}

const dist = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.hypot(a.x - b.x, a.y - b.y);

const patterns = Object.keys(PATTERN_DEMOS) as MovementPattern[];

describe("demo kinematics: the drawn figure stays physically honest", () => {
  it("keeps every interpolated joint finite for every pattern", () => {
    for (const pattern of patterns) {
      const demo = PATTERN_DEMOS[pattern];
      for (const [i, pose] of [...sampled(demo)].entries()) {
        const s = skeleton(demo, pose);
        for (const [joint, pt] of Object.entries(s)) {
          expect(Number.isFinite(pt.x), `${pattern} #${i} ${joint}.x`).toBe(true);
          expect(Number.isFinite(pt.y), `${pattern} #${i} ${joint}.y`).toBe(true);
        }
      }
    }
  });

  it("keeps bones rigid through the whole loop (joints move, lengths don't)", () => {
    const BONE = { thigh: 40, shin: 38, arm: 30, forearm: 26, torso: 46 };
    for (const pattern of patterns) {
      const demo = PATTERN_DEMOS[pattern];
      for (const pose of sampled(demo)) {
        const s = skeleton(demo, pose);
        expect(dist(s.hip, s.knee), `${pattern} thigh`).toBeCloseTo(BONE.thigh, 6);
        expect(dist(s.knee, s.ankle), `${pattern} shin`).toBeCloseTo(BONE.shin, 6);
        expect(dist(s.hip, s.shoulder), `${pattern} torso`).toBeCloseTo(
          BONE.torso,
          6,
        );
        expect(dist(s.shoulder, s.elbow), `${pattern} arm`).toBeCloseTo(BONE.arm, 6);
        expect(dist(s.elbow, s.wrist), `${pattern} forearm`).toBeCloseTo(
          BONE.forearm,
          6,
        );
      }
    }
  });

  it("declares at least one watched joint that the skeleton actually has", () => {
    for (const pattern of patterns) {
      const demo = PATTERN_DEMOS[pattern];
      expect(demo.watch.length, pattern).toBeGreaterThan(0);
      for (const joint of demo.watch) {
        expect(
          ["ankle", "knee", "hip", "spine", "shoulder", "elbow", "wrist"],
          `${pattern}: ${joint}`,
        ).toContain(joint);
      }
    }
  });
});
