# Models and registry

A group gift order needs a copy counter and a toolbar to share one draft. Another recipient group needs its own draft. A registry lets both widgets find the instance by gift order ID, without passing its atom record through their parents.

[Open the gift order example](/examples/model-instances). Add a game copy to the Atlas gift draft: its counter changes, while Beacon keeps its own count.

## Create the atoms {#why-use-a-registry}

The factory creates a fresh record of atoms on every call. It knows how a gift order works; it does not choose which gift order a component edits.

<<< @/../examples/docs/model.tsx#gift-order-factory

Wrap the factory once, at module scope. The resulting definition can select and retain instances in a Jotai store.

<<< @/../examples/docs/model.tsx#gift-order-registry

## Select one draft from two widgets {#what-the-registry-adds}

The counter selects by `giftOrderId` and reads the copy count.

<<< @/../examples/docs/model.tsx#gift-order-copies

The toolbar selects through the same definition and writes to the selected model.

<<< @/../examples/docs/model.tsx#gift-order-toolbar

Within one store, the same key selects the same record. A newly created array with the same supported key structure still selects that record. Another key selects another record. Another Jotai store isolates the state.

These are different operations:

| Operation                         | Result                                   |
| --------------------------------- | ---------------------------------------- |
| Call `createGiftOrderModel()`     | Create fresh atoms                       |
| Call `$$giftOrder({ key })`       | Describe which instance to select        |
| Read the selection in a store     | Get that instance's atom record          |
| Mount a holo using that selection | Own its managed connections after commit |

## Keep state without keeping work alive

The first owner starts managed connections. The last owner releases them. `retainTime` controls how long the record remains available afterward; its default is `Infinity`. Returning to Atlas can therefore restore its draft without leaving a network subscription running while Atlas is closed.

Retention is in-memory storage, not persistence across reloads. For an unbounded set of IDs, choose finite retention or remove unused entries explicitly. [modelRegistry](/reference/modelRegistry) describes acquisition, removal and flushing saves.

## When a registry is unnecessary

Use a plain record when the caller already creates and passes the required instance. Use module-level atoms for deliberately shared state. A registry does not clone those imported atoms: only atoms created inside the factory are new per instance.

QueryClient already shares server query data by `queryKey`. Add a registry when a feature needs its own draft or editing session, rather than to duplicate the server cache. See [Atoms or models?](/topics/atoms-and-models#what-belongs-to-an-instance).

## defineModel

[defineModel](/reference/defineModel) optionally labels a factory's role. It returns the same function with the same arguments and return type; a named function works equally well.

<<< @/../examples/define-model.ts#factory

Continue with [Model composition](/topics/model-composition) to attach work to these instances.

## API reference

- [defineModel](/reference/defineModel)
- [modelRegistry](/reference/modelRegistry)
