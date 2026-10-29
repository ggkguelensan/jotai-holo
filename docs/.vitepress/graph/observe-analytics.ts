import type { createStore } from 'jotai';
type Store = ReturnType<typeof createStore>;
import { $analyticsLoaded, $deliveries } from '../../../examples/docs/analytics-recording';
import type { GraphActivity } from './contracts';
export function observeAnalytics(store: Store, emit: (event: GraphActivity) => void) {
  let last = store.get($deliveries).at(-1)?.id ?? 0;
  const branch = () =>
    emit({ type: 'branch', id: 'analytics', active: store.get($analyticsLoaded) });
  const stopBranch = store.sub($analyticsLoaded, branch);
  const stopDeliveries = store.sub($deliveries, () => {
    const deliveries = store.get($deliveries);
    for (const delivery of deliveries)
      if (delivery.id > last) emit({ type: 'delivery', engine: delivery.engine });
    last = deliveries.at(-1)?.id ?? 0;
  });
  branch();
  return () => {
    stopBranch();
    stopDeliveries();
  };
}
