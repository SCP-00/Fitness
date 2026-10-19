/**
 * The exercise-media cascade, in one place.
 *
 * Three levels, in this order, and never an invented figure:
 *
 *   1. **GIF** — the licensed loop, addressed by naming convention
 *      (`exercises/gifs/<exerciseId>.gif`), which is why the manifest only needs
 *      to say *that* there is one;
 *   2. **still(s)** — the public-domain photo(s) the manifest points at. Two
 *      frames when the source has them, which is what lets a reader check the
 *      start and the end position of a movement against each other;
 *   3. **nothing** — the caller decides what that looks like (the drawn figure on
 *      the big frames, a monogram on a row). A placeholder picture would be worse
 *      than none: it claims a reference that does not exist.
 *
 * The manifest is fetched once per session and cached at module level, so an
 * exercise that is not in it falls back immediately instead of firing a
 * guaranteed 404.
 *
 * Moved out of `features/today/ExerciseDemo.tsx` (2026-10-13): the two exercise
 * lists need the very same answer. Only the big frames were wired to this
 * cascade, so the rows of Inicio and of the library were showing initials and
 * monograms while the reference was sitting on disk.
 *
 * @module features/exercises/media
 */

import { useEffect, useState } from "react";

/** Shape of one asset-manifest entry (only what the UI needs). */
export interface MediaEntry {
  gif?: string;
  image?: string;
  /** Second public-domain still (end position) when the source provides one. */
  imageAlt?: string | null;
}

let manifestPromise: Promise<Record<string, MediaEntry>> | null = null;

export function getManifest(): Promise<Record<string, MediaEntry>> {
  manifestPromise ??= fetch(
    `${import.meta.env.BASE_URL}exercises/asset-manifest.json`,
  )
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return manifestPromise;
}

/**
 * The manifest entry of one exercise: `undefined` while it is still loading,
 * `null` when the manifest says this exercise has no reference at all. The two
 * are deliberately different — "not yet" must not render as "none".
 */
export function useExerciseMedia(
  exerciseId: string | undefined,
): MediaEntry | null | undefined {
  const [entry, setEntry] = useState<MediaEntry | null | undefined>(undefined);
  useEffect(() => {
    if (!exerciseId) {
      setEntry(null);
      return;
    }
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
export const gifUrlFor = (exerciseId: string): string =>
  `${import.meta.env.BASE_URL}exercises/gifs/${exerciseId}.gif`;

export const stillUrlFor = (entry: MediaEntry): string | null =>
  entry.image ? `${import.meta.env.BASE_URL}exercises/${entry.image}` : null;

export const altStillUrlFor = (entry: MediaEntry): string | null =>
  entry.imageAlt && entry.imageAlt !== entry.image
    ? `${import.meta.env.BASE_URL}exercises/${entry.imageAlt}`
    : null;

/**
 * The one picture a small slot shows: the GIF when there is one, otherwise the
 * start still, otherwise `null` — the caller keeps its own tile and claims
 * nothing. There is no size logic here on purpose: the slot decides how it is
 * framed (`object-fit: cover` for a 62×46 row thumbnail, `contain` for the big
 * session frame, so a cropped loop never loses a limb).
 */
export function primaryMediaSrc(
  entry: MediaEntry | null | undefined,
  exerciseId: string | undefined,
): string | null {
  if (!exerciseId || entry === null || entry === undefined) return null;
  if (entry.gif !== undefined) return gifUrlFor(exerciseId);
  return stillUrlFor(entry);
}

/** Is the picture an animated loop? Only the GIF level is. */
export function isAnimated(
  entry: MediaEntry | null | undefined,
  exerciseId: string | undefined,
): boolean {
  return !!exerciseId && entry?.gif !== undefined;
}
