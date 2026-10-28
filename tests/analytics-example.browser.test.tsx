import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { expect, test, vi } from 'vitest';
import { AnalyticsSearch, $$search } from '../examples/analytics/search.js';
import { createHarness } from './browser-harness.js';

test('the documented product search sends a completed fact to two engines and an opened fact only to the third', async () => {
  const recorded = vi.spyOn(console, 'info').mockImplementation(() => {});
  try {
    const store = createStore();
    const h = createHarness();
    await h.render(
      <Provider store={store}>
        <AnalyticsSearch initialTerm="desk" />
      </Provider>,
    );
    // The module is optional: explicitly wait for it before the first essential fact.
    const { $$analytics } = await import('../examples/analytics/application-analytics.js');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      store.set(store.get($$search()).search);
      await $$analytics.flush(store);
    });
    expect(h.container.textContent).toContain('Oak desk');
    expect(h.container.textContent).toContain('Desk lamp');
    expect(recorded.mock.calls.map(([engine]) => engine)).toEqual(['amplitude', 'warehouse']);
    expect(recorded.mock.calls[0]![1]).toMatchObject({
      name: 'Search completed',
      properties: { query: 'desk', category: 'furniture', results: 2 },
    });
    expect(recorded.mock.calls[1]![1]).toMatchObject({
      name: 'search_performance',
      properties: { items_found: 2, outcome: 'found' },
    });
    await act(async () => {
      h.container.querySelector<HTMLButtonElement>('li button')!.click();
      await $$analytics.flush(store);
    });
    expect(store.get(store.get($$search()).$selectedProduct)?.id).toBe('oak-desk');
    expect(h.container.querySelector('article')).not.toBeNull();
    expect(recorded.mock.calls[2]).toEqual([
      'posthog',
      {
        name: 'product_opened',
        properties: { product_id: 'oak-desk', list_position: 1 },
      },
    ]);
    await h.unmount();
    store.set(store.get($$search()).search);
    await $$analytics.flush(store);
    expect(recorded).toHaveBeenCalledTimes(3);
    await $$analytics.dispose(store);
  } finally {
    recorded.mockRestore();
  }
});
