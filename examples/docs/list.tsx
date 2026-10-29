import { useLingui } from '@lingui/react/macro';
import { actionAtom, holo, holoList, ion, stateAtom } from 'jotai-holo';
import {
  WishlistGameView,
  EmptyWishlistView,
  WishlistControlsView,
} from './list-views.js';

// #region list
export type WishlistedGame = { id: number; title: string };
const initialWishlist: readonly WishlistedGame[] = [
  { id: 1, title: 'Starfall' },
  { id: 2, title: 'Moon Harbor' },
];
const $wishlist = stateAtom(initialWishlist);
const $empty = ion($wishlist, (games) => games.length === 0);

const reverseWishlist = actionAtom((_get, set) =>
  set($wishlist, (games) => [...games].reverse()),
);
const clearWishlist = actionAtom((_get, set) => set($wishlist, []));

const restoreWishlist = actionAtom((_get, set) =>
  set($wishlist, initialWishlist),
);

const Wishlist = holoList({
  source: $wishlist,
  view: WishlistGameView,
  getKey: (game) => game.id,
  mapItem: (game) => ({ game }),
  empty: EmptyWishlistView,
});

const WishlistControls = holo({
  view: WishlistControlsView,
  read: { empty: $empty },
  write: {
    onReverse: reverseWishlist,
    onClear: clearWishlist,
    onRestore: restoreWishlist,
  },
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
