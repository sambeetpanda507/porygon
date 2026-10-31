/**
 * Minimal IndexedDB key/value helper. We only ever need get/set on a single
 * object store, so a tiny hand-rolled wrapper beats pulling in a dependency.
 */

const DB_NAME = "p0rygon";
const DB_VERSION = 1;
const STORE_NAME = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (): void => {
      const db: IDBDatabase = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db: IDBDatabase = await openDb();
  return new Promise((resolve, reject) => {
    const tx: IDBTransaction = db.transaction(STORE_NAME, "readonly");
    const request: IDBRequest = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = (): void => resolve(request.result as T | undefined);
    request.onerror = (): void => reject(request.error);
  });
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db: IDBDatabase = await openDb();
  return new Promise((resolve, reject) => {
    const tx: IDBTransaction = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = (): void => resolve();
    tx.onerror = (): void => reject(tx.error);
  });
}
