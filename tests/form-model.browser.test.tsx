import { modelRegistry } from '../src/model.js';
import { act, StrictMode } from 'react';
import { atom, createStore, Provider } from 'jotai';
import { useFieldArray, useFormContext, useFormState, type Resolver } from 'react-hook-form';
import { expect, test, vi } from 'vitest';
import { holo } from '../src/holo.js';
import { createFormModel, formAtom, holoForm } from '../src/rhf.js';
import { createHarness, deferred, ErrorBoundary, suspense } from './browser-harness.js';

test('keyed forms isolate values while ordinary holo panels share selected fields without subscription churn', async () => {
  const Profile = modelRegistry()(
    createFormModel({
      initial: { name: 'Ada', other: '' },
      options: (initial) => ({ defaultValues: initial }),
      model: ({ form }) => ({ $name: formAtom(form, 'name') }),
    }),
  );
  let renders = 0;
  function View() {
    const form = useFormContext<{ name: string; other: string }>();
    return <input {...form.register('name')} />;
  }
  const Form = holoForm({
    form: ({ model }) => model.form,
    models: { model: (props: { id: string }) => Profile({ key: [props.id] }) },
    view: View,
  });
  const Panel = holo({
    models: { model: (props: { id: string }) => Profile({ key: [props.id] }) },
    view: ({ name }: { name: string }) => {
      renders++;
      return <output>{name}</output>;
    },
    read: ({ model: m }) => ({ name: m.$name }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Form id="a" />
      <Panel id="a" />
      <Form id="b" />
      <Panel id="b" />
    </Provider>,
  );
  const a = store.get(Profile({ key: ['a'] }));
  const b = store.get(Profile({ key: ['b'] }));
  expect(a.form).not.toBe(b.form);
  const before = renders;
  await act(async () => a.form.setValue('other', 'unrelated'));
  expect(renders).toBe(before);
  await act(async () => a.form.setValue('name', 'Grace'));
  expect([...h.container.querySelectorAll('input')].map((n) => n.value)).toEqual(['Grace', 'Ada']);
  expect([...h.container.querySelectorAll('output')].map((n) => n.textContent)).toEqual([
    'Grace',
    'Ada',
  ]);
  await h.render(
    <Provider store={store}>
      <Panel id="a" />
    </Provider>,
  );
  await h.render(
    <Provider store={store}>
      <Form id="a" />
      <Panel id="a" />
    </Provider>,
  );
  expect(h.container.querySelector('input')!.value).toBe('Grace');
});

test('formAtom is lazy, shares one subscription, preserves nested equality and detaches at last owner', async () => {
  const Profile = modelRegistry()(
    createFormModel({
      initial: { person: { name: 'Ada' }, other: '' },
      options: (initial) => ({ defaultValues: initial }),
    }),
  );
  const store = createStore();
  const { form } = store.get(Profile());
  const subscribe = vi.spyOn(form, 'subscribe');
  const $person = formAtom(form, 'person');
  expect(subscribe).not.toHaveBeenCalled();
  const notify = vi.fn();
  const stopA = store.sub($person, notify);
  const stopB = store.sub($person, () => {});
  await Promise.resolve();
  expect(subscribe).toHaveBeenCalledTimes(1);
  const previous = store.get($person);
  form.setValue('person.name', 'Ada');
  await Promise.resolve();
  expect(store.get($person)).toBe(previous);
  expect(notify).not.toHaveBeenCalled();
  form.setValue('person.name', 'Grace');
  await Promise.resolve();
  expect(store.get($person)).toEqual({ name: 'Grace' });
  expect(previous).toEqual({ name: 'Ada' });
  stopA();
  stopB();
  form.setValue('person.name', 'Detached');
  await Promise.resolve();
  expect(notify).toHaveBeenCalledTimes(1);
});

test('native async resolvers preserve transformed outputs and submitting state through holoForm', async () => {
  type Input = { age: string };
  type Output = { age: number };
  const pending = deferred<void>();
  const saved = vi.fn(async (_data: Output) => pending.promise);
  const resolver: Resolver<Input, undefined, Output> = async (values) => ({
    values: { age: Number(values.age) },
    errors: {},
  });
  const Profile = modelRegistry()(
    createFormModel({
      initial: { age: '42' },
      options: (initial) => ({ defaultValues: initial, resolver }),
    }),
  );
  function View() {
    const form = useFormContext<Input, undefined, Output>();
    const { isSubmitting } = useFormState({ control: form.control });
    return (
      <form onSubmit={form.handleSubmit(saved)}>
        <input {...form.register('age')} />
        <output>{String(isSubmitting)}</output>
      </form>
    );
  }
  const Form = holoForm({
    form: ({ model }) => model.form,
    models: { model: Profile },
    view: View,
  });
  const h = createHarness();
  await h.render(<Form />);
  await act(async () =>
    h.container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
  expect(saved.mock.calls[0]?.[0]).toEqual({ age: 42 });
  expect(h.container.textContent).toBe('true');
  await act(async () => {
    pending.resolve();
    await pending.promise;
  });
  expect(h.container.textContent).toBe('false');
});

test('native field arrays retain row identity and reset under StrictMode form ownership', async () => {
  const Profile = modelRegistry()(
    createFormModel({
      initial: { users: [{ name: 'Ada' }, { name: 'Grace' }] },
      options: (initial) => ({ defaultValues: initial }),
    }),
  );
  const store = createStore();
  let move!: (a: number, b: number) => void;
  function View() {
    const form = useFormContext<{ users: { name: string }[] }>();
    const rows = useFieldArray({ control: form.control, name: 'users' });
    move = rows.move;
    return (
      <>
        {rows.fields.map((row, i) => (
          <input key={row.id} {...form.register(`users.${i}.name`)} />
        ))}
      </>
    );
  }
  const Form = holoForm({
    form: ({ model }) => model.form,
    models: { model: Profile },
    view: View,
  });
  const h = createHarness();
  await h.render(
    <StrictMode>
      <Provider store={store}>
        <Form />
      </Provider>
    </StrictMode>,
  );
  const first = h.container.querySelector('input');
  await act(async () => move(0, 1));
  expect(h.container.querySelectorAll('input')[1]).toBe(first);
  await act(async () => store.get(Profile()).form.reset({ users: [{ name: 'New' }] }));
  expect(h.container.querySelectorAll('input').length).toBe(1);
  expect(h.container.querySelector('input')!.value).toBe('New');
});

test('validation, focus, dirty/touched state and defaults survive the native form bridge', async () => {
  const Profile = modelRegistry()(
    createFormModel({
      initial: { name: '' },
      options: (initial) => ({ defaultValues: initial }),
    }),
  );
  const store = createStore();
  const saved = vi.fn();
  function View() {
    const form = useFormContext<{ name: string }>();
    const { errors, isDirty, touchedFields } = useFormState({ control: form.control });
    return (
      <form onSubmit={form.handleSubmit(saved)}>
        <input {...form.register('name', { required: 'Required' })} />
        <output>
          {JSON.stringify({
            error: errors.name?.message,
            isDirty,
            touched: touchedFields.name,
            defaults: form.formState.defaultValues,
          })}
        </output>
      </form>
    );
  }
  const Form = holoForm({
    form: ({ model }) => model.form,
    models: { model: Profile },
    view: View,
  });
  const h = createHarness();
  const tree = (visible: boolean) => <Provider store={store}>{visible && <Form />}</Provider>;
  await h.render(tree(true));
  await act(async () =>
    h.container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
  expect(saved).not.toHaveBeenCalled();
  expect(h.container.textContent).toContain('Required');
  expect(document.activeElement).toBe(h.container.querySelector('input'));
  const form = store.get(Profile()).form;
  await act(async () => {
    form.setValue('name', 'Grace', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  });
  expect(h.container.textContent).toContain('"isDirty":true');
  expect(h.container.textContent).toContain('"touched":true');
  expect(h.container.textContent).not.toContain('Required');
  await h.render(tree(false));
  await h.render(tree(true));
  expect(h.container.querySelector('input')!.value).toBe('Grace');
  expect(h.container.textContent).toContain('"isDirty":true');
  expect(h.container.textContent).toContain('"defaults":{"name":""}');
  await act(async () => form.reset());
  expect(h.container.querySelector('input')!.value).toBe('');
  expect(h.container.textContent).toContain('"isDirty":false');
});

test('async defaults load only after mount, preserve native loading state and never overwrite a retained draft on remount', async () => {
  const load = vi.fn(async () => ({ name: 'Loaded' }));
  const loading: boolean[] = [];
  const Profile = modelRegistry()(
    createFormModel({ initial: undefined, options: () => ({ defaultValues: load }) }),
  );
  const store = createStore();
  store.get(Profile());
  expect(load).not.toHaveBeenCalled();
  function View() {
    const form = useFormContext<{ name: string }>();
    const { isLoading } = useFormState({ control: form.control });
    loading.push(isLoading);
    return (
      <>
        <input {...form.register('name')} />
        <output>{String(isLoading)}</output>
      </>
    );
  }
  const Form = holoForm({
    form: ({ model }) => model.form,
    models: { model: Profile },
    view: View,
  });
  const h = createHarness();
  const tree = (visible: boolean) => <Provider store={store}>{visible && <Form />}</Provider>;
  await h.render(tree(true));
  expect(load).toHaveBeenCalledTimes(1);
  expect(loading).toContain(true);
  expect(h.container.textContent).toBe('false');
  expect(h.container.querySelector('input')!.value).toBe('Loaded');
  await act(async () => store.get(Profile()).form.setValue('name', 'Draft', { shouldDirty: true }));
  await h.render(tree(false));
  await h.render(tree(true));
  expect(load).toHaveBeenCalledTimes(1);
  expect(h.container.querySelector('input')!.value).toBe('Draft');
  expect(h.container.textContent).toBe('false');
});

test('an abandoned suspended form never starts async defaults or acquires another active root', async () => {
  const load = vi.fn(async () => ({ name: 'Loaded' }));
  const Profile = modelRegistry()(
    createFormModel({
      initial: undefined,
      options: () => ({ defaultValues: load }),
      model: () => ({ $pending: atom(new Promise<string>(() => {})) }),
    }),
  );
  const Pending = holoForm({
    form: ({ model }) => model.form,
    models: { model: () => Profile({ key: ['abandoned'] }) },
    view: ({ value }: { value: string }) => <output>{value}</output>,
    read: ({ model: m }) => ({ value: m.$pending }),
  });
  const h = createHarness();
  await h.render(suspense(<Pending />));
  expect(load).not.toHaveBeenCalled();
  await h.unmount();
  expect(load).not.toHaveBeenCalled();
});

test('two roots for one control are rejected and the control can be mounted again after cleanup', async () => {
  const Profile = modelRegistry()(
    createFormModel({
      initial: { name: 'Ada' },
      options: (initial) => ({ defaultValues: initial }),
    }),
  );
  const Form = holoForm({
    form: ({ model }) => model.form,
    models: { model: Profile },
    view: () => <input {...useFormContext<{ name: string }>().register('name')} />,
  });
  const store = createStore();
  const first = createHarness();
  await first.render(
    <Provider store={store}>
      <ErrorBoundary>
        <Form />
        <Form />
      </ErrorBoundary>
    </Provider>,
  );
  expect(first.container.textContent).toBe('error');
  expect(String(first.caught[0])).toContain('already has an active root');
  await first.unmount();
  const next = createHarness();
  await next.render(
    <Provider store={store}>
      <Form />
    </Provider>,
  );
  expect(next.container.querySelector('input')!.value).toBe('Ada');
});

test('form root ownership survives temporary Suspense hiding and allows sequential root replacement', async () => {
  const pending = deferred<string>();
  const Profile = modelRegistry()(
    createFormModel({
      initial: { name: 'Ada' },
      options: (initial) => ({ defaultValues: initial }),
      model: () => ({ $text: atom<string | Promise<string>>('ready') }),
    }),
  );
  function View({ text = '' }: { text?: string }) {
    return (
      <>
        <input {...useFormContext<{ name: string }>().register('name')} />
        <span>{text}</span>
      </>
    );
  }
  const Form = holoForm({
    form: ({ model }) => model.form,
    models: { model: Profile },
    view: View,
    read: ({ model: m }) => ({ text: m.$text }),
  });
  const Other = holoForm({
    form: ({ model }) => model.form,
    models: { model: Profile },
    view: View,
  });
  const store = createStore();
  const first = createHarness();
  await first.render(<Provider store={store}>{suspense(<Form />)}</Provider>);
  await act(async () => store.set(store.get(Profile()).$text, pending.promise));
  const second = createHarness();
  await second.render(
    <Provider store={store}>
      <ErrorBoundary>
        <Other />
      </ErrorBoundary>
    </Provider>,
  );
  expect(second.container.textContent).toBe('error');
  expect(String(second.caught[0])).toContain('already has an active root');
  await second.unmount();
  await act(async () => {
    pending.resolve('resolved');
    await pending.promise;
    store.get(Profile()).form.setValue('name', 'Draft');
  });
  await first.render(
    <Provider store={store}>
      <Other />
    </Provider>,
  );
  expect(first.container.querySelector('input')!.value).toBe('Draft');
});

test('holoForm explicitly selects its control among multiple named models', async () => {
  const First = modelRegistry()(
    createFormModel({
      initial: { name: 'first' },
      options: (initial) => ({ defaultValues: initial }),
    }),
  );
  const Second = modelRegistry()(
    createFormModel({
      initial: { name: 'second' },
      options: (initial) => ({ defaultValues: initial }),
    }),
  );
  const Connected = holoForm({
    models: { first: First, editor: Second },
    form: ({ editor }) => editor.form,
    view: ({ firstName }: { firstName: string }) => {
      const form = useFormContext<{ name: string }>();
      return (
        <>
          <output>{firstName}</output>
          <input {...form.register('name')} />
        </>
      );
    },
    read: ({ first }) => ({ firstName: formAtom(first.form, 'name') }),
  });
  const store = createStore();
  const h = createHarness();
  await h.render(
    <Provider store={store}>
      <Connected />
    </Provider>,
  );
  expect(h.container.querySelector('input')!.value).toBe('second');
  expect(h.container.querySelector('output')!.textContent).toBe('first');
  await act(async () => store.get(Second()).form.setValue('name', 'edited'));
  expect(h.container.querySelector('input')!.value).toBe('edited');
  expect(store.get(First()).form.getValues('name')).toBe('first');
});
