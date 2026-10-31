# Persistence architecture

Status: proposed replacement with an executable internal prototype. The library
runtime and public contract have not been changed. PR #15 removes example-level duplication but does
not implement this replacement. Do not merge it as evidence that persistence
itself has been redesigned.

## Read the code

- [writer.ts](./prototype/writer.ts): complete `accept` / `flushThrough` writer.
- [controller.ts](./prototype/controller.ts): real Jotai subscription, restoration,
  debounce and disconnect, using the retained writer.
- [operation.ts](./prototype/operation.ts): bounded outcome versus actual settlement.
- [prototype.test.ts](./prototype.test.ts): positive behavior checks for the prototype.

```sh
pnpm exec vitest run --config design/persistence/vitest.prototype.config.ts
pnpm exec tsc --noEmit -p design/persistence/tsconfig.json
```

The prototype is deliberately outside `src`: it lets readers judge real code
before replacing the library implementation. It does not yet implement the
public atom facade or integrate resource ownership. The 13 tests cover selected
high-risk scenarios, not every acceptance case below. Prototype status callbacks
are trusted: observer-exception handling and full option validation are not yet
part of this code. This is code to review, not a production replacement.

## Decision

Keep the public `persist` declaration. Replace the shared mutable `Runtime`
with a retained controller, an independent snapshot writer, and a short-lived
connection session. Use direct async code with named operations and local typed
states. Do not introduce an event bus, reducer interpreter, generic task runner,
or writer pause/hold protocol.

The distinction that drives the design:

- A connection owns the right to observe and restore an atom.
- The retained writer owns captured data and unfinished storage work.
- Ending a connection removes the first responsibility, not the second.

### Before

```text
persist.connect
  └── shared Runtime
      ├── initialization flags + connection generation
      ├── restore promise + application suppression
      ├── pending snapshot + revisions + worker
      ├── timer + scheduling
      └── flush callback

run → schedule → run
restore completion → schedule
cleanup → run
```

### After

```text
persist                    public declaration and Jotai status atoms
  └── controller / store   observation, restoration, autosave policy
      ├── connection      subscription, timer, restore attempt
      └── snapshot writer retained captured data and storage ordering
          └── operation   deadline outcome and actual settlement

localStorageAdapter        concrete storage adapter
```

The writer has no Store, source atom, session token, restore callback, timer, or
`isCurrent` callback. The controller cannot mutate writer state.

## Evidence from the current implementation

Read `src/persist.ts`, `tests/persist.test.ts`, `src/resource.ts`,
`src/model-managed.ts`, and the local persistence example. Two additional
characterization tests reproduce faults through the existing public interface:

```sh
pnpm exec vitest run --config design/persistence/vitest.config.ts
```

These tests intentionally assert the current defective outcomes. They document
why the replacement is necessary; they are not regression requirements to keep.
When implementation begins, replace them with acceptance assertions in
`tests/persist.test.ts` and remove this diagnostic configuration.

| Reproduced sequence                                               | Current result                             | Required result                                     |
| ----------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| Write 1 hangs, times out, write 2 succeeds, write 1 finishes late | Storage is 1, atom is 2, `$dirty` is false | Write 2 cannot start while write 1 can still commit |
| Edit, disconnect, await `flush` while final write is pending      | `flush` resolves immediately               | `flush` confirms its captured revision or rejects   |

The tests passed as characterizations of these faults. The library replacement itself
has not been implemented or verified by these diagnostic tests; the separate
prototype suite asserts the proposed positive behaviors.

## Public interface

Keep `persist({ read, restore, storage, key, codec, save, timeout })`, managed
ownership, `$restoring`, `$saving`, `$dirty`, `$error`, and `flush`.
Keep `localStorageAdapter` exported from `jotai-holo/persist`.

No new public utility, framework, retry policy, scheduler dependency, or state
machine abstraction is needed. Types belonging to public options remain public;
writer/controller/operation interfaces remain private.

A declaration performs no I/O. The first owner creates a controller for that
store and connects it. Two owners share a connection through existing resource
ownership. Two stores have independent controllers. The scope of write ordering
is one persistence declaration in one store, not every writer of the same key
or every browser tab. Do not add a hidden global lock registry.

