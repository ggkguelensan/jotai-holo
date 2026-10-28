import { useLingui } from '@lingui/react/macro';
import { QueryClient, mutationOptions } from '@tanstack/react-query';
import type { createStore } from 'jotai';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { mutationAtoms, queryClientAtom } from 'jotai-holo/query';

// #region mutation
const $discount = stateAtom(10);
const $comment = stateAtom('');

type ProposalInput = {
  id: string;
  discount: number;
  comment: string;
};

// Local server simulation. A real factory calls your API here.
const saveProposalMO = () =>
  mutationOptions({
    mutationKey: ['proposals', 'save'],
    mutationFn: async (input: ProposalInput) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (input.discount > 25) throw new Error('approval-required');
      return input;
    },
  });

const saving = mutationAtoms({
  mutation: saveProposalMO,

  prism: {
    $proposal: (result) => result.data,
    $pending: (result) => result.isPending,
    $error: (result) => result.error,
  },
});

const save = actionAtom((get, set) =>
  set(saving.mutate, {
    id: 'P-1042',
    discount: get($discount),
    comment: get($comment),
  }),
);

function ProposalView({
  discount,
  comment,
  proposal,
  pending,
  error,
  onDiscount,
  onComment,
  onSave,
  onReset,
}: {
  discount: number;
  comment: string;
  proposal: ProposalInput | undefined;
  pending: boolean;
  error: Error | null;
  onDiscount: (value: number) => void;
  onComment: (value: string) => void;
  onSave: () => Promise<ProposalInput>;
  onReset: () => void;
}) {
  const { t } = useLingui();

  return (
    <form
      className="demo-form"
      onSubmit={(event) => {
        event.preventDefault();
        // The error projection displays failures; also handle the Promise.
        void onSave().catch(() => undefined);
      }}
    >
      <span className="demo-eyebrow">{t`Proposal P-1042`}</span>
      <label>
        {t`Discount, %`}
        <input
          type="number"
          min="0"
          max="50"
          value={discount}
          onChange={(event) => onDiscount(Number(event.target.value))}
        />
      </label>
      <label>
        {t`Comment for the customer`}
        <input
          value={comment}
          onChange={(event) => onComment(event.target.value)}
        />
      </label>
      <p className="demo-note">
        {t`Try a discount above 25% to see a server rejection.`}
      </p>
      <div className="demo-controls">
        <button type="submit" disabled={pending}>
          {pending ? t`Saving proposal…` : t`Save proposal`}
        </button>
        <button type="button" onClick={onReset}>
          {t`Clear feedback`}
        </button>
      </div>
      {error && <p role="alert">{t`Discounts above 25% need approval.`}</p>}
      <output aria-live="polite">
        {proposal && `${t`Saved discount`}: ${proposal.discount}%`}
      </output>
    </form>
  );
}

const Proposal = holo({
  view: ProposalView,

  read: {
    discount: $discount,
    comment: $comment,
    proposal: saving.$proposal,
    pending: saving.$pending,
    error: saving.$error,
  },

  write: {
    onDiscount: $discount,
    onComment: $comment,
    onSave: save,
    onReset: saving.reset,
  },
});
// #endregion mutation

export default Proposal;

export function setup(store: ReturnType<typeof createStore>) {
  store.set(
    queryClientAtom,
    new QueryClient({
      defaultOptions: { mutations: { retry: false, gcTime: 0 } },
    }),
  );
}
