import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createGiftOrderModel } from './gift-order-model.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  GiftOrderView,
  CopiesView,
  TotalView,
} from './gift-order-views.js';

// #region keyed-binding
export const $$giftOrders = pipe(createGiftOrderModel, modelRegistry());

const models = {
  giftOrder: (props: { giftOrderId: string }) =>
    $$giftOrders({
      key: ['gift-order-editor', props.giftOrderId],
      initial: { giftOrderId: props.giftOrderId },
    }),
};

const GiftOrderLayout = holo({
  models,
  view: GiftOrderView,
  read: ({ giftOrder }) => ({ loading: giftOrder.$loading }),
});

const Loading = holo({
  models,
  view: LoadingView,
  read: ({ giftOrder }) => ({ showLoading: giftOrder.$showLoading }),
});

const Error = holo({
  models,
  view: ErrorView,
  read: ({ giftOrder }) => ({ error: giftOrder.$error }),
});

const Copies = holo({
  models,
  view: CopiesView,
  read: ({ giftOrder }) => ({ copies: giftOrder.$copies }),
  write: ({ giftOrder }) => ({ onCopies: giftOrder.$copies }),
});

const Comment = holo({
  models,
  view: CommentView,
  read: ({ giftOrder }) => ({ comment: giftOrder.$comment }),
  write: ({ giftOrder }) => ({ onComment: giftOrder.$comment }),
});

const Total = holo({
  models,
  view: TotalView,
  read: ({ giftOrder }) => ({ total: giftOrder.$displayTotal }),
});

export function KeyedGiftOrderEditor({ giftOrderId }: { giftOrderId: string }) {
  return (
    <GiftOrderLayout giftOrderId={giftOrderId}>
      <Loading giftOrderId={giftOrderId} />
      <Error giftOrderId={giftOrderId} />
      <Copies giftOrderId={giftOrderId} />
      <Comment giftOrderId={giftOrderId} />
      <Total giftOrderId={giftOrderId} />
    </GiftOrderLayout>
  );
}
// #endregion keyed-binding

// #region keyed-usage
export function GiftOrdersPage() {
  return (
    <>
      <KeyedGiftOrderEditor giftOrderId="P-1042" />
      <KeyedGiftOrderEditor giftOrderId="P-2048" />
    </>
  );
}
// #endregion keyed-usage
