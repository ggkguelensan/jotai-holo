import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import type { WishlistedGame } from './list.js';

export function WishlistGameView({ game }: { game: WishlistedGame }) {
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

export function EmptyWishlistView() {
  const { t } = useLingui();

  return <li className="demo-note">{t`Your wishlist is empty.`}</li>;
}

export function WishlistControlsView({
  empty,
  onReverse,
  onClear,
  onRestore,
}: {
  empty: boolean;
  onRestore: () => void;
  onReverse: () => void;
  onClear: () => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button type="button" disabled={empty} onClick={onReverse}>
        {t`Reverse wishlist`}
      </button>
      <button type="button" disabled={empty} onClick={onClear}>
        {t`Clear wishlist`}
      </button>
      {empty && (
        <button type="button" onClick={onRestore}>
          {t`Restore wishlist`}
        </button>
      )}
    </div>
  );
}
