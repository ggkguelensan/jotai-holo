import { createStore, Provider } from 'jotai';
import { act, useState } from 'react';
import { expect, test, vi } from 'vitest';
import Cart from '../examples/docs/ion.js';
import Checkout from '../examples/docs/imperative.js';
import Campaign, { setup } from '../examples/docs/mutation.js';
import { Counter } from '../examples/input-contract.js';
import { CopiesView } from '../examples/recipes/gift-order-views.js';
import { createHarness } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join('') }),
}));

function Copies() {
  const [copies, setCopies] = useState(5);
  return <CopiesView copies={copies} onCopies={setCopies} />;
}

for (const [name, example] of [
  ['cart', <Cart />],
  ['checkout', <Checkout />],
  ['campaign', <Campaign />],
  ['input binding', <Counter counterId="numeric-edit" initial={5} />],
  ['gift order', <Copies />],
] as const) {
  test(`${name}: erase, replace and leave an empty number field`, async () => {
    const h = createHarness();
    const store = createStore();
    setup(store);
    await h.render(<Provider store={store}>{example}</Provider>);
    const input = h.container.querySelector<HTMLInputElement>('input[type="number"]')!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    const edit = async (value: string) => {
      await act(async () => {
        setValue.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };

    await act(async () => input.focus());
    await edit('');
    expect(input.value).toBe('');
    await edit('4');
    expect(input.value).toBe('4');
    // Leaving a complete edit must keep the newly published numeric value.
    await act(async () => input.blur());
    expect(input.value).toBe('4');
    await act(async () => input.focus());
    await edit('');
    expect(input.value).toBe('');
    await act(async () => input.blur());
    expect(input.value).toBe('4');
    if (name === 'cart') expect(h.container.querySelector('output')?.textContent).toBe('$100.00');
  });
}
