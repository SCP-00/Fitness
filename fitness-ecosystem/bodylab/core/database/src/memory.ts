/**
 * In-Memory Repository
 *
 * Database-agnostic in-memory implementation for testing.
 * Useful for unit tests and development.
 *
 * @module database/memory
 */

import type { Repository, Profile, MeasurementRecord, BodySnapshotRecord } from './repository';

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * In-memory repository implementation
 */
export class InMemoryRepository implements Repository {
  private profiles: Map<string, Profile> = new Map();
  private measurements: Map<string, MeasurementRecord> = new Map();
  private snapshots: Map<string, BodySnapshotRecord> = new Map();

  // Profile operations
  async createProfile(data: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile> {
    const now = new Date().toISOString();
    const profile: Profile = {
      ...data,
      id: generateId(),
      created_at: now,
      updated_at: now,
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async getProfile(id: string): Promise<Profile | null> {
    return this.profiles.get(id) ?? null;
  }

  async getAllProfiles(): Promise<Profile[]> {
    return Array.from(this.profiles.values());
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new Error(`Profile not found: ${id}`);
    }
    const updated: Profile = {
      ...existing,
      ...updates,
      id, // Prevent ID change
      updated_at: new Date().toISOString(),
    };
    this.profiles.set(id, updated);
    return updated;
  }

  async deleteProfile(id: string): Promise<void> {
    this.profiles.delete(id);
    // Also delete associated measurements
    for (const [measId, meas] of this.measurements) {
      if (meas.profile_id === id) {
        this.measurements.delete(measId);
      }
    }
  }

  // Measurement operations
  async createMeasurement(data: Omit<MeasurementRecord, 'id'>): Promise<MeasurementRecord> {
    const measurement: MeasurementRecord = {
      ...data,
      id: generateId(),
    };
    this.measurements.set(measurement.id, measurement);
    return measurement;
  }

  async getMeasurement(id: string): Promise<MeasurementRecord | null> {
    return this.measurements.get(id) ?? null;
  }

  async getMeasurementsByProfile(profileId: string): Promise<MeasurementRecord[]> {
    return Array.from(this.measurements.values())
      .filter((m) => m.profile_id === profileId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getMeasurementsByType(profileId: string, type: string): Promise<MeasurementRecord[]> {
    return Array.from(this.measurements.values())
      .filter((m) => m.profile_id === profileId && m.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async updateMeasurement(id: string, updates: Partial<MeasurementRecord>): Promise<MeasurementRecord> {
    const existing = this.measurements.get(id);
    if (!existing) {
      throw new Error(`Measurement not found: ${id}`);
    }
    const updated: MeasurementRecord = {
      ...existing,
      ...updates,
      id, // Prevent ID change
    };
    this.measurements.set(id, updated);
    return updated;
  }

  async deleteMeasurement(id: string): Promise<void> {
    this.measurements.delete(id);
  }

  // Snapshot operations
  async createSnapshot(data: Omit<BodySnapshotRecord, 'id'>): Promise<BodySnapshotRecord> {
    const snapshot: BodySnapshotRecord = {
      ...data,
      id: generateId(),
    };
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  async getSnapshot(id: string): Promise<BodySnapshotRecord | null> {
    return this.snapshots.get(id) ?? null;
  }

  async getSnapshotsByProfile(profileId: string): Promise<BodySnapshotRecord[]> {
    return Array.from(this.snapshots.values())
      .filter((s) => s.profile_id === profileId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async deleteSnapshot(id: string): Promise<void> {
    this.snapshots.delete(id);
  }

  // Utility
  async close(): Promise<void> {
    this.profiles.clear();
    this.measurements.clear();
    this.snapshots.clear();
  }

  async clear(): Promise<void> {
    this.profiles.clear();
    this.measurements.clear();
    this.snapshots.clear();
  }
}
