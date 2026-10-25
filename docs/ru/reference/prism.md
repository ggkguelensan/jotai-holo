# prism

Разделяет источник на именованные независимые read-only проекции. Импорт из корня или vanilla entry.

<<< @/../examples/documentation.tsx#prism

## Контракт

`prism(sourceAtom, { outputName: selector, … }) → { outputName: Atom, … }`

- Каждый выход — отдельный нативный derived atom; объявление не запускает селекторы.
- Чтение одного выхода не запускает неиспользуемые селекторы. Активные проекции пересчитываются при изменении источника; равное выбранное значение не уведомляет потребителей.
- Потребители одной проекции разделяют кеш Jotai в одном store. Разные store изолированы.
- Нет deep equality и отслеживания отдельных свойств через proxy. Новый объект может уведомлять при каждом изменении источника; сохраняйте structural sharing или используйте selectAtom с осознанной equality-функцией.
- `undefined` остаётся undefined. Ошибки распространяются; async-селекторы возвращают Promise, начатая работа автоматически не отменяется.

## Почему такой API

Prism удобно объявляет несколько нативных derived-атомов, а не eagerly вычисляет все поля общим splitter. Для своей equality нужен selectAtom; для writable lenses вместо read-only проекций подходят optics.

## Аналогии и материалы

- [Patronum reshape](https://patronum.effector.dev/operators/reshape/) — аналогия именованных проекций одного источника. Prism сохраняет нативную семантику undefined и Promise.
- [Jotai selectAtom](https://jotai.org/docs/utilities/select) — альтернатива для настройки сравнения.
- [Jotai performance](https://jotai.org/docs/guides/performance) — зачем нужны стабильные проекции и небольшие границы подписок.
