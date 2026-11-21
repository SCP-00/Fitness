import { openDB } from "./db";
import { isWaistMeasurement, type WaistMeasurement } from "./waist";

export const WAIST_MEASUREMENTS_KEY = "private-waist-measurements";

function readRows(value: unknown): WaistMeasurement[] {
  return Array.isArray(value) ? value.filter(isWaistMeasurement) : [];
}

export async function loadWaistMeasurements(): Promise<WaistMeasurement[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("meta")
      .objectStore("meta")
      .get(WAIST_MEASUREMENTS_KEY);
    request.onsuccess = () => resolve(readRows(request.result?.value));
    request.onerror = () => reject(request.error);
  });
}

async function updateWaist(
  update: (rows: WaistMeasurement[]) => WaistMeasurement[],
): Promise<WaistMeasurement[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("meta", "readwrite");
    const store = transaction.objectStore("meta");
    const request = store.get(WAIST_MEASUREMENTS_KEY);
    let rows: WaistMeasurement[];
    request.onsuccess = () => {
      rows = update(readRows(request.result?.value));
      store.put({ id: WAIST_MEASUREMENTS_KEY, value: rows });
    };
    transaction.oncomplete = () => resolve(rows);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function saveWaistMeasurement(
  row: WaistMeasurement,
): Promise<WaistMeasurement[]> {
  if (!isWaistMeasurement(row))
    return Promise.reject(new Error("Invalid waist measurement"));
  return updateWaist((rows) => [
    ...rows.filter(({ id }) => id !== row.id),
    row,
  ]);
}

/** Rechecks the identity inside the write transaction to make retries safe. */
export function importWaistMeasurement(
  row: WaistMeasurement,
): Promise<WaistMeasurement[]> {
  if (!isWaistMeasurement(row)) {
    return Promise.reject(new Error("Invalid waist measurement"));
  }
  return updateWaist((rows) =>
    rows.some(({ id }) => id === row.id) ? rows : [...rows, row],
  );
}
