export interface OfflineQueueItem {
  id: string; // also used as the idempotency key when syncing to Firestore
  type: 'careNote' | 'sirsReport' | 'familyUpdate';
  data: any;
  timestamp: number;
  retryCount: number;
  syncStatus: 'pending' | 'failed';
}

const DB_NAME = 'AgedCareOfflineDB';
const STORE_NAME = 'offline_sync_queue';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get offline queue from IndexedDB', e);
    return [];
  }
}

export async function addToOfflineQueue(type: OfflineQueueItem['type'], data: any) {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const item: OfflineQueueItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        syncStatus: 'pending',
      };
      store.add(item);
      tx.oncomplete = () => {
        window.dispatchEvent(new Event('offline_queue_updated'));
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to add to offline queue', e);
  }
}

export async function clearOfflineQueue() {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        window.dispatchEvent(new Event('offline_queue_updated'));
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to clear offline queue', e);
  }
}

export async function removeQueueItem(id: string) {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        window.dispatchEvent(new Event('offline_queue_updated'));
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to remove item from offline queue', e);
  }
}

// Marks a queue item as failed and bumps its retry counter. The item stays
// in the queue so no data is lost; the next sync pass will retry it.
export async function markQueueItemFailed(id: string) {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result as OfflineQueueItem | undefined;
        if (item) {
          item.retryCount = (item.retryCount || 0) + 1;
          item.syncStatus = 'failed';
          store.put(item);
        }
      };
      tx.oncomplete = () => {
        window.dispatchEvent(new Event('offline_queue_updated'));
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to mark queue item as failed', e);
  }
}
