# Prompt: implement a project analytics adapter

This prompt targets the proposed contract in `protocol.ts`. The analytics entry
is not released yet. When using the prompt after implementation, provide the
actual exported contract and package version; that contract overrides examples.

Copy the following prompt and fill in the inputs.

---

Implement an analytics provider adapter for this project. Keep business models
independent of the analytics SDK. Do not redesign the shared analytics runtime.

## Inputs

- SDK/package and exact installed version: <package@version>
- Official documentation/source links: <links>
- Actual holo analytics adapter contract: <file or package export>
- Application message union and context types: <paths>
- Mapping from messages to vendor operations: <tracking plan>
- Identity/session rules, including anonymous/login/logout behavior: <rules>
- Host configuration source, endpoint/region and environment flags: <paths>
- Existing SDK instances or integrations that must be reused: <details>
- Required vendor capabilities: <events, user traits, groups, revenue, etc.>
- Project test/build commands: <commands>

Inspect repository instructions and installed source/types first. When an input
can be recovered from the project, recover it. Ask only about missing business
semantics that cannot be inferred. Do not fabricate API keys or user data.

## Inspect before implementing

1. Verify the exact SDK API from installed types/source and official docs.
2. Determine initialization timing, instance ownership and initialization result.
3. Check every return type: Promise, wrapper with .promise, callback or void.
4. Determine whether an operation resolves after queueing, upload attempt or
   server acceptance, and whether errors reject or appear in resolved results.
5. Identify native batching, retry, offline storage, automatic capture and
   identity persistence. State what the shared runtime does not control.
6. Find a real documented cleanup operation, if any. Absence is a limitation to
   document; reset, logout or persistent opt-out are not generic cleanup.

## Implement

- Use the supplied adapter protocol without importing this SDK into generic core.
- Put SDK imports behind the application's dynamic provider loader. No module-
  level initialization, source subscriptions, browser globals on SSR, React
  hooks/effects or global singleton registration.
- Create/reuse the correct instance according to application ownership. Do not
  create one SDK instance per event or per component render.
- Map every supported message explicitly. Preserve envelope ID, occurrence time
  and captured context using verified vendor fields where possible. Do not
  infer identity at delivery time from mutable application state.
- Map identity/session changes in FIFO order or use verified per-event identity.
  Document unsupported operations instead of silently skipping them. The
  lightweight provider routing must exclude unsupported message types.
- Disable unintended automatic capture unless the supplied tracking plan opts
  into it. Do not hard-code region, endpoint, cookies or identity policy that
  belongs to host configuration.
- Preserve native batching. Do not turn a batching SDK into a one-event-per-
  network-round-trip pipeline by serially awaiting upload receipts.
- Handle every asynchronous rejection and inspect resolved error results.
  Report receipts through the supplied revocable reporter, retaining only the
  message ID and minimal diagnostic data. Never retain source models or Views.
- Honor cancellation where supported and explicitly state what cannot be
  cancelled. Late SDK completion must not revive a disposed runtime.
- Do not add a second unbounded queue, automatic ambiguous-write retry or
  hidden persistence. Do not claim exactly-once or remote delivery from flush.
- Keep errors isolated from business actions and unrelated providers. Return
  the actual handoff/flush semantics required by the shared contract.
- Never initialize real production tracking or send live events while testing.

## Required tests

Use a controllable fake SDK; do not send network events. Run at least one
contract/typecheck against the real installed SDK types.

Cover initialization once per intended scope, no initialization before owner
activation, correct mapping, identical repeated events, captured timestamps and
context, login/logout ordering if supported, synchronous throws, Promise
rejection, resolved error receipts, wrapper return types, batching preservation,
flush semantics, cancellation/late completion and genuine cleanup or its stated
absence. Verify the adapter can coexist with three other providers, that its
failure does not break their progress, and that it does not change generic
core imports or eager bundle contents.

## Deliverables

1. Adapter implementation in the project's existing integration directory.
2. Dynamic loader registration with host-owned configuration.
3. Tests, typecheck/build results and the exact SDK version checked.
4. A mapping table: application message → vendor operation/fields.
5. A short ownership/delivery note: initialization, handoff meaning, native
   queues/retries, flush, identity and cleanup limitations.
6. Any unsupported requirement or SDK behavior that needs a product decision.

Do not weaken the shared adapter protocol to make one SDK fit. Propose a
separate capability only when a real second use case justifies it.
