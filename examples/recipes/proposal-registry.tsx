import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createProposalModel } from './proposal-model.js';
import { ProposalView } from './proposal-views.js';

// #region keyed-binding
export const $$proposals = pipe(createProposalModel, modelRegistry());

export const KeyedProposalEditor = holo({
  models: {
    proposal: (props: { proposalId: string }) =>
      $$proposals({
        key: ['proposal-editor', props.proposalId],
        initial: { proposalId: props.proposalId },
      }),
  },
  view: ProposalView,
  read: ({ proposal }) => ({
    draft: proposal.$draft,
    total: proposal.$total,
    loading: proposal.$loading,
    error: proposal.$error,
  }),
  write: ({ proposal }) => ({ onChange: proposal.$draft }),
});
// #endregion keyed-binding

// #region keyed-usage
export const atlas = <KeyedProposalEditor proposalId="P-1042" />;
export const beacon = <KeyedProposalEditor proposalId="P-2048" />;
// #endregion keyed-usage
