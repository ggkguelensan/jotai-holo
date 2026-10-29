import { actionAtom, stateAtom } from 'jotai-holo/vanilla';
import { defineModel, modelRegistry, pipe } from 'jotai-holo/model';

// #region factory
// Each instance holds one player’s reward-token balance.
export const createCounterModel = defineModel(
  (initial: { count: number } = { count: 0 }) => {
    const $count = stateAtom(Math.max(0, initial.count));

    const increment = actionAtom((_get, set, amount: number = 1) => {
      set($count, (count) => Math.max(0, count + amount));
    });

    return { $count, increment };
  },
);
// #endregion factory

// #region usage
// Plain instance: no registry or subscription is created.
export const $$counter = createCounterModel({ count: 5 });

// Optional registry: components can select a shared instance by key.
export const $$counters = pipe(createCounterModel, modelRegistry());
// #endregion usage
