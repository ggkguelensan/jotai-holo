import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';

export function QuantityView({
  quantity,
  onQuantity,
}: {
  quantity: number;
  onQuantity: (value: number) => void;
}) {
  const [empty, setEmpty] = useState(false);
  const { t } = useLingui();

  return (
    <label>
      {t`Quantity`}
      <input
        aria-label={t`Quantity`}
        type="number"
        min="1"
        max="10"
        value={empty ? '' : quantity}
        onChange={(e) => {
          const value = e.target.value;
          setEmpty(value === '');
          if (value !== '') {
            onQuantity(Math.max(1, Math.min(10, Number(value))));
          }
        }}
        onBlur={() => setEmpty(false)}
      />
    </label>
  );
}

export function DiscountView({
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

export function TotalView({ total }: { total: number }) {
  const { t } = useLingui();

  return (
    <div className="demo-total">
      <span>{t`Total`}</span>
      <output aria-live="polite">${total.toFixed(2)}</output>
    </div>
  );
}
