import { createStore } from 'jotai';
import { expect, test, vi } from 'vitest';
import { $deliveries, $$recordedSearch } from '../examples/docs/analytics-recording.js';

test('the visible adapter journal is store-isolated and stops recording after release', async () => {
  const output = vi.spyOn(console, 'info').mockImplementation(() => {});
  const first = createStore();
  const second = createStore();
  const ownerA = $$recordedSearch.acquire(first);
  const ownerB = $$recordedSearch.acquire(second);
  try {
    await import('../examples/analytics/search.analytics.js');
    await new Promise((resolve) => setTimeout(resolve, 0));
    first.set(ownerA.model.search);
    await vi.waitFor(() => expect(first.get($deliveries)).toHaveLength(2));
    expect(second.get($deliveries)).toEqual([]);
    expect(first.get($deliveries).map(({ engine }) => engine)).toEqual(['amplitude', 'warehouse']);
    ownerA.release();
    first.set(ownerA.model.search);
    second.set(ownerB.model.search);
    await vi.waitFor(() => expect(second.get($deliveries)).toHaveLength(2));
    expect(first.get($deliveries)).toHaveLength(2);
    first.set($deliveries, []);
    expect(second.get($deliveries)).toHaveLength(2);
  } finally {
    ownerA.release();
    ownerB.release();
    output.mockRestore();
  }
});
