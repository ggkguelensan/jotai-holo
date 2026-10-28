# localStorageAdapter

Use browser localStorage as the JSON storage transport for persist.

Read the [local draft recipe](/recipes/server-data#a-model-saving-locally) and [Models and registry](/topics/models-and-registries) for instance ownership.

## Usage

```ts
import { localStorageAdapter } from 'jotai-holo/persist';

const storage = localStorageAdapter();
```

## Contract

localStorageAdapter() returns `PersistenceStorage<unknown>`. read parses stored JSON and returns undefined for an absent key; write serializes the supplied value. Access happens when storage methods run, not during declaration. A codec still validates the decoded business value.

Browser storage access, malformed JSON and serialization failures propagate to persist. The native synchronous localStorage calls cannot be interrupted by AbortSignal. The adapter adds no cross-tab synchronization, encryption or removal policy.

## Why this API

Keep the storage transport separate from snapshot validation and ownership. An IndexedDB adapter can implement the same PersistenceStorage interface without changing the model.

## Analogies and reading

- [Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) — browser contract and exceptions.
- [persist](/reference/persist) — restoration, saving and error state.
