// Design evidence only: these tests demonstrate defects in the current
// implementation. They are not the acceptance contract for its replacement.
import { atom, createStore } from 'jotai/vanilla';
import { test, expect, vi } from 'vitest';
import { persist } from '../../src/persist.js';
const tick = async () => {
  for (let i = 0; i < 25; i++) await Promise.resolve();
};
const codec = { encode: (value: number) => value, decode: (value: unknown) => Number(value) };
test('characterization: timeout releases a still-running physical write', async () => {
  vi.useFakeTimers();
  try {
    const $value = atom(0),
      store = createStore();
    let finishOld!: () => void;
    let stored = 0;
    const write = vi
      .fn()
      .mockImplementationOnce(async (_key: string, value: number) => {
        await new Promise<void>((r) => {
          finishOld = r;
        });
        stored = value;
      })
      .mockImplementation(async (_key: string, value: number) => {
        stored = value;
      });
    const disk = persist({
      read: $value,
      restore: $value,
      key: 'x',
      storage: { read: () => undefined, write },
      codec,
      timeout: 10,
    });
    const stop = disk.connect(store)!;
    await tick();
    store.set($value, 1);
    const timedOut = store.set(disk.flush).catch((error) => error);
    await tick();
    await vi.advanceTimersByTimeAsync(10);
    expect(await timedOut).toBeInstanceOf(Error);
    store.set($value, 2);
    await store.set(disk.flush);
    expect(stored).toBe(2);
    finishOld();
    await tick();
    expect(stored).toBe(1);
    expect(store.get(disk.$dirty)).toBe(false);
    console.log('Observed: stored=1, atom=2, dirty=false after late timed-out write');
    stop();
  } finally {
    vi.useRealTimers();
  }
});
test('characterization: flush after disconnect does not wait for final write', async () => {
  const $value = atom(0),
    store = createStore();
  let finish!: () => void,
    complete = false;
  const disk = persist({
    read: $value,
    restore: $value,
    key: 'x',
    codec,
    storage: {
      read: () => undefined,
      write: async () => {
        await new Promise<void>((r) => {
          finish = r;
        });
        complete = true;
      },
    },
  });
  const stop = disk.connect(store)!;
  await tick();
  store.set($value, 1);
  stop();
  await tick();
  await store.set(disk.flush);
  expect(complete).toBe(false);
  console.log('Observed: disconnected flush resolves while final write remains pending');
  finish();
  await tick();
});
