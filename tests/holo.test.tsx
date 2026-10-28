import { atom, createStore, Provider } from 'jotai';
import { describe, expect, expectTypeOf, test } from 'vitest';

import { memo, type ComponentProps, type ComponentType } from 'react';
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';

import { actionAtom } from '../src/action-atom.js';
import { holo } from '../src/holo.js';

describe('holo', () => {
  test('connects state and actions to the same nearest Provider and passes static props unchanged', () => {
    const count = atom(0);
    const doubled = atom((get) => get(count) * 2);
    const increment = actionAtom((get, set, amount: number) => {
      set(count, get(count) + amount);
      return get(count);
    });
    const first = createStore();
    const second = createStore();
    first.set(count, 3);
    second.set(count, 10);
    const captures: ((amount: number) => number)[] = [];
    const reader = { read: () => 'a static object with a read method' };

    function Icon() {
      return <span>icon</span>;
    }
    function View({
      count,
      doubled,
      onIncrement,
      title,
      icon: IconProp,
      data,
    }: {
      count: number;
      doubled: number;
      onIncrement: (amount: number) => number;
      title: string;
      icon: ComponentType;
      data: typeof reader;
    }) {
      captures.push(onIncrement);
      expect(IconProp).toBe(Icon);
      expect(data).toBe(reader);
      return (
        <span>
          {title}:{count}/{doubled}
        </span>
      );
    }
    const Counter = holo({
      view: View,
      read: { count, doubled },
      write: { onIncrement: increment },
      props: { icon: Icon, data: reader },
    });
    expectTypeOf<ComponentProps<typeof Counter>>().toEqualTypeOf<{ title: string }>();

    const html = renderToStaticMarkup(
      <Provider store={first}>
        <Counter title="first" />
        <Provider store={second}>
          <Counter title="second" />
        </Provider>
      </Provider>,
    );
    expect(html).toContain('first:3/6');
    expect(html).toContain('second:10/20');
    const [firstIncrement, secondIncrement] = captures;
    if (!firstIncrement || !secondIncrement) throw new Error('Views were not rendered');
    expect(firstIncrement(2)).toBe(5);
    expect(first.get(count)).toBe(5);
    expect(second.get(count)).toBe(10);
    expect(secondIncrement(4)).toBe(14);
    expect(second.get(count)).toBe(14);
  });

  test('supports omitted sections, optional own props and memoized views', () => {
    function View({ title = 'default' }: { title?: string }) {
      return <span>{title}</span>;
    }
    const Plain = holo({ view: View });
    const Static = holo({ view: memo(View), props: { title: 'static' } });

    expectTypeOf<ComponentProps<typeof Plain>>().toEqualTypeOf<{ title?: string }>();
    expect(renderToStaticMarkup(<Plain />)).toBe('<span>default</span>');
    expect(renderToStaticMarkup(<Static />)).toBe('<span>static</span>');
  });

  test('returns the original async action promise and forwards all arguments', async () => {
    const result = Promise.resolve('saved');
    const save = actionAtom((_get, _set, id: number, title: string) => {
      expect([id, title]).toEqual([42, 'Title']);
      return result;
    });
    let onSave: ((id: number, title: string) => Promise<string>) | undefined;
    function View(props: { onSave: (id: number, title: string) => Promise<string> }) {
      onSave = props.onSave;
      return null;
    }
    const Connected = holo({ view: View, write: { onSave: save } });

    renderToStaticMarkup(<Connected />);
    if (!onSave) throw new Error('View was not rendered');
    expect(onSave(42, 'Title')).toBe(result);
    await expect(result).resolves.toBe('saved');
  });

  test('resolves async state before passing it to the view', async () => {
    const name = atom(Promise.resolve('resolved'));
    const count = atom(2);
    const Connected = holo({
      view: function View({ name, count }: { name: string; count: number }) {
        return (
          <span>
            {name}:{count}
          </span>
        );
      },
      read: { name, count },
    });

    const stream = await renderToReadableStream(<Connected />);
    const html = await new Response(stream).text();
    expect(html.replaceAll('<!-- -->', '')).toContain('resolved:2');
  });

  test('rejects duplicate keys at runtime for JavaScript callers too', () => {
    const config = {
      view: function View({ count }: { count: number }) {
        return <span>{count}</span>;
      },
      read: { count: atom(1) },
      props: { count: 2 },
    };
    // @ts-expect-error A prop cannot appear in both read and props.
    const Duplicate = holo(config);
    expect(() => renderToStaticMarkup(<Duplicate />)).toThrow(/count.*more than one section/);
  });
});

// These calls are checked by tsc, never executed. Invalid bindings must not widen ViewProps.
function _checkInvalidBindings() {
  function View(_props: { count: number; onIncrement: (amount: number) => void; title: string }) {
    return null;
  }
  const count = atom(0);
  const increment = actionAtom((_get, set, amount: number) => set(count, amount));
  const wrongIncrement = actionAtom((_get, _set, amount: string) => amount);
  const Connected = holo({
    view: View,
    read: { count },
    write: { onIncrement: increment },
  });
  // @ts-expect-error An atom must resolve to the declared view prop type.
  holo({ view: View, read: { count: atom('wrong') } });
  // @ts-expect-error State requires an atom, not a static value.
  holo({ view: View, read: { count: 1 } });
  // @ts-expect-error Unknown view props are rejected.
  holo({ view: View, read: { missing: count } });
  // @ts-expect-error Action argument types must match the view callback.
  holo({ view: View, write: { onIncrement: wrongIncrement } });
  // @ts-expect-error Actions require a writable atom.
  holo({ view: View, write: { onIncrement: atom((get) => get(count)) } });
  // @ts-expect-error Non-callable view props cannot be actions.
  holo({ view: View, write: { count } });
  // @ts-expect-error Static props must match the view prop type.
  holo({ view: View, props: { title: 1 } });
  holo({
    view: View,
    write: { onIncrement: increment },
    // @ts-expect-error A write prop cannot also be static.
    props: { onIncrement: () => undefined },
  });
  // @ts-expect-error A required own prop is still required.
  const missing = <Connected />;
  // @ts-expect-error Bound props cannot be overridden by callers.
  const overridden = <Connected title="Counter" count={9} />;
  holo({
    view: View,
    read: { count },
    write: { onIncrement: increment },
  });
  return [missing, overridden];
}
