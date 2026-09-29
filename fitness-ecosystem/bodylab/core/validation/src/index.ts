/**
 * @fitness/bodylab-validation
 * 
 * Validación de mediciones con clad-body ISO 8559-1.
 * 
 * @module validation
 */

export { validateAgainstCladBody } from './clad-body';
export { validateMeasurementRanges } from './ranges';
export { crossValidateMeasurements } from './cross-validation';

// Tipos
export type { ValidationResult, ValidationError } from './types';
