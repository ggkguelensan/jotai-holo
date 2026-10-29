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
function createCheckoutModel() {
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
}

const $$checkout = pipe(createCheckoutModel, modelRegistry());

type Receipt = { orderId: string; total: number };
type CheckoutHandle = { onOrderCreated(receipt: Receipt): void };

function QuantityView({
  quantity,
  onQuantity,
}: {
  quantity: number;
  onQuantity: (quantity: number) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Quantity`}
      <input
        type="number"
        min="1"
        max="10"
        value={quantity}
        onChange={(event) =>
          onQuantity(Math.max(1, Math.min(10, Number(event.target.value) || 1)))
        }
      />
    </label>
  );
}

const Quantity = holo({
  models: { checkout: $$checkout },
  view: QuantityView,
  read: ({ checkout }) => ({ quantity: checkout.$quantity }),
  write: ({ checkout }) => ({ onQuantity: checkout.$quantity }),
});

function TotalView({ total }: { total: number }) {
  const { t } = useLingui();

  return (
    <p>
      {t`Total`}: ${total.toFixed(2)}
    </p>
  );
}

const Total = holo({
  models: { checkout: $$checkout },
  view: TotalView,
  read: ({ checkout }) => ({ total: checkout.$total }),
});

function SubmitView({ onSubmit }: { onSubmit: () => void }) {
  const { t } = useLingui();

  return <button onClick={onSubmit}>{t`Place order`}</button>;
}

const Submit = holo({
  models: { checkout: $$checkout },
  view: SubmitView,
  write: ({ checkout }) => ({ onSubmit: checkout.submit }),
});

function CheckoutView({
  imperative,
}: {
  imperative: HoloImperative<CheckoutHandle>;
}) {
  const { t } = useLingui();
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useImperativeHolo(imperative, { onOrderCreated: setReceipt });

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
      <Quantity />
      <Total />
      <Submit />
    </section>
  );
}

const Checkout = holo({
  models: { checkout: $$checkout },
  view: CheckoutView,

  imperative: ({ checkout }) => ({
    onOrderCreated: checkout.orderCreated,
  }),
});
// #endregion imperative

export default Checkout;
