/**
 * Database Schema
 *
 * Defines the schema for BodyLab's persistence layer.
 * Uses a database-agnostic approach that works with both SQLite and IndexedDB.
 *
 * @module database/schema
 */

/**
 * Table definitions for the database
 */
export const SCHEMA = {
  profiles: {
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      height: 'REAL NOT NULL',
      weight: 'REAL NOT NULL',
      age: 'INTEGER',
      biological_sex: 'TEXT NOT NULL',
      units: 'TEXT NOT NULL DEFAULT "metric"',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL',
    },
    indexes: ['created_at', 'biological_sex'],
  },

  measurements: {
    columns: {
      id: 'TEXT PRIMARY KEY',
      profile_id: 'TEXT NOT NULL',
      type: 'TEXT NOT NULL',
      value: 'REAL NOT NULL',
      unit: 'TEXT NOT NULL',
      timestamp: 'TEXT NOT NULL',
      method: 'TEXT NOT NULL',
      confidence: 'TEXT NOT NULL',
      notes: 'TEXT',
    },
    indexes: ['profile_id', 'type', 'timestamp'],
  },

  body_snapshots: {
    columns: {
      id: 'TEXT PRIMARY KEY',
      profile_id: 'TEXT NOT NULL',
      timestamp: 'TEXT NOT NULL',
      measurement_ids: 'TEXT NOT NULL',
      body_parameters: 'TEXT NOT NULL',
      reference_profile_id: 'TEXT NOT NULL',
      assessment_result_ids: 'TEXT',
      algorithm_version: 'TEXT NOT NULL',
      reference_version: 'TEXT NOT NULL',
      notes: 'TEXT',
    },
    indexes: ['profile_id', 'timestamp'],
  },

  reference_profiles: {
    columns: {
      id: 'TEXT PRIMARY KEY',
      name: 'TEXT NOT NULL',
      description: 'TEXT',
      category: 'TEXT NOT NULL',
      source: 'TEXT',
      biological_sex: 'TEXT',
      measurements: 'TEXT NOT NULL',
      formulas: 'TEXT',
      units: 'TEXT NOT NULL',
      version: 'TEXT NOT NULL',
      is_builtin: 'INTEGER NOT NULL DEFAULT 0',
      created_at: 'TEXT NOT NULL',
    },
    indexes: ['category', 'biological_sex', 'is_builtin'],
  },

  assessments: {
    columns: {
      id: 'TEXT PRIMARY KEY',
      snapshot_id: 'TEXT NOT NULL',
      profile_id: 'TEXT NOT NULL',
      reference_profile_id: 'TEXT NOT NULL',
      algorithm_version: 'TEXT NOT NULL',
      results: 'TEXT NOT NULL',
      created_at: 'TEXT NOT NULL',
    },
    indexes: ['snapshot_id', 'profile_id', 'created_at'],
  },
} as const;

/**
 * SQL to create all tables (for SQLite)
 */
export function getCreateTableSQL(): string[] {
  const statements: string[] = [];

  for (const [tableName, tableDef] of Object.entries(SCHEMA)) {
    const columns = Object.entries(tableDef.columns)
      .map(([col, type]) => `  ${col} ${type}`)
      .join(',\n');

    statements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (\n${columns}\n);`);

    // Create indexes
    for (const indexCol of tableDef.indexes) {
      statements.push(
        `CREATE INDEX IF NOT EXISTS idx_${tableName}_${indexCol} ON ${tableName}(${indexCol});`
      );
    }
  }

  return statements;
}

/**
 * Get table names
 */
export function getTableNames(): string[] {
  return Object.keys(SCHEMA);
}
