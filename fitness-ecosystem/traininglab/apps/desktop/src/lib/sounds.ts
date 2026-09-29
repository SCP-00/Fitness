/**
 * Sound cues — three moments worth hearing.
 *
 *   bell         a session was completed
 *   achievement  one exercise reached its prescribed number of sets
 *   record       a personal record just fell
 *
 * Why synthesised and not audio files
 * -----------------------------------
 * Every cue here is built from oscillators at call time. That keeps the bundle
 * free of binary assets (no licensing to track, no attribution, nothing to
 * `import` that a bundler can mangle), works with the app's offline-first
 * guarantee, and lets a cue be tweaked by editing numbers instead of
 * re-exporting a `.mp3`. The three cues are deliberately distinguishable by
 * *shape*, not just pitch — a long decaying bell, a rising three-note arpeggio,
 * a four-note fanfare — so they still read as different events through a phone
 * speaker at arm's length in a gym.
 *
 * The two browser rules that shape the API
 * ----------------------------------------
 *   1. An `AudioContext` created before any user gesture starts `suspended`, and
 *      on iOS Safari it can only be resumed from inside a gesture handler. So
 *      {@link unlockAudio} is registered once on the first interaction and
 *      {@link playCue} is always safe to call: if the context is not running it
 *      silently does nothing rather than throwing mid-workout.
 *   2. Autoplay of *sound* is a user-visible behaviour, not a given — hence the
 *      `enabled` flag, which the Settings panel owns.
 *
 * Nothing here touches the DOM beyond lazy, guarded lookups, so the module can
 * still be imported by the Node test suite.
 *
 * @module lib/sounds
 */

/** The three events that get a sound. */
export type CueKind = "bell" | "achievement" | "record";

export const CUE_KINDS: CueKind[] = ["bell", "achievement", "record"];

/** Bilingual labels, so the Settings panel can render a preview list. */
export const CUE_LABELS: Record<CueKind, { en: string; es: string }> = {
  bell: { en: "Session finished", es: "Entrenamiento terminado" },
  achievement: { en: "Exercise completed", es: "Ejercicio completado" },
  record: { en: "New personal record", es: "Nuevo récord personal" },
};

interface SoundConfig {
  enabled: boolean;
  /** 0–1. Kept low by default: this plays in a gym, next to a speaker. */
  volume: number;
}

const config: SoundConfig = { enabled: true, volume: 0.5 };

/** Update the user's preference (called from Settings on load and on change). */
export function configureSounds(next: Partial<SoundConfig>): void {
  if (typeof next.enabled === "boolean") config.enabled = next.enabled;
  if (typeof next.volume === "number") {
    config.volume = Math.min(Math.max(next.volume, 0), 1);
  }
}

export function soundConfig(): Readonly<SoundConfig> {
  return { ...config };
}

export function soundsEnabled(): boolean {
  return config.enabled;
}

// ── Audio plumbing ─────────────────────────────────────────────────────────

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlockBound = false;

/** `AudioContext` under either spelling (Safari still ships the prefix). */
function audioCtor(): Ctor | null {
  if (typeof globalThis === "undefined") return null;
  const w = globalThis as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * True when this environment can play a cue at all. Exported so the Settings
 * panel can explain itself on a platform without Web Audio instead of offering
 * a switch that does nothing.
 */
export function audioSupported(): boolean {
  return audioCtor() !== null;
}

/** Lazily create the context + master gain. Returns `null` when unsupported. */
function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

/**
 * Resume the audio context from inside a real user gesture.
 *
 * Call this once (a `pointerdown`/`keydown` listener on `window`), not before
 * every cue: after the first successful resume the context stays running for the
 * life of the page.
 */
export async function unlockAudio(): Promise<boolean> {
  const context = ensureContext();
  if (!context) return false;
  if (context.state === "running") return true;
  try {
    await context.resume();
    // `state` is a readonly property, so TypeScript keeps the narrowing from the
    // `=== "running"` check above and would call this comparison unreachable.
    // Reading it through `String` reflects what the browser actually reports
    // after `resume()` resolved.
    return String(context.state) === "running";
  } catch {
    return false;
  }
}

/**
 * Install the one-time gesture listener that unlocks audio.
 *
 * Idempotent, and a no-op outside a browser — both properties matter because
 * this is called from a React effect that can re-run.
 */
export function installAudioUnlock(): void {
  if (unlockBound) return;
  if (
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  )
    return;
  unlockBound = true;

  const onGesture = () => {
    void unlockAudio().then((running) => {
      if (running) {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
        window.removeEventListener("touchstart", onGesture);
      }
    });
  };
  window.addEventListener("pointerdown", onGesture, { passive: true });
  window.addEventListener("keydown", onGesture);
  window.addEventListener("touchstart", onGesture, { passive: true });
}

// ── Synthesis primitives ───────────────────────────────────────────────────

interface ToneOptions {
  /** Frequency in Hz. */
  freq: number;
  /** Offset from "now" in seconds. */
  at: number;
  /** How long the node stays alive, in seconds (the longest this tone can ring). */
  dur: number;
  /** Peak gain, before the master volume. */
  gain: number;
  type?: OscillatorType;
  /** Exponential-decay time constant; defaults to a third of `dur`. */
  decay?: number;
  /** Attack in seconds — keeps the onset click-free without a limiter. */
  attack?: number;
}

/**
 * One enveloped oscillator.
 *
 * The envelope is attack → exponential decay to a floor. `exponentialRampToValueAtTime`
 * cannot reach 0, so the tail lands on 0.0001 and the node is stopped right
 * after; that is what keeps concurrent cues from clicking.
 */
function tone(context: AudioContext, out: GainNode, o: ToneOptions): void {
  const start = context.currentTime + o.at;
  const attack = o.attack ?? 0.005;
  const decay = o.decay ?? o.dur / 3;
  const peak = Math.max(o.gain, 0.0001);

  const osc = context.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, start);

  const env = context.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(peak, start + attack);
  // `decay` is the fade; `dur` is how long the node lives. They differ for the
  // higher bell partials, which must die away well before the fundamental does.
  env.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);

  osc.connect(env);
  env.connect(out);
  osc.start(start);
  osc.stop(start + attack + Math.max(decay, o.dur) + 0.02);
}

