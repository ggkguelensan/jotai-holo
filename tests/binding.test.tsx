import { renderToStaticMarkup } from 'react-dom/server';
import { atom, createStore, Provider } from 'jotai';
import { createInjector, InjectorProvider, molecule, onMount } from 'bunshi/react';
import { expect, test } from 'vitest';
import { holo, actionAtom } from '../src/index.js';
import { holoMolecule } from '../src/bunshi.js';

test('SSR and action-only adapters preserve result identity and do not acquire model/atom/cage resources', () => {
  const promise = Promise.resolve('saved');
  let resources = 0;
  const $count = atom(0);
  $count.onMount = () => {
    resources++;
  };
  const Model = molecule(() => {
    onMount(() => {
      resources++;
    });
    return {
      $count,
      save: actionAtom((_get, _set, id: number, notify: boolean) => {
        expect([id, notify]).toEqual([7, true]);
        return promise;
      }),
    };
  });
  const adapter = holoMolecule(Model);
  let save: ((id: number, notify: boolean) => Promise<string>) | undefined;
  const C = holo({
    core: ({ onSave }: { onSave: (id: number, notify: boolean) => Promise<string> }) => {
      save = onSave;
      return <b>save</b>;
    },
    actions: { onSave: adapter((m) => m.save) },
    cage: {
      onMount() {
        resources++;
      },
    },
  });
  const injector = createInjector();
  expect(
    renderToStaticMarkup(
      <InjectorProvider value={() => injector}>
        <Provider store={createStore()}>
          <C />
        </Provider>
      </InjectorProvider>,
    ),
  ).toBe('<b>save</b>');
  expect(resources).toBe(0);
  expect(save!(7, true)).toBe(promise);
});
