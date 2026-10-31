import type { PersistenceCodec, PersistenceStorage } from '../../../src/persist.js';
import { deferred, startOperation, type Operation } from './operation.js';

export type Snapshot<Value> = Readonly<{ revision: number; value: Value }>;
export type WriterStatus = Readonly<{
  confirmedRevision: number;
  dirty: boolean;
  saving: boolean;
  error: unknown;
}>;
type FlushRequest = ReturnType<typeof deferred<void>> & { target: number };
type Phase<Value> =
  | { kind: 'idle' }
  | { kind: 'encoding'; snapshot: Snapshot<Value> }
  | { kind: 'writing'; snapshot: Snapshot<Value> }
  | { kind: 'blocked'; operation: Operation<void>; error: unknown };

export class SnapshotWriter<Value, Stored> {
  #latest: Snapshot<Value> | undefined;
  #confirmed = 0;
  #phase: Phase<Value> = { kind: 'idle' };
  #error: unknown;
  #requests = new Set<FlushRequest>();

  constructor(
    private readonly options: {
      key: string;
      codec: PersistenceCodec<Value, Stored>;
      storage: PersistenceStorage<Stored>;
      timeout: number;
      changed: (status: WriterStatus) => void;
    },
  ) {}

  accept(snapshot: Snapshot<Value>) {
    if (snapshot.revision <= (this.#latest?.revision ?? 0))
      throw new TypeError('Snapshot revisions must increase.');
    this.#latest = snapshot;
    this.#publish();
  }

  flushThrough(target: number): Promise<void> {
    if (!Number.isSafeInteger(target) || target < 0 || target > (this.#latest?.revision ?? 0))
      return Promise.reject(new TypeError('Unknown snapshot revision.'));
    if (target <= this.#confirmed) return Promise.resolve();
    if (this.#phase.kind === 'blocked') return Promise.reject(this.#phase.error);

    const request = { ...deferred<void>(), target };
    this.#requests.add(request);
    this.#startRequestedWrite();
    return request.promise;
  }

  #startRequestedWrite() {
    if (this.#phase.kind !== 'idle' || !this.#requests.size || !this.#latest) return;
    const snapshot = this.#latest;
    const operation = startOperation(
      (signal) => this.#encodeAndWrite(snapshot, signal),
      this.options.timeout,
    );
    this.#phase = { kind: 'encoding', snapshot };
    this.#publish();
    void this.#finishWrite(snapshot, operation);
  }

  async #encodeAndWrite(snapshot: Snapshot<Value>, signal: AbortSignal) {
    const encoded = await this.options.codec.encode(snapshot.value);
    signal.throwIfAborted();
    const phase = this.#phase;
    if (phase.kind !== 'encoding' || phase.snapshot !== snapshot)
      throw new Error('The encoding attempt is no longer current.');
    this.#phase = { kind: 'writing', snapshot };
    await this.options.storage.write(this.options.key, encoded, signal);
  }

  async #finishWrite(snapshot: Snapshot<Value>, operation: Operation<void>) {
    try {
      await operation.outcome;
      this.#confirmed = snapshot.revision;
      this.#error = undefined;
      this.#phase = { kind: 'idle' };
      this.#resolveConfirmedRequests();
      this.#publish();
      this.#startRequestedWrite();
    } catch (error) {
      const physicalWriteStillRunning = this.#phase.kind === 'writing' && operation.signal.aborted;
      this.#error = error;
      this.#phase = physicalWriteStillRunning
        ? { kind: 'blocked', operation, error }
        : { kind: 'idle' };
      this.#rejectRequests(error);
      this.#publish();
      if (physicalWriteStillRunning) void this.#releasePhysicalWrite(operation);
    }
  }

  async #releasePhysicalWrite(operation: Operation<void>) {
    await operation.settled;
    // Its deadline expired: late completion only unlocks the lane.
    this.#phase = { kind: 'idle' };
    this.#publish();
  }

  #resolveConfirmedRequests() {
    for (const request of this.#requests) {
      if (request.target > this.#confirmed) continue;
      this.#requests.delete(request);
      request.resolve();
    }
  }

  #rejectRequests(error: unknown) {
    for (const request of this.#requests) request.reject(error);
    this.#requests.clear();
  }

  #publish() {
    this.options.changed({
      confirmedRevision: this.#confirmed,
      dirty: (this.#latest?.revision ?? 0) > this.#confirmed,
      saving: this.#phase.kind !== 'idle',
      error: this.#error,
    });
  }
}
