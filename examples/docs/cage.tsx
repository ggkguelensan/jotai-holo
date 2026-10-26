import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';

// #region cage
const $query = stateAtom('');
const $mounted = stateAtom(false);

const changed = actionAtom((_get, set, query: string) => set($query, query));

function SearchView({ term }: { term: string }) {
  const { t } = useLingui();

  return (
    <p className="demo-note">
      {t`Mounted search View receives`}: {term || '—'}
    </p>
  );
}

const Search = holo({
  core: SearchView,
  cage: {
    onMount(_get, set) {
      set($mounted, true);
    },
    onChange(_get, set, ctx) {
      set(changed, ctx.props.term);
    },
    onUnmount(_get, set) {
      set($mounted, false);
      set(changed, '');
    },
  },
});

function StatusView({ query, mounted }: { query: string; mounted: boolean }) {
  const { t } = useLingui();

  return (
    <output aria-live="polite">
      {mounted ? t`mounted` : t`unmounted`} · $query: {query || '∅'}
    </output>
  );
}

const Status = holo({
  core: StatusView,
  state: { query: $query, mounted: $mounted },
});

function LifecycleDemo() {
  const { t } = useLingui();

  const [term, setTerm] = useState('jotai');
  const [visible, setVisible] = useState(true);

  return (
    <div className="demo-form">
      <label>
        {t`Input prop: term`}
        <input value={term} onChange={(e) => setTerm(e.target.value)} />
      </label>
      <label className="demo-checkbox">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
        />
        {t`Mount Search`}
      </label>
      {visible && <Search term={term} />}
      <Status />
    </div>
  );
}
// #endregion cage

export default LifecycleDemo;
