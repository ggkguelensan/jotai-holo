import { createStore, Provider } from 'jotai';
import { act, Profiler } from 'react';
import { expect, test, vi } from 'vitest';
import {
  AnalyticsSearch,
  SearchForm,
  GameList,
  GameDetails,
  $$search,
} from '../examples/analytics/search.js';
import { createHarness } from './browser-harness.js';

test('the documented game search sends a completed fact to two engines and an opened fact only to the third', async () => {
  const recorded = vi.spyOn(console, 'info').mockImplementation(() => {});
  try {
    const store = createStore();
    const h = createHarness();
    await h.render(
      <Provider store={store}>
        <AnalyticsSearch initialTerm="starfall" />
      </Provider>,
    );
    // The module is optional: explicitly wait for it before the first essential fact.
    const { $$analytics } = await import('../examples/analytics/application-analytics.js');
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    await act(async () => {
      store.set(store.get($$search()).search);
      // The queued fact keeps the category at occurrence time.
      store.set(store.get($$search()).$category, 'strategy');
      await $$analytics.flush(store);
    });
    expect(h.container.textContent).toContain('Starfall');
    expect(h.container.textContent).not.toContain('Moon Harbor');
    expect(recorded.mock.calls.map(([engine]) => engine)).toEqual(['amplitude', 'warehouse']);
    expect(recorded.mock.calls[0]![1]).toMatchObject({
      name: 'Search completed',
      properties: { query: 'starfall', category: 'games', results: 1 },
    });
    expect(recorded.mock.calls[1]![1]).toMatchObject({
      name: 'search_performance',
      properties: { items_found: 1, outcome: 'found' },
    });
    await act(async () => {
      h.container.querySelector<HTMLButtonElement>('li button')!.click();
      await $$analytics.flush(store);
    });
    expect(store.get(store.get($$search()).$selectedGame)?.id).toBe('starfall');
    expect(h.container.querySelector('article')).not.toBeNull();
    expect(recorded.mock.calls[2]).toEqual([
      'posthog',
      {
        name: 'game_opened',
        properties: { game_id: 'starfall', list_position: 1 },
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

test('small holo Views isolate commits and share analytics until the final owner leaves', async () => {
  const output = vi.spyOn(console, 'info').mockImplementation(() => {});
  const store = createStore();
  const h = createHarness();
  const commits: string[] = [];
  const record = (id: string) => {
    commits.push(id);
  };
  const tree = (showForm: boolean) => (
    <Provider store={store}>
      {showForm && (
        <Profiler id="form" onRender={record}>
          <SearchForm initialTerm="starfall" />
        </Profiler>
      )}
      <Profiler id="list" onRender={record}>
        <GameList />
      </Profiler>
      <Profiler id="details" onRender={record}>
        <GameDetails />
      </Profiler>
    </Provider>
  );
  try {
    await h.render(tree(true));
    const { $$analytics } = await import('../examples/analytics/application-analytics.js');
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    const $$model = store.get($$search());

    commits.length = 0;
    await act(async () => {
      store.set($$model.termChanged, 'moon');
    });
    expect(commits).toContain('form');
    expect(commits).not.toContain('list');
    expect(commits).not.toContain('details');

    commits.length = 0;
    await act(async () => {
      store.set($$model.search);
      await $$analytics.flush(store);
    });
    expect(commits).toContain('list');
    expect(commits).not.toContain('form');
    expect(commits).not.toContain('details');
    expect(h.container.querySelector('li')?.textContent).toContain('Moon Harbor');

    commits.length = 0;
    await act(async () => {
      h.container.querySelector<HTMLButtonElement>('li button')!.click();
      await $$analytics.flush(store);
    });
    expect(commits).toContain('details');
    expect(commits).not.toContain('form');
    expect(commits).not.toContain('list');
    expect(output.mock.calls.map(([engine]) => engine)).toEqual([
      'amplitude',
      'warehouse',
      'posthog',
    ]);

    await h.render(tree(false));
    expect(store.get($$search())).toBe($$model);
    await act(async () => {
      store.set($$model.search);
      await $$analytics.flush(store);
    });
    expect(output).toHaveBeenCalledTimes(5);
    await h.unmount();
    store.set($$model.search);
    await $$analytics.flush(store);
    expect(output).toHaveBeenCalledTimes(5);
    await $$analytics.dispose(store);
  } finally {
    await h.unmount();
    output.mockRestore();
  }
});