A storage write acknowledgment must mean that its operation has finished. An
adapter must not resolve its promise and then commit the same write later. The
library can track the returned operation, not unreported side effects.

Snapshots follow the same immutable-value convention as Jotai state. Accepting a
snapshot captures its reference and revision; it does not deep-clone arbitrary
values. An adapter may encode/copy values for its own storage format.

`restore` must apply synchronously. A returned thenable is a contract error.
Detecting that misuse cannot cancel arbitrary async effects already started by
the user's writable atom; do not promise otherwise.

### Intentional behavior refinements

| Behavior                                       | Existing implementation                                          | Target                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `flush` target                                 | Depends on when `run` encounters a worker; can chase later edits | Finite revision captured at invocation                          |
| Detached `flush`                               | Successful no-op                                                 | Await/retry already captured data; never observe new data       |
| Timeout during storage write                   | Frees worker despite possible physical activity                  | Reject waiting callers but retain the occupied write lane       |
| `$saving` after physical write timeout         | False                                                            | True until the underlying operation settles                     |
| Late success after timeout                     | Can corrupt newer acknowledged data                              | Releases the lane only; no acknowledgment or automatic retry    |
| Ordinary write failure with newer demand       | May schedule a newer write                                       | Halt the current drain, reject its requests, retain latest data |
| Reconnect after local edits superseded loading | May repeat a read that cannot apply                              | Skip the obsolete read                                          |

The stop-on-error rule is intentional: a failed drain does not quietly promise
that newer pending data was attempted. It stays dirty and exposes an error.
Another explicit flush, a new local edit, or reconnect requests another attempt.
A timer already associated with a newer edit may supply that new request. The
same failed revision does not schedule its own retry loop.

These are contract changes to document and test during implementation, not
claims of strict behavior-preserving refactoring.

## State ownership

| Owner                   | Private facts                                                                        | Lifetime                                    |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| Declaration             | Options and public atom definitions                                                  | Declaration                                 |
| Controller in one store | Observed revision, initialization result, current session, writer                    | Until store/declaration becomes unreachable |
| Connection session      | Subscription, debounce timer, restore attempt, synchronous restore-application scope | One connection                              |
| Writer                  | Latest accepted snapshot, confirmed revision, active attempt, pending flush requests | Retained controller                         |
| Operation               | Abort signal, deadline, bounded outcome, actual settlement                           | One encode/read/write attempt               |

No module receives a shared `Runtime` object. Public booleans are projections;
modules do not read them back as control flags.

A writer completion remains relevant after disconnect: it belongs to the
retained queue. A restore completion belongs to its connection and loses the
right to apply after disconnect. Do not apply one generation check to both.

## Writer: two entry points

```ts
type Revision = number;

type Snapshot<Value> = Readonly<{
  revision: Revision;
  value: Value;
}>;

interface SnapshotWriter<Value> {
  accept(snapshot: Snapshot<Value>): void;
  flushThrough(target: Revision): Promise<void>;
}
```

The controller alone assigns monotonically increasing observed revisions.
`accept` requires a strictly newer revision, replaces the latest snapshot and
never starts I/O. `flushThrough(0)` succeeds immediately. A target greater than
the latest accepted revision is an internal programming error.

The writer owns `confirmedRevision`, meaning a successfully acknowledged cut,
not a claim about all physical contents of storage. It has no duplicate accepted
counter: the latest snapshot contains that revision.

A constructor receives codec/storage write configuration, timeout, and one
immutable status notification callback. No observer abstraction is needed.

### Drain rules

1. `flushThrough(R)` resolves when `confirmedRevision >= R`.
2. Every request keeps its own target. Later edits cannot extend it.
3. If no attempt is active, start encoding the latest accepted snapshot.
4. On success, acknowledge its revision and resolve all covered requests.
5. If accepted requests still need a newer cut, start the latest snapshot.
6. If all requested cuts are covered, stop. Accepting data alone is not demand.
7. On error, reject the outstanding drain requests and retain the latest data.
8. A new request may retry; the failed drain does not retry itself.

The writer must continue an already accepted request after an earlier write
completes. "No automatic start" refers to `accept`, not to the continuation of
`flushThrough`.

