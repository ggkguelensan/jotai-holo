import { useLingui } from '@lingui/react/macro';
import { useAnimate } from 'motion/react';
import { useHoloEvents, type HoloEvents } from 'jotai-holo';
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

// #region receipt-handle
type ReceiptEvents = { onOrderCreated(receipt: Receipt): void };

export function PurchaseStatusView({
  events,
  receipt,
  pending,
  error,
}: {
  events: HoloEvents<ReceiptEvents>;
  receipt: Receipt | null;
  pending: boolean;
  error: Error | null;
}) {
  const { t } = useLingui();
  const [panel, animate] = useAnimate<HTMLElement>();

  useHoloEvents(events, {
    onOrderCreated() {
      if (!panel.current) return;
      void animate(panel.current, { opacity: [0.4, 1] }, { duration: 0.24 });
    },
  });

  return (
    <section
      ref={panel}
      className="demo-receipt"
      aria-label={t`Purchase status`}
      aria-live="polite"
      aria-busy={pending}
    >
      <ShareGame
        iconOnly
        title={receipt?.title ?? 'Starfall'}
        url="https://example.com/games/starfall"
      />
      <PurchaseStatusContentView
        receipt={receipt}
        pending={pending}
        error={error}
      />
    </section>
  );
}
// #endregion receipt-handle

function PurchaseStatusContentView({
  receipt,
  pending,
  error,
}: {
  receipt: Receipt | null;
  pending: boolean;
  error: Error | null;
}) {
  const { t } = useLingui();
  if (pending) return <p role="status">{t`Completing purchase…`}</p>;
  if (error) return <p role="alert">{t`Purchase failed. Try again.`}</p>;
  if (!receipt)
    return (
      <>
        <h3>{t`Ready to purchase`}</h3>
        <p>{t`Starfall`} · $25</p>
      </>
    );

  return (
    <>
      <h3>{t`Purchase complete`}</h3>
      <p>
        {receipt.title} · ${receipt.total} · #{receipt.orderId}
      </p>
    </>
  );
}
