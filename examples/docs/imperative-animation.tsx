import { useLingui } from '@lingui/react/macro';
import { useRef } from 'react';
import { useAnimate } from 'motion/react';
import { eventAtom, holo, useHoloEvents, type HoloEvents } from 'jotai-holo';

// #region animation
export const cartAttentionRequested = eventAtom<void>();

type CartEvents = { highlightCart(): void };

function CartView({ events }: { events: HoloEvents<CartEvents> }) {
  const { t } = useLingui();
  const [cart, animate] = useAnimate<HTMLOutputElement>();
  const animation = useRef<ReturnType<typeof animate> | null>(null);

  useHoloEvents(events, {
    highlightCart() {
      const node = cart.current;
      if (!node || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      animation.current?.stop();
      animation.current = animate(
        node,
        { transform: ['scale(1)', 'scale(1.08)', 'scale(1)'] },
        { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
      );
    },
  });

  return <output ref={cart}>{t`Your cart · 2 games`}</output>;
}

const Cart = holo({
  view: CartView,
  events: { highlightCart: cartAttentionRequested },
});
// #endregion animation

function HighlightButtonView({ onHighlight }: { onHighlight: () => void }) {
  const { t } = useLingui();
  return <button onClick={onHighlight}>{t`Highlight cart`}</button>;
}

const HighlightButton = holo({
  view: HighlightButtonView,
  write: { onHighlight: cartAttentionRequested },
});

export default function AnimationDemo() {
  return (
    <div className="demo-form">
      <Cart />
      <HighlightButton />
    </div>
  );
}
