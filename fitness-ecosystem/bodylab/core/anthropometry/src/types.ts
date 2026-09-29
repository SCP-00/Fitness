/**
 * Tipos para el módulo antropométrico
 */

/** Segmentos corporales medidos */
export type BodySegment = 
  | 'wrist'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'biceps'
  | 'forearm'
  | 'thigh'
  | 'calf';

/** Sexo biológico para cálculos antropométricos */
export type BiologicalSex = 'male' | 'female';

/** Perfil antropométrico completo */
export interface AnthropometricProfile {
  /** Altura en metros */
  height: number;
  /** Peso en kilogramos */
  weight: number;
  /** Circunferencia de muñeca en cm */
  wristCircumference: number;
  /** Sexo biológico */
  biologicalSex: BiologicalSex;
}

/** Medición individual */
export interface Measurement {
  segment: BodySegment;
  value: number;
  unit: 'cm' | 'in';
}

/** Proporción ideal calculada */
export interface IdealProportion {
  segment: BodySegment;
  idealValue: number;
  factor: number;
  description: string;
}

/** Resultado del cálculo de McCallum */
export interface McCallumResult {
  chest: number;
  waist: number;
  hips: number;
  biceps: number;
  thigh: number;
  neck: number;
  calf: number;
  forearm: number;
}

/** Resultado del cálculo de Venus */
export interface VenusResult {
  waist: number;
  hips: number;
  bust: number;
  shoulders: number;
  frameSize: 'small' | 'medium' | 'large';
}

/** Tamaño de marco esquelético */
export type FrameSize = 'small' | 'medium' | 'large';

/** Resultado del Índice Adonis */
export interface AdonisResult {
  ratio: number;
  goldenRatio: number;
  deviation: number;
  status: 'optimal' | 'near' | 'far';
}
