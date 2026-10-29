# Why jotai-holo

<span id="the-goal-of-holo"></span>

Choose Jotai + holo when you want to change business rules without rewriting your React Views. Keep rules in atoms and models; connect small Views through ordinary props.

## Why Jotai?

[Jotai](https://jotai.org/docs/basics/comparison) lets you compose state and calculations from atoms. A calculation can use another calculation without depending on a React component. This makes the same business logic available across the application.

## What does holo add? {#from-hooks-to-a-binding}

holo describes the connection between a View and its atoms in one place. The View receives values and callbacks; the page composes connected components. Moving a component does not require forwarding its model's data through every parent.

Plain Jotai also supports this separation. holo provides conventions for bindings, model sharing and subscription cleanup, so each feature does not need to invent its own arrangement. Use it when you want the team to follow those conventions.

## Which approach fits your project?

<span id="why-separate-read-write-and-static"></span>
<span id="why-not-effector"></span>

| Choose                                                       | When                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Jotai                                                        | You want atom-based state and prefer to connect components with native hooks.                  |
| Jotai + holo                                                 | You want atom-based business logic, separate Views and common conventions for connecting them. |
| [Zustand](https://github.com/pmndrs/zustand)                 | You prefer to describe state as an object with actions and subscribe through selectors.        |
| [Effector](https://effector.dev/en/introduction/motivation/) | You prefer to build workflows around events, stores and effects.                               |

<span id="a-small-vocabulary-native-semantics"></span>

The trade-off is another set of conventions for the team to learn and maintain. Start with ordinary atoms and introduce model instances when you need independent or shared state.

[Getting started](/guide/getting-started) shows the first binding. [Architecture](/guide/architecture) explains where business logic, server data and forms belong.
