/**
 * Historic BodyLab formats → the canonical migration archive.
 *
 * Why this exists: the unified import path (`parseBodyLabArchive`) only accepts
 * the complete transition file that `db.exportForTrainingLab()` writes. A user
 * upgrading from a released BodyLab only has the formats the app has shipped
 * for years:
 *
 *   - the legacy JSON export: `{ format: "bodylab", data: { profile,
 *     measurements, snapshots } }` (Data Vault → JSON),
 *   - the `.bodylab` ZIP: `manifest.json`, `profile.json`,
 *     `measurements.json`, `snapshots.json` (+ `metadata.json`),
 *   - the older `{ format: "bodylab-backup", manifest, profile, ... }`
 *     envelope that the web importer still accepts.
 *
 * All of them carry the SAME collections as `data` of the archive, so this
 * module converts instead of duplicating the merge/receipt logic. What they do
 * NOT carry (`exerciseSets`, `maxEfforts`, app metadata, local preferences) is
 * reported as `omitted`: the preview must be able to say what the file leaves
 * behind, and nothing here invents a row to fill a gap.
 *
 * Rows keep their original ids and fields untouched; a collection with a
 * missing/duplicated id is rejected rather than silently repaired, because the
 * archive is keyed by those ids.
 *
 * @module packages/contracts/bodylab-legacy
 */

import {
  BODYLAB_ARCHIVE_KEYS,
  BODYLAB_MIGRATION_FORMAT,
  BODYLAB_MIGRATION_VERSION,
  type BodyLabArchive,
  type BodyLabCollection,
} from "./bodylab-migration";

const OMITTED: BodyLabCollection[] = [
  "exerciseSets",
  "maxEfforts",
  "metadata",
  "localPreferences",
];

export type LegacyBodyLabSource =
  | "bodylab-json"
  | "bodylab-backup-json"
  | "bodylab-zip";

export interface LegacyArchive {
  archive: BodyLabArchive;
  /** Collections the file cannot contain. Never a guess at their contents. */
  omitted: BodyLabCollection[];
}

export interface LegacyBodyLabRead extends LegacyArchive {
  source: LegacyBodyLabSource;
}

type Row = Record<string, unknown>;

function isRecord(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Accept a collection only when every row is an object with a unique,
 * non-empty string id. Returns `null` for a malformed collection so the caller
 * rejects the file instead of importing half of it.
 */
function rows(value: unknown, key: string): Row[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  for (const row of value) {
    if (!isRecord(row)) return null;
    const id = row[key];
    if (typeof id !== "string" || !id.trim() || ids.has(id)) return null;
    ids.add(id);
  }
  return value as Row[];
}

function profileRows(value: unknown): Row[] | null {
  if (value === undefined || value === null) return [];
  if (!isRecord(value)) return null;
  return rows([value], BODYLAB_ARCHIVE_KEYS.profiles);
}

/**
 * Convert the three collections shared by every historic format into the
 * archive shape. `undefined` for measurements/snapshots means "absent from the
 * file", which is different from an empty array only for the caller's message;
 * both convert to an empty collection.
 */
export function archiveFromCollections(input: {
  profile?: unknown;
  measurements?: unknown;
  snapshots?: unknown;
}): LegacyArchive | null {
  const profiles = profileRows(input.profile);
  const measurements = rows(
    input.measurements ?? [],
    BODYLAB_ARCHIVE_KEYS.measurements,
  );
  const snapshots = rows(input.snapshots ?? [], BODYLAB_ARCHIVE_KEYS.snapshots);
  if (!profiles || !measurements || !snapshots) return null;

  return {
    archive: {
      // Reuse the canonical constants so a future version bump is not guessed.
      format: BODYLAB_MIGRATION_FORMAT,
      version: BODYLAB_MIGRATION_VERSION,
      exportedAt: new Date(0).toISOString(),
      data: {
        profiles,
        measurements,
        snapshots,
        exerciseSets: [],
        maxEfforts: [],
        metadata: [],
        localPreferences: [],
      },
    },
    omitted: [...OMITTED],
  };
}

/**
 * Detect and convert a parsed legacy BodyLab JSON document.
 *
 * `exportedAt` is taken from the file when it has one; the archive contract
 * requires a valid ISO instant, so an absent/invalid stamp falls back to the
 * epoch instead of pretending the export happened now.
 */
export function archiveFromLegacyBodyLab(
  value: unknown,
): LegacyBodyLabRead | null {
  if (!isRecord(value)) return null;

  let source: LegacyBodyLabSource;
  let profile: unknown;
  let measurements: unknown;
  let snapshots: unknown;

  if (value.format === "bodylab-backup") {
    source = "bodylab-backup-json";
    profile = value.profile;
    measurements = value.measurements;
    snapshots = value.snapshots;
  } else if (value.format === "bodylab" && isRecord(value.data)) {
    source = "bodylab-json";
    profile = value.data.profile ?? value.profile;
    measurements = value.data.measurements;
    snapshots = value.data.snapshots;
  } else {
    return null;
  }

  const converted = archiveFromCollections({ profile, measurements, snapshots });
  if (!converted) return null;

  const exportedAt =
    typeof value.exportedAt === "string" &&
    Number.isFinite(Date.parse(value.exportedAt))
      ? value.exportedAt
      : converted.archive.exportedAt;

  return {
    source,
    archive: { ...converted.archive, exportedAt },
    omitted: converted.omitted,
  };
}
