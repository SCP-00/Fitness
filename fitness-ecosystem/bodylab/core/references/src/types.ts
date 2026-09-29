/**
 * Tipos para el módulo de perfiles de referencia
 */

/** Categorías de perfiles de referencia */
export type ReferenceCategory = 
  | 'health'
  | 'anthropometric'
  | 'athletic'
  | 'user_defined'
  | 'research';

/** Perfil de referencia completo */
export interface ReferenceProfileData {
  /** ID único del perfil */
  id: string;
  /** Nombre del perfil */
  name: string;
  /** Descripción detallada */
  description: string;
  /** Categoría del perfil */
  category: ReferenceCategory;
  /** Fuente científica o referencia */
  source: string;
  /** Sexo biológico aplicable */
  biologicalSex: 'male' | 'female' | 'both';
  /** Rango de edad válido */
  validAgeRange?: { min: number; max: number };
  /** Mediciones de referencia */
  measurements: ReferenceMeasurement[];
  /** Fórmulas adicionales */
  formulas?: ReferenceFormula[];
  /** Unidades utilizadas */
  units: 'metric' | 'imperial';
  /** Versión del perfil */
  version: string;
}

/** Medición de referencia individual */
export interface ReferenceMeasurement {
  /** Tipo de medición */
  type: string;
  /** Valor de referencia */
  value: number;
  /** Rango aceptable */
  range?: { min: number; max: number };
  /** Descripción */
  description?: string;
}

/** Fórmula de referencia */
export interface ReferenceFormula {
  /** Nombre de la fórmula */
  name: string;
  /** Descripción */
  description: string;
  /** Expresión matemática */
  expression: string;
  /** Variables requeridas */
  variables: string[];
}
