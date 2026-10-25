import { atom, createStore, Provider, useAtomValue } from 'jotai';
import { act, createRef, forwardRef, useEffect } from 'react';
import { createInjector, InjectorProvider, molecule, onMount } from 'bunshi/react';
import { expect, test, vi } from 'vitest';
import { actionAtom, bond, holo, holoList, holoMatch, ion, prism } from '../src/index.js';
import { holoMolecule } from '../src/bunshi.js';
import { createHarness, deferred, suspense } from './browser-harness.js';

test('prism isolates Views and subscriptions and leaves unused selectors dormant', async () => {
  const $user = atom({ name: 'Ada', age: 20 });
  const store = createStore();
  let active = 0;
  $user.onMount = () => {
    active++;
    return () => {
      active--;
    };
  };
  const selectName = vi.fn((user: { name: string }) => user.name);
  const selectAge = vi.fn((user: { age: number }) => user.age);
  const unused = vi.fn(() => {
    throw new Error('unread projection');
  });
  const { $name, $age } = prism($user, { $name: selectName, $age: selectAge, $unused: unused });
  const calls = { name: 0, age: 0, native: 0, parent: 0 };
  const Name = holo({
    core: ({ name }: { name: string }) => {
      calls.name++;
      return <span>{name}</span>;
    },
    state: { name: $name },
  });
  const Age = holo({
    core: ({ age }: { age: number }) => {
      calls.age++;
      return <span>{age}</span>;
    },
    state: { age: $age },
  });
  function NativeName() {
    const name = useAtomValue($name);
    calls.native++;
    return <span>{name}</span>;
  }
  function Parent() {
    calls.parent++;
    return (
      <>
        <Name />
        <Age />
        <NativeName />
      </>
    );
  }
  expect(selectName).not.toHaveBeenCalled();
  expect(selectAge).not.toHaveBeenCalled();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Parent />
    </Provider>,
  );
  expect(active).toBe(1);
  const baseline = { ...calls };
  const reads = [selectName.mock.calls.length, selectAge.mock.calls.length];
  await act(async () => store.set($user, { name: 'Ada', age: 21 }));
  expect(calls).toEqual({ ...baseline, age: baseline.age + 1 });
  expect(selectName).toHaveBeenCalledTimes(reads[0]! + 1);
  expect(selectAge).toHaveBeenCalledTimes(reads[1]! + 1);
  await act(async () => store.set($user, { name: 'Grace', age: 21 }));
  expect(calls).toEqual({
    ...baseline,
    name: baseline.name + 1,
    age: baseline.age + 1,
    native: baseline.native + 1,
  });
  expect(unused).not.toHaveBeenCalled();
  await h.unmount();
  expect(active).toBe(0);
  const after = selectName.mock.calls.length;
  store.set($user, { name: 'Lin', age: 30 });
  expect(selectName).toHaveBeenCalledTimes(after);
  expect(unused).not.toHaveBeenCalled();
});

