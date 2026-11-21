/**
 * T01 — the historic formats the unified import must keep reading.
 *
 * A user upgrading from a released BodyLab has a `.bodylab` ZIP or the legacy
 * JSON export, not the new transition archive. Both must land in the SAME
 * canonical archive (so the preview, receipt and idempotent re-import already
 * built for T01 apply unchanged) and neither may invent a row it does not have.
 *
 * The link file is covered too: v1 is a real file users already hold, and it
 * must load without pretending the v2 conditioning map exists.
 *
 * @module tests/training/legacy_import
 */

import { describe, it, expect } from "vitest";
import {
  archiveFromLegacyBodyLab,
  parseBodyLabArchive,
  reconcileBodyLabArchive,
  readBodyLabZip,
} from "../../traininglab/apps/desktop/src/lib/bodylab-migration";
import {
  isV2Payload,
  normalizeLinkPayload,
  readLinkPayload,
  type ImportPayload,
} from "../../traininglab/apps/desktop/src/lib/adapter";

// ── Fixtures (shapes copied from the web app's types and Data Vault page) ────

const PROFILE = {
  id: "profile-1",
  name: "Test User",
  height: 1.8,
  weight: 78,
  birthDate: "1996-04-02",
  biologicalSex: "male",
  units: "metric",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const MEASUREMENTS = [
  {
    id: "m-waist",
    profileId: "profile-1",
    type: "waist",
    value: 83.5,
    unit: "cm",
    timestamp: "2026-03-01T09:00:00.000Z",
    method: "manual",
    confidence: "high",
  },
  {
    id: "m-chest",
    profileId: "profile-1",
    type: "chest",
    value: 101.2,
    unit: "cm",
    timestamp: "2026-03-01T09:05:00.000Z",
    method: "manual",
    confidence: "medium",
  },
];

const SNAPSHOTS = [
  {
    id: "snap-1",
    profileId: "profile-1",
    timestamp: "2026-03-01T09:10:00.000Z",
    measurements: [],
    bodyParameters: { height: 1.8, weight: 78 },
    referenceProfileId: "ref-1",
    assessmentResults: [],
    algorithmVersion: "1.0.0",
  },
];

const LEGACY_JSON = {
  format: "bodylab",
  formatVersion: 1,
  appVersion: "1.0.0",
  exportedAt: "2026-03-02T10:00:00.000Z",
  data: { profile: PROFILE, measurements: MEASUREMENTS, snapshots: SNAPSHOTS },
};

// ── 1. Legacy JSON export ───────────────────────────────────────────────────

describe("historic .bodylab JSON", () => {
  it("converts into the canonical archive and keeps every id", () => {
    const read = archiveFromLegacyBodyLab(LEGACY_JSON);
    expect(read?.source).toBe("bodylab-json");
    expect(read?.archive.exportedAt).toBe("2026-03-02T10:00:00.000Z");
    expect(read?.archive.data.profiles).toEqual([PROFILE]);
    expect(read?.archive.data.measurements.map((m) => m.id)).toEqual([
      "m-waist",
      "m-chest",
    ]);
    expect(read?.archive.data.snapshots.map((s) => s.id)).toEqual(["snap-1"]);
    // The converted archive satisfies the same contract the transition file does.
    expect(parseBodyLabArchive(read?.archive)).not.toBeNull();
  });

  it("declares what this family of formats cannot carry", () => {
    const read = archiveFromLegacyBodyLab(LEGACY_JSON);
    expect(read?.omitted).toEqual([
      "exerciseSets",
      "maxEfforts",
      "metadata",
      "localPreferences",
    ]);
    // ...and does not add placeholder rows for them.
    expect(read?.archive.data.exerciseSets).toEqual([]);
    expect(read?.archive.data.maxEfforts).toEqual([]);
  });

  it("re-importing the same file is idempotent; a changed value is a conflict", () => {
    const read = archiveFromLegacyBodyLab(LEGACY_JSON);
    if (!read) throw new Error("expected a readable archive");

    const first = reconcileBodyLabArchive(null, read.archive);
    expect(first.receipt.measurements).toEqual({
      added: 2,
      unchanged: 0,
      conflicts: [],
    });

    const again = reconcileBodyLabArchive(read.archive, read.archive);
    expect(again.receipt.measurements).toEqual({
      added: 0,
      unchanged: 2,
      conflicts: [],
    });

    const edited = structuredClone(read.archive);
    edited.data.measurements[0].value = 84;
    const conflict = reconcileBodyLabArchive(read.archive, edited);
    expect(conflict.receipt.measurements.conflicts).toEqual(["m-waist"]);
    // The stored row is kept, exactly like any other archive conflict.
    expect(conflict.archive.data.measurements[0].value).toBe(83.5);
  });

  it("accepts the older bodylab-backup envelope", () => {
    const read = archiveFromLegacyBodyLab({
      format: "bodylab-backup",
      manifest: { format: "bodylab", formatVersion: 1 },
      profile: PROFILE,
      measurements: MEASUREMENTS,
      snapshots: [],
    });
    expect(read?.source).toBe("bodylab-backup-json");
    expect(read?.archive.data.measurements).toHaveLength(2);
  });

  it("accepts a file without a profile (the user never made one)", () => {
    const read = archiveFromLegacyBodyLab({
      format: "bodylab",
      data: { profile: null, measurements: [], snapshots: [] },
    });
    expect(read).not.toBeNull();
    expect(read?.archive.data.profiles).toEqual([]);
  });

  it("refuses malformed payloads instead of importing half of them", () => {
    expect(archiveFromLegacyBodyLab(null)).toBeNull();
    expect(archiveFromLegacyBodyLab("{}")).toBeNull();
    expect(archiveFromLegacyBodyLab({ format: "other", data: {} })).toBeNull();
    expect(
      archiveFromLegacyBodyLab({ format: "bodylab", data: { measurements: "x" } }),
    ).toBeNull();
    // Duplicate ids would make the id-keyed merge ambiguous.
    expect(
      archiveFromLegacyBodyLab({
        format: "bodylab",
        data: { measurements: [MEASUREMENTS[0], MEASUREMENTS[0]] },
      }),
    ).toBeNull();
    // A row without a usable id cannot be restored by id.
    expect(
      archiveFromLegacyBodyLab({
        format: "bodylab",
        data: { measurements: [{ ...MEASUREMENTS[0], id: " " }] },
      }),
    ).toBeNull();
    expect(
      archiveFromLegacyBodyLab({
        format: "bodylab",
        data: { snapshots: [{ id: "s" }, null] },
      }),
    ).toBeNull();
  });
});

// ── 2. The `.bodylab` ZIP ───────────────────────────────────────────────────

interface ZipFile {
  name: string;
  text: string;
  /** DEFLATE like JSZip does; `false` writes a stored entry. */
  deflate?: boolean;
}

/** Small writer so the round-trip test uses a real archive, not a mock. */
async function buildZip(files: ZipFile[]): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const entries: {
    name: Uint8Array;
    data: Uint8Array;
    method: number;
    compressed: number;
    raw: number;
  }[] = [];
  for (const file of files) {
    const name = encoder.encode(file.name);
    const raw = encoder.encode(file.text);
    let data = raw;
    let method = 0;
    if (file.deflate) {
      const stream = new Response(raw).body!.pipeThrough(
        new CompressionStream("deflate-raw"),
      );
      data = new Uint8Array(await new Response(stream).arrayBuffer());
      method = 8;
    }
    entries.push({
      name,
      data,
      method,
      compressed: data.length,
      raw: raw.length,
    });
  }

  const localSize = entries.reduce(
    (sum, e) => sum + 30 + e.name.length + e.data.length,
    0,
  );
  const centralSize = entries.reduce((sum, e) => sum + 46 + e.name.length, 0);
  const bytes = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(bytes.buffer);

  let cursor = 0;
  const offsets: number[] = [];
  for (const entry of entries) {
    offsets.push(cursor);
    view.setUint32(cursor, 0x04034b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 8, entry.method, true);
    view.setUint16(cursor + 12, 0x2100, true);
    view.setUint32(cursor + 18, entry.compressed, true);
    view.setUint32(cursor + 22, entry.raw, true);
    view.setUint16(cursor + 26, entry.name.length, true);
    bytes.set(entry.name, cursor + 30);
    bytes.set(entry.data, cursor + 30 + entry.name.length);
    cursor += 30 + entry.name.length + entry.data.length;
  }

  const centralStart = cursor;
  entries.forEach((entry, index) => {
    view.setUint32(cursor, 0x02014b50, true);
    view.setUint16(cursor + 4, 20, true);
    view.setUint16(cursor + 6, 20, true);
    view.setUint16(cursor + 10, entry.method, true);
    view.setUint16(cursor + 14, 0x2100, true);
    view.setUint32(cursor + 20, entry.compressed, true);
    view.setUint32(cursor + 24, entry.raw, true);
    view.setUint16(cursor + 28, entry.name.length, true);
    view.setUint32(cursor + 42, offsets[index], true);
    bytes.set(entry.name, cursor + 46);
    cursor += 46 + entry.name.length;
  });

  view.setUint32(cursor, 0x06054b50, true);
  view.setUint16(cursor + 8, entries.length, true);
  view.setUint16(cursor + 10, entries.length, true);
  view.setUint32(cursor + 12, cursor - centralStart, true);
  view.setUint32(cursor + 16, centralStart, true);
  return bytes;
}

