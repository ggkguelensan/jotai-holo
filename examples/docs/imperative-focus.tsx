import { useLingui } from '@lingui/react/macro';
import { useRef } from 'react';
import {
  eventAtom,
  holo,
  useImperativeHolo,
  type HoloImperative,
} from 'jotai-holo';

// #region focus
export const searchFocusRequested = eventAtom<void>();

type SearchHandle = { focusSearch(): void };

function SearchView({
  imperative,
}: {
  imperative: HoloImperative<SearchHandle>;
}) {
  const { t } = useLingui();
  const input = useRef<HTMLInputElement>(null);

  useImperativeHolo(imperative, {
    focusSearch() {
      input.current?.focus();
    },
  });

  return <input ref={input} aria-label={t`Search games`} type="search" />;
}

const Search = holo({
  view: SearchView,
  imperative: { focusSearch: searchFocusRequested },
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
  return (
    <div className="demo-form">
      <FocusButton />
      <Search />
    </div>
  );
}
