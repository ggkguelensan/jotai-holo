# Query request audit

## Selection rule

Use TanStack Query for server reads and mutations. Prefer native React hooks
when only the UI needs them; use query/mutation models when the atom graph needs
their state or commands. Business models keep editing rules and facts, not a
second request state machine. This is the documentation's chosen architecture,
not a claim that async Jotai atoms are invalid.

## Inventory and decisions

| Location                                                                                                       | Earlier behavior                                                      | Decision                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `examples/documentation.tsx` and `recipes/profile`                                                             | `createProfile(api)` maintains pending/error flags around an API call | Remove the request runtime; split a pure editing factory, native mutation options/model and a save command |
| `reference/eventAtom`                                                                                          | Embeds the entire handwritten request workflow                        | Show an event declaration/publication; link to the Query-backed recipe                                     |
| `reference/modelLifecycle`                                                                                     | Uses `api.loadDraft`/`api.saveDraft` directly                         | Demonstrate session storage; direct server workflows to TanStack Query                                     |
| `reference/ion`                                                                                                | Gift-pricing prose introduces a handwritten saving flag               | Reuse the actual gift price calculation; remove the obsolete saving flag                                   |
| `examples/profile/profile-api.ts` and `profile-composition.ts`                                                 | Profile transport is invoked by Query/Mutation options                | Keep: requests already run through native observers                                                        |
| `examples/recipes/gift-order-api.ts`, `gift-order-model.tsx`, `gift-order-mutation.tsx`, `gift-order-form.tsx` | Options factories, Query/Mutation models and native hooks             | Keep: transport code is inside Query functions; do not replace fetch itself                                |
| `examples/docs/query.tsx` and `mutation.tsx`                                                                   | Delayed local transports inside native options factories              | Keep: they demonstrate native request state and branches                                                   |
| `examples/recipes/native-query.tsx`                                                                            | `useSuspenseQuery` with inline select                                 | Keep: UI-only data belongs in native hooks                                                                 |
| `examples/docs/form.tsx`                                                                                       | Copies a validated email into a local atom                            | Keep: there is no server operation                                                                         |
| `examples/async.tsx`                                                                                           | Delayed native async atom with AbortSignal                            | Keep: this is a Promise/Suspense demonstration, not a network data layer                                   |
| `data-lifecycle`, `gift-order-local`, `persist`, localStorage adapter                                          | Browser storage restoration and writes                                | Keep local persistence under its existing owner; no network cache is needed                                |
| Model tracking feed and analytics adapters                                                                     | Subscription handles and ordered external deliveries                  | Keep their resource protocols; a request cache does not replace stream ownership or analytics delivery     |

Search included public example source and English guide/topic/recipe/reference
pages for API calls, fetch, Promise and manually maintained loading/saving flags.
Generated translations follow the canonical changes. Tests and bundle fixtures
that intentionally exercise raw async behavior are not application guidance.

## Resulting profile flow

```text
Before
  createProfile(api) → draft + pending + error + API + fact

After
  createProfileModel → draft + validation + accepted profile + fact
  profileSaveMO → createMutationModel → pending/error
  save command → await mutate → acceptSaved → profileSaved
  SaveNotice → owner-managed bond → notification
```

The save command still chooses single-flight and snapshots the submitted draft.
TanStack does not supply those business policies automatically. The mutation
owns request state; the command handles its rejected Promise. A successful save
updates the accepted profile without replacing the independently edited draft.
The notification lifetime follows a mounted owner.

The recipe's endpoint remains application-supplied. Native RHF is appropriate
for larger form validation; native useMutation is appropriate if no atom/model
consumer participates. No new public runtime helper is added for these cases.

## Sources

- [TanStack mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [Server state versus client state](https://tanstack.com/query/latest/docs/framework/react/guides/does-this-replace-client-state)
