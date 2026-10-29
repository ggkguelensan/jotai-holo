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

function TotalView({ total }: { total: number }) {
  return <output className="demo-number">${total}</output>;
}

const Total = holo({
  view: TotalView,
  read: { total: $total },
});

function TermsView({
  accepted,
  onAccept,
}: {
  accepted: boolean;
  onAccept: (value: boolean) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      <input
        type="checkbox"
        checked={accepted}
        onChange={(e) => onAccept(e.target.checked)}
      />{' '}
      {t`I accept the delivery terms`}
    </label>
  );
}

const Terms = holo({
  view: TermsView,
  read: { accepted: $accepted },
  write: { onAccept: $accepted },
});

function SurchargeView({ surcharge }: { surcharge: boolean }) {
  const { t } = useLingui();

  return <small>{surcharge ? t`Surcharge applies` : t`No surcharge`}</small>;
}

const Surcharge = holo({
  view: SurchargeView,
  read: { surcharge: $hasSurcharge },
});

function OrderButtonView({ canOrder }: { canOrder: boolean }) {
  const { t } = useLingui();

  return <button disabled={!canOrder}>{t`Place order`}</button>;
}

const OrderButton = holo({
  view: OrderButtonView,
  read: { canOrder: $canOrder },
});

function OrderReview() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Order review · courier delivery`}</span>
      <p>{t`Goods $80 + delivery $15`}</p>
      <Total />
      <Terms />
      <Surcharge />
      <OrderButton />
    </div>
  );
}
// #endregion operators

export default OrderReview;
