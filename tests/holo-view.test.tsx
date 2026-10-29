import { modelLifetime } from './model-lifetime.js';
import { atom, createStore, Provider } from 'jotai';
import { createRef, type ComponentProps } from 'react';
import { renderToStaticMarkup, renderToReadableStream } from 'react-dom/server';
import { expect, expectTypeOf, test, vi } from 'vitest';
import { actionAtom, eventAtom, holo, type HoloEvents } from '../src/index.js';
import { createModel } from '../src/model-registry.js';

test('new bindings render on the server without acquiring any resources or handling events', () => {
  const connect = vi.fn();
  const onMount = vi.fn();
  const $count = atom(2);
  const $$model = createModel({ create: () => ({ $count }), resources: () => [{ connect }] });
  const View = ({ count, title }: { count: number; title: string }) => (
    <b>
      {title}:{count}
    </b>
  );
  const $$owner1 = createModel({ create: () => ({}), resources: () => [{ connect }] });
  const $$owner0 = modelLifetime({ onMount });
  const Connected = holo({
    view: View,
    models: { counter: $$model, _lifetime: $$owner0, _connections: $$owner1 },
    read: ({ counter }) => ({ count: counter.$count }),
    static: { title: 'Count' },
  });
  expect(renderToStaticMarkup(<Connected />)).toBe('<b>Count:2</b>');
  expect(connect).not.toHaveBeenCalled();
  expect(onMount).not.toHaveBeenCalled();
});

test('native async models and async reads resolve before rendering the View', async () => {
  const $model = atom(Promise.resolve({ $name: atom(Promise.resolve('Ada')) }));
  const Connected = holo({
    view: ({ name }: { name: string }) => <b>{name}</b>,
    models: { user: $model },
    read: ({ user }) => ({ name: user.$name }),
  });
  const stream = await renderToReadableStream(<Connected />);
  expect(await new Response(stream).text()).toContain('Ada');
});

test('duplicate bindings and non-event events sources are rejected for JS callers too', () => {
  const View = (_props: { value: number }) => null;
  // @ts-expect-error Duplicate read/props bindings.
  const Duplicate = holo({ view: View, read: { value: atom(0) }, static: { value: 1 } });
  expect(() => renderToStaticMarkup(<Duplicate />)).toThrow();
});

function typeChecks() {
  const $count = atom(1);
  const increment = actionAtom((_get, set, value: number) => {
    set($count, value);
    return value;
  });
  const event = eventAtom<{ id: string }>();
  type Handle = { onCreated(payload: { id: string }): void };
  function View(_props: {
    count: number;
    title: string;
    onIncrement: (n: number) => number;
    events: HoloEvents<Handle>;
  }) {
    return null;
  }
  const $$model = createModel({ create: () => ({ $count, increment, event }) });
  const Connected = holo({
    view: View,
    models: { current: (input: { id: string }) => $$model({ key: [input.id] }) },
    read: ({ current }) => ({ count: current.$count }),
    write: ({ current }) => ({ onIncrement: current.increment }),
    static: { title: 'Title' },
    events: ({ current }) => ({ onCreated: current.event }),
  });
  expectTypeOf<ComponentProps<typeof Connected>>().toEqualTypeOf<{ id: string }>();
  const valid = <Connected id="a" />;
  // @ts-expect-error Selector inputs remain required.
  const missing = <Connected />;
  // @ts-expect-error Bound props are not public.
  const override = <Connected id="a" count={5} />;
  // @ts-expect-error Wrong read type.
  holo({ view: View, read: { count: atom('wrong') } });
  // @ts-expect-error Unknown read key.
  holo({ view: View, read: { missing: $count } });
  // @ts-expect-error Wrong write arguments.
  holo({ view: View, write: { onIncrement: actionAtom((_get, _set, value: string) => value) } });
  // @ts-expect-error Plain writable atoms are not event sources.
  holo({ view: View, events: { onCreated: atom(null, () => {}) } });
  // @ts-expect-error Wrong events payload.
  holo({ view: View, events: { onCreated: eventAtom<number>() } });
  // @ts-expect-error Unknown events method.
  holo({ view: View, events: { unknown: event } });
  // @ts-expect-error Duplicate write/props binding.
  holo({ view: View, write: { onIncrement: increment }, static: { onIncrement: () => 1 } });
  const Intrinsic = holo({ view: 'input', static: { type: 'text' } });
  const ref = <Intrinsic ref={createRef<HTMLInputElement>()} />;
  // @ts-expect-error Preserve DOM ref type.
  const wrongRef = <Intrinsic ref={createRef<HTMLButtonElement>()} />;
  void [valid, missing, override, ref, wrongRef];
}
void typeChecks;
