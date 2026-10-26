import { useLingui } from '@lingui/react';
import { molecule, createScope, ScopeProvider } from 'bunshi/react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { holoMolecule } from 'jotai-holo/bunshi';

// #region bunshi
const CounterScope = createScope('default');

const CounterMolecule = molecule((_mol, scope) => {
  scope(CounterScope);
  const $count = stateAtom(0);

  const increment = actionAtom((_get, set) => set($count, (count) => count + 1));
  return { $count, increment };
});

const counter = holoMolecule(CounterMolecule);

function CounterView({ count, onIncrement }: { count: number; onIncrement: () => void }) {
  return (
    <button type="button" onClick={() => onIncrement()}>
      + {count}
    </button>
  );
}

const Counter = holo({
  core: CounterView,
  state: { count: counter((model) => model.$count) },
  actions: { onIncrement: counter((model) => model.increment) },
});

function ScopedCounters() {
  const { _: t } = useLingui();

  return (
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
  );
}
// #endregion bunshi

export default ScopedCounters;
