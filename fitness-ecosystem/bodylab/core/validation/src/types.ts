/**
 * Tipos para el módulo de validación
 */

/** Resultado de validación */
export interface ValidationResult {
  /** ¿Es válido? */
  isValid: boolean;
  /** Errores encontrados */
  errors: ValidationError[];
  /** Advertencias */
  warnings: ValidationError[];
  /** Puntuación de validación (0-1) */
  score: number;
}

/** Error de validación */
export interface ValidationError {
  /** Tipo de medición */
  measurementType: string;
  /** Código del error */
  code: string;
  /** Mensaje descriptivo */
  message: string;
  /** Severidad */
  severity: 'error' | 'warning' | 'info';
  /** Valor actual */
  currentValue?: number;
  /** Valor esperado */
  expectedValue?: number;
  /** Rango esperado */
  expectedRange?: { min: number; max: number };
}

/** Resultado de validación cruzada */
export interface CrossValidationResult {
  /** ¿Las mediciones son consistentes entre sí? */
  isConsistent: boolean;
  /** Inconsistencias encontradas */
  inconsistencies: Array<{
    measurements: string[];
    description: string;
  }>;
}
