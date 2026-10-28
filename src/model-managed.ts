import type { Store } from './model-protocol.js';
import { acquireResources, type Resource } from './resource.js';

/** Only explicitly managed declarations activate; ordinary atoms remain lazy. */
export const managedConnection = Symbol('holo.model.connection');
export type ManagedConnection = {
  readonly [managedConnection]: Resource['connect'];
};

export function acquireModelRecord(store: Store, model: object): () => void {
  const declarations = Object.values(model).filter(
    (value): value is ManagedConnection =>
      value !== null && typeof value === 'object' && managedConnection in value,
  );
  return acquireResources(
    store,
    declarations.map((declaration) => {
      let resource = resources.get(declaration);
      if (!resource) {
        resource =
          'connect' in declaration && declaration.connect === declaration[managedConnection]
            ? (declaration as ManagedConnection & Resource)
            : { connect: (store) => declaration[managedConnection](store) };
        resources.set(declaration, resource);
      }
      return resource;
    }),
  );
}

const resources = new WeakMap<ManagedConnection, Resource>();
