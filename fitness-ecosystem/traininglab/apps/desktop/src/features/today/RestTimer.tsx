/**
 * Rest timer — the one deadline of `lib/rest.ts`, drawn in the two places the
 * app needs it.
 *
 * The countdown is **read** from the store's `RestState`, never kept here: the
 * card inside the session (`mockup/03-sesion.html`, right column) and the
 * floating overlay on the other screens are two views of the same rest, and a
 * component that owned `remaining` could be remounted — navigating away and back
 * — only by restarting the countdown from the top. Ticking is local (1 Hz) so the
 * whole store does not re-render every second.
 *
 * Zero is announced on two channels, on purpose: the **sound** is the foreground
 * alert (the common case is the owner looking at another screen of the app, phone
 * on a bench) and the **notification** is the background one, raised only while
 * the tab is hidden so it never doubles what was already heard. Before 2026-10-11
 * only the notification existed and its copy promised an app cue that nothing
 * played — the rest ended silently in front of the user.
 *
 * The alert fires from whichever view is mounted (only one ever is), guarded by
 * the rest's own `nonce`, so a re-render or StrictMode's double invoke cannot
 * alert twice.
 *
 * @module features/today/RestTimer
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { t } from "../../lib/i18n";
import { notifyRestDone } from "../../lib/notifications";
import {
  REST_EXTRA_SEC,
  restPercent,
  restRemaining,
  type RestState,
} from "../../lib/rest";
import { playCue } from "../../lib/sounds";
import { MIcons } from "../../ui/mockup-icons";

/** `mm:ss`, the shape both views show. */
function clock(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** `--pct` for the mockup's conic-gradient ring. */
function ringStyle(pct: number): CSSProperties {
  return { ["--pct" as string]: String(pct) } as CSSProperties;
}

export default function RestTimer({
  rest,
  nextExercise,
  variant = "floating",
  onExtend,
  onTogglePause,
  onSkip,
}: {
  rest: RestState;
  /** Named in the notification body; `null` when unknown. */
  nextExercise?: string | null;
  /**
   * `floating` — the overlay that follows the owner across destinations.
   * `inline` — the body of the session's *Descanso* card (mockup 03).
   */
  variant?: "floating" | "inline";
  onExtend: (seconds: number) => void;
  onTogglePause: () => void;
  onSkip: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const paused = rest.pausedRemaining !== null;

  // Read through a ref so the alert does not need re-creating when the exercise
  // changes mid-rest.
  const nextRef = useRef(nextExercise ?? null);
  nextRef.current = nextExercise ?? null;

  useEffect(() => {
    // A paused countdown has nothing to tick: freezing it is the whole point.
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused, rest.nonce]);

  const remaining = restRemaining(rest, now);

  // Reaching zero, exactly once per rest: the ref holds the `nonce` that already
  // alerted, so a re-render (or StrictMode's double invoke) cannot alert twice.
  const alertedRef = useRef<number | null>(null);
  useEffect(() => {
    if (remaining > 0 || alertedRef.current === rest.nonce) return;
    alertedRef.current = rest.nonce;
    // Foreground alert: `playCue` respects the sound switch and stays silent when
    // audio was never unlocked — never throws mid-set.
    playCue("rest");
    notifyRestDone(nextRef.current);
    onSkip();
  }, [remaining, rest.nonce, onSkip]);

  const pct = restPercent(rest, remaining);

  if (variant === "inline") {
    /*
     * The body of the mockup's Descanso card: the ring with the seconds served,
     * and next to it pause and +15 s. The countdown is the same value as the
     * overlay's, read from the same deadline.
     */
    return (
      <div className="row" style={{ gap: 18, justifyContent: "center" }}>
        <div
          className="ring progress-ring-lg"
          style={ringStyle(pct)}
          role="img"
          aria-label={`${clock(remaining)} · ${t("timer.rest")}`}
        >
          <div>
            <div className="ring-value">
              {remaining}
              <small>s</small>
            </div>
            <div className="tiny muted" style={{ marginTop: 2 }}>
              / {rest.total} s
            </div>
          </div>
        </div>
        <div className="stack" style={{ gap: 10, flex: "none" }}>
          <button
            type="button"
            onClick={onTogglePause}
            aria-pressed={paused}
            title={t(paused ? "timer.resume" : "timer.pause")}
            aria-label={t(paused ? "timer.resume" : "timer.pause")}
            className="btn tl-focusable"
            style={{ width: 74, height: 44 }}
          >
            {paused ? <MIcons.play /> : <MIcons.pause />}
          </button>
          <button
            type="button"
            onClick={() => onExtend(REST_EXTRA_SEC)}
            className="btn tl-focusable"
            style={{ width: 74, height: 44 }}
          >
            {t("timer.plus15")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-64 rounded-2xl bg-[var(--tl-surface)] border border-[var(--tl-border-strong)] shadow-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--tl-accent)]">
          <MIcons.timer />
          {t("timer.rest")}
        </span>
        <button
          onClick={onSkip}
          aria-label={t("timer.skip")}
          className="p-1 rounded-lg text-[var(--tl-text-muted)] hover:text-white hover:bg-white/10"
        >
          <MIcons.x />
        </button>
      </div>
      {/* The rest belongs to an exercise: naming it is what makes the alert
          per-exercise instead of an anonymous countdown. */}
      {nextExercise && (
        <p className="-mt-1 mb-1.5 text-[11px] text-[var(--tl-text-muted)] truncate text-center">
          {nextExercise}
        </p>
      )}
      <p
        className={`text-4xl font-bold tabular-nums text-center ${remaining === 0 ? "text-[var(--tl-accent)] animate-pulse" : ""}`}
      >
        {clock(remaining)}
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--tl-accent)] transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onTogglePause}
          aria-pressed={paused}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white"
        >
          {paused ? <MIcons.play /> : <MIcons.pause />}
          {t(paused ? "timer.resume" : "timer.pause")}
        </button>
        <button
          onClick={() => onExtend(REST_EXTRA_SEC)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white"
        >
          <MIcons.plus />
          {t("timer.plus15")}
        </button>
      </div>
      <button
        onClick={onSkip}
        className="mt-2 w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white"
      >
        {t("timer.skip")}
      </button>
    </div>
  );
}
