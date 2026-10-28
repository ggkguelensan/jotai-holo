import { useLingui } from '@lingui/react/macro';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { modelRegistry, pipe } from 'jotai-holo/model';

// #region model
const $$proposal = pipe(() => {
  const $seats = stateAtom(5);

  const addSeat = actionAtom((_get, set) => set($seats, (n) => n + 1));
  return { $seats, addSeat };
}, modelRegistry());
// Both bindings select the same instance without a scope provider.

function SeatsView({ count }: { count: number }) {
  return <output className="demo-number">{count}</output>;
}

const Seats = holo({
  models: {
    model: (props: { proposalId: string }) =>
      $$proposal({ key: ['proposal', { id: props.proposalId }] }),
  },
  view: SeatsView,
  read: ({ model: m }) => ({ count: m.$seats }),
});

function ToolbarView({ onAdd }: { onAdd: () => void }) {
  const { t } = useLingui();

  return <button onClick={onAdd}>{t`Add a seat`}</button>;
}

const Toolbar = holo({
  models: {
    model: (props: { proposalId: string }) =>
      $$proposal({ key: ['proposal', { id: props.proposalId }] }),
  },
  view: ToolbarView,
  write: ({ model: m }) => ({ onAdd: m.addSeat }),
});

function ProposalDemo() {
  const { t } = useLingui();

  return (
    <div className="demo-form">
      {['Atlas', 'Beacon'].map((id) => {
        return (
          <section key={id}>
            <span className="demo-eyebrow">
              {t`Proposal`} {id}
            </span>
            <Seats proposalId={id} />
            <Toolbar proposalId={id} />
          </section>
        );
      })}
    </div>
  );
}
// #endregion model

export default ProposalDemo;
