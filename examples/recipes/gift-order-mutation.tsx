import { actionAtom, eventAtom, holo, ion } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createMutationModel } from 'jotai-holo/query';
import {
  saveGiftOrderMO,
  type GiftOrder,
  type GiftOrderInput,
} from './gift-order-api.js';
import { createGiftOrderModel } from './gift-order-model.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  GiftOrderView,
  CopiesView,
  TotalView,
  SaveButtonView,
  SaveGiftOrderView,
} from './gift-order-views.js';

// #region saving-model
export function createSavingGiftOrderModel(initial: GiftOrderInput) {
  const giftOrder = createGiftOrderModel(initial);

  const $$giftOrderMutation = createMutationModel({
    mutation: saveGiftOrderMO,
    prism: {
      $pending: (result) => result.isPending,
      $error: (result) => result.error,
    },
  });

  const giftOrderSaved = eventAtom<GiftOrder>();

  const save = actionAtom(async (get, set) => {
    const draft = get(giftOrder.$draft);
    if (!draft || get($$giftOrderMutation.$pending)) return;

    const submitted = { ...draft };
    try {
      const saved = await set($$giftOrderMutation.mutate, {
        id: initial.giftOrderId,
        draft: submitted,
      });
      set(giftOrderSaved, saved);
    } catch {
      // The mutation's error projection displays this failure.
    }
  });

  const $canSave = ion(
    { draft: giftOrder.$draft, pending: $$giftOrderMutation.$pending },
    ({ draft, pending }) => Boolean(draft) && !pending,
  );

  return {
    ...giftOrder,
    saving: $$giftOrderMutation,
    $canSave,
    save,
    giftOrderSaved,
  };
}
// #endregion saving-model

// #region plain-saving
const $$giftOrder = createSavingGiftOrderModel({ giftOrderId: 'P-1042' });

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

const SaveButton = holo({
  view: SaveButtonView,
  read: { saving: $$giftOrder.saving.$pending, canSave: $$giftOrder.$canSave },
  write: { onSave: $$giftOrder.save },
});

const SaveError = holo({
  view: ErrorView,
  read: { error: $$giftOrder.saving.$error },
});

export function SaveGiftOrder() {
  return (
    <SaveGiftOrderView>
      <GiftOrderLayout>
        <Loading />
        <LoadError />
        <Copies />
        <Comment />
        <Total />
      </GiftOrderLayout>
      <SaveButton />
      <SaveError />
    </SaveGiftOrderView>
  );
}
// #endregion plain-saving

// #region keyed-saving
export const $$savingGiftOrders = pipe(
  createSavingGiftOrderModel,
  modelRegistry(),
);

const models = {
  giftOrder: (props: { giftOrderId: string }) =>
    $$savingGiftOrders({
      key: ['saving-giftOrder', props.giftOrderId],
      initial: { giftOrderId: props.giftOrderId },
    }),
};

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

const KeyedSaveButton = holo({
  models,
  view: SaveButtonView,
  read: ({ giftOrder }) => ({
    saving: giftOrder.saving.$pending,
    canSave: giftOrder.$canSave,
  }),
  write: ({ giftOrder }) => ({ onSave: giftOrder.save }),
});

const KeyedSaveError = holo({
  models,
  view: ErrorView,
  read: ({ giftOrder }) => ({ error: giftOrder.saving.$error }),
});

export function KeyedSaveGiftOrder({ giftOrderId }: { giftOrderId: string }) {
  return (
    <SaveGiftOrderView>
      <KeyedGiftOrderLayout giftOrderId={giftOrderId}>
        <KeyedLoading giftOrderId={giftOrderId} />
        <KeyedLoadError giftOrderId={giftOrderId} />
        <KeyedCopies giftOrderId={giftOrderId} />
        <KeyedComment giftOrderId={giftOrderId} />
        <KeyedTotal giftOrderId={giftOrderId} />
      </KeyedGiftOrderLayout>
      <KeyedSaveButton giftOrderId={giftOrderId} />
      <KeyedSaveError giftOrderId={giftOrderId} />
    </SaveGiftOrderView>
  );
}
// #endregion keyed-saving
