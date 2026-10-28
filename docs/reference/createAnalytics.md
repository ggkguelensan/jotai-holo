# createAnalytics

Map business facts independently for each analytics engine. A search fact can go to two engines while a product-open fact goes only to a third.

Read the [Analytics overview](/topics/analytics) for the complete workflow and live examples.

## Usage

```ts
import { createAnalytics } from 'jotai-holo/analytics';
import { eventAtom } from 'jotai-holo/vanilla';

const analytics = createAnalytics({
  engines: {
    audit: () => ({
      send(message: { name: string; profile_id: string }) {
        console.info(message);
      },
    }),
  },
});

const profileViewed = eventAtom<{ profileId: string }>();

const tracking = analytics.event({
  trigger: profileViewed,
  map: {
    audit: (fact) => ({
      name: 'profile_viewed',
      profile_id: fact.profileId,
    }),
  },
});
```

## Contract

Import from jotai-holo/analytics. Define engines once and reuse the declaration across feature models. Factories initialize on the first mapped message, independently per engine and store. event declares managed observation: trigger causes delivery, state supplies a snapshot, and each map entry prepares one engine message. State changes alone send nothing. Event atoms preserve repeated equal payloads; native atom triggers observe value changes.

Messages are detached, frozen JSON-compatible values. Each engine preserves handoff order and has a bounded queue: 100 messages and a 30-second timeout by default. Overflow discards the newest message. Failures are reported independently through onError; ambiguous sends are not retried automatically. Release stops capture and permits bounded drain. flush is a best-effort handoff/SDK flush; dispose closes engines for that store. Neither guarantees server ingestion.

## Options and results

| Field      | Meaning                                  | Default       |
| ---------- | ---------------------------------------- | ------------- |
| engines    | Named lazy adapter factories             | Required      |
| onError    | Receives engine, phase and error         | console.error |
| queueLimit | Pending messages per engine              | 100           |
| timeout    | Initialization, delivery and flush bound | 30,000 ms     |

The result exposes event, flush(store) and dispose(store). event takes trigger, optional state and an engine map. flush is best-effort handoff; dispose closes that provider runtime in the selected store. Types AnalyticsAdapter, AnalyticsContext and AnalyticsError describe adapter integration.

## Why this API

Provider-specific names, units and buckets stay in inline analytics mappings. Generic infrastructure owns concurrency, queues and errors. SDKs stay outside the core bundle. An optional event-only Amplitude adapter accepts an initialized client from jotai-holo/analytics/amplitude; application code owns initialization and identity policy.

## Analogies and reading

- [Amplitude Browser SDK 2](https://www.amplitude.com/docs/sdks/analytics/browser/browser-sdk-2) — initialization, receipts and batching.
- [Adapter authoring prompt](/analytics-adapter-prompt) — implement another engine against the same contract.
