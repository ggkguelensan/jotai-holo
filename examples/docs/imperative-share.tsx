import { useLingui } from '@lingui/react/macro';
import { useShare } from '@siberiacancode/reactuse';
import { useState } from 'react';

// #region share
export function ShareGame({ title, url }: { title: string; url: string }) {
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
      <button disabled={!share.supported} onClick={shareGame}>
        {share.supported ? t`Share game` : t`Sharing is unavailable`}
      </button>
      {failed && <p role="alert">{t`Could not share. Try again.`}</p>}
    </>
  );
}
// #endregion share

export default function ShareDemo() {
  return (
    <ShareGame title="Starfall" url="https://example.com/games/starfall" />
  );
}
