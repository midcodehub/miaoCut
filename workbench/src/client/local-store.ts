import type { WorkspaceState } from "@/domain/contracts";
import { validWorkspace } from "@/domain/model";

const DB = "miaocut-workbench-demo-v1", STORE = "workspace";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("storage_blocked"));
  });
}
export async function readWorkspace(): Promise<WorkspaceState | undefined> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get("active");
      request.onsuccess = () => resolve(validWorkspace(request.result) ? request.result : undefined);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
async function writeWorkspace(state: WorkspaceState): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(state, "active");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

// Serialize writes so a slower earlier connection cannot overwrite a newer draft/clear.
let pendingWrite: Promise<void> = Promise.resolve();
export function saveWorkspace(state: WorkspaceState): Promise<void> {
  const write = pendingWrite.then(() => writeWorkspace(state));
  pendingWrite = write.catch(() => undefined);
  return write;
}
