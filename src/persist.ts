import { atom, type Atom, type WritableAtom } from 'jotai/vanilla';
import type { Resource } from './resource.js';
import type { Store } from './model-protocol.js';

export interface PersistenceCodec<Value, Stored> {
  decode(value: unknown): Value | Promise<Value>;
  encode(value: Value): Stored | Promise<Stored>;
}
export interface PersistenceStorage<Stored> {
  read(key: string, signal: AbortSignal): unknown | Promise<unknown>;
  write(key: string, value: Stored, signal: AbortSignal): void | Promise<void>;
}
export type Persistence<Value> = Resource & {
  readonly $restoring: Atom<boolean>;
  readonly $saving: Atom<boolean>;
  readonly $dirty: Atom<boolean>;
  readonly $error: Atom<unknown>;
  readonly flush: WritableAtom<null, [], Promise<void>>;
};

/** Optional store-owned persistence. Local edits win over late restoration. */
export function persist<Value, Stored = Value>(options: {
  read: Atom<Value>;
  restore: WritableAtom<unknown, [Value], unknown>;
  storage: PersistenceStorage<Stored>;
  key: string;
  codec: PersistenceCodec<Value, Stored>;
  save?: { debounce?: number };
  timeout?: number;
}): Persistence<Value> {
  const delay = options.save?.debounce ?? 0;
  const timeout = options.timeout ?? 10_000;
  if (!Number.isFinite(delay) || delay < 0 || !Number.isFinite(timeout) || timeout <= 0)
    throw new TypeError('persist: debounce must be non-negative and timeout must be positive.');
  const $restoring = atom(false),
    $saving = atom(false),
    $dirty = atom(false),
    $error = atom<unknown>(undefined);
  type Runtime = {
    initialized: boolean;
    generation: number;
    revision: number;
    saved: number;
    active: boolean;
    restoring: boolean;
    applying: boolean;
    pending?: { revision: number; value: Value };
    restoration?: Promise<void>;
    timer?: ReturnType<typeof setTimeout> | undefined;
    worker?: Promise<void> | undefined;
    flush?: (() => Promise<void>) | undefined;
  };
  const $runtime = atom<Runtime>(() => ({
    initialized: false,
    generation: 0,
    revision: 0,
    saved: 0,
    active: false,
    restoring: false,
    applying: false,
  }));
  const flush = atom(null, (get) => get($runtime).flush?.() ?? Promise.resolve());
  return {
    $restoring,
    $saving,
    $dirty,
    $error,
    flush,
    connect(store) {
      const runtime = store.get($runtime);
      if (runtime.active)
        throw new Error('persist: acquire through resource ownership instead of connecting twice.');
      runtime.active = true;
      const generation = ++runtime.generation;
      const restoreController = new AbortController();
      const current = () => runtime.active && runtime.generation === generation;
      const clearTimer = () => {
        if (runtime.timer !== undefined) clearTimeout(runtime.timer);
        runtime.timer = undefined;
      };
      const run = (): Promise<void> => {
        clearTimer();
        if (runtime.restoring) return runtime.restoration!.then(run);
        if (runtime.worker)
          return runtime.worker.then(() => (runtime.revision > runtime.saved ? run() : undefined));
        if (runtime.revision <= runtime.saved || !runtime.pending) return Promise.resolve();
        const { revision, value } = runtime.pending;
        store.set($saving, true);
        const worker = bounded(timeout, async (signal) => {
          const encoded = await options.codec.encode(value);
          if (signal.aborted) throw signal.reason;
          await options.storage.write(options.key, encoded, signal);
        })
          .then(
            () => {
              runtime.saved = revision;
              store.set($error, undefined);
            },
            (error) => {
              store.set($error, error);
              throw error;
            },
          )
          .finally(() => {
            runtime.worker = undefined;
            store.set($saving, false);
            store.set($dirty, runtime.revision > runtime.saved);
            if (current() && runtime.revision > revision) schedule();
          });
        runtime.worker = worker;
        return worker;
      };
      const schedule = () => {
        if (!current() || runtime.restoring) return;
        clearTimer();
        runtime.timer = setTimeout(() => {
          void run().catch(() => {});
        }, delay);
      };
      runtime.flush = run;
      runtime.restoring = !runtime.initialized;
      const stop = store.sub(options.read, () => {
        if (runtime.applying) return;
        runtime.revision++;
        runtime.pending = { revision: runtime.revision, value: store.get(options.read) };
        store.set($dirty, true);
        schedule();
      });
      if (!runtime.initialized) {
        store.set($restoring, true);
        const before = runtime.revision;
        runtime.restoration = bounded(
          timeout,
          async (signal) => {
            const stored = await options.storage.read(options.key, signal);
            if (stored === undefined || !current() || signal.aborted) return;
            const restored = await options.codec.decode(stored);
            if (!current() || signal.aborted || before !== 0 || before !== runtime.revision) return;
            runtime.applying = true;
            try {
              const result = store.set(options.restore, restored);
              if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
                void Promise.resolve(result).catch(() => {});
                throw new TypeError('persist: restore must apply data synchronously.');
              }
            } finally {
              runtime.applying = false;
            }
          },
          restoreController.signal,
        )
          .then(
            () => {
              if (current()) {
                runtime.initialized = true;
                store.set($error, undefined);
              }
            },
            (error) => {
              if (current()) store.set($error, error);
            },
          )
          .finally(() => {
            if (!current()) return;
            runtime.restoring = false;
            store.set($restoring, false);
            if (runtime.revision > runtime.saved) schedule();
          });
      } else if (runtime.revision > runtime.saved) schedule();
      return () => {
        stop();
        clearTimer();
        // Pending values were captured by the subscription, never re-read after release.
        runtime.active = false;
        runtime.generation++;
        runtime.restoring = false;
        restoreController.abort();
        store.set($restoring, false);
        runtime.flush = undefined;
        void run().catch(() => {});
      };
    },
  };
}

async function bounded<Value>(
  timeout: number,
  operation: (signal: AbortSignal) => Promise<Value>,
  parent?: AbortSignal,
): Promise<Value> {
  const controller = new AbortController();
  let rejectAbort: (reason: unknown) => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const abort = () => {
    controller.abort(parent?.reason);
    rejectAbort(controller.signal.reason);
  };
  parent?.addEventListener('abort', abort, { once: true });
  if (parent?.aborted) abort();
  const timer = setTimeout(() => {
    controller.abort(new Error('persist: operation timed out.'));
    rejectAbort(controller.signal.reason);
  }, timeout);
  try {
    return await Promise.race([operation(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
  }
}

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
