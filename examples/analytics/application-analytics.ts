import { createAnalytics, type AnalyticsAdapter } from 'jotai-holo/analytics';

export type AnalyticsMessage = {
  name: string;
  properties: Record<string, unknown>;
};

// Example-only adapters: console handoff, no vendor SDK or network requests.
function createRecordingAdapter(
  engine: string,
  record?: (engine: string, message: AnalyticsMessage) => void,
): AnalyticsAdapter<AnalyticsMessage> {
  return {
    send(message) {
      console.info(engine, message);
      record?.(engine, message);
    },
  };
}

export function createRecordingAnalytics(
  record?: (engine: string, message: AnalyticsMessage) => void,
) {
  return createAnalytics({
    engines: {
      amplitude: () => createRecordingAdapter('amplitude', record),
      warehouse: () => createRecordingAdapter('warehouse', record),
      posthog: () => createRecordingAdapter('posthog', record),
    },
    onError: (error) => console.error(error),
  });
}

export const $$analytics = createRecordingAnalytics();
