/**
 * Measurement Session
 *
 * Groups individual measurements into a coherent session (e.g., a morning
 * weigh-in + body measurements). This replaces the individual addMeasurement()
 * pattern with a session-based workflow that better reflects how users actually
 * measure their bodies.
 *
 * @module measurements/session
 */

import type { Measurement } from './types';
import { generateId } from './model';

/**
 * Measurement session condition context
 */
export type SessionCondition = 'morning' | 'after_training' | 'evening' | 'other';

/**
 * A measurement session groups related measurements taken at the same time.
 */
export interface MeasurementSession {
  /** Unique session ID */
  id: string;
  /** Profile this session belongs to */
  profileId: string;
  /** Date and time the session was started */
  startedAt: string;
  /** Date and time the session was completed (null if in-progress) */
  completedAt: string | null;
  /** User-defined label for this session */
  label: string;
  /** Time-of-day condition */
  condition: SessionCondition;
  /** Optional notes */
  notes: string;
  /** Individual measurements in this session */
  measurements: Measurement[];
  /** Status of the session */
  status: 'draft' | 'in_progress' | 'completed' | 'discarded';
}

/**
 * Create a new measurement session
 */
export function createSession(profileId: string, options?: {
  label?: string;
  condition?: SessionCondition;
  notes?: string;
}): MeasurementSession {
  const now = new Date().toISOString();
  const condition = options?.condition ?? guessCondition();

  return {
    id: generateId(),
    profileId,
    startedAt: now,
    completedAt: null,
    label: options?.label ?? generateSessionLabel(condition),
    condition,
    notes: options?.notes ?? '',
    measurements: [],
    status: 'in_progress',
  };
}

/**
 * Add a measurement to an existing session
 */
export function addMeasurementToSession(
  session: MeasurementSession,
  measurement: Omit<Measurement, 'id' | 'timestamp'>
): MeasurementSession {
  const newMeasurement: Measurement = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    ...measurement,
  };

  return {
    ...session,
    measurements: [...session.measurements, newMeasurement],
    status: 'in_progress',
  };
}

/**
 * Complete a measurement session
 */
export function completeSession(session: MeasurementSession): MeasurementSession {
  return {
    ...session,
    completedAt: new Date().toISOString(),
    status: 'completed',
  };
}

/**
 * Discard a measurement session (without deleting)
 */
export function discardSession(session: MeasurementSession): MeasurementSession {
  return {
    ...session,
    status: 'discarded',
  };
}

/**
 * Calculate completion percentage of a session
 * based on expected measurement types.
 *
 * @param session - The session to evaluate
 * @param expectedTypes - The full set of expected measurement types
 * @returns Percentage (0-100) of expected types that have been recorded
 */
export function getSessionProgress(
  session: MeasurementSession,
  expectedTypes: readonly string[]
): number {
  if (expectedTypes.length === 0) return 100;
  const recorded = new Set<string>(session.measurements.map(m => m.type));
  const covered = expectedTypes.filter(t => recorded.has(t)).length;
  return Math.round((covered / expectedTypes.length) * 100);
}

/**
 * Get measurement types still missing from a session
 */
export function getMissingFromSession(
  session: MeasurementSession,
  expectedTypes: readonly string[]
): string[] {
  const recorded = new Set<string>(session.measurements.map(m => m.type));
  return expectedTypes.filter(t => !recorded.has(t));
}

/**
 * Flatten sessions into a flat array of measurements
 */
export function flattenSessions(sessions: MeasurementSession[]): Measurement[] {
  return sessions
    .filter(s => s.status === 'completed')
    .flatMap(s => s.measurements)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get sessions sorted by date (newest first)
 */
export function getRecentSessions(
  sessions: MeasurementSession[],
  limit?: number
): MeasurementSession[] {
  const sorted = [...sessions]
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Guess the session condition based on current time of day
 */
function guessCondition(): SessionCondition {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'evening';
  if (hour >= 17 && hour < 21) return 'after_training';
  return 'other';
}

/**
 * Generate a human-readable label for a session
 */
function generateSessionLabel(condition: SessionCondition): string {
  const date = new Date();
  const month = date.toLocaleString('en', { month: 'short' });
  const day = date.getDate();

  const conditionLabels: Record<SessionCondition, string> = {
    morning: 'Morning',
    after_training: 'Post-workout',
    evening: 'Evening',
    other: 'Session',
  };

  return `${conditionLabels[condition]} — ${month} ${day}`;
}
