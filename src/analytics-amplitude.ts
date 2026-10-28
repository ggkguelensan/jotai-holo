import type { AnalyticsAdapter } from './analytics.js';

export type AmplitudeMessage = {
  readonly name: string;
  readonly properties: Record<string, unknown>;
};
/** Structural subset of an initialized Browser SDK 2 client. No SDK import. */
export interface AmplitudeClient {
  track(event: { event_type: string; event_properties: Record<string, unknown> }): {
    promise: Promise<{ code: number; message: string }>;
  };
  flush(): { promise: Promise<unknown> };
}

/** Event-only adapter. Initialization and identity policy belong to the application. */
export function createAmplitudeAdapter(
  client: AmplitudeClient,
): AnalyticsAdapter<AmplitudeMessage> {
  return {
    send(message, { signal, report }) {
      if (signal.aborted) return;
      const receipt = client.track({
        event_type: message.name,
        event_properties: message.properties,
      });
      // The SDK batches uploads itself. A network receipt must not serialize handoff.
      void receipt.promise.then((result) => {
        if (result.code !== 200) report(new Error(`${result.code}: ${result.message}`));
      }, report);
    },
    async flush() {
      await client.flush().promise;
    },
  };
}
