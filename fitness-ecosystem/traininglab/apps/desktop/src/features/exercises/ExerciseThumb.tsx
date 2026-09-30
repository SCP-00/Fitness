/**
 * The media slot — one fixed square, four possible fillings.
 *
 * The design calls for a photo thumbnail on every row. We have no photos yet, so
 * this component defines the *slot* first: a fixed 44 × 44 (or 72 × 72) box that
 * never changes size when the content changes, which is what stops the list from
 * reflowing the day photographs arrive.
 *
 * Cascade (see `docs/TRAININGLAB_UI_PLAN.md` §8):
 *
 *   1. licensed GIF          — the only level that moves
 *   2. free-license photo    — `source` set, `kind: "photo"`
 *   3. generated silhouette  — `kind: "silhouette"`
 *   4. monogram              — this file's fallback: the family's first letter on
 *                              an accent wash. Never a broken-image icon.
 *
 * @module features/exercises/ExerciseThumb
 */

import type { ReactNode } from "react";

export type ThumbKind = "gif" | "photo" | "silhouette" | "monogram";

export function ExerciseThumb({
  kind = "monogram",
  /** For `gif` / `photo` / `silhouette`: a URL resolved through BASE_URL. */
  src,
  /** The monogram letter — the family, not the exercise, so rows look grouped. */
  label,
  /** Alt text for a real image; decorative in the monogram case. */
  alt = "",
  size = 44,
  className = "",
}: {
  kind?: ThumbKind;
  src?: string;
  label?: string;
  alt?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 rounded-xl overflow-hidden border border-[var(--tl-border)] bg-[var(--tl-surface-3)] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {kind !== "monogram" && src ? (
        // `loading="lazy"` matters: the library is 143 rows.
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      ) : (
        <Monogram label={label} size={size} />
      )}
    </div>
  );
}

/**
 * The placeholder: the family initial over a faint accent wash, so a list of
 * rows reads as grouped blocks (all the chest work together) instead of a wall
 * of identical grey squares.
 */
function Monogram({
  label,
  size,
}: {
  label?: string;
  size: number;
}): ReactNode {
  const letter = (label ?? "•").trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="font-bold text-[var(--tl-accent)] tl-media-wash"
      style={{ fontSize: Math.round(size * 0.4), lineHeight: 1 }}
    >
      {letter}
    </span>
  );
}

/** The larger hero slot used by the exercise detail screen. */
export function ExerciseThumbLarge({
  kind = "monogram",
  src,
  label,
  alt = "",
  children,
}: {
  kind?: ThumbKind;
  src?: string;
  label?: string;
  alt?: string;
  children?: ReactNode;
}) {
  return (
    <div className="tl-card overflow-hidden">
      <div className="relative w-full aspect-[16/10] bg-[var(--tl-surface-3)] tl-media-wash flex items-center justify-center">
        {kind !== "monogram" && src ? (
          <img
            src={src}
            alt={alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="font-black text-[var(--tl-accent)] opacity-70"
            style={{ fontSize: 56, lineHeight: 1 }}
          >
            {label?.trim().charAt(0).toUpperCase() ?? "•"}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
