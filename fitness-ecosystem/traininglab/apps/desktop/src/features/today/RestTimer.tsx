import { useEffect, useRef, useState } from "react";
import { X, Plus, Timer } from "lucide-react";
import { t } from "../../lib/i18n";
import { notifyRestDone } from "../../lib/notifications";

/**
 * Rest timer — a floating countdown started automatically after each set.
 * Zero = a gentle "go" pulse; user can skip or extend. Pure client-side.
 *
 * Reaching zero also raises a notification, so the countdown still lands when
 * the tab is in the background (the common case: the user walked away from the
 * laptop mid-rest).
 */
export default function RestTimer({
  seconds,
  nextExercise,
  onDone,
  onDismiss,
}: {
  seconds: number;
  /** Named in the notification body; `null` when unknown. */
  nextExercise?: string | null;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const doneRef = useRef(false);
  // Read through a ref so the interval does not need re-creating when the
  // exercise changes mid-rest (it would restart the countdown).
  const nextRef = useRef(nextExercise ?? null);
  nextRef.current = nextExercise ?? null;

  // Reset when a new rest starts
  useEffect(() => {
    setRemaining(seconds);
    setTotal(seconds);
    doneRef.current = false;
  }, [seconds]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (!doneRef.current) {
            doneRef.current = true;
            notifyRestDone(nextRef.current);
            onDone();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDone]);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-64 rounded-2xl bg-[var(--tl-surface)] border border-[var(--tl-border-strong)] shadow-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--tl-accent)]">
          <Timer className="w-4 h-4" />
          {t("timer.rest")}
        </span>
        <button
          onClick={onDismiss}
          aria-label={t("timer.skip")}
          className="p-1 rounded-lg text-[var(--tl-text-muted)] hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p
        className={`text-4xl font-bold tabular-nums text-center ${remaining === 0 ? "text-[var(--tl-accent)] animate-pulse" : ""}`}
      >
        {mm}:{ss}
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--tl-accent)] transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => {
            setRemaining((r) => r + 15);
            setTotal((v) => v + 15);
            doneRef.current = false;
          }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("timer.plus15")}
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white"
        >
          {t("timer.skip")}
        </button>
      </div>
    </div>
  );
}
