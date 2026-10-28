import { expect, test, vi } from 'vitest';
import { createAmplitudeAdapter } from '../src/analytics-amplitude.js';

test('Amplitude handoff preserves payloads and does not await the SDK upload receipt', async () => {
  let resolve!: (value: { code: number; message: string }) => void;
  const track = vi.fn(() => ({
    promise: new Promise<{ code: number; message: string }>((yes) => {
      resolve = yes;
    }),
  }));
  const flush = vi.fn(() => ({ promise: Promise.resolve() }));
  const adapter = createAmplitudeAdapter({ track, flush });
  expect(track).not.toHaveBeenCalled();
  const report = vi.fn();
  expect(
    adapter.send(
      { name: 'Search completed', properties: { count: 3 } },
      {
        signal: new AbortController().signal,
        report,
      },
    ),
  ).toBeUndefined();
  expect(track).toHaveBeenCalledWith({
    event_type: 'Search completed',
    event_properties: { count: 3 },
  });
  resolve({ code: 400, message: 'Rejected' });
  await Promise.resolve();
  expect(report.mock.calls[0]![0].message).toBe('400: Rejected');
  await adapter.flush!();
  expect(flush).toHaveBeenCalledTimes(1);
});

test('Amplitude receipt rejection is reported and aborted delivery is skipped', async () => {
  const track = vi.fn(() => ({ promise: Promise.reject(new Error('network')) }));
  const adapter = createAmplitudeAdapter({ track, flush: () => ({ promise: Promise.resolve() }) });
  const report = vi.fn();
  const controller = new AbortController();
  adapter.send({ name: 'Opened', properties: {} }, { signal: controller.signal, report });
  await Promise.resolve();
  expect(report).toHaveBeenCalledTimes(1);
  controller.abort();
  adapter.send({ name: 'Opened', properties: {} }, { signal: controller.signal, report });
  expect(track).toHaveBeenCalledTimes(1);
});
