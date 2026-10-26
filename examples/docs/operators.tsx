import { useLingui } from '@lingui/react/macro';
import { and, eq, holo, or, some, stateAtom, sum } from 'jotai-holo';

// #region operators
const $goods = stateAtom(80);
const $delivery = stateAtom(15);
const $deliveryMethod = stateAtom('courier');
const $accepted = stateAtom(false);

const $total = sum({ goods: $goods, delivery: $delivery });

const $isCourier = eq($deliveryMethod, 'courier');

const $hasDelivery = or([$isCourier, eq($deliveryMethod, 'pickup')]);

const $canOrder = and([$hasDelivery, $accepted]);

const $hasSurcharge = some([$goods, $delivery], (amount) => amount > 100);

function OrderReviewView({
  total,
  accepted,
  canOrder,
  surcharge,
  onAccept,
}: {
  total: number;
  accepted: boolean;
  canOrder: boolean;
  surcharge: boolean;
  onAccept: (value: boolean) => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Order review · courier delivery`}</span>
      <p>{t`Goods $80 + delivery $15`}</p>
      <output className="demo-number">${total}</output>
      <label>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAccept(e.target.checked)}
        />{' '}
        {t`I accept the delivery terms`}
      </label>
      <small>{surcharge ? t`Surcharge applies` : t`No surcharge`}</small>
      <button disabled={!canOrder}>{t`Place order`}</button>
    </div>
  );
}

const OrderReview = holo({
  core: OrderReviewView,
  state: {
    total: $total,
    accepted: $accepted,
    canOrder: $canOrder,
    surcharge: $hasSurcharge,
  },
  actions: { onAccept: $accepted },
});
// #endregion operators

export default OrderReview;
