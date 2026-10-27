import { atom, type Atom } from 'jotai';
import { expectTypeOf, test } from 'vitest';
import { type ComponentProps, createRef } from 'react';
import { holo } from '../src/holo.js';
import { stateAtom } from '../src/state-atom.js';
import { actionAtom } from '../src/action-atom.js';

type UnionProps = { kind: 'a'; a: string; count: number } | { kind: 'b'; b: number; count: number };
function UnionView(props: UnionProps) {
  return (
    <span>
      {props.kind === 'a' ? props.a : props.b}:{props.count}
    </span>
  );
}

test('preserves required branch-specific own props in discriminated unions', () => {
  const Connected = holo({ core: UnionView, state: { count: atom(0) } });
  expectTypeOf<ComponentProps<typeof Connected>>().toEqualTypeOf<
    { kind: 'a'; a: string } | { kind: 'b'; b: number }
  >();
});

function _invalidAndValidConfigurations() {
  const Connected = holo({ core: UnionView, state: { count: atom(0) } });
  const validA = <Connected kind="a" a="ok" />;
  const validB = <Connected kind="b" b={2} />;
  // @ts-expect-error Branch a still requires a.
  const missing = <Connected kind="a" />;
  // @ts-expect-error A b payload cannot satisfy branch a.
  const mixed = <Connected kind="a" b={2} />;
  // @ts-expect-error A dynamic discriminant cannot be bound independently of its branch data.
  holo({ core: UnionView, state: { kind: atom<'a' | 'b'>('a') } });
  // @ts-expect-error Bind a discriminant by narrowing the core's props first.
  holo({ core: UnionView, bindProps: { kind: 'a' } });
  function PromiseView(_props: { value: Promise<number> }) {
    return null;
  }
  // @ts-expect-error State bindings resolve promises; promise props belong in props.
  holo({ core: PromiseView, state: { value: atom(Promise.resolve(1)) } });
  holo({ core: PromiseView, bindProps: { value: Promise.resolve(1) } });
  function CallbackView(_props: { onChange: (value: string) => void }) {
    return null;
  }
  const tooNarrow = actionAtom((_get, _set, _value: 'only') => undefined);
  // @ts-expect-error The view can call onChange with any string.
  holo({ core: CallbackView, actions: { onChange: tooNarrow } });
  const $value = stateAtom('a');
  holo({ core: CallbackView, actions: { onChange: $value } });
  const asyncRead: Atom<PromiseLike<number>> = atom(Promise.resolve(1));
  holo({
    core: function Core(_props: { value: number }) {
      return null;
    },
    state: { value: asyncRead },
  });
  const Input = holo({ core: 'input', bindProps: { type: 'text' } });
  const validRef = <Input ref={createRef<HTMLInputElement>()} />;
  // @ts-expect-error Intrinsic refs preserve the original element type.
  const invalidRef = <Input ref={createRef<HTMLButtonElement>()} />;
  // @ts-expect-error Async lifecycle callbacks are intentionally unsupported.
  holo({
    core: () => null,
    cage: {
      async onMount() {},
    },
  });
  return [validA, validB, missing, mixed, validRef, invalidRef];
}
