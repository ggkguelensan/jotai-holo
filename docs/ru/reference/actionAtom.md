# actionAtom

Создаёт команду как нативный write-only atom с выводом аргументов и результата. Импорт из корня или vanilla entry.

<Demo kind="counter">

<<< @/../examples/docs-demos.tsx#counter

</Demo>

<<< @/../examples/documentation.tsx#action

## Контракт

- `actionAtom((get, set, ...args) => result)` возвращает writable atom, читаемое значение которого — `null`.
- Вызов: `store.set(command, ...args)`, `useSetAtom(command)` или `holo.actions`.
- Возвращается исходный результат, включая исходный Promise. Нет автоматической отмены, сериализации, retry и атомов success/failure.
- После успешного синхронного возврата аргументы публикуются подключённым `bond`. Синхронный throw ничего не публикует. Возврат Promise публикует сразу, **до его завершения**.
- Нативный `store.sub(command)` наблюдает читаемое значение, а не вызовы. Для вызовов bond использует дополнительный протокол.
- Есть перегрузка без обработчика `actionAtom<Args>()`; для уведомления с одним payload предпочтительнее `eventAtom<Payload>()`.

## Почему такой API

Нативный `atom(null, write)` уже подходит для команд. Утилита добавляет единое имя и наблюдаемость вызова для bond. Это не Effector Effect: для подтверждённого доменного факта публикуйте отдельное событие после ожидания API.

## Аналогии и материалы

- [Jotai atom](https://jotai.org/docs/core/atom) — исходные контракты primitive, read-only и write-only атомов.
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) — полезное различие между явным взаимодействием и реактивной синхронизацией.

- [Jotai: Composing atoms](https://jotai.org/docs/guides/composing-atoms) — показывает композицию derived и action-атомов, на которую опирается эта тонкая утилита.
