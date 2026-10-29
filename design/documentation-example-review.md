# Independent documentation example review

Review date: 2026-10-29. This is a dated audit snapshot, not a description of a future release. Baseline commit: `9fe26d2`; small fixes by the root agent were re-read in the working tree during this review.

**Verdict: Revise.** No new broken runtime contract was established. One architectural example conflicts with the documented model boundary. Two optional editorial improvements remain. The review setup and the concrete CatalogPage correction are acceptable independently of that remaining work.

## Open findings

| Severity                                                 | Page/source:line                                                                                                                                                              | Before                                                                                                                                                                                                                                                                                                                                            | Proposed after                                                                                                                                                                                                                                                                                                                                                                                                                         | Reader benefit                                                                                                                                                                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revise — architectural consistency, not a runtime defect | `docs/guide/business-logic.md:21`; `examples/recipes/gift-order-mutation.tsx:22`; `examples/recipes/gift-order-model.tsx:19`; compare `docs/reference/createQueryModel.md:79` | The business-logic article imports `saving-model`. `createSavingGiftOrderModel` constructs its Mutation adapter and calls `createGiftOrderModel`, which constructs a Query adapter. Both factories therefore import server integrations. The Query reference instead says “Compose cross-model connections separately from the business factory.” | For the immediate article fix, use the existing `examples/profile/edit-model.ts` and `edit-save.ts` path, or extract a small analogous gift-order business factory and module-level assembly. Then refactor the server-defaults dependency separately: keep the server source outside the business factory and preserve per-editor submission ownership explicitly. Do not merely weaken the reference to make the older example pass. | The first business-workflow example demonstrates the same boundary the architecture asks the reader to adopt. Removing nested adapter creation must preserve independent editor request state, rather than accidentally sharing one global Mutation observer. |
| Suggest — rendering/editorial judgment                   | `examples/atoms-or-models.tsx:71`; `docs/.vitepress/code-blocks.mjs:35`                                                                                                       | The two adjacent `createFiltersModel()` calls appear as two separate one-line cards. Their shared purpose is to contrast independent instances.                                                                                                                                                                                                   | Allow the author to keep this pair in one logical usage card, while keeping the factory in its own card. Avoid a blanket grouping rule for every arbitrary function call.                                                                                                                                                                                                                                                              | The comparison is visible together; the reader need not reconstruct one teaching step across repeated borders and copy buttons.                                                                                                                               |
| Suggest — API lookup completeness                        | `docs/reference/modelLifecycle.md:11`                                                                                                                                         | The contract describes behavior but never lists the options or callback context signatures. The only sample uses sessionStorage and cannot show how `initial`, `signal`, `snapshot`, timeout and errors are supplied.                                                                                                                             | Add a compact options/context table sourced from the actual exported `modelLifecycle` type. Keep loading/save policy explanation in the topic and recipe.                                                                                                                                                                                                                                                                              | An API lookup answers how to call the utility without sending the reader to implementation types or encouraging invented callback parameters.                                                                                                                 |

## Findings resolved during this audit

| Severity         | Page/source:line                              | Before                                                                                                               | Proposed after                                                                                                            | Reader benefit                                                                     |
| ---------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Resolved Revise  | `examples/atoms-or-models.tsx:169`            | Exported JSX values `featuredFilters` and `gamesFilters` acted as fake usage.                                        | `CatalogPage` composes both `GameFilters` instances. Confirmed in source and built DOM: the composition is one code card. | Shows a real React owner and makes independent IDs comparable.                     |
| Resolved Revise  | `examples/recipes/gift-order-registry.tsx:75` | `export const atlas = <KeyedGiftOrderEditor ... />` and a second exported JSX value.                                 | `GiftOrdersPage` composes both editors. Confirmed in current source; final build verification belongs to root.            | Removes the same meaningless element-variable pattern from another source example. |
| Resolved Revise  | `docs/topics/atoms-and-models.md:50`          | Prose named order filters and `$$orderFilters`, while source exports `$$wishlistFilters`.                            | Prose consistently names wishlist filters and `$$wishlistFilters`.                                                        | The reader can find the declaration named by the explanation.                      |
| Resolved Revise  | `docs/examples/gift-copies.md:3`              | Promised that the second demo enabled checkout, after its dead checkout button had become an availability indicator. | Says the demo shows whether payment and terms are selected.                                                               | The observation task matches the actual UI.                                        |
| Resolved Suggest | `docs/examples/game-catalog.md:3`             | Told readers only to inspect empty/error branches in code.                                                           | Invites use of Not found / Server error and recovery to an existing game.                                                 | Makes the newly available interactive states discoverable.                         |

