/**
 * ExerciseGif — Displays exercise media from the asset manifest.
 *
 * Resolution order (the manifest is the single source of truth):
 *   1. Entry has a `gif`       → animated GIF with play/pause (lazy loaded)
 *   2. Entry has only `image`  → static still (public-domain stills for
 *                                exercises without an animation) + badge
 *   3. No entry                → explicit bilingual placeholder, no 404
 *
 * Features:
 *   - Lazy loading (only loads when visible)
 *   - Play/pause on click (GIFs only)
 *   - Graceful fallbacks at every level
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, Image as ImageIcon } from 'lucide-react';

interface ExerciseGifProps {
  exerciseId: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
  lang?: 'en' | 'es';
}

const SIZE_MAP = {
  sm: { width: 120, height: 120 },
  md: { width: 180, height: 180 },
  lg: { width: 260, height: 260 },
};

/** Shape of one asset-manifest entry (only the fields ExerciseGif needs). */
interface ManifestEntry {
  gif?: string;
  image?: string;
}

/**
 * The shipped manifest (public/exercises/asset-manifest.json) is fetched once
 * and cached: exercises absent from it render an explicit bilingual placeholder
 * immediately instead of firing a guaranteed 404.
 */
let manifestPromise: Promise<Record<string, ManifestEntry>> | null = null;
function getManifest(): Promise<Record<string, ManifestEntry>> {
  manifestPromise ??= fetch('/exercises/asset-manifest.json')
    .then(r => (r.ok ? r.json() : {}))
    .then((m: Record<string, ManifestEntry>) => m)
    .catch(() => ({})); // network offline → fall back to onError path
  return manifestPromise;
}

export default function ExerciseGif({
  exerciseId,
  alt,
  size = 'md',
  showControls = true,
  lang = 'en',
}: ExerciseGifProps) {
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState(false);
  const [entry, setEntry] = useState<ManifestEntry | null | undefined>(undefined); // undefined = unknown yet
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const { width, height } = SIZE_MAP[size];
  const gifUrl = `/exercises/gifs/${exerciseId}.gif`;
  const imageUrl = entry?.image ? `/exercises/${entry.image}` : null;
  const isGif = !!entry?.gif;

  // Load the manifest entry once.
  useEffect(() => {
    let alive = true;
    getManifest().then(m => {
      if (alive) setEntry(m[exerciseId] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [exerciseId]);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Pause/play by toggling src (GIFs only — stills have no animation to pause)
  const togglePlay = () => {
    if (!imgRef.current || !isGif) return;
    if (playing) {
      imgRef.current.src = '';
      setPlaying(false);
    } else {
      imgRef.current.src = gifUrl;
      setPlaying(true);
    }
  };

  const knownMissing = entry === null;

  // Still image variant: show the photo + a small "animation coming soon" badge.
  if (entry && !isGif && imageUrl) {
    return (
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden bg-[var(--color-surface-sunken)] group"
        style={{ width, height }}
      >
        {isVisible ? (
          <img
            src={imageUrl}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
          />
        ) : null}
        {!loaded && !error && isVisible && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <p className="text-[11px] text-center px-2">
              {lang === 'es' ? 'Imagen no disponible' : 'Image unavailable'}
            </p>
          </div>
        )}
        {loaded && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[11px] font-medium">
            <ImageIcon className="w-2.5 h-2.5" />
            {lang === 'es' ? 'Sin animación' : 'No animation'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden bg-[var(--color-surface-sunken)] group"
      style={{ width, height }}
    >
      {isVisible && isGif && !error ? (
        <>
          <img
            ref={imgRef}
            src={gifUrl}
            alt={alt}
            className={`w-full h-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
          />

          {/* Loading skeleton */}
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
            </div>
          )}

          {/* Play/Pause overlay */}
          {showControls && loaded && (
            <button
              onClick={togglePlay}
              className="absolute bottom-2 right-2 p-1.5 bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            >
              {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          )}
        </>
      ) : error || knownMissing ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-[var(--color-text-muted)]">
          <div className="text-center px-2">
            <Play className="w-8 h-8 mx-auto mb-1 opacity-30" />
            <p className="text-[11px]">
              {lang === 'es' ? 'Animación próximamente' : 'Animation coming soon'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}