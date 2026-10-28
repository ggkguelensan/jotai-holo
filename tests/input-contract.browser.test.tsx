import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { expect, test } from 'vitest';
import { Counter, $$counter } from '../examples/input-contract.js';
import { createHarness } from './browser-harness.js';

test('the documented input binding updates only changed committed input', async () => {
  const store = createStore();
  const h = createHarness();
  const render = (initial: number) =>
    h.render(
      <Provider store={store}>
        <Counter counterId="users" initial={initial} />
      </Provider>,
    );
  await render(5);
  const model = store.get($$counter({ key: ['counter', 'users'] }));
  expect(store.get(model.$count)).toBe(5);
  await act(async () => {
    store.set(model.increment);
  });
  expect(store.get(model.$count)).toBe(6);
  await render(5);
  expect(store.get(model.$count)).toBe(6);
  await render(8);
  expect(store.get(model.$count)).toBe(8);
  await h.unmount();
});

function typeChecks() {
  const valid = <Counter counterId="users" initial={5} />;
  // @ts-expect-error input binds initial to an atom but does not supply its public value.
  const missingInput = <Counter counterId="users" />;
  // @ts-expect-error Selector inputs remain public props.
  const missingKey = <Counter initial={5} />;
  // @ts-expect-error read props are supplied by holo.
  const overriddenRead = <Counter counterId="users" initial={5} count={7} />;
  // @ts-expect-error Fixed props are supplied by holo.
  const overriddenFixed = <Counter counterId="users" initial={5} title="Other" />;
  void [valid, missingInput, missingKey, overriddenRead, overriddenFixed];
}
void typeChecks;
