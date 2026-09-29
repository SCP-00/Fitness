/**
 * Repository Interface
 *
 * Database-agnostic interface for data access.
 * Implementations can use SQLite, IndexedDB, or any other storage.
 *
 * @module database/repository
 */

/**
 * Profile entity
 */
export interface Profile {
  id: string;
  name: string;
  height: number;
  weight: number;
  age?: number;
  biological_sex: string;
  units: string;
  created_at: string;
  updated_at: string;
}

/**
 * Measurement entity
 */
export interface MeasurementRecord {
  id: string;
  profile_id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  method: string;
  confidence: string;
  notes?: string;
}

/**
 * Body Snapshot entity
 */
export interface BodySnapshotRecord {
  id: string;
  profile_id: string;
  timestamp: string;
  measurement_ids: string; // JSON array
  body_parameters: string; // JSON object
  reference_profile_id: string;
  assessment_result_ids?: string; // JSON array
  algorithm_version: string;
  reference_version: string;
  notes?: string;
}

/**
 * Repository interface for database operations
 */
export interface Repository {
  // Profile operations
  createProfile(profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile>;
  getProfile(id: string): Promise<Profile | null>;
  getAllProfiles(): Promise<Profile[]>;
  updateProfile(id: string, updates: Partial<Profile>): Promise<Profile>;
  deleteProfile(id: string): Promise<void>;

  // Measurement operations
  createMeasurement(measurement: Omit<MeasurementRecord, 'id'>): Promise<MeasurementRecord>;
  getMeasurement(id: string): Promise<MeasurementRecord | null>;
  getMeasurementsByProfile(profileId: string): Promise<MeasurementRecord[]>;
  getMeasurementsByType(profileId: string, type: string): Promise<MeasurementRecord[]>;
  updateMeasurement(id: string, updates: Partial<MeasurementRecord>): Promise<MeasurementRecord>;
  deleteMeasurement(id: string): Promise<void>;

  // Snapshot operations
  createSnapshot(snapshot: Omit<BodySnapshotRecord, 'id'>): Promise<BodySnapshotRecord>;
  getSnapshot(id: string): Promise<BodySnapshotRecord | null>;
  getSnapshotsByProfile(profileId: string): Promise<BodySnapshotRecord[]>;
  deleteSnapshot(id: string): Promise<void>;

  // Utility
  close(): Promise<void>;
  clear(): Promise<void>;
}
