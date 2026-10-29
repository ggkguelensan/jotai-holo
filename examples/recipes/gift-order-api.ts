import { mutationOptions, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

// #region contract
export const draftSchema = z.object({
  copies: z.number().int().min(1),
  comment: z.string(),
});

const giftOrderSchema = draftSchema.extend({
  id: z.string(),
  recipientGroup: z.string(),
  copyPrice: z.number().nonnegative(),
});

export type GiftOrderDraft = z.infer<typeof draftSchema>;
export type GiftOrder = z.infer<typeof giftOrderSchema>;
export type GiftOrderInput = { giftOrderId: string };

export function toDraft(giftOrder: GiftOrder): GiftOrderDraft {
  return { copies: giftOrder.copies, comment: giftOrder.comment };
}
// #endregion contract

// #region query-factory
export function giftOrderDetailQO({ giftOrderId }: GiftOrderInput) {
  return queryOptions({
    queryKey: ['giftOrders', 'detail', giftOrderId] as const,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const id = encodeURIComponent(giftOrderId);
      const response = await fetch(`/api/gift-orders/${id}`, { signal });
      if (!response.ok) throw new Error('Could not load the gift order.');
      return giftOrderSchema.parse(await response.json());
    },
  });
}
// #endregion query-factory

// #region mutation-factory
export function saveGiftOrderMO() {
  return mutationOptions({
    mutationKey: ['giftOrders', 'save'],
    mutationFn: async (input: { id: string; draft: GiftOrderDraft }) => {
      const id = encodeURIComponent(input.id);
      const response = await fetch(`/api/gift-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftSchema.parse(input.draft)),
      });
      if (!response.ok) throw new Error('Could not save the gift order.');
      return giftOrderSchema.parse(await response.json());
    },
    onSuccess: (giftOrder, _variables, _context, { client }) => {
      const options = giftOrderDetailQO({ giftOrderId: giftOrder.id });
      client.setQueryData(options.queryKey, giftOrder);
    },
  });
}
// #endregion mutation-factory
