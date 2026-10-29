import { holo, ion, stateAtom } from 'jotai-holo';
import { createQueryModel } from 'jotai-holo/query';
import {
  proposalDetailQO,
  toDraft,
  type ProposalDraft,
  type ProposalInput,
} from './proposal-api.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  ProposalView,
  SeatsView,
  TotalView,
} from './proposal-views.js';

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

  const $seats = stateAtom(
    (get) => get($draft)?.seats ?? null,
    (get, set, seats: number) => {
      const draft = get($draft);
      if (draft) set($draft, { ...draft, seats });
    },
  );

  const $comment = stateAtom(
    (get) => get($draft)?.comment ?? null,
    (get, set, comment: string) => {
      const draft = get($draft);
      if (draft) set($draft, { ...draft, comment });
    },
  );

  const $total = ion(
    { proposal: $$proposalQuery.$proposal, draft: $draft },
    ({ proposal, draft }) =>
      proposal && draft ? proposal.seatPrice * draft.seats : 0,
  );

  const $showLoading = ion(
    { loading: $$proposalQuery.$loading, draft: $draft },
    ({ loading, draft }) => loading && !draft,
  );

  const $displayTotal = ion(
    { draft: $draft, total: $total },
    ({ draft, total }) => (draft ? total : null),
  );

  return {
    ...$$proposalQuery,
    $localDraft,
    $draft,
    $seats,
    $comment,
    $total,
    $showLoading,
    $displayTotal,
  };
}
// #endregion server-model

// #region plain-binding
const $$proposal = createProposalModel({ proposalId: 'P-1042' });

const ProposalLayout = holo({
  view: ProposalView,
  read: { loading: $$proposal.$loading },
});

const Loading = holo({
  view: LoadingView,
  read: { showLoading: $$proposal.$showLoading },
});

const Error = holo({
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

export function ProposalEditor() {
  return (
    <ProposalLayout>
      <Loading />
      <Error />
      <Seats />
      <Comment />
      <Total />
    </ProposalLayout>
  );
}
// #endregion plain-binding
