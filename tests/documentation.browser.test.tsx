import { it, expect, vi } from 'vitest';
import { act } from 'react';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { QueryClient } from '@tanstack/query-core';
import { createHarness, deferred } from './browser-harness.js';
import { SaveNotice } from '../examples/profile/edit-notifications.js';
import { ProfileEditor } from '../examples/profile/edit-view.js';
import { $$profile } from '../examples/profile/edit-save.js';
import { profileApi } from '../examples/profile/edit-api.js';
import type { Profile } from '../examples/profile/edit-model.js';
import { queryClientAtom } from '../src/query.js';

it('renders the documented editor using native mutation pending, success and failure', async () => {
  const saved = deferred<Profile>();
  const transport = vi.spyOn(profileApi, 'save').mockImplementation(() => saved.promise);
  const store = createStore();
  const client = new QueryClient();
  store.set(queryClientAtom, client);
  const harness = createHarness();
  try {
    store.set($$profile.$draft, { name: 'Ada', email: 'ada@example.com' });
    await harness.render(
      <Provider store={store}>
        <ProfileEditor />
        <SaveNotice />
      </Provider>,
    );
    const form = harness.container.querySelector('form')!;
    const button = harness.container.querySelector('button')!;
    const name = harness.container.querySelector('input')!;
    expect(name.value).toBe('Ada');
    await act(async () => {
      store.set($$profile.$draft, { name: '   ', email: 'ada@example.com' });
    });
    expect(name.validity.patternMismatch).toBe(true);
    form.requestSubmit();
    expect(transport).not.toHaveBeenCalled();
    await act(async () => {
      store.set($$profile.$draft, { name: 'Ada', email: 'ada@example.com' });
    });
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Saving…');
    await act(async () => {
      saved.resolve({ id: 'u1', name: 'Ada', email: 'ada@example.com' });
      await saved.promise;
    });
    expect(button.disabled).toBe(false);
    expect(harness.container.querySelector('[role=alert]')).toBeNull();
    expect(harness.container.querySelector('output')!.textContent).toBe('Saved Ada');
    transport.mockRejectedValue(new Error('Offline'));
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(harness.container.querySelector('[role=alert]')!.textContent).toBe('Offline');
    expect(button.disabled).toBe(false);
  } finally {
    transport.mockRestore();
    client.clear();
  }
});
