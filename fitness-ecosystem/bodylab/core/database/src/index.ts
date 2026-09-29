/**
 * @fitness/bodylab-database
 *
 * Persistence layer for BodyLab.
 * Database-agnostic interface with SQLite and IndexedDB implementations.
 *
 * @module database
 */

export { SCHEMA, getCreateTableSQL, getTableNames } from './schema';
export { InMemoryRepository } from './memory';

// Types
export type { Repository, Profile, MeasurementRecord, BodySnapshotRecord } from './repository';
