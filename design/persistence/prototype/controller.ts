import type { Atom, WritableAtom } from 'jotai/vanilla';
import type { Store } from '../../../src/model-protocol.js';
import type { PersistenceCodec, PersistenceStorage } from '../../../src/persist.js';
import { deferred, startOperation } from './operation.js';
import { SnapshotWriter, type WriterStatus } from './writer.js';

export type PersistenceStatus = Readonly<{
  restoring: boolean;
  saving: boolean;
  dirty: boolean;
  error: unknown;
}>;
export interface ControllerOptions<Value, Stored> {
  read: Atom<Value>;
  restore: WritableAtom<unknown, [Value], unknown>;
  storage: PersistenceStorage<Stored>;
  codec: PersistenceCodec<Value, Stored>;
  key: string;
  debounce: number;
  timeout: number;
}
type Connection = { flush(target: number): Promise<void>; close(): void };
type Restoration =
  | { kind: 'unread' }
  | { kind: 'reading' }
  | { kind: 'complete' }
  | { kind: 'failed'; error: unknown };

export class PersistenceController<Value, Stored> {
  #revision = 0;
  #restoration: Restoration = { kind: 'unread' };
  #connection: Connection | undefined;
  #writer: SnapshotWriter<Value, Stored>;
  #writeStatus: WriterStatus = {
    confirmedRevision: 0,
    saving: false,
    dirty: false,
    error: undefined,
  };

  constructor(
    private readonly store: Store,
    private readonly options: ControllerOptions<Value, Stored>,
    private readonly changed: (status: PersistenceStatus) => void,
  ) {
    this.#writer = new SnapshotWriter({
      key: options.key,
      codec: options.codec,
      storage: options.storage,
      timeout: options.timeout,
      changed: (status) => {
        this.#writeStatus = status;
        if (status.confirmedRevision > 0) this.#restoration = { kind: 'complete' };
        this.#publish();
      },
    });
  }

  connect(): () => void {
    if (this.#connection) throw new Error('Persistence already has a connection.');
    const lifetime = new AbortController();
    const restoration = deferred<void>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let applyingRestore = false;
    let unsubscribe = () => {};
    const cancelDebounce = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const connection: Connection = {
      flush: async (target) => {
        cancelDebounce();
        await restoration.promise;
        await this.#writer.flushThrough(target);
      },
      close: () => {
        if (this.#connection !== connection) return;
        unsubscribe();
        cancelDebounce();
        this.#connection = undefined;
        lifetime.abort();
        restoration.resolve();
        if (this.#restoration.kind === 'reading') this.#restoration = { kind: 'unread' };
        this.#publish();
        void this.#writer.flushThrough(this.#revision).catch(() => {});
      },
    };
    this.#connection = connection;

    try {
      unsubscribe = this.store.sub(this.options.read, () => {
        if (applyingRestore) return;
        this.#writer.accept({
          revision: ++this.#revision,
          value: this.store.get(this.options.read),
        });
        cancelDebounce();
        timer = setTimeout(() => {
          void this.flush().catch(() => {});
        }, this.options.debounce);
      });
    } catch (error) {
      connection.close();
      throw error;
    }

    const apply = (value: Value) => {
      applyingRestore = true;
      try {
        this.#applySynchronously(value);
      } finally {
        applyingRestore = false;
      }
    };
    void this.#restoreIfEligible(lifetime.signal, apply).finally(() => restoration.resolve());
    if (this.#writeStatus.dirty) void this.flush().catch(() => {});
    return connection.close;
  }

  flush(): Promise<void> {
    const target = this.#revision;
    return this.#connection?.flush(target) ?? this.#writer.flushThrough(target);
  }

  async #restoreIfEligible(signal: AbortSignal, apply: (value: Value) => void) {
    if (this.#restoration.kind === 'complete' || this.#revision > 0) return;
    this.#restoration = { kind: 'reading' };
    this.#publish();
    const operation = startOperation(
      async (attemptSignal) => {
        const stored = await this.options.storage.read(this.options.key, attemptSignal);
        if (stored === undefined) return;
        attemptSignal.throwIfAborted();
        const value = await this.options.codec.decode(stored);
        attemptSignal.throwIfAborted();
        if (!signal.aborted && this.#revision === 0) apply(value);
      },
      this.options.timeout,
      signal,
    );
    try {
      await operation.outcome;
      if (!signal.aborted) {
        this.#restoration = { kind: 'complete' };
      }
    } catch (error) {
      if (!signal.aborted) this.#restoration = { kind: 'failed', error };
    } finally {
      if (!signal.aborted) this.#publish();
    }
  }

  #applySynchronously(value: Value) {
    const result = this.store.set(this.options.restore, value);
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      void Promise.resolve(result).catch(() => {});
      throw new TypeError('Persistence restore must apply synchronously.');
    }
  }

  #publish() {
    this.changed({
      restoring: this.#restoration.kind === 'reading',
      saving: this.#writeStatus.saving,
      dirty: this.#writeStatus.dirty,
      error:
        this.#writeStatus.error ??
        (this.#restoration.kind === 'failed' ? this.#restoration.error : undefined),
    });
  }
}
