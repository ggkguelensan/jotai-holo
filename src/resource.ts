import type { Store } from './model-protocol.js';

/** A pure declaration. Connections and their cleanup are synchronous. */
export interface Resource {
  connect(store: Store): void | (() => void);
}

const connections = new WeakMap<Store, WeakMap<Resource, { owners: number; stop: () => void }>>();

/** Acquire shared resources transactionally; release every resource even if cleanup fails. */
export function acquireResources(store: Store, resources: readonly Resource[]): () => void {
  const releases: (() => void)[] = [];
  try {
    for (const resource of resources) {
      let entries = connections.get(store);
      if (!entries) connections.set(store, (entries = new WeakMap()));
      let entry = entries.get(resource);
      if (!entry) {
        const cleanup = resource.connect(store);
        if (cleanup !== undefined && typeof cleanup !== 'function') {
          // Invalid JS/async implementations must not also create unhandled rejections.
          void Promise.resolve(cleanup).catch(() => {});
          throw new TypeError('Resource.connect must return synchronous cleanup or undefined.');
        }
        entry = { owners: 0, stop: cleanup ?? (() => {}) };
        entries.set(resource, entry);
      }
      entry.owners++;
      const current = entry;
      releases.push(() => {
        if (--current.owners) return;
        entries.delete(resource);
        current.stop();
      });
    }
  } catch (error) {
    try {
      releaseAll(releases);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Resource acquisition and rollback failed.');
    }
    throw error;
  }
  return () => releaseAll(releases);
}

function releaseAll(releases: (() => void)[]) {
  const errors: unknown[] = [];
  for (const release of releases.splice(0).reverse()) {
    try {
      release();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, 'Resource cleanup failed.');
}
