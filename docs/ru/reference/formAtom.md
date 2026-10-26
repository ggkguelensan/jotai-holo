# formAtom

Подписаться на значение одного RHF-поля через read-only атом Jotai.

<Demo kind="form">

<<< @/../examples/docs-infrastructure.tsx#form

</Demo>

## Использование

```ts
import { formAtom } from 'jotai-holo/rhf';
const $email = formAtom(form, 'email');
const $address = formAtom(form, 'address');
// Запись: нативные form.setValue / reset либо actionAtom модели.
```

## Контракт

`formAtom(formControl, fieldPath) → Atom<FieldPathValue>`

- Путь проверяется по Input-типу RHF. Можно выбрать объект или массив. Создавайте атомы один раз внутри фабрики модели формы.
- Объявление не подключает listener. Mounted-потребители разделяют одну subscribe-подписку на атом/store с фильтром по имени поля. Последний unmount отписывает её.
- Первое чтение использует getValues. Mount планирует сверку, закрывающую промежуток между чтением и подпиской. Обновления объединяются в microtask вне callback RHF, чтобы избежать синхронного повторного входа.
- Выбранные простые объекты и массивы копируются с structural sharing: RHF может менять вложенные значения. Одинаковые данные сохраняют прежний снимок; изменение другого поля не уведомляет потребителя скалярного значения. Специальные значения и экземпляры классов сохраняют ссылки.
- Здесь наблюдение за значением поля, а не полное зеркало formState. Ошибки, isDirty, isSubmitting и другие флаги читайте через нативный useFormState; при необходимости передайте control во внешнюю панель. Для свежего императивного чтения без mounted-подписки есть form.getValues.
- Атом относится к своему control. Повторное использование одного raw control в разных store намеренно наблюдает одну внешнюю форму. createFormModel создаёт отдельный control на store.

В императивном действии, которому нужны текущие значения сразу после setValue, читайте form.getValues. Уведомления атома отложены до microtask, поэтому в том же стеке он может вернуть предыдущий снимок.

## Почему такой API

Проекция поля полезна для вычислений модели и внешних панелей без подписки всех View на все значения. Внутри RHF-компонентов проще оставить useWatch. Флаги остаются нативными: нет второго движка состояния и обращений к приватным полям RHF.

## Аналогии и материалы

- [RHF subscribe](https://react-hook-form.com/docs/useform/subscribe) — фильтрация и ограничения callback.
- [RHF useWatch](https://react-hook-form.com/docs/usewatch) — наблюдение значения в React.
- [RHF useFormState](https://react-hook-form.com/docs/useformstate) — флаги и ошибки формы.
