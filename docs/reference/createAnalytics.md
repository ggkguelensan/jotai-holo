# createAnalytics

Observe a profile-viewed fact and map it to an audit message. Each declared
engine has its own mapping, so a fact can go to several engines with different
field names, or to only one selected engine.

## Usage

```ts
import { createAnalytics } from 'jotai-holo/analytics';
import { modelRegistry, pipe } from 'jotai-holo/model';
import { eventAtom } from 'jotai-holo/vanilla';
import { createStore } from 'jotai/vanilla';

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

function createTrackingModel() {
  const tracking = analytics.event({
    trigger: profileViewed,
    map: {
      audit: (fact) => ({
        name: 'profile_viewed',
        profile_id: fact.profileId,
      }),
    },
  });

  return { tracking };
}

const $$tracking = pipe(createTrackingModel, modelRegistry());
const store = createStore();
const lease = $$tracking.acquire(store);

store.set(profileViewed, { profileId: '42' });

// Stop observation when this application/session no longer needs it.
lease.release();
```

`analytics.event` describes a subscription; it does not connect it. The lease above activates the declaration returned by the model. In React, [holo.models](/reference/holo) owns model leases. To attach feature-specific analytics to a business model, use [modelAnalytics](/reference/modelAnalytics).

Follow a search fact from its business model to several engines in [Analytics](/topics/analytics).

## Contract

`createAnalytics(options) → { event, flush, dispose }`

Import from `jotai-holo/analytics`. Define the provider once and reuse it across feature models. Engines initialize on their first mapped message, independently per engine and Jotai store. Creating the provider does not initialize SDKs.

<span id="options-and-results"></span>

### Provider options

| Field      | Meaning                                  | Default       |
| ---------- | ---------------------------------------- | ------------- |
| engines    | Named lazy adapter factories             | Required      |
| onError    | Receives engine, phase and error         | console.error |
| queueLimit | Pending messages per engine              | 100           |
| timeout    | Initialization, delivery and flush bound | 30,000 ms     |

### Event declaration

`analytics.event({ trigger, state?, map })` returns a managed declaration. Return it as a top-level field of an owned model record.

| Field     | Meaning                                                    |
| --------- | ---------------------------------------------------------- |
| `trigger` | Event or action calls, or changes to a native atom's value |
| `state`   | Optional atom, tuple or record sampled for each delivery   |
| `map`     | Named engine mappings; omitted engines receive nothing     |

Without `state`, each mapper receives the trigger's arguments. With `state`, it receives `(stateValue, ...triggerArgs)`. Mappers run synchronously and return an engine message. State changes alone send nothing.

Event atoms preserve repeated equal payloads. Native atom triggers observe value changes, not every write. State is sampled when the queued delivery runs; put occurrence-time data into the fact itself when later changes must not affect it. See [bond scheduling](/reference/bond#scheduling-and-errors) for the underlying trigger behavior.

### Queues and failures

Mapped messages are detached, frozen JSON-compatible values. Each engine preserves handoff order and has its own bounded queue. Overflow discards the newest message. Mapping, loading and delivery failures go to `onError` without preventing other engines from handling the fact. Ambiguous sends are not retried automatically.

The queue contains messages that were already mapped by an active observer. It does not capture events emitted before that observer was connected. [Lazy analytics loading](/reference/modelAnalytics#loading-and-early-facts) explains this boundary.

### Release, flush and dispose

The last model owner stops observation. Already mapped messages may finish delivery within the timeout.

- `await analytics.flush(store)` attempts queued handoff and SDK flush for that store.
- `await analytics.dispose(store)` closes the provider's engines in that store.

Both are application-level operations on the shared provider, not the cleanup for one feature View. Release its model lease to stop one observer. SDK handoff and flush do not guarantee server ingestion.

Flush and disposal failures are reported through `onError`; awaiting them does not turn delivery into a success acknowledgement. Disposal discards queued messages and closes this provider for the selected store. Later events do not restart it.

`AnalyticsAdapter`, `AnalyticsContext` and `AnalyticsError` describe the adapter contract. The [adapter recipe](/recipes/analytics-adapter) explains how to add another engine.

## Why this API

Provider-specific names, units and buckets stay in inline analytics mappings. Generic infrastructure owns concurrency, queues and errors. SDKs stay outside the core bundle. An optional event-only Amplitude adapter accepts an initialized client from jotai-holo/analytics/amplitude; application code owns initialization and identity policy.

## Analogies and reading

- [Amplitude Browser SDK 2](https://www.amplitude.com/docs/sdks/analytics/browser/browser-sdk-2) — initialization, receipts and batching.
- [Adapter authoring prompt](/analytics-adapter-prompt) — implement another engine against the same contract.
