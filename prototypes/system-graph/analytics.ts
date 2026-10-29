import type { GiftModel } from './business';
import type { Analytics } from './runtime';

export function createGiftAnalyticsModel(gift: GiftModel, analytics: Analytics) {
  const purchaseCompleted = analytics.event({
    trigger: gift.purchaseCompleted,
    map: {
      amplitude: (fact) => ({
        name: 'Gift purchased',
        properties: { game: fact.game, revenue: fact.total },
      }),
      warehouse: (fact) => ({
        name: 'gift_order_completed',
        properties: { order_id: fact.orderId, total_cents: fact.total * 100 },
      }),
    },
  });
  return { purchaseCompleted };
}
