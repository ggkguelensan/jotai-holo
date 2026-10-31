import { atom, createStore } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import { persist } from '../src/persist.js';
import { acquireResources } from '../src/resource.js';
const tick = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const codec = {
  decode(value: unknown) {
    if (typeof value !== 'number') throw new Error('invalid');
    return value;
  },
  encode: (value: number) => value,
};

test('restores once per retained resource without writing restored state back', async () => {
  const $value = atom(0);
  const read = vi.fn(() => 5);
  const write = vi.fn();
  const resource = persist({
    read: $value,
    restore: $value,
    storage: { read, write },
    key: 'draft',
    codec,
  });
  const store = createStore();
  const a = acquireResources(store, [resource]);
  await tick();
  expect(store.get($value)).toBe(5);
  expect(write).not.toHaveBeenCalled();
  a();
  const b = acquireResources(store, [resource]);
  await tick();
  expect(read).toHaveBeenCalledTimes(1);
  b();
});

test('local changes win a late restore; explicit flush serializes encoded writes', async () => {
  const load = deferred<number>();
  const save = deferred<void>();
  const $value = atom(0);
  const write = vi
    .fn()
    .mockImplementationOnce(() => save.promise)
    .mockResolvedValue(undefined);
  const resource = persist({
    read: $value,
    restore: $value,
    storage: { read: () => load.promise, write },
    key: 'draft',
    codec,
  });
  const store = createStore();
  const release = acquireResources(store, [resource]);
  store.set($value, 3);
  load.resolve(1);
  await tick();
  expect(store.get($value)).toBe(3);
  const first = store.set(resource.flush);
  await tick();
  expect(write.mock.calls[0]![1]).toBe(3);
  store.set($value, 4);
  const second = store.set(resource.flush);
  await tick();
  expect(write).toHaveBeenCalledTimes(1);
  save.resolve();
  await Promise.all([first, second]);
  expect(write.mock.calls[1]![1]).toBe(4);
  expect(store.get(resource.$dirty)).toBe(false);
  release();
});

test('store isolation and shared ownership produce one restoration per store', async () => {
  const $value = atom(0);
  const read = vi.fn(() => 1);
  const resource = persist({
    read: $value,
    restore: $value,
    storage: { read, write() {} },
    key: 'draft',
    codec,
  });
  const a = createStore();
  const b = createStore();
  const first = acquireResources(a, [resource]);
  const second = acquireResources(a, [resource]);
  const other = acquireResources(b, [resource]);
  await tick();
  expect(read).toHaveBeenCalledTimes(2);
  a.set($value, 3);
  expect(b.get($value)).toBe(1);
  first();
  second();
  other();
});

test('decode and write failures remain observable and explicit retry can save', async () => {
  const $value = atom(0);
  const failure = new Error('write');
  const write = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined);
  const resource = persist({
    read: $value,
    restore: $value,
    storage: { read: () => 'invalid', write },
    key: 'draft',
    codec,
  });
  const store = createStore();
  const release = acquireResources(store, [resource]);
  await tick();
  expect(store.get(resource.$error)).toBeInstanceOf(Error);
  expect(store.get($value)).toBe(0);
  store.set($value, 2);
  await expect(store.set(resource.flush)).rejects.toBe(failure);
  expect(store.get(resource.$dirty)).toBe(true);
  await store.set(resource.flush);
  expect(store.get(resource.$error)).toBeUndefined();
  expect(store.get(resource.$dirty)).toBe(false);
  release();
});

