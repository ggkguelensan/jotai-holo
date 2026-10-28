'use client';

import { atom, type Atom } from 'jotai/vanilla';
import {
  createElement,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
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
import type { ModelFactory } from './model-composition.js';
import { modelBlueprints } from './model-config.js';
import type { ModelSource } from './holo-types.js';
import type { BindingKeys } from './holo-types.js';
import {
  connectView,
  type HoloConfig,
  type HoloViewComponent,
  type ResolvedModels,
  type ViewRuntimeConfig,
} from './holo-view.js';

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
}): ModelFactory<Model & { form: FormControl<Input, Context, Output> }, Initial> {
  if ('gcTime' in config || 'retainTime' in config)
    throw new TypeError('createFormModel: configure retainTime through modelRegistry.');
  const create = (initial: Initial = config.initial) => {
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
  };
  modelBlueprints.set(create, { create, initial: config.initial });
  return create;
}

/** One native useForm/FormProvider root; select its control from named models. */
export function holoForm<
  View extends ElementType,
  Sources extends Record<string, ModelSource>,
  ReadKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  WriteKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
  StaticKeys extends BindingKeys<ComponentPropsWithRef<NoInfer<View>>> = never,
>(
  config: HoloConfig<View, Sources, ReadKeys, WriteKeys, StaticKeys> & {
    models: Sources;
    form: (models: ResolvedModels<Sources>) => { readonly formControl: object };
  },
): HoloViewComponent<View, Sources, ReadKeys, WriteKeys, StaticKeys> {
  return connectView(config as unknown as ViewRuntimeConfig, (models, View) => {
    const form = config.form(models as ResolvedModels<Sources>) as OwnedControl;
    const owner = form[bridgeOwner];
    if (!owner)
      throw new Error(
        'holoForm: select a createFormModel control with form: models => models.editor.form.',
      );
    return function FormRoot(props: Record<string, unknown>) {
      // The control owns synchronous defaults. Reapplying them resets retained edits.
      const { defaultValues, ...options } = owner.options;
      const loadDefaults = useRef(!owner.defaultsLoaded).current;
      const methods = useForm({
        ...options,
        defaultValues:
          loadDefaults && typeof defaultValues === 'function' ? defaultValues : undefined,
        formControl: form.formControl,
      } as UseFormProps);
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
        children: createElement(View, props),
      });
    };
  }) as HoloViewComponent<View, Sources, ReadKeys, WriteKeys, StaticKeys>;
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
