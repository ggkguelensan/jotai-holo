# persist

Restore a validated snapshot and save local edits while a model has an owner.

Read [Models and registry](/topics/models-and-registries) for ownership and the [local draft recipe](/recipes/server-data#a-model-saving-locally) for a complete binding.

## Usage

```ts
import { stateAtom } from 'jotai-holo/vanilla';
import { localStorageAdapter, persist } from 'jotai-holo/persist';

function createDraftModel() {
  const $draft = stateAtom('');

  const disk = persist({
    read: $draft,
    restore: $draft,
    storage: localStorageAdapter(),
    key: 'profile-draft',
    codec: {
      decode: (value) => (typeof value === 'string' ? value : ''),
      encode: (value) => value,
    },
    save: { debounce: 300 },
  });

  return { $draft, disk };
}
```

## Contract

Import from jotai-holo/persist. persist returns a managed declaration with $restoring, $saving, $dirty, $error and a writable flush action returning `Promise<void>`. Declaration does not touch storage. A model owner acquires a top-level returned declaration; a plain instance needs an explicit connection owner.

read supplies snapshots; restore accepts decoded values. storage implements read/write with an AbortSignal. codec validates and translates stored values; encode and decode may be async. key identifies the stored draft, independently of a registry key.

save.debounce defaults to 0; timeout defaults to 10,000 ms. Local edits take priority over late restoration. Writes are serialized and coalesced within one persistence declaration in one store.

flush captures the latest observed revision when called. Its Promise resolves after that revision or a newer snapshot is saved; later edits do not extend the request. Release stops observation and attempts the captured pending write. After release, flush can await or retry captured data without subscribing again or reading new edits. Browser shutdown does not guarantee completion.

If a write times out, flush rejects and $error records the failure. Storage cancellation is cooperative: $saving stays true until the underlying write finishes, and no newer write starts in parallel. Late completion does not confirm the timed-out snapshot. Retry with flush after the operation finishes. A storage operation that never finishes blocks further writes for this declaration.

## Why this API

Persist the draft, not the Query cache. Storage format and validation stay in the codec. Instance retention alone does not survive reload; local persistence does not save to a server.

## Analogies and reading

- [Jotai storage utilities](https://jotai.org/docs/utilities/storage) — simpler persistent atom alternatives.
- [Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) — browser storage behavior.
- [localStorageAdapter](/reference/localStorageAdapter) — the supplied JSON adapter.
