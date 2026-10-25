# bond

Направляет срабатывание в writable atom с необязательным чтением state, фильтрацией и преобразованием аргументов. Импорт из корня или vanilla entry.

<Demo kind="bond">

<<< @/../examples/docs-demos.tsx#bond

</Demo>

<<< @/../examples/documentation.tsx#bond

## Контракт

## Поля и значения по умолчанию

| Поле    | Роль                                                  | Если отсутствует                                          |
| ------- | ----------------------------------------------------- | --------------------------------------------------------- |
| state   | Атом, объект или кортеж, читаемый при доставке        | Используются аргументы trigger                            |
| trigger | Уведомление о вызове или изменение читаемого значения | State становится триггером                                |
| guard   | `Atom<boolean>` или синхронный predicate              | Принимаются все срабатывания                              |
| map     | Синхронная функция, возвращающая кортеж аргументов    | `[stateValue]` при наличии state, иначе аргументы trigger |
| yield   | Writable atom или `(get) => writableAtom`             | Кортеж публикуется через возвращённый bond                |

Хотя бы state или trigger обязателен. При наличии state колбэки получают `(stateValue, ...triggerArgs)`, иначе `(...triggerArgs)`. Map возвращает кортеж даже для одного аргумента. Atom guard отклоняет срабатывание до чтения state; predicate нуждается в прочитанных данных. Без trigger необходимо читать сам state как источник срабатывания.

## Подключение и владение

```ts
const stop = notifying.connect(store, { onError: reportError });
// При завершении приложения/сессии:
stop();
```

`notifying` возвращается из `createNotifications(model)` в примере. `store` должен совпадать со store в Provider. Несколько подключений к одной паре bond/store разделяют доставку и учитывают владельцев. Последний stop отключает связь; stop идемпотентен. Подключайте явно вне render. Чтение и привязка результата не подключают bond.

Возвращённый bond — **read-only атом последнего принятого кортежа аргументов или undefined** с API подключения. Это не writable-команда. Следующий bond может использовать его как trigger и автоматически подключит и освободит предыдущий. Отклонение guard сохраняет прошлый кортеж. State-only выход без yield инициализируется при connect без публикации срабатывания; target не вызывается только из-за подключения.

## Что может быть trigger?

- actionAtom / eventAtom: каждый успешный возврат синхронной части вызова с исходными аргументами. Успех async-команды требует отдельного факта.
- Нативный readable atom / stateAtom: изменение читаемого значения с equality и batching Jotai, а не каждый set.
- Нативный write-only atom(null, write): **вызовы не наблюдаются**, значение остаётся null. Текущие типы это принимают, но trigger вызовов так не работает. Используйте actionAtom или eventAtom.

State и yield принимают совместимые нативные атомы. Getter в yield выбирает получателя при каждом принятом срабатывании для DI в рамках store, без отдельной подписки на выбор target.

## Планирование и ошибки

Доставка идёт через FIFO с ограничением циклов. State читается на шаге обработки очереди: предыдущие обработчики уже могли изменить его. Это не атомарный снимок транзакции и не computation priority Effector. Нет async guard/map, auto-await состояния, rollback и отмены target. Throw/rejection target идут в onError подключённых владельцев, по умолчанию — console.error; исходный результат trigger не меняется.

## Почему такой API

Поля соответствуют sampling-модели Effector: state/source, trigger/clock, guard/filter, map/fn, yield/target. Явный connect даёт связи владельца и disposer в конкретном store вместо вечных module-level эффектов. Для реактивной синхронизации state обычно проще jotai-effect.observe. Для одной прямой команды обычно понятнее set внутри actionAtom.

## Аналогии и материалы

- [Effector sample](https://effector.dev/en/api/effector/sample/) — основная аналогия API; гарантии планировщика не переносятся на bond.
- [Jotai effect](https://jotai.org/docs/extensions/effect) — готовая альтернатива для эффектов по зависимостям.
- [Separating Events from Effects](https://react.dev/learn/separating-events-from-effects) — полезное различие между явным взаимодействием и реактивной синхронизацией.
