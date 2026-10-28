# createAmplitudeAdapter

Deliver mapped analytics messages through an initialized Amplitude Browser SDK 2 client.

Read [Analytics](/topics/analytics) for engine mappings and [Add an analytics engine](/recipes/analytics-adapter) for another provider.

## Usage

```ts
import { createAnalytics } from 'jotai-holo/analytics';
import {
  createAmplitudeAdapter,
  type AmplitudeClient,
} from 'jotai-holo/analytics/amplitude';

declare const client: AmplitudeClient;

const analytics = createAnalytics({
  engines: {
    amplitude: () => createAmplitudeAdapter(client),
  },
});
```

## Contract

createAmplitudeAdapter(client) returns `AnalyticsAdapter<AmplitudeMessage>`. Each message contains name and properties. The client supplies track and flush methods compatible with the exported AmplitudeClient interface. The package does not import or initialize the SDK.

send hands the message to track without waiting for network ingestion. Rejected receipts and non-200 receipt codes report through the analytics context. flush awaits the SDK flush receipt. An aborted send is ignored before handoff; an accepted SDK operation is not cancelled.

## Why this API

Application code owns initialization, user identity and consent. The adapter handles event transport only. Other engines keep their own message types and mappings.

## Analogies and reading

- [Amplitude Browser SDK 2](https://www.amplitude.com/docs/sdks/analytics/browser/browser-sdk-2) — SDK initialization and delivery receipts.
- [createAnalytics](/reference/createAnalytics) — shared engine lifecycle.
