import { useFormContext, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createFormModel, holoForm } from 'jotai-holo/rhf';
import {
  draftSchema,
  toDraft,
  type Proposal,
  type ProposalDraft,
} from './proposal-api.js';
import { createProposalModel } from './proposal-model.js';

// #region form-model
function createProposalFormModel(proposal: Proposal) {
  const defaults = toDraft(proposal);
  const createForm = createFormModel<ProposalDraft>({
    initial: defaults,
    options: (values) => ({
      defaultValues: values,
      resolver: zodResolver(draftSchema),
      mode: 'onChange',
    }),
  });

  return createForm(defaults);
}

const $$proposalForms = pipe(createProposalFormModel, modelRegistry());
// #endregion form-model

// #region form-view
function SeatsField() {
  const { register, control } = useFormContext<ProposalDraft>();
  const { errors } = useFormState({ control, name: 'seats', exact: true });

  return (
    <>
      <label>
        Seats
        <input
          type="number"
          {...register('seats', {
            valueAsNumber: true,
          })}
        />
      </label>
      {errors.seats && <p role="alert">Enter at least one seat.</p>}
    </>
  );
}

function CommentField() {
  const { register } = useFormContext<ProposalDraft>();

  return (
    <label>
      Customer comment
      <textarea {...register('comment')} />
    </label>
  );
}

function ProposalFormView() {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <SeatsField />
      <CommentField />
    </form>
  );
}
// #endregion form-view

// #region form-binding
const ProposalForm = holoForm({
  models: {
    editor: (props: { proposal: Proposal; editorId: string }) =>
      $$proposalForms({
        key: ['proposal-form', props.proposal.id, props.editorId],
        initial: props.proposal,
      }),
  },
  form: ({ editor }) => editor.form,
  view: ProposalFormView,
});
// #endregion form-binding

// #region form-loading
function FormLoaderView({
  proposal,
  error,
  editorId,
}: {
  proposal: Proposal | undefined;
  error: Error | null;
  editorId: string;
}) {
  if (!proposal) {
    return (
      <p role={error ? 'alert' : 'status'}>
        {error ? error.message : 'Loading proposal…'}
      </p>
    );
  }
  return (
    <>
      {error && <p role="alert">{error.message}</p>}
      <ProposalForm proposal={proposal} editorId={editorId} />
    </>
  );
}

const $$source = createProposalModel({ proposalId: 'P-1042' });

export const ServerProposalForm = holo({
  view: FormLoaderView,
  read: { proposal: $$source.$proposal, error: $$source.$error },
});
// #endregion form-loading