## Contract checks

- Native TanStack snapshot/options are retained. `Result`/`Option` are not assumed built-in. `src/query.ts` exposes independent prism selectors of native QueryObserverResult; source-only reads and mounted subscriptions are distinguished by the reference.
- Registry default selection is documented as currently supported, matching `ModelOptions.key?` and the `default` branch in `src/model-registry.ts`. The proposed key-required contract is not presented as implemented.
- Bond docs match current `src/bond.ts`: no `enabled`/`immediate`; connecting a state source does not automatically invoke its write target. No proposed initial-delivery feature is claimed.
- Analytics explicitly warns that observation starts after lazy factory readiness. `src/analytics.ts` calls child activation after `load()` resolves. No pre-import fact queue is claimed.
- Public event bridge names are `events`, `HoloEvents` and `useHoloEvents`; old imperative names in route fragments/demo kinds are compatibility identifiers, not API claims.
- `modelConnection` callback is documented as a synchronous disposer, not the proposed array-of-bonds shorthand.
- The receipt-state copying in the older order-confirmation demo is explicitly described as a local navigation simulation. It was not classified as a duplicate server-state recommendation. The successful purchase demo uses read bindings for display and events for animation.
- Native RHF fields are not wrapped in empty holo components merely to increase decomposition. Each retained View has a display, interaction or layout responsibility.

## Coverage

Read all 68 canonical Markdown files under the requested directories, including redirect stubs and indexes. Read all 45 directly imported example source files/regions, their View implementations and immediate relevant dependencies. Additional inspected supporting sources include recipe API/model/registry/local/save/View modules, analytics provider and recording modules, spreadsheet formulas/model, the shared code splitter, and core Query, event, bond, model selection/composition and event bridge implementations. This is an editorial/contract audit, not a line-by-line correctness proof of every runtime algorithm.

Representative built-page DOM checks at 1440px covered `topics/atoms-and-models`, `guide/business-logic`, `topics/model-composition`, `reference/holoForm`, `examples/gift-copies` and `examples/game-catalog`. Confirmed CatalogPage single-card rendering and observed the two fragmented factory-call cards. No root-page horizontal overflow on those pages. Built output predated the small prose fixes; source fixes were reviewed separately. No renderer mutation was made in this audit.

This audit did not rerun all interactive scenarios, mobile/theme screenshots, typecheck, unit/browser suites or translations. Those are separate validations; the prior design audit does not substitute for a final build after current edits. No external website availability or npm publication status was revalidated. No full audit of pages outside the requested directories was performed.

### Canonical page inventory

- `guide`: `architecture.md`, `atoms-or-models.md`, `business-logic.md`, `ecosystem.md`, `getting-started.md`, `hosting.md`, `model-composition.md`, `motivation.md`, `rendering.md`.

- `topics`: `analytics.md`, `atoms-and-models.md`, `holo.md`, `index.md`, `model-composition.md`, `models-and-registries.md`, `rhf-models.md`, `tanstack-models.md`.

- `recipes`: `analytics-adapter.md`, `index.md`, `integrations.md`, `profile-composition.md`, `profile.md`, `server-data.md`, `spreadsheet.md`.

- `reference`: `actionAtom.md`, `bond.md`, `createAmplitudeAdapter.md`, `createAnalytics.md`, `createFormModel.md`, `createMutationModel.md`, `createQueryModel.md`, `defineModel.md`, `eventAtom.md`, `formAtom.md`, `holo.md`, `holoForm.md`, `holoList.md`, `holoMatch.md`, `input.md`, `ion.md`, `localStorageAdapter.md`, `modelAnalytics.md`, `modelConnection.md`, `modelLifecycle.md`, `modelRegistry.md`, `persist.md`, `pipe.md`, `prism.md`, `queryClientAtom.md`, `stateAtom.md`, `useHoloEvents.md`.

