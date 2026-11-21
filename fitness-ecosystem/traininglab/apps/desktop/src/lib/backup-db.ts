import { mergeById, type TrainingLabBackup } from "./backup";
import {
  reconcileBodyLabArchive,
  type BodyLabArchive,
} from "./bodylab-migration";
import { BODYLAB_ARCHIVE_KEY } from "./bodylab-migration-db";
import { normalizeSettings, openDB } from "./db";
import type { HealthRecord } from "./shared";
import type { TLSession, TLSet } from "./types";
import { WAIST_MEASUREMENTS_KEY } from "./waist-db";
import { isWaistMeasurement } from "./waist";

function read<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function restoreTrainingLabBackup(backup: TrainingLabBackup) {
  const settings = backup.settings ? normalizeSettings(backup.settings) : null;
  const db = await openDB();
  const tx = db.transaction(["sets", "sessions", "meta"], "readwrite");
  const committed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("Backup transaction aborted"));
  });
  const sets = tx.objectStore("sets");
  const sessions = tx.objectStore("sessions");
  const meta = tx.objectStore("meta");

  const prepare = async () => {
    const [storedSets, storedSessions, healthRow, waistRow, archiveRow] =
      await Promise.all([
        read<TLSet[]>(sets.getAll()),
        read<TLSession[]>(sessions.getAll()),
        read<{ value: HealthRecord[] } | undefined>(meta.get("health-records")),
        read<{ value: unknown } | undefined>(meta.get(WAIST_MEASUREMENTS_KEY)),
        read<{ value: BodyLabArchive } | undefined>(
          meta.get(BODYLAB_ARCHIVE_KEY),
        ),
      ]);
    const nextSets = mergeById(backup.sets, storedSets).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    const nextSessions = mergeById(backup.sessions, storedSessions).sort(
      (a, b) => a.startedAt.localeCompare(b.startedAt),
    );
    const health = mergeById(backup.health, healthRow?.value ?? []);
    const ids = new Set(storedSets.map((row) => row.id));
    for (const row of nextSets) if (!ids.has(row.id)) sets.add(row);
    const sessionIds = new Set(storedSessions.map((row) => row.id));
    for (const row of nextSessions)
      if (!sessionIds.has(row.id)) sessions.add(row);
    meta.put({ id: "health-records", value: health });

    if (backup.waistMeasurements?.length) {
      const local = Array.isArray(waistRow?.value)
        ? waistRow.value.filter(isWaistMeasurement)
        : [];
      meta.put({
        id: WAIST_MEASUREMENTS_KEY,
        value: mergeById(backup.waistMeasurements, local),
      });
    }
    if (backup.bodyLabArchive) {
      const { archive } = reconcileBodyLabArchive(
        archiveRow?.value ?? null,
        backup.bodyLabArchive,
      );
      meta.put({ id: BODYLAB_ARCHIVE_KEY, value: archive });
    }
    if (settings) meta.put({ id: "settings", value: settings });
    if (backup.decisionModel)
      meta.put({ id: "decision-model", value: backup.decisionModel });
    return { sets: nextSets, sessions: nextSessions, health, settings };
  };

  try {
    const [result] = await Promise.all([prepare(), committed]);
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* IndexedDB may already have aborted. */
    }
    throw error;
  }
}
