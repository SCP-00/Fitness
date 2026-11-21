import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

const { openDB } = vi.hoisted(() => ({ openDB: vi.fn() }));
vi.mock("../../../../../traininglab/apps/desktop/src/lib/db", () => ({
  openDB,
  normalizeSettings: vi.fn((value) => value),
}));

import { restoreTrainingLabBackup } from "../../../../../traininglab/apps/desktop/src/lib/backup-db";
import { saveWaistMeasurement } from "../../../../../traininglab/apps/desktop/src/lib/waist-db";
import { buildBackup } from "../../../../../traininglab/apps/desktop/src/lib/backup";

let db: IDBDatabase;

function get(store: string, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe("atomic backup restore", () => {
  beforeEach(async () => {
    const factory = new IDBFactory();
    db = await new Promise((resolve, reject) => {
      const request = factory.open("traininglab-test", 1);
      request.onupgradeneeded = () => {
        for (const name of ["sets", "sessions", "meta"]) {
          request.result.createObjectStore(name, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    openDB.mockResolvedValue(db);
  });

  it("refuses to replace a waist list containing an unrecognized record", async () => {
    const original = { id: "future-row", cm: 90, landmark: "future-method" };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({
        id: "private-waist-measurements",
        value: [original],
      });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    await expect(
      saveWaistMeasurement({
        id: "new",
        day: "2026-11-20",
        cm: 80,
        landmark: "navel",
      }),
    ).rejects.toThrow("Invalid local waist data");
    expect(await get("meta", "private-waist-measurements")).toEqual({
      id: "private-waist-measurements",
      value: [original],
    });
  });
  it("aborts all writes when local waist data contains an unrecognized record", async () => {
    const original = { id: "future-row", cm: 90, landmark: "future-method" };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({
        id: "private-waist-measurements",
        value: [original],
      });
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    const backup = buildBackup({
      sets: [
        {
          id: "set-a",
          exerciseId: "push-ups",
          dayId: "day-1",
          timestamp: "2026-11-20T12:00:00Z",
          weight: null,
          reps: 10,
        },
      ],
      sessions: [],
      health: [],
      settings: null,
      decisionModel: null,
      waistMeasurements: [
        { id: "waist-a", day: "2026-11-20", cm: 80, landmark: "navel" },
      ],
    });
    await expect(restoreTrainingLabBackup(backup)).rejects.toThrow(
      "Invalid local waist data",
    );
    expect(await get("meta", "private-waist-measurements")).toEqual({
      id: "private-waist-measurements",
      value: [original],
    });
    expect(await get("sets", "set-a")).toBeUndefined();
  });
});
