import { useLingui } from '@lingui/react/macro';
import { useShare } from '@siberiacancode/reactuse';
import {
  eventAtom,
  holo,
  useImperativeHolo,
  type HoloImperative,
} from 'jotai-holo';

// #region share
export const gameShareRequested = eventAtom<void>();

type ShareHandle = { shareGame(): Promise<void> };

function ShareGameView({
  imperative,
  title,
  url,
  onShare,
}: {
  imperative: HoloImperative<ShareHandle>;
  title: string;
  url: string;
  onShare: () => void;
}) {
  const { t } = useLingui();
  const share = useShare({ title, url });

  useImperativeHolo(imperative, {
    async shareGame() {
      try {
        await share.trigger();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      }
    },
  });

  return (
    <button disabled={!share.supported} onClick={onShare}>
      {share.supported ? t`Share game` : t`Sharing is unavailable`}
    </button>
  );
}

export const ShareGame = holo({
  view: ShareGameView,
  write: { onShare: gameShareRequested },
  imperative: { shareGame: gameShareRequested },
});
// #endregion share

export default function ShareDemo() {
  return (
    <ShareGame title="Starfall" url="https://example.com/games/starfall" />
  );
}
