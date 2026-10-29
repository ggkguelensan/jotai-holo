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

function CartView({
  quantity,
  discount,
  total,
  onQuantity,
  onDiscount,
}: {
  quantity: number;
  discount: boolean;
  total: number;
  onQuantity: (value: number) => void;
  onDiscount: (value: boolean) => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`Workshop tickets · $25 each`}</span>
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
      <label className="demo-checkbox">
        <input
          type="checkbox"
          checked={discount}
          onChange={(e) => onDiscount(e.target.checked)}
        />
        {t`Member discount · 20%`}
      </label>
      <div className="demo-total">
        <span>{t`Total`}</span>
        <output aria-live="polite">${total.toFixed(2)}</output>
      </div>
    </div>
  );
}

const Cart = holo({
  view: CartView,
  read: { quantity: $quantity, discount: $discount, total: $total },
  write: { onQuantity: $quantity, onDiscount: $discount },
});
// #endregion ion

export default Cart;
