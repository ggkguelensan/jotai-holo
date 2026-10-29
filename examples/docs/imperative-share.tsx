import { useLingui } from '@lingui/react/macro';
import { useShare } from '@siberiacancode/reactuse';
import { useState } from 'react';

// #region share
export function ShareGame({
  title,
  url,
  iconOnly = false,
}: {
  title: string;
  url: string;
  iconOnly?: boolean;
}) {
  const { t } = useLingui();
  const share = useShare({ title, url });
  const [failed, setFailed] = useState(false);

  async function shareGame() {
    setFailed(false);
    try {
      await share.trigger();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFailed(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className={iconOnly ? 'demo-share-icon' : undefined}
        aria-label={share.supported ? t`Share game` : t`Sharing is unavailable`}
        title={share.supported ? t`Share game` : t`Sharing is unavailable`}
        disabled={!share.supported}
        onClick={shareGame}
      >
        {iconOnly ? (
          <ShareIconView />
        ) : share.supported ? (
          t`Share game`
        ) : (
          t`Sharing is unavailable`
        )}
      </button>
      {failed && <p role="alert">{t`Could not share. Try again.`}</p>}
    </>
  );
}
// #endregion share

function ShareIconView() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 16V3m-4 4 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

export default function ShareDemo() {
  return (
    <ShareGame title="Starfall" url="https://example.com/games/starfall" />
  );
}
