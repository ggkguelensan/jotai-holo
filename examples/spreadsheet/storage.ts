export interface DocumentStorage {
  read(key: string): Promise<unknown>;
  write(key: string, value: unknown): Promise<void>;
}

/** One transaction per document; no browser work happens during module import. */
export function browserStorage(): DocumentStorage {
  let database: Promise<IDBDatabase> | undefined;
  function open() {
    return (database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open('holo-workbooks', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('documents');
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
    }));
  }
  return {
    async read(key) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('documents', 'readonly');
        const request = transaction.objectStore('documents').get(key);
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    },
    async write(key, value) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('documents', 'readwrite');
        transaction.objectStore('documents').put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    },
  };
}
