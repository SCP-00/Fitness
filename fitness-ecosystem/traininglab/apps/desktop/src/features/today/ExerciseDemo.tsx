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
  demoFor,
  getExerciseTechnique,
  type Cue,
  type DemoJoint,
  type DemoPose,
  type MovementPattern,
  type PatternDemo,
} from "@fitness/bodylab-exercises";
import { t, getLanguage } from "../../lib/i18n";

/**
 * The media cascade (GIF → stills → drawn figure) lives in
 * `features/exercises/media.ts`, shared with the rows of the two lists: the
 * answer to "what does this exercise look like" must not depend on which screen
 * is asking.
 */
import {
  altStillUrlFor,
  gifUrlFor,
  stillUrlFor,
  useExerciseMedia,
} from "../exercises/media";

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
const add = (a: Pt, d: Pt, k = 1): Pt => ({
  x: a.x + d.x * k,
  y: a.y + d.y * k,
});

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
 *
 * `elapsedMs` is clamped at zero because the first rAF callback carries the
 * **frame's** start timestamp, which can be a few ms *before* the
 * `performance.now()` the effect captured. A negative elapsed made `%` return a
 * negative phase, the index fell to `-1` and `normalize(undefined)` threw inside
 * the animation loop — killing the figure mid-session and leaving a red console
 * (seen in the ported session, 2026-10-14). Clamping the index as well makes the
 * arithmetic total: no input can produce an out-of-range frame.
 */
