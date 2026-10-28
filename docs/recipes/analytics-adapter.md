# Add an analytics engine

I need to send selected business facts to another analytics platform without changing the business model or its Views.

## Implement the transport

Implement AnalyticsAdapter for the message type accepted by your platform. send receives a detached message and an AbortSignal; flush and dispose are optional. Initialize the SDK in the engine factory, not in the business model.

## Map at the consumer

Use an inline map entry in analytics.event for this engine. Rename properties, convert units and choose platform event names here. Omit the engine from events it does not consume. A failure in one engine must not prevent other engines from receiving their messages.

## Connect and verify

Attach the analytics model through modelAnalytics at application composition. Test send failures, lazy initialization, duplicate equal facts, flush and disposal against the [adapter authoring prompt](/analytics-adapter-prompt). It includes the contract and a checklist you can give an agent for your project's SDK.

The optional [Amplitude adapter](/reference/createAmplitudeAdapter) is a concrete example, not the interface all engines must imitate. Initialization, identity, consent and account changes belong to your application.

[Open the catalog example](/examples/catalog-analytics) to inspect two facts mapped to three engines. See [createAnalytics](/reference/createAnalytics) for queue limits and delivery guarantees.
