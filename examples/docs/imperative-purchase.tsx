import { QueryClient, mutationOptions } from '@tanstack/react-query';
import type { createStore } from 'jotai';
import { actionAtom, eventAtom, holo, stateAtom } from 'jotai-holo';
import { createMutationModel, queryClientAtom } from 'jotai-holo/query';
import {
  PurchaseButtonView,
  PurchaseStatusView,
} from './imperative-purchase-views.js';

// #region purchase
export type Receipt = { orderId: string; title: string; total: number };
// Local transport simulation. A real options factory calls the purchase API.
export const purchaseApi = {
  async create(): Promise<Receipt> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { orderId: 'DEMO-1001', title: 'Starfall', total: 25 };
  },
};

const purchaseMO = () =>
  mutationOptions({
    mutationKey: ['purchases', 'create'],
    mutationFn: purchaseApi.create,
  });

const $$purchaseMutation = createMutationModel({
  mutation: purchaseMO,
  prism: {
    $pending: (result) => result.isPending,
    $error: (result) => result.error,
  },
});

const $receipt = stateAtom<Receipt | null>(null);

export const orderCreated = eventAtom<Receipt>();

export const buy = actionAtom(async (get, set) => {
  if (get($$purchaseMutation.$pending)) return;
  const receipt = await set($$purchaseMutation.mutate);
  set($receipt, receipt);
  set(orderCreated, receipt);
});

const PurchaseButton = holo({
  view: PurchaseButtonView,
  read: { pending: $$purchaseMutation.$pending },
  write: { onBuy: buy },
});

const PurchaseStatus = holo({
  view: PurchaseStatusView,
  read: {
    receipt: $receipt,
    pending: $$purchaseMutation.$pending,
    error: $$purchaseMutation.$error,
  },
  imperative: { onOrderCreated: orderCreated },
});

export default function PurchaseDemo() {
  return (
    <div className="demo-purchase">
      <div className="demo-form demo-purchase-actions">
        <PurchaseButton />
      </div>
      <PurchaseStatus />
    </div>
  );
}
// #endregion purchase

export function setup(store: ReturnType<typeof createStore>) {
  store.set(
    queryClientAtom,
    new QueryClient({
      defaultOptions: { mutations: { retry: false, gcTime: 0 } },
    }),
  );
}
