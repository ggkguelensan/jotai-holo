import { useLingui } from '@lingui/react/macro';
import { useAnimate } from 'motion/react';
import type { Ref } from 'react';
import { useImperativeHolo, type HoloImperative } from 'jotai-holo';
import type { Receipt } from './imperative-purchase.js';
import { ShareGame } from './imperative-share.js';

export function PurchaseButtonView({
  pending,
  onBuy,
}: {
  pending: boolean;
  onBuy: () => Promise<void>;
}) {
  const { t } = useLingui();
  return (
    <button disabled={pending} onClick={() => void onBuy().catch(() => {})}>
      {pending ? t`Completing purchase…` : t`Buy Starfall · $25`}
    </button>
  );
}

export function PurchaseErrorView({ error }: { error: Error | null }) {
  const { t } = useLingui();
  return error ? <p role="alert">{t`Purchase failed. Try again.`}</p> : null;
}

// #region receipt-handle
type ReceiptHandle = { onOrderCreated(receipt: Receipt): void };

export function ReceiptView({
  imperative,
  receipt,
}: {
  imperative: HoloImperative<ReceiptHandle>;
  receipt: Receipt | null;
}) {
  const { t } = useLingui();
  const [dialog, animate] = useAnimate<HTMLDialogElement>();

  function openReceipt() {
    if (!dialog.current) return;
    dialog.current.showModal();
    void animate(dialog.current, { opacity: [0, 1] }, { duration: 0.18 });
  }

  useImperativeHolo(imperative, { onOrderCreated: openReceipt });

  return (
    <>
      <button disabled={!receipt} onClick={openReceipt}>
        {t`View receipt`}
      </button>
      <ReceiptDialogView dialog={dialog} receipt={receipt} />
    </>
  );
}
// #endregion receipt-handle

function ReceiptDialogView({
  dialog,
  receipt,
}: {
  dialog: Ref<HTMLDialogElement>;
  receipt: Receipt | null;
}) {
  const { t } = useLingui();
  return (
    <dialog ref={dialog} className="demo-receipt" aria-label={t`Receipt`}>
      <h3>{t`Purchase complete`}</h3>
      {receipt && (
        <p>
          {receipt.title} · ${receipt.total} · #{receipt.orderId}
        </p>
      )}
      {receipt && (
        <ShareGame
          title={receipt.title}
          url="https://example.com/games/starfall"
        />
      )}
      <form method="dialog">
        <button>{t`Close receipt`}</button>
      </form>
    </dialog>
  );
}
