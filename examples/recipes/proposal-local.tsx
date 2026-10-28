import type { createStore } from 'jotai';
import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { localStorageAdapter, persist } from 'jotai-holo/persist';
import { draftSchema, type ProposalInput } from './proposal-api.js';
import { createProposalModel } from './proposal-model.js';
import { LocalProposalView } from './proposal-views.js';

// #region local-model
export function createLocalProposalModel(initial: ProposalInput) {
  const proposal = createProposalModel(initial);

  const disk = persist({
    read: proposal.$localDraft,
    restore: proposal.$localDraft,
    key: `proposal-draft:${initial.proposalId}`,
    storage: localStorageAdapter(),
    codec: {
      decode: (value) => draftSchema.nullable().parse(value),
      encode: (value) => value,
    },
    save: { debounce: 300 },
  });

  return { ...proposal, disk };
}
// #endregion local-model

// #region plain-local-owner
const $$proposal = createLocalProposalModel({ proposalId: 'P-1042' });

// Call once at browser application setup; call the disposer at teardown.
export function connectLocalDraft(store: ReturnType<typeof createStore>) {
  const stop = $$proposal.disk.connect(store);
  return () => {
    if (typeof stop === 'function') stop();
  };
}
// #endregion plain-local-owner

// #region plain-local-binding
export const LocalProposal = holo({
  view: LocalProposalView,
  read: {
    draft: $$proposal.$draft,
    total: $$proposal.$total,
    loading: $$proposal.$loading,
    error: $$proposal.$error,
    restoring: $$proposal.disk.$restoring,
    saving: $$proposal.disk.$saving,
    localError: $$proposal.disk.$error,
  },
  write: {
    onChange: $$proposal.$draft,
    onFlush: $$proposal.disk.flush,
  },
});
// #endregion plain-local-binding

// #region keyed-local
export const $$localProposals = pipe(createLocalProposalModel, modelRegistry());

export const KeyedLocalProposal = holo({
  models: {
    proposal: (props: { proposalId: string }) =>
      $$localProposals({
        key: ['local-proposal', props.proposalId],
        initial: { proposalId: props.proposalId },
      }),
  },
  view: LocalProposalView,
  read: ({ proposal }) => ({
    draft: proposal.$draft,
    total: proposal.$total,
    loading: proposal.$loading,
    error: proposal.$error,
    restoring: proposal.disk.$restoring,
    saving: proposal.disk.$saving,
    localError: proposal.disk.$error,
  }),
  write: ({ proposal }) => ({
    onChange: proposal.$draft,
    onFlush: proposal.disk.flush,
  }),
});
// #endregion keyed-local
