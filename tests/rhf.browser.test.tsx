import { act, forwardRef, useState, type ComponentPropsWithoutRef } from 'react';
import { atom, createStore, Provider } from 'jotai';
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useFormState,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { holo } from '../src/holo.js';
import { createHarness, deferred } from './browser-harness.js';

const $placeholder = atom('Your name');
const Input = holo({
  view: forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(
    function InputView(props, ref) {
      return <input {...props} ref={ref} />;
    },
  ),
  read: { placeholder: $placeholder },
});
async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit(container: HTMLElement) {
  await act(async () => {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}
let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  const calls = consoleError.mock.calls;
  consoleError.mockRestore();
  expect(calls).toEqual([]);
});

test('native register preserves refs, required validation, focus, dirty/touched, submit and reset', async () => {
  type Data = { name: string };
  let form!: UseFormReturn<Data>;
  const onValid = vi.fn();
  function Status() {
    const { control } = useFormContext<Data>();
    const { errors, dirtyFields, touchedFields } = useFormState({ control });
    return (
      <output>
        {JSON.stringify({
          error: errors.name?.message,
          dirty: dirtyFields.name,
          touched: touchedFields.name,
        })}
      </output>
    );
  }
  const StatusView = holo({ view: Status });
  function App() {
    form = useForm<Data>({ defaultValues: { name: '' }, mode: 'onBlur' });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onValid)}>
          <Input aria-label="Name" {...form.register('name', { required: 'Required' })} />
          <StatusView />
        </form>
      </FormProvider>
    );
  }
  const h = createHarness();
  const store = createStore();
  await h.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  const input = h.container.querySelector('input')!;
  await submit(h.container);
  expect(onValid).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(input);
  expect(h.container.textContent).toContain('Required');
  await type(input, 'Ada');
  await act(async () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
  expect(form.getValues()).toEqual({ name: 'Ada' });
  expect(h.container.textContent).toContain('"dirty":true');
  expect(h.container.textContent).toContain('"touched":true');
  await act(async () => store.set($placeholder, 'Changed placeholder'));
  expect(input.value).toBe('Ada');
  expect(input.placeholder).toBe('Changed placeholder');
  await submit(h.container);
  expect(onValid.mock.calls[0]?.[0]).toEqual({ name: 'Ada' });
  await act(async () => form.reset({ name: 'Grace' }));
  expect(input.value).toBe('Grace');
  expect(h.container.textContent).not.toContain('"dirty":true');
});

test('Controller passes native controlled value/events/ref and skips View for unrelated field changes', async () => {
  type Data = { name: string; other: string };
  let form!: UseFormReturn<Data>;
  let renders = 0;
  const Name = holo({
    view: forwardRef<
      HTMLInputElement,
      ComponentPropsWithoutRef<'input'> & { error: string | undefined }
    >(function NameView({ error, ...props }, ref) {
      renders++;
      return (
        <label>
          <input {...props} ref={ref} />
          {error && <span role="alert">{error}</span>}
        </label>
      );
    }),
    read: { placeholder: $placeholder },
  });
  function App() {
    form = useForm<Data>({ defaultValues: { name: '', other: '' } });
    return (
      <Controller
        name="name"
        control={form.control}
        rules={{ required: 'Name required' }}
        render={({ field, fieldState }) => <Name {...field} error={fieldState.error?.message} />}
      />
    );
  }
  const h = createHarness();
  await h.render(<App />);
  const initial = renders;
  await act(async () => form.setValue('other', 'unrelated', { shouldDirty: true }));
  expect(renders).toBe(initial);
  const input = h.container.querySelector('input')!;
  await type(input, 'Ada');
  expect(form.getValues('name')).toBe('Ada');
  await act(async () => form.setValue('name', 'Grace'));
  expect(input.value).toBe('Grace');
  await act(async () => {
    form.setError('name', { type: 'server', message: 'Taken' });
    form.setFocus('name');
  });
  expect(h.container.textContent).toContain('Taken');
  expect(document.activeElement).toBe(input);
});

