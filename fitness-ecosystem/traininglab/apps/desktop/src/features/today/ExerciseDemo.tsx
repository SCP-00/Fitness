/**
 * The exercise demo — how the movement actually looks when done right.
 *
 * Owner decision (2026-09-29): real photographs/animation beat our stick
 * figure, so the modal is media-first with a three-step cascade:
 *
 *   1. animated GIF  (the 36 shipped ones — Gym Visual royalty-free licence,
 *                      already cleared for this repo, same files BodyLab uses);
 *   2. reference still (free-exercise-db, Unlicense/public domain);
 *   3. drawn fallback  (our own SVG rig — no licence at all, covers the rest).
 *
 * Every asset URL goes through `import.meta.env.BASE_URL`: the LAN server and
 * GitHub Pages both serve the app from a subpath, and Vite only rewrites URLs
 * inside `index.html` (documented gotcha in AGENTS.md).
 *
 * @module features/today/ExerciseDemo
 */

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import {
  PATTERN_DEMOS,
  getExerciseTechnique,
  type Cue,
  type DemoJoint,
  type DemoPose,
  type MovementPattern,
  type PatternDemo,
} from "@fitness/bodylab-exercises";
import { t, getLanguage } from "../../lib/i18n";

/** Shape of one asset-manifest entry (only what this component needs). */
interface MediaEntry {
  gif?: string;
  image?: string;
  /** Second public-domain still (end position) when the source provides one. */
  imageAlt?: string | null;
}

/**
 * The shipped manifest is fetched once per session and cached at module level:
 * exercises absent from it render the drawn fallback immediately instead of
 * firing a guaranteed 404.
 */
let manifestPromise: Promise<Record<string, MediaEntry>> | null = null;
function getManifest(): Promise<Record<string, MediaEntry>> {
  manifestPromise ??= fetch(
    `${import.meta.env.BASE_URL}exercises/asset-manifest.json`,
  )
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return manifestPromise;
}

