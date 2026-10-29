import { it, expect, vi } from 'vitest';
import { act, Profiler } from 'react';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { QueryClient } from '@tanstack/query-core';
import { createHarness, deferred } from './browser-harness.js';
import { SaveNotice } from '../examples/profile/edit-notifications.js';
import {
  ProfileEmail,
  ProfileName,
  ProfileSaveButton,
  ProfileSaveError,
  ProfileEditor,
} from '../examples/profile/edit-view.js';
import { $$profile, save } from '../examples/profile/edit-save.js';
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

it('isolates field commits from each other and from mutation state', async () => {
  const saved = deferred<Profile>();
  const transport = vi.spyOn(profileApi, 'save').mockImplementation(() => saved.promise);
  const store = createStore();
  const client = new QueryClient();
  store.set(queryClientAtom, client);
  store.set($$profile.$draft, { name: 'Ada', email: 'ada@example.com' });
  const commits = { name: vi.fn(), email: vi.fn(), button: vi.fn(), error: vi.fn() };
  const clear = () => Object.values(commits).forEach((spy) => spy.mockClear());
  const harness = createHarness();
  try {
    await harness.render(
      <Provider store={store}>
        <Profiler id="name" onRender={commits.name}>
          <ProfileName />
        </Profiler>
        <Profiler id="email" onRender={commits.email}>
          <ProfileEmail />
        </Profiler>
        <Profiler id="button" onRender={commits.button}>
          <ProfileSaveButton />
        </Profiler>
        <Profiler id="error" onRender={commits.error}>
          <ProfileSaveError />
        </Profiler>
      </Provider>,
    );
    clear();
    await act(async () => store.set($$profile.$name, 'Grace'));
    expect(commits.name).toHaveBeenCalledTimes(1);
    expect(commits.email).not.toHaveBeenCalled();
    expect(commits.button).not.toHaveBeenCalled();
    expect(commits.error).not.toHaveBeenCalled();
    clear();
    await act(async () => store.set($$profile.$email, 'grace@example.com'));
    expect(commits.email).toHaveBeenCalledTimes(1);
    expect(commits.name).not.toHaveBeenCalled();
    expect(commits.button).not.toHaveBeenCalled();
    expect(commits.error).not.toHaveBeenCalled();
    clear();
    let pending!: Promise<void>;
    await act(async () => {
      pending = store.set(save);
    });
    expect(commits.button).toHaveBeenCalledTimes(1);
    expect(commits.name).not.toHaveBeenCalled();
    expect(commits.email).not.toHaveBeenCalled();
    expect(commits.error).not.toHaveBeenCalled();
    clear();
    await act(async () => {
      saved.resolve({ id: 'u1', name: 'Grace', email: 'grace@example.com' });
      await pending;
    });
    expect(commits.button).toHaveBeenCalledTimes(1);
    expect(commits.name).not.toHaveBeenCalled();
    expect(commits.email).not.toHaveBeenCalled();
    expect(commits.error).not.toHaveBeenCalled();
  } finally {
    transport.mockRestore();
    client.clear();
  }
});
