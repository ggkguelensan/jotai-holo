import { beforeEach, expect, test, vi } from 'vitest';
import { createAmplitudeAdapter } from './amplitude-adapter.js';
import type { AnalyticsAdapterContext } from './protocol.js';

const sdk = vi.hoisted(() => {
  const init = vi.fn();
  const track = vi.fn();
  const flush = vi.fn();
  return {
    init,
    track,
    flush,
    createInstance: vi.fn(() => ({ init, track, flush })),
  };
});
vi.mock('@amplitude/analytics-browser', () => ({
  createInstance: sdk.createInstance,
}));

const envelope = {
  id: 'event-1',
  occurredAt: 123,
  source: { kind: 'model' as const, id: 'cart-1' },
  message: {
    type: 'cart.itemAdded' as const,
    payload: { productId: 'mug', quantity: 1 },
  },
  context: { screen: '/cart' },
};
const context = (): AnalyticsAdapterContext => ({
  signal: new AbortController().signal,
  report: vi.fn(),
});
const create = () =>
  createAmplitudeAdapter({
    apiKey: 'test-only',
    instanceName: 'test-instance',
  });

beforeEach(() => {
  vi.clearAllMocks();
  sdk.init.mockReturnValue({ promise: Promise.resolve() });
  sdk.track.mockReturnValue({
    promise: Promise.resolve({ code: 200, message: 'OK' }),
  });
  sdk.flush.mockReturnValue({ promise: Promise.resolve() });
});

test('the adapter import calls no SDK factory; initialization uses an independent configured client', async () => {
  expect(sdk.createInstance).not.toHaveBeenCalled();
  await create();
  expect(sdk.createInstance).toHaveBeenCalledTimes(1);
  expect(sdk.init).toHaveBeenCalledWith('test-only', {
    instanceName: 'test-instance',
    autocapture: false,
    fetchRemoteConfig: false,
  });
});

test('the factory waits for the actual initialization promise', async () => {
  let ready!: () => void;
  sdk.init.mockReturnValue({
    promise: new Promise<void>((resolve) => {
      ready = resolve;
    }),
  });
  let returned = false;
  const pending = create().then((adapter) => {
    returned = true;
    return adapter;
  });
  await Promise.resolve();
  expect(returned).toBe(false);
  ready();
  await pending;
  expect(returned).toBe(true);
});

test('mapping preserves identity/time and identical messages are handed off twice without waiting for upload', async () => {
  sdk.track.mockReturnValue({ promise: new Promise(() => {}) });
  const adapter = await create();
  expect(adapter.write(envelope, context())).toBeUndefined();
  expect(adapter.write(envelope, context())).toBeUndefined();
  expect(sdk.track).toHaveBeenCalledTimes(2);
  expect(sdk.track).toHaveBeenCalledWith({
    event_type: 'cart.itemAdded',
    event_properties: { productId: 'mug', quantity: 1, screen: '/cart' },
    insert_id: 'event-1',
    time: 123,
  });
});

test('resolved failure receipts are reported separately from handoff', async () => {
  sdk.track.mockReturnValue({
    promise: Promise.resolve({ code: 400, message: 'Rejected' }),
  });
  const adapter = await create();
  const ctx = context();
  expect(adapter.write(envelope, ctx)).toBeUndefined();
  await Promise.resolve();
  expect(ctx.report).toHaveBeenCalledWith({
    phase: 'receipt',
    messageId: 'event-1',
    error: expect.any(Error),
  });
});

test('rejected receipts are handled rather than becoming unhandled rejections', async () => {
  const error = new Error('offline');
  sdk.track.mockReturnValue({ promise: Promise.reject(error) });
  const adapter = await create();
  const ctx = context();
  adapter.write(envelope, ctx);
  await Promise.resolve();
  expect(ctx.report).toHaveBeenCalledWith({
    phase: 'receipt',
    messageId: 'event-1',
    error,
  });
});

test('flush waits for its wrapper promise and exposes no fake disposal', async () => {
  let finish!: () => void;
  sdk.flush.mockReturnValue({
    promise: new Promise<void>((resolve) => {
      finish = resolve;
    }),
  });
  const adapter = await create();
  let completed = false;
  const flushing = Promise.resolve(adapter.flush?.(context())).then(() => {
    completed = true;
  });
  await Promise.resolve();
  expect(completed).toBe(false);
  finish();
  await flushing;
  expect(completed).toBe(true);
  expect(adapter.dispose).toBeUndefined();
});

test('an aborted operation performs no SDK write', async () => {
  const adapter = await create();
  const controller = new AbortController();
  controller.abort();
  adapter.write(envelope, { ...context(), signal: controller.signal });
  expect(sdk.track).not.toHaveBeenCalled();
});

test('initialization failure is visible to the provider loader', async () => {
  sdk.init.mockReturnValue({
    promise: Promise.reject(new Error('init failed')),
  });
  await expect(create()).rejects.toThrow('init failed');
});
