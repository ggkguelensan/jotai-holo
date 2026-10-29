import { useLingui } from '@lingui/react/macro';
import { useRef } from 'react';
import { eventAtom, holo, useHoloEvents, type HoloEvents } from 'jotai-holo';

// #region focus
export const searchFocusRequested = eventAtom<void>();

type SearchEvents = { focusSearch(): void };

function SearchView({ events }: { events: HoloEvents<SearchEvents> }) {
  const { t } = useLingui();
  const input = useRef<HTMLInputElement>(null);

  useHoloEvents(events, {
    focusSearch() {
      input.current?.focus();
    },
  });

  return <input ref={input} aria-label={t`Search games`} type="search" />;
}

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
  return (
    <div className="demo-form">
      <FocusButton />
      <Search />
    </div>
  );
}
