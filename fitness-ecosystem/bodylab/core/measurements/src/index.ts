/**
 * @fitness/bodylab-measurements
 * 
 * Modelo de datos para mediciones corporales.
 * 
 * @module measurements
 */

export { validateMeasurement, convertUnits, createMeasurement, generateId, MEASUREMENT_RANGES } from './model';
export type { Measurement, MeasurementType, MeasurementMethod, MeasurementConfidence, MeasurementUnit } from './types';

// Re-export model functions
export type { MeasurementValidation } from './types';

// Query functions (replaces broken find() pattern)
export {
  getLatestMeasurement,
  getLatestValue,
  getMeasurementHistory,
  getActiveMeasurementTypes,
  getMissingTypes,
  calculateChange,
  getLatestMeasurementMap,
  getMeasurementCounts,
} from './queries';

// Session management
export {
  createSession,
  addMeasurementToSession,
  completeSession,
  discardSession,
  getSessionProgress,
  getMissingFromSession,
  flattenSessions,
  getRecentSessions,
} from './session';
export type { MeasurementSession, SessionCondition } from './session';
export type { QueryMeasurementType } from './queries';
