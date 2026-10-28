import { createAnalytics, type AnalyticsAdapter } from 'jotai-holo/analytics';

// Example-only adapters: console handoff, no vendor SDK or network requests.
function createRecordingAdapter(engine: string): AnalyticsAdapter<{
  name: string;
  properties: Record<string, unknown>;
}> {
  return {
    send(message) {
      console.info(engine, message);
    },
  };
}

export const $$analytics = createAnalytics({
  engines: {
    amplitude: () => createRecordingAdapter('amplitude'),
    warehouse: () => createRecordingAdapter('warehouse'),
    posthog: () => createRecordingAdapter('posthog'),
  },
  onError: (error) => console.error(error),
});
