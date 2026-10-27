/** Draft, event-only adapter example. Not exported by jotai-holo. */
import { createInstance } from '@amplitude/analytics-browser';
import type { AnalyticsAdapter } from './protocol.js';

export type CartMessage = {
  readonly type: 'cart.itemAdded';
  readonly payload: {
    readonly productId: string;
    readonly quantity: number;
  };
};

export type CartContext = {
  readonly screen: string;
};

export async function createAmplitudeAdapter({
  apiKey,
  instanceName,
}: {
  apiKey: string;
  instanceName: string;
}): Promise<AnalyticsAdapter<CartMessage, CartContext>> {
  const client = createInstance();
  await client.init(apiKey, {
    instanceName,
    autocapture: false,
    fetchRemoteConfig: false,
  }).promise;

  return {
    write(envelope, context) {
      if (context.signal.aborted) return;
      const messageId = envelope.id;
      const report = context.report;
      const receipt = client.track({
        event_type: envelope.message.type,
        event_properties: {
          ...envelope.message.payload,
          screen: envelope.context.screen,
        },
        insert_id: messageId,
        time: envelope.occurredAt,
      });
      // Do not serialize SDK network uploads by awaiting every track receipt.
      // The core must supply a revocable reporter with weak runtime ownership.
      void receipt.promise.then(
        (result) => {
          if (result.code !== 200) {
            report({
              phase: 'receipt',
              messageId,
              error: new Error(`${result.code}: ${result.message}`),
            });
          }
        },
        (error: unknown) => report({ phase: 'receipt', messageId, error }),
      );
    },
    async flush() {
      await client.flush().promise;
    },
    // No invented shutdown(), and no reset()/setOptOut() disguised as cleanup.
    // This SDK instance is owned by the browser application, not by a View.
  };
}
