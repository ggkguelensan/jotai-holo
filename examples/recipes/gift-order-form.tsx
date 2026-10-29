import { useFormContext, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createFormModel, holoForm } from 'jotai-holo/rhf';
import {
  draftSchema,
  toDraft,
  type GiftOrder,
  type GiftOrderDraft,
} from './gift-order-api.js';
import { createGiftOrderModel } from './gift-order-model.js';

// #region form-model
function createGiftOrderFormModel(giftOrder: GiftOrder) {
  const defaults = toDraft(giftOrder);
  const createForm = createFormModel<GiftOrderDraft>({
    initial: defaults,
    options: (values) => ({
      defaultValues: values,
      resolver: zodResolver(draftSchema),
      mode: 'onChange',
    }),
  });

  return createForm(defaults);
}

const $$giftOrderForms = pipe(createGiftOrderFormModel, modelRegistry());
// #endregion form-model

// #region form-view
function CopiesField() {
  const { register, control } = useFormContext<GiftOrderDraft>();
  const { errors } = useFormState({ control, name: 'copies', exact: true });

  return (
    <>
      <label>
        Copies
        <input
          type="number"
          {...register('copies', {
            valueAsNumber: true,
          })}
        />
      </label>
      {errors.copies && <p role="alert">Enter at least one copy.</p>}
    </>
  );
}

function CommentField() {
  const { register } = useFormContext<GiftOrderDraft>();

  return (
    <label>
      Gift message
      <textarea {...register('comment')} />
    </label>
  );
}

function GiftOrderFormView() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <CopiesField />
      <CommentField />
    </form>
  );
}
// #endregion form-view

// #region form-binding
const GiftOrderForm = holoForm({
  models: {
    editor: (props: { giftOrder: GiftOrder; editorId: string }) =>
      $$giftOrderForms({
        key: ['gift-order-form', props.giftOrder.id, props.editorId],
        initial: props.giftOrder,
      }),
  },
  form: ({ editor }) => editor.form,
  view: GiftOrderFormView,
});
// #endregion form-binding

// #region form-loading
function FormLoaderView({
  giftOrder,
  error,
  editorId,
}: {
  giftOrder: GiftOrder | undefined;
  error: Error | null;
  editorId: string;
}) {
  if (!giftOrder) {
    return (
      <p role={error ? 'alert' : 'status'}>
        {error ? error.message : 'Loading gift order…'}
      </p>
    );
  }
  return (
    <>
      {error && <p role="alert">{error.message}</p>}
      <GiftOrderForm giftOrder={giftOrder} editorId={editorId} />
    </>
  );
}

const $$source = createGiftOrderModel({ giftOrderId: 'P-1042' });

export const ServerGiftOrderForm = holo({
  view: FormLoaderView,
  read: { giftOrder: $$source.$giftOrder, error: $$source.$error },
});
// #endregion form-loading
