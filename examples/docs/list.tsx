import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { actionAtom, holo, holoList, stateAtom } from 'jotai-holo';

// #region list
type WishlistedGame = { id: number; title: string };
const $wishlist = stateAtom<readonly WishlistedGame[]>([
  { id: 1, title: 'Starfall' },
  { id: 2, title: 'Moon Harbor' },
]);

const reverseWishlist = actionAtom((_get, set) =>
  set($wishlist, (games) => [...games].reverse()),
);
const clearWishlist = actionAtom((_get, set) => set($wishlist, []));

function WishlistGameView({ game }: { game: WishlistedGame }) {
  const { t } = useLingui();

  const [selectedForGift, setSelectedForGift] = useState(false);

  return (
    <li>
      <label className="demo-checkbox">
        <input
          type="checkbox"
          aria-label={
            game.id === 1
              ? t`Select Starfall as a gift`
              : t`Select Moon Harbor as a gift`
          }
          checked={selectedForGift}
          onChange={(event) => setSelectedForGift(event.target.checked)}
        />
        <span>{game.title === 'Starfall' ? t`Starfall` : t`Moon Harbor`}</span>
        <code>#{game.id}</code>
        {selectedForGift && <small>{t`Selected for gift`}</small>}
      </label>
    </li>
  );
}

function EmptyWishlistView() {
  const { t } = useLingui();

  return <li className="demo-note">{t`Your wishlist is empty.`}</li>;
}

const Wishlist = holoList({
  source: $wishlist,
  view: WishlistGameView,
  getKey: (game) => game.id,
  mapItem: (game) => ({ game }),
  empty: EmptyWishlistView,
});

function WishlistControlsView({
  onReverse,
  onClear,
}: {
  onReverse: () => void;
  onClear: () => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button type="button" onClick={() => onReverse()}>
        {t`Reverse wishlist`}
      </button>
      <button type="button" onClick={() => onClear()}>
        {t`Clear wishlist`}
      </button>
    </div>
  );
}

const WishlistControls = holo({
  view: WishlistControlsView,
  write: { onReverse: reverseWishlist, onClear: clearWishlist },
});

function WishlistDemo() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Choose gifts from your wishlist`}</span>
      <ul className="demo-wishlist">
        <Wishlist />
      </ul>
      <WishlistControls />
      <p className="demo-note">
        {t`Select a gift, then reverse the list. Selection follows the game.`}
      </p>
    </div>
  );
}
// #endregion list

export default WishlistDemo;
