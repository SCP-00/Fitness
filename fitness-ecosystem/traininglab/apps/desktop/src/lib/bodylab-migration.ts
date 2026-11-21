import {
  BODYLAB_ARCHIVE_KEYS,
  bodyLabCollections,
  type BodyLabArchive,
  type BodyLabCollection,
} from "../../../../../bodylab/packages/contracts/bodylab-migration";

export {
  bodyLabCollections,
  parseBodyLabArchive,
  type BodyLabArchive,
} from "../../../../../bodylab/packages/contracts/bodylab-migration";

// Historic formats (the released `.bodylab` and legacy JSON exports) convert
// into this same archive, so the receipt/preview path above is reused as-is.
export {
  archiveFromLegacyBodyLab,
  type LegacyArchive,
  type LegacyBodyLabRead,
  type LegacyBodyLabSource,
} from "../../../../../bodylab/packages/contracts/bodylab-legacy";
export { readBodyLabZip } from "../../../../../bodylab/packages/contracts/bodylab-zip";

interface CollectionReceipt {
  added: number;
  unchanged: number;
  conflicts: string[];
}

export type BodyLabMergeReceipt = Record<
  BodyLabCollection,
  CollectionReceipt
>;

function sameJson(first: unknown, second: unknown): boolean {
  if (first === second) return true;
  if (Array.isArray(first) && Array.isArray(second)) {
    return first.length === second.length &&
      first.every((value, index) => sameJson(value, second[index]));
  }
  if (
    !first || !second ||
    typeof first !== "object" || typeof second !== "object" ||
    Array.isArray(first) || Array.isArray(second)
  ) return false;

  const other = second as Record<string, unknown>;
  const entries = Object.entries(first);
  return entries.length === Object.keys(other).length &&
    entries.every(([key, value]) => Object.hasOwn(other, key) && sameJson(value, other[key]));
}

export function reconcileBodyLabArchive(
  current: BodyLabArchive | null,
  incoming: BodyLabArchive,
): { archive: BodyLabArchive; receipt: BodyLabMergeReceipt } {
  const archive = { ...incoming, data: { ...incoming.data } };
  const receipt = {} as BodyLabMergeReceipt;
  for (const collection of bodyLabCollections) {
    const key = BODYLAB_ARCHIVE_KEYS[collection];
    const prior = current?.data[collection] ?? [];
    const priorById = new Map(prior.map((row) => [row[key], row]));
    const next = [...prior];
    const changes: CollectionReceipt = { added: 0, unchanged: 0, conflicts: [] };
    for (const row of incoming.data[collection]) {
      const previous = priorById.get(row[key]);
      if (!previous) {
        next.push(row);
        changes.added += 1;
      } else if (sameJson(previous, row)) {
        changes.unchanged += 1;
      } else {
        changes.conflicts.push(String(row[key]));
      }
    }
    archive.data[collection] = next;
    receipt[collection] = changes;
  }
  return { archive, receipt };
}
