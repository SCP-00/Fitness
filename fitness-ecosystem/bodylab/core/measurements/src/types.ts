/**
 * Tipos para el módulo de mediciones
 */

/** Tipos de medición disponibles */
export type MeasurementType = 
  | 'wrist'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'biceps'
  | 'forearm'
  | 'thigh'
  | 'calf'
  | 'height'
  | 'weight'
  | 'body_fat_percentage'
  | 'lean_mass';

/** Método de obtención de la medición */
export type MeasurementMethod = 'manual' | 'photo' | 'scan';

/** Nivel de confianza de la medición */
export type MeasurementConfidence = 'high' | 'medium' | 'low';

/** Unidades de medida */
export type MeasurementUnit = 'cm' | 'in' | 'kg' | 'lbs';

/** Medición individual */
export interface Measurement {
  /** ID único de la medición */
  id: string;
  /** ID del perfil al que pertenece */
  profileId: string;
  /** Tipo de medición */
  type: MeasurementType;
  /** Valor numérico */
  value: number;
  /** Unidad de medida */
  unit: MeasurementUnit;
  /** Fecha y hora de la medición */
  timestamp: string;
  /** Método de obtención */
  method: MeasurementMethod;
  /** Nivel de confianza */
  confidence: MeasurementConfidence;
  /** Notas adicionales */
  notes?: string;
}

/** Validación de medición */
export interface MeasurementValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
