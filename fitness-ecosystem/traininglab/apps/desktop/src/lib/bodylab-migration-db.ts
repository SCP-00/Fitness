import { openDB } from "./db";
import {
  bodyLabCollections,
  reconcileBodyLabArchive,
  type BodyLabArchive,
  type BodyLabMergeReceipt,
} from "./bodylab-migration";

export const BODYLAB_ARCHIVE_KEY = "bodylab-private-archive";

export async function loadBodyLabArchive(): Promise<BodyLabArchive | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readonly");
    const read = tx.objectStore("meta").get(BODYLAB_ARCHIVE_KEY);
    tx.oncomplete = () => resolve(read.result?.value ?? null);
    tx.onabort = () => reject(tx.error);
  });
}

export async function mergeBodyLabArchive(
  incoming: BodyLabArchive,
  preview?: BodyLabMergeReceipt,
): Promise<BodyLabMergeReceipt> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("meta", "readwrite");
    let receipt: BodyLabMergeReceipt;
    let failure: unknown;
    tx.oncomplete = () => resolve(receipt);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error("Archive write aborted"));
    const store = tx.objectStore("meta");
    const read = store.get(BODYLAB_ARCHIVE_KEY);
    read.onsuccess = () => {
      try {
        const result = reconcileBodyLabArchive(read.result?.value ?? null, incoming);
        receipt = result.receipt;
        if (preview && JSON.stringify(preview) !== JSON.stringify(receipt)) {
          throw new Error("BodyLab archive changed since preview");
        }
        if (!read.result || bodyLabCollections.some((key) => receipt[key].added > 0)) {
          store.put({ id: BODYLAB_ARCHIVE_KEY, value: result.archive });
        }
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
  });
}
