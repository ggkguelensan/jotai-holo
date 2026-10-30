import { createStore, Provider } from 'jotai';
import { act, useLayoutEffect, type ComponentProps } from 'react';
import { expect, test, vi } from 'vitest';
import { holo } from '../src/holo.js';
import Spreadsheet, { CellView } from '../examples/docs/spreadsheet.js';
import { createSpreadsheet } from '../examples/spreadsheet/model.js';
import giftBudget from '../examples/spreadsheet/gift-budget.json';
import { createHarness } from './browser-harness.js';

// Real Lingui macro compilation is exercised by the production docs tests.
vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({
    t: (parts: TemplateStringsArray) => parts.join(''),
    i18n: { locale: 'en' },
  }),
}));

test('listed rows keep cell order and selection follows keyboard focus', async () => {
  const h = createHarness();
  await h.render(
    <Provider store={createStore()}>
      <Spreadsheet />
    </Provider>,
  );
  const cells = [...h.container.querySelectorAll<HTMLInputElement>('[data-address]')];
  expect(cells).toHaveLength(32);
  expect(cells.slice(0, 4).map((cell) => cell.dataset.address)).toEqual(['A1', 'B1', 'C1', 'D1']);
  const b1 = cells.find((cell) => cell.dataset.address === 'B1')!;
  await act(async () => b1.focus());
  expect(h.container.querySelector('.sheet-address')?.textContent).toBe('B1');
  await act(async () => {
    b1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  expect(document.activeElement?.getAttribute('data-address')).toBe('B2');
  expect(h.container.querySelector('.sheet-address')?.textContent).toBe('B2');
  await h.unmount();
});

test('Views share cells by sheet key and keep other sheets independent', async () => {
  const h = createHarness();
  await h.render(
    <Provider store={createStore()}>
      <Spreadsheet sheetId="first" />
      <Spreadsheet sheetId="first" />
      <Spreadsheet sheetId="second" />
    </Provider>,
  );
  const inputs = [...h.container.querySelectorAll<HTMLInputElement>('[data-address="B1"]')];
  await act(async () => inputs[0]!.focus());
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setValue.call(inputs[0], '20');
    inputs[0]!.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(inputs.map((input) => input.value)).toEqual(['20', '20', '12']);
  expect(
    [...h.container.querySelectorAll('.sheet-address')].map((node) => node.textContent),
  ).toEqual(['B1', 'B1', 'D5']);
  await h.unmount();
});

test('only edited/dependent holo cells commit; the sheet shell stays untouched', async () => {
  const sheet = createSpreadsheet();
  const store = createStore();
  store.set(store.get(sheet.selectSheet({ sheetId: 'tracked' })).load, giftBudget);
  const commits: Record<string, number> = {};
  const bindings = sheet.addresses.map((address) => {
    return holo({
      models: { cell: () => sheet.selectCell({ sheetId: 'tracked', address }) },
      view: function TrackedCell(props: ComponentProps<typeof CellView>) {
        useLayoutEffect(() => {
          commits[address] = (commits[address] ?? 0) + 1;
        });
        return <CellView {...props} />;
      },
      static: { address, onSelect: () => {} },
      read: ({ cell }) => ({ input: cell.$input, value: cell.$value }),
      write: ({ cell }) => ({ onChange: cell.$input }),
    });
  });
  let shellCommits = 0;
  function Sheet() {
    useLayoutEffect(() => {
      shellCommits++;
    });
    return (
      <>
        {bindings.map((Cell, index) => (
          <Cell key={index} />
        ))}
      </>
    );
  }
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Sheet />
    </Provider>,
  );
  const cell = (address: string) => store.get(sheet.selectCell({ sheetId: 'tracked', address }));
  const before = { ...commits };
  await act(async () => {
    store.set(cell('B1').$input, '20');
  });
  const changed = Object.keys(commits).filter((id) => commits[id] !== before[id]);
  expect(changed.sort()).toEqual(['B1', 'C4', 'D1', 'D4', 'D5']);
  expect(shellCommits).toBe(1);
  await act(async () => {
    store.set(cell('D1').$input, '=B2*C2');
  });
  const after = { ...commits };
  await act(async () => {
    store.set(cell('B1').$input, '30');
  });
  expect(commits.D1).toBe(after.D1);
  expect(commits.D5).toBe(after.D5);
  expect(commits.B1).toBe(after.B1! + 1);
  await h.unmount();
});
