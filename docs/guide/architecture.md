# Architecture and stack

A profile editor has at least two kinds of data: the server's saved profile and
the user's unsaved draft. A request cache owns the first. A business model can
own the second. The View lets the user edit it.

Keeping those responsibilities separate lets you change how a profile is loaded
without rewriting its editing rules.

::: info Opinionated architecture
These guides recommend Jotai for reactive business state, TanStack Query for
server data, RHF for forms and holo for React bindings. This is an application
architecture, not a requirement of React or Jotai. You can use holo with ordinary
atoms and add integrations only when a task needs them.
:::

## Follow one edit {#follow-the-data}

Consider an editor with a name field and a save toolbar:

1. A Query operation obtains the saved profile.
2. An application connection passes it to the profile model's input command.
3. The model holds a draft and calculates whether it can be saved.
4. Small holo bindings supply the field and toolbar with values and callbacks.
5. The save command starts a mutation. A successful result can update the draft
   and publish a fact for other consumers.

```text
Query cache ── connection ──► profile draft ── read ──► View
                                  ▲                    │
                                  └───── write ────────┘
                                  │
                            save command
                                  │
                               mutation
                                  │
                             saved fact ──► analytics
```

The business model accepts profile data. It need not know whether that data came
from Query, a local draft or a parent component. The application chooses and
connects those sources.

## Put each decision in one place {#responsibilities}

| Question                                       | Where it belongs             |
| ---------------------------------------------- | ---------------------------- |
| Is this profile change allowed?                | Business model               |
| Which saved response is cached?                | TanStack Query's QueryClient |
| Is this form field touched or invalid?         | RHF                          |
| Which editor instance does this screen use?    | Application composition      |
| Which atom supplies the field's value?         | holo binding                 |
| How is the field labelled and rendered?        | React View                   |
| What message does an analytics engine receive? | Analytics model              |

The assembly code may import the participants to connect them. The business
model and View do not need to import an analytics SDK. Analytics observes facts
that remain meaningful without any analytics consumer.

A successful save is one such fact. A click on Save is an interaction that might
fail validation or fail on the server. Choose the event according to what the
consumer needs to know, and include the data available at that moment.

## Start with the smallest useful arrangement {#start-small}

For a single name field, use an atom and holo. Group related atoms in a record
when several commands work on them. Make that record a factory when you need
independent drafts.

Add a registry when components must find the same instance by a key such as a
profile ID. A registry retains local instances; QueryClient already owns the
server cache. Exposing a Query result as an atom is not a reason to add another
registry around it.

Before adding any value to Jotai, ask who needs to react to it. A language used
only by React components can stay in the localization provider. A request used
only by a card can stay in a native Query hook. A form used only by its fields
can stay in RHF. The adapters matter when the atom/model graph needs those
values or operations.

## Distinguish retained state from active work

Two Views can own the same selected model. Its connections stay active until
the last owner releases it. The registry may then retain the instance so the
user can return to the same draft.

Retaining a draft does not mean keeping its subscriptions running. Read
[models and registries](/topics/models-and-registries) for ownership and
retention, and [model composition](/topics/model-composition) for attaching work
to a model.

## Optional entry points

Start with `jotai-holo` for React bindings. Model-only code can import atom
helpers from `jotai-holo/vanilla` without importing React bindings.

Other entry points correspond to specific tasks:

| Task                                   | Import                           |
| -------------------------------------- | -------------------------------- |
| Compose model factories and modifiers  | `jotai-holo/model`               |
| Use Query operations in the atom graph | `jotai-holo/query`               |
| Expose native RHF state to models      | `jotai-holo/rhf`                 |
| Connect analytics engines              | `jotai-holo/analytics`           |
| Add the Amplitude adapter              | `jotai-holo/analytics/amplitude` |
| Restore and save snapshots             | `jotai-holo/persist`             |

For a concrete next step, read [atoms and models](/topics/atoms-and-models) or
[the server-data recipes](/recipes/server-data). Supported versions and measured
costs live in the [compatibility matrix](/compatibility) and
[bundle measurements](/bundle-size).