test('hung storage times out and late restore cannot revive a disconnected resource', async () => {
  vi.useFakeTimers();
  try {
    const load = deferred<number>();
    const $value = atom(0);
    const resource = persist({
      read: $value,
      restore: $value,
      storage: { read: () => load.promise, write() {} },
      key: 'draft',
      codec,
      timeout: 20,
    });
    const store = createStore();
    const release = acquireResources(store, [resource]);
    await vi.advanceTimersByTimeAsync(20);
    expect(store.get(resource.$restoring)).toBe(false);
    expect(store.get(resource.$error)).toBeInstanceOf(Error);
    release();
    load.resolve(9);
    await tick();
    expect(store.get($value)).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});

test('release flushes the last edit and removes the source subscription', async () => {
  const $value = atom(0);
  const write = vi.fn();
  const resource = persist({
    read: $value,
    restore: $value,
    storage: { read: () => undefined, write },
    key: 'draft',
    codec,
    save: { debounce: 1000 },
  });
  const store = createStore();
  const release = acquireResources(store, [resource]);
  await tick();
  store.set($value, 3);
  release();
  await tick();
  expect(write).toHaveBeenCalledTimes(1);
  store.set($value, 4);
  await tick();
  expect(write).toHaveBeenCalledTimes(1);
});

test('flush waits for restoration; release during restoration still saves captured local edits', async () => {
  const load = deferred<number>();
  const $value = atom(0);
  const write = vi.fn();
  const resource = persist({
    read: $value,
    restore: $value,
    storage: { read: () => load.promise, write },
    key: 'draft',
    codec,
  });
  const store = createStore();
  const release = acquireResources(store, [resource]);
  store.set($value, 7);
  const flushed = store.set(resource.flush);
  await tick();
  expect(write).not.toHaveBeenCalled();
  release();
  store.set($value, 99);
  load.resolve(1);
  await flushed;
  await tick();
  expect(write.mock.calls.map((args) => args[1])).toEqual([7]);
  expect(store.get($value)).toBe(99);
});

test('detached flush waits for the final captured revision without reading later edits', async () => {
  const $value = atom(0),
    store = createStore(),
    saving = deferred<void>();
  const write = vi.fn((_key: string, _value: number) => saving.promise);
  const disk = persist({
    read: $value,
    restore: $value,
    key: 'draft',
    codec,
    storage: { read: () => undefined, write },
  });
  const stop = acquireResources(store, [disk]);
  await tick();
  store.set($value, 7);
  stop();
  store.set($value, 99);
  let done = false;
  const flushed = store.set(disk.flush).then(() => {
    done = true;
  });
  await tick();
  expect(done).toBe(false);
  expect(write.mock.calls.map((call) => call[1])).toEqual([7]);
  saving.resolve();
  await flushed;
  expect(store.get(disk.$dirty)).toBe(false);
});

test('a public flush has a finite target while newer writes remain pending', async () => {
  const $value = atom(0),
    store = createStore(),
    first = deferred<void>(),
    second = deferred<void>();
  const write = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const disk = persist({
    read: $value,
    restore: $value,
    key: 'draft',
    codec,
    storage: { read: () => undefined, write },
  });
  const stop = acquireResources(store, [disk]);
  await tick();
  store.set($value, 1);
  const savedFirst = store.set(disk.flush);
  await tick();
  store.set($value, 2);
  const savedSecond = store.set(disk.flush);
  first.resolve();
  await savedFirst;
  expect(store.get(disk.$dirty)).toBe(true);
  second.resolve();
  await savedSecond;
  expect(store.get(disk.$dirty)).toBe(false);
  stop();
});

test('timed-out storage cannot overwrite a later public flush', async () => {
  vi.useFakeTimers();
  try {
    const $value = atom(0),
      store = createStore(),
      old = deferred<void>();
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
    const disk = persist({
      read: $value,
      restore: $value,
      key: 'draft',
      codec,
      timeout: 20,
      storage: { read: () => undefined, write },
    });
    const stop = acquireResources(store, [disk]);
    await tick();
    store.set($value, 1);
    const first = store.set(disk.flush).catch((error) => error);
    await tick();
    await vi.advanceTimersByTimeAsync(20);
    expect(await first).toBeInstanceOf(Error);
    expect(store.get(disk.$saving)).toBe(true);
    store.set($value, 2);
    await expect(store.set(disk.flush)).rejects.toThrow('timed out');
    expect(write).toHaveBeenCalledTimes(1);
    old.resolve();
    await tick();
    expect(stored).toBe(1);
    expect(store.get(disk.$dirty)).toBe(true);
    expect(store.get(disk.$saving)).toBe(false);
    await store.set(disk.flush);
    expect(stored).toBe(2);
    expect(store.get(disk.$dirty)).toBe(false);
    stop();
  } finally {
    vi.useRealTimers();
  }
});

test('a throwing status observer is reported without derailing persistence', async () => {
  const failure = new Error('observer'),
    report = vi.spyOn(console, 'error').mockImplementation(() => {});
  const $value = atom(0),
    store = createStore(),
    write = vi.fn();
  const disk = persist({
    read: $value,
    restore: $value,
    key: 'draft',
    codec,
    storage: { read: () => undefined, write },
  });
  const unsubscribe = store.sub(disk.$saving, () => {
    throw failure;
  });
  let stop: (() => void) | undefined;
  try {
    stop = acquireResources(store, [disk]);
    await tick();
    store.set($value, 3);
    await store.set(disk.flush);
    expect(write.mock.calls[0]![1]).toBe(3);
    expect(store.get(disk.$dirty)).toBe(false);
    expect(report).toHaveBeenCalled();
  } finally {
    unsubscribe();
    stop?.();
    report.mockRestore();
  }
});

test('declaration and unowned flush do no storage work; invalid timing is rejected', async () => {
  const $value = atom(0),
    store = createStore(),
    read = vi.fn(),
    write = vi.fn();
  const options = { read: $value, restore: $value, key: 'draft', codec, storage: { read, write } };
  const disk = persist(options);
  await store.set(disk.flush);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  for (const timeout of [0, -1, Infinity, NaN])
    expect(() => persist({ ...options, timeout })).toThrow(TypeError);
  for (const debounce of [-1, Infinity, NaN])
    expect(() => persist({ ...options, save: { debounce } })).toThrow(TypeError);
});

test('undefined rejections remain observable errors', async () => {
  const $value = atom(0),
    store = createStore();
  const disk = persist({
    read: $value,
    restore: $value,
    key: 'draft',
    codec,
    storage: { read: () => Promise.reject(undefined), write() {} },
  });
  const stop = acquireResources(store, [disk]);
  await vi.waitFor(() => expect(store.get(disk.$error)).toBeInstanceOf(Error));
  stop();
});

test('reentrant owner replacement cannot arm an old timer or shorten the new debounce', async () => {
  vi.useFakeTimers();
  try {
    const $value = atom(0),
      store = createStore(),
      write = vi.fn();
    const disk = persist({
      read: $value,
      restore: $value,
      key: 'draft',
      codec,
      storage: { read: () => undefined, write },
      save: { debounce: 250 },
    });
    let stop = acquireResources(store, [disk]);
    await tick();
    let replaced = false;
    const unsubscribe = store.sub(disk.$dirty, () => {
      if (replaced || !store.get(disk.$dirty)) return;
      replaced = true;
      stop();
      stop = acquireResources(store, [disk]);
    });
    try {
      store.set($value, 1);
      await tick();
      await vi.advanceTimersByTimeAsync(100);
      store.set($value, 2);
      await vi.advanceTimersByTimeAsync(150);
      expect(write.mock.calls.map((call) => call[1])).toEqual([1]);
      await vi.advanceTimersByTimeAsync(100);
      expect(write.mock.calls.map((call) => call[1])).toEqual([1, 2]);
    } finally {
      unsubscribe();
      stop();
    }
  } finally {
    vi.useRealTimers();
  }
});
