import { atom, type Atom } from 'jotai';
import { expectTypeOf, test } from 'vitest';
import { type ComponentProps, createRef } from 'react';
import { holo } from '../src/holo.js';
import { stateAtom } from '../src/state-atom.js';
import { actionAtom } from '../src/action-atom.js';

type UnionProps = { kind: 'a'; a: string; count: number } | { kind: 'b'; b: number; count: number };
function UnionCore(props: UnionProps) {
  return (
    <span>
      {props.kind === 'a' ? props.a : props.b}:{props.count}
    </span>
  );
}

test('preserves required branch-specific own props in discriminated unions', () => {
  const Connected = holo({ core: UnionCore, state: { count: atom(0) } });
  expectTypeOf<ComponentProps<typeof Connected>>().toEqualTypeOf<
    { kind: 'a'; a: string } | { kind: 'b'; b: number }
  >();
});

function _invalidAndValidConfigurations() {
  const Connected = holo({ core: UnionCore, state: { count: atom(0) } });
  const validA = <Connected kind="a" a="ok" />;
  const validB = <Connected kind="b" b={2} />;
  // @ts-expect-error Branch a still requires a.
  const missing = <Connected kind="a" />;
  // @ts-expect-error A b payload cannot satisfy branch a.
  const mixed = <Connected kind="a" b={2} />;
  // @ts-expect-error A dynamic discriminant cannot be bound independently of its branch data.
  holo({ core: UnionCore, state: { kind: atom<'a' | 'b'>('a') } });
  // @ts-expect-error Bind a discriminant by narrowing the core's props first.
  holo({ core: UnionCore, props: { kind: 'a' } });
  function PromiseCore(_props: { value: Promise<number> }) {
    return null;
  }
  // @ts-expect-error State bindings resolve promises; promise props belong in props.
  holo({ core: PromiseCore, state: { value: atom(Promise.resolve(1)) } });
  holo({ core: PromiseCore, props: { value: Promise.resolve(1) } });
  function CallbackCore(_props: { onChange: (value: string) => void }) {
    return null;
  }
  const tooNarrow = actionAtom((_get, _set, _value: 'only') => undefined);
  // @ts-expect-error The view can call onChange with any string.
  holo({ core: CallbackCore, actions: { onChange: tooNarrow } });
  const $value = stateAtom('a');
  holo({ core: CallbackCore, actions: { onChange: $value } });
  const asyncRead: Atom<PromiseLike<number>> = atom(Promise.resolve(1));
  holo({
    core: function Core(_props: { value: number }) {
      return null;
    },
    state: { value: asyncRead },
  });
  const Input = holo({ core: 'input', props: { type: 'text' } });
  const validRef = <Input ref={createRef<HTMLInputElement>()} />;
  // @ts-expect-error Intrinsic refs preserve the original element type.
  const invalidRef = <Input ref={createRef<HTMLButtonElement>()} />;
  holo({
    core: () => null,
    cage: {
      // @ts-expect-error Async lifecycle callbacks are intentionally unsupported.
      async onMount() {},
    },
  });
  return [validA, validB, missing, mixed, validRef, invalidRef];
}
