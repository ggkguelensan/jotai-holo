# Why jotai-holo

Jotai + holo is a fit when several parts of a React application must work with the same business state: fields edit a draft, a summary calculates a price, and a toolbar saves the result. Choose it when you want to build that logic from reusable atoms while keeping each View a small component with ordinary props.

Jotai supplies dependency tracking between atoms. holo adds declarative View bindings and a way to share model instances and own their connections. This combination is the reason to choose the stack; selective subscriptions and separating logic from markup are also possible with the alternatives below.

## Why build on Jotai?

Jotai lets you build state from small pieces. A derived atom reads other atoms; Jotai tracks those dependencies. Calculations can be reused by another calculation, a command or a View without turning them into React hooks.

This suits applications where several features combine the same data differently: a draft feeds field editors, validation, a price summary and a save command. Each consumer can read its own projection. Atoms can be declared at module scope or created by a factory for an independent editor; their values belong to a Jotai store.

These properties come from [Jotai](https://jotai.org/docs/basics/comparison). holo keeps native atoms usable rather than introducing a second state engine.

## What does holo add to ordinary Jotai? {#from-hooks-to-a-binding}

With plain Jotai you can already place useAtomValue and useSetAtom in small components, write model factories and manage subscriptions. Choose holo when you want a shared way to express those decisions throughout the application:

| Decision                                           | Convention supplied by holo                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Which data and commands does this View use?        | read and write bindings beside the View                                                              |
| Which editor instance do several components share? | models selects an instance; modelRegistry shares it by key and store                                 |
| Who starts and stops the model's connections?      | Managed model modifiers acquire work for committed owners and release it after the last owner leaves |

A binding can start with ordinary global atoms. Neither a model nor a registry is required:

```tsx
export const NameField = holo({
  view: NameView,
  read: { name: $name },
  write: { onChange: changeName },
  static: { title: 'Display name' },
});
```

NameView receives only its own field props. A page composes NameField, an independently connected avatar and a save toolbar. The page does not collect their subscriptions. See [holo and small Views](/topics/holo).

holo does not make this faster than equally granular Jotai hooks. Subscription placement and the values selected still determine which Views update. Its benefit is making that structure explicit and repeatable. If your existing Jotai hooks and ownership conventions already work well, you do not need another layer.

## Why not Zustand? {#why-separate-read-write-and-static}

[Zustand](https://github.com/pmndrs/zustand) is a direct choice when you prefer a state object with actions and selector-based subscriptions. It also supports standalone stores and independent instances; small subscription boundaries are not exclusive to atoms.

Prefer Jotai + holo when you want derived values to be independently reusable nodes in an atom graph, and want View bindings and keyed model ownership to follow this library's conventions. That is a choice of composition model, not a claim that Zustand cannot implement the same business scenario.

If a store with a few actions and selectors already describes your application clearly, adopting atoms and model modifiers may add concepts without improving it.

## Why not Effector?

[Effector](https://effector.dev/en/introduction/motivation/) is a direct choice when you want events, stores and effects to be the application's primary language. Its sample operator connects units; fork creates isolated scopes. [Reflect](https://reflect.effector.dev/learn/motivation) already offers declarative React bindings and inspired holo.

Choose Jotai + holo when you want to keep Jotai atoms and its ecosystem as the foundation, while adding explicit commands, facts and model composition where needed. eventAtom and bond support event-driven workflows, but bond does not reproduce Effector's scheduling or scope semantics. The [bond contract](/reference/bond) describes that boundary.

If Effector already gives your team the event graph, testing and isolation model it wants, View separation alone is not a reason to migrate.

## What does this choice commit you to? {#a-small-vocabulary-native-semantics}

This stack asks the team to design small Views, choose useful atom projections and give connections an owner. A registry also introduces instance keys and retention decisions. The [architecture guide](/guide/architecture) explains those responsibilities; the [compatibility matrix](/compatibility) and [bundle report](/bundle-size) document tested support and measured costs.

You can adopt it incrementally: connect existing atoms first, introduce model factories for independent state, then add keyed sharing or managed connections when required. An ordinary model record needs no registry.

Keep native TanStack Query hooks for UI-only server data and native RHF for UI-only forms. Use their model integrations when the reactive business system needs their state or commands. holo's value is the boundary between those systems and small Views; it does not require moving every value into Jotai.

Continue with [getting started](/guide/getting-started) for a first binding, or [atoms or models?](/guide/atoms-or-models) to choose how much structure a feature needs.
