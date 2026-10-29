# Organizing code with holo

Keep data rules in atoms and models, UI behavior in Views, and the connection between them in holo bindings. This lets you change each part without collecting all the logic in a page component.

::: info Recommended stack
These guides use Jotai for reactive state, TanStack Query for server data and React Hook Form for forms. The Query and RHF integrations are optional.
:::

<span id="follow-the-data"></span>

## Separate responsibilities {#responsibilities}

| Code                                                       | Place it in             |
| ---------------------------------------------------------- | ----------------------- |
| Shared values, calculations and business rules             | Atoms or models         |
| Markup, accessibility, DOM methods and UI hooks            | View                    |
| Atom values and callbacks supplied to a View               | holo binding            |
| Choosing model instances and connecting independent models | Application composition |
| Request caching, retries and invalidation                  | TanStack Query          |
| Form validation, touched and dirty state                   | React Hook Form         |
| Translating facts into analytics messages                  | Analytics model         |

Connect each View to the values it displays. A parent component composes those connected Views; it does not need to subscribe to all their data and pass it down.

Choose data sources and integrations where you assemble the models. A business model can accept data through a command without importing the code that loads it. A View can receive values and callbacks without importing its business model.

## Add models when you need them {#start-small}

Start with ordinary atoms. Group related state and commands in a model. Use a factory for independent instances, and a registry when separate consumers need to select the same instance by key.

Declare atoms, model definitions and holo bindings outside React render. A registry keeps local model instances; QueryClient already owns the server cache.

## Keep native tools where they fit

Use native Query hooks when only React needs a request. Use native RHF when only the form needs its state. Add their model adapters when other atoms or commands need access to those values and operations.

The same rule applies to context: a value used only by React can stay in its provider. Sharing a value between components does not by itself require an atom.

## Give connections an owner

<span id="distinguish-retained-state-from-active-work"></span>

Use `holo.models` when a model has managed connections. The first committed owner activates them; the last release disconnects them. Reading one of the model's atoms directly does not acquire this work.

A registry can retain state after the owners leave. `retainTime` keeps the instance, not its subscriptions. See [models and registries](/topics/models-and-registries) and [model composition](/topics/model-composition).

## Publish facts for independent consumers

A command expresses an action to perform. A completed operation can publish a fact. Consumers can react without becoming dependencies of the business model.

Keep analytics outside business models and Views. Include the data that describes the occurrence in the fact; a delayed consumer must not reconstruct it from newer state. Analytics-specific names and formats belong in its mappers.

<span id="optional-entry-points"></span>

Continue with [atoms and models](/topics/atoms-and-models) for choosing state scope, [integrations](/guide/ecosystem) for the optional tools, or [recipes](/recipes/) for complete workflows.
