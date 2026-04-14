const DB_NAME = 'flood-rescue-offline';
const STORE_NAME = 'pending-requests';

async function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e =>
      e.target.result.createObjectStore(STORE_NAME, { autoIncrement: true, keyPath: 'id' });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineRequest(requestData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ ...requestData, queuedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount() {
  const db = await openDB();
  return new Promise(resolve => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}

export async function syncPendingRequests() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  const db = await openDB();
  const items = await new Promise(resolve => {
    const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });

  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const { id, queuedAt, ...data } = item;
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      synced++;
    } catch {
      failed++;
      break; // still offline or server error — stop
    }
  }
  return { synced, failed };
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => syncPendingRequests());
}
