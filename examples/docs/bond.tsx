import { useLingui } from '@lingui/react/macro';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { actionAtom, bond, eventAtom, holo, stateAtom } from 'jotai-holo';

// #region bond
function createCheckoutModel() {
  const orderSubmitted = eventAtom<{ number: number }>();

  const $number = stateAtom(100);
  const $enabled = stateAtom(true);
  const $receipt = stateAtom<number | null>(null);

  const submit = actionAtom((get, set) => {
    const number = get($number);
    set($number, number + 1); // Local demo checkout completes here.
    set(orderSubmitted, { number });
  });

  const receipt = bond({
    trigger: orderSubmitted,
    guard: $enabled,
    map: (order) => [order.number],
    write: $receipt,
  });

  return { $enabled, $receipt, submit, receipt };
}

export const $$checkout = pipe(createCheckoutModel, modelRegistry());

function ReceiptOptionView({
  enabled,
  onEnabled,
}: {
  enabled: boolean;
  onEnabled: (value: boolean) => void;
}) {
  const { t } = useLingui();

  return (
    <label className="demo-checkbox">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onEnabled(e.target.checked)}
      />
      {t`Generate receipt`}
    </label>
  );
}

const ReceiptOption = holo({
  models: { checkout: $$checkout },
  view: ReceiptOptionView,
  read: ({ checkout }) => ({ enabled: checkout.$enabled }),
  write: ({ checkout }) => ({ onEnabled: checkout.$enabled }),
});

function SubmitOrderView({ onSubmit }: { onSubmit: () => void }) {
  const { t } = useLingui();

  return (
    <button type="button" onClick={() => onSubmit()}>
      {t`Buy gift copies`}
    </button>
  );
}

const SubmitOrder = holo({
  models: { checkout: $$checkout },
  view: SubmitOrderView,
  write: ({ checkout }) => ({ onSubmit: checkout.submit }),
});

function ReceiptView({ message }: { message: number | null }) {
  const { t } = useLingui();

  return (
    <output aria-live="polite">
      {message === null
        ? t`No receipts yet`
        : `${t`Receipt for order`} #${message}`}
    </output>
  );
}

const Receipt = holo({
  models: { checkout: $$checkout },
  view: ReceiptView,
  read: ({ checkout }) => ({ message: checkout.$receipt }),
});

function Checkout() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`A fact → a separate reaction`}</span>
      <ReceiptOption />
      <SubmitOrder />
      <Receipt />
      <p className="demo-note">
        {t`Local simulation: no payment or network request.`}
      </p>
    </div>
  );
}

// #endregion bond

export default Checkout;
