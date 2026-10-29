import { useLingui } from '@lingui/react/macro';
import { holo, ion, stateAtom } from 'jotai-holo';

// #region ion
// #region calculation
const $quantity = stateAtom(2);
const $discount = stateAtom(false);

const $total = ion(
  { quantity: $quantity, discount: $discount },
  ({ quantity, discount }) => quantity * 25 * (discount ? 0.8 : 1),
);

// #endregion calculation

function QuantityView({
  quantity,
  onQuantity,
}: {
  quantity: number;
  onQuantity: (value: number) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Quantity`}
      <input
        aria-label={t`Quantity`}
        type="number"
        min="1"
        max="10"
        value={quantity}
        onChange={(e) =>
          onQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
        }
      />
    </label>
  );
}

const Quantity = holo({
  view: QuantityView,
  read: { quantity: $quantity },
  write: { onQuantity: $quantity },
});

function DiscountView({
  discount,
  onDiscount,
}: {
  discount: boolean;
  onDiscount: (value: boolean) => void;
}) {
  const { t } = useLingui();

  return (
    <label className="demo-checkbox">
      <input
        type="checkbox"
        checked={discount}
        onChange={(e) => onDiscount(e.target.checked)}
      />
      {t`Bundle discount · 20%`}
    </label>
  );
}

const Discount = holo({
  view: DiscountView,
  read: { discount: $discount },
  write: { onDiscount: $discount },
});

function TotalView({ total }: { total: number }) {
  const { t } = useLingui();

  return (
    <div className="demo-total">
      <span>{t`Total`}</span>
      <output aria-live="polite">${total.toFixed(2)}</output>
    </div>
  );
}

const Total = holo({
  view: TotalView,
  read: { total: $total },
});

function Cart() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Gift copies · $25 each`}</span>
      <Quantity />
      <Discount />
      <Total />
    </div>
  );
}
// #endregion ion

export default Cart;
