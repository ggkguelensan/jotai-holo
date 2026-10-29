import { useLingui } from '@lingui/react/macro';
import { and, eq, holo, or, some, stateAtom, sum } from 'jotai-holo';

// #region operators
type PaymentMethod = '' | 'wallet' | 'card';

const $gamePrice = stateAtom(80);
const $dlcPrice = stateAtom(15);
const $paymentMethod = stateAtom<PaymentMethod>('');
const $accepted = stateAtom(false);

const $total = sum({ games: $gamePrice, dlc: $dlcPrice });

const $usesWallet = eq($paymentMethod, 'wallet');

const $hasPaymentMethod = or([$usesWallet, eq($paymentMethod, 'card')]);

const $canOrder = and([$hasPaymentMethod, $accepted]);

const $hasExpensiveItem = some([$gamePrice, $dlcPrice], (price) => price > 70);

function TotalView({ total }: { total: number }) {
  return <output className="demo-number">${total}</output>;
}

const Total = holo({
  view: TotalView,
  read: { total: $total },
});

function PaymentMethodView({
  paymentMethod,
  onPaymentMethod,
}: {
  paymentMethod: PaymentMethod;
  onPaymentMethod: (method: PaymentMethod) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Payment method`}
      <select
        value={paymentMethod}
        onChange={(event) =>
          onPaymentMethod(event.target.value as PaymentMethod)
        }
      >
        <option value="" disabled>
          {t`Choose a payment method`}
        </option>
        <option value="card">{t`Payment card`}</option>
        <option value="wallet">{t`Wallet`}</option>
      </select>
    </label>
  );
}

const PaymentMethod = holo({
  view: PaymentMethodView,
  read: { paymentMethod: $paymentMethod },
  write: { onPaymentMethod: $paymentMethod },
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
      {t`I accept the purchase terms`}
    </label>
  );
}

const Terms = holo({
  view: TermsView,
  read: { accepted: $accepted },
  write: { onAccept: $accepted },
});

function ExpensiveItemView({
  hasExpensiveItem,
}: {
  hasExpensiveItem: boolean;
}) {
  const { t } = useLingui();

  return (
    <small>
      {hasExpensiveItem
        ? t`Contains an item over $70`
        : t`All items are $70 or less`}
    </small>
  );
}

const ExpensiveItem = holo({
  view: ExpensiveItemView,
  read: { hasExpensiveItem: $hasExpensiveItem },
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