- `examples`: `catalog-analytics.md`, `contact-forms.md`, `game-catalog.md`, `gift-copies.md`, `index.md`, `lists-and-branches.md`, `model-instances.md`, `order-confirmation.md`, `player-notifications.md`, `product-catalog.md`, `profile-fields.md`, `proposal-discount.md`, `sale-campaign.md`, `spreadsheet.md`, `view-bindings.md`, `view-methods.md`, `workshop-tickets.md`.

### Imported source inventory

- `examples/analytics/search-model.ts`: `search-command`, `search-fact`, `search-model`.
- `examples/analytics/search.analytics.ts`: `search-analytics`.
- `examples/analytics/search.tsx`: `analytics-binding`.
- `examples/atoms-or-models.tsx`: `atom-imports`, `direct-model`, `factory`, `global-atoms`, `keyed-model`, `model-imports`, `usage`.
- `examples/define-model.ts`: `factory`, `usage`.
- `examples/docs/analytics.tsx`: `analytics`.
- `examples/docs/bond.tsx`: `bond`.
- `examples/docs/counter-views.tsx`: `counter-read-contracts`, `counter-write-contract`.
- `examples/docs/counter.tsx`: `counter-layout`, `counter-read`, `counter-state`, `counter-write`.
- `examples/docs/data-lifecycle.tsx`: `data-lifecycle`, `draft-lifecycle`.
- `examples/docs/form.tsx`: `form`, `notifications-editor`, `notifications-email-preview`, `notifications-model`, `notifications-save-layout`.
- `examples/docs/imperative-animation.tsx`: `animation`.
- `examples/docs/imperative-focus.tsx`: `focus`.
- `examples/docs/imperative-purchase-views.tsx`: `receipt-handle`.
- `examples/docs/imperative-purchase.tsx`: `purchase`.
- `examples/docs/imperative-share.tsx`: `share`.
- `examples/docs/imperative.tsx`: `imperative`.
- `examples/docs/input-views.tsx`: `input-contracts`.
- `examples/docs/input.tsx`: `input-bindings`, `input-layout`.
- `examples/docs/ion.tsx`: `calculation`, `ion`.
- `examples/docs/list.tsx`: `list`.
- `examples/docs/match.tsx`: `match`.
- `examples/docs/model.tsx`: `gift-order-copies`, `gift-order-factory`, `gift-order-registry`, `gift-order-toolbar`, `model`.
- `examples/docs/mutation.tsx`: `mutation`.
- `examples/docs/operators.tsx`: `operators`.
- `examples/docs/prism.tsx`: `prism`.
- `examples/docs/query.tsx`: `query`.
- `examples/docs/spreadsheet.tsx`: `spreadsheet`.
- `examples/documentation.tsx`: `action`, `bond`, `event`, `holo`, `input`, `list`, `match`, `prism`, `state`.
- `examples/effect.tsx`: `whole file`.
- `examples/model-composition.ts`: `extend`, `factory`, `modifier`.
- `examples/profile/edit-model.ts`: `edit-model`.
- `examples/profile/edit-notifications.tsx`: `notification-binding`.
- `examples/profile/edit-save.ts`: `edit-mutation`, `edit-save`.
- `examples/profile/edit-view.tsx`: `edit-feedback`, `edit-fields`, `edit-view`.
- `examples/profile/field-views.tsx`: `feedback-contracts`, `field-contracts`.
- `examples/profile/profile-composition.ts`: `profile-binding`, `profile-options`, `profile-query`, `profile-save`.
- `examples/profile/profile-model.ts`: `profile-contract`, `profile-model`.
- `examples/quickstart.tsx`: `quickstart-binding`, `quickstart-state`, `quickstart-view`.
- `examples/recipes/gift-order-form.tsx`: `form-binding`, `form-loading`, `form-model`, `form-view`.
- `examples/recipes/gift-order-mutation.tsx`: `saving-model`.
- `examples/recipes/gift-order-setup.tsx`: `setup`.
- `examples/recipes/native-query.tsx`: `native-query`.
- `examples/registry-dependencies.ts`: `shared-dependency`.
- `examples/spreadsheet/model.ts`: `sheet-model`.