function bodyLabZipFiles(deflate: boolean): ZipFile[] {
  return [
    {
      name: "manifest.json",
      text: JSON.stringify({
        format: "bodylab",
        formatVersion: 1,
        appVersion: "1.0.0",
        schemaVersion: 3,
        createdAt: "2026-03-02T10:00:00.000Z",
        contains: ["profile", "measurements", "snapshots", "metadata"],
      }),
      deflate,
    },
    { name: "profile.json", text: JSON.stringify(PROFILE), deflate },
    {
      name: "measurements.json",
      text: JSON.stringify(MEASUREMENTS),
      deflate,
    },
    { name: "snapshots.json", text: JSON.stringify(SNAPSHOTS), deflate },
    {
      name: "metadata.json",
      text: JSON.stringify({ exportedBy: "BodyLab Web", totalMeasurements: 2 }),
      deflate,
    },
  ];
}

describe("historic .bodylab ZIP", () => {
  it("reads a stored archive", async () => {
    const read = await readBodyLabZip(await buildZip(bodyLabZipFiles(false)));
    expect(read?.archive.data.profiles).toEqual([PROFILE]);
    expect(read?.archive.data.measurements).toHaveLength(2);
    expect(read?.archive.data.snapshots).toHaveLength(1);
    expect(read?.omitted).toContain("exerciseSets");
  });

  it("reads the DEFLATE archive the web app actually writes", async () => {
    const read = await readBodyLabZip(await buildZip(bodyLabZipFiles(true)));
    expect(read?.archive.data.measurements.map((m) => m.id)).toEqual([
      "m-waist",
      "m-chest",
    ]);
    // Identical to the stored read: compression must not change the payload.
    const stored = await readBodyLabZip(await buildZip(bodyLabZipFiles(false)));
    expect(read?.archive).toEqual(stored?.archive);
  });

  it("refuses a ZIP that is not a BodyLab backup, or is truncated", async () => {
    const notBodyLab = await buildZip([
      { name: "manifest.json", text: JSON.stringify({ format: "other" }) },
    ]);
    expect(await readBodyLabZip(notBodyLab)).toBeNull();

    const noManifest = await buildZip([
      { name: "measurements.json", text: JSON.stringify(MEASUREMENTS) },
    ]);
    expect(await readBodyLabZip(noManifest)).toBeNull();

    const good = await buildZip(bodyLabZipFiles(true));
    expect(await readBodyLabZip(good.slice(0, good.length - 30))).toBeNull();
  });
});

