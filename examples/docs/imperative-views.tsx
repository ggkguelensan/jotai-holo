import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';

export function QuantityView({
  quantity,
  onQuantity,
}: {
  quantity: number;
  onQuantity: (quantity: number) => void;
}) {
  const [empty, setEmpty] = useState(false);
  const { t } = useLingui();

  return (
    <label>
      {t`Quantity`}
      <input
        type="number"
        min="1"
        max="10"
        value={empty ? '' : quantity}
        onChange={(event) => {
          const value = event.target.value;
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

export function TotalView({ total }: { total: number }) {
  const { t } = useLingui();

  return (
    <p>
      {t`Total`}: ${total.toFixed(2)}
    </p>
  );
}

export function SubmitView({ onSubmit }: { onSubmit: () => void }) {
  const { t } = useLingui();

  return <button onClick={onSubmit}>{t`Place order`}</button>;
}