At most one active snapshot and one latest snapshot need be retained. Keep the
latest snapshot even when starting a job, so failure cannot discard the only
recoverable copy. Pending promise requests are resolved/rejected and removed at
terminal outcomes.

### Coalescing and debounce

```text
accept(1), flushThrough(1) → write 1 starts
accept(2), flushThrough(2) → request waits
accept(3)                 → latest snapshot becomes 3
write 1 succeeds          → request 1 resolves
write 3 succeeds          → request 2 resolves
```

Saving 3 satisfies the requested cut 2. A flush confirms coverage, not an exact
historical image. Debounce decides when the controller creates demand; it does
not forbid a newer snapshot from satisfying existing demand.

### Local typed phases

```text
idle
  → encoding(snapshot)
  → writing(snapshot, physical settlement)
  → idle

encoding timeout → failed; late encoder result cannot start storage
writing timeout → blocked(error, physical settlement)
blocked settlement → failed; latest snapshot stays dirty
failed + new request → encoding(latest snapshot)
```

These are writer phases, not a product of ownership, restoration and queue
states. A `blocked` phase carries the settlement promise; no non-null assertion
should be needed to infer which promise belongs to it.

## Controller: source policy and connection lifecycle

The retained controller has two entry points: `connect(): Stop` and
`flush(): Promise<void>`. It uses the real Jotai store; do not add a mock source
interface simply to hide Jotai. The writer and operation already supply useful
independent seams.

On each observed local edit, increment the revision and synchronously call
`writer.accept({ revision, value })`. Arm/replace that session's debounce timer.
The timer requests a flush of the current revision.

An edit is covered by either the latest armed timer or an autosave request that
has already captured its cut. A later edit after a timer fires arms another
timer. Explicit flush cancels the current timer and replaces it with its own
request. Disconnect cancels the timer and replaces it with the final cut. This
prevents a cut-0 flush from becoming the only save request for a later edit.

### Connect

1. Reject a duplicate direct connection. Existing resource ownership still
   handles multiple legitimate owners.
2. Create a session identity and subscribe to the source.
3. If restoration is still eligible, start read/decode for this session.
4. Otherwise use an already fulfilled restoration barrier.
5. If a retained dirty snapshot exists, request saving it through this session's
   barrier; do not reread the source to reconstruct it.

Initialization is complete after a successful read, a missing document, or local
work taking authority over remote restoration. A failed read with no local edits
leaves restoration eligible for the next connection. Once an observed local
revision exists, no later restore can overwrite it, including after reconnect.

### Restoration

```text
read(key, signal)
  → missing: no apply
  → decode(stored)
  → check session identity + cancellation + local authority
  → apply synchronously
```

Apply only if the session is still current, the attempt is valid and no local
revision has been observed in the retained controller. The synchronous apply
scope suppresses its own subscription echo, with `try/finally` restoring that
scope. Other edits after the scope are normal local snapshots.

Keep the initial restore barrier for compatibility: a local edit makes the
loaded result ineligible but does not immediately start a write over the active
initial load. The barrier ends on completion, failure, timeout or disconnect.
Do not claim a global prohibition on writes during loading: already accepted
writer requests are independent of connection changes.

The barrier always fulfills: it means "restoration no longer prevents this
request from writing", not "read succeeded". Errors are published separately.
A rejected raw read promise must not prevent captured local data from saving.

Old attempts can never apply data, clear the current session's restoring status,
or schedule new timers for a replacement session.

### Explicit flush

```ts
const target = observedRevision;
const barrier = currentSession?.restorationBarrier ?? Promise.resolve();
cancelCurrentDebounce();
await barrier;
await writer.flushThrough(target);
```

Capture both target and barrier before the first await. A request survives the
end of its originating session. It never rereads the source or requires the old
session still to be current.

Before the first connection, no snapshots have been captured, so flush is a
no-op with no I/O. After disconnect, it can await or retry the captured cut.
Edits made while disconnected are outside observation and are not discovered by
a detached flush.

A failed read alone does not make `flush(0)` reject: flush confirms writes, not
successful restoration. Restoration failure remains visible in `$error`.

### Disconnect

