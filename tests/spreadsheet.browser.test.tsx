import { createStore, Provider } from 'jotai';
import { act, useLayoutEffect, type ComponentProps } from 'react';
import { expect, test, vi } from 'vitest';
import { holo } from '../src/holo.js';
import { CellView } from '../examples/docs/spreadsheet.js';
import { createSpreadsheet } from '../examples/spreadsheet/model.js';
import { createHarness } from './browser-harness.js';

// Real Lingui macro compilation is exercised by the production docs tests.
vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({
    t: (parts: TemplateStringsArray) => parts.join(''),
    i18n: { locale: 'en' },
  }),
}));

test('only edited/dependent holo cells commit; the sheet shell stays untouched', async () => {
  const sheet = createSpreadsheet();
  const store = createStore();
  const commits: Record<string, number> = {};
  const bindings = sheet.addresses.map((address) => {
    const cell = sheet.cells[address]!;
    return holo({
      view: function TrackedCell(props: ComponentProps<typeof CellView>) {
        useLayoutEffect(() => {
          commits[address] = (commits[address] ?? 0) + 1;
        });
        return <CellView {...props} />;
      },
      static: { address, onSelect: () => {} },
      read: { input: cell.$input, value: cell.$value },
      write: { onChange: cell.$input },
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
  const before = { ...commits };
  await act(async () => {
    store.set(sheet.cells.B1!.$input, '20');
  });
  const changed = Object.keys(commits).filter((id) => commits[id] !== before[id]);
  expect(changed.sort()).toEqual(['B1', 'C4', 'D1', 'D4', 'D5']);
  expect(shellCommits).toBe(1);
  await act(async () => {
    store.set(sheet.cells.D1!.$input, '=B2*C2');
  });
  const after = { ...commits };
  await act(async () => {
    store.set(sheet.cells.B1!.$input, '30');
  });
  expect(commits.D1).toBe(after.D1);
  expect(commits.D5).toBe(after.D5);
  expect(commits.B1).toBe(after.B1! + 1);
  await h.unmount();
});
