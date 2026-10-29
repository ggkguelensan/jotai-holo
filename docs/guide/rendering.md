# Rendering and async

## What is lazy?

An atom declaration does not run its calculation. Reading the atom starts the calculation; subscribing keeps its dependencies active. Likewise, `holo` subscribes when mounted, `bond` connects through `connect(store)`.

| Operation                                    | Expected work                                       |
| -------------------------------------------- | --------------------------------------------------- |
| Declare prism selectors                      | No selector runs                                    |
| Read one prism output                        | Only that output computes                           |
| Change source while a selector is subscribed | It recomputes; Object.is decides notification       |
| Change an unrelated atom                     | No bound View update from that write                |
| Change an unbound writable target            | Action-only binding has no read subscription        |
| Parent passes a new object prop              | React shallow comparison can cause a View render    |
| Reorder holoList with stable keys            | Surviving rows keep local state; mapping still runs |

React can render a component more than once, especially in development. Measure committed updates, selector calls and subscriptions separately. If a large View rerenders for one small field, bind that field in a smaller View.

## Promise state

`stateAtom`, `ion` and `prism` keep raw Promise values. Only React state bindings unwrap them for a View. Use `<Suspense>` and an error boundary around a connected async View. Multiple bound reads start together; fulfilled async bindings do not create a new Suspense cycle when a neighboring synchronous value changes.

Prefer native `atom(async (get, { signal }) => …)` for cancellation-aware reads. Holo accepts it directly. `ion` does not implicitly await its inputs. `prism` does not cancel a Promise selector already started.

Initial Suspense delays commit: **input cannot initialize the state blocking the first render**. Initialize before rendering or use native async atoms or Query. Later Suspense hiding preserves model ownership; real unmount releases it.

## Async actions

Actions return the original result and Promise. They do not cancel, serialize, roll back, or implement latest-wins. The [profile recipe](/recipes/profile) uses a TanStack mutation, with explicit single-flight and Promise handling in the save command. `actionAtom` publishes call arguments when the synchronous handler returns, including when it returns a pending Promise. Publish a separate fact event after `await` if consumers need confirmed success.

## Evidence and reading

The [compatibility matrix](/compatibility) lists tested cases. The [aggregation notes](/aggregation) explain async reads, and the [bundle report](/bundle-size) shows measured application size changes.

Read [Jotai performance](https://jotai.org/docs/guides/performance), [Jotai async utilities](https://jotai.org/docs/utilities/async), and [React useEffect](https://react.dev/reference/react/useEffect) for the native behavior these bindings build on.
