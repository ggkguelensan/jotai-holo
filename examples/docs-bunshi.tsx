import type { DocsTranslator } from './docs-i18n.js';
import { molecule, createScope, ScopeProvider } from 'bunshi/react';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { holoMolecule } from 'jotai-holo/bunshi';

// #region bunshi
export function createBunshiDemo(t: DocsTranslator) {
  const CounterScope = createScope('default');
  const CounterMolecule = molecule((_mol, scope) => {
    scope(CounterScope);
    const $count = stateAtom(0);
    const increment = actionAtom((_get, set) => set($count, (count) => count + 1));
    return { $count, increment };
  });
  const counter = holoMolecule(CounterMolecule);
  const Counter = holo({
    core: ({ count, onIncrement }: { count: number; onIncrement: () => void }) => (
      <button type="button" onClick={() => onIncrement()}>
        + {count}
      </button>
    ),
    state: { count: counter((model) => model.$count) },
    actions: { onIncrement: counter((model) => model.increment) },
  });
  const store = createStore();
  return function ScopedCounters() {
    return (
      <Provider store={store}>
        <div className="demo-form">
          <span className="demo-eyebrow">{t('Two Views in a shared scope')}</span>
          <ScopeProvider scope={CounterScope} value="shared">
            <div className="demo-controls">
              <Counter />
              <Counter />
            </div>
          </ScopeProvider>
          <span className="demo-eyebrow">{t('Independent scope')}</span>
          <ScopeProvider scope={CounterScope} value="separate">
            <div className="demo-controls">
              <Counter />
            </div>
          </ScopeProvider>
        </div>
      </Provider>
    );
  };
}
// #endregion bunshi
