import { actionAtom, eventAtom, holo, ion } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createMutationModel } from 'jotai-holo/query';
import {
  saveProposalMO,
  type Proposal,
  type ProposalInput,
} from './proposal-api.js';
import { createProposalModel } from './proposal-model.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  ProposalView,
  SeatsView,
  TotalView,
  SaveButtonView,
  SaveProposalView,
} from './proposal-views.js';

// #region saving-model
export function createSavingProposalModel(initial: ProposalInput) {
  const proposal = createProposalModel(initial);

  const $$proposalMutation = createMutationModel({
    mutation: saveProposalMO,
    prism: {
      $pending: (result) => result.isPending,
      $error: (result) => result.error,
    },
  });

  const proposalSaved = eventAtom<Proposal>();

  const save = actionAtom(async (get, set) => {
    const draft = get(proposal.$draft);
    if (!draft || get($$proposalMutation.$pending)) return;

    const submitted = { ...draft };
    try {
      const saved = await set($$proposalMutation.mutate, {
        id: initial.proposalId,
        draft: submitted,
      });
      set(proposalSaved, saved);
    } catch {
      // The mutation's error projection displays this failure.
    }
  });

  const $canSave = ion(
    { draft: proposal.$draft, pending: $$proposalMutation.$pending },
    ({ draft, pending }) => Boolean(draft) && !pending,
  );

  return {
    ...proposal,
    saving: $$proposalMutation,
    $canSave,
    save,
    proposalSaved,
  };
}
// #endregion saving-model

// #region plain-saving
const $$proposal = createSavingProposalModel({ proposalId: 'P-1042' });

const ProposalLayout = holo({
  view: ProposalView,
  read: { loading: $$proposal.$loading },
});

const Loading = holo({
  view: LoadingView,
  read: { showLoading: $$proposal.$showLoading },
});

const LoadError = holo({
  view: ErrorView,
  read: { error: $$proposal.$error },
});

const Seats = holo({
  view: SeatsView,
  read: { seats: $$proposal.$seats },
  write: { onSeats: $$proposal.$seats },
});

const Comment = holo({
  view: CommentView,
  read: { comment: $$proposal.$comment },
  write: { onComment: $$proposal.$comment },
});

const Total = holo({
  view: TotalView,
  read: { total: $$proposal.$displayTotal },
});

const SaveButton = holo({
  view: SaveButtonView,
  read: { saving: $$proposal.saving.$pending, canSave: $$proposal.$canSave },
  write: { onSave: $$proposal.save },
});

const SaveError = holo({
  view: ErrorView,
  read: { error: $$proposal.saving.$error },
});

export function SaveProposal() {
  return (
    <SaveProposalView>
      <ProposalLayout>
        <Loading />
        <LoadError />
        <Seats />
        <Comment />
        <Total />
      </ProposalLayout>
      <SaveButton />
      <SaveError />
    </SaveProposalView>
  );
}
// #endregion plain-saving

// #region keyed-saving
export const $$savingProposals = pipe(
  createSavingProposalModel,
  modelRegistry(),
);

const models = {
  proposal: (props: { proposalId: string }) =>
    $$savingProposals({
      key: ['saving-proposal', props.proposalId],
      initial: { proposalId: props.proposalId },
    }),
};

const KeyedProposalLayout = holo({
  models,
  view: ProposalView,
  read: ({ proposal }) => ({ loading: proposal.$loading }),
});

const KeyedLoading = holo({
  models,
  view: LoadingView,
  read: ({ proposal }) => ({ showLoading: proposal.$showLoading }),
});

const KeyedLoadError = holo({
  models,
  view: ErrorView,
  read: ({ proposal }) => ({ error: proposal.$error }),
});

const KeyedSeats = holo({
  models,
  view: SeatsView,
  read: ({ proposal }) => ({ seats: proposal.$seats }),
  write: ({ proposal }) => ({ onSeats: proposal.$seats }),
});

const KeyedComment = holo({
  models,
  view: CommentView,
  read: ({ proposal }) => ({ comment: proposal.$comment }),
  write: ({ proposal }) => ({ onComment: proposal.$comment }),
});

const KeyedTotal = holo({
  models,
  view: TotalView,
  read: ({ proposal }) => ({ total: proposal.$displayTotal }),
});

const KeyedSaveButton = holo({
  models,
  view: SaveButtonView,
  read: ({ proposal }) => ({
    saving: proposal.saving.$pending,
    canSave: proposal.$canSave,
  }),
  write: ({ proposal }) => ({ onSave: proposal.save }),
});

const KeyedSaveError = holo({
  models,
  view: ErrorView,
  read: ({ proposal }) => ({ error: proposal.saving.$error }),
});

export function KeyedSaveProposal({ proposalId }: { proposalId: string }) {
  return (
    <SaveProposalView>
      <KeyedProposalLayout proposalId={proposalId}>
        <KeyedLoading proposalId={proposalId} />
        <KeyedLoadError proposalId={proposalId} />
        <KeyedSeats proposalId={proposalId} />
        <KeyedComment proposalId={proposalId} />
        <KeyedTotal proposalId={proposalId} />
      </KeyedProposalLayout>
      <KeyedSaveButton proposalId={proposalId} />
      <KeyedSaveError proposalId={proposalId} />
    </SaveProposalView>
  );
}
// #endregion keyed-saving
