import type { PersistenceStorage } from '../persist.js';

/** Access browser storage only when a resource is active, never during declaration or SSR. */
export function localStorageAdapter(): PersistenceStorage<unknown> {
  return {
    read(key) {
      const value = localStorage.getItem(key);
      return value === null ? undefined : JSON.parse(value);
    },
    write(key, value) {
      const encoded = JSON.stringify(value);
      if (encoded === undefined)
        throw new TypeError('localStorageAdapter: value is not JSON serializable.');
      localStorage.setItem(key, encoded);
    },
  };
}
