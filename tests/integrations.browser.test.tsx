import { act, type ReactNode } from 'react';
import { atom, createStore, Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { atomEffect, observe, withAtomEffect } from 'jotai-effect';
import { ScopeProvider as AtomScope } from 'jotai-scope';
import {
  createInjector,
  createScope,
  InjectorProvider,
  molecule,
  onMount,
  ScopeProvider,
} from 'bunshi/react';
import { expect, test } from 'vitest';
import { holo, stateAtom, actionAtom } from '../src/index.js';
import { holoMolecule } from '../examples/holo-molecule.js';
import { createHarness } from './browser-harness.js';

function Value({ count, increment }: { count: number; increment: () => void }) {
  return <button onClick={increment}>{count}</button>;
}

test('withAtomEffect owns a subscription and disposes with the last consumer', async () => {
  const events: string[] = [];
  const $count = stateAtom(0);
  const watched = withAtomEffect($count, (get) => {
    events.push(`read:${get($count)}`);
    return () => {
      events.push('cleanup');
    };
  });
  const increment = actionAtom((_get, set) => {
    set($count, (n) => n + 1);
  });
  const C = holo({ core: Value, state: { count: watched }, actions: { increment } });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
      <C />
    </Provider>,
  );
  expect(events).toEqual(['read:0']);
  await act(async () => {
    store.set(increment);
  });
  expect(h.container.textContent).toBe('11');
  expect(events).toEqual(['read:0', 'cleanup', 'read:1']);
  await h.unmount();
  expect(events.at(-1)).toBe('cleanup');
});

test('atomEffect and observe use the same explicit store as holo', async () => {
  const store = createStore();
  const $count = stateAtom(2);
  const $observed = stateAtom(0);
  const effect = atomEffect((get, set) => {
    set($observed, get($count) * 2);
  });
  const $display = stateAtom((get) => {
    get(effect);
    return get($observed);
  });
  const C = holo({
    core: ({ count }: { count: number }) => <b>{count}</b>,
    state: { count: $display },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <C />
    </Provider>,
  );
  expect(h.container.textContent).toBe('4');
  await act(async () => {
    store.set($count, 3);
  });
  expect(h.container.textContent).toBe('6');
  await h.unmount();
  const seen: number[] = [];
  const stop = observe((get) => {
    seen.push(get($count));
  }, store);
  store.set($count, 4);
  stop();
  store.set($count, 5);
  expect(seen).toEqual([3, 4]);
});

test('hydration is available before a connected child first reads state', async () => {
  const $count = stateAtom(0);
  const C = holo({
    core: ({ count }: { count: number }) => <b>{count}</b>,
    state: { count: $count },
  });
  function Hydrate({ children }: { children: ReactNode }) {
    useHydrateAtoms([[$count, 12]]);
    return children;
  }
  const h = createHarness();
  await h.render(
    <Provider>
      <Hydrate>
        <C />
      </Hydrate>
    </Provider>,
  );
  expect(h.container.textContent).toBe('12');
});

test('jotai-scope isolates a bound primitive and its derived state', async () => {
  const $count = stateAtom(0);
  const $double = stateAtom((get) => get($count) * 2);
  const increment = actionAtom((_get, set) => {
    set($count, (n) => n + 1);
  });
  const C = holo({ core: Value, state: { count: $double }, actions: { increment } });
  const h = createHarness();
  await h.render(
    <Provider>
      <C />
      <AtomScope atoms={[$count]}>
        <C />
      </AtomScope>
    </Provider>,
  );
  const buttons = h.container.querySelectorAll('button');
  await act(async () => {
    buttons[1]?.click();
  });
  expect([...buttons].map((b) => b.textContent)).toEqual(['0', '2']);
});

test('Bunshi adapter shares same-scope models, isolates scopes and preserves binding identity', async () => {
  const scope = createScope('default');
  const mounts: string[] = [];
  const stops: string[] = [];
  let bindings = 0;
  const Counter = molecule((_mol, getScope) => {
    const id = getScope(scope);
    const $count = stateAtom(0);
    const increment = actionAtom((_get, set) => {
      set($count, (n) => n + 1);
    });
    onMount(() => {
      mounts.push(id);
      return () => {
        stops.push(id);
      };
    });
    return { $count, increment };
  });
  const C = holoMolecule(Counter, (model) => {
    bindings++;
    return holo({
      core: Value,
      state: { count: model.$count },
      actions: { increment: model.increment },
    });
  });
  const injector = createInjector();
  const injectorValue = () => injector;
  const store = createStore();
  function Tree({ id, title }: { id: string; title: string }) {
    return (
      <InjectorProvider value={injectorValue}>
        <Provider store={store}>
          <i>{title}</i>
          <ScopeProvider scope={scope} value="a">
            <C />
            <C />
          </ScopeProvider>
          <ScopeProvider scope={scope} value={id}>
            <C />
          </ScopeProvider>
        </Provider>
      </InjectorProvider>
    );
  }
  const h = createHarness();
  await h.render(<Tree id="b" title="first" />);
  expect(bindings).toBe(2);
  expect(mounts).toEqual(['a', 'b']);
  await act(async () => {
    h.container.querySelector('button')?.click();
  });
  expect([...h.container.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
    '1',
    '1',
    '0',
  ]);
  await h.render(<Tree id="b" title="second" />);
  expect(bindings).toBe(2);
  expect(stops).toEqual([]);
  await h.render(<Tree id="c" title="third" />);
  expect(bindings).toBe(3);
  expect(stops).toEqual(['b']);
  await h.unmount();
  expect(stops.sort()).toEqual(['a', 'b', 'c']);
});

test('Bunshi model identity does not replace Jotai Provider isolation', async () => {
  const injector = createInjector();
  const value = () => injector;
  const Counter = molecule(() => {
    const $count = atom(0);
    return {
      $count,
      increment: actionAtom((_get, set) => {
        set($count, (n) => n + 1);
      }),
    };
  });
  const C = holoMolecule(Counter, (m) =>
    holo({ core: Value, state: { count: m.$count }, actions: { increment: m.increment } }),
  );
  const h = createHarness();
  await h.render(
    <InjectorProvider value={value}>
      <Provider>
        <C />
      </Provider>
      <Provider>
        <C />
      </Provider>
    </InjectorProvider>,
  );
  await act(async () => {
    h.container.querySelector('button')?.click();
  });
  expect([...h.container.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['1', '0']);
});
