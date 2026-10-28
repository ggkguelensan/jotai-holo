# Business logic and small Views

A sales editor calculates a proposal, saves it and reports a successful save. These are related responsibilities, but they need different owners: domain functions define the rules, atoms coordinate the workflow, React renders the result, and analytics observes completed facts.

## When to use holo

Use holo wherever decomposition gives a part of the screen its own responsibility. Connect a price summary, a Save button or a search result near where it is rendered. Each View receives only its values and callbacks; it does not need to know which atoms or model instances provide them.

Move business decisions and synchronization into the model. Keep formatting, accessibility, local presentation state and native UI hooks in React. The aim is small Views and explicit workflows, not banning every React hook or effect. Declare holo outside render; no model registry is required for direct atom bindings.

## Start with a business workflow

Write the sequence in business terms: validate the draft, capture the submitted values, request a save, accept the response, publish that the proposal was saved. A command expresses an intention and can fail. A fact describes something that has already happened; publish it only after the relevant operation succeeds.

Keep calculations and validation in ordinary functions with explicit inputs and outputs. Use stateAtom for current values and derived state, actionAtom to coordinate reads, writes and asynchronous work, and eventAtom to publish notifications. Use bond for a separate reaction to a notification; a direct write inside a command is also appropriate when it belongs to the same workflow.

The saving model captures the draft before await. Later edits do not change the submitted request, and a failed request produces no success fact:

<<< @/../examples/recipes/proposal-mutation.tsx#saving-model

Make failure, concurrency and ownership decisions explicit. Here one editor ignores duplicate Save while pending, keeps edits made during the request and shows the mutation error. Other workflows may need cancellation, serialization or a revision check instead. Do not infer these rules from a button's disabled appearance.

## Separate domain code from assembly

The factory creates related atoms and commands. Application composition adds sharing, persistence, subscriptions or analytics. A registry selects shared instances by key and store; it does not clone imported global atoms or replace QueryClient's cache. Read [model composition](/guide/model-composition) and the [server-data recipes](/recipes/server-data) for complete examples.

Place domain rules and the business factory in modules that do not import React, analytics SDKs or provider-specific event names. The assembly module may import the business factory, the View and optional integrations. A rule can then be tested as a function and a workflow with a Jotai store, without mounting the View.

## Publish facts that consumers can understand

In domain modelling, an event commonly already means a fact that occurred. Here the useful distinction is intention versus occurrence: search is a command; searchCompleted reports its result. The payload should contain the business context needed by its consumers at that moment, rather than forcing them to reconstruct history from mutable current state.

The search fact carries the query, category, result count and duration. Capture request context before await in a real asynchronous search. If ordering or correlation matters, also define an operation ID, occurrence time or revision. Keep payloads immutable and limited to the permitted business data; do not copy an entire model or personal data just in case.

<<< @/../examples/analytics/search-model.ts#search-model

Provider names, field renaming and unit conversions belong in analytics mappings. The business factory and View do not import analytics. Each engine receives only its own mapping; engines absent from a mapping receive nothing:

<<< @/../examples/analytics/search.analytics.ts#search-analytics

## Loading analytics and keeping messages

Attach modelAnalytics in the application assembly, not inside the business factory. It follows committed model ownership. Currently a lazily imported analytics factory starts observing only after it loads: facts emitted earlier are not replayed. Do not rely on this form to preserve the first interaction.

For essential early facts, provide an eagerly available analytics factory and defer SDK initialization through createAnalytics engine factories. The managed observer must be connected before the fact is emitted. Its per-engine queue retains already mapped, detached messages while the engine loads; it is bounded and has a timeout. See [modelAnalytics](/reference/modelAnalytics) and [createAnalytics](/reference/createAnalytics) for the exact guarantees.

This queue is delivery infrastructure, not event sourcing. It is neither a persistent domain journal nor a mechanism for rebuilding state. Surviving reloads or guaranteeing delivery needs a separate durable outbox, identifiers, retries and an acknowledgement policy. A domain-fact buffer before a lazy analytics factory is ready is not implemented in the current API.

## Keep Query and RHF native where possible

Use native TanStack Query hooks near React consumers when only the UI needs the result. Reuse the same query-options factories and select the required data there. Native useQuery tracks accessed result properties; useSuspenseQuery provides Query's Suspense integration. Choose the corresponding error boundary and reset behavior from the native API.

<<< @/../examples/recipes/native-query.tsx#native-query

Use queryAtoms only when an atom or model needs reactive server data, and mutationAtoms when an atom workflow needs to execute or observe its mutation. Even if these adapters already exist, a React-only consumer can still use native hooks with the same QueryClient. Do not route data through holo merely because it is available as atoms. Mutation keys do not make separate mutation observers share one execution state.

Use native useForm, Controller and FormProvider for a self-contained form. Add createFormModel, formAtom and holoForm only when the atom/model system must react to form values, validation, submission or other form state. Resolvers remain native RHF resolvers; the bridge does not replace them.

## Reading and design review

[Sasha Bespoyasov's notes on functional domain modelling](https://bespoyasov.ru/blog/domain-modelling-made-functional/) introduce domain language and boundaries. This guide applies that perspective to Jotai workflows; holo supplies bindings and ownership, not a domain architecture generator.

Check a feature by asking: Can the View render with plain props? Can the business workflow run without analytics? Does each fact capture the context its consumers need? Is each subscription owned? Are Query and RHF adapters solving an actual atom-graph dependency? These questions matter more than using every operator.
