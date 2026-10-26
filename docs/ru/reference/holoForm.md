# holoForm

Подключить модель формы к обычному RHF View вне React render.

<Demo kind="form">

<<< @/../examples/docs-infrastructure.tsx#form

</Demo>

## Использование

```tsx
import { holoForm } from 'jotai-holo/rhf';
const ContactEditor = holoForm({
  model: (props: { contactId: string }) => Contact({ key: [props.contactId] }),
  core: ContactView,
});
// ContactView использует обычные useFormContext, Controller, register и useFieldArray.
<ContactEditor contactId="ada" />;
```

## Контракт

- Принимает model-форму конфигурации holo: core, model, state, actions, bindProps, cage. Связанные props исключаются из публичных; входы model-селектора остаются обязательными.
- Модель создаётся через createFormModel. Нативные useForm и useFormState связывают существующий formControl с FormProvider; вложенные компоненты и useFormContext остаются обычным RHF.
- На один control разрешён один активный holoForm root. Второй root с тем же ключом вызывает ошибку. Для независимой формы нужен другой ключ; внешняя панель использует **обычный holo** с тем же ключом.
- Options control, включая resolver, сохраняются. Синхронные defaultValues не применяются повторно при remount. Значениями владеет RHF, удалением полей управляет shouldUnregister.
- Refs register, события Controller, валидация, фокус, identity field-array, reset и async submission сохраняют нативную семантику. UI-библиотеки на Controller/useFormContext не требуют переписывания состояния. Адаптер не меняет их DOM и accessibility-контракты.
- Lease подключается после commit, освобождается при cleanup и выдерживает StrictMode replay. Смена ключа модели перемонтирует View. HTML form и кнопку submit добавляет приложение.

## Почему такой API

В одном объявлении находятся выбор модели и единственный RHF bridge. View остаётся понятным RHF-кодом; внешние виджеты связываются с атомами и действиями того же экземпляра. Не требуется создавать React-компонент через useMemo или добавлять scope Bunshi.

## Аналогии и материалы

- [RHF FormProvider](https://react-hook-form.com/docs/formprovider) — контекст существующих компонентов формы.
- [RHF Controller](https://react-hook-form.com/docs/usecontroller/controller) — controlled UI.
- [Формы shadcn](https://ui.shadcn.com/docs/forms/react-hook-form) — композиция UI с нативными контрактами RHF.
