import type { createStore } from 'jotai';
import { holo } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { localStorageAdapter, persist } from 'jotai-holo/persist';
import { draftSchema, type ProposalInput } from './proposal-api.js';
import { createProposalModel } from './proposal-model.js';
import {
  CommentView,
  ErrorView,
  LoadingView,
  ProposalView,
  SeatsView,
  TotalView,
  LocalProposalView,
  LocalStatusView,
  FlushButtonView,
  LocalErrorView,
} from './proposal-views.js';

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
const LocalLayout = holo({
  view: LocalProposalView,
  read: { restoring: $$proposal.disk.$restoring },
});

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

const LocalStatus = holo({
  view: LocalStatusView,
  read: {
    restoring: $$proposal.disk.$restoring,
    saving: $$proposal.disk.$saving,
  },
});

const FlushButton = holo({
  view: FlushButtonView,
  write: { onFlush: $$proposal.disk.flush },
});

const LocalError = holo({
  view: LocalErrorView,
  read: { localError: $$proposal.disk.$error },
});

export function LocalProposal() {
  return (
    <LocalLayout
      feedback={
        <>
          <LocalStatus />
          <FlushButton />
          <LocalError />
        </>
      }
    >
      <ProposalLayout>
        <Loading />
        <LoadError />
        <Seats />
        <Comment />
        <Total />
      </ProposalLayout>
    </LocalLayout>
  );
}
// #endregion plain-local-binding

// #region keyed-local
export const $$localProposals = pipe(createLocalProposalModel, modelRegistry());

const models = {
  proposal: (props: { proposalId: string }) =>
    $$localProposals({
      key: ['local-proposal', props.proposalId],
      initial: { proposalId: props.proposalId },
    }),
};

const KeyedLocalLayout = holo({
  models,
  view: LocalProposalView,
  read: ({ proposal }) => ({ restoring: proposal.disk.$restoring }),
});

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

const KeyedLocalStatus = holo({
  models,
  view: LocalStatusView,
  read: ({ proposal }) => ({
    restoring: proposal.disk.$restoring,
    saving: proposal.disk.$saving,
  }),
});

const KeyedFlushButton = holo({
  models,
  view: FlushButtonView,
  write: ({ proposal }) => ({ onFlush: proposal.disk.flush }),
});

const KeyedLocalError = holo({
  models,
  view: LocalErrorView,
  read: ({ proposal }) => ({ localError: proposal.disk.$error }),
});

export function KeyedLocalProposal({ proposalId }: { proposalId: string }) {
  return (
    <KeyedLocalLayout
      proposalId={proposalId}
      feedback={
        <>
          <KeyedLocalStatus proposalId={proposalId} />
          <KeyedFlushButton proposalId={proposalId} />
          <KeyedLocalError proposalId={proposalId} />
        </>
      }
    >
      <KeyedProposalLayout proposalId={proposalId}>
        <KeyedLoading proposalId={proposalId} />
        <KeyedLoadError proposalId={proposalId} />
        <KeyedSeats proposalId={proposalId} />
        <KeyedComment proposalId={proposalId} />
        <KeyedTotal proposalId={proposalId} />
      </KeyedProposalLayout>
    </KeyedLocalLayout>
  );
}
// #endregion keyed-local
