import { useSuspenseQuery } from '@tanstack/react-query';
import { giftOrderDetailQO } from './gift-order-api.js';

// #region native-query
export function GiftOrderCopyCount({ giftOrderId }: { giftOrderId: string }) {
  const { data: copies } = useSuspenseQuery({
    ...giftOrderDetailQO({ giftOrderId }),
    select: (giftOrder) => giftOrder.copies,
  });

  return <output>{copies} copies</output>;
}
// #endregion native-query
