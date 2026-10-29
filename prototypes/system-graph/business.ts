import { actionAtom, eventAtom, ion, stateAtom } from 'jotai-holo';

export type Game = { id: string; name: string; price: number };
export type Receipt = { orderId: string; game: string; email: string; total: number };

export function createGiftModel() {
  const $game = stateAtom<Game | null>(null);
  const $copies = stateAtom(1);
  const $total = ion(
    { game: $game, copies: $copies },
    ({ game, copies }) => (game?.price ?? 0) * copies,
  );
  const $receipt = stateAtom<Receipt | null>(null);
  const purchaseCompleted = eventAtom<Receipt>();

  const receive = actionAtom((_get, set, game: Game) => set($game, game));
  const complete = actionAtom((_get, set, receipt: Receipt) => {
    set($receipt, receipt);
    set(purchaseCompleted, receipt);
  });

  return { $game, $copies, $total, $receipt, purchaseCompleted, receive, complete };
}
export type GiftModel = ReturnType<typeof createGiftModel>;