// ── 3. TrainingLab link v1 ──────────────────────────────────────────────────

const LINK_V1: ImportPayload = {
  format: "bodylab-traininglab-link",
  version: 1,
  profile: {
    height: 178,
    weight: 82,
    age: 30,
    biologicalSex: "male",
    units: "metric",
  },
  measurements: [
    { type: "weight", value: 82, unit: "kg", timestamp: "2026-09-27T00:00:00.000Z" },
  ],
  muscleScores: [{ segment: "thigh", score: 0.32 }],
  muscleLoad: [
    { muscle: "quadriceps", totalSets: 4, setsLast7d: 0, intensity: 0 },
  ],
  exerciseCatalog: [
    {
      id: "barbell-squat",
      name: "Barbell Back Squat",
      equipment: "Barbell + Squat Rack",
      muscles: [{ muscle: "quadriceps", intensity: 3 }],
    },
  ],
};

describe("TrainingLab link v1", () => {
  it("loads a v1 file and leaves the v2-only map absent", () => {
    const read = readLinkPayload(JSON.stringify(LINK_V1));
    expect(read).not.toBeNull();
    expect(read?.version).toBe(1);
    expect(read?.conditioning).toBeNull();
    expect(read?.indicators).toBeNull();
    expect(read?.exerciseCatalog[0]?.id).toBe("barbell-squat");
    // The strict plan guard still means "v2": it is not silently widened.
    expect(isV2Payload(LINK_V1)).toBe(false);
  });

  it("passes a v2 file through with its conditioning map", () => {
    const read = normalizeLinkPayload({
      ...LINK_V1,
      version: 2,
      conditioning: { conditioningScore: 78, classifiedCount: 3 },
      indicators: { whtr: 0.449, adonis: null },
    });
    expect(read?.conditioning).toEqual({
      conditioningScore: 78,
      classifiedCount: 3,
    });
    expect(read?.indicators?.whtr).toBe(0.449);
  });

  it("refuses unknown versions, other formats and unreadable text", () => {
    expect(normalizeLinkPayload({ ...LINK_V1, version: 3 })).toBeNull();
    expect(normalizeLinkPayload({ ...LINK_V1, format: "bodylab" })).toBeNull();
    expect(normalizeLinkPayload({ ...LINK_V1, exerciseCatalog: [] })).toBeNull();
    expect(normalizeLinkPayload({ ...LINK_V1, measurements: "x" })).toBeNull();
    expect(normalizeLinkPayload(null)).toBeNull();
    expect(readLinkPayload("not json")).toBeNull();
  });
});
