/**
 * The media slot — one fixed square, four possible fillings.
 *
 * A fixed 44 × 44 (or 46/72 × 72) box that never changes size when the content
 * changes, which is what stops a list from reflowing as it fills in.
 *
 * Two ways to use it, and the difference matters:
 *
 *   * **named** — pass `exerciseId` and the slot resolves the reference itself
 *     through the shared cascade (`features/exercises/media.ts`): GIF → still →
 *     monogram. This is what the rows of Inicio and of the library do, and it is
 *     why they show the movement instead of initials;
 *   * **explicit** — pass `src` (+ `kind`) and the caller owns the picture.
 *
 * The monogram is the last level, never a broken-image icon: the *family's*
 * first letter over an accent wash, so a list reads as grouped blocks (all the
 * chest work together) instead of a wall of identical grey squares.
 *
 * @module features/exercises/ExerciseThumb
 */

import type { ReactNode } from "react";

import { isAnimated, primaryMediaSrc, useExerciseMedia } from "./media";

export type ThumbKind = "gif" | "photo" | "silhouette" | "monogram";

export function ExerciseThumb({
  /** Names the exercise: the slot then resolves the reference by itself. */
  exerciseId,
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
  exerciseId?: string;
  kind?: ThumbKind;
  src?: string;
  label?: string;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const media = useExerciseMedia(exerciseId);
  // An explicit `src` wins: the caller asked for that picture. Otherwise the
  // cascade answers, and an exercise with no reference keeps its monogram.
  const image = src ?? primaryMediaSrc(media, exerciseId);
  const filled: ThumbKind =
    src !== undefined
      ? kind
      : image === null
        ? "monogram"
        : isAnimated(media, exerciseId)
          ? "gif"
          : "photo";
  return (
    <div
      className={`shrink-0 rounded-xl overflow-hidden border border-[var(--tl-border)] bg-[var(--tl-surface-3)] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {filled !== "monogram" && image ? (
        // `loading="lazy"` matters: the library is 143 rows.
        <img
          src={image}
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

/**
 * The larger hero slot used by the exercise detail screen.
 *
 * It resolves the same cascade as the small slot when it is given
 * `exerciseId` (GIF → still → monogram). The detail screen shipped for weeks
 * with a 16:10 box of empty wash and an initial in the middle while
 * `barbell-squat.gif` sat in the bundle unused: the hero only rendered `src`,
 * and nobody passed one. Naming the exercise is what fixes that class of bug.
 *
 * `object-contain`, not `cover`: the catalogue's references are square line
 * art, and cropping the movement out of a technique picture is worse than
 * leaving a margin.
 */
export function ExerciseThumbLarge({
  exerciseId,
  kind = "monogram",
  src,
  label,
  alt = "",
  children,
}: {
  /** Names the exercise: the slot then resolves the reference by itself. */
  exerciseId?: string;
  kind?: ThumbKind;
  src?: string;
  label?: string;
  alt?: string;
  children?: ReactNode;
}) {
  const media = useExerciseMedia(exerciseId);
  const image = src ?? primaryMediaSrc(media, exerciseId);
  const filled: ThumbKind =
    src !== undefined
      ? kind
      : image === null
        ? "monogram"
        : isAnimated(media, exerciseId)
          ? "gif"
          : "photo";
  return (
    <div className="tl-card overflow-hidden">
      <div className="relative w-full aspect-[16/10] bg-[var(--tl-surface-3)] tl-media-wash flex items-center justify-center">
        {filled !== "monogram" && image ? (
          <img
            src={image}
            alt={alt}
            className="absolute inset-0 w-full h-full object-contain"
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
