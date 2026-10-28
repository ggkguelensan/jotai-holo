import { captureEvent } from './event-harness.js';
import { atom, createStore } from 'jotai/vanilla';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { actionAtom, bond, eventAtom, type EventAtom } from '../src/vanilla.js';

test('eventAtom delivers every write without storing, cloning or replaying its payload', () => {
  const userCreated = eventAtom<{ id: string }>();
  const s = createStore();
  const user = { id: '1' };
  const first = vi.fn();
  const second = vi.fn();
  const notified = vi.fn();
  const stopValue = s.sub(userCreated, notified);
  s.set(userCreated, user);
  const stopFirst = captureEvent(s, userCreated, first);
  expect(first).not.toHaveBeenCalled();
  expect(s.set(userCreated, user)).toBeUndefined();
  s.set(userCreated, user);
  expect(first.mock.calls).toEqual([[user], [user]]);
  expect(first.mock.calls[0]![0]).toBe(user);
  const stopSecond = captureEvent(s, userCreated, second);
  expect(second).not.toHaveBeenCalled();
  expect(s.get(userCreated)).toBeNull();
  expect(notified).not.toHaveBeenCalled();
  stopFirst();
  stopFirst();
  s.set(userCreated, user);
  expect(first).toHaveBeenCalledTimes(2);
  expect(second).toHaveBeenCalledTimes(1);
  stopSecond();
  stopValue();
});

test('event subscriptions belong to one store and payloadless events need no argument', () => {
  const opened = eventAtom();
  const a = createStore();
  const b = createStore();
  const first = vi.fn();
  const second = vi.fn();
  const stops = [captureEvent(a, opened, first), captureEvent(b, opened, second)];
  a.set(opened);
  expect(first.mock.calls).toEqual([[undefined]]);
  expect(second).not.toHaveBeenCalled();
  b.set(opened);
  expect(second).toHaveBeenCalledTimes(1);
  stops.forEach((stop) => stop());
  expectTypeOf(opened).toEqualTypeOf<EventAtom<void>>();
});

test('eventAtom triggers bond with an inferred payload and works as a writable target', () => {
  const requested = eventAtom<{ id: string }>();
  const delivered = eventAtom<string>();
  const link = bond({ trigger: requested, map: (user) => [user.id], write: delivered });
  const s = createStore();
  const received = vi.fn();
  const stopListen = captureEvent(s, delivered, received);
  s.set(requested, { id: 'cold' });
  expect(received).not.toHaveBeenCalled();
  const stop = link.connect(s);
  s.set(requested, { id: '1' });
  s.set(requested, { id: '1' });
  expect(received.mock.calls).toEqual([['1'], ['1']]);
  expect(s.get(link)).toEqual(['1']);
  stop();
  stopListen();
});

test('event subscriptions and bond share FIFO delivery even with reentrant writes', () => {
  const event = eventAtom<number>();
  const s = createStore();
  const log: string[] = [];
  const first = captureEvent(s, event, (n) => {
    log.push(`first:${n}`);
    if (n < 2) s.set(event, n + 1);
  });
  const link = bond({
    trigger: event,
    write: actionAtom((_get, _set, n: number) => {
      log.push(`bond:${n}`);
    }),
  });
  const stopBond = link.connect(s);
  const last = captureEvent(s, event, (n) => {
    log.push(`last:${n}`);
  });
  s.set(event, 0);
  expect(log).toEqual([
    'first:0',
    'bond:0',
    'last:0',
    'first:1',
    'bond:1',
    'last:1',
    'first:2',
    'bond:2',
    'last:2',
  ]);
  first();
  stopBond();
  last();
});

test('unsubscribe skips an already queued listener and listeners added during delivery start next time', () => {
  const event = eventAtom<number>();
  const s = createStore();
  const seen = vi.fn();
  const late = vi.fn();
  let stopSecond = () => {};
  let stopLate = () => {};
  const stopFirst = captureEvent(s, event, () => {
    stopSecond();
    stopLate();
    stopLate = captureEvent(s, event, late);
  });
  stopSecond = captureEvent(s, event, seen);
  s.set(event, 1);
  expect(seen).not.toHaveBeenCalled();
  expect(late).not.toHaveBeenCalled();
  stopFirst();
  s.set(event, 2);
  expect(late.mock.calls).toEqual([[2]]);
  stopLate();
});