/** Wrap `tone` for a set of frequency multipliers (inharmonic partials). */
function partials(
  context: AudioContext,
  out: GainNode,
  base: ToneOptions,
  ratios: { ratio: number; gain: number; decay: number }[],
): void {
  for (const p of ratios) {
    tone(context, out, {
      ...base,
      freq: base.freq * p.ratio,
      gain: base.gain * p.gain,
      decay: p.decay,
    });
  }
}

// ── The three cues ─────────────────────────────────────────────────────────

/**
 * Struck-bell partials. Real bells are inharmonic (roughly 1 : 2 : 3 : 4.2 for a
 * tubular bell), and it is that non-integer spread — not the fundamental — that
 * the ear reads as "bell" instead of "beep". Higher partials also die sooner.
 */
const BELL_PARTIALS = [
  { ratio: 1, gain: 0.55, decay: 1.5 },
  { ratio: 2.0, gain: 0.3, decay: 0.8 },
  { ratio: 3.01, gain: 0.16, decay: 0.45 },
  { ratio: 4.17, gain: 0.08, decay: 0.28 },
];

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const G4 = 392;
const C6 = 1046.5;

function playBell(context: AudioContext, out: GainNode): void {
  partials(
    context,
    out,
    { freq: 660, at: 0, dur: 1.6, gain: 0.5 },
    BELL_PARTIALS,
  );
  // A second, quieter strike a hair late gives the "ring" a little body.
  partials(
    context,
    out,
    { freq: 660, at: 0.012, dur: 1.2, gain: 0.18 },
    BELL_PARTIALS,
  );
}

/** Rising C-major arpeggio: short, bright, unmistakably "done". */
function playAchievement(context: AudioContext, out: GainNode): void {
  const notes = [C5, E5, G5];
  notes.forEach((freq, i) => {
    partials(
      context,
      out,
      { freq, at: i * 0.11, dur: 0.5, gain: 0.34, type: "triangle" },
      [
        { ratio: 1, gain: 0.7, decay: 0.22 },
        { ratio: 2, gain: 0.22, decay: 0.12 },
      ],
    );
  });
}

/** Four-note fanfare + a high shimmer, ~1.3 s: a record is a bigger deal. */
function playRecord(context: AudioContext, out: GainNode): void {
  const notes = [G4, C5, E5, G5];
  notes.forEach((freq, i) => {
    const at = i * 0.13;
    partials(
      context,
      out,
      { freq, at, dur: 0.75, gain: 0.34, type: "triangle" },
      [
        { ratio: 1, gain: 0.7, decay: 0.3 },
        { ratio: 2, gain: 0.26, decay: 0.16 },
        { ratio: 3, gain: 0.1, decay: 0.1 },
      ],
    );
  });
  // Held fifth on top of the last note, plus a sparkle two octaves up.
  tone(context, out, {
    freq: C5,
    at: 0.39,
    dur: 0.9,
    gain: 0.16,
    type: "triangle",
    decay: 0.5,
  });
  tone(context, out, {
    freq: G5,
    at: 0.39,
    dur: 0.9,
    gain: 0.16,
    type: "triangle",
    decay: 0.5,
  });
  tone(context, out, { freq: C6, at: 0.44, dur: 1.1, gain: 0.1, decay: 0.6 });
  tone(context, out, {
    freq: C5 * 2.99,
    at: 0.46,
    dur: 0.8,
    gain: 0.05,
    decay: 0.4,
  });
}

const PLAYERS: Record<CueKind, (ctx: AudioContext, out: GainNode) => void> = {
  bell: playBell,
  achievement: playAchievement,
  record: playRecord,
};

/**
 * Play one cue. Never throws and never awaits: it is called from event handlers
 * in the middle of a workout, so a blocked or unsupported audio stack must be
 * invisible rather than disruptive.
 *
 * Returns `true` when a cue was actually scheduled (handy for tests).
 */
export function playCue(kind: CueKind): boolean {
  if (!config.enabled) return false;
  const context = ensureContext();
  if (!context || !master) return false;
  // Still suspended ⇒ no user gesture yet ⇒ the browser would drop the sound
  // anyway. Skipping avoids leaving the context in a broken half-state.
  if (context.state !== "running") {
    void unlockAudio();
    return false;
  }

  const out = context.createGain();
  out.gain.value = config.volume;
  out.connect(master);

  try {
    PLAYERS[kind](context, out);
  } catch {
    return false;
  }

  // Let the tail ring, then drop the node so long workouts do not accumulate
  // gain nodes. Unref'd and guarded: this is cosmetic cleanup.
  const lifeMs = kind === "record" ? 2000 : kind === "bell" ? 2200 : 900;
  setTimeout(() => {
    try {
      out.disconnect();
    } catch {
      /* already gone */
    }
  }, lifeMs);

  return true;
}

/** Test-only: forget the singleton so a fake context can be installed. */
export function resetAudioForTests(): void {
  ctx = null;
  master = null;
  unlockBound = false;
  config.enabled = true;
  config.volume = 0.5;
}
