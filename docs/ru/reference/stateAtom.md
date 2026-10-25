# stateAtom

Создаёт writable state из значения или read-only derived state из getter. Импорт: `jotai-holo` или `jotai-holo/vanilla`.

<<< @/../examples/documentation.tsx#state

## Контракт

- `stateAtom(value)` возвращает нативный primitive atom с записью через `set` или связанный колбэк.
- `stateAtom(get => value)` возвращает нативный read-only atom. Колбэк получает **только get**, без setter и options.
- Функция всегда означает производное чтение. Для function-valued primitive, writable derived и `{ signal }` используйте нативный `atom`.
- Promise остаётся Promise вне React-привязок. Чтения ленивы; зависимости и изоляцию store обеспечивает Jotai.

Публичного алиаса `storeAtom` нет.

## Почему такой API

Это суженный интерфейс объявления состояния, а не замена всех перегрузок atom. Он явно показывает read-only назначение derived state. Когда нужна дополнительная гибкость, используйте нативный atom.

## Аналогии и материалы

- [Jotai atom](https://jotai.org/docs/core/atom) — исходные контракты primitive, read-only и write-only атомов.
- [Jotai performance](https://jotai.org/docs/guides/performance) — зачем нужны стабильные проекции и небольшие границы подписок.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — показывает композицию derived и action-атомов, на которую опирается эта тонкая утилита.