function poseAt(demo: PatternDemo, elapsedMs: number): FullPose {
  const frames = demo.frames;
  if (frames.length === 1) return normalize(frames[0]!);
  const legMs = demo.cycleMs;
  const travel = legMs * (frames.length - 1);
  const elapsed = Math.max(0, elapsedMs);
  const phase = elapsed % (2 * travel);
  const forward = phase <= travel ? phase : 2 * travel - phase;
  const pos = forward / legMs;
  const i = Math.min(frames.length - 2, Math.max(0, Math.floor(pos)));
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

/**
 * The looping drawn figure — the last step of the media cascade.
 *
 * `className` exists because the two callers need opposite sizes (2026-10-21).
 * The stage gives the figure a 16:9 box; the fact sheet used to let the SVG size
 * itself from its viewBox, so a standing figure at `w-full` was ~600 px tall and
 * pushed «Preparación», «Ejecución» and the safety block below the fold — the
 * dialog opened on a stick figure and no text. The modal now caps the height.
 */
export function DemoFigure({
  demo,
  className = "w-full h-auto",
}: {
  demo: PatternDemo;
  className?: string;
}) {
  const [pose, setPose] = useState<FullPose>(() => normalize(demo.frames[0]!));

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
      className={className}
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
 * The media cascade in one place: reference GIF → still(s) → drawn figure.
 *
 * Two looks, because the same assets are read differently in each place:
 *
 *   * `modal` — the fact sheet. The GIF is capped so a 180 px source is never
 *     blown up past readability, and the caption below says which of the three
 *     the reader is looking at.
 *   * `stage` — the session stage (mockup `03-sesion.html`). The frame is the
 *     page's `.frame` (16:9, `contain`) with the page's own `.media-toggle` on
 *     top: the loop, and the start/end position **one at a time** — at 16:9 on a
 *     phone, comparing the two ends of a movement means looking at one, then the
 *     other, not at two thumbnails side by side.
 *
 * Returns `null` when the exercise has none of the three, so the caller hides the
 * slot instead of drawing an empty box.
 */
type StageView = "gif" | "start" | "end";
export function ExerciseMediaFrame({
  exerciseId,
  pattern,
  name,
  variant = "modal",
}: {
  exerciseId: string;
  pattern: MovementPattern;
  name: string;
  variant?: "modal" | "stage";
}) {
  const media = useExerciseMedia(exerciseId);
  const demo = demoFor(exerciseId, pattern);
  const stillUrl = media?.image ? stillUrlFor(media) : null;
  const altStillUrl = media ? altStillUrlFor(media) : null;
  const hasGif = !!media?.gif;
  const isStage = variant === "stage";

  /** The views the stage can offer, in the mockup's own order. */
  const stageViews: StageView[] = [
    ...(hasGif ? (["gif"] as const) : []),
    ...(stillUrl ? (["start"] as const) : []),
    ...(altStillUrl ? (["end"] as const) : []),
  ];
  const [preferredView, setPreferredView] = useState<StageView>("gif");
  const firstView: StageView = stageViews[0] ?? "gif";
  /*
   * The stored view is a **preference**, honoured only while this frame can
   * offer it. The manifest arrives asynchronously, so the first paint of a new
   * exercise has no views at all: reading a stale `preferredView` there used to
   * fall through to the drawn figure for one frame (a flash of the line-art, and
   * the only path that could ever mount its animation loop on a view the owner
   * had not asked for). Falling back to the frame's own first view is what makes
   * the cascade answer to the assets, not to the last click.
   */
  const view: StageView = stageViews.includes(preferredView)
    ? preferredView
    : firstView;
  // A new exercise starts on its own first view, so the switch never opens on a
  // tab that no longer exists.
  useEffect(() => setPreferredView("gif"), [exerciseId]);

  const showGif = hasGif && (!isStage || view === "gif");
  // The modal keeps its pair of stills side by side; the stage shows one at a
  // time, chosen by the switch.
  const showStillPair = !isStage && !showGif && stillUrl !== null;
  const stageStill =
    isStage && !showGif
      ? view === "end"
        ? altStillUrl
        : view === "start"
          ? stillUrl
          : null
      : null;
  const showDrawn = !showGif && !showStillPair && stageStill === null && !!demo;

  if (!showGif && !showStillPair && stageStill === null && !showDrawn)
    return null;

  if (isStage) {
    return (
      <div className="frame">
        {showGif && (
          <img src={gifUrlFor(exerciseId)} alt={name} loading="lazy" />
        )}
        {stageStill !== null && (
          <img
            src={stageStill}
            alt={`${name} — ${t(view === "end" ? "tech.endPos" : "tech.startPos")}`}
            loading="lazy"
          />
        )}
        {showDrawn && <DemoFigure demo={demo} />}

        {/*
         * The mockup's switch, and only with something to switch between: a
         * single-view frame is not a choice the owner can make.
         */}
        {stageViews.length > 1 && (
          <div className="media-toggle" role="tablist">
            {stageViews.map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setPreferredView(v)}
                className={`tl-focusable ${view === v ? "is-active" : ""}`}
              >
                {t(
                  v === "gif"
                    ? "tech.viewGif"
                    : v === "start"
                      ? "tech.viewStart"
                      : "tech.viewEnd",
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {showGif && (
        <img
          src={gifUrlFor(exerciseId)}
          alt={name}
          loading="lazy"
          className="mx-auto block w-full max-w-[28rem] h-auto rounded-xl"
        />
      )}
      {showStillPair && (
        <div
          className={
            altStillUrl ? "grid grid-cols-2 gap-2" : "flex justify-center"
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
      {/*
        Capped height, like the GIF (2026-10-21). A standing figure's viewBox is
        tall and narrow, so `w-full` made it the tallest thing in the dialog —
        taller than the media box the GIFs get in the same slot.
      */}
      {showDrawn && (
        <DemoFigure
          demo={demo}
          className="mx-auto block h-[240px] w-full"
        />
      )}
    </div>
  );
}

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
  const demo = demoFor(exerciseId, pattern);
  const tech = getExerciseTechnique(exerciseId);
  const media = useExerciseMedia(exerciseId);
  // Only what the caption needs: which case of the cascade the frame draws.
  const stillMode =
    !media?.gif && media?.image
      ? media.imageAlt && media.imageAlt !== media.image
        ? "pair"
        : "photo"
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

  // No early return when the pattern has no drawn demo: a reference GIF for an
  // exercise without one is still worth opening, and the technique text below is
  // useful on its own.
  const showGif = !!media?.gif;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      {/*
        Wider when there is a reference GIF to look at (2026-10-11). The owner
        studies these frame by frame to correct his technique, and at the old
        `sm:max-w-md` the 180×180 animation rendered at 256 px — 16 % of the
        width of the session card it belongs to, on the laptop this app is used
        on. The animation's own resolution is the ceiling (a 180 px source is
        already being upscaled at 448), so the frame is capped rather than made
        as wide as the dialog: past ~2.5× the source it stops being readable and
        starts being a blur.

        Written as a JSX comment on purpose (2026-10-20): this block used to be
        a bare C-style block comment with no braces around it, which JSX renders
        as literal text — the whole paragraph appeared printed across the
        technique dialog.
      */}
      <div
        className={`w-full ${
          showGif ? "sm:max-w-3xl" : "sm:max-w-md"
        } max-h-[92vh] overflow-y-auto bg-[var(--tl-surface)] border border-[var(--tl-border)] rounded-t-3xl sm:rounded-3xl p-5`}
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
        </div>{" "}
        <div className="mt-3 rounded-2xl bg-[var(--tl-surface-2)] border border-[var(--tl-border)] p-3">
          <ExerciseMediaFrame
            exerciseId={exerciseId}
            pattern={pattern}
            name={name}
          />
          {stillMode && (
            <p className="text-[11px] text-[var(--tl-text-muted)] text-center mt-1 flex items-center justify-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {stillMode === "pair"
                ? t("tech.stillPair")
                : t("tech.stillPhoto")}
            </p>
          )}
          {demo && (
            <p className="text-[11px] text-[var(--tl-text-muted)] text-center mt-1">
              {t("tech.watchOut")}:{" "}
              {demo.watch.map((j) => t(`tech.joint.${j}`)).join(" · ")}
            </p>
          )}
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

            {/*
              Setup before execution (2026-10-21). This modal is the quick
              tutorial opened from a session row, and it showed the execution
              and the mistakes but never the position you have to be in for
              either to mean anything — the full guide had it, this one did not.
              Capped at three cues, like the execution list, so the dialog still
              fits above the fold on a phone.
            */}
            {tech.setup.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mb-1">
                  {t("tech.setup")}
                </p>
                <ul className="space-y-0.5 text-[var(--tl-text-secondary)]">
                  {tech.setup.slice(0, 3).map((c, i) => (
                    <li key={i}>• {cueText(c, lang)}</li>
                  ))}
                </ul>
              </div>
            )}

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
