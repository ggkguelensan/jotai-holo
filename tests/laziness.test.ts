import { atom, createStore, type Atom } from 'jotai/vanilla';
import { expect, test, vi } from 'vitest';
import { actionAtom, bond, ion, prism, stateAtom } from '../src/vanilla.js';

type User = { name: string; age: number };
const selectors: Record<
  string,
  (source: Atom<User>, project: (user: User) => string) => Atom<string>
> = {
  native: (source, project) => atom((get) => project(get(source))),
  stateAtom: (source, project) => stateAtom((get) => project(get(source))),
  ion: (source, project) => ion(source, project),
  prism: (source, project) => prism(source, { $name: project }).$name,
};

for (const [name, select] of Object.entries(selectors)) {
  test(`${name}: declaration/read caching/unmounted invalidation/subscription/disposal follow native lazy reads`, () => {
    const s = createStore();
    const $user = atom<User>({ name: 'Ada', age: 20 });
    let active = 0;
    $user.onMount = () => {
      active++;
      return () => {
        active--;
      };
    };
    const project = vi.fn((user: User) => user.name);
    const $name = select($user, project);
    s.set($user, { name: 'Ada', age: 21 });
    expect(project).not.toHaveBeenCalled();
    expect(active).toBe(0);
    expect(s.get($name)).toBe('Ada');
    expect(s.get($name)).toBe('Ada');
    expect(project).toHaveBeenCalledTimes(1);
    expect(active).toBe(0);
    s.set($user, { name: 'Grace', age: 22 });
    expect(project).toHaveBeenCalledTimes(1);
    expect(s.get($name)).toBe('Grace');
    expect(project).toHaveBeenCalledTimes(2);
    const notified = vi.fn();
    const stop = s.sub($name, notified);
    expect(active).toBe(1);
    s.set($user, { name: 'Grace', age: 23 });
    expect(project).toHaveBeenCalledTimes(3);
    expect(notified).not.toHaveBeenCalled();
    s.set($user, { name: 'Lin', age: 23 });
    expect(notified).toHaveBeenCalledTimes(1);
    stop();
    expect(active).toBe(0);
    const before = project.mock.calls.length;
    s.set($user, { name: 'Ada', age: 24 });
    expect(project).toHaveBeenCalledTimes(before);
    expect(s.get($name)).toBe('Ada');
    expect(project).toHaveBeenCalledTimes(before + 1);
  });
}

test('prism never executes unread siblings, including throwing and async selectors', async () => {
  const $user = atom<User>({ name: 'Ada', age: 20 });
  const s = createStore();
  const name = vi.fn((user: User) => user.name);
  const age = vi.fn((user: User) => user.age);
  const failed = vi.fn(() => {
    throw new Error('unused');
  });
  const remote = vi.fn(async (user: User) => user.name);
  const fields = prism($user, { $name: name, $age: age, $failed: failed, $remote: remote });
  const stop = s.sub(fields.$name, () => {});
  s.set($user, { name: 'Grace', age: 21 });
  s.get(fields.$name);
  expect(name).toHaveBeenCalledTimes(2);
  for (const unused of [age, failed, remote]) expect(unused).not.toHaveBeenCalled();
  expect(s.get(fields.$age)).toBe(21);
  expect(age).toHaveBeenCalledTimes(1);
  await expect(s.get(fields.$remote)).resolves.toBe('Grace');
  expect(remote).toHaveBeenCalledTimes(1);
  stop();
});

test('prism caches independently per store and shares reads across consumers in one store', () => {
  const $user = atom<User>({ name: 'Ada', age: 20 });
  const name = vi.fn((user: User) => user.name);
  const age = vi.fn((user: User) => user.age);
  const { $name, $age } = prism($user, { $name: name, $age: age });
  const a = createStore();
  const b = createStore();
  const stops = [a.sub($name, () => {}), a.sub($name, () => {}), b.sub($age, () => {})];
  expect(name).toHaveBeenCalledTimes(1);
  expect(age).toHaveBeenCalledTimes(1);
  a.set($user, { name: 'Grace', age: 21 });
  expect(name).toHaveBeenCalledTimes(2);
  expect(age).toHaveBeenCalledTimes(1);
  expect(b.get($name)).toBe('Ada');
  expect(name).toHaveBeenCalledTimes(3);
  stops.forEach((stop) => stop());
});

test('prism uses Object.is: retained branches stay stable, newly allocated projections notify', () => {
  const profile = { name: 'Ada' };
  const $user = atom({ profile, age: 20 });
  const s = createStore();
  const fields = prism($user, {
    $profile: (user) => user.profile,
    $copy: (user) => ({ name: user.profile.name }),
  });
  const stable = vi.fn();
  const allocated = vi.fn();
  const stops = [s.sub(fields.$profile, stable), s.sub(fields.$copy, allocated)];
  s.set($user, { profile, age: 21 });
  expect(stable).not.toHaveBeenCalled();
  expect(allocated).toHaveBeenCalledTimes(1);
  s.set($user, { profile: { ...profile }, age: 22 });
  expect(stable).toHaveBeenCalledTimes(1);
  stops.forEach((stop) => stop());
});

