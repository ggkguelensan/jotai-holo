import type { PaymentMethod } from './operators.js';
import { useLingui } from '@lingui/react/macro';

export function TotalView({ total }: { total: number }) {
  return <output className="demo-number">${total}</output>;
}

export function TermsView({
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

export function ExpensiveItemView({
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

export function OrderButtonView({ canOrder }: { canOrder: boolean }) {
  const { t } = useLingui();

  return <button disabled={!canOrder}>{t`Place order`}</button>;
}

export function PaymentMethodView({
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
