import { holo, ion, stateAtom } from 'jotai-holo';
import { createQueryModel } from 'jotai-holo/query';
import {
  proposalDetailQO,
  toDraft,
  type ProposalDraft,
  type ProposalInput,
} from './proposal-api.js';
import { ProposalView } from './proposal-views.js';

// #region server-model
export function createProposalModel(initial: ProposalInput) {
  const $$proposalQuery = createQueryModel({
    query: () => proposalDetailQO(initial),
    prism: {
      $proposal: (result) => result.data,
      $loading: (result) => result.isPending,
      $error: (result) => result.error,
    },
  });

  const $localDraft = stateAtom<ProposalDraft | null>(null);

  const $draft = stateAtom(
    (get) => {
      const local = get($localDraft);
      if (local) return local;
      const proposal = get($$proposalQuery.$proposal);
      return proposal ? toDraft(proposal) : null;
    },
    (_get, set, value: ProposalDraft) => set($localDraft, value),
  );

  const $total = ion(
    { proposal: $$proposalQuery.$proposal, draft: $draft },
    ({ proposal, draft }) =>
      proposal && draft ? proposal.seatPrice * draft.seats : 0,
  );

  return { ...$$proposalQuery, $localDraft, $draft, $total };
}
// #endregion server-model

// #region plain-binding
const $$proposal = createProposalModel({ proposalId: 'P-1042' });

export const ProposalEditor = holo({
  view: ProposalView,
  read: {
    draft: $$proposal.$draft,
    total: $$proposal.$total,
    loading: $$proposal.$loading,
    error: $$proposal.$error,
  },
  write: { onChange: $$proposal.$draft },
});
// #endregion plain-binding