1. Unsubscribe from the source.
2. Cancel the debounce timer.
3. Invalidate this session's right to restore; clear it as the current session.
4. Abort/cancel restoration waiting and fulfill its barrier promptly, even if
   the underlying read ignores abort.
5. Request the last observed cut without debounce.

Do not cancel physical writes and do not reread the source. Cleanup remains
synchronous; its final save is best effort and failure is observable in status.
A caller needing confirmation can await the retained controller's flush.

## Deadline outcome versus physical settlement

```ts
interface Operation<Value> {
  outcome: Promise<Value>;
  settled: Promise<void>;
  cancel(reason: unknown): void;
}
```

`outcome` settles on result, failure, cancellation or deadline. `settled` tracks
when the actual operation has finished and always fulfills, after handling any
late rejection. Cancellation is idempotent. Timers and parent-signal listeners
are cleaned at the logical terminal outcome.

One timeout budget covers read plus decode, and another covers encode plus
write for each write attempt. Do not silently double the existing timeout by
allocating a full timeout separately to every phase.

Read/decode results can be discarded after cancellation. A timed-out pure
encoder can also be discarded; its result must check the attempt identity/signal
before calling storage. A late encoder does not occupy the physical write lane.

After `storage.write` has started, timeout sends abort and rejects callers but
keeps the physical lane occupied until `settled`. No second storage write may
start while the first might still commit.

While blocked, a flush requiring an unconfirmed cut rejects promptly with the
blocking error. Already confirmed targets still succeed immediately. It does
not create an indefinitely pending retry request. Accepting new snapshots remains
allowed. Late settlement only releases the lane: it neither acknowledges the
uncertain attempt nor resumes its rejected requests. A subsequent edit, flush,
or reconnect supplies fresh demand.

If the adapter never settles, this declaration cannot safely start another
write to that key. The existing interface cannot guarantee both progress and
physical ordering for such an adapter. Do not invent success by forgetting the
operation or solve this by adding a process-global lock.

## Status and error policy

| Public atom  | Owner of the underlying fact                                             |
| ------------ | ------------------------------------------------------------------------ |
| `$dirty`     | Writer: latest accepted revision is greater than confirmed revision      |
| `$saving`    | Writer: encoding active or a physical write still unsettled              |
| `$restoring` | Current session has an unfinished valid restore attempt                  |
| `$error`     | Controller projects write failure first, then applicable restore failure |

Only the facade publishes public atoms from immutable status snapshots. The
writer publishes its own facts; the controller combines them with restoration.
There are no scattered writes to public status atoms from promise branches.

Maintain separate restore and write failure provenance. Success clears only the
failure of the operation it supersedes. A confirmed local write can make a prior
restore failure obsolete because local data is now authoritative; it cannot
clear a newer write failure. Keep this rule named and tested, not expressed as
"any success sets error to undefined".

After a physical write timeout:

```text
outcome timed out:     error + dirty + saving
physical settlement:  error + dirty + !saving
successful new retry:  !error + !dirty + !saving
```

The late operation may actually have committed, but no cut is confirmed from its
expired outcome. A later retry can redundantly write the same snapshot.

## Target source structure

```text
src/persist.ts                   public facade, exports, Jotai status atoms
src/persistence/controller.ts    source observation, restoration, autosave policy
src/persistence/writer.ts        latest snapshot, explicit demands, write ordering
src/persistence/operation.ts     deadline outcome and actual settlement
src/persistence/local-storage.ts concrete adapter
```

Keep the short `read → decode` function in controller initially. A separate
restore module is justified only if it develops its own substantial protocol.
Keep types with their owning modules, not in a generic shared `Runtime`/`types`
dump. Public option types remain owned by the facade; type-only references from
private modules must not create runtime import cycles.

The adapter move is optional and must not change exports. It is not a new
interface. The operation helper is shared because restore and write both need
deadline handling; it must expose physical settlement instead of pretending to
cancel arbitrary side effects.

## Alternatives considered

