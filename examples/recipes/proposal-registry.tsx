import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { createProposalModel } from './proposal-model.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  ProposalView,
  SeatsView,
  TotalView,
} from './proposal-views.js';

// #region keyed-binding
export const $$proposals = pipe(createProposalModel, modelRegistry());

const models = {
  proposal: (props: { proposalId: string }) =>
    $$proposals({
      key: ['proposal-editor', props.proposalId],
      initial: { proposalId: props.proposalId },
    }),
};

const ProposalLayout = holo({
  models,
  view: ProposalView,
  read: ({ proposal }) => ({ loading: proposal.$loading }),
});

const Loading = holo({
  models,
  view: LoadingView,
  read: ({ proposal }) => ({ showLoading: proposal.$showLoading }),
});

const Error = holo({
  models,
  view: ErrorView,
  read: ({ proposal }) => ({ error: proposal.$error }),
});

const Seats = holo({
  models,
  view: SeatsView,
  read: ({ proposal }) => ({ seats: proposal.$seats }),
  write: ({ proposal }) => ({ onSeats: proposal.$seats }),
});

const Comment = holo({
  models,
  view: CommentView,
  read: ({ proposal }) => ({ comment: proposal.$comment }),
  write: ({ proposal }) => ({ onComment: proposal.$comment }),
});

const Total = holo({
  models,
  view: TotalView,
  read: ({ proposal }) => ({ total: proposal.$displayTotal }),
});

export function KeyedProposalEditor({ proposalId }: { proposalId: string }) {
  return (
    <ProposalLayout proposalId={proposalId}>
      <Loading proposalId={proposalId} />
      <Error proposalId={proposalId} />
      <Seats proposalId={proposalId} />
      <Comment proposalId={proposalId} />
      <Total proposalId={proposalId} />
    </ProposalLayout>
  );
}
// #endregion keyed-binding

// #region keyed-usage
export const atlas = <KeyedProposalEditor proposalId="P-1042" />;
export const beacon = <KeyedProposalEditor proposalId="P-2048" />;
// #endregion keyed-usage
