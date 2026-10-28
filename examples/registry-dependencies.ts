import { stateAtom } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';

// #region shared-dependency
const $unitPrice = stateAtom(100);

function createOrderModel() {
  const $quantity = stateAtom(1);

  const $total = stateAtom((get) => get($unitPrice) * get($quantity));

  return { $quantity, $total };
}

const $$order = pipe(createOrderModel, modelRegistry());
// #endregion shared-dependency

export { $unitPrice, createOrderModel, $$order };
