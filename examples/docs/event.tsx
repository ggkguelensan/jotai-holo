import { useLingui } from '@lingui/react/macro';
import { observe } from 'jotai-effect';
import { createModel } from 'jotai-holo/model';
import {
  actionAtom,
  eventAtom,
  holo,
  stateAtom,
  subscribeEvent,
} from 'jotai-holo';

// #region event
export const Messages = createModel({
  create: () => {
    const messageReceived = eventAtom<{ text: string }>();

    const $listening = stateAtom(true);
    const $last = stateAtom('');
    const $deliveries = stateAtom(0);

    const record = actionAtom((_get, set, text: string) => {
      set($last, text);
      set($deliveries, (count) => count + 1);
    });

    const toggleListening = actionAtom((get, set) =>
      set($listening, !get($listening)),
    );
    return {
      messageReceived,
      $listening,
      $last,
      $deliveries,
      record,
      toggleListening,
    };
  },
  resources: (model) => [
    {
      connect: (store) =>
        observe((get) => {
          if (!get(model.$listening)) return;
          return subscribeEvent(store, model.messageReceived, ({ text }) =>
            store.set(model.record, text),
          );
        }, store),
    },
  ],
});

function View({
  last,
  deliveries,
  onReceive,
  listening,
  onToggleListening,
}: {
  listening: boolean;
  onToggleListening: () => void;
  last: string;
  deliveries: number;
  onReceive: (payload: { text: string }) => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Simulated incoming message`}</span>
      <p>{t`The same payload is delivered on every occurrence.`}</p>
      <div className="demo-controls">
        <button
          type="button"
          onClick={() => onReceive({ text: t`Hello, Jotai!` })}
        >
          {t`Receive message`}
        </button>
        <button type="button" onClick={onToggleListening}>
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
  models: { model: Messages },
  view: View,
  read: ({ model: model }) => ({
    last: model.$last,
    deliveries: model.$deliveries,
    listening: model.$listening,
  }),
  write: ({ model: model }) => ({
    onReceive: model.messageReceived,
    onToggleListening: model.toggleListening,
  }),
});
// #endregion event

export default IncomingMessages;
