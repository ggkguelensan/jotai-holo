import type { createStore } from 'jotai';
import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { localStorageAdapter, persist } from 'jotai-holo/persist';
import { draftSchema, type GiftOrderInput } from './gift-order-api.js';
import { createGiftOrderModel } from './gift-order-model.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  GiftOrderView,
  CopiesView,
  TotalView,
  LocalGiftOrderView,
  LocalStatusView,
  FlushButtonView,
  LocalErrorView,
} from './gift-order-views.js';

// #region local-model
export function createLocalGiftOrderModel(initial: GiftOrderInput) {
  const giftOrder = createGiftOrderModel(initial);

  const disk = persist({
    read: giftOrder.$localDraft,
    restore: giftOrder.$localDraft,
    key: `gift-order-draft:${initial.giftOrderId}`,
    storage: localStorageAdapter(),
    codec: {
      decode: (value) => draftSchema.nullable().parse(value),
      encode: (value) => value,
    },
    save: { debounce: 300 },
  });

  return { ...giftOrder, disk };
}
// #endregion local-model

// #region plain-local-owner
const $$giftOrder = createLocalGiftOrderModel({ giftOrderId: 'P-1042' });

// Call once at browser application setup; call the disposer at teardown.
export function connectLocalDraft(store: ReturnType<typeof createStore>) {
  const stop = $$giftOrder.disk.connect(store);
  return () => {
    if (typeof stop === 'function') stop();
  };
}
// #endregion plain-local-owner

// #region plain-local-binding
const LocalLayout = holo({
  view: LocalGiftOrderView,
  read: { restoring: $$giftOrder.disk.$restoring },
});

const GiftOrderLayout = holo({
  view: GiftOrderView,
  read: { loading: $$giftOrder.$loading },
});

const Loading = holo({
  view: LoadingView,
  read: { showLoading: $$giftOrder.$showLoading },
});

const LoadError = holo({
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

const LocalStatus = holo({
  view: LocalStatusView,
  read: {
    restoring: $$giftOrder.disk.$restoring,
    saving: $$giftOrder.disk.$saving,
  },
});

const FlushButton = holo({
  view: FlushButtonView,
  write: { onFlush: $$giftOrder.disk.flush },
});

const LocalError = holo({
  view: LocalErrorView,
  read: { localError: $$giftOrder.disk.$error },
});

export function LocalGiftOrder() {
  return (
    <LocalLayout
      feedback={
        <>
          <LocalStatus />
          <FlushButton />
          <LocalError />
        </>
      }
    >
      <GiftOrderLayout>
        <Loading />
        <LoadError />
        <Copies />
        <Comment />
        <Total />
      </GiftOrderLayout>
    </LocalLayout>
  );
}
// #endregion plain-local-binding

// #region keyed-local
export const $$localGiftOrders = pipe(
  createLocalGiftOrderModel,
  modelRegistry(),
);

const models = {
  giftOrder: (props: { giftOrderId: string }) =>
    $$localGiftOrders({
      key: ['local-giftOrder', props.giftOrderId],
      initial: { giftOrderId: props.giftOrderId },
    }),
};

const KeyedLocalLayout = holo({
  models,
  view: LocalGiftOrderView,
  read: ({ giftOrder }) => ({ restoring: giftOrder.disk.$restoring }),
});

const KeyedGiftOrderLayout = holo({
  models,
  view: GiftOrderView,
  read: ({ giftOrder }) => ({ loading: giftOrder.$loading }),
});

const KeyedLoading = holo({
  models,
  view: LoadingView,
  read: ({ giftOrder }) => ({ showLoading: giftOrder.$showLoading }),
});

const KeyedLoadError = holo({
  models,
  view: ErrorView,
  read: ({ giftOrder }) => ({ error: giftOrder.$error }),
});

const KeyedCopies = holo({
  models,
  view: CopiesView,
  read: ({ giftOrder }) => ({ copies: giftOrder.$copies }),
  write: ({ giftOrder }) => ({ onCopies: giftOrder.$copies }),
});

const KeyedComment = holo({
  models,
  view: CommentView,
  read: ({ giftOrder }) => ({ comment: giftOrder.$comment }),
  write: ({ giftOrder }) => ({ onComment: giftOrder.$comment }),
});

const KeyedTotal = holo({
  models,
  view: TotalView,
  read: ({ giftOrder }) => ({ total: giftOrder.$displayTotal }),
});

const KeyedLocalStatus = holo({
  models,
  view: LocalStatusView,
  read: ({ giftOrder }) => ({
    restoring: giftOrder.disk.$restoring,
    saving: giftOrder.disk.$saving,
  }),
});

const KeyedFlushButton = holo({
  models,
  view: FlushButtonView,
  write: ({ giftOrder }) => ({ onFlush: giftOrder.disk.flush }),
});

const KeyedLocalError = holo({
  models,
  view: LocalErrorView,
  read: ({ giftOrder }) => ({ localError: giftOrder.disk.$error }),
});

export function KeyedLocalGiftOrder({ giftOrderId }: { giftOrderId: string }) {
  return (
    <KeyedLocalLayout
      giftOrderId={giftOrderId}
      feedback={
        <>
          <KeyedLocalStatus giftOrderId={giftOrderId} />
          <KeyedFlushButton giftOrderId={giftOrderId} />
          <KeyedLocalError giftOrderId={giftOrderId} />
        </>
      }
    >
      <KeyedGiftOrderLayout giftOrderId={giftOrderId}>
        <KeyedLoading giftOrderId={giftOrderId} />
        <KeyedLoadError giftOrderId={giftOrderId} />
        <KeyedCopies giftOrderId={giftOrderId} />
        <KeyedComment giftOrderId={giftOrderId} />
        <KeyedTotal giftOrderId={giftOrderId} />
      </KeyedGiftOrderLayout>
    </KeyedLocalLayout>
  );
}
// #endregion keyed-local
