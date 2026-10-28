import { useLingui } from '@lingui/react/macro';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { actionAtom, bond, eventAtom, holo, stateAtom } from 'jotai-holo';

// #region bond
export const $$checkout = pipe(() => {
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
    yield: $receipt,
  });

  return { $enabled, $receipt, submit, receipt };
}, modelRegistry());

function CheckoutView({
  enabled,
  message,
  onEnabled,
  onSubmit,
}: {
  enabled: boolean;
  message: number | null;
  onEnabled: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t`A fact → a separate reaction`}</span>
      <label className="demo-checkbox">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabled(e.target.checked)}
        />
        {t`Generate receipt`}
      </label>
      <button type="button" onClick={() => onSubmit()}>
        {t`Submit demo order`}
      </button>
      <output aria-live="polite">
        {message === null
          ? t`No receipts yet`
          : `${t`Receipt for order`} #${message}`}
      </output>
      <p className="demo-note">
        {t`Local simulation: no payment or network request.`}
      </p>
    </div>
  );
}

const Checkout = holo({
  models: { model: $$checkout },
  view: CheckoutView,
  read: ({ model: model }) => ({
    enabled: model.$enabled,
    message: model.$receipt,
  }),
  write: ({ model: model }) => ({
    onEnabled: model.$enabled,
    onSubmit: model.submit,
  }),
});

// #endregion bond

export default Checkout;
