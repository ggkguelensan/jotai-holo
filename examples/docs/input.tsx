import { useState } from 'react';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import {
  SearchTermView,
  SearchView,
  SearchVisibilityView,
  StatusView,
} from './input-views.js';

// #region input
// #region input-bindings
const $query = stateAtom('');

const changed = actionAtom((_get, set, query: string) => set($query, query));

const Search = holo({
  view: SearchView,
  input: { term: changed },
});

const Status = holo({
  view: StatusView,
  read: { query: $query },
});
// #endregion input-bindings

// #region input-layout
function InputDemo() {
  const [term, setTerm] = useState('starfall');
  const [visible, setVisible] = useState(true);

  return (
    <div className="demo-form">
      <SearchTermView term={term} onChange={setTerm} />
      <SearchVisibilityView visible={visible} onChange={setVisible} />
      {visible && <Search term={term} />}
      <Status />
    </div>
  );
}
// #endregion input-layout
// #endregion input

export default InputDemo;
