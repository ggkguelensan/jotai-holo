import { useLingui } from '@lingui/react/macro';
import { QueryClient, mutationOptions } from '@tanstack/react-query';
import type { createStore } from 'jotai';
import { actionAtom, holo, stateAtom } from 'jotai-holo';
import { createMutationModel, queryClientAtom } from 'jotai-holo/query';
import {
  DiscountView,
  CampaignNoteView,
  SaveControlsView,
  SaveErrorView,
  SavedCampaignView,
} from './mutation-views.js';

// #region mutation
const $discount = stateAtom(10);
const $campaignNote = stateAtom('');

export type CampaignInput = {
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

const Discount = holo({
  view: DiscountView,
  read: { discount: $discount },
  write: { onDiscount: $discount },
});

const CampaignNote = holo({
  view: CampaignNoteView,
  read: { note: $campaignNote },
  write: { onNote: $campaignNote },
});

const SaveControls = holo({
  view: SaveControlsView,
  read: { pending: $$campaignMutation.$pending },
  write: { onReset: $$campaignMutation.reset },
});

const SaveError = holo({
  view: SaveErrorView,
  read: { error: $$campaignMutation.$error },
});

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
