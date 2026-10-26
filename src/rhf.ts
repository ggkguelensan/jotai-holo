'use client';

import { atom, type Atom } from 'jotai/vanilla';
import {
  createElement,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
  type ComponentType,
  type ElementType,
  type NamedExoticComponent,
} from 'react';
import {
  createFormControl,
  FormProvider,
  useForm,
  useFormState,
  type DefaultValues,
  type FieldPath,
  type FieldPathValue,
  type FieldValues,
  type UseFormProps,
} from 'react-hook-form';
import { createModel, type ModelDefinition } from './model.js';
import {
  bindModel,
  type ModelInputs,
  type ModelRuntimeConfig,
  type ModelSource,
} from './model-binding.js';
import { holo, type BindingKeys, type HoloModelConfig, type OwnProps } from './holo.js';

export type FormControl<Input extends FieldValues, Context = unknown, Output = Input> = ReturnType<
  typeof createFormControl<Input, Context, Output>
>;
const bridgeOwner = Symbol('holo.form.owner');
type Owner = { current?: object; options: UseFormProps; defaultsLoaded: boolean };
type OwnedControl<
  Input extends FieldValues = FieldValues,
  Context = unknown,
  Output = Input,
> = FormControl<Input, Context, Output> & { [bridgeOwner]: Owner };

/** Define native RHF controls as store-owned models; no React work or subscriptions in the factory. */
export function createFormModel<
  Input extends FieldValues,
  Context = unknown,
  Output = Input,
  Initial = DefaultValues<Input>,
  Model extends object = {},
>(config: {
  initial: Initial;
  options: (initial: Initial) => UseFormProps<Input, Context, Output>;
  model?: (context: {
    form: FormControl<Input, Context, Output>;
    initial: Initial;
  }) => Model & { then?: never };
  gcTime?: number;
}): ModelDefinition<Model & { form: FormControl<Input, Context, Output> }, Initial> {
  return createModel({
    initial: config.initial,
    ...(config.gcTime === undefined ? {} : { gcTime: config.gcTime }),
    create: (initial) => {
      const options = config.options(initial);
      const defaultValues = options.defaultValues;
      const owner: Owner = {
        options: options as UseFormProps,
        defaultsLoaded: typeof defaultValues !== 'function',
      };
      if (typeof defaultValues === 'function') {
        let pending: Promise<Input> | undefined;
        const load = () =>
          (pending ??= Promise.resolve(defaultValues()).then((values) => {
            owner.defaultsLoaded = true;
            return values;
          }));
        owner.options = { ...options, defaultValues: load } as UseFormProps;
      }
      const form = Object.assign(
        createFormControl(owner.options as UseFormProps<Input, Context, Output>),
        {
          [bridgeOwner]: owner,
        },
      );
      const model = config.model?.({ form, initial }) ?? {};
      if (typeof Reflect.get(model, 'then') === 'function')
        throw new TypeError('createFormModel: model must return a synchronous object.');
      if ('form' in model)
        throw new Error('createFormModel: form is reserved for the native RHF control.');
      return { ...model, form } as Model & { form: FormControl<Input, Context, Output> };
    },
  });
}

/** One native useForm/FormProvider bridge per active form instance. Other consumers use ordinary holo. */
export function holoForm<
  Core extends ElementType,
  Source extends ModelSource,
  StateKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  ActionKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<Core>>> = never,
>(
  config: HoloModelConfig<Core, Source, StateKeys, ActionKeys, StaticKeys>,
): NamedExoticComponent<
  OwnProps<ComponentPropsWithRef<NoInfer<Core>>, StateKeys | ActionKeys | StaticKeys> &
    ModelInputs<Source>
> {
  return bindModel(config as ModelRuntimeConfig, (resolved, model) => {
    if (!('form' in model))
      throw new Error('holoForm: model must expose its native RHF form control.');
    const form = model.form as OwnedControl;
    const owner = form[bridgeOwner];
    if (!owner) throw new Error('holoForm: use a createFormModel definition.');
    const Connected = Reflect.apply(holo, undefined, [resolved]) as ComponentType<
      Record<string, unknown>
    >;
    return function FormRoot(props: Record<string, unknown>) {
      // RHF resets an externally supplied control when synchronous defaultValues are passed again.
      // The control already owns those defaults; keep all other native options, including resolver.
      const { defaultValues, ...options } = owner.options;
      const loadDefaults = useRef(!owner.defaultsLoaded).current;
      const methods = useForm({
        ...options,
        // Explicit undefined clears RHF's merged async-loader option on a retained remount.
        defaultValues:
          loadDefaults && typeof defaultValues === 'function' ? defaultValues : undefined,
        formControl: form.formControl,
      } as UseFormProps);
      // useFormState reads the existing control snapshot, including retained defaults and flags.
      const formState = useFormState({ control: methods.control });
      const identity = useRef({});
      useEffect(() => {
        if (owner.current && owner.current !== identity.current)
          throw new Error(
            'holoForm: this form already has an active root. Use another key for an independent form, or ordinary holo for an external panel.',
          );
        owner.current = identity.current;
        return () => {
          if (owner.current === identity.current) delete owner.current;
        };
      }, []);
      return createElement(FormProvider, {
        ...methods,
        formState,
        children: createElement(Connected, props),
      });
    };
  }) as NamedExoticComponent<
    OwnProps<ComponentPropsWithRef<NoInfer<Core>>, StateKeys | ActionKeys | StaticKeys> &
      ModelInputs<Source>
  >;
}

/** Read-only selected field values. RHF flags remain available through native useFormState. */
export function formAtom<Input extends FieldValues, Name extends FieldPath<Input>, Context, Output>(
  form: FormControl<Input, Context, Output>,
  name: Name,
): Atom<FieldPathValue<Input, Name>> {
  const $revision = atom(0);
  $revision.onMount = (bump) => {
    let active = true;
    let queued = false;
    const publish = () => {
      if (queued) return;
      queued = true;
      // RHF forbids re-entering its methods from subscribe callbacks. Publish outside that stack.
      queueMicrotask(() => {
        queued = false;
        if (active) bump((n) => n + 1);
      });
    };
    const stop = form.subscribe({ name, formState: { values: true }, callback: publish });
    publish();
    return () => {
      active = false;
      stop();
    };
  };
  const $cache = atom(() => ({ value: undefined as unknown }));
  return atom((get) => {
    get($revision);
    const cache = get($cache);
    // RHF can mutate nested field objects in place; copy the selected field only.
    cache.value = snapshot(form.getValues(name), cache.value);
    return cache.value as FieldPathValue<Input, Name>;
  });
}

function snapshot(value: unknown, previous: unknown): unknown {
  if (Array.isArray(value)) {
    const before = Array.isArray(previous) ? previous : [];
    const next = value.map((item, index) => snapshot(item, before[index]));
    return Array.isArray(previous) &&
      next.length === before.length &&
      next.every((item, index) => Object.is(item, before[index]))
      ? previous
      : next;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const before =
      previous && typeof previous === 'object' ? (previous as Record<string, unknown>) : {};
    const entries = Object.entries(value).map(
      ([key, field]) => [key, snapshot(field, before[key])] as const,
    );
    return previous &&
      typeof previous === 'object' &&
      Object.keys(before).length === entries.length &&
      entries.every(([key, field]) => Object.hasOwn(before, key) && Object.is(before[key], field))
      ? previous
      : Object.fromEntries(entries);
  }
  return value;
}
