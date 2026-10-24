import { actionAtom, stateAtom } from 'jotai-holo/vanilla';

export function createCounter(initial = 0) {
  const $count = stateAtom(initial);
  const $double = stateAtom((get) => get($count) * 2);
  const increment = actionAtom((_get, set) => {
    set($count, (count) => count + 1);
  });
  const decrement = actionAtom((_get, set) => {
    set($count, (count) => count - 1);
  });
  return { $count, $double, increment, decrement };
}
