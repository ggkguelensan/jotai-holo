import { createStore, Provider } from 'jotai';
import { act } from 'react';
import { expect, test, vi } from 'vitest';
import Book from '../examples/docs/spreadsheet.js';
import * as workbook from '../examples/spreadsheet/workbook.js';
import { createHarness } from './browser-harness.js';

vi.mock('@lingui/react/macro', () => ({
  useLingui: () => ({ t: (parts: TemplateStringsArray) => parts.join(''), i18n: { locale: 'en' } }),
}));

test('window slots stay fixed while keyboard selection moves the camera', async () => {
  const data = new Map<string, unknown>();
  const storage = {
    read: async (key: string) => data.get(key),
    write: async (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
    },
  };
  const store = createStore();
  store.set(workbook.$storage, storage);
  const h = createHarness();
  h.container.style.width = '800px';
  await h.render(
    <Provider store={store}>
      <Book />
    </Provider>,
  );
  await vi.waitFor(() => expect(h.container.querySelector('[data-address="D5"]')).not.toBeNull());
  const slot = h.container.querySelector<HTMLInputElement>('[data-address="D5"]')!;
  await act(async () => slot.focus());
  await act(async () =>
    slot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
  );
  const after = h.container.querySelector<HTMLInputElement>('[data-address="E5"]')!;
  expect(document.activeElement).toBe(after);
  // Geometry is verified against the styled production site by test:docs-spreadsheet.
  expect(h.container.querySelectorAll('[data-address]')).toHaveLength(32);
  await h.unmount();
});

test('an edit survives unmount and another workbook restores it from storage', async () => {
  const data = new Map<string, unknown>();
  const storage = {
    read: async (key: string) => structuredClone(data.get(key)),
    write: async (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
    },
  };
  const store = createStore();
  store.set(workbook.$storage, storage);
  const h = createHarness();
  h.container.style.width = '800px';
  await h.render(
    <Provider store={store}>
      <Book />
    </Provider>,
  );
  await vi.waitFor(() => expect(h.container.querySelector('[data-address="B1"]')).not.toBeNull());
  const sheet = store.get(workbook.selectSheet({ sheetId: 'gifts' }));
  await act(async () => store.set(sheet.setCell, { address: 'B1', value: '20' }));
  await act(async () => store.set(workbook.switchSheet, 'scratch'));
  await vi.waitFor(() =>
    expect(data.get('gift-budget-v1/sheet/gifts')).toMatchObject({ cells: { B1: '20' } }),
  );
  await h.unmount();
  const second = createStore();
  second.set(workbook.$storage, storage);
  const secondHarness = createHarness();
  secondHarness.container.style.width = '800px';
  await secondHarness.render(
    <Provider store={second}>
      <Book />
    </Provider>,
  );
  await vi.waitFor(() =>
    expect(secondHarness.container.querySelector('[data-sheet-id="gifts"]')).not.toBeNull(),
  );
  await act(async () => second.set(workbook.switchSheet, 'gifts'));
  await vi.waitFor(() =>
    expect(
      secondHarness.container.querySelector<HTMLInputElement>('[data-address="B1"]')?.value,
    ).toBe('20'),
  );
  await secondHarness.unmount();
});

test('an evicted sheet shows loading rather than editable empty slots during restoration', async () => {
  const data = new Map<string, unknown>();
  let delay = false;
  let finish!: (value: unknown) => void;
  const storage = {
    read: async (key: string) =>
      delay
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : structuredClone(data.get(key)),
    write: async (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
    },
  };
  const store = createStore();
  store.set(workbook.$storage, storage);
  const h = createHarness();
  h.container.style.width = '800px';
  await h.render(
    <Provider store={store}>
      <Book />
    </Provider>,
  );
  await vi.waitFor(() => expect(h.container.querySelector('[data-address="D5"]')).not.toBeNull());
  await act(async () => store.set(workbook.switchSheet, 'scratch'));
  await vi.waitFor(() =>
    expect(h.container.querySelector('.sheet-status')?.textContent).toBe('Saved locally'),
  );
  // Deterministic disposal; the integration suite verifies the real 60s timer.
  expect(workbook.$$sheet.remove(store, { key: ['sheet', 'gifts'] })).toBe(true);
  delay = true;
  await act(async () => store.set(workbook.switchSheet, 'gifts'));
  expect(h.container.querySelectorAll('[data-address]')).toHaveLength(0);
  expect(h.container.querySelector('.sheet-status')?.textContent).toBe('Loading sheet…');
  await act(async () => finish(data.get('gift-budget-v1/sheet/gifts')));
  await vi.waitFor(() => expect(h.container.querySelector('[data-address="D5"]')).not.toBeNull());
  await h.unmount();
});
