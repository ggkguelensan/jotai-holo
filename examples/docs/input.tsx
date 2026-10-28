import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';

// #region input
const $query = stateAtom('');

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
  view: SearchView,
  inputProps: { term: changed },
});

function StatusView({ query }: { query: string }) {
  return <output aria-live="polite">$query: {query || '∅'}</output>;
}

const Status = holo({
  view: StatusView,
  read: { query: $query },
});

function InputDemo() {
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
// #endregion input

export default InputDemo;
