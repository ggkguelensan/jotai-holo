import { act } from 'react';
import { createStore, Provider } from 'jotai';
import { expect, test, vi } from 'vitest';
import { actionAtom, bond, eventAtom, subscribeEvent, holo, stateAtom } from '../src/index.js';
import { createHarness } from './browser-harness.js';

test('holo dispatches events without rerendering; bond updates state only when its value changes', async () => {
  const renamed = eventAtom<string>();
  const opened = eventAtom();
  const $name = stateAtom('Ada');
  const store = createStore();
  const changeName = actionAtom((_get, set, name: string) => {
    set($name, name);
  });
  const apply = bond({ trigger: renamed, yield: changeName });
  const events = vi.fn();
  const openings = vi.fn();
  const stops = [
    apply.connect(store),
    subscribeEvent(store, renamed, events),
    subscribeEvent(store, opened, openings),
  ];
  let renders = 0;
  const User = holo({
    core: ({
      name,
      onRename,
      onOpen,
    }: {
      name: string;
      onRename: (name: string) => void;
      onOpen: () => void;
    }) => {
      renders++;
      return (
        <>
          <span>{name}</span>
          <button onClick={() => onRename('Grace')}>rename</button>
          <button onClick={() => onOpen()}>open</button>
        </>
      );
    },
    state: { name: $name },
    actions: { onRename: renamed, onOpen: opened },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <User />
    </Provider>,
  );
  const before = renders;
  const [rename, open] = h.container.querySelectorAll('button');
  await act(async () => open!.click());
  expect(openings.mock.calls).toEqual([[undefined]]);
  expect(renders).toBe(before);
  await act(async () => rename!.click());
  expect(renders).toBe(before + 1);
  expect(store.get($name)).toBe('Grace');
  await act(async () => rename!.click());
  expect(events.mock.calls).toEqual([['Grace'], ['Grace']]);
  expect(renders).toBe(before + 1);
  stops.forEach((stop) => stop());
  await act(async () => rename!.click());
  expect(events).toHaveBeenCalledTimes(2);
});
