/**
 * Tipos para el módulo de composición corporal
 */

/** Tamaño del marco óseo */
export type FrameSize = 'small' | 'medium' | 'large';

/** Composición corporal calculada */
export interface BodyComposition {
  /** Porcentaje de grasa corporal */
  bodyFatPercentage?: number;
  /** Masa libre de grasa (kg) */
  leanMass?: number;
  /** Masa grasa (kg) */
  fatMass?: number;
  /** Relación cintura/estatura */
  whtr: number;
  /** Tamaño del marco óseo */
  frameSize: FrameSize;
  /** Ratio marco óseo (altura/muñeca) */
  frameRatio: number;
}

/** Resultado de evaluación de composición */
export interface CompositionResult {
  /** Composición calculada */
  composition: BodyComposition;
  /** Estado de salud según WHtR */
  healthStatus: 'healthy' | 'elevated' | 'high_risk';
  /** Recomendaciones */
  recommendations: string[];
}

/** Datos de entrada para cálculos */
export interface CompositionInput {
  height: number; // metros
  weight: number; // kilogramos
  wristCircumference: number; // cm
  waistCircumference?: number; // cm
  biologicalSex: 'male' | 'female';
}
