/**
 * Tipos para el módulo de progreso
 */

/** Snapshot corporal completo */
export interface BodySnapshot {
  /** ID único del snapshot */
  id: string;
  /** ID del perfil */
  profileId: string;
  /** Fecha y hora del snapshot */
  timestamp: string;
  /** IDs de mediciones incluidas */
  measurementIds: string[];
  /** Parámetros corporales */
  bodyParameters: {
    height: number;
    weight: number;
    muscle?: number;
    shape?: Record<string, number>;
    measurementFit?: Record<string, number>;
  };
  /** Perfil de referencia utilizado */
  referenceProfileId: string;
  /** Resultados de evaluación */
  assessmentResultIds: string[];
  /** Notas del usuario */
  notes?: string;
}

/** Comparación entre dos snapshots */
export interface SnapshotComparison {
  /** Snapshot anterior */
  previousSnapshotId: string;
  /** Snapshot actual */
  currentSnapshotId: string;
  /** Diferencias por medición */
  deltas: Delta[];
  /** Resumen general */
  summary: string;
}

/** Diferencia individual */
export interface Delta {
  /** Tipo de medición */
  measurementType: string;
  /** Valor anterior */
  previousValue: number;
  /** Valor actual */
  currentValue: number;
  /** Diferencia absoluta */
  absoluteChange: number;
  /** Diferencia porcentual */
  percentageChange: number;
  /** Unidad */
  unit: string;
}

/** Punto en el timeline */
export interface TimelinePoint {
  /** Fecha */
  date: string;
  /** Valor medido */
  value: number;
  /** Tipo de medición */
  measurementType: string;
}
