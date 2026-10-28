import { actionAtom, eventAtom, holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createMutationModel } from 'jotai-holo/query';
import {
  saveProposalMO,
  type Proposal,
  type ProposalInput,
} from './proposal-api.js';
import { createProposalModel } from './proposal-model.js';
import { SaveProposalView } from './proposal-views.js';

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

  return { ...proposal, saving: $$proposalMutation, save, proposalSaved };
}
// #endregion saving-model

// #region plain-saving
const $$proposal = createSavingProposalModel({ proposalId: 'P-1042' });

export const SaveProposal = holo({
  view: SaveProposalView,
  read: {
    draft: $$proposal.$draft,
    total: $$proposal.$total,
    loading: $$proposal.$loading,
    error: $$proposal.$error,
    saving: $$proposal.saving.$pending,
    saveError: $$proposal.saving.$error,
  },
  write: { onChange: $$proposal.$draft, onSave: $$proposal.save },
});
// #endregion plain-saving

// #region keyed-saving
export const $$savingProposals = pipe(
  createSavingProposalModel,
  modelRegistry(),
);

export const KeyedSaveProposal = holo({
  models: {
    proposal: (props: { proposalId: string }) =>
      $$savingProposals({
        key: ['saving-proposal', props.proposalId],
        initial: { proposalId: props.proposalId },
      }),
  },
  view: SaveProposalView,
  read: ({ proposal }) => ({
    draft: proposal.$draft,
    total: proposal.$total,
    loading: proposal.$loading,
    error: proposal.$error,
    saving: proposal.saving.$pending,
    saveError: proposal.saving.$error,
  }),
  write: ({ proposal }) => ({
    onChange: proposal.$draft,
    onSave: proposal.save,
  }),
});
// #endregion keyed-saving
