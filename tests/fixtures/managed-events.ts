import { modelRegistry, pipe } from '../../src/model.js';
import { actionAtom, bond, eventAtom, stateAtom } from '../../src/vanilla.js';

export const $$messages = pipe(() => {
  const messageReceived = eventAtom<{ text: string }>();

  const $listening = stateAtom(true);
  const $last = stateAtom('');
  const $deliveries = stateAtom(0);

  const record = actionAtom((_get, set, text: string) => {
    set($last, text);
    set($deliveries, (count) => count + 1);
  });
  const toggleListening = actionAtom((_get, set) => set($listening, (listening) => !listening));

  const recording = bond({
    trigger: messageReceived,
    guard: $listening,
    map: ({ text }) => [text],
    write: record,
  });

  return {
    messageReceived,
    $listening,
    $last,
    $deliveries,
    toggleListening,
    recording,
  };
}, modelRegistry());
