import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import {
  actionAtom,
  eventAtom,
  holo,
  ion,
  stateAtom,
  useImperativeHolo,
  type HoloImperative,
} from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';

// #region imperative
const $$checkout = pipe(() => {
  const $quantity = stateAtom(1);
  const $orderNumber = stateAtom(1000);

  const $total = ion($quantity, (quantity) => quantity * 125);

  const orderCreated = eventAtom<{
    orderId: string;
    total: number;
  }>();

  // Demo boundary: a real application publishes after its API succeeds.
  const submit = actionAtom((get, set) => {
    const orderId = String(get($orderNumber) + 1);
    set($orderNumber, Number(orderId));
    set(orderCreated, { orderId, total: get($total) });
  });

  return { $quantity, $total, orderCreated, submit };
}, modelRegistry());

type Receipt = { orderId: string; total: number };
type CheckoutHandle = { onOrderCreated(receipt: Receipt): void };

function CheckoutView({
  quantity,
  total,
  onQuantity,
  onSubmit,
  imperative,
}: {
  quantity: number;
  total: number;
  onQuantity: (quantity: number) => void;
  onSubmit: () => void;
  imperative: HoloImperative<CheckoutHandle>;
}) {
  const { t } = useLingui();
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useImperativeHolo(imperative, {
    onOrderCreated: setReceipt,
  });

  // A local screen demonstrates navigation without a router dependency.
  if (receipt) {
    return (
      <section className="demo-form" aria-live="polite">
        <span className="demo-eyebrow">{t`Order confirmation`}</span>
        <h3>#{receipt.orderId}</h3>
        <p>
          {t`Total`}: ${receipt.total.toFixed(2)}
        </p>
        <button onClick={() => setReceipt(null)}>{t`Back to cart`}</button>
      </section>
    );
  }

  return (
    <section className="demo-form">
      <span className="demo-eyebrow">{t`Checkout`}</span>
      <h3>{t`Oak desk`}</h3>
      <label>
        {t`Quantity`}
        <input
          type="number"
          min="1"
          max="10"
          value={quantity}
          onChange={(event) =>
            onQuantity(
              Math.max(1, Math.min(10, Number(event.target.value) || 1)),
            )
          }
        />
      </label>
      <p>
        {t`Total`}: ${total.toFixed(2)}
      </p>
      <button onClick={onSubmit}>{t`Place order`}</button>
    </section>
  );
}

const Checkout = holo({
  models: { checkout: $$checkout },
  view: CheckoutView,

  read: ({ checkout }) => ({
    quantity: checkout.$quantity,
    total: checkout.$total,
  }),

  write: ({ checkout }) => ({
    onQuantity: checkout.$quantity,
    onSubmit: checkout.submit,
  }),

  imperative: ({ checkout }) => ({
    onOrderCreated: checkout.orderCreated,
  }),
});
// #endregion imperative

export default Checkout;
