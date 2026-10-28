# Architecture and stack

::: info Opinionated architecture
The recommended architecture uses Jotai for reactive business logic, TanStack Query for server data, RHF for forms and holo for React bindings. These are application conventions, not requirements of React or Jotai. Optional integrations are separate imports; start with only the tools your task needs.
:::

## Responsibilities

| Layer                   | Owns                                                  | Does not own                                  |
| ----------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Business model          | Rules, draft state, commands, facts                   | HTTP, form markup, analytics SDKs             |
| QueryClient             | Server cache, request identity, network policy        | Unsaved business drafts                       |
| RHF                     | Form control, validation, field state                 | Application-wide business rules               |
| Application composition | Connections, dependencies, instance selection         | View markup                                   |
| holo                    | Atom values, callbacks, committed props, model owners | Business rules or another state engine        |
| View                    | Markup, accessibility, local interaction              | Model subscriptions and infrastructure wiring |
| Analytics model         | Fact selection and engine-specific mapping            | Business decisions                            |

## Follow the data

```text
Query → input command → business model → holo → View
                             ↑                 │
                             └──── command ────┘
                             │
                          domain fact
                             │
                       analytics model
```

Use an atom only when the reactive graph needs the value. React context, a router and a localization provider can keep their existing responsibilities. Use native Query hooks and RHF components when only React consumes their data.

## Start small

Start with native atoms and a small View. Add a factory for related state, a registry for shared instances selected by key, and connections for work that needs an owner. Do not add a registry around server cache merely because Query results are exposed as atoms.

See [Atoms and models](/topics/atoms-and-models), [business logic and small Views](/guide/business-logic), and [ecosystem choices](/guide/ecosystem). Each API page distinguishes library behavior from native contracts and application policy.

## Optional entry points

| Import                         | Responsibility                     |
| ------------------------------ | ---------------------------------- |
| jotai-holo                     | React bindings and atom helpers    |
| jotai-holo/vanilla             | Atom helpers without React         |
| jotai-holo/model               | Factories and model modifiers      |
| jotai-holo/query               | TanStack Query and Mutation models |
| jotai-holo/rhf                 | Native RHF integration             |
| jotai-holo/analytics           | Vendor-neutral analytics           |
| jotai-holo/analytics/amplitude | Optional Amplitude adapter         |
| jotai-holo/persist             | Snapshot persistence               |

Read [verified compatibility](/compatibility) and [bundle measurements](/bundle-size) for tested versions and measured costs. Engineering reports describe the implementation; they are not extra application layers.
