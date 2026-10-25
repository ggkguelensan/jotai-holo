# Rendering and async

## What is lazy?

Declaring an atom or a binding does not execute a selector, construct a Bunshi model, or mount a View. Reads and subscriptions activate work through Jotai. An explicit `bond.connect(store)` activates its clock; event listeners activate when subscribed.

| Operation                                    | Expected work                                       |
| -------------------------------------------- | --------------------------------------------------- |
| Declare prism selectors                      | No selector runs                                    |
| Read one prism output                        | Only that output computes                           |
| Change source while a selector is subscribed | It recomputes; Object.is decides notification       |
| Change an unrelated atom                     | No bound View update from that write                |
| Change an unbound writable target            | Action-only binding has no read subscription        |
| Parent passes a new object prop              | React shallow comparison can cause a View render    |
| Reorder holoList with stable keys            | Surviving rows keep local state; mapping still runs |

Do not promise a fixed number of component invocations. React may render speculatively or replay work in development. Measure commits, subscriptions, selector calls and View calls separately. A large View still rerenders as a whole when one of its bound props changes; bind smaller leaves when necessary.

## Promise state

`stateAtom`, `ion` and `prism` keep raw Promise values. Only React state bindings unwrap them for a View. Use `<Suspense>` and an error boundary around a connected async View. Multiple bound reads start together; fulfilled async bindings do not create a new Suspense cycle when a neighboring synchronous value changes.

Prefer native `atom(async (get, { signal }) => …)` for cancellation-aware reads. Holo accepts it directly. `ion` does not implicitly await its inputs. `prism` does not cancel a Promise selector already started.

Initial Suspense delays commit: **cage.onMount cannot initialize the state blocking the first render**. Initialize before rendering or start the load through the model. Later ordinary Suspense hiding does not dispose the passive cage; real unmount does.

## Async actions

Actions return the original result and Promise. They do not cancel, serialize, roll back, or implement latest-wins. The [profile recipe](/recipes/profile) implements single-flight explicitly and catches failures in the model. `actionAtom` publishes call arguments when the synchronous handler returns, including when it returns a pending Promise. Publish a separate fact event after `await` if consumers need confirmed success.

## Evidence and reading

The [compatibility matrix](/compatibility), [aggregation design](/aggregation), and [Bunshi validation](/bunshi-validation) describe tested cases and limits. The [bundle report](/bundle-size) distinguishes application deltas from isolated exports; gzip sizes are not additive.

Read [Jotai performance](https://jotai.org/docs/guides/performance), [Jotai async utilities](https://jotai.org/docs/utilities/async), and [React useEffect](https://react.dev/reference/react/useEffect) for the native behavior these bindings build on.
