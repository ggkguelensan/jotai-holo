# createFormModel

Создать изолированные нативные RHF controls как модели Jotai по ключу.

<Demo kind="form">

<<< @/../examples/docs-infrastructure.tsx#form

</Demo>

## Подключение

Импорт из `jotai-holo/rhf`. Нужен React Hook Form 7.91+ в пределах v7. Resolver и валидатор устанавливаются в приложении; Zod и resolvers не входят в runtime библиотеки.

## Контракт

`createFormModel({ initial, options, model?, gcTime? }) → ModelDefinition`

- `options(initial)` возвращает нативные UseFormProps. На экземпляр модели создаётся один createFormControl. Initial используется только при создании, а не для реактивного reset.
- Необязательный `model({ form, initial })` возвращает ваши атомы и действия. Результат содержит их и form. Имя form зарезервировано.
- Сохраняются типы Input, context и преобразованного Output. Нативные zodResolver, yupResolver, valibotResolver и другие реализации Resolver передаются без преобразования схем. В живом примере используется Zod; тесты также проверяют асинхронный resolver с преобразованием результата.
- Идентичность control следует createModel: одна definition/key/store — общий control; другие ключи или store — изоляция. По умолчанию gcTime Infinity сохраняет черновик после unmount. Удаляйте его явно, когда он больше не нужен.
- Form предоставляет нативные register, handleSubmit, setValue, reset, setError, setFocus, subscribe, control и остальные методы createFormControl. Здесь нет искусственного объекта formState из useForm. Флаги и ошибки читайте через нативный useFormState.
- Options фиксируются при создании. Значения меняются через reset/setValue и действия модели. Автоматической перепривязки values/resolver из props holo нет. Async defaultValues загружаются при подключении holoForm с нативным состоянием загрузки RHF. Первая загрузка общая для экземпляра; после её завершения remount не применяет defaults заново. Для явного обновления используйте reset.
- Фабрика не создаёт подписок и не запускает React-хуки. Дополнительные ресурсы требуют явного владения. createFormModel не разделяет один control между разными store.

## Почему такой API

RHF control уже является движком формы. Полное зеркало его состояния в Jotai добавило бы расхождения во времени и валидации. Модель владеет control, а компоненты сохраняют свою разметку и хуки. Если внешнее разделяемое состояние не нужно, достаточно обычного useForm.

## Аналогии и материалы

- [RHF createFormControl](https://react-hook-form.com/docs/createFormControl) — нативный control вне React.
- [RHF resolvers](https://github.com/react-hook-form/resolvers) — адаптеры валидации и типизация преобразований.
- [RHF useForm](https://react-hook-form.com/docs/useform) — options и defaults.
