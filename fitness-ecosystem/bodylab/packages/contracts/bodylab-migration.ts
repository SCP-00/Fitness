export const BODYLAB_MIGRATION_FORMAT = "bodylab-traininglab-migration";
export const BODYLAB_MIGRATION_VERSION = 1;

export const BODYLAB_ARCHIVE_KEYS = {
  profiles: "id",
  measurements: "id",
  snapshots: "id",
  exerciseSets: "id",
  maxEfforts: "exerciseId",
  metadata: "id",
  localPreferences: "id",
} as const;

export type BodyLabCollection = keyof typeof BODYLAB_ARCHIVE_KEYS;
type ArchiveRow = Record<string, unknown>;

export interface BodyLabArchive {
  format: typeof BODYLAB_MIGRATION_FORMAT;
  version: typeof BODYLAB_MIGRATION_VERSION;
  exportedAt: string;
  data: Record<BodyLabCollection, ArchiveRow[]>;
}

export const bodyLabCollections = Object.keys(
  BODYLAB_ARCHIVE_KEYS,
) as BodyLabCollection[];

function isRecord(value: unknown): value is ArchiveRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validRows(value: unknown, key: string): boolean {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const row of value) {
    if (!isRecord(row)) return false;
    const id = row[key];
    if (typeof id !== "string" || !id.trim() || ids.has(id)) return false;
    ids.add(id);
  }
  return true;
}

// The archive keeps original fields. A feature adopting a row applies its own
// semantic checks before treating that row as a live measurement or workout.
export function parseBodyLabArchive(value: unknown): BodyLabArchive | null {
  if (
    !isRecord(value) ||
    value.format !== BODYLAB_MIGRATION_FORMAT ||
    value.version !== BODYLAB_MIGRATION_VERSION ||
    typeof value.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    !isRecord(value.data)
  ) {
    return null;
  }
  const data = value.data;
  if (
    !bodyLabCollections.every((collection) =>
      validRows(data[collection], BODYLAB_ARCHIVE_KEYS[collection]),
    )
  ) {
    return null;
  }
  return value as unknown as BodyLabArchive;
}
