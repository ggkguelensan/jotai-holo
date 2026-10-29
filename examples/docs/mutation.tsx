import { useLingui } from '@lingui/react/macro';
import { QueryClient, mutationOptions } from '@tanstack/react-query';
import type { createStore } from 'jotai';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { createMutationModel, queryClientAtom } from 'jotai-holo/query';

// #region mutation
const $discount = stateAtom(10);
const $campaignNote = stateAtom('');

type CampaignInput = {
  gameId: string;
  discount: number;
  note: string;
};

// Demo seller policy; a real options factory calls the campaign API.
const saveCampaignMO = () =>
  mutationOptions({
    mutationKey: ['seller', 'campaigns', 'save'],
    mutationFn: async (input: CampaignInput) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (input.discount > 25) throw new Error('campaign-discount-limit');
      return input;
    },
  });

const $$campaignMutation = createMutationModel({
  mutation: saveCampaignMO,

  prism: {
    $campaign: (result) => result.data,
    $pending: (result) => result.isPending,
    $error: (result) => result.error,
  },
});

const save = actionAtom((get, set) =>
  set($$campaignMutation.mutate, {
    gameId: 'starfall',
    discount: get($discount),
    note: get($campaignNote),
  }),
);

function DiscountView({
  discount,
  onDiscount,
}: {
  discount: number;
  onDiscount: (value: number) => void;
}) {
  const { t } = useLingui();

  return (
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
  );
}

const Discount = holo({
  view: DiscountView,
  read: { discount: $discount },
  write: { onDiscount: $discount },
});

function CampaignNoteView({
  note,
  onNote,
}: {
  note: string;
  onNote: (value: string) => void;
}) {
  const { t } = useLingui();

  return (
    <label>
      {t`Campaign note`}
      <input value={note} onChange={(event) => onNote(event.target.value)} />
    </label>
  );
}

const CampaignNote = holo({
  view: CampaignNoteView,
  read: { note: $campaignNote },
  write: { onNote: $campaignNote },
});

function SaveControlsView({
  pending,
  onReset,
}: {
  pending: boolean;
  onReset: () => void;
}) {
  const { t } = useLingui();

  return (
    <div className="demo-controls">
      <button type="submit" disabled={pending}>
        {pending ? t`Saving campaign…` : t`Save campaign`}
      </button>
      <button type="button" onClick={onReset}>
        {t`Clear feedback`}
      </button>
    </div>
  );
}

const SaveControls = holo({
  view: SaveControlsView,
  read: { pending: $$campaignMutation.$pending },
  write: { onReset: $$campaignMutation.reset },
});

function SaveErrorView({ error }: { error: Error | null }) {
  const { t } = useLingui();

  return error ? (
    <p role="alert">{t`Demo policy limits campaign discounts to 25%.`}</p>
  ) : null;
}

const SaveError = holo({
  view: SaveErrorView,
  read: { error: $$campaignMutation.$error },
});

function SavedCampaignView({
  campaign,
}: {
  campaign: CampaignInput | undefined;
}) {
  const { t } = useLingui();

  return (
    <output aria-live="polite">
      {campaign && `${t`Saved campaign discount`}: ${campaign.discount}%`}
    </output>
  );
}

const SavedCampaign = holo({
  view: SavedCampaignView,
  read: { campaign: $$campaignMutation.$campaign },
});

function CampaignView({ onSave }: { onSave: () => Promise<CampaignInput> }) {
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
      <span className="demo-eyebrow">{t`Seller tools · Starfall sale`}</span>
      <Discount />
      <CampaignNote />
      <p className="demo-note">
        {t`Local demo: try more than 25% to see the campaign rejected.`}
      </p>
      <SaveControls />
      <SaveError />
      <SavedCampaign />
    </form>
  );
}

const Campaign = holo({
  view: CampaignView,
  write: { onSave: save },
});
// #endregion mutation

export default Campaign;

export function setup(store: ReturnType<typeof createStore>) {
  store.set(
    queryClientAtom,
    new QueryClient({
      defaultOptions: { mutations: { retry: false, gcTime: 0 } },
    }),
  );
}
