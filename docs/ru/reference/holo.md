# holo

Связывает обычный View со значениями атомов, writable-колбэками и фиксированными пропсами. Импорт из `jotai-holo`.

<Demo kind="counter">

<<< @/../examples/docs-demos.tsx#counter

</Demo>

<<< @/../examples/documentation.tsx#holo

## Контракт

| Поле      | Значение                                                             |
| --------- | -------------------------------------------------------------------- |
| core      | React View или intrinsic element                                     |
| state     | Пропс View → readable atom или дескриптор адаптера                   |
| actions   | Пропс-колбэк → writable atom или дескриптор адаптера                 |
| bindProps | Обычные фиксированные пропсы, включая функции и компоненты           |
| cage      | Необязательная связь committed lifecycle и входных пропсов с моделью |

Объявляйте вне React render. Непривязанные пропсы View остаются публичными; переданные ключи исключаются из типов вызывающего компонента. Один пропс нельзя указывать в нескольких разделах. Фиксированные значения перекрывают входные значения во время выполнения.

Подходит любой совместимый нативный атом: `state: { count: countAtom }` и `actions: { onChange: countAtom }` могут использовать **один writable atom**. Read-only атом не может быть action target. Promise в state разворачивается до View; тип пропса View — разрешённое значение. Колбэки actions сохраняют аргументы и результат.

Привязка и View используют shallow comparison React.memo. Action-only привязка не подписывается на target; колбэки стабильны при неизменных store и target. Подписки на все атомы модели не создаются. Новые объекты в выбранных значениях или входных пропсах могут вызвать рендер View. Context и локальные хуки сохраняют обычное поведение React.

Generic View сначала специализируйте до конкретных пропсов. Привязки state/actions должны быть корректны для соответствующих веток union; адаптер не сужает discriminated payload за вас. Для изоляции используется Provider Jotai; собственного Provider holo нет.

## Почему такой API

Цель — декларативное связывание без тонких forwarding-хуков. Разделы различают чтение, запись и статические данные без распознавания атомов во время выполнения. useAtomValue/useSetAtom подходят для компонентов с локальной логикой на хуках; holo полезен, когда View должен быть независим от модели.

## Аналогии и материалы

- [Reflect motivation](https://reflect.effector.dev/learn/motivation) — прямая мотивация внешнего связывания View.
- [Jotai atom](https://jotai.org/docs/core/atom) — исходные контракты primitive, read-only и write-only атомов.
- [Jotai performance](https://jotai.org/docs/guides/performance) — зачем нужны стабильные проекции и небольшие границы подписок.
