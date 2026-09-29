/**
 * Exercise catalog — BodyLab's view.
 *
 * The catalog itself moved to the shared core package
 * (`@fitness/bodylab-exercises`) on 2026-09-28 so TrainingLab can plan against
 * the same data without importing app code (and works standalone). This module
 * keeps the historical import path working and holds the web-only presentation
 * helpers (colours are UI concerns, so they stay out of core).
 *
 * @module lib/exercises
 */

export * from '@fitness/bodylab-exercises';

/** Get intensity color for a muscle involvement level */
export function getIntensityColor(intensity: 0 | 1 | 2 | 3): string {
  switch (intensity) {
    case 3: return '#4f46e5'; // Indigo — primary
    case 2: return '#818cf8'; // Light indigo — secondary
    case 1: return '#c7d2fe'; // Very light indigo — synergist
    default: return 'transparent';
  }
}

/** Get hypertrophy color for rating (1-5) */
export function getHypertrophyColor(rating: number): string {
  if (rating >= 5) return '#10b981'; // Emerald — maximum
  if (rating >= 4) return '#22c55e'; // Green — high
  if (rating >= 3) return '#f59e0b'; // Amber — moderate
  if (rating >= 2) return '#f97316'; // Orange — low
  return '#ef4444'; // Red — minimal
}

/** Get technical difficulty color (1-5) */
export function getDifficultyColor(rating: number): string {
  if (rating >= 5) return '#ef4444'; // Red — expert
  if (rating >= 4) return '#f97316'; // Orange — hard
  if (rating >= 3) return '#f59e0b'; // Amber — advanced
  if (rating >= 2) return '#22c55e'; // Green — intermediate
  return '#10b981'; // Emerald — beginner
}
