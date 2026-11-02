import { atom, createStore } from 'jotai/vanilla';
import { afterEach, expect, test, vi } from 'vitest';
import { SnapshotWriter, type WriterStatus } from '../src/persistence/writer.js';
import { PersistenceController, type PersistenceStatus } from '../src/persistence/controller.js';
import { deferred } from '../src/persistence/operation.js';

const tick = async () => {
  for (let i = 0; i < 40; i++) await Promise.resolve();
};
const codec = { encode: (value: number) => value, decode: (value: unknown) => Number(value) };
afterEach(() => vi.useRealTimers());
function writerFixture(
  write: (key: string, value: number, signal: AbortSignal) => void | Promise<void>,
  encode = codec.encode,
) {
  let status: WriterStatus;
  const writer = new SnapshotWriter({
    key: 'draft',
    codec: { ...codec, encode },
    storage: { read: () => undefined, write },
    timeout: 20,
    changed: (next) => {
      status = next;
    },
  });
  return { writer, status: () => status };
}
function controllerFixture(storage: {
  read: () => unknown | Promise<unknown>;
  write: (key: string, value: number, signal: AbortSignal) => void | Promise<void>;
}) {
  const store = createStore(),
    $value = atom(0);
  let status: PersistenceStatus;
  const controller = new PersistenceController(
    store,
    { read: $value, restore: $value, key: 'draft', storage, codec, timeout: 20, debounce: 250 },
    (next) => {
      status = next;
    },
  );
  return { store, $value, controller, status: () => status };
}

test('writer confirms finite targets and coalesces snapshots without chasing later edits', async () => {
  const jobs: { value: number; done: ReturnType<typeof deferred<void>> }[] = [];
  const f = writerFixture(async (_key, value) => {
    const done = deferred<void>();
    jobs.push({ value, done });
    await done.promise;
  });
  f.writer.accept({ revision: 1, value: 1 });
  const first = f.writer.flushThrough(1);
  await tick();
  f.writer.accept({ revision: 2, value: 2 });
  const second = f.writer.flushThrough(2);
  f.writer.accept({ revision: 3, value: 3 });
  jobs[0]!.done.resolve();
  await first;
  await tick();
  expect(jobs.map((job) => job.value)).toEqual([1, 3]);
  expect(f.status().dirty).toBe(true);
  jobs[1]!.done.resolve();
  await second;
  expect(f.status().dirty).toBe(false);
});

test('accept alone never starts a write; a failed drain stops until another request', async () => {
  const write = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const f = writerFixture(write);
  f.writer.accept({ revision: 1, value: 7 });
  await tick();
  expect(write).not.toHaveBeenCalled();
  await expect(f.writer.flushThrough(1)).rejects.toThrow('offline');
  await tick();
  expect(write).toHaveBeenCalledTimes(1);
  expect(f.status().dirty).toBe(true);
  await f.writer.flushThrough(1);
  expect(write).toHaveBeenCalledTimes(2);
  expect(f.status()).toMatchObject({ dirty: false, saving: false, error: undefined });
});

test('a timed-out physical write blocks newer writes until actual settlement', async () => {
  vi.useFakeTimers();
  const old = deferred<void>();
  let stored = 0;
  const write = vi
    .fn()
    .mockImplementationOnce(async (_key, value) => {
      await old.promise;
      stored = value;
    })
    .mockImplementation(async (_key, value) => {
      stored = value;
    });
  const f = writerFixture(write);
  f.writer.accept({ revision: 1, value: 1 });
  const first = f.writer.flushThrough(1).catch((error) => error);
  await tick();
  await vi.advanceTimersByTimeAsync(20);
  expect(await first).toBeInstanceOf(Error);
  expect(f.status()).toMatchObject({ dirty: true, saving: true });
  f.writer.accept({ revision: 2, value: 2 });
  await expect(f.writer.flushThrough(2)).rejects.toThrow('timed out');
  expect(write).toHaveBeenCalledTimes(1);
  old.resolve();
  await tick();
  expect(stored).toBe(1);
  expect(f.status()).toMatchObject({ dirty: true, saving: false });
  expect(write).toHaveBeenCalledTimes(1);
  await f.writer.flushThrough(2);
  expect(stored).toBe(2);
  expect(f.status().dirty).toBe(false);
});

test('a late encoder cannot start a write or change a newer attempt', async () => {
  vi.useFakeTimers();
  const old = deferred<number>();
  const write = vi.fn();
  const encode = vi
    .fn()
    .mockImplementationOnce(() => old.promise)
    .mockImplementation((value) => value);
  const f = writerFixture(write, encode);
  f.writer.accept({ revision: 1, value: 1 });
  const first = f.writer.flushThrough(1).catch((error) => error);
  await tick();
  await vi.advanceTimersByTimeAsync(20);
  await first;
  f.writer.accept({ revision: 2, value: 2 });
  await f.writer.flushThrough(2);
  old.resolve(1);
  await tick();
  expect(write.mock.calls.map((call) => call[1])).toEqual([2]);
  expect(f.status()).toMatchObject({ dirty: false, saving: false });
});

test('restored state stays clean and is loaded only once across connections', async () => {
  const read = vi.fn().mockResolvedValue(5),
    write = vi.fn();
  const f = controllerFixture({ read, write });
  const close = f.controller.connect();
  await tick();
  expect(f.store.get(f.$value)).toBe(5);
  expect(f.status()).toMatchObject({ dirty: false, restoring: false });
  expect(write).not.toHaveBeenCalled();
  close();
  const closeAgain = f.controller.connect();
  await tick();
  expect(read).toHaveBeenCalledTimes(1);
  closeAgain();
});

