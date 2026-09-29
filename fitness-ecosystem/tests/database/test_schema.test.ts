/**
 * Schema Tests
 *
 * Tests for database schema generation.
 */

import { describe, it, expect } from 'vitest';
import { SCHEMA, getCreateTableSQL, getTableNames } from '../../bodylab/core/database/src/schema';

describe('Database Schema', () => {
  describe('Table Names', () => {
    it('should have all required tables', () => {
      const tables = getTableNames();
      expect(tables).toContain('profiles');
      expect(tables).toContain('measurements');
      expect(tables).toContain('body_snapshots');
      expect(tables).toContain('reference_profiles');
      expect(tables).toContain('assessments');
    });

    it('should have 5 tables', () => {
      expect(getTableNames().length).toBe(5);
    });
  });

  describe('Schema Definitions', () => {
    it('should have profiles table with required columns', () => {
      const profiles = SCHEMA.profiles;
      expect(profiles.columns.id).toBe('TEXT PRIMARY KEY');
      expect(profiles.columns.name).toBe('TEXT NOT NULL');
      expect(profiles.columns.height).toBe('REAL NOT NULL');
      expect(profiles.columns.weight).toBe('REAL NOT NULL');
      expect(profiles.columns.biological_sex).toBe('TEXT NOT NULL');
      expect(profiles.columns.units).toBe('TEXT NOT NULL DEFAULT "metric"');
    });

    it('should have measurements table with required columns', () => {
      const measurements = SCHEMA.measurements;
      expect(measurements.columns.id).toBe('TEXT PRIMARY KEY');
      expect(measurements.columns.profile_id).toBe('TEXT NOT NULL');
      expect(measurements.columns.type).toBe('TEXT NOT NULL');
      expect(measurements.columns.value).toBe('REAL NOT NULL');
      expect(measurements.columns.unit).toBe('TEXT NOT NULL');
      expect(measurements.columns.timestamp).toBe('TEXT NOT NULL');
    });

    it('should have body_snapshots table with required columns', () => {
      const snapshots = SCHEMA.body_snapshots;
      expect(snapshots.columns.id).toBe('TEXT PRIMARY KEY');
      expect(snapshots.columns.profile_id).toBe('TEXT NOT NULL');
      expect(snapshots.columns.body_parameters).toBe('TEXT NOT NULL');
      expect(snapshots.columns.reference_profile_id).toBe('TEXT NOT NULL');
      expect(snapshots.columns.algorithm_version).toBe('TEXT NOT NULL');
    });

    it('should have indexes for common queries', () => {
      expect(SCHEMA.profiles.indexes).toContain('created_at');
      expect(SCHEMA.measurements.indexes).toContain('profile_id');
      expect(SCHEMA.measurements.indexes).toContain('type');
      expect(SCHEMA.body_snapshots.indexes).toContain('profile_id');
      expect(SCHEMA.body_snapshots.indexes).toContain('timestamp');
    });
  });

  describe('SQL Generation', () => {
    it('should generate CREATE TABLE statements', () => {
      const sql = getCreateTableSQL();
      expect(sql.length).toBeGreaterThan(0);

      // Should have CREATE TABLE for each table
      const createStatements = sql.filter((s) => s.startsWith('CREATE TABLE'));
      expect(createStatements.length).toBe(5);
    });

    it('should generate CREATE INDEX statements', () => {
      const sql = getCreateTableSQL();
      const indexStatements = sql.filter((s) => s.startsWith('CREATE INDEX'));
      expect(indexStatements.length).toBeGreaterThan(0);
    });

    it('should generate valid SQL syntax', () => {
      const sql = getCreateTableSQL();
      for (const statement of sql) {
        // Basic SQL syntax check
        expect(statement).toMatch(/^(CREATE TABLE|CREATE INDEX)/);
        expect(statement).toContain('IF NOT EXISTS');
        expect(statement.endsWith(';')).toBe(true);
      }
    });
  });
});
