import { it, expect } from 'vitest';
import { act } from 'react';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { createHarness, deferred } from './browser-harness.js';
import { createProfile, createProfileEditor, type Profile } from '../examples/documentation.js';

it('renders the documented profile editor through pending, success and failure', async () => {
  const saved = deferred<Profile>();
  let fail = false;
  const model = createProfile({
    save: () => (fail ? Promise.reject(new Error('Offline')) : saved.promise),
  });
  const Editor = createProfileEditor(model);
  const store = createStore();
  const harness = createHarness();
  await act(async () => store.set(model.edit, { name: 'Ada', email: 'ada@example.com' }));
  await harness.render(
    <Provider store={store}>
      <Editor />
    </Provider>,
  );
  const form = harness.container.querySelector('form')!;
  const button = harness.container.querySelector('button')!;
  expect(harness.container.querySelector('input')!.value).toBe('Ada');
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
  fail = true;
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(harness.container.querySelector('[role=alert]')!.textContent).toBe('Offline');
  expect(button.disabled).toBe(false);
});