test('ion reads only its declared sources, recomputes once per shared source write and skips equal outputs', () => {
  const $user = atom<User>({ name: 'Ada', age: 20 });
  const unused = vi.fn(() => 1);
  const $unused = atom(unused);
  void $unused;
  const fields = prism($user, { $name: (user) => user.name, $age: (user) => user.age });
  const project = vi.fn(({ name, age }: { name: string; age: number }) => `${name}:${age >= 18}`);
  const $summary = ion({ name: fields.$name, age: fields.$age }, project);
  const s = createStore();
  expect(project).not.toHaveBeenCalled();
  const changed = vi.fn();
  const stop = s.sub($summary, changed);
  const before = project.mock.calls.length;
  s.set($user, { name: 'Ada', age: 21 });
  expect(project).toHaveBeenCalledTimes(before + 1);
  expect(changed).not.toHaveBeenCalled();
  s.set($user, { name: 'Grace', age: 22 });
  expect(project).toHaveBeenCalledTimes(before + 2);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(unused).not.toHaveBeenCalled();
  stop();
});

test('actionAtom does no work at declaration/read/subscription, and reads do not mount its model', () => {
  const $value = atom(0);
  let active = 0;
  $value.onMount = () => {
    active++;
    return () => {
      active--;
    };
  };
  const write = vi.fn((get: import('jotai/vanilla').Getter) => get($value));
  const requested = actionAtom(write);
  const s = createStore();
  expect(s.get(requested)).toBeNull();
  const stop = s.sub(requested, () => {});
  s.set($value, 1);
  expect(write).not.toHaveBeenCalled();
  expect(active).toBe(0);
  expect(s.set(requested)).toBe(1);
  expect(write).toHaveBeenCalledTimes(1);
  expect(active).toBe(0);
  stop();
});

test('bond does not evaluate before connect or keep its sampled data mounted', () => {
  const s = createStore();
  const $raw = atom(1);
  const read = vi.fn((get: import('jotai/vanilla').Getter) => get($raw));
  const $state = atom(read);
  let active = 0;
  $raw.onMount = () => {
    active++;
    return () => {
      active--;
    };
  };
  const requested = actionAtom();
  const map = vi.fn((value: number) => [value] as [number]);
  const target = actionAtom(vi.fn((_get, _set, _n: number) => {}));
  const link = bond({ state: $state, trigger: requested, map, yield: target });
  const unsub = s.sub(link, () => {});
  s.set(requested);
  expect(s.get(link)).toBeUndefined();
  expect(read).not.toHaveBeenCalled();
  expect(map).not.toHaveBeenCalled();
  const stop = link.connect(s);
  expect(read).not.toHaveBeenCalled();
  s.set(requested);
  expect(read).toHaveBeenCalledTimes(1);
  expect(active).toBe(0);
  expect(map).toHaveBeenCalledTimes(1);
  stop();
  s.set($raw, 2);
  s.set(requested);
  expect(read).toHaveBeenCalledTimes(1);
  expect(map).toHaveBeenCalledTimes(1);
  unsub();
});

test('bond with a false atom guard does not start an otherwise unused state read', () => {
  const read = vi.fn(() => 42);
  const $expensive = atom(read);
  const trigger = actionAtom();
  const $allow = atom(false);
  const map = vi.fn((n: number) => [n] as [number]);
  const link = bond({ state: $expensive, trigger, guard: $allow, map });
  const s = createStore();
  const stop = link.connect(s);
  s.set(trigger);
  expect(read).not.toHaveBeenCalled();
  expect(map).not.toHaveBeenCalled();
  s.set($allow, true);
  expect(read).not.toHaveBeenCalled();
  s.set(trigger);
  expect(read).toHaveBeenCalledTimes(1);
  expect(map).toHaveBeenCalledTimes(1);
  stop();
});

test('prism stops evaluating a previously read sibling after its last subscriber leaves', () => {
  const $user = atom<User>({ name: 'Ada', age: 20 });
  const s = createStore();
  const name = vi.fn((user: User) => user.name);
  const age = vi.fn((user: User) => user.age);
  const { $name, $age } = prism($user, { $name: name, $age: age });
  const stopName = s.sub($name, () => {});
  const stopAge = s.sub($age, () => {});
  expect(age).toHaveBeenCalledTimes(1);
  stopAge();
  s.set($user, { name: 'Grace', age: 21 });
  expect(name).toHaveBeenCalledTimes(2);
  expect(age).toHaveBeenCalledTimes(1);
  expect(s.get($age)).toBe(21);
  expect(age).toHaveBeenCalledTimes(2);
  stopName();
});

test('source-only bond explicitly activates its clock at connect and releases it on last disconnect', () => {
  const $raw = atom(1);
  let active = 0;
  $raw.onMount = () => {
    active++;
    return () => {
      active--;
    };
  };
  const read = vi.fn((get: import('jotai/vanilla').Getter) => get($raw));
  const $source = atom(read);
  const link = bond({ state: $source });
  const s = createStore();
  expect(read).not.toHaveBeenCalled();
  expect(s.get(link)).toBeUndefined();
  const first = link.connect(s);
  const second = link.connect(s);
  expect(active).toBe(1);
  expect(read).toHaveBeenCalledTimes(1);
  expect(s.get(link)).toEqual([1]);
  first();
  expect(active).toBe(1);
  second();
  expect(active).toBe(0);
  s.set($raw, 2);
  expect(read).toHaveBeenCalledTimes(1);
  expect(s.get(link)).toEqual([1]);
});