test('prism and ion composition filters unchanged downstream values without diamond glitches', async () => {
  const $user = atom({ name: 'Ada', age: 20 });
  const store = createStore();
  const { $name, $adult } = prism($user, {
    $name: (user) => user.name,
    $adult: (user) => user.age >= 18,
  });
  const compute = vi.fn(({ name, adult }: { name: string; adult: boolean }) => `${name}:${adult}`);
  const $label = ion({ name: $name, adult: $adult }, compute);
  const visible: string[] = [];
  const Summary = holo({
    core: ({ label }: { label: string }) => {
      visible.push(label);
      return <span>{label}</span>;
    },
    state: { label: $label },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Summary />
    </Provider>,
  );
  const before = visible.length;
  const reads = compute.mock.calls.length;
  await act(async () => store.set($user, { name: 'Ada', age: 21 }));
  expect(compute).toHaveBeenCalledTimes(reads);
  expect(visible).toHaveLength(before);
  await act(async () => store.set($user, { name: 'Grace', age: 17 }));
  expect(compute).toHaveBeenCalledTimes(reads + 1);
  expect(visible.slice(before)).toEqual(['Grace:false']);
});

test('prism object results follow reference equality rather than deep equality in holo', async () => {
  const profile = { name: 'Ada' };
  const $user = atom({ profile, age: 20 });
  const store = createStore();
  const { $profile, $copy } = prism($user, {
    $profile: (user) => user.profile,
    $copy: (user) => ({ name: user.profile.name }),
  });
  let stable = 0;
  let copy = 0;
  const Stable = holo({
    core: ({ value }: { value: typeof profile }) => {
      stable++;
      return <span>{value.name}</span>;
    },
    state: { value: $profile },
  });
  const Copy = holo({
    core: ({ value }: { value: typeof profile }) => {
      copy++;
      return <span>{value.name}</span>;
    },
    state: { value: $copy },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Stable />
      <Copy />
    </Provider>,
  );
  const before = { stable, copy };
  await act(async () => store.set($user, { profile, age: 21 }));
  expect(stable).toBe(before.stable);
  expect(copy).toBe(before.copy + 1);
});

test('prism async projection is lazy, and a new promise may suspend even with an unchanged eventual value', async () => {
  const $user = atom({ name: 'Ada', age: 20 });
  const store = createStore();
  let gate = deferred<void>();
  let reads = 0;
  const unused = vi.fn(async () => 'unused');
  const { $name } = prism($user, {
    $name: (user) => {
      reads++;
      return gate.promise.then(() => user.name);
    },
    $unused: unused,
  });
  let core = 0;
  let mounted = 0;
  let closed = 0;
  const Name = holo({
    core: ({ name }: { name: string }) => {
      core++;
      return <span data-name>{name}</span>;
    },
    state: { name: $name },
    cage: {
      onMount() {
        mounted++;
      },
      onUnmount() {
        closed++;
      },
    },
  });
  expect(reads).toBe(0);
  const h = createHarness();
  await h.render(<Provider store={store}>{suspense(<Name />)}</Provider>);
  expect(reads).toBe(1);
  expect(unused).not.toHaveBeenCalled();
  await act(async () => gate.resolve());
  expect(h.container.querySelector('[data-name]')?.textContent).toBe('Ada');
  const before = core;
  gate = deferred<void>();
  await act(async () => store.set($user, { name: 'Ada', age: 21 }));
  expect(h.container.querySelector('[data-loading]')).not.toBeNull();
  expect(reads).toBe(2);
  await act(async () => gate.resolve());
  expect(core).toBe(before);
  expect(mounted).toBe(1);
  expect(closed).toBe(0);
  expect(unused).not.toHaveBeenCalled();
  await h.unmount();
  expect(closed).toBe(1);
});

test('holo actions never read or subscribe to their target and static input changes do not reread state', async () => {
  const store = createStore();
  const readAction = vi.fn(() => 'not required');
  const write = vi.fn();
  const target = atom(readAction, (_get, _set) => {
    write();
  });
  const $raw = atom(0);
  const select = vi.fn((get: import('jotai').Getter) => get($raw));
  const $value = atom(select);
  let renders = 0;
  const Button = holo({
    core: ({ value, title, onClick }: { value: number; title: string; onClick: () => void }) => {
      renders++;
      return (
        <button onClick={onClick}>
          {title}:{value}
        </button>
      );
    },
    state: { value: $value },
    actions: { onClick: target },
  });
  const h = createHarness();
  const tree = (title: string) => (
    <Provider store={store}>
      <Button title={title} />
    </Provider>
  );
  expect(select).not.toHaveBeenCalled();
  await h.render(tree('a'));
  const before = renders;
  const reads = select.mock.calls.length;
  await h.render(tree('a'));
  expect(renders).toBe(before);
  await h.render(tree('b'));
  expect(renders).toBe(before + 1);
  expect(select).toHaveBeenCalledTimes(reads);
  await act(async () => h.container.querySelector('button')!.click());
  expect(write).toHaveBeenCalledTimes(1);
  expect(readAction).not.toHaveBeenCalled();
  expect(renders).toBe(before + 1);
});

test('holoList leaves empty-row state dormant and separates list mapping from row rendering', async () => {
  const store = createStore();
  const item = { id: 1 };
  const $items = atom<readonly { id: number }[]>([]);
  const $raw = atom(0);
  const read = vi.fn((get: import('jotai').Getter) => get($raw));
  const $shared = atom(read);
  let active = 0;
  $raw.onMount = () => {
    active++;
    return () => {
      active--;
    };
  };
  let rows = 0;
  const mapItem = vi.fn((item: { id: number }) => ({ item }));
  const List = holoList({
    source: $items,
    getKey: (item) => item.id,
    mapItem,
    state: { value: $shared },
    core: ({ item, value }: { item: { id: number }; value: number }) => {
      rows++;
      return (
        <span>
          {item.id}:{value}
        </span>
      );
    },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <List />
    </Provider>,
  );
  expect(read).not.toHaveBeenCalled();
  expect(mapItem).not.toHaveBeenCalled();
  expect(active).toBe(0);
  await act(async () => store.set($items, [item]));
  const before = rows;
  const mappings = mapItem.mock.calls.length;
  expect(active).toBe(1);
  await act(async () => store.set($items, [item]));
  expect(rows).toBe(before);
  expect(mapItem).toHaveBeenCalledTimes(mappings + 1);
  await act(async () => store.set($raw, 1));
  expect(rows).toBe(before + 1);
  expect(mapItem).toHaveBeenCalledTimes(mappings + 1);
  await act(async () => store.set($items, []));
  expect(active).toBe(0);
  const after = read.mock.calls.length;
  await act(async () => store.set($raw, 2));
  expect(read).toHaveBeenCalledTimes(after);
});

test('holoMatch does not evaluate inactive branches or rerender when the selected case stays equal', async () => {
  const store = createStore();
  const $raw = atom(0);
  const $case = ion($raw, (n) => (n < 2 ? 'a' : 'b'));
  const readA = vi.fn(() => 'A');
  const readB = vi.fn(() => 'B');
  const $a = atom(readA);
  const $b = atom(readB);
  let renders = 0;
  const A = holo({
    core: ({ value }: { value: string }) => {
      renders++;
      return <span>{value}</span>;
    },
    state: { value: $a },
  });
  const B = holo({
    core: ({ value }: { value: string }) => <span>{value}</span>,
    state: { value: $b },
  });
  const Match = holoMatch({ source: $case, cases: { a: A, b: B } });
  expect(readA).not.toHaveBeenCalled();
  expect(readB).not.toHaveBeenCalled();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Match />
    </Provider>,
  );
  const before = renders;
  expect(readB).not.toHaveBeenCalled();
  await act(async () => store.set($raw, 1));
  expect(renders).toBe(before);
  await act(async () => store.set($raw, 2));
  expect(readB).toHaveBeenCalledTimes(1);
  expect(h.container.textContent).toBe('B');
});

test('holoMatch preserves fallback without invoking its View again for another unmatched selector', async () => {
  const store = createStore();
  const $case = atom('unknown');
  let renders = 0;
  let mounts = 0;
  const $label = atom('label');
  const Fallback = ({ title }: { title: string }) => {
    const label = useAtomValue($label);
    renders++;
    useEffect(() => {
      mounts++;
    }, []);
    return (
      <span>
        {title}:{label}
      </span>
    );
  };
  const Match = holoMatch({
    source: $case,
    cases: { ready: () => <span>ready</span> },
    fallback: Fallback,
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Match title="a" />
    </Provider>,
  );
  const before = renders;
  await act(async () => store.set($case, 'another'));
  expect(renders).toBe(before);
  expect(mounts).toBe(1);
  await h.render(
    <Provider store={store}>
      <Match title="b" />
    </Provider>,
  );
  expect(renders).toBe(before + 1);
  expect(h.container.textContent).toBe('b:label');
  await act(async () => store.set($label, 'changed'));
  expect(renders).toBe(before + 2);
  expect(h.container.textContent).toBe('b:changed');
  expect(mounts).toBe(1);
});

test('reading a bond output in holo does not activate its connection and stable downstream selections filter repeated events', async () => {
  const trigger = actionAtom<[number]>();
  const map = vi.fn((n: number) => [n] as [number]);
  const link = bond({ trigger, map });
  const $parity = ion(link, (args) => (args ? args[0] % 2 : -1));
  const store = createStore();
  let renders = 0;
  let rawRenders = 0;
  const Value = holo({
    core: ({ value }: { value: number }) => {
      renders++;
      return <span>{value}</span>;
    },
    state: { value: $parity },
  });
  const Raw = holo({
    core: ({ args }: { args: [number] | undefined }) => {
      rawRenders++;
      return <span>{args?.[0]}</span>;
    },
    state: { args: link },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Value />
      <Raw />
    </Provider>,
  );
  const before = renders;
  const rawBefore = rawRenders;
  await act(async () => store.set(trigger, 1));
  expect(map).not.toHaveBeenCalled();
  expect(renders).toBe(before);
  const stop = link.connect(store);
  await act(async () => store.set(trigger, 1));
  expect(renders).toBe(before + 1);
  await act(async () => store.set(trigger, 3));
  expect(map).toHaveBeenCalledTimes(2);
  expect(renders).toBe(before + 1);
  expect(rawRenders).toBe(rawBefore + 2);
  await act(async () => store.set(trigger, 3));
  expect(map).toHaveBeenCalledTimes(3);
  expect(renders).toBe(before + 1);
  expect(rawRenders).toBe(rawBefore + 3);
  stop();
  await act(async () => store.set(trigger, 4));
  expect(map).toHaveBeenCalledTimes(3);
});

test('holoMolecule stays dormant in an inactive case and shared model changes do not rerender unchanged prism selections', async () => {
  const $user = atom({ name: 'Ada', age: 20 });
  const store = createStore();
  const injector = createInjector();
  let created = 0;
  let active = 0;
  const unused = vi.fn(() => 0);
  const Model = molecule(() => {
    created++;
    onMount(() => {
      active++;
      return () => {
        active--;
      };
    });
    return prism($user, { $name: (user) => user.name, $unused: unused });
  });
  const model = holoMolecule(Model);
  let selections = 0;
  let renders = 0;
  const Name = holo({
    core: ({ name }: { name: string }) => {
      renders++;
      return <span>{name}</span>;
    },
    state: {
      name: model((m) => {
        selections++;
        return m.$name;
      }),
    },
  });
  const $visible = atom<'hidden' | 'shown'>('hidden');
  const Match = holoMatch({ source: $visible, cases: { hidden: () => null, shown: Name } });
  expect(created).toBe(0);
  expect(selections).toBe(0);
  const h = createHarness();
  await h.render(
    <InjectorProvider value={() => injector}>
      <Provider store={store}>
        <Match />
      </Provider>
    </InjectorProvider>,
  );
  expect(created).toBe(0);
  await act(async () => store.set($visible, 'shown'));
  expect(created).toBe(1);
  expect(active).toBe(1);
  const before = renders;
  const selected = selections;
  await act(async () => store.set($user, { name: 'Ada', age: 21 }));
  expect(renders).toBe(before);
  expect(selections).toBe(selected);
  expect(unused).not.toHaveBeenCalled();
  await act(async () => store.set($visible, 'hidden'));
  expect(active).toBe(0);
});

test('holoMatch memoization preserves intrinsic elements and forwarded refs', async () => {
  const store = createStore();
  const ref = createRef<HTMLInputElement>();
  const Input = holoMatch({ source: atom<'input'>('input'), cases: { input: 'input' } });
  const Forwarded = forwardRef<HTMLInputElement, { title: string }>((props, ref) => (
    <input ref={ref} title={props.title} />
  ));
  const Match = holoMatch({ source: atom<'ready'>('ready'), cases: { ready: Forwarded } });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Input ref={ref} title="intrinsic" />
    </Provider>,
  );
  expect(ref.current?.title).toBe('intrinsic');
  await h.render(
    <Provider store={store}>
      <Match ref={ref} title="forwarded" />
    </Provider>,
  );
  expect(ref.current?.title).toBe('forwarded');
});

test('an action updating several ion sources yields one consistent prism render', async () => {
  const $first = atom('Ada');
  const $last = atom('Lovelace');
  const store = createStore();
  const $user = ion({ first: $first, last: $last });
  const full = vi.fn((user: { first: string; last: string }) => `${user.first} ${user.last}`);
  const { $full, $initial } = prism($user, { $full: full, $initial: (user) => user.first[0]! });
  const changed = actionAtom((_get, set) => {
    set($first, 'Grace');
    set($last, 'Hopper');
  });
  const visible: string[] = [];
  const Name = holo({
    core: ({ full, initial }: { full: string; initial: string }) => {
      visible.push(`${full}:${initial}`);
      return <span>{full}</span>;
    },
    state: { full: $full, initial: $initial },
  });
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Name />
    </Provider>,
  );
  const before = visible.length;
  const reads = full.mock.calls.length;
  await act(async () => store.set(changed));
  expect(visible.slice(before)).toEqual(['Grace Hopper:G']);
  expect(full).toHaveBeenCalledTimes(reads + 1);
});
