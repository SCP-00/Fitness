/**
 * @fitness/bodylab-anthropometry
 * 
 * Motor antropométrico con fórmulas de McCallum, Venus y Adonis.
 * 
 * Este módulo calcula las proporciones ideales basándose en:
 * - Hombres: Fórmula de McCallum + Índice Adonis (Φ = 1.618)
 * - Mujeres: Índice Venus + Marco Óseo
 * 
 * @module anthropometry
 */

// Formulas
export { calculateMcCallum, MCCALLUM_FACTORS } from './mccallum';
export { calculateVenus, VENUS_FACTORS, classifyFrame } from './venus';
export { calculateAdonisIndex, GOLDEN_RATIO } from './adonis';
export { calculateWHtR, WHTR_THRESHOLDS } from './whtr';
export { calculateDeviation, calculateScore, classifyScore, scoreToColor, PENALTY_FACTOR } from './score';

// Types
export type { 
  AnthropometricProfile, 
  BodySegment, 
  McCallumResult, 
  VenusResult, 
  AdonisResult,
  BiologicalSex 
} from './types';
export type { WHtRResult } from './whtr';
export type { ScoreClassification, ScoreColor } from './score';
