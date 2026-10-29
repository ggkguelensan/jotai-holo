import { useLingui } from '@lingui/react/macro';
import { holo, ion, stateAtom } from 'jotai-holo';
import { QuantityView, DiscountView, TotalView } from './ion-views.js';

// #region ion
// #region calculation
const $quantity = stateAtom(2);
const $discount = stateAtom(false);

const $total = ion(
  { quantity: $quantity, discount: $discount },
  ({ quantity, discount }) => quantity * 25 * (discount ? 0.8 : 1),
);

// #endregion calculation

const Quantity = holo({
  view: QuantityView,
  read: { quantity: $quantity },
  write: { onQuantity: $quantity },
});

const Discount = holo({
  view: DiscountView,
  read: { discount: $discount },
  write: { onDiscount: $discount },
});

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