test('native RHF components can themselves be specialized and wrapped with holo', async () => {
  type Data = { name: string };
  const BoundController = holo({ view: Controller<Data, 'name'>, props: { name: 'name' } });
  function App() {
    const { control } = useForm<Data>({ defaultValues: { name: 'Ada' } });
    return <BoundController control={control} render={({ field }) => <Input {...field} />} />;
  }
  const h = createHarness();
  await h.render(<App />);
  expect(h.container.querySelector('input')!.value).toBe('Ada');
});

test('useFieldArray keeps native row identity during reorder and unregisters removed fields', async () => {
  type Data = { users: { name: string }[] };
  let form!: UseFormReturn<Data>;
  let move!: (from: number, to: number) => void;
  let remove!: (index: number) => void;
  function App() {
    form = useForm<Data>({
      defaultValues: { users: [{ name: 'Ada' }, { name: 'Grace' }] },
      shouldUnregister: true,
    });
    const array = useFieldArray({ control: form.control, name: 'users' });
    move = array.move;
    remove = array.remove;
    return (
      <>
        {array.fields.map((field, index) => (
          <Input key={field.id} {...form.register(`users.${index}.name`)} />
        ))}
      </>
    );
  }
  const h = createHarness();
  await h.render(<App />);
  const first = h.container.querySelectorAll('input')[0]!;
  await act(async () => move(0, 1));
  expect(h.container.querySelectorAll('input')[1]).toBe(first);
  expect(form.getValues('users')).toEqual([{ name: 'Grace' }, { name: 'Ada' }]);
  await act(async () => remove(0));
  expect(form.getValues('users')).toEqual([{ name: 'Ada' }]);
});

test('conditional Controller registration and disabled state remain owned by RHF', async () => {
  type Data = { name?: string | undefined };
  let form!: UseFormReturn<Data>;
  let setVisible!: (show: boolean) => void;
  let setDisabled!: (disabled: boolean) => void;
  const onValid = vi.fn();
  function App() {
    form = useForm<Data>({ defaultValues: { name: 'Ada' } });
    const [visible, show] = useState(true);
    const [disabled, disable] = useState(false);
    setVisible = show;
    setDisabled = disable;
    return (
      <form onSubmit={form.handleSubmit(onValid)}>
        {visible && (
          <Controller
            name="name"
            control={form.control}
            shouldUnregister
            disabled={disabled}
            render={({ field }) => <Input {...field} />}
          />
        )}
      </form>
    );
  }
  const h = createHarness();
  await h.render(<App />);
  await act(async () => setDisabled(true));
  expect(h.container.querySelector('input')!.disabled).toBe(true);
  await submit(h.container);
  expect(onValid.mock.calls[0]?.[0].name).toBeUndefined();
  await act(async () => setVisible(false));
  expect(form.getValues('name')).toBeUndefined();
});

test('async resolver transformations and async submission use native RHF result types and lifecycle', async () => {
  type InputData = { age: string };
  type OutputData = { age: number };
  const pending = deferred<void>();
  const onValid = vi.fn(async (_data: OutputData) => {
    await pending.promise;
  });
  const resolver: Resolver<InputData, undefined, OutputData> = async (values) => ({
    values: { age: Number(values.age) },
    errors: {},
  });
  let form!: UseFormReturn<InputData, undefined, OutputData>;
  function App() {
    form = useForm<InputData, undefined, OutputData>({ defaultValues: { age: '42' }, resolver });
    const { isSubmitting } = useFormState({ control: form.control });
    return (
      <form onSubmit={form.handleSubmit(onValid)}>
        <Input {...form.register('age')} />
        <output>{String(isSubmitting)}</output>
      </form>
    );
  }
  const h = createHarness();
  await h.render(<App />);
  await submit(h.container);
  expect(onValid.mock.calls[0]?.[0]).toEqual({ age: 42 });
  expect(h.container.textContent).toContain('true');
  await act(async () => {
    pending.resolve();
    await pending.promise;
  });
  expect(h.container.textContent).toContain('false');
});