| Design                                                | Advantage                                             | Reason not to use as-is                                                |
| ----------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| One retained controller with private closures         | Small entry interface                                 | Still risks hiding every mechanism in one long closure                 |
| Explicit event reducer plus effect interpreter        | Exhaustive transitions                                | Too much message plumbing; one write spans emitter/reducer/interpreter |
| Writer with `stage`, `flush`, `hold`                  | Separates restore from storage                        | Adds a cross-module pause lease and another ordering protocol          |
| Selected: controller + `accept`/`flushThrough` writer | Independent writing algorithm, explicit finite demand | Requires precise cut and barrier semantics, specified above            |

Use typed local phases and the transition tables without implementing a generic
reducer framework. Avoid extracting functions whose interfaces require the
whole controller state; that would move the monolith rather than divide it.

## Acceptance scenarios for implementation

Tests assert observable outcomes, not state-object layouts or private helper
calls. Writer tests can use a controlled storage adapter without Jotai;
integration tests use a real store and the public persist interface.

| Sequence                                                          | Required observation                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Initial restore, reconnect                                        | Read once after successful initialization; no write-back                        |
| Missing data                                                      | Keep current value, initialize, remain clean                                    |
| Edit while read/decode pending                                    | Loaded value never overwrites local data                                        |
| Release/reconnect, old read finishes                              | Only the current session may restore or publish restoring status                |
| Edit 7, release, source changes to 99                             | Only captured 7 is written                                                      |
| Flush at cut 0, later edit while restore pending                  | First flush may complete at 0; later edit has its own save request              |
| Write 1, accept 2/3/4                                             | At most one physical write; coalesce pending to latest                          |
| Flush cut 1, later edit 2                                         | Cut 1 does not wait for 2 if 1 is confirmed                                     |
| Flush cut 2, next saved snapshot 3                                | Confirmation of 3 covers cut 2                                                  |
| Write failure while newer cuts are waiting                        | All current drain requests reject; latest snapshot remains dirty; no self-retry |
| New explicit flush after failure                                  | One new attempt; success clears the relevant failure                            |
| Reconnect during old physical write                               | Reuse writer; new data waits for its lane                                       |
| Read timeout with ignored abort                                   | Late result ignored; cancellation/barrier remains bounded                       |
| Encoding timeout, late encoder succeeds                           | No storage call from expired encoder                                            |
| Physical write timeout                                            | Flush rejects; no overlapping physical write; saving remains true               |
| New flush while timed-out write unsettled                         | Prompt rejection, no queued hidden retry                                        |
| Late settlement after physical timeout                            | No automatic retry or acknowledgment; next request can save                     |
| Detached flush                                                    | Await/retry captured cut, never resubscribe or read current source              |
| Error in decode, then confirmed local save                        | No overwrite; obsolete read failure can be cleared explicitly                   |
| Restore returns a thenable                                        | Contract error; suppress echo scope always exits                                |
| Two owners / last release                                         | One subscription/restore; only last release disconnects                         |
| Two stores sharing declaration                                    | No shared data, writer, errors or cancellation                                  |
| Encoding, storage call or subscription setup throws synchronously | Observable failure and cleanup; no leaked timer/subscription                    |

Also test that a failure in either error lane is not erased by an unrelated
completion, flush waiters are removed at completion, and timed-out/late rejections
never become unhandled rejections.

## Implementation sequence

1. Add public acceptance tests for finite cuts, detached flush, timeout ordering,
   stale restore attempts and the stop-on-error policy. Keep existing valid
   behavioral tests; replace the two design probes with positive assertions.
2. Implement the writer with its two-entry interface, independently of Jotai.
   Test physical fences, covered cuts, coalescing and failures through it.
3. Implement operation deadlines exposing both logical and physical outcomes.
   Check timeout budgets and late rejection cleanup.
4. Implement the controller's linear connect/restore/disconnect flows around the
   writer. Integrate real store subscriptions and immutable status publication.
5. Replace the facade internals, retain exports, and delete the old Runtime/run/
   schedule implementation. Do not keep a second fallback implementation.
6. Revisit the workbook simplification after this is stable. Update the reference
   contract and translations, then run package, ownership, persistence, memory,
   browser and workbook scenarios.

Do not merge a large internal rewrite on the strength of the current seven tests
alone. Completion means the target behaviors above are implemented and verified,
not that the old file has become shorter.
