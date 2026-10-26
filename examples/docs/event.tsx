import { useLingui } from '@lingui/react/macro';
import { useStore } from 'jotai';
import { useEffect, useState } from 'react';
import { actionAtom, eventAtom, holo, stateAtom, subscribeEvent } from 'jotai-holo';

// #region event
const messageReceived = eventAtom<{ text: string }>();

const $last = stateAtom('');
const $deliveries = stateAtom(0);

const record = actionAtom((_get, set, text: string) => {
  set($last, text);
  set($deliveries, (count) => count + 1);
});

function View({
  last,
  deliveries,
  onReceive,
}: {
  last: string;
  deliveries: number;
  onReceive: (payload: { text: string }) => void;
}) {
  const { t } = useLingui();

  const [listening, setListening] = useState(true);
  const store = useStore();
  useEffect(() => {
    if (!listening) return;
    return subscribeEvent(store, messageReceived, ({ text }) => store.set(record, text));
  }, [store, listening]);
  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Simulated incoming message`}</span>
      <p>{t`The same payload is delivered on every occurrence.`}</p>
      <div className="demo-controls">
        <button type="button" onClick={() => onReceive({ text: t`Hello, Jotai!` })}>
          {t`Receive message`}
        </button>
        <button type="button" onClick={() => setListening((value) => !value)}>
          {listening ? t`Unsubscribe` : t`Subscribe`}
        </button>
      </div>
      <output aria-live="polite">
        {t`Deliveries`}: {deliveries} · {last || '—'}
      </output>
    </div>
  );
}

const IncomingMessages = holo({
  core: View,
  state: { last: $last, deliveries: $deliveries },
  actions: { onReceive: messageReceived },
});
// #endregion event

export default IncomingMessages;
