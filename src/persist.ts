import { atom, type Atom, type WritableAtom } from 'jotai/vanilla';
import type { Resource } from './resource.js';
import { managedConnection, type ManagedConnection } from './model-managed.js';
import type { Store } from './model-protocol.js';
import { PersistenceController, type PersistenceStatus } from './persistence/controller.js';

export { localStorageAdapter } from './persistence/local-storage.js';

export interface PersistenceCodec<Value, Stored> {
  decode(value: unknown): Value | Promise<Value>;
  encode(value: Value): Stored | Promise<Stored>;
}
export interface PersistenceStorage<Stored> {
  read(key: string, signal: AbortSignal): unknown | Promise<unknown>;
  write(key: string, value: Stored, signal: AbortSignal): void | Promise<void>;
}
export type Persistence<Value> = Resource &
  ManagedConnection & {
    readonly $restoring: Atom<boolean>;
    readonly $saving: Atom<boolean>;
    readonly $dirty: Atom<boolean>;
    readonly $error: Atom<unknown>;
    readonly flush: WritableAtom<null, [], Promise<void>>;
  };

/** Restore once and save captured local edits for each owning store. */
export function persist<Value, Stored = Value>(options: {
  read: Atom<Value>;
  restore: WritableAtom<unknown, [Value], unknown>;
  storage: PersistenceStorage<Stored>;
  key: string;
  codec: PersistenceCodec<Value, Stored>;
  save?: { debounce?: number };
  timeout?: number;
}): Persistence<Value> {
  const debounce = options.save?.debounce ?? 0;
  const timeout = options.timeout ?? 10_000;
  if (!Number.isFinite(debounce) || debounce < 0 || !Number.isFinite(timeout) || timeout <= 0)
    throw new TypeError('persist: debounce must be non-negative and timeout must be positive.');

  const $status = atom<PersistenceStatus>({
    restoring: false,
    saving: false,
    dirty: false,
    error: undefined,
  });
  const $controller = atom<PersistenceController<Value, Stored> | undefined>(undefined);
  const flush = atom(null, (get) => get($controller)?.flush() ?? Promise.resolve());
  const connect = (store: Store) => {
    let controller = store.get($controller);
    if (!controller) {
      controller = new PersistenceController(store, { ...options, debounce, timeout }, (status) => {
        try {
          store.set($status, status);
        } catch (error) {
          console.error(error);
        }
      });
      store.set($controller, controller);
    }
    return controller.connect();
  };

  return {
    $restoring: atom((get) => get($status).restoring),
    $saving: atom((get) => get($status).saving),
    $dirty: atom((get) => get($status).dirty),
    $error: atom((get) => get($status).error),
    flush,
    connect,
    [managedConnection]: connect,
  };
}
