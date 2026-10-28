import { createStore, Provider } from 'jotai';
import { act, StrictMode } from 'react';
import { expect, test, vi } from 'vitest';
import IncomingMessages, { Messages } from '../examples/docs/event.js';
import Checkout, { $$checkout } from '../examples/docs/bond.js';
import { createHarness } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join('') }),
}));

test('holo owns one event listener across StrictMode, shared Views and reactive toggles', async () => {
  const store = createStore();
  const model = store.get(Messages());
  const emit = () => store.set(model.messageReceived, { text: 'same' });
  emit();
  expect(store.get(model.$deliveries)).toBe(0);
  const h = createHarness();
  const render = (second: boolean) =>
    h.render(
      <StrictMode>
        <Provider store={store}>
          <IncomingMessages key="first" />
          {second && <IncomingMessages key="second" />}
        </Provider>
      </StrictMode>,
    );
  await render(true);
  await act(async () => {
    emit();
    emit();
  });
  expect(store.get(model.$deliveries)).toBe(2);
  await act(async () => {
    store.set(model.toggleListening);
    emit();
  });
  expect(store.get(model.$deliveries)).toBe(2);
  await act(async () => {
    store.set(model.toggleListening);
    emit();
  });
  expect(store.get(model.$deliveries)).toBe(3);
  await render(false);
  await act(async () => {
    emit();
  });
  expect(store.get(model.$deliveries)).toBe(4);
  await h.unmount();
  emit();
  store.set(model.toggleListening);
  store.set(model.toggleListening);
  emit();
  expect(store.get(model.$deliveries)).toBe(4);
  const other = createStore();
  expect(other.get(other.get(Messages()).$deliveries)).toBe(0);
});

test('the checkout bond connects once per model and stops after its last View leaves', async () => {
  const store = createStore();
  const model = store.get($$checkout());
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Checkout />
      <Checkout />
    </Provider>,
  );
  await act(async () => {
    store.set(model.submit);
  });
  expect(store.get(model.$receipt)).toBe(100);
  await h.unmount();
  store.set(model.submit);
  expect(store.get(model.$receipt)).toBe(100);
});
