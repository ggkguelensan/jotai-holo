# Analytics implementation

The current implementation lives in `src/analytics.ts` and the optional
SDK-independent adapter in `src/analytics-amplitude.ts`. The previous protocol
gift order has been replaced; do not implement against it.

Contracts: [createAnalytics](../../docs/reference/createAnalytics.md),
[modelAnalytics](../../docs/reference/modelAnalytics.md) and
[adapter authoring prompt](../../docs/analytics-adapter-prompt.md).

`validation.json` pins the SDK used by `pnpm test:analytics-adapter` to verify
structural client compatibility. Runtime adapter tests use fake clients and send
no analytics. No SDK is added to library peers or dependencies.
