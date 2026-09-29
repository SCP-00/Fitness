/**
 * Tipos para el módulo de exportación
 */

/** Opciones de exportación */
export interface ExportOptions {
  /** Formato de exportación */
  format: 'csv' | 'json' | 'bundle';
  /** Incluir mediciones */
  includeMeasurements: boolean;
  /** Incluir composición corporal */
  includeComposition: boolean;
  /** Incluir snapshots */
  includeSnapshots: boolean;
  /** Incluir fotos */
  includePhotos: boolean;
  /** Rango de fechas */
  dateRange?: { start: string; end: string };
}

/** Manifest del Fitness Bundle */
export interface BundleManifest {
  format: 'fitness-bundle';
  version: number;
  createdAt: string;
  contains: string[];
  schemaVersion: string;
}

/** Fitness Bundle completo */
export interface FitnessBundle {
  manifest: BundleManifest;
  profile: Record<string, unknown>;
  measurements: Record<string, unknown>[];
  composition: Record<string, unknown>;
  goals: Record<string, unknown>[];
  bodySnapshots: Record<string, unknown>[];
  attachments?: {
    photos?: string[];
  };
  metadata?: {
    sources: string[];
  };
}

/** Datos para exportar */
export interface ExportData {
  profile: Record<string, unknown>;
  measurements: Record<string, unknown>[];
  composition: Record<string, unknown>;
  snapshots: Record<string, unknown>[];
  goals: Record<string, unknown>[];
}
