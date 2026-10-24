import { atom, createStore, Provider, useAtomValue } from 'jotai';
import { act } from 'react';
import { expect, test, vi } from 'vitest';
import { createHarness, deferred, suspense } from './browser-harness.js';

test('control: native async to sync hook transition', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const task = deferred<undefined>();
    const source = atom<undefined | Promise<undefined>>(task.promise);
    const store = createStore();
    function Native() {
      return <span>{String(useAtomValue(source))}</span>;
    }
    const h = createHarness();
    await h.render(<Provider store={store}>{suspense(<Native />)}</Provider>);
    await act(async () => {
      task.resolve(undefined);
    });
    await act(async () => {
      store.set(source, undefined);
    });
    expect(h.container.textContent).toBe('undefined');
    expect(consoleError.mock.calls).toHaveLength(1);
    expect(String(consoleError.mock.calls[0]?.[0])).toContain(
      'did not call use() when it finished',
    );
  } finally {
    consoleError.mockRestore();
  }
});