test('sync and async listener errors are reported without interrupting other listeners', async () => {
  const event = eventAtom<number>();
  const s = createStore();
  const errors: unknown[] = [];
  const sync = new Error('sync');
  const async = new Error('async');
  const received = vi.fn();
  const stops = [
    captureEvent(
      s,
      event,
      () => {
        throw sync;
      },
      { onError: (e) => errors.push(e) },
    ),
    captureEvent(
      s,
      event,
      async () => {
        throw async;
      },
      { onError: (e) => errors.push(e) },
    ),
    captureEvent(s, event, received),
  ];
  expect(s.set(event, 1)).toBeUndefined();
  await Promise.resolve();
  await Promise.resolve();
  expect(errors).toEqual([sync, async]);
  expect(received.mock.calls).toEqual([[1]]);
  stops.forEach((stop) => stop());
});

test('promise payloads are delivered as data without being awaited', async () => {
  const event = eventAtom<Promise<number>>();
  const s = createStore();
  const promise = Promise.resolve(1);
  const listener = vi.fn();
  const stop = captureEvent(s, event, listener);
  s.set(event, promise);
  expect(listener.mock.calls[0]![0]).toBe(promise);
  stop();
  await promise;
});

test('subscribing to an event does not execute or mount unrelated state', () => {
  const read = vi.fn(() => 1);
  const $state = atom(read);
  const event = eventAtom<string>();
  const s = createStore();
  const stop = captureEvent(s, event, () => {});
  s.set(event, 'value');
  expect(read).not.toHaveBeenCalled();
  stop();
  void $state;
});

function invalidEventCalls() {
  const s = createStore();
  const requested = eventAtom<{ id: string }>();
  // @ts-expect-error Payload is required.
  s.set(requested);
  // @ts-expect-error Wrong payload shape.
  s.set(requested, { id: 1 });
  // @ts-expect-error Events have one payload rather than variadic action arguments.
  s.set(requested, { id: '1' }, true);
  // @ts-expect-error Event creation takes no write handler.
  eventAtom(() => {});
  // @ts-expect-error Events have no imperative subscription method.
  requested.subscribe(s, () => {});
  // @ts-expect-error Listener payload is inferred from the event.
  captureEvent(s, requested, (value: number) => {});
}
void invalidEventCalls;

test('event listener feedback cycles are bounded and the dispatch queue recovers', () => {
  const event = eventAtom();
  const s = createStore();
  const onError = vi.fn();
  const stop = captureEvent(s, event, () => s.set(event), { onError });
  s.set(event);
  expect(onError).toHaveBeenCalledTimes(1);
  expect(String(onError.mock.calls[0]![0])).toContain('cycle');
  stop();
  const received = vi.fn();
  const again = captureEvent(s, event, received);
  s.set(event);
  expect(received).toHaveBeenCalledTimes(1);
  again();
});

test('unsubscribing releases the listener error handler while pending async failures are still reported', async () => {
  const event = eventAtom();
  const s = createStore();
  const error = new Error('late');
  const onError = vi.fn();
  let reject = (_error: unknown) => {};
  const pending = new Promise<void>((_resolve, fail) => {
    reject = fail;
  });
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const stop = captureEvent(s, event, () => pending, { onError });
    s.set(event);
    stop();
    reject(error);
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(error);
  } finally {
    consoleError.mockRestore();
  }
});

test('eventAtom remains a native writable atom without subscription methods', () => {
  const event = eventAtom<number>();
  const s = createStore();
  expect(typeof event.read).toBe('function');
  expect(typeof event.write).toBe('function');
  expect('subscribe' in event).toBe(false);
  expect(s.set(event, 1)).toBeUndefined();
  expect(s.get(event)).toBeNull();
});

test('the last unsubscribe detaches delivery and an old disposer cannot disconnect a new owner', () => {
  const event = eventAtom<number>();
  const s = createStore();
  const first = vi.fn();
  const second = vi.fn();
  const stopFirst = captureEvent(s, event, first);
  s.set(event, 1);
  stopFirst();
  s.set(event, 2);
  const stopSecond = captureEvent(s, event, second);
  stopFirst();
  s.set(event, 3);
  expect(first.mock.calls).toEqual([[1]]);
  expect(second.mock.calls).toEqual([[3]]);
  stopSecond();
  s.set(event, 4);
  expect(second).toHaveBeenCalledTimes(1);
});