function useExerciseMedia(exerciseId: string): MediaEntry | null | undefined {
  const [entry, setEntry] = useState<MediaEntry | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getManifest().then((m) => {
      if (alive) setEntry(m[exerciseId] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [exerciseId]);
  return entry;
}

/** The GIF naming convention is `<exerciseId>.gif`; stills come from the entry. */
const gifUrlFor = (exerciseId: string): string =>
  `${import.meta.env.BASE_URL}exercises/gifs/${exerciseId}.gif`;
const stillUrlFor = (entry: MediaEntry): string | null =>
  entry.image ? `${import.meta.env.BASE_URL}exercises/${entry.image}` : null;

/** Bone lengths in SVG units — proportions of a figure, not measurements. */
const BONE = {
  torso: 46,
  thigh: 40,
  shin: 38,
  arm: 30,
  forearm: 26,
  hand: 10,
  foot: 14,
} as const;

interface Pt {
  x: number;
  y: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;
/** Unit vector pointing "down" rotated forward by `deg` (SVG y grows downward). */
const fromDown = (deg: number): Pt => ({
  x: Math.sin(rad(deg)),
  y: Math.cos(rad(deg)),
});
/** Same, measured from straight up (the torso convention). */
const fromUp = (deg: number): Pt => ({
  x: Math.sin(rad(deg)),
  y: -Math.cos(rad(deg)),
});
const add = (a: Pt, d: Pt, k = 1): Pt => ({ x: a.x + d.x * k, y: a.y + d.y * k });

/** A pose with every optional angle resolved, so interpolation is total. */
interface FullPose {
  torso: number;
  thigh: number;
  shin: number;
  arm: number;
  forearm: number;
  hand: number;
  foot: number;
  spread: number;
  legSpread: number;
}

const normalize = (p: DemoPose): FullPose => ({
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

const lerpPose = (a: FullPose, b: FullPose, k: number): FullPose => ({
  torso: a.torso + (b.torso - a.torso) * k,
  thigh: a.thigh + (b.thigh - a.thigh) * k,
  shin: a.shin + (b.shin - a.shin) * k,
  arm: a.arm + (b.arm - a.arm) * k,
  forearm: a.forearm + (b.forearm - a.forearm) * k,
  hand: a.hand + (b.hand - a.hand) * k,
  foot: a.foot + (b.foot - a.foot) * k,
  spread: a.spread + (b.spread - a.spread) * k,
  legSpread: a.legSpread + (b.legSpread - a.legSpread) * k,
});

/**
 * Where in the cycle we are: frames played forward then backward, so authors
 * never write the return trip and the loop can never look like a teleport.
 */
function poseAt(demo: PatternDemo, elapsedMs: number): FullPose {
  const frames = demo.frames;
  if (frames.length === 1) return normalize(frames[0]!);
  const legMs = demo.cycleMs;
  const travel = legMs * (frames.length - 1);
  const phase = elapsedMs % (2 * travel);
  const forward = phase <= travel ? phase : 2 * travel - phase;
  const pos = (forward / legMs) * 1;
  const i = Math.min(frames.length - 2, Math.floor(pos));
  const k = Math.min(1, Math.max(0, pos - i));
  return lerpPose(normalize(frames[i]!), normalize(frames[i + 1]!), k);
}

/** Every named point of the solved figure for one pose. */
interface Skeleton {
  hip: Pt;
  shoulder: Pt;
  elbow: Pt;
  wrist: Pt;
  finger: Pt;
  knee: Pt;
  ankle: Pt;
  toe: Pt;
  /** Front view only: the mirrored far-side limbs. */
  kneeB?: Pt;
  ankleB?: Pt;
  elbowB?: Pt;
  wristB?: Pt;
}

function solve(demo: PatternDemo, pose: FullPose): Skeleton {
  if (demo.view === "front") {
    // Front view: the spine is the centre line; arms and legs open sideways
    // symmetrically (`spread` / `legSpread`).
    const hip: Pt = { x: 0, y: 0 };
    const shoulder = add(hip, fromUp(pose.torso), BONE.torso);
    const legL = fromDown(pose.legSpread);
    const legR = fromDown(-pose.legSpread);
    const knee = add(hip, legL, BONE.thigh);
    const ankle = add(knee, legL, BONE.shin);
    const kneeB = add(hip, legR, BONE.thigh);
    const ankleB = add(kneeB, legR, BONE.shin);
    const armL = fromDown(pose.spread);
    const armR = fromDown(-pose.spread);
    const elbow = add(shoulder, armL, BONE.arm);
    const wrist = add(elbow, armL, BONE.forearm);
    const finger = add(wrist, fromDown(pose.hand), BONE.hand);
    const elbowB = add(shoulder, armR, BONE.arm);
    const wristB = add(elbowB, armR, BONE.forearm);
    return {
      hip,
      shoulder,
      elbow,
      wrist,
      finger,
      knee,
      ankle,
      toe: ankle,
      kneeB,
      ankleB,
      elbowB,
      wristB,
    };
  }

  if (demo.anchor === "ankle") {
    // Standing: the foot stays planted, the pelvis travels.
    const ankle: Pt = { x: 0, y: 0 };
    const toe = add(ankle, fromDown(pose.foot), BONE.foot);
    const knee = add(ankle, fromDown(pose.shin), -BONE.shin);
    const hip = add(knee, fromDown(pose.thigh), -BONE.thigh);
    const shoulder = add(hip, fromUp(pose.torso), BONE.torso);
    const elbow = add(shoulder, fromDown(pose.arm), BONE.arm);
    const wrist = add(elbow, fromDown(pose.forearm), BONE.forearm);
    const finger = add(wrist, fromDown(pose.hand), BONE.hand);
    return { hip, shoulder, elbow, wrist, finger, knee, ankle, toe };
  }

  // Lying / hanging / planked: the pelvis is pinned, the limbs travel.
  const hip: Pt = { x: 0, y: 0 };
  const knee = add(hip, fromDown(pose.thigh), BONE.thigh);
  const ankle = add(knee, fromDown(pose.shin), BONE.shin);
  const toe = add(ankle, fromDown(pose.foot), BONE.foot);
  const shoulder = add(hip, fromUp(pose.torso), BONE.torso);
  const elbow = add(shoulder, fromDown(pose.arm), BONE.arm);
  const wrist = add(elbow, fromDown(pose.forearm), BONE.forearm);
  const finger = add(wrist, fromDown(pose.hand), BONE.hand);
  return { hip, shoulder, elbow, wrist, finger, knee, ankle, toe };
}

const pointsOf = (s: Skeleton): Pt[] =>
  [
    s.hip,
    s.shoulder,
    s.elbow,
    s.wrist,
    s.finger,
    s.knee,
    s.ankle,
    s.toe,
    s.kneeB,
    s.ankleB,
    s.elbowB,
    s.wristB,
  ].filter((p): p is Pt => p !== undefined);

/** Fixed viewBox that fits every frame, so the drawing never rescales mid-loop. */
function viewBoxFor(demo: PatternDemo): string {
  const all = demo.frames.flatMap((f) => pointsOf(solve(demo, normalize(f))));
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const pad = 16;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const w = Math.max(maxX - minX, 120);
  const h = Math.max(maxY - minY, 96);
  return `${Math.round(minX)} ${Math.round(minY)} ${Math.round(w)} ${Math.round(h)}`;
}

const line = (a: Pt, b: Pt): string => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;

function watchPoint(s: Skeleton, joint: DemoJoint): Pt | null {
  switch (joint) {
    case "ankle":
      return s.ankle;
    case "knee":
      return s.knee;
    case "hip":
      return s.hip;
    case "spine":
      return {
        x: (s.hip.x + s.shoulder.x) / 2,
        y: (s.hip.y + s.shoulder.y) / 2,
      };
    case "shoulder":
      return s.shoulder;
    case "elbow":
      return s.elbow;
    case "wrist":
      return s.wrist;
  }
}

/** The looping drawn figure — the last step of the media cascade. */
export function DemoFigure({ demo }: { demo: PatternDemo }) {
  const [pose, setPose] = useState<FullPose>(() =>
    normalize(demo.frames[0]!),
  );

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
    ) {
      setPose(normalize(demo.frames[0]!));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setPose(poseAt(demo, now - start));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  const s = useMemo(() => solve(demo, pose), [demo, pose]);
  const viewBox = useMemo(() => viewBoxFor(demo), [demo]);
  const groundY = useMemo(() => {
    if (!demo.ground) return null;
    const ys = demo.frames.flatMap((f) => {
      const sk = solve(demo, normalize(f));
      return [sk.ankle.y, sk.toe.y];
    });
    return Math.max(...ys) + 5;
  }, [demo]);

  const near = "var(--tl-text)";
  const far = "var(--tl-text-muted)";
  const watchPts = demo.watch
    .map((j) => watchPoint(s, j))
    .filter((p): p is Pt => p !== null);

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-auto"
      role="img"
      aria-label={t("tech.demoAlt")}
    >
      {groundY !== null && (
        <line
          x1={viewBox.split(" ")[0]}
          x2={Number(viewBox.split(" ")[0]) + Number(viewBox.split(" ")[2])}
          y1={groundY}
          y2={groundY}
          stroke="var(--tl-border)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
      {s.ankleB && s.kneeB && (
        <path
          d={line(s.hip, s.kneeB) + line(s.kneeB, s.ankleB)}
          stroke={far}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
        />
      )}
      {s.wristB && s.elbowB && (
        <path
          d={line(s.shoulder, s.elbowB) + line(s.elbowB, s.wristB)}
          stroke={far}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
        />
      )}
      <path
        d={
          line(s.hip, s.shoulder) +
          line(s.hip, s.knee) +
          line(s.knee, s.ankle) +
          line(s.ankle, s.toe) +
          line(s.shoulder, s.elbow) +
          line(s.elbow, s.wrist) +
          line(s.wrist, s.finger)
        }
        stroke={near}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={add(s.shoulder, fromUp(pose.torso), 11).x}
        cy={add(s.shoulder, fromUp(pose.torso), 11).y}
        r={8}
        stroke={near}
        strokeWidth={5}
        fill="none"
      />
      {watchPts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={5.5}
          fill="none"
          stroke="var(--tl-accent)"
          strokeWidth={3}
        />
      ))}
    </svg>
  );
}

const cueText = (c: Cue, lang: "en" | "es"): string => c[lang];

/**
 * The tap-to-open demo + coaching card for one exercise slot.
 * Media cascade first (GIF → still → drawn), technique text always.
 */
export function ExerciseDemoModal({
  exerciseId,
  pattern,
  name,
  onClose,
}: {
  exerciseId: string;
  pattern: MovementPattern;
  name: string;
  onClose: () => void;
}) {
  const lang = getLanguage();
  const demo = PATTERN_DEMOS[pattern];
  const tech = getExerciseTechnique(exerciseId);
  const media = useExerciseMedia(exerciseId);
  const stillUrl = media?.image ? stillUrlFor(media) : null;
  const altStillUrl =
    media?.imageAlt && media.imageAlt !== media.image
      ? `${import.meta.env.BASE_URL}exercises/${media.imageAlt}`
      : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!demo) return null;

  const showGif = !!media?.gif;
  const showStill = !showGif && stillUrl !== null;
  const showDrawn = !showGif && !showStill;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-[var(--tl-surface)] border border-[var(--tl-border)] rounded-t-3xl sm:rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold leading-tight">{name}</h3>
            <p className="text-xs text-[var(--tl-text-muted)] mt-0.5">
              {t("tech.modalTitle")}
              {tech ? ` · ${t("tech.tempo")} ${tech.tempo}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("tech.close")}
            className="p-2 rounded-xl tl-btn-ghost tl-focusable shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>        <div className="mt-3 rounded-2xl bg-[var(--tl-surface-2)] border border-[var(--tl-border)] p-3">
          {showGif && (
            <img
              src={gifUrlFor(exerciseId)}
              alt={name}
              loading="lazy"
              className="w-full h-auto rounded-xl"
            />
          )}
          {showStill && (
            <div
              className={
                altStillUrl
                  ? "grid grid-cols-2 gap-2"
                  : "flex justify-center"
              }
            >
              <img
                src={stillUrl!}
                alt={`${name} — ${t("tech.startPos")}`}
                loading="lazy"
                className="w-full h-auto rounded-xl"
              />
              {altStillUrl && (
                <img
                  src={altStillUrl}
                  alt={`${name} — ${t("tech.endPos")}`}
                  loading="lazy"
                  className="w-full h-auto rounded-xl"
                />
              )}
            </div>
          )}
          {showStill && (
            <p className="text-[11px] text-[var(--tl-text-muted)] text-center mt-1 flex items-center justify-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {altStillUrl
                ? t("tech.stillPair")
                : t("tech.stillPhoto")}
            </p>
          )}
          {showDrawn && <DemoFigure demo={demo} />}
          <p className="text-[11px] text-[var(--tl-text-muted)] text-center mt-1">
            {t("tech.watchOut")}: {" "}
            {demo.watch.map((j) => t(`tech.joint.${j}`)).join(" · ")}
          </p>
        </div>

        {tech && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium bg-[var(--tl-accent)]/10 text-[var(--tl-accent)] border-transparent">
                {t("tech.level")} {tech.techniqueLevel}/5
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] border-[var(--tl-border)]">
                {t("tech.effort")}: RIR {tech.effort.rir}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] border-[var(--tl-border)]">
                {t("tech.joint")} {tech.jointStress}/3
              </span>
            </div>

            <p className="text-[var(--tl-text-secondary)]">
              {cueText(tech.techniqueWhy, lang)}
            </p>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mb-1">
                {t("tech.execution")}
              </p>
              <ul className="space-y-0.5 text-[var(--tl-text-secondary)]">
                {tech.execution.slice(0, 4).map((c, i) => (
                  <li key={i}>• {cueText(c, lang)}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mb-1">
                {t("tech.mistakes")}
              </p>
              <ul className="space-y-0.5 text-[var(--tl-text-secondary)]">
                {tech.mistakes.slice(0, 3).map((c, i) => (
                  <li key={i}>• {cueText(c, lang)}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[13px] text-amber-400">
              <p className="font-semibold mb-0.5">{t("tech.safety")}</p>
              {tech.safety.map((c, i) => (
                <p key={i}>• {cueText(c, lang)}</p>
              ))}
              <p className="mt-1 opacity-90">
                {t("tech.breathing")}: {cueText(tech.breathing, lang)}
              </p>
            </div>

            <p className="text-xs text-[var(--tl-text-muted)]">
              {t("tech.effortNote")} {cueText(tech.effort.note, lang)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
