import { useLingui } from '@lingui/react';
import { useStore } from 'jotai';
import { useEffect } from 'react';
import { actionAtom, bond, eventAtom, holo, stateAtom } from 'jotai-holo';

// #region bond
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
  const { _: t } = useLingui();

  return (
    <div className="demo-form">
      <span className="demo-eyebrow">{t('A fact → a separate reaction')}</span>
      <label className="demo-checkbox">
        <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
        {t('Generate receipt')}
      </label>
      <button type="button" onClick={() => onSubmit()}>
        {t('Submit demo order')}
      </button>
      <output aria-live="polite">
        {message === null ? t('No receipts yet') : `${t('Receipt for order')} #${message}`}
      </output>
      <p className="demo-note">{t('Local simulation: no payment or network request.')}</p>
    </div>
  );
}

const Checkout = holo({
  core: CheckoutView,
  state: { enabled: $enabled, message: $receipt },
  actions: { onEnabled: $enabled, onSubmit: submit },
});

function OwnedCheckout() {
  const store = useStore();
  useEffect(() => receipt.connect(store), [store]);

  return <Checkout />;
}
// #endregion bond

export default OwnedCheckout;
