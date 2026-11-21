import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";

const { invoke, openDB } = vi.hoisted(() => ({
  invoke: vi.fn(),
  openDB: vi.fn(),
}));

vi.mock("../../../../../traininglab/apps/desktop/src/lib/db", () => ({
  openDB,
}));
vi.mock("../../../../../traininglab/apps/desktop/src/lib/autobackup", () => ({
  isDesktopHost: () => true,
}));

import {
  parsePrivateBackup,
  privateBackupHasMissingData,
  readPrivateAutobackup,
  restorePrivateAutobackup,
  schedulePrivateAutobackup,
} from "../../../../../traininglab/apps/desktop/src/lib/private-autobackup";

const row = {
  id: "one",
  day: "2026-11-20",
  cm: 80,
  landmark: "navel" as const,
};
const backup = {
  format: "traininglab-private-backup" as const,
  version: 1 as const,
  exportedAt: "2026-11-20T12:00:00Z",
  waistMeasurements: [row],
  bodyLabArchive: null,
};

async function database(): Promise<IDBDatabase> {
  const factory = new IDBFactory();
  return new Promise((resolve, reject) => {
    const request = factory.open("private-test", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("meta", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe("private snapshots", () => {
  beforeEach(async () => {
    vi.useRealTimers();
    invoke.mockReset();
    if (typeof window === "undefined") vi.stubGlobal("window", {});
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke },
    });
    openDB.mockReset();
    openDB.mockResolvedValue(await database());
  });

  it("rejects invalid records and duplicate IDs", () => {
    expect(parsePrivateBackup(JSON.stringify(backup))).toEqual(backup);
    expect(
      parsePrivateBackup(
        JSON.stringify({ ...backup, waistMeasurements: [row, row] }),
      ),
    ).toBeNull();
    expect(
      parsePrivateBackup(JSON.stringify({ ...backup, bodyLabArchive: {} })),
    ).toBeNull();
  });

  it("skips a corrupt newest snapshot and restores without replacing local data", async () => {
    invoke.mockResolvedValue(["{", JSON.stringify(backup)]);
    const recovered = await readPrivateAutobackup();
    expect(recovered).toEqual(backup);
    expect(await privateBackupHasMissingData(backup)).toBe(true);
    await restorePrivateAutobackup(backup);
    expect(await privateBackupHasMissingData(backup)).toBe(false);
    await restorePrivateAutobackup({
      ...backup,
      waistMeasurements: [{ ...row, cm: 95 }],
    });
    const db = await openDB();
    const stored = await new Promise<any>((resolve) => {
      const req = db
        .transaction("meta")
        .objectStore("meta")
        .get("private-waist-measurements");
      req.onsuccess = () => resolve(req.result.value);
    });
    expect(stored).toEqual([row]);
  });

  it("coalesces callers and keeps private records out of the MCP command", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    invoke.mockResolvedValue(undefined);
    await restorePrivateAutobackup(backup);
    const first = schedulePrivateAutobackup();
    const second = schedulePrivateAutobackup();
    await vi.advanceTimersByTimeAsync(2000);
    await Promise.all([first, second]);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toBe("write_private_autobackup");
    expect(
      JSON.parse(invoke.mock.calls[0][1].contents).waistMeasurements,
    ).toEqual([row]);
    vi.useRealTimers();
  });
});
