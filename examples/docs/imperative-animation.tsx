import { useLingui } from '@lingui/react/macro';
import { useRef } from 'react';
import {
  eventAtom,
  holo,
  useImperativeHolo,
  type HoloImperative,
} from 'jotai-holo';

// #region animation
export const cartAttentionRequested = eventAtom<void>();

type CartHandle = { highlightCart(): void };

function CartView({ imperative }: { imperative: HoloImperative<CartHandle> }) {
  const { t } = useLingui();
  const cart = useRef<HTMLOutputElement>(null);

  useImperativeHolo(imperative, {
    highlightCart() {
      const node = cart.current;
      if (!node || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      node.getAnimations().forEach((animation) => animation.cancel());
      node.animate(
        { transform: ['scale(1)', 'scale(1.08)', 'scale(1)'] },
        { duration: 300, easing: 'ease-out' },
      );
    },
  });

  return <output ref={cart}>{t`Your cart · 2 games`}</output>;
}

const Cart = holo({
  view: CartView,
  imperative: { highlightCart: cartAttentionRequested },
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
