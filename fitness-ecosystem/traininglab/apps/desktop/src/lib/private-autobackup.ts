import { invoke } from "@tauri-apps/api/core";
import { isDesktopHost } from "./autobackup";
import {
  parseBodyLabArchive,
  reconcileBodyLabArchive,
  type BodyLabArchive,
} from "./bodylab-migration";
import { BODYLAB_ARCHIVE_KEY } from "./bodylab-migration-db";
import { openDB } from "./db";
import { isWaistMeasurement, type WaistMeasurement } from "./waist";
import { WAIST_MEASUREMENTS_KEY } from "./waist-db";

export interface PrivateBackup {
  format: "traininglab-private-backup";
  version: 1;
  exportedAt: string;
  waistMeasurements: WaistMeasurement[];
  bodyLabArchive: BodyLabArchive | null;
}

export function parsePrivateBackup(text: string): PrivateBackup | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const value = raw as Record<string, unknown>;
    if (
      value.format !== "traininglab-private-backup" ||
      value.version !== 1 ||
      typeof value.exportedAt !== "string" ||
      !Number.isFinite(Date.parse(value.exportedAt)) ||
      !Array.isArray(value.waistMeasurements) ||
      !value.waistMeasurements.every(isWaistMeasurement)
    )
      return null;
    if (
      new Set(value.waistMeasurements.map((row) => row.id)).size !==
      value.waistMeasurements.length
    )
      return null;
    const archive =
      value.bodyLabArchive === null
        ? null
        : parseBodyLabArchive(value.bodyLabArchive);
    if (value.bodyLabArchive !== null && !archive) return null;
    return {
      format: "traininglab-private-backup",
      version: 1,
      exportedAt: value.exportedAt,
      waistMeasurements: value.waistMeasurements,
      bodyLabArchive: archive,
    };
  } catch {
    return null;
  }
}

async function readCurrent(): Promise<
  Pick<PrivateBackup, "waistMeasurements" | "bodyLabArchive">
> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const store = tx.objectStore("meta");
    const waist = store.get(WAIST_MEASUREMENTS_KEY);
    const archive = store.get(BODYLAB_ARCHIVE_KEY);
    tx.oncomplete = () => {
      const rows: unknown = waist.result?.value ?? [];
      const rawArchive: unknown = archive.result?.value ?? null;
      if (
        !Array.isArray(rows) ||
        !rows.every(isWaistMeasurement) ||
        (rawArchive !== null && !parseBodyLabArchive(rawArchive))
      ) {
        reject(new Error("Invalid local private data"));
        return;
      }
      resolve({
        waistMeasurements: rows,
        bodyLabArchive: rawArchive as BodyLabArchive | null,
      });
    };
    tx.onabort = () =>
      reject(tx.error ?? new Error("Private backup read failed"));
  });
}

let pending: ReturnType<typeof setTimeout> | null = null;
let pendingResolvers: Array<() => void> = [];
let chain: Promise<void> = Promise.resolve();
let lastSignature: string | null = null;

/** Read only after the debounce so concurrent changes cannot be captured stale. */
export function schedulePrivateAutobackup(): Promise<void> {
  if (!isDesktopHost()) return Promise.resolve();
  if (pending) clearTimeout(pending);
  return new Promise((resolve) => {
    pendingResolvers.push(resolve);
    pending = setTimeout(() => {
      pending = null;
      const resolvers = pendingResolvers;
      pendingResolvers = [];
      chain = chain
        .then(async () => {
          try {
            const current = await readCurrent();
            if (!current.waistMeasurements.length && !current.bodyLabArchive)
              return;
            const signature = JSON.stringify(current);
            if (signature === lastSignature) return;
            const backup: PrivateBackup = {
              format: "traininglab-private-backup",
              version: 1,
              exportedAt: new Date().toISOString(),
              ...current,
            };
            await invoke("write_private_autobackup", {
              contents: JSON.stringify(backup),
            });
            lastSignature = signature;
          } catch {
            // A backup failure must not undo a committed measurement.
          }
        })
        .finally(() => resolvers.forEach((done) => done()));
    }, 2000);
  });
}

/** Offer recovery after comparing it to local data, never automatically. */
export async function readPrivateAutobackup(): Promise<PrivateBackup | null> {
  if (!isDesktopHost()) return null;
  try {
    const snapshots = await invoke<string[]>("read_private_autobackups");
    for (const text of snapshots) {
      const backup = parsePrivateBackup(text);
      if (backup) return backup;
    }
  } catch {
    return null;
  }
  return null;
}

export async function privateBackupHasMissingData(
  backup: PrivateBackup,
): Promise<boolean> {
  const current = await readCurrent();
  const existing = new Set(current.waistMeasurements.map((row) => row.id));
  if (backup.waistMeasurements.some((row) => !existing.has(row.id)))
    return true;
  if (!backup.bodyLabArchive) return false;
  const { receipt } = reconcileBodyLabArchive(
    current.bodyLabArchive,
    backup.bodyLabArchive,
  );
  return Object.values(receipt).some((collection) => collection.added > 0);
}

/** Merge without overwriting local IDs, atomically across both private datasets. */
export async function restorePrivateAutobackup(
  backup: PrivateBackup,
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("meta", "readwrite");
    const store = tx.objectStore("meta");
    const waist = store.get(WAIST_MEASUREMENTS_KEY);
    const archive = store.get(BODYLAB_ARCHIVE_KEY);
    let failure: unknown;
    let completedReads = 0;
    function merge() {
      if (++completedReads !== 2) return;
      try {
        const local = waist.result?.value ?? [];
        if (!Array.isArray(local) || !local.every(isWaistMeasurement))
          throw new Error("Invalid local waist data");
        const existing = new Set(local.map((row) => row.id));
        const rows = [
          ...local,
          ...backup.waistMeasurements.filter((row) => !existing.has(row.id)),
        ];
        if (rows.length) store.put({ id: WAIST_MEASUREMENTS_KEY, value: rows });
        const current = archive.result?.value ?? null;
        if (current !== null && !parseBodyLabArchive(current))
          throw new Error("Invalid local BodyLab archive");
        if (backup.bodyLabArchive) {
          const result = reconcileBodyLabArchive(
            current,
            backup.bodyLabArchive,
          );
          store.put({ id: BODYLAB_ARCHIVE_KEY, value: result.archive });
        }
      } catch (error) {
        failure = error;
        tx.abort();
      }
    }
    waist.onsuccess = merge;
    archive.onsuccess = merge;
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(failure ?? tx.error ?? new Error("Private restore failed"));
  });
  void schedulePrivateAutobackup();
}
