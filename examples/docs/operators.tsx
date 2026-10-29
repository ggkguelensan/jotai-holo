import { useLingui } from '@lingui/react/macro';
import { holo, ion, stateAtom } from 'jotai-holo';
import {
  TotalView,
  TermsView,
  ExpensiveItemView,
  OrderButtonView,
  PaymentMethodView,
} from './operators-views.js';

// #region operators
export type PaymentMethod = '' | 'wallet' | 'card';

const $gamePrice = stateAtom(80);
const $dlcPrice = stateAtom(15);
const $paymentMethod = stateAtom<PaymentMethod>('');
const $accepted = stateAtom(false);

const $total = ion(
  { game: $gamePrice, dlc: $dlcPrice },
  ({ game, dlc }) => game + dlc,
);

const $canOrder = ion(
  { method: $paymentMethod, accepted: $accepted },
  ({ method, accepted }) => method !== '' && accepted,
);

const $hasExpensiveItem = ion([$gamePrice, $dlcPrice], (prices) =>
  prices.some((price) => price > 70),
);

const Total = holo({
  view: TotalView,
  read: { total: $total },
});

const PaymentMethod = holo({
  view: PaymentMethodView,
  read: { paymentMethod: $paymentMethod },
  write: { onPaymentMethod: $paymentMethod },
});

const Terms = holo({
  view: TermsView,
  read: { accepted: $accepted },
  write: { onAccept: $accepted },
});

const ExpensiveItem = holo({
  view: ExpensiveItemView,
  read: { hasExpensiveItem: $hasExpensiveItem },
});

const OrderButton = holo({
  view: OrderButtonView,
  read: { canOrder: $canOrder },
});

function OrderReview() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Review game purchase`}</span>
      <p>{t`Game $80 + DLC $15`}</p>
      <Total />
      <PaymentMethod />
      <Terms />
      <ExpensiveItem />
      <OrderButton />
    </div>
  );
}
// #endregion operators

export default OrderReview;