test('edit during restoration wins, while flush keeps its captured snapshot', async () => {
  const load = deferred<unknown>(),
    write = vi.fn();
  const f = controllerFixture({ read: () => load.promise, write });
  const close = f.controller.connect();
  f.store.set(f.$value, 7);
  const saving = f.controller.flush();
  await tick();
  expect(write).not.toHaveBeenCalled();
  load.resolve(2);
  await saving;
  expect(f.store.get(f.$value)).toBe(7);
  expect(write.mock.calls.map((call) => call[1])).toEqual([7]);
  close();
});

test('detached flush waits for the captured final write and never rereads the source', async () => {
  const saved = deferred<void>(),
    write = vi.fn((_key: string, _value: number) => saved.promise);
  const f = controllerFixture({ read: () => undefined, write });
  const close = f.controller.connect();
  await tick();
  f.store.set(f.$value, 7);
  close();
  f.store.set(f.$value, 99);
  let complete = false;
  const waiting = f.controller.flush().then(() => {
    complete = true;
  });
  await tick();
  expect(complete).toBe(false);
  expect(write.mock.calls[0]![1]).toBe(7);
  saved.resolve();
  await waiting;
  expect(f.store.get(f.$value)).toBe(99);
});

test('disconnect cancels the restore barrier and still saves already captured edits', async () => {
  const load = deferred<unknown>(),
    write = vi.fn();
  const f = controllerFixture({ read: () => load.promise, write });
  const close = f.controller.connect();
  f.store.set(f.$value, 7);
  const waiting = f.controller.flush();
  close();
  await waiting;
  expect(write.mock.calls.map((call) => call[1])).toEqual([7]);
  load.resolve(1);
  await tick();
  expect(f.store.get(f.$value)).toBe(7);
});

test('late completion of a released restore cannot clear or replace a newer restore', async () => {
  const old = deferred<unknown>(),
    current = deferred<unknown>();
  const read = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const f = controllerFixture({ read, write: vi.fn() });
  const close = f.controller.connect();
  await tick();
  close();
  const closeNew = f.controller.connect();
  await tick();
  old.resolve(1);
  await tick();
  expect(f.store.get(f.$value)).toBe(0);
  expect(f.status().restoring).toBe(true);
  current.resolve(2);
  await tick();
  expect(f.store.get(f.$value)).toBe(2);
  closeNew();
});

test('failed reads can retry on reconnect; local edits prevent obsolete reads', async () => {
  const read = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(3);
  const f = controllerFixture({ read, write: vi.fn() });
  const close = f.controller.connect();
  await tick();
  expect(f.status().error).toBeInstanceOf(Error);
  close();
  const closeNew = f.controller.connect();
  await tick();
  expect(f.store.get(f.$value)).toBe(3);
  closeNew();
  const otherRead = vi.fn().mockRejectedValue(new Error('offline'));
  const other = controllerFixture({ read: otherRead, write: vi.fn() });
  const stop = other.controller.connect();
  await tick();
  other.store.set(other.$value, 7);
  await other.controller.flush();
  stop();
  const stopNew = other.controller.connect();
  await tick();
  expect(otherRead).toHaveBeenCalledTimes(1);
  expect(other.store.get(other.$value)).toBe(7);
  stopNew();
});

test('debounce belongs to the connection and only requests the latest snapshot', async () => {
  vi.useFakeTimers();
  const write = vi.fn();
  const f = controllerFixture({ read: () => undefined, write });
  const close = f.controller.connect();
  await tick();
  f.store.set(f.$value, 1);
  await vi.advanceTimersByTimeAsync(200);
  f.store.set(f.$value, 2);
  await vi.advanceTimersByTimeAsync(249);
  expect(write).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(write.mock.calls.map((call) => call[1])).toEqual([2]);
  close();
});

test('a settled failure rejects all waiting cuts and retains the latest snapshot for explicit retry', async () => {
  const failed = deferred<void>();
  const write = vi
    .fn()
    .mockImplementationOnce(() => failed.promise)
    .mockResolvedValue(undefined);
  const f = writerFixture(write);
  f.writer.accept({ revision: 1, value: 1 });
  const first = f.writer.flushThrough(1).catch((error) => error);
  await tick();
  f.writer.accept({ revision: 2, value: 2 });
  const second = f.writer.flushThrough(2).catch((error) => error);
  failed.reject(new Error('offline'));
  expect(await first).toBeInstanceOf(Error);
  expect(await second).toBeInstanceOf(Error);
  await tick();
  expect(write).toHaveBeenCalledTimes(1);
  await f.writer.flushThrough(2);
  expect(write.mock.calls[1]![1]).toBe(2);
});

test('reconnection shares the retained write lane and old cleanup cannot close the new connection', async () => {
  const first = deferred<void>(),
    second = deferred<void>();
  const write = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const read = vi.fn().mockResolvedValue(undefined);
  const f = controllerFixture({ read, write });
  const close = f.controller.connect();
  await tick();
  f.store.set(f.$value, 1);
  const firstFlush = f.controller.flush();
  await tick();
  close();
  const closeAgain = f.controller.connect();
  close();
  f.store.set(f.$value, 2);
  const secondFlush = f.controller.flush();
  await tick();
  expect(write).toHaveBeenCalledTimes(1);
  first.resolve();
  await firstFlush;
  await tick();
  expect(write.mock.calls.map((call) => call[1])).toEqual([1, 2]);
  second.resolve();
  await secondFlush;
  expect(read).toHaveBeenCalledTimes(1);
  closeAgain();
});
