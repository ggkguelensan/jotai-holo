# Analytics adapter authoring prompt

Use this prompt with the project's exact SDK version and event types. The generic analytics entry imports no vendor SDK.

```text
Implement an adapter for jotai-holo/analytics in this project.

Read the installed AnalyticsAdapter<Message> and AnalyticsContext types.
Inspect the installed vendor SDK types and its official documentation.
Do not invent init, shutdown, flush or cancellation methods.

Return { send(message, { signal, report }), flush?, dispose? }.
The engine factory initializes one client per store, lazily on first message.
Keep SDK imports in the lazy factory or a separate adapter chunk.

Message shape belongs to this adapter. Domain models must not import it.
Keep per-engine mapping inline in analytics.event({ trigger, state, map }).
Validate event names, properties, identity attribution and occurrence time.
Capture identity in the mapped message when delayed delivery requires it.
Never read current identity later to attribute an earlier event.

send completion means handoff. If the SDK owns batching, return after
handoff and report rejected async receipts through context.report.
If send performs HTTP itself, await the request and honor context.signal.
Do not retry an ambiguous handoff automatically.
Map flush to the actual SDK completion promise when available.
Implement dispose only for a real supported cleanup operation.
Do not use reset or opt-out as fake cleanup.

Test with a fake SDK: no calls at import, lazy init, field mapping,
equal repeated events, ordered handoff, rejected receipts, abort,
flush wrappers, independent clients and late initialization disposal.
Verify structural compatibility against the installed SDK's real types.
Do not send real analytics during tests.
Document SDK queue/retry ownership and any unsupported identity features.
```

The optional `jotai-holo/analytics/amplitude` entry accepts an initialized Browser SDK 2 client. It maps name/properties to event_type/event_properties, reports rejected track receipts, and awaits the native flush promise. It does not initialize a client or implement identity, revenue, group operations, or an invented disposer. See the [official SDK documentation](https://www.amplitude.com/docs/sdks/analytics/browser/browser-sdk-2).
