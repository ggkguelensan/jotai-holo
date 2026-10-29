import { holo, ion, stateAtom } from 'jotai-holo';
import { createQueryModel } from 'jotai-holo/query';
import {
  giftOrderDetailQO,
  toDraft,
  type GiftOrderDraft,
  type GiftOrderInput,
} from './gift-order-api.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  GiftOrderView,
  CopiesView,
  TotalView,
} from './gift-order-views.js';

// #region server-model
export function createGiftOrderModel(initial: GiftOrderInput) {
  const $$giftOrderQuery = createQueryModel({
    query: () => giftOrderDetailQO(initial),
    prism: {
      $giftOrder: (result) => result.data,
      $loading: (result) => result.isPending,
      $error: (result) => result.error,
    },
  });

  const $localDraft = stateAtom<GiftOrderDraft | null>(null);

  const $draft = stateAtom(
    (get) => {
      const local = get($localDraft);
      if (local) return local;
      const giftOrder = get($$giftOrderQuery.$giftOrder);
      return giftOrder ? toDraft(giftOrder) : null;
    },
    (_get, set, value: GiftOrderDraft) => set($localDraft, value),
  );

  const $copies = stateAtom(
    (get) => get($draft)?.copies ?? null,
    (get, set, copies: number) => {
      const draft = get($draft);
      if (draft) set($draft, { ...draft, copies });
    },
  );

  const $comment = stateAtom(
    (get) => get($draft)?.comment ?? null,
    (get, set, comment: string) => {
      const draft = get($draft);
      if (draft) set($draft, { ...draft, comment });
    },
  );

  const $total = ion(
    { giftOrder: $$giftOrderQuery.$giftOrder, draft: $draft },
    ({ giftOrder, draft }) =>
      giftOrder && draft ? giftOrder.copyPrice * draft.copies : 0,
  );

  const $showLoading = ion(
    { loading: $$giftOrderQuery.$loading, draft: $draft },
    ({ loading, draft }) => loading && !draft,
  );

  const $displayTotal = ion(
    { draft: $draft, total: $total },
    ({ draft, total }) => (draft ? total : null),
  );

  return {
    ...$$giftOrderQuery,
    $localDraft,
    $draft,
    $copies,
    $comment,
    $total,
    $showLoading,
    $displayTotal,
  };
}
// #endregion server-model

// #region plain-binding
const $$giftOrder = createGiftOrderModel({ giftOrderId: 'P-1042' });

const GiftOrderLayout = holo({
  view: GiftOrderView,
  read: { loading: $$giftOrder.$loading },
});

const Loading = holo({
  view: LoadingView,
  read: { showLoading: $$giftOrder.$showLoading },
});

const Error = holo({
  view: ErrorView,
  read: { error: $$giftOrder.$error },
});

const Copies = holo({
  view: CopiesView,
  read: { copies: $$giftOrder.$copies },
  write: { onCopies: $$giftOrder.$copies },
});

const Comment = holo({
  view: CommentView,
  read: { comment: $$giftOrder.$comment },
  write: { onComment: $$giftOrder.$comment },
});

const Total = holo({
  view: TotalView,
  read: { total: $$giftOrder.$displayTotal },
});

export function GiftOrderEditor() {
  return (
    <GiftOrderLayout>
      <Loading />
      <Error />
      <Copies />
      <Comment />
      <Total />
    </GiftOrderLayout>
  );
}
// #endregion plain-binding
