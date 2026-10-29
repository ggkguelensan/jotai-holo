import { useLingui } from '@lingui/react/macro';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { CopiesView, ToolbarView } from './model-views.js';

// #region model
// #region gift-order-factory
function createGiftOrderModel() {
  const $copies = stateAtom(5);

  const addCopy = actionAtom((_get, set) => set($copies, (n) => n + 1));
  return { $copies, addCopy };
}

// #endregion gift-order-factory

// #region gift-order-registry
const $$giftOrder = pipe(createGiftOrderModel, modelRegistry());
// #endregion gift-order-registry
// Both bindings select the same instance without a scope provider.

// #region gift-order-copies

const Copies = holo({
  models: {
    model: (props: { giftOrderId: string }) =>
      $$giftOrder({ key: ['giftOrder', { id: props.giftOrderId }] }),
  },
  view: CopiesView,
  read: ({ model: $$giftOrder }) => ({ count: $$giftOrder.$copies }),
});

// #endregion gift-order-copies

// #region gift-order-toolbar

const Toolbar = holo({
  models: {
    model: (props: { giftOrderId: string }) =>
      $$giftOrder({ key: ['giftOrder', { id: props.giftOrderId }] }),
  },
  view: ToolbarView,
  write: ({ model: $$giftOrder }) => ({ onAdd: $$giftOrder.addCopy }),
});

// #endregion gift-order-toolbar

function GiftOrderDemo() {
  const { t } = useLingui();

  return (
    <div className="demo-instances">
      {['Atlas', 'Beacon'].map((id) => {
        return (
          <section key={id} className="demo-model-instance">
            <span className="demo-eyebrow">
              {t`Gift order`} {id}
            </span>
            <Copies giftOrderId={id} />
            <Toolbar giftOrderId={id} />
          </section>
        );
      })}
    </div>
  );
}
// #endregion model

export default GiftOrderDemo;
