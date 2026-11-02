import { useLingui } from '@lingui/react/macro';
// #region focus
import { eventAtom, holo } from 'jotai-holo';
import { SearchView } from './imperative-focus-view.js';

export const searchFocusRequested = eventAtom<void>();

const Search = holo({
  view: SearchView,
  events: { focusSearch: searchFocusRequested },
});
// #endregion focus

function FocusButtonView({ onFocus }: { onFocus: () => void }) {
  const { t } = useLingui();
  return <button onClick={onFocus}>{t`Go to game search`}</button>;
}

const FocusButton = holo({
  view: FocusButtonView,
  write: { onFocus: searchFocusRequested },
});

export default function FocusDemo() {
  const { t } = useLingui();
  return (
    <div className="demo-form">
      <FocusButton />
      <Search label={t`Search games`} />
    </div>
  );
}
